#!/usr/bin/env node
/**
 * check-inquiry-routing-prerender.mjs
 *
 * Build-time guard for the directory-cutover STAGE 2 PRERENDER CONTRACT:
 * a generated facility profile may only advertise RehabLookup's on-platform
 * Request Information flow when that facility is an ACTIVE PRO listing.
 *
 * Why this exists
 * ───────────────
 * Stage 2 routed the React/SPA facility-contact path by entitlement, and the
 * edge handler refuses a non-Pro inquiry with DIRECT_CONTACT_REQUIRED. But
 * `scripts/generate-facility-profiles-html.mjs` — the crawler-facing static
 * mirror at `/center/<slug>.html` — rendered its "Request Information" CTA
 * and its contact/insurance FAQ answers UNCONDITIONALLY. So a real Free
 * facility's generated page still told Googlebot (and any JS-less visitor)
 * to "use the Request Information form on the RehabLookup profile" and
 * "request a benefits verification through the profile" for a facility whose
 * inquiries the server would reject. Every test passed; the deployed HTML
 * was wrong.
 *
 * `check:directory-public-shell` did not catch it: that guard hunts retired
 * Concierge/placement MARKETING copy, and "Request Information" is not
 * retired marketing — it is a live, legitimate affordance that is simply
 * entitlement-scoped. This is the complementary ENTITLEMENT check.
 *
 * Scope — generated facility profiles only, deliberately
 * ─────────────────────────────────────────────────────
 * Only `public/center/**.html` and `dist/center/**.html` are walked, and
 * within those only pages the facility-profile generator actually produced
 * (identified by `<body data-page="facility-profile">`). Other `/center/`
 * mirrors emitted by the older generic generators carry no entitlement data
 * and are not part of this contract — but they still may not link into the
 * inquiry flow, which rule 0 below enforces for every center page.
 *
 * Provider/admin surfaces, historical migrations, docs and editorial prose
 * are NOT scanned. The words "request information" are not banned anywhere:
 * this guard is about a generated facility page's CONTACT MECHANISM, not
 * about vocabulary.
 *
 * Rules
 *   0. any /center/*.html                → `?action=request-info` requires a
 *                                          `data-contact-routing="pro"` page
 *   1. every facility-profile page       → exactly one contact-routing marker,
 *                                          value "pro" or "direct"
 *   2. data-contact-routing="direct"     → no `?action=request-info`, no
 *                                          RehabLookup inquiry-form promise,
 *                                          no "benefits verification through
 *                                          the profile", and the CTA heading
 *                                          is direct contact, not Request
 *                                          Information
 *   3. data-contact-routing="pro"        → the Request Information CTA is
 *                                          allowed, but must target this
 *                                          page's own slug, and must not
 *                                          promise matching / another
 *                                          provider / an advisor or
 *                                          coordinator
 *
 * Usage
 *   node scripts/check-inquiry-routing-prerender.mjs
 *
 * Exit codes
 *   0  every generated facility page honours the stage-2 contract
 *   1  at least one violation found
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative, basename } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Directories holding generated facility mirrors, in scan order. */
export const CENTER_ROOTS = ["public/center", "dist/center"];

/** Marks a page as produced by generate-facility-profiles-html.mjs. */
const FACILITY_PAGE_MARKER = /<body[^>]*\bdata-page="facility-profile"/i;

/** The contact-routing marker itself. Exactly one per facility page. */
const ROUTING_MARKER = /data-contact-routing="([a-z-]*)"/gi;

const VALID_MODES = new Set(["pro", "direct"]);

/** The live on-platform inquiry affordance. */
const REQUEST_INFO_LINK = /\?action=request-info/i;

/**
 * Copy that promises RehabLookup's on-platform inquiry flow. Each is
 * phrase-specific: a facility page may legitimately say "contact admissions
 * directly", and editorial pages elsewhere are out of scope entirely.
 */
const INQUIRY_PROMISES = [
  {
    name: '"Request Information" form on a RehabLookup profile',
    re: /"Request Information" form on (?:the|this)\b/i,
  },
  {
    name: "benefits verification requested through the profile",
    re: /request a benefits verification through the profile/i,
  },
  {
    name: "send a confidential inquiry through the profile",
    re: /send a confidential inquiry (?:through|via|on) (?:the|this)\b/i,
  },
  {
    name: "Request Information CTA heading",
    // The generator's Pro heading. On a direct page it would mean the
    // primary contact mechanism is still RehabLookup's form.
    re: /<h2>Request Information from /i,
  },
];

/**
 * Operational promises RehabLookup does not make on any facility page,
 * including a Pro one: the inquiry goes to exactly one selected facility and
 * no staff member coordinates an alternative.
 */
const COORDINATION_PROMISES = [
  {
    name: "promise to connect the seeker with another provider",
    re: /\bconnect you (?:with|to)\b[^.<]{0,40}\b(?:another|other|a different)\b/i,
  },
  {
    name: "promise to find/match another provider",
    re: /\bwe(?:'ll| will)\s+(?:find|match)\b[^.<]{0,40}\b(?:provider|facility|center|centre)\b/i,
  },
  {
    name: "RehabLookup advisor/coordinator handling the inquiry",
    re: /\b(?:our|rehablookup'?s)\s+(?:advisors?|coordinators?|care team)\b/i,
  },
  {
    name: "inquiry distributed to multiple facilities",
    re: /\bsent (?:to|your (?:inquiry|request) to)\s+(?:multiple|several|other)\s+(?:facilities|centers|providers)\b/i,
  },
];

/** Line number of a regex match, for actionable CI output. */
function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function push(found, text, index, rule, snippet) {
  found.push({ line: lineOf(text, index), rule, snippet: String(snippet).slice(0, 140) });
}

/**
 * Scan one generated `/center/<slug>.html` artifact.
 *
 * @param {string} text  file contents
 * @param {string} slug  the page's slug (filename without .html), used to
 *                       verify a Pro CTA targets its OWN facility
 * @returns {{ isFacilityPage: boolean, mode: string|null,
 *             violations: Array<{line:number, rule:string, snippet:string}> }}
 */
export function scanCenterPage(text, slug) {
  const violations = [];
  const isFacilityPage = FACILITY_PAGE_MARKER.test(text);

  ROUTING_MARKER.lastIndex = 0;
  const markers = [...text.matchAll(ROUTING_MARKER)];
  const mode = markers.length === 1 ? markers[0][1] : null;

  // ── Rule 0 — applies to EVERY center page, generator-owned or not ───────
  // A page that links into the inquiry flow must be a confirmed-Pro page.
  const inquiryLink = text.match(REQUEST_INFO_LINK);
  if (inquiryLink && mode !== "pro") {
    push(
      violations,
      text,
      inquiryLink.index,
      "links to the on-platform inquiry flow without a Pro contact-routing marker",
      inquiryLink[0],
    );
  }

  if (!isFacilityPage) {
    // Legacy/non-facility center mirrors carry no entitlement data. Rule 0
    // above is the only contract they participate in.
    return { isFacilityPage, mode, violations };
  }

  // ── Rule 1 — exactly one valid marker ───────────────────────────────────
  if (markers.length !== 1) {
    violations.push({
      line: 1,
      rule:
        markers.length === 0
          ? "generated facility page has no data-contact-routing marker"
          : `generated facility page has ${markers.length} data-contact-routing markers (expected exactly 1)`,
      snippet: markers.map((m) => m[0]).join(" ") || "(none)",
    });
    return { isFacilityPage, mode, violations };
  }

  if (!VALID_MODES.has(mode)) {
    violations.push({
      line: lineOf(text, markers[0].index),
      rule: `invalid data-contact-routing value (expected "pro" or "direct")`,
      snippet: markers[0][0],
    });
    return { isFacilityPage, mode, violations };
  }

  // ── Rule 2 — direct-contact pages ───────────────────────────────────────
  if (mode === "direct") {
    for (const rule of INQUIRY_PROMISES) {
      const m = text.match(rule.re);
      if (m) {
        push(
          violations,
          text,
          m.index,
          `direct-contact page advertises the RehabLookup inquiry flow — ${rule.name}`,
          m[0],
        );
      }
    }
  }

  // ── Rule 3 — Pro pages ──────────────────────────────────────────────────
  if (mode === "pro" && inquiryLink) {
    const own = new RegExp(
      `/center/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?action=request-info`,
      "i",
    );
    if (!own.test(text)) {
      push(
        violations,
        text,
        inquiryLink.index,
        "Pro inquiry CTA does not target this page's own facility slug",
        inquiryLink[0],
      );
    }
  }

  // Coordination promises are forbidden in BOTH modes.
  for (const rule of COORDINATION_PROMISES) {
    const m = text.match(rule.re);
    if (m) {
      push(violations, text, m.index, `facility page promises coordination — ${rule.name}`, m[0]);
    }
  }

  return { isFacilityPage, mode, violations };
}

/** Recursively yield *.html under a directory. */
function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const abs = join(dir, entry);
    const st = statSync(abs);
    if (st.isDirectory()) yield* htmlFiles(abs);
    else if (entry.endsWith(".html")) yield abs;
  }
}

// ── CLI ─────────────────────────────────────────────────────────────────────
// Everything below runs only when executed as a script — tests import
// scanCenterPage() above and must not walk the corpus or call process.exit().
function main() {
  const violations = [];
  let scanned = 0;
  let facilityPages = 0;
  let proPages = 0;
  let directPages = 0;
  const rootsSeen = [];

  for (const root of CENTER_ROOTS) {
    const abs = join(ROOT, root);
    if (!existsSync(abs)) continue;
    rootsSeen.push(root);
    for (const file of htmlFiles(abs)) {
      scanned++;
      const slug = basename(file, ".html");
      const result = scanCenterPage(readFileSync(file, "utf8"), slug);
      if (result.isFacilityPage) {
        facilityPages++;
        if (result.mode === "pro") proPages++;
        if (result.mode === "direct") directPages++;
      }
      for (const v of result.violations) {
        violations.push({ rel: relative(ROOT, file), ...v });
      }
    }
  }

  console.log(`[inquiry-routing-prerender] scanned ${scanned} /center page(s)`);
  console.log(`  roots            : ${rootsSeen.join(", ") || "none found (skipped)"}`);
  console.log(`  facility profiles: ${facilityPages} (pro ${proPages} / direct ${directPages})`);

  if (violations.length === 0) {
    console.log(
      "✓ every generated facility profile routes contact by entitlement " +
        "(Pro → on-platform inquiry, everything else → direct facility contact)",
    );
    process.exit(0);
  }

  console.error(
    `\n✗ ${violations.length} stage-2 prerender contract violation(s) in generated facility profiles:\n`,
  );

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
    "\n  Fix scripts/generate-facility-profiles-html.mjs — never a single generated\n" +
      "  page. Contact routing is derived from public_facilities.is_pro, which is the\n" +
      "  build-time projection of has_active_pro(); do not reconstruct subscription\n" +
      "  rules in JavaScript and do not derive the marker from Featured.\n",
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();
