#!/usr/bin/env node
/**
 * fix-desc-length-warnings.mjs
 *
 * Fixes the 83 meta description length warnings (>165 chars) across three
 * template categories:
 *
 *  1. list-your-facility-in-*.html  (48 pages)
 *     OLD: "List your addiction treatment facility in {City} {State} on
 *           RehabLookup. Reach patients searching for rehab centers in your
 *           area. Free and paid listing options available."
 *     NEW: "List your {City} addiction treatment facility on RehabLookup.
 *           Reach patients searching for local rehab centers. Free and paid
 *           listing options available."
 *
 *  2. best-rehab-centers-in-*.html  (24 pages)
 *     OLD: "Discover the top-rated rehab centers in {State}. Compare accredited
 *           addiction treatment facilities, read reviews, and find the right
 *           program for your recovery needs."
 *     NEW: "Discover top-rated rehab centers in {State}. Compare accredited
 *           addiction treatment facilities, read reviews, and find the right
 *           recovery program."
 *
 *  3. Editorial guide pages (9 pages) — bespoke descriptions replacing the
 *     generic boilerplate.
 *
 *  4. news.html  (1 page)
 *
 *  5. alcohol-rehab.html (1 page — canonical redirect, already noindex)
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = resolve(__dirname, "../public");

let fixed = 0;
let skipped = 0;

function patch(filepath, oldDesc, newDesc) {
  if (!existsSync(filepath)) { skipped++; return; }
  const html = readFileSync(filepath, "utf8");
  // Replace in <meta name="description">, og:description, and twitter:description
  const escaped = oldDesc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "g");
  if (!re.test(html)) { skipped++; return; }
  const updated = html.replace(new RegExp(escaped, "g"), newDesc);
  writeFileSync(filepath, updated, "utf8");
  fixed++;
  console.log(`  ✓ ${filepath.replace(PUBLIC + "/", "")} (${newDesc.length} chars)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. list-your-facility-in-*.html
//    Template: "List your addiction treatment facility in {CityState} on
//    RehabLookup. Reach patients searching for rehab centers in your area.
//    Free and paid listing options available."
//    Fix: replace "{CityState} on RehabLookup. Reach patients searching for
//    rehab centers in your area." with "{City} on RehabLookup. Reach patients
//    searching for local rehab centers."
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── list-your-facility-in-*.html ──");

// We need to extract the city+state text from each file's existing description
// and build the shorter version.
import { readdirSync } from "node:fs";

const lyf = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("list-your-facility-in-") && f.endsWith(".html")
);

for (const fname of lyf) {
  const filepath = join(PUBLIC, fname);
  const html = readFileSync(filepath, "utf8");
  const m = html.match(
    /<meta name="description" content="List your addiction treatment facility in ([^"]+) on RehabLookup\. Reach patients searching for rehab centers in your area\. Free and paid listing options available\."/
  );
  if (!m) { skipped++; continue; }
  const cityState = m[1]; // e.g. "Albuquerque New Mexico"
  const oldDesc = `List your addiction treatment facility in ${cityState} on RehabLookup. Reach patients searching for rehab centers in your area. Free and paid listing options available.`;
  const newDesc = `List your ${cityState} addiction treatment facility on RehabLookup. Reach patients searching for local rehab centers. Free and paid listing options available.`;
  if (newDesc.length > 165) {
    // Further trim: drop "Free and paid listing options available."
    const newDesc2 = `List your ${cityState} addiction treatment facility on RehabLookup. Reach patients searching for local rehab centers and start your listing today.`;
    patch(filepath, oldDesc, newDesc2.length <= 165 ? newDesc2 : newDesc);
  } else {
    patch(filepath, oldDesc, newDesc);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. best-rehab-centers-in-*.html
//    Template: "Discover the top-rated rehab centers in {State}. Compare
//    accredited addiction treatment facilities, read reviews, and find the
//    right program for your recovery needs."
//    Fix: drop "the", shorten ending.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── best-rehab-centers-in-*.html ──");

const brc = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("best-rehab-centers-in-") && f.endsWith(".html")
);

for (const fname of brc) {
  const filepath = join(PUBLIC, fname);
  const html = readFileSync(filepath, "utf8");
  const m = html.match(
    /<meta name="description" content="Discover the top-rated rehab centers in ([^"]+)\. Compare accredited addiction treatment facilities, read reviews, and find the right program for your recovery needs\."/
  );
  if (!m) { skipped++; continue; }
  const state = m[1];
  const oldDesc = `Discover the top-rated rehab centers in ${state}. Compare accredited addiction treatment facilities, read reviews, and find the right program for your recovery needs.`;
  const newDesc = `Discover top-rated rehab centers in ${state}. Compare accredited addiction treatment facilities, read reviews, and find the right recovery program.`;
  patch(filepath, oldDesc, newDesc);
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Editorial guide pages — bespoke descriptions
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── Editorial guide pages ──");

const editorialFixes = [
  {
    file: "12-step-facilitation-therapy.html",
    old: "12 Step Facilitation Therapy: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Learn how 12-Step Facilitation Therapy works, what to expect in sessions, and how it supports long-term sobriety. Find accredited 12-step programs near you.",
  },
  {
    file: "addiction-and-relationships-guide.html",
    old: "Addiction And Relationships Guide: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Understand how addiction affects relationships and learn evidence-based strategies for rebuilding trust, setting boundaries, and supporting recovery as a family.",
  },
  {
    file: "recovery-support-groups-guide.html",
    old: "Recovery Support Groups Guide: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Explore recovery support groups including AA, NA, SMART Recovery, and more. Find the right peer support community to strengthen your sobriety and long-term recovery.",
  },
  {
    file: "opioid-withdrawal-timeline.html",
    old: "Opioid Withdrawal Timeline: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Understand the opioid withdrawal timeline — from early symptoms at 6–12 hours to post-acute effects. Learn what to expect and how medically supervised detox helps.",
  },
  {
    file: "what-happens-after-rehab.html",
    old: "What Happens After Rehab: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Learn what happens after rehab — from discharge planning and sober living to outpatient follow-up and relapse prevention strategies for lasting recovery.",
  },
  {
    file: "what-to-expect-in-rehab.html",
    old: "What To Expect In Rehab: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Find out what to expect in rehab: daily schedules, therapy types, detox protocols, and how residential treatment prepares you for a successful recovery.",
  },
  {
    file: "talking-to-your-employer-about-rehab.html",
    old: "Talking To Your Employer About Rehab: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Learn how to talk to your employer about rehab, understand your FMLA rights, and navigate confidential leave options while protecting your career and recovery.",
  },
  {
    file: "understanding-rehab-levels-of-care.html",
    old: "Understanding Rehab Levels Of Care: Expert addiction treatment information and resources from RehabLookup. Find accredited rehab centers, compare programs, and start your recovery journey today.",
    new: "Understand the ASAM levels of care — from medical detox and inpatient to PHP, IOP, and outpatient — and find the right level of addiction treatment for your needs.",
  },
];

for (const { file, old: oldDesc, new: newDesc } of editorialFixes) {
  patch(join(PUBLIC, file), oldDesc, newDesc);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. news.html
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── news.html ──");
patch(
  join(PUBLIC, "news.html"),
  "Stay up to date with the latest addiction treatment news, research, and recovery resources. Expert-curated articles on rehab, mental health, and substance use disorders.",
  "Stay current with addiction treatment news, research, and recovery resources. Expert-curated articles on rehab, mental health, and substance use disorders."
);

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`Fixed:   ${fixed} files`);
console.log(`Skipped: ${skipped} files`);
