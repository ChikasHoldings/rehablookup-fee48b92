#!/usr/bin/env node
/**
 * Sync committed prerendered HTML with the current SEO page shell.
 *
 * Why this exists
 * ───────────────
 * `public/**.html` is generated output that is committed to the repo, but the
 * generators (`generate-seo-html.mjs`, `generate-missing-html.mjs`, …) only
 * write files that do not already exist. That is deliberate — a full rebuild of
 * ~47k pages on every deploy would be slow and would churn the diff — but it
 * means a change to a SHARED shell fragment in `_seo-page-shell.mjs` reaches
 * new pages only, and the tens of thousands of already-committed pages keep
 * serving the old markup indefinitely.
 *
 * This script closes that gap. It rewrites the shared fragments in place so the
 * committed artifacts match what the current shell would emit. It is NOT a
 * hand-edit of generated pages: every replacement below is derived from the
 * shell module itself at run time, so the two can never drift apart.
 *
 * First use: directory cutover stage 1, which retired the public Concierge
 * placement CTA from `seoCtaStrip()` and the footer's Resources column.
 *
 * Usage
 *   node scripts/sync-prerendered-shell.mjs            # report only
 *   node scripts/sync-prerendered-shell.mjs --apply    # rewrite in place
 *
 * Exit codes
 *   0  nothing stale, or --apply completed
 *   1  stale pages found in report mode (so CI can fail on drift)
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { seoCtaStrip, seoFooter, seoHeader } from "./_seo-page-shell.mjs";
import { renderCta } from "./_unique-content.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const APPLY = process.argv.includes("--apply");

// ── Replacements ────────────────────────────────────────────────────────────
//
// `from` is the fragment as it was emitted by the PREVIOUS shell; `to` is
// pulled live out of the current shell so this file cannot describe an output
// the generator would not actually produce.

const currentCtaStrip = seoCtaStrip();
const currentFooter = seoFooter();
const currentHeader = seoHeader();

// The header's support-phone anchor. Pulled out of seoHeader() rather than
// written by hand so this file can never describe markup the shell would not
// actually emit.
const currentSupportAnchor = currentHeader.match(
  /<a href="tel:[^"]+" class="rl-helpline"[^>]*>[^<]*<\/a>/,
)?.[0];
if (!currentSupportAnchor) {
  console.error("[sync-prerendered-shell] could not locate the support-phone anchor in seoHeader()");
  process.exit(2);
}

const currentResourcesCol = currentFooter.match(
  /<div class="rl-footer-col"><h3>Resources<\/h3>[\s\S]*?<\/ul><\/div>/,
)?.[0];
if (!currentResourcesCol) {
  console.error("[sync-prerendered-shell] could not locate the Resources footer column in seoFooter()");
  process.exit(2);
}

// Whole-block header nav and footer grid. The pre-merge public navigation
// cutover restructured both around the directory model, and every change is a
// destination change rather than a copy tweak, so replacing the blocks
// wholesale is both simpler and safer than a per-anchor list.
const currentPrimaryNav = currentHeader.match(/<nav class="rl-nav"[\s\S]*?<\/nav>/)?.[0];
if (!currentPrimaryNav) {
  console.error("[sync-prerendered-shell] could not locate the primary nav in seoHeader()");
  process.exit(2);
}

const currentFooterGrid = currentFooter.match(
  /<div class="rl-footer-grid">[\s\S]*?<\/ul><\/div>\n      <\/div>/,
)?.[0];
if (!currentFooterGrid) {
  console.error("[sync-prerendered-shell] could not locate the footer grid in seoFooter()");
  process.exit(2);
}

const REPLACEMENTS = [
  {
    // RehabLookup's own number was labelled "Call our 24/7 helpline" /
    // "Call 24/7 · (214) 639-6420" in the header of every prerendered page.
    // The number is real and stays — it is PLATFORM SUPPORT — but presenting
    // it as a 24/7 helpline advertised a treatment-navigation service the
    // directory cutover retired. Real crisis lines (911, 988, SAMHSA) live in
    // the footer disclaimer and are untouched by this replacement.
    name: "header support phone (retired 24/7 helpline framing)",
    from: `<a href="tel:+12146396420" class="rl-helpline" aria-label="Call our 24/7 helpline">Call 24/7 · (214) 639-6420</a>`,
    to: currentSupportAnchor,
  },
  {
    name: "cta-strip (retired /concierge placement CTA)",
    from: `<div class="rl-cta-strip">
    <div>
      <h2>Talk to a recovery advocate today</h2>
      <p>Free, confidential, 24/7. We'll help you find verified treatment that fits your needs and insurance.</p>
    </div>
    <a href="/concierge" class="rl-cta-btn">Get Personalized Help &rarr;</a>
  </div>`,
    to: currentCtaStrip,
  },
  {
    name: "footer Resources column (retired Free Concierge link)",
    from: `          <li><a href="/concierge">Free Concierge</a></li>`,
    to: currentResourcesCol.match(/          <li><a href="\/compare">Compare Facilities<\/a><\/li>/)?.[0],
  },
  {
    // Pre-merge public navigation cutover. The crawler header pointed
    // "Find Treatment" at /rehab-centers — a 301 source, redirected to
    // /search-results — and used a single treatment-type / single-carrier page
    // as the "Treatment Types" / "Insurance" hub. Now: canonical hubs only,
    // plus Compare, matching the SPA's primary nav.
    name: "static header primary nav (redirect source + non-hub destinations)",
    from: `<nav class="rl-nav" aria-label="Primary">
        <a href="/rehab-centers">Find Treatment</a>
        <a href="/treatment-types/drug-addiction-treatment">Treatment Types</a>
        <a href="/insurance/aetna-rehab">Insurance</a>
        <a href="/resources">Resources</a>
        <a href="/for-providers">For Providers</a>
      </nav>`,
    to: currentPrimaryNav,
  },
  {
    // Same cutover, footer half. Fixes three bad destinations at once:
    // /rehab-centers (301 → /search-results), /resources/signs-of-addiction
    // (301 → /resources/youth-addiction-warning-signs) and
    // /resources/insurance-coverage-guide (301 →
    // /resources/insurance-appeal-rehab-denial). Run AFTER the Resources-column
    // replacement above so a page still carrying the /concierge <li> is
    // normalized to the current column shape first and can match here.
    name: "static footer grid (redirect-source destinations)",
    from: `<div class="rl-footer-grid">
        <div class="rl-footer-col"><h3>Find Treatment</h3><ul>
          <li><a href="/rehab-centers">Browse Centers</a></li>
          <li><a href="/drug-rehab-near-me">Drug Rehab Near Me</a></li>
          <li><a href="/alcohol-rehab-near-me">Alcohol Rehab Near Me</a></li>
          <li><a href="/detox-near-me">Detox Centers</a></li>
          <li><a href="/luxury-rehab-near-me">Luxury Rehab</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Insurance</h3><ul>
          <li><a href="/insurance/aetna-rehab">Aetna</a></li>
          <li><a href="/insurance/bcbs-treatment">Blue Cross Blue Shield</a></li>
          <li><a href="/insurance/cigna-rehab">Cigna</a></li>
          <li><a href="/insurance/united-healthcare-rehab">United Healthcare</a></li>
          <li><a href="/insurance/medicaid-rehab">Medicaid</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Resources</h3><ul>
          <li><a href="/resources">All Articles</a></li>
          <li><a href="/resources/signs-of-addiction">Signs of Addiction</a></li>
          <li><a href="/resources/insurance-coverage-guide">Insurance Guide</a></li>
          <li><a href="/resources/intervention-guide-how-to-plan">Intervention Guide</a></li>
          <li><a href="/compare">Compare Facilities</a></li>
        </ul></div>
        <div class="rl-footer-col"><h3>Company</h3><ul>
          <li><a href="/about">About Us</a></li>
          <li><a href="/contact">Contact</a></li>
          <li><a href="/for-providers">For Providers</a></li>
          <li><a href="/editorial-policy">Editorial Policy</a></li>
          <li><a href="/medical-disclaimer">Medical Disclaimer</a></li>
        </ul></div>
      </div>`,
    to: currentFooterGrid,
  },
];

for (const r of REPLACEMENTS) {
  if (typeof r.to !== "string") {
    console.error(`[sync-prerendered-shell] replacement "${r.name}" resolved to no current markup`);
    process.exit(2);
  }
}

// Both CTA helpers take caller-supplied headline/blurb copy, so the enclosing
// block differs page to page. Match on the invariant part — the action links —
// and pull the current markup out of the helper the same way.
const currentUniqueCta = renderCta("", "");
const currentUniqueCtaLinks = currentUniqueCta.match(
  /<a href="[^"]+">[^<]*<\/a>\n\s*<a href="[^"]+" style="[^"]*">[^<]*<\/a>/,
)?.[0];
if (!currentUniqueCtaLinks) {
  console.error("[sync-prerendered-shell] could not derive the current renderCta() action links");
  process.exit(2);
}

const ANCHOR_ONLY = [
  {
    name: "cta-strip anchor (any blurb variant)",
    from: `<a href="/concierge" class="rl-cta-btn">Get Personalized Help &rarr;</a>`,
    to: currentCtaStrip.match(/<a href="[^"]+" class="rl-cta-btn">[^<]*<\/a>/)?.[0],
  },
  {
    name: "unique-content CTA links (any headline variant)",
    from: `<a href="/concierge">Get Free Help</a>\n      <a href="/search-results" style="background:#fff;color:#1B365D">Browse Centers</a>`,
    to: currentUniqueCtaLinks,
  },
];
for (const a of ANCHOR_ONLY) {
  if (typeof a.to !== "string") {
    console.error(`[sync-prerendered-shell] could not derive current markup for "${a.name}"`);
    process.exit(2);
  }
}

// Retired placement/coordinator promises baked into caller-supplied CTA copy by
// the city/near-me page generators (fixed in the same stage).
const COPY_FIXES = [
  [
    " treatment options — free placement guidance from licensed coordinators.",
    " treatment options — compare programs, insurance accepted, and levels of care.",
  ],
  [
    " options — free placement guidance from licensed coordinators.",
    " options — compare programs, insurance accepted, and levels of care.",
  ],
  [
    "Free, confidential placement help from licensed coordinators familiar with ",
    "Browse and compare licensed treatment providers in ",
  ],
  // Resource-article CTA blurb. Removed from generate-resources-html.mjs in
  // favour of the shared directory default. Listed here as well because those
  // mirrors are regenerated from live Supabase during build:vercel, so a
  // partially-regenerated corpus can carry the old blurb.
  [
    "Free to browse, no account required. Free, confidential matching to verified treatment centers that fit your needs.",
    "Free to browse, no account required. Filter licensed treatment centers by location, level of care, and insurance accepted.",
  ],
];

// Copy fixes whose surrounding text is templated (state name, city name, …),
// so an exact-string pair cannot express them. Same intent as COPY_FIXES.
const REGEX_FIXES = [
  {
    name: "county CTA blurb (\"We'll help you find …\" intermediary framing)",
    // generate-county-pages.mjs used to emit
    //   "We'll help you find verified treatment in <State>."
    // which casts RehabLookup as the party doing the finding. The directory
    // cutover position is that the visitor searches and filters.
    re: /We(?:'|&#39;|&apos;|’)ll help you find verified treatment in ([^.<]+)\./g,
    to: "Filter verified treatment centers in $1 by location, level of care, and insurance accepted.",
  },
];

// ── Walk public/ ────────────────────────────────────────────────────────────

function* htmlFiles(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) yield* htmlFiles(full);
    else if (entry.endsWith(".html")) yield full;
  }
}

let scanned = 0;
let stale = 0;
const perReplacement = new Map();

for (const file of htmlFiles(PUBLIC_DIR)) {
  scanned++;
  let html = readFileSync(file, "utf8");
  const before = html;

  for (const r of REPLACEMENTS) {
    if (html.includes(r.from)) {
      perReplacement.set(r.name, (perReplacement.get(r.name) ?? 0) + 1);
      html = html.split(r.from).join(r.to);
    }
  }
  // Run last so the full-block replacements win where both would match.
  for (const a of ANCHOR_ONLY) {
    if (html.includes(a.from)) {
      perReplacement.set(a.name, (perReplacement.get(a.name) ?? 0) + 1);
      html = html.split(a.from).join(a.to);
    }
  }
  for (const [from, to] of COPY_FIXES) {
    if (html.includes(from)) {
      perReplacement.set("retired placement/coordinator CTA copy", (perReplacement.get("retired placement/coordinator CTA copy") ?? 0) + 1);
      html = html.split(from).join(to);
    }
  }
  for (const r of REGEX_FIXES) {
    // `re` is a shared /g regex; replace() resets lastIndex itself, but test()
    // would not — so go straight to replace() and compare.
    const next = html.replace(r.re, r.to);
    if (next !== html) {
      perReplacement.set(r.name, (perReplacement.get(r.name) ?? 0) + 1);
      html = next;
    }
  }

  if (html !== before) {
    stale++;
    if (APPLY) writeFileSync(file, html, "utf8");
  }
}

console.log(`[sync-prerendered-shell] scanned ${scanned} prerendered page(s)`);
for (const [name, count] of perReplacement) {
  console.log(`  ${APPLY ? "rewrote" : "stale  "} ${String(count).padStart(6)}  ${name}`);
}

if (stale === 0) {
  console.log("✓ every prerendered page already matches the current SEO shell");
  process.exit(0);
}

if (APPLY) {
  console.log(`✓ synced ${stale} page(s) to the current SEO shell`);
  process.exit(0);
}

console.error(
  `✗ ${stale} prerendered page(s) are stale relative to the current SEO shell.\n` +
    "  Run: npm run sync:prerendered-shell",
);
process.exit(1);
