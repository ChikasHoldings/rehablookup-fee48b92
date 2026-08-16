#!/usr/bin/env node
/**
 * check-directory-public-shell.mjs
 *
 * Build-time guard: fails the build if a PUBLIC HTML ARTIFACT still markets the
 * retired Concierge / placement / matching product.
 *
 * Why this exists
 * ───────────────
 * Directory cutover stage 1 retired the seeker-facing placement product. Its
 * audit and its guard (`check:prerendered-shell`) both walked `public/**.html`
 * only, because that is where the ~47k prerendered pages live. Root
 * `index.html` — the Vite SPA shell, and the noscript document every crawler
 * and JS-less visitor actually receives for the homepage — was never in scope,
 * so it shipped to the stage-1 Preview byte-identical to pre-cutover main,
 * still advertising "24/7 Concierge Support", a "free concierge placement
 * service", "trained recovery advocates", a `/concierge` CTA and a
 * `/concierge` prefetch. Every test passed; the deployed HTML was wrong.
 *
 * `check:prerendered-shell` is a DRIFT check — it asks "does this committed
 * page still match what the current generator would emit?" It cannot see a
 * hand-authored file no generator owns. This script is the complementary
 * CONTENT check: it asks "does any public artifact still say the retired
 * thing?", regardless of who wrote it.
 *
 * Scope — public artifacts only, deliberately
 * ───────────────────────────────────────────
 * A repo-wide grep for "concierge" would be useless here: the legacy URLs must
 * keep resolving, so `vercel.json` redirects, the React Router `Navigate`
 * routes, and the tests that document both MUST keep mentioning them. Provider
 * /admin/backend concierge surfaces are a later stage and are equally out of
 * scope. So this walks the shipped public HTML only:
 *
 *   1. index.html                      — the SPA + noscript shell (stage-1 miss)
 *   2. dist/**.html                    — the real build output, incl. dist/index.html
 *   3. public/**.html                  — the committed prerendered corpus
 *   4. scripts/_seo-page-shell.mjs     — shared fragments injected into (2) and (3);
 *      scripts/_unique-content.mjs       guarded so a reintroduction is caught at the
 *                                        source, not one full regeneration later
 *
 * Generators that merely *describe* a retired route (e.g. the /placement-help
 * and /request-help entries in generate-missing-html.mjs) are not scanned
 * directly: that generator refuses to emit any path vercel.json redirects, so
 * those entries are inert. If that guard ever regresses, the emitted file lands
 * in public/ and dist/ and rules 2–3 catch it there.
 *
 * The word "concierge" alone is NOT banned. Luxury-rehab pages legitimately
 * describe a FACILITY's "24/7 concierge services" as an amenity. Only
 * RehabLookup-operated placement claims and links to the retired routes fail.
 *
 * Usage
 *   node scripts/check-directory-public-shell.mjs
 *
 * Exit codes
 *   0  no public artifact markets the retired product
 *   1  at least one violation found
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Forbidden patterns ──────────────────────────────────────────────────────
//
// Each is a RehabLookup-operated claim or a live link to a retired route.
// Keep them phrase-specific: this file runs over ~95k artifacts and a single
// over-broad pattern would block every future build on a false positive.

const FORBIDDEN = [
  {
    name: "link or prefetch to a retired placement route",
    // Covers <a href="/concierge"> and <link rel="prefetch" href="/concierge">
    // alike — both are `href="` — plus the /request-help and /placement-help
    // funnels. Trailing (["/?#]) so we match the route, not a lookalike slug
    // such as /concierge-guide.
    re: /href="\/(?:concierge|request-help|placement-help)(?=["/?#])/i,
  },
  { name: '"free concierge placement service"', re: /free concierge placement service/i },
  { name: '"24/7 Concierge Support"', re: /24\/7 concierge support/i },
  { name: '"personalized placement assistance"', re: /personalized placement (?:assistance|help)/i },
  { name: '"trained recovery advocates"', re: /trained recovery advocates/i },
  { name: '"recovery advocates are standing by"', re: /recovery advocates? (?:are |is )?standing by/i },
  { name: '"talk to a recovery advocate"', re: /talk to a recovery advocate/i },
  {
    name: "RehabLookup-operated matching service",
    // NOT a bare "matching services" — that would fire on facility copy about
    // matching patients to a level of care. Requires the first-person framing.
    re: /\b(?:our|rehablookup'?s)\b[^.<]{0,40}\bmatching service/i,
  },
  {
    name: "offer to use a RehabLookup concierge/placement service",
    // Needs an offer cue ("use our…", "via our…"). A bare mention is NOT a
    // violation: the HIPAA Notice of Privacy Practices legitimately lists the
    // concierge service as a channel data was collected through, and that
    // disclosure must survive until the records themselves are retired.
    re: /\b(?:use|using|via|through|contact|call|talk to|speak (?:to|with)|request)\s+(?:our|rehablookup'?s)\b[^.<]{0,30}\b(?:concierge|placement)\b/i,
    legalDocExempt: true,
  },
  {
    name: "RehabLookup-operated free concierge/placement/matching offer",
    re: /\b(?:our|rehablookup'?s)\s+free\s+(?:concierge|placement|matching)\b/i,
  },
  {
    name: "RehabLookup placement/advocate staffing claim",
    re: /\b(?:our|rehablookup'?s)\s+(?:placement|concierge|recovery)\s+(?:team|specialists?|advisors?|advocates?|coordinators?)\b/i,
    legalDocExempt: true,
  },
  {
    name: "placement guidance from RehabLookup coordinators",
    re: /placement (?:guidance|help) from (?:licensed )?coordinators/i,
  },
  {
    name: "RehabLookup-operated benefits verification promise",
    // The product does not run carrier verification; facilities' admissions
    // teams do. "we verify your benefits" oversells it.
    re: /\bwe (?:verify|confirm) your benefits\b|\bour team confirms your benefits\b/i,
  },
];

// ── Targets ─────────────────────────────────────────────────────────────────

const HTML_ROOTS = ["index.html", "dist", "public"];
const SHELL_SOURCES = ["scripts/_seo-page-shell.mjs", "scripts/_unique-content.mjs"];

// Legal notices DESCRIBE data practices rather than advertising a product, and
// the practices they describe are still true: free-tier "Request Information"
// submissions can still reach RehabLookup's coordinator workflow. That backend
// is retired in stage 2 — rewriting the HIPAA notice ahead of it would state
// something false about how inquiries are actually routed today. So the two
// shape-matching rules below (`legalDocExempt`) are skipped on these pages.
//
// STAGE 2 MUST REVISIT THESE FILES when the coordinator routing is removed.
//
// Only the shape rules are exempt. A retired-route link/prefetch, or any of the
// verbatim marketing phrases, still fails the build on a legal page too.
const LEGAL_DOCS = new Set([
  "notice-of-privacy-practices.html",
  "privacy-policy.html",
  "terms-of-service.html",
]);

const isLegalDoc = (abs) => LEGAL_DOCS.has(abs.split("/").pop());

function* htmlFiles(abs) {
  const st = statSync(abs, { throwIfNoEntry: false });
  if (!st) return;
  if (st.isFile()) {
    if (abs.endsWith(".html")) yield abs;
    return;
  }
  for (const entry of readdirSync(abs)) yield* htmlFiles(join(abs, entry));
}

// ── Scan ────────────────────────────────────────────────────────────────────

const violations = [];
let scanned = 0;
let sawDist = false;
let sawRootShell = false;

function scan(abs) {
  scanned++;
  const rel = relative(ROOT, abs);
  const text = readFileSync(abs, "utf8");
  const legal = isLegalDoc(abs);
  for (const rule of FORBIDDEN) {
    if (legal && rule.legalDocExempt) continue;
    const m = text.match(rule.re);
    if (!m) continue;
    // Report the surrounding line so the fix is obvious from CI output alone.
    const line = text.slice(0, m.index).split("\n").length;
    violations.push({ rel, line, rule: rule.name, snippet: m[0].slice(0, 120) });
  }
}

for (const target of HTML_ROOTS) {
  const abs = join(ROOT, target);
  if (!existsSync(abs)) continue;
  if (target === "dist") sawDist = true;
  if (target === "index.html") sawRootShell = true;
  for (const file of htmlFiles(abs)) scan(file);
}

for (const target of SHELL_SOURCES) {
  const abs = join(ROOT, target);
  if (existsSync(abs)) scan(abs);
}

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`[directory-public-shell] scanned ${scanned} public artifact(s)`);
console.log(`  root index.html : ${sawRootShell ? "checked" : "MISSING"}`);
console.log(`  dist/           : ${sawDist ? "checked" : "not built (skipped)"}`);

// The root shell is the exact artifact this guard exists for. If it is gone the
// check must not quietly pass.
if (!sawRootShell) {
  console.error("✗ index.html not found — the root SPA shell must exist and be checked");
  process.exit(1);
}

if (violations.length === 0) {
  console.log("✓ no public artifact markets the retired concierge/placement product");
  process.exit(0);
}

console.error(
  `\n✗ ${violations.length} public artifact violation(s) — the retired concierge/` +
    "placement product is being advertised in shipped HTML:\n",
);

// Group by rule so a single regenerated-corpus regression prints one block
// rather than thousands of near-identical lines.
const byRule = new Map();
for (const v of violations) {
  if (!byRule.has(v.rule)) byRule.set(v.rule, []);
  byRule.get(v.rule).push(v);
}
for (const [rule, hits] of byRule) {
  console.error(`  ${rule} — ${hits.length} file(s)`);
  for (const h of hits.slice(0, 10)) {
    console.error(`    ${h.rel}:${h.line}  ${JSON.stringify(h.snippet)}`);
  }
  if (hits.length > 10) console.error(`    … and ${hits.length - 10} more`);
}

console.error(
  "\n  Legacy /concierge, /request-help and /placement-help URLs must keep\n" +
    "  REDIRECTING (vercel.json + React Router) — do not delete those. The public\n" +
    "  site simply must not link to, prefetch, or advertise the retired product.",
);
process.exit(1);
