#!/usr/bin/env node
/**
 * check-inquiry-routing-prerender.mjs
 *
 * Build-time guard for the STAGE-2 PRERENDER CONTRACT, as amended by the
 * inquiry-model amendment.
 *
 * WHAT THE CONTRACT IS NOW
 * ────────────────────────
 * The previous contract gated the INQUIRY by entitlement: only a Pro page
 * could advertise the on-platform form, everyone else got "call the facility
 * directly" — with the facility's phone number printed on the page.
 *
 * Both halves inverted:
 *
 *   INQUIRY   Every eligible approved facility may advertise an inquiry to
 *             ITSELF. This is not an entitlement. The page asserts it with
 *             data-inquiry-routing="facility", whose only legal value says the
 *             inquiry goes to the selected facility and nowhere else.
 *
 *   PHONE     Publishing the facility's phone number IS the entitlement. The
 *             page asserts it with data-phone-visibility="pro" | "hidden",
 *             derived from public_facilities.is_pro (=== true) and nothing
 *             else. Featured must never produce "pro".
 *
 * THE FIXTURE THAT MATTERS
 * ────────────────────────
 * The interesting failure is not "a null phone rendered nothing". It is "a
 * facility whose SOURCE ROW HAS A PHONE rendered nothing anyway". The unit
 * fixtures in src/__tests__/facility-prerender-contact-routing.test.ts drive
 * the generator with populated `phone` columns on Free and Featured-only rows
 * and assert the digits are absent from the output. This script is the
 * corpus-wide counterpart: it re-checks the same contract on every artifact
 * actually written to disk.
 *
 * SITE SUPPORT PHONE vs FACILITY PHONE
 * ────────────────────────────────────
 * The shared SEO shell legitimately carries RehabLookup's own support number
 * and the 988 / 911 / SAMHSA crisis lines on EVERY page, including Free ones.
 * Banning `tel:` outright would be both wrong and useless. This guard instead
 * allowlists exactly those known site-level numbers and treats ANY OTHER tel:
 * target on a phone-hidden page as a facility-phone leak. That is what makes
 * the check meaningful rather than decorative.
 *
 * Scope — generated facility profiles only, deliberately
 * ─────────────────────────────────────────────────────
 * Only `public/center/**.html` and `dist/center/**.html` are walked, and
 * within those the full contract applies to pages the facility-profile
 * generator produced (`<body data-page="facility-profile">`). Provider/admin
 * surfaces, migrations, docs and editorial prose are NOT scanned.
 *
 * Rules
 *   1. every facility-profile page → exactly one data-inquiry-routing marker,
 *      value "facility"
 *   2. every facility-profile page → exactly one data-phone-visibility marker,
 *      value "pro" or "hidden"
 *   3. every facility-profile page → carries its own inquiry CTA, targeting
 *      this page's own slug
 *   4. data-phone-visibility="hidden" → no facility phone anywhere: no
 *      non-allowlisted tel:, no JSON-LD telephone, no visible Phone: line,
 *      no "Call <number>" CTA
 *   5. any page → no matching / Concierge / advisor / redistribution copy
 *
 * Usage
 *   node scripts/check-inquiry-routing-prerender.mjs
 *
 * Exit codes
 *   0  every generated facility page honours the contract
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

const INQUIRY_MARKER = /data-inquiry-routing="([a-z-]*)"/gi;
const PHONE_MARKER = /data-phone-visibility="([a-z-]*)"/gi;

const VALID_PHONE_MODES = new Set(["pro", "hidden"]);

/** The live on-platform inquiry affordance. */
const REQUEST_INFO_LINK = /\?action=request-info/i;

/**
 * SITE-LEVEL numbers that legitimately appear on every page via the shared
 * shell and crisis footer. Compared on digits only, so formatting differences
 * ("+12146396420" vs "1-800-662-4357") cannot smuggle one past.
 *
 * Keep in sync with SUPPORT_PHONE in scripts/_seo-page-shell.mjs.
 */
export const ALLOWED_SITE_PHONE_DIGITS = new Set([
  "12146396420", // RehabLookup support (shell header)
  "2146396420",
  "988", // Suicide & Crisis Lifeline
  "911", // Emergency
  "18006624357", // SAMHSA National Helpline
  "8006624357",
]);

const TEL_LINK = /href="tel:([^"]*)"/gi;

/** JSON-LD telephone property, in either quoting style the generator emits. */
const JSONLD_TELEPHONE = /"telephone"\s*:/i;

/** The generator's visible phone line. */
const VISIBLE_PHONE_LINE = /<strong>Phone:<\/strong>/i;

/** The generator's Call CTA button. */
const CALL_CTA = /<a[^>]*class="btn[^"]*"[^>]*href="tel:/i;

/**
 * Operational promises RehabLookup does not make on any facility page. The
 * inquiry goes to exactly one selected facility and no staff member
 * coordinates an alternative.
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
  {
    name: "response-time guarantee",
    re: /\b(?:responds?|reply|reach out|call you back)\b[^.<]{0,30}\bwithin\s+(?:an?\s+)?(?:\d+\s*)?(?:hour|minute|business day|day)/i,
  },
];

/** Line number of a regex match, for actionable CI output. */
function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function push(found, text, index, rule, snippet) {
  found.push({ line: lineOf(text, index), rule, snippet: String(snippet).slice(0, 140) });
}

const digitsOf = (s) => String(s ?? "").replace(/\D/g, "");

/**
 * Scan one generated `/center/<slug>.html` artifact.
 *
 * @param {string} text  file contents
 * @param {string} slug  the page's slug (filename without .html), used to
 *                       verify the inquiry CTA targets its OWN facility
 * @returns {{ isFacilityPage: boolean, inquiryMode: string|null,
 *             phoneMode: string|null,
 *             violations: Array<{line:number, rule:string, snippet:string}> }}
 */
export function scanCenterPage(text, slug) {
  const violations = [];
  const isFacilityPage = FACILITY_PAGE_MARKER.test(text);

  INQUIRY_MARKER.lastIndex = 0;
  PHONE_MARKER.lastIndex = 0;
  const inquiryMarkers = [...text.matchAll(INQUIRY_MARKER)];
  const phoneMarkers = [...text.matchAll(PHONE_MARKER)];
  const inquiryMode = inquiryMarkers.length === 1 ? inquiryMarkers[0][1] : null;
  const phoneMode = phoneMarkers.length === 1 ? phoneMarkers[0][1] : null;

  if (!isFacilityPage) {
    // Legacy/non-facility center mirrors carry no entitlement data. They must
    // still not link into the inquiry flow, because they cannot assert which
    // facility the inquiry would belong to.
    const stray = text.match(REQUEST_INFO_LINK);
    if (stray && inquiryMode !== "facility") {
      push(
        violations,
        text,
        stray.index,
        "non-generator center page links to the inquiry flow without an inquiry-routing marker",
        stray[0],
      );
    }
    return { isFacilityPage, inquiryMode, phoneMode, violations };
  }

  // ── Rule 1 — exactly one inquiry-routing marker, value "facility" ────────
  if (inquiryMarkers.length !== 1) {
    violations.push({
      line: 1,
      rule:
        inquiryMarkers.length === 0
          ? "generated facility page has no data-inquiry-routing marker"
          : `generated facility page has ${inquiryMarkers.length} data-inquiry-routing markers (expected exactly 1)`,
      snippet: inquiryMarkers.map((m) => m[0]).join(" ") || "(none)",
    });
  } else if (inquiryMode !== "facility") {
    violations.push({
      line: lineOf(text, inquiryMarkers[0].index),
      rule: 'invalid data-inquiry-routing value (the only legal value is "facility")',
      snippet: inquiryMarkers[0][0],
    });
  }

  // ── Rule 2 — exactly one phone-visibility marker ─────────────────────────
  if (phoneMarkers.length !== 1) {
    violations.push({
      line: 1,
      rule:
        phoneMarkers.length === 0
          ? "generated facility page has no data-phone-visibility marker"
          : `generated facility page has ${phoneMarkers.length} data-phone-visibility markers (expected exactly 1)`,
      snippet: phoneMarkers.map((m) => m[0]).join(" ") || "(none)",
    });
    return { isFacilityPage, inquiryMode, phoneMode, violations };
  }
  if (!VALID_PHONE_MODES.has(phoneMode)) {
    violations.push({
      line: lineOf(text, phoneMarkers[0].index),
      rule: 'invalid data-phone-visibility value (expected "pro" or "hidden")',
      snippet: phoneMarkers[0][0],
    });
    return { isFacilityPage, inquiryMode, phoneMode, violations };
  }

  // ── Rule 3 — the page carries its own inquiry CTA ────────────────────────
  const inquiryLink = text.match(REQUEST_INFO_LINK);
  if (!inquiryLink) {
    violations.push({
      line: 1,
      rule: "generated facility page offers no inquiry CTA (every eligible facility may receive one)",
      snippet: "(missing ?action=request-info)",
    });
  } else {
    const own = new RegExp(
      `/center/${slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\?action=request-info`,
      "i",
    );
    if (!own.test(text)) {
      push(
        violations,
        text,
        inquiryLink.index,
        "inquiry CTA does not target this page's own facility slug",
        inquiryLink[0],
      );
    }
  }

  // ── Rule 4 — phone-hidden pages must carry no facility phone ─────────────
  if (phoneMode === "hidden") {
    TEL_LINK.lastIndex = 0;
    for (const m of text.matchAll(TEL_LINK)) {
      const d = digitsOf(m[1]);
      if (!ALLOWED_SITE_PHONE_DIGITS.has(d)) {
        push(
          violations,
          text,
          m.index,
          "phone-hidden page exposes a facility tel: link (site support and crisis lines are allowlisted; this is not one)",
          m[0],
        );
      }
    }

    const jsonLdTel = text.match(JSONLD_TELEPHONE);
    if (jsonLdTel) {
      push(
        violations,
        text,
        jsonLdTel.index,
        "phone-hidden page emits a JSON-LD telephone property (structured data must match the on-page contract)",
        jsonLdTel[0],
      );
    }

    const visibleLine = text.match(VISIBLE_PHONE_LINE);
    if (visibleLine) {
      push(
        violations,
        text,
        visibleLine.index,
        "phone-hidden page renders a visible facility Phone: line",
        visibleLine[0],
      );
    }

    const callCta = text.match(CALL_CTA);
    if (callCta) {
      push(violations, text, callCta.index, "phone-hidden page renders a Call CTA", callCta[0]);
    }
  }

  // ── Rule 5 — coordination promises are forbidden in BOTH modes ───────────
  for (const rule of COORDINATION_PROMISES) {
    const m = text.match(rule.re);
    if (m) {
      push(violations, text, m.index, `facility page promises coordination — ${rule.name}`, m[0]);
    }
  }

  return { isFacilityPage, inquiryMode, phoneMode, violations };
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
  let proPhonePages = 0;
  let hiddenPhonePages = 0;
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
        if (result.phoneMode === "pro") proPhonePages++;
        if (result.phoneMode === "hidden") hiddenPhonePages++;
      }
      for (const v of result.violations) {
        violations.push({ rel: relative(ROOT, file), ...v });
      }
    }
  }

  console.log(`[inquiry-routing-prerender] scanned ${scanned} /center page(s)`);
  console.log(`  roots            : ${rootsSeen.join(", ") || "none found (skipped)"}`);
  console.log(
    `  facility profiles: ${facilityPages} (phone pro ${proPhonePages} / hidden ${hiddenPhonePages})`,
  );

  if (violations.length === 0) {
    console.log(
      "✓ every generated facility profile pins its inquiry to the selected facility, " +
        "and publishes a phone number only when has_active_pro() is true",
    );
    process.exit(0);
  }

  console.error(
    `\n✗ ${violations.length} prerender contract violation(s) in generated facility profiles:\n`,
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
      "  page. Phone visibility is derived from public_facilities.is_pro, the build-time\n" +
      "  projection of has_active_pro(); do not reconstruct subscription rules in\n" +
      "  JavaScript and do not derive phone visibility from Featured. Inquiry routing is\n" +
      '  always "facility" — the seeker\'s chosen center, and no other.\n',
  );
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) main();
