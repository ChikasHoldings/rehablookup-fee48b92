#!/usr/bin/env node
/**
 * check-public-directory-truth.mjs
 *
 * Build-time guard: fails the build if the HOMEPAGE / root shell reintroduces
 * a DIRECTORY-WIDE claim that RehabLookup's inventory is verified.
 *
 * Why this exists
 * ───────────────
 * Post-rollout verification of stage 2 found the root shell still shipping:
 *
 *   • "Search 3,800+ verified addiction treatment centers."      (meta/OG/Twitter)
 *   • "connects individuals and families with verified … centers" (noscript lead)
 *   • "Verified Facilities: Listed treatment centers go through a verification
 *      process … before they appear in the directory"            (noscript bullet)
 *   • "browse verified facilities near you"                      (noscript steps)
 *   • "<directory count>+ Verified Facilities"                   (React trust bar)
 *
 * None of that is supported by production data, and the reasoning is already
 * written down in src/components/home/TrustStrip.tsx, which retired the same
 * claim earlier:
 *
 *   public_facilities                       3,794 listings
 *   raw facilities.verified = true              5 rows (3 approved+unsuspended)
 *   public_facilities.verified              Pro-gated
 *   active Pro subscriptions                    0
 *
 * So the directory is ~3,800 records of which a handful carry a verification
 * signal, and the column that would expose it publicly is a paid feature that
 * nobody currently holds. Describing the whole inventory as "verified" is a
 * YMYL-grade misstatement and a LegitScript / Google Healthcare-ads exposure.
 *
 * The correct model, which this guard encodes:
 *   • RehabLookup LISTS directory records.
 *   • SOME records carry provider / account / verification signals.
 *   • Facility-specific accreditation and licensing data is shown when present.
 *   • Users confirm current licensing, accreditation, availability and
 *     coverage with the facility or the issuing authority.
 *
 * What is deliberately NOT banned
 * ───────────────────────────────
 * The word "verified" is legitimate and stays legal:
 *   • a facility-specific verified badge ("Verified", "Verified facility")
 *   • the Pro product feature name ("Verified Listings", "a verified badge")
 *   • verified provider contact state ("verified phone", "reply_email_verified")
 *   • verified accreditation on a record that actually carries it
 *   • every internal / admin / provider verification workflow
 *   • identifiers and column names in code (`facility.verified`)
 *
 * Only a claim about the WHOLE INVENTORY fails. That is why every rule below
 * needs either a plural inventory noun, a directory-sized count, or an
 * "everything is vetted before it appears" process promise.
 *
 * Scope — homepage / root only, deliberately
 * ──────────────────────────────────────────
 * A repo-wide grep for "verified" would be useless: ~46k prerendered pages,
 * provider/admin surfaces and editorial articles all use the word correctly.
 * This walks the homepage and root shell only:
 *
 *   1. index.html                     — the SPA + noscript shell (source of truth)
 *   2. dist/index.html                — the built homepage actually served
 *   3. src/pages/Index.tsx            — the React homepage
 *   4. src/components/home/**.tsx     — homepage-only components
 *   5. src/components/SEO.tsx         — the Organization / WebSite schema injected
 *                                       into the root shell on every route
 *
 * Per-route SEO description builders in (5) that take a live `facilityCount`
 * for a CITY or TREATMENT-TYPE page are out of scope here: those are not
 * whole-directory claims and are a separate editorial pass.
 *
 * Usage
 *   node scripts/check-public-directory-truth.mjs
 *
 * Exit codes
 *   0  no directory-wide verification claim on the homepage/root shell
 *   1  at least one violation found
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// A "verified" adjective followed by an optional treatment qualifier and a
// PLURAL inventory noun. Plural is the whole point: "Verified" and "verified
// facility" describe one listing; "verified facilities" describes the shelf.
// "listings" is excluded on purpose — "Verified Listings" is the name of the
// Pro product feature a provider buys for their own record.
const VERIFIED_INVENTORY =
  "verified\\s+(?:(?:drug|alcohol|addiction|substance|rehab|rehabilitation|treatment|detox|recovery)[\\s-]+(?:and[\\s-]+)?){0,4}(?:centers|centres|facilities)";

export const FORBIDDEN = [
  {
    name: "directory-wide inventory described as verified",
    // "3,800+ verified addiction treatment centers", "Search verified
    // treatment centers", "browse verified facilities near you",
    // "Verified Facilities" as a stat label, "verified centers".
    re: new RegExp(`\\b${VERIFIED_INVENTORY}\\b`, "i"),
    hint: 'use "treatment center listings" / "listed treatment centers" / "treatment centers"',
  },
  {
    name: "directory-sized count presented as verified",
    // Catches a rewrite that keeps the number but moves the noun out of
    // reach: "3,800+ verified", "3,794 verified".
    re: /\b\d[\d,]{2,}\s*\+?\s+verified\b/i,
    hint: "the directory count is a listing count, not a verification count",
  },
  {
    name: "live directory count rendered next to a 'Verified' label",
    // The React defect: `{stats.facilityCount…}+` in one element and the word
    // "Verified" in the next, so no single-string rule can see it. Window is
    // wide enough to cross the closing tags between them, narrow enough that
    // an unrelated "verified" elsewhere in the component cannot reach it.
    re: /\b(?:facilityCount|facilitiesCount|facility_count)\b[\s\S]{0,320}?\bVerified\b/,
    hint: "label the directory count for what it counts (e.g. 'Treatment Centers Listed')",
    sourceOnly: true,
  },
  {
    name: "blanket 'verification before listing' process promise",
    // "Listed treatment centers go through a verification process … before
    // they appear in the directory", "every facility is vetted before it is
    // listed", "all centers must be verified before they appear".
    re: /\b(?:all|every|each|listed|our)\s+(?:\w+[\s-]+){0,3}(?:centers?|centres?|facilit(?:y|ies)|listings?|programs?)\b[^.<]{0,120}\b(?:verif|vett)[a-z]*\b/i,
    hint: "describe the directory data that is actually shown, and tell users to confirm licensing with the facility or issuing authority",
  },
  {
    name: "blanket 'nothing appears until verified' promise",
    re: /\b(?:verif|vett)[a-z]*\b[^.<]{0,120}\bbefore\s+(?:they|it|these)\s+(?:appear|are\s+(?:listed|added|published)|is\s+(?:listed|added|published))/i,
    hint: "listings are imported directory records; they do not clear a RehabLookup verification gate",
  },
  {
    name: "verified inventory claimed across the whole service area",
    // "verified … centers across all 50 states", "verified treatment centers
    // in every state", "verified facilities across the United States".
    re: new RegExp(
      `${VERIFIED_INVENTORY}\\s+(?:in|across|throughout|nationwide\\s+in)\\s+(?:all\\s+)?(?:50\\s+states|every\\s+state|the\\s+u\\.?s\\.?a?\\b|the\\s+united\\s+states|nationwide)`,
      "i",
    ),
    hint: "geographic coverage is a listing count, not a verification claim",
  },
];

// ── Targets ────────────────────────────────────────────────────────────────
// `sourceOnly` rules are skipped on built HTML: the JSX/identifier shape they
// look for only exists before bundling, and minified output would make the
// proximity window meaningless.
const HTML_TARGETS = ["index.html", join("dist", "index.html")];
const SOURCE_FILES = [
  join("src", "pages", "Index.tsx"),
  join("src", "components", "SEO.tsx"),
  // The REAL source of the served homepage title/description: vite.config.ts's
  // `syncHomepageTitle` plugin substitutes DESCRIPTIONS.home into index.html at
  // build time, so a fix applied only to index.html is silently overwritten in
  // dist/. That is precisely how the "3,800+ verified" claim survived the first
  // pass of this hotfix.
  join("src", "lib", "seo", "titles.ts"),
];
const SOURCE_DIRS = [join("src", "components", "home")];

function collectSourceFiles() {
  const files = [...SOURCE_FILES];
  for (const dir of SOURCE_DIRS) {
    const abs = join(ROOT, dir);
    if (!existsSync(abs)) continue;
    for (const entry of readdirSync(abs)) {
      const rel = join(dir, entry);
      if (statSync(join(ROOT, rel)).isFile() && /\.(tsx?|jsx?)$/.test(entry)) files.push(rel);
    }
  }
  return files;
}

/**
 * Comments carry the rationale for these very rules ("this used to say
 * 'verified … centers'"), so scanning them would make documenting the fix
 * impossible. Strip them; the shipped copy is what matters.
 */
function stripComments(text, isHtml) {
  // Blank the comment but keep its newlines, so reported line numbers still
  // point at the real line in the file.
  const blank = (m) => m.replace(/[^\n]/g, " ");
  if (isHtml) return text.replace(/<!--[\s\S]*?-->/g, blank);
  return text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/^[ \t]*\/\/.*$/gm, blank);
}

function lineOf(text, index) {
  return text.slice(0, index).split("\n").length;
}

function main() {
  const violations = [];
  const targets = [
    ...HTML_TARGETS.map((f) => ({ rel: f, isHtml: true })),
    ...collectSourceFiles().map((f) => ({ rel: f, isHtml: false })),
  ];

  let scanned = 0;
  for (const { rel, isHtml } of targets) {
    const abs = join(ROOT, rel);
    if (!existsSync(abs)) continue; // dist/ only exists after a build
    scanned += 1;
    const raw = readFileSync(abs, "utf8");
    const text = stripComments(raw, isHtml);

    for (const rule of FORBIDDEN) {
      if (rule.sourceOnly && isHtml) continue;
      const re = new RegExp(rule.re.source, rule.re.flags.includes("g") ? rule.re.flags : `${rule.re.flags}g`);
      let m;
      while ((m = re.exec(text)) !== null) {
        violations.push({
          file: relative(ROOT, abs),
          line: lineOf(text, m.index),
          rule: rule.name,
          hint: rule.hint,
          excerpt: m[0].replace(/\s+/g, " ").slice(0, 140),
        });
        if (m.index === re.lastIndex) re.lastIndex += 1;
      }
    }
  }

  if (violations.length > 0) {
    console.error("\n✗ check-public-directory-truth: homepage makes unsupported directory-wide verification claims\n");
    for (const v of violations) {
      console.error(`  ${v.file}:${v.line}`);
      console.error(`    rule    : ${v.rule}`);
      console.error(`    matched : ${v.excerpt}`);
      console.error(`    fix     : ${v.hint}\n`);
    }
    console.error(
      "  RehabLookup lists ~3,800 directory records; only a handful carry a verification\n" +
        "  signal and public_facilities.verified is Pro-gated (active Pro = 0). Facility-\n" +
        "  specific verified state is still allowed — a whole-inventory claim is not.\n",
    );
    process.exit(1);
  }

  console.log(`✓ check-public-directory-truth: ${scanned} homepage/root artifact(s) clean`);
}

main();
