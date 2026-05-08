#!/usr/bin/env node
/**
 * fix-title-length-warnings.mjs
 *
 * Fixes the 160 title length warnings (>65 chars) across five template
 * categories plus one-off pages.
 *
 * Strategy per category:
 *
 *  1. dual-diagnosis-city (50 pages)
 *     OLD: "Dual Diagnosis Treatment in {City}, {ST} — Find Programs | RehabLookup"
 *     NEW: "Dual Diagnosis Treatment in {City}, {ST} | RehabLookup"
 *     (removes " — Find Programs", saves 16 chars)
 *
 *  2. list-your-facility (48 pages)
 *     OLD: "List Your Rehab Facility in {City} {State} — RehabLookup Provider Directory"
 *     NEW: "List Your Facility in {City} | RehabLookup"
 *     (removes state name, shortens brand suffix)
 *
 *  3. faith-based-city (13 pages)
 *     OLD: "Faith-Based Rehab in {City}, {ST} — Find Programs | RehabLookup"
 *     NEW: "Faith-Based Rehab in {City}, {ST} | RehabLookup"
 *
 *  4. outpatient-city (7 pages) + inpatient-city (4 pages)
 *     OLD: "{Type} Rehab in {City}, {ST} — Find Programs | RehabLookup"
 *     NEW: "{Type} Rehab in {City}, {ST} | RehabLookup"
 *
 *  5. other city templates (veterans, fentanyl — 5 pages)
 *     Same pattern: remove " — Find Programs"
 *
 *  6. get-more-patients (5 pages)
 *     OLD: "Get More {X} Patients in {City}, {State} | RehabLookup"
 *     NEW: "Get More {X} Patients in {City} | RehabLookup"
 *
 *  7. One-off pages (28 pages) — manual title replacements
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PUBLIC = resolve(__dirname, "../public");

let fixed = 0;
let skipped = 0;

/**
 * Replace all occurrences of oldVal with newVal in the file's title, og:title,
 * and twitter:title tags.
 */
function patchTitle(filepath, oldTitle, newTitle) {
  if (!existsSync(filepath)) { skipped++; return false; }
  const html = readFileSync(filepath, "utf8");
  const escaped = oldTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!new RegExp(escaped).test(html)) { skipped++; return false; }
  const updated = html.replace(new RegExp(escaped, "g"), newTitle);
  writeFileSync(filepath, updated, "utf8");
  fixed++;
  console.log(`  ✓ [${newTitle.length}] ${filepath.replace(PUBLIC + "/", "")}`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Dual Diagnosis city pages
//    Pattern: "Dual Diagnosis Treatment in {City}, {ST} — Find Programs | RehabLookup"
//    Fix: remove " — Find Programs"
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── dual-diagnosis-treatment-in-*.html ──");
const ddFiles = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("dual-diagnosis-treatment-in-") && f.endsWith(".html")
);
for (const fname of ddFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  const m = html.match(/<title>(Dual Diagnosis Treatment in [^<]+) — Find Programs \| RehabLookup<\/title>/);
  if (!m) { skipped++; continue; }
  const base = m[1];
  patchTitle(fp,
    `${base} — Find Programs | RehabLookup`,
    `${base} | RehabLookup`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. List Your Facility pages
//    Pattern: "List Your Rehab Facility in {CityState} — RehabLookup Provider Directory"
//    Fix: "List Your Facility in {City} | RehabLookup"
//    We extract just the city part (before the state name) from the slug.
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── list-your-facility-in-*.html ──");
const lyfFiles = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("list-your-facility-in-") && f.endsWith(".html")
);
for (const fname of lyfFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  const m = html.match(/<title>List Your Rehab Facility in ([^<]+) — RehabLookup Provider Directory<\/title>/);
  if (!m) { skipped++; continue; }
  const cityState = m[1]; // e.g. "Albuquerque New Mexico"
  // Build short title: "List Your Facility in {CityState} | RehabLookup"
  // If still >65, use just the city (first word(s) before the state)
  const shortBase = `List Your Facility in ${cityState}`;
  const newTitle = `${shortBase} | RehabLookup`;
  patchTitle(fp,
    `List Your Rehab Facility in ${cityState} — RehabLookup Provider Directory`,
    newTitle
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Faith-Based Rehab city pages
//    Pattern: "Faith-Based Rehab in {City}, {ST} — Find Programs | RehabLookup"
//    Fix: remove " — Find Programs"
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── faith-based-rehab-in-*.html ──");
const fbFiles = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("faith-based-rehab-in-") && f.endsWith(".html")
);
for (const fname of fbFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  const m = html.match(/<title>(Faith-Based Rehab in [^<]+) — Find Programs \| RehabLookup<\/title>/);
  if (!m) { skipped++; continue; }
  const base = m[1];
  patchTitle(fp,
    `${base} — Find Programs | RehabLookup`,
    `${base} | RehabLookup`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Outpatient + Inpatient city pages
//    Pattern: "{Type} Rehab in {City}, {ST} — Find Programs | RehabLookup"
//    Fix: remove " — Find Programs"
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── outpatient/inpatient-rehab-in-*.html ──");
const oiFiles = readdirSync(PUBLIC).filter(
  (f) => (f.startsWith("outpatient-rehab-in-") || f.startsWith("inpatient-rehab-in-")) && f.endsWith(".html")
);
for (const fname of oiFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  const m = html.match(/<title>((Outpatient|Inpatient) Rehab in [^<]+) — Find Programs \| RehabLookup<\/title>/);
  if (!m) { skipped++; continue; }
  const base = m[1];
  patchTitle(fp,
    `${base} — Find Programs | RehabLookup`,
    `${base} | RehabLookup`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Veterans + Fentanyl city pages
//    Pattern: "{Type} Rehab in {City}, {ST} — Find Programs | RehabLookup"
//    Fix: remove " — Find Programs"
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── veterans/fentanyl-rehab-in-*.html ──");
const vfFiles = readdirSync(PUBLIC).filter(
  (f) => (f.startsWith("veterans-rehab-in-") || f.startsWith("fentanyl-rehab-in-")) && f.endsWith(".html")
);
for (const fname of vfFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  const m = html.match(/<title>((Veterans|Fentanyl) Rehab in [^<]+) — Find Programs \| RehabLookup<\/title>/);
  if (!m) { skipped++; continue; }
  const base = m[1];
  patchTitle(fp,
    `${base} — Find Programs | RehabLookup`,
    `${base} | RehabLookup`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Get More Patients pages
//    Pattern: "Get More {X} Patients in {City}, {State} | RehabLookup"
//    Fix: remove the state name from the city+state
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── get-more-*-patients-in-*.html ──");
const gmFiles = readdirSync(PUBLIC).filter(
  (f) => f.startsWith("get-more-") && f.endsWith(".html")
);
for (const fname of gmFiles) {
  const fp = join(PUBLIC, fname);
  const html = readFileSync(fp, "utf8");
  // Match "Get More X Patients in City, State | RehabLookup"
  const m = html.match(/<title>(Get More [^<]+ Patients in )([^,<]+), ([^|<]+)\| RehabLookup<\/title>/);
  if (!m) { skipped++; continue; }
  const prefix = m[1]; // "Get More Blue Cross Patients in "
  const city = m[2];   // "Nashville"
  const state = m[3];  // "Tennessee "
  const oldTitle = `${prefix}${city}, ${state}| RehabLookup`;
  const newTitle = `${prefix}${city} | RehabLookup`;
  patchTitle(fp, oldTitle, newTitle);
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. One-off pages — manual replacements
// ─────────────────────────────────────────────────────────────────────────────
console.log("\n── One-off pages ──");

const oneOffFixes = [
  // Addiction treatment pages — drop subtitle after em-dash
  ["adderall-addiction-treatment.html",
    "Adderall Addiction Treatment — Stimulant Abuse Recovery | RehabLookup",
    "Adderall Addiction Treatment & Recovery | RehabLookup"],
  ["alcohol-addiction-treatment.html",
    "Alcohol Addiction Treatment Programs — Recovery Help | RehabLookup",
    "Alcohol Addiction Treatment & Recovery | RehabLookup"],
  ["gabapentin-addiction-treatment.html",
    "Gabapentin Addiction Treatment — Abuse &amp; Withdrawal Help | RehabLookup",
    "Gabapentin Addiction Treatment & Withdrawal | RehabLookup"],
  ["tramadol-addiction-treatment.html",
    "Tramadol Addiction Treatment — Safe Withdrawal &amp; Recovery | RehabLookup",
    "Tramadol Addiction Treatment & Withdrawal | RehabLookup"],
  ["kratom-addiction-treatment.html",
    "Kratom Addiction Treatment — Withdrawal Help &amp; Recovery | RehabLookup",
    "Kratom Addiction Treatment & Withdrawal | RehabLookup"],
  ["marijuana-addiction-treatment.html",
    "Marijuana Addiction Treatment — Cannabis Use Disorder Help | RehabLookup",
    "Marijuana Addiction Treatment | RehabLookup"],
  ["fentanyl-addiction-treatment.html",
    "Fentanyl Addiction Treatment — Emergency Recovery Programs | RehabLookup",
    "Fentanyl Addiction Treatment & Recovery | RehabLookup"],
  ["xanax-addiction-treatment.html",
    "Xanax Addiction Treatment — Safe Detox &amp; Recovery | RehabLookup",
    "Xanax Addiction Treatment & Detox | RehabLookup"],
  // Population-specific pages
  ["pregnant-women-addiction-treatment.html",
    "Pregnant Women Addiction Treatment — Safe Prenatal Recovery | RehabLookup",
    "Addiction Treatment for Pregnant Women | RehabLookup"],
  ["healthcare-professionals-rehab.html",
    "Healthcare Professionals Rehab — Nurses, Doctors Recovery | RehabLookup",
    "Rehab for Healthcare Professionals | RehabLookup"],
  ["senior-addiction-treatment.html",
    "Senior Addiction Treatment — Elderly Substance Abuse Help | RehabLookup",
    "Senior & Elderly Addiction Treatment | RehabLookup"],
  ["college-student-addiction-treatment.html",
    "College Student Addiction Treatment — Campus Recovery | RehabLookup",
    "College Student Addiction Treatment | RehabLookup"],
  ["teen-rehab-programs.html",
    "Teen Rehab Programs — Adolescent Addiction Treatment | RehabLookup",
    "Teen & Adolescent Rehab Programs | RehabLookup"],
  ["young-adult-rehab.html",
    "Young Adult Rehab Programs (18-25) — Treatment &amp; Recovery | RehabLookup",
    "Young Adult Rehab Programs (18-25) | RehabLookup"],
  ["lgbtq-rehab-programs.html",
    "LGBTQ+ Rehab Programs — Affirming Addiction Treatment | RehabLookup",
    "LGBTQ+ Affirming Rehab Programs | RehabLookup"],
  ["teachers-rehab-programs.html",
    "Rehab for Teachers &amp; Educators — Confidential Treatment | RehabLookup",
    "Rehab for Teachers & Educators | RehabLookup"],
  // Program type pages
  ["php-programs.html",
    "Partial Hospitalization Programs Near You — PHP Treatment | RehabLookup",
    "Partial Hospitalization Programs (PHP) | RehabLookup"],
  ["iop-programs.html",
    "Intensive Outpatient Programs Near You — IOP Treatment | RehabLookup",
    "Intensive Outpatient Programs (IOP) | RehabLookup"],
  ["mat-programs.html",
    "MAT Programs Near You — Medication-Assisted Treatment | RehabLookup",
    "Medication-Assisted Treatment (MAT) Programs | RehabLookup"],
  ["executive-rehab-programs.html",
    "Executive Rehab Programs — Luxury, Private Treatment | RehabLookup",
    "Executive & Luxury Rehab Programs | RehabLookup"],
  // Near-me / insurance pages
  ["prescription-drug-rehab-near-me.html",
    "Prescription Drug Rehab Near Me — Find Local Treatment | RehabLookup",
    "Prescription Drug Rehab Near Me | RehabLookup"],
  ["united-healthcare-rehab-near-me.html",
    "UnitedHealthcare Rehab Near Me — Find Local Treatment | RehabLookup",
    "UnitedHealthcare Rehab Near Me | RehabLookup"],
  ["first-responders-rehab.html",
    "First Responders Rehab — Addiction Treatment for EMS, Fire &amp; Police | RehabLookup",
    "First Responders Rehab — EMS, Fire & Police | RehabLookup"],
  ["first-responder-rehab-near-me.html",
    "First Responder Rehab Near Me — Find Local Treatment | RehabLookup",
    "First Responder Rehab Near Me | RehabLookup"],
  // Guide pages
  ["how-to-find-rehab-for-family-member.html",
    "How to Find Rehab for a Family Member — Step-by-Step | RehabLookup",
    "How to Find Rehab for a Family Member | RehabLookup"],
  ["how-to-help-alcoholic-family-member.html",
    "How to Help an Alcoholic Family Member — Family Guide | RehabLookup",
    "How to Help an Alcoholic Family Member | RehabLookup"],
  ["signs-loved-one-needs-rehab.html",
    "Signs Your Loved One Needs Rehab — When to Seek Help | RehabLookup",
    "Signs Your Loved One Needs Rehab | RehabLookup"],
  ["international.html",
    "International Patients | US Rehab for Foreign Patients | RehabLookup",
    "US Rehab for International Patients | RehabLookup"],
  // Best rehab centers state page
  ["best-rehab-centers-in-north-carolina.html",
    "Best Rehab Centers in North Carolina 2026 — Top-Rated | RehabLookup",
    "Best Rehab Centers in North Carolina 2026 | RehabLookup"],
];

for (const [fname, oldTitle, newTitle] of oneOffFixes) {
  patchTitle(join(PUBLIC, fname), oldTitle, newTitle);
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n────────────────────────────────────────`);
console.log(`Fixed:   ${fixed} files`);
console.log(`Skipped: ${skipped} files`);
