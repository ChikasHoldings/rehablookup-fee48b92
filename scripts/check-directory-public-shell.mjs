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
 *      generate-resources-html.mjs       source, not one full regeneration later.
 *      generate-county-pages.mjs         The two generators are here because they pass
 *                                        caller-supplied CTA blurbs (see hotfix #3).
 *
 * Generators that merely *describe* a retired route (e.g. the /placement-help
 * and /request-help entries in generate-missing-html.mjs) are not scanned
 * directly: that generator refuses to emit any path vercel.json redirects, so
 * those entries are inert. If that guard ever regresses, the emitted file lands
 * in public/ and dist/ and rules 2–3 catch it there.
 *
 * The word "concierge" alone is NOT banned. Luxury-rehab pages legitimately
 * describe a FACILITY's "24/7 concierge services" as an amenity. Nor is the
 * word "matching": editorial content matches patients to a level of care, and
 * insurance pages match plans to networks. Only RehabLookup-operated
 * placement/matching claims and links to the retired routes fail.
 *
 * A second, separate check (see PHONE_CLAIMS) covers how RehabLookup's own
 * support number is PRESENTED. The number itself is never banned — it is a
 * live support line — but public copy must not sell it as a 24/7 confidential
 * treatment helpline. Third-party crisis numbers (911, 988, SAMHSA) are
 * untouched: those rules only fire within a short window of the 214 number.
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
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// ── Forbidden patterns ──────────────────────────────────────────────────────
//
// Each is a RehabLookup-operated claim or a live link to a retired route.
// Keep them phrase-specific: this file runs over ~95k artifacts and a single
// over-broad pattern would block every future build on a false positive.

export const FORBIDDEN = [
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

  // ── Legacy Platform News rules (live-content hotfix) ────────────────────
  //
  // The rules above were written against hand-authored shells. They did not
  // fire on `public/resources/*.html`, because those mirrors are REGENERATED
  // from live Supabase during `build:vercel` — the committed copies were
  // clean, and the retired copy only reappeared inside Vercel's build, where
  // `generate:resources-html` can actually reach production Postgres.
  //
  // These rules name RehabLookup's retired operating model in its own words.
  // Every one is a multi-word phrase, and every one was verified to have zero
  // matches across the full 46k-artifact corpus before being added — bare
  // "placement" / "advisor" / "concierge" stay legal, because editorial pages
  // legitimately discuss interventionists, state placement programs, EAP
  // advisors and facility concierge amenities.
  {
    name: '"The Concierge Placement Network" (retired product name)',
    re: /\bthe concierge placement network\b/i,
  },
  { name: '"24/7 placement advisor(s)"', re: /24\/7\s+placement advisors?\b/i },
  { name: '"24/7 advisor coverage"', re: /24\/7\s+advisor coverage\b/i },
  { name: '"24/7 advisor team"', re: /24\/7\s+advisor team\b/i },
  { name: '"free domestic placement support"', re: /free domestic placement support/i },
  {
    name: '"free domestic … placement service"',
    // Matches "a free domestic, refundable international placement service".
    re: /free domestic[^.<]{0,60}placement service/i,
  },
  {
    name: "RehabLookup-operated placement network",
    // Scoped to first-person ownership — an article about a state or EAP
    // placement network is fine.
    re: /\b(?:our|rehablookup'?s)\s+(?:international\s+)?placement network\b/i,
  },
  {
    name: "operating a placement network (first-person verb)",
    re: /\b(?:deepening|expanding|growing|scaling|launching)\s+(?:our|the)\s+placement network\b/i,
  },
  {
    name: '"our advisors are available 24/7"',
    re: /\b(?:our|rehablookup'?s)\s+advisors?\s+(?:are|is)\s+(?:available|standing by|online)\s*(?:24\/7|around the clock)/i,
  },
  {
    name: '"connect with advisors" (RehabLookup as the subject)',
    re: /\bconnect with (?:our |rehablookup'?s )?advisors?\b/i,
  },
  {
    name: '"reach out to our advisors"',
    re: /\b(?:reach out to|talk to|speak (?:to|with)|call)\s+our\s+advisors?\b/i,
  },
  {
    name: '"we are not building a directory" (contradicts the cutover)',
    re: /\bwe(?:'re| are)\s+not\s+building\s+a\s+directory\b/i,
  },

  // ── Shared-CTA matching rules (hotfix #3) ───────────────────────────────
  //
  // Why the rules above missed this: every one of them requires a first-person
  // possessive ("our", "RehabLookup's") or a retired product NAME. The
  // resource-article CTA carried neither — `generate-resources-html.mjs`
  // passed `seoCtaStrip({ blurb: "Free, confidential matching to verified
  // treatment centers that fit your needs." })`, which markets a RehabLookup
  // matching service purely by CONTEXT: it is RehabLookup's own site chrome,
  // sitting directly above RehabLookup's own CTA button. No possessive, no
  // product name, so nothing fired — and it shipped on every generated
  // resource article to a READY Preview.
  //
  // The fix is to name the offer shape itself. Bare "matching" stays legal:
  // editorial content legitimately discusses matching patients to a level of
  // care, matching donors, insurance network matching. What fails is an OFFER
  // of matching TO treatment centers/facilities/programs — the thing
  // RehabLookup no longer does.
  {
    name: '"confidential matching to … treatment centers" (retired matching offer)',
    // Covers the exact shipped string and close variants:
    //   "Free, confidential matching to verified treatment centers …"
    //   "confidential matching to treatment centers"
    //   "free and confidential matching to licensed rehab facilities"
    re: /\bconfidential[^.<]{0,20}\bmatching\s+(?:you\s+)?(?:to|with)\b[^.<]{0,40}\b(?:treatment|rehab|recovery)?\s*(?:centers?|centres?|facilit(?:y|ies)|providers?|programs?)\b/i,
  },
  {
    name: '"matching to … centers that fit your needs" (retired matching offer)',
    // The tail half of the same claim, so a rewrite that drops
    // "confidential" but keeps the promise still fails.
    re: /\bmatching\s+(?:you\s+)?(?:to|with)\b[^.<]{0,60}\bthat\s+fit\s+(?:your|their)\s+needs\b/i,
  },
  {
    name: "RehabLookup-operated matching offer (free/personalized matching)",
    // "Free matching to treatment centers", "personalized matching to
    // verified facilities", "instant matching with rehab programs".
    re: /\b(?:free|personalized|personalised|instant|fast|24\/7)\s+matching\s+(?:you\s+)?(?:to|with)\b[^.<]{0,40}\b(?:centers?|centres?|facilit(?:y|ies)|providers?|programs?|treatment)\b/i,
  },
  {
    name: '"we (will) match you" / "find your best match" (RehabLookup as matcher)',
    re: /\bwe(?:'ll| will)?\s+(?:can\s+)?match\s+you\b|\bfind\s+your\s+(?:best\s+)?match\b|\blet us match you\b/i,
  },
  {
    name: '"we\'ll find/help you find" treatment (RehabLookup as intermediary)',
    // The county-page CTA shipped "We'll help you find verified treatment in
    // <State>." — intermediary framing with no possessive and no product name,
    // so it too slipped past every rule above. Scoped to a treatment object so
    // ordinary editorial "you'll find" prose is unaffected.
    re: /\bwe(?:'ll|’ll| will|&#39;ll)?\s+(?:can\s+)?(?:help\s+you\s+)?find\b[^.<]{0,40}\b(?:treatment|rehab|centers?|centres?|facilit(?:y|ies)|programs?)\b/i,
  },
];

// ── RehabLookup support-number semantics (hotfix #3) ────────────────────────
//
// 214-639-6420 is RehabLookup's REAL, still-live general support number and
// must keep working — this is not an attempt to hide it. What must not ship is
// PUBLIC copy presenting it as a RehabLookup-operated treatment helpline:
// "Call our 24/7 helpline", "Confidential, 24/7", "24/7 confidential help".
// After the cutover RehabLookup runs a directory, not a placement or crisis
// line, and the repository contains no support-policy artifact establishing a
// 24/7 non-placement service level either.
//
// Deliberately anchored to THIS number. Third-party crisis resources — 911,
// 988, and SAMHSA's 1-800-662-4357 — are legitimately described as free,
// confidential and 24/7 all over the corpus (the shared footer disclaimer
// carries all three on every one of ~46k pages). None of them can match these
// rules, because a match requires the RehabLookup number inside the window.
const RL_SUPPORT_PHONE = /(?:tel:\+?1?2146396420|\+1\s?214[\s.-]?639[\s.-]?6420|\(?214\)?[\s.-]639[\s.-]?6420)/gi;

// How far from the number a claim can sit and still be "attached" to it. Wide
// enough to span an anchor's attributes and its adjacent sentence, narrow
// enough that an unrelated "24/7" elsewhere on the page cannot reach it.
// Block-level tags that end one "presentation context" and start the next.
// The claim and the number have to sit in the SAME block for a rule to fire.
// This is what keeps a legitimate SAMHSA paragraph ("free, confidential, 24/7")
// from being attributed to a RehabLookup phone number two paragraphs away — a
// character-distance window could not tell those apart, and the shared footer
// puts exactly that combination on every one of ~46k pages. Inline tags,
// crucially <a>, are NOT boundaries: the anchor's own attributes (aria-label)
// and its visible label are part of how the number is presented.
const BLOCK_BOUNDARY =
  /<\/?(?:p|div|li|ul|ol|dl|dd|dt|section|article|aside|header|footer|nav|main|h[1-6]|br|hr|td|th|tr|table|blockquote|form|figure|figcaption|script|style|noscript)\b[^>]*>/gi;

export const PHONE_CLAIMS = [
  { name: '"24/7 confidential help" on the RehabLookup support number', re: /24\/7,?\s+confidential\s+help/i },
  { name: '"Confidential, 24/7" on the RehabLookup support number', re: /\bconfidential,?\s*(?:and\s+)?24\/7/i },
  { name: '"24/7 confidential" on the RehabLookup support number', re: /\b24\/7[\s,·—-]*confidential/i },
  { name: 'RehabLookup support number labelled a 24/7 helpline/hotline', re: /24\/7[^<>]{0,20}\b(?:helpline|hotline|help line)\b/i },
  { name: 'RehabLookup support number labelled "our helpline/hotline"', re: /\bour\s+(?:24\/7\s+|confidential\s+)*(?:helpline|hotline|help line)\b/i },
  { name: 'RehabLookup support number labelled a treatment/crisis helpline', re: /\b(?:treatment|rehab|recovery|addiction|crisis|confidential)\s+(?:helpline|hotline|help line)\b/i },
  { name: '"Call 24/7" on the RehabLookup support number', re: /\bcall\s+(?:us\s+)?24\/7\b/i },
  { name: 'RehabLookup support number offered as placement/matching/advisor help', re: /\b(?:placement|matching|advisor|advocate|admissions|intake)\s+(?:help|assistance|support|line|specialists?)\b/i },
  { name: 'RehabLookup support number offered as "speak to a counselor/advisor"', re: /\b(?:speak|talk)\s+(?:to|with)\s+an?\s+(?:counselor|counsellor|advisor|adviser|advocate|specialist|coordinator)\b/i },
];

/**
 * Find support-number presentation violations in one artifact.
 *
 * The artifact is split into block-level segments (see BLOCK_BOUNDARY) and only
 * segments containing RehabLookup's number are tested, so a claim has to be
 * presented WITH the number to count.
 *
 * `class="…"` / `id="…"` attributes are stripped from each segment first: the
 * shared header keeps the CSS hook `class="rl-helpline"` (renaming it would
 * unstyle ~46k committed pages whose inline <style> block this repo does not
 * re-sync), and that hook is not reader-facing copy. Every other attribute —
 * `aria-label` above all, which screen-reader users DO hear — is checked.
 */
export function phoneSemanticViolations(text) {
  // Keyed by rule + matched text: one anchor usually contains the number twice
  // (`href="tel:…"` and the visible digits) and both see the same claim in
  // their segment. Report it once.
  const hits = new Map();

  BLOCK_BOUNDARY.lastIndex = 0;
  let cursor = 0;
  const segments = [];
  let b;
  while ((b = BLOCK_BOUNDARY.exec(text)) !== null) {
    segments.push({ offset: cursor, text: text.slice(cursor, b.index) });
    cursor = b.index + b[0].length;
  }
  segments.push({ offset: cursor, text: text.slice(cursor) });

  for (const segment of segments) {
    RL_SUPPORT_PHONE.lastIndex = 0;
    const phone = RL_SUPPORT_PHONE.exec(segment.text);
    if (!phone) continue;
    const readable = segment.text
      .replace(/\sclass="[^"]*"/gi, "")
      .replace(/\sid="[^"]*"/gi, "");
    for (const claim of PHONE_CLAIMS) {
      const c = readable.match(claim.re);
      if (!c) continue;
      const key = `${claim.name} :: ${c[0]}`;
      if (!hits.has(key)) {
        hits.set(key, {
          rule: claim.name,
          index: segment.offset + phone.index,
          snippet: c[0].slice(0, 120),
        });
      }
    }
  }
  return [...hits.values()];
}

// Legacy RehabLookup-authored "Platform News" articles whose live
// `blog_articles` rows still describe the retired placement product. Their
// public mirrors are rewritten at render time by the shared override in
// src/lib/directoryArticleOverride.ts. Listed here so CI output states
// explicitly that these two artifacts were in scope for this run — a silent
// "scanned 46675 files" is exactly how the first two misses slipped through.
//
// Not an exemption list: these paths are scanned by every rule above, like
// any other artifact. When the DB rows are normalized in the later data
// cleanup stage, the override and this list can both be removed.
const LEGACY_ARTICLE_MIRRORS = [
  "resources/rehablookup-april-2026-analytics-milestone.html",
  "resources/ceo-chiedu-kabakwu-scaling-rehablookup.html",
];

// ── Targets ─────────────────────────────────────────────────────────────────

const HTML_ROOTS = ["index.html", "dist", "public"];
// Shared shell fragments, plus the two generators that pass a CALLER-SUPPLIED
// CTA blurb into seoCtaStrip(). Hotfix #3 exists because a caller blurb — not
// the shared default — carried the matching-service copy, and a caller blurb
// is invisible to this guard until the page it feeds is regenerated. Scanning
// the generators fails the build at the source instead. Generators that call
// seoCtaStrip() with no arguments are not listed: they can only emit the
// shared default, which is checked here via _seo-page-shell.mjs.
const SHELL_SOURCES = [
  "scripts/_seo-page-shell.mjs",
  "scripts/_unique-content.mjs",
  "scripts/generate-resources-html.mjs",
  "scripts/generate-county-pages.mjs",
];

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

/**
 * Apply every rule to one artifact's text. Exported (with FORBIDDEN and
 * PHONE_CLAIMS) so the regression suite drives the SAME rules this script
 * enforces — a test-local copy of the patterns would be free to drift from
 * the guard, which is exactly how the shipped copy stayed unnoticed.
 *
 * @param {string} text  artifact contents
 * @param {{ legal?: boolean }} [opts]  `legal: true` skips the two
 *        shape-matching rules the legal notices are exempt from.
 * @returns {Array<{ line: number, rule: string, snippet: string }>}
 */
export function scanText(text, { legal = false } = {}) {
  const found = [];
  for (const rule of FORBIDDEN) {
    if (legal && rule.legalDocExempt) continue;
    const m = text.match(rule.re);
    if (!m) continue;
    // Report the surrounding line so the fix is obvious from CI output alone.
    const line = text.slice(0, m.index).split("\n").length;
    found.push({ line, rule: rule.name, snippet: m[0].slice(0, 120) });
  }
  // Support-number presentation. Not part of FORBIDDEN because a match needs
  // proximity to RehabLookup's own number, not a phrase alone — the same
  // words next to SAMHSA's or 988's number are correct and must stay.
  for (const hit of phoneSemanticViolations(text)) {
    const line = text.slice(0, hit.index).split("\n").length;
    found.push({ line, rule: hit.rule, snippet: hit.snippet });
  }
  return found;
}

// ── CLI ─────────────────────────────────────────────────────────────────────
//
// Everything below runs only when this file is executed as a script. Tests
// import the rule tables and scanText() above; importing must not walk 46k
// artifacts or call process.exit().
function main() {
  const violations = [];
  let scanned = 0;
  let sawDist = false;
  let sawRootShell = false;

  function scan(abs) {
    scanned++;
    const rel = relative(ROOT, abs);
    const text = readFileSync(abs, "utf8");
    for (const v of scanText(text, { legal: isLegalDoc(abs) })) {
      violations.push({ rel, ...v });
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

  // Name the two live-content regressions explicitly. These mirrors are only
  // present after `generate:resources-html` has run against Supabase, so a
  // "not generated" line here is informational (the local build cannot reach
  // production Postgres) rather than a failure.
  for (const mirror of LEGACY_ARTICLE_MIRRORS) {
    const seen = ["public", "dist"].filter((base) =>
      existsSync(join(ROOT, base, mirror)),
    );
    console.log(
      `  ${mirror.replace("resources/", "")} : ` +
        (seen.length ? `checked in ${seen.join(", ")}/` : "not generated (skipped)"),
    );
  }

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
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();
