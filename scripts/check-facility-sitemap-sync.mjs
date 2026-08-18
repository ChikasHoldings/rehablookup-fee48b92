#!/usr/bin/env node
/**
 * Facility inventory completeness guard (SEO Phase 1).
 *
 * WHAT THIS REPLACED, AND WHY.
 *
 * The previous version compared two numbers:
 *
 *     count(public/center/*.html) === count(<loc> in sitemap-facilities.xml)
 *
 * Production held 3,794 public facilities. A build published 3,032 profiles
 * and a 3,032-URL sitemap, and this check reported "3032 === 3032 ✓". Both
 * sides had shrunk together, so a self-consistent comparison could not see it.
 * At its worst the same check passes on `3 === 3`.
 *
 * The fix is to compare against the facility set the build actually fetched,
 * as a set of identities rather than a count — three-way:
 *
 *     .tmp/facility-build-manifest.json   (what the source returned)
 *              ==  exact set comparison
 *     public/center/*.html                (what we generated)
 *              ==  exact set comparison
 *     sitemap-facilities.xml              (what we told crawlers)
 *
 * Any asymmetry is an error: a missing profile, an extra profile, a missing
 * sitemap URL, an extra sitemap URL, a duplicate slug, a wrong canonical, or a
 * profile generated for a facility that is not in the public source.
 *
 * MODES
 *   REQUIRE_FACILITY_MANIFEST=1 → the manifest must exist (set by build:vercel,
 *     so a production deploy can never fall back to the weaker check).
 *   Otherwise, if the manifest is absent — a checkout with no database
 *     credentials — the check degrades to the two-way file↔sitemap comparison
 *     and says so loudly, because it cannot verify completeness without a
 *     source of truth.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const CENTER_DIR = resolve(ROOT, "public/center");
const SITEMAP = resolve(ROOT, "public/sitemap-facilities.xml");
const MANIFEST = resolve(ROOT, ".tmp/facility-build-manifest.json");
const BASELINE = resolve(ROOT, "scripts/facility-inventory-baseline.json");
const CANONICAL_HOST = "https://rehablookup.com";

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

const fail = (m) => console.error(`${RED}✗ ${m}${RESET}`);
const ok = (m) => console.log(`${GREEN}✓ ${m}${RESET}`);
const warn = (m) => console.warn(`${YELLOW}⚠ ${m}${RESET}`);

/** Report at most `n` members of a set difference, then a tail count. */
function sample(list, n = 10) {
  const head = list.slice(0, n).map((s) => `    • ${s}`);
  if (list.length > n) head.push(`    … and ${list.length - n} more`);
  return head.join("\n");
}

function readSitemapSlugs() {
  const xml = readFileSync(SITEMAP, "utf8");
  const locRe = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  const slugs = [];
  const malformed = [];
  let m;
  while ((m = locRe.exec(xml)) !== null) {
    const url = m[1];
    if (!url.includes("/center/")) continue;
    // A crawler-facing facility URL must be a bare canonical: no query string,
    // no fragment, no trailing slash, on the canonical host.
    if (!url.startsWith(`${CANONICAL_HOST}/center/`) || /[?#]/.test(url) || url.endsWith("/")) {
      malformed.push(url);
      continue;
    }
    slugs.push(url.slice(`${CANONICAL_HOST}/center/`.length));
  }
  return { slugs, malformed };
}

/** Each profile must self-declare the canonical the sitemap advertises. */
function checkCanonicals(slugs) {
  const wrong = [];
  for (const slug of slugs) {
    const file = resolve(CENTER_DIR, `${slug}.html`);
    let html;
    try {
      html = readFileSync(file, "utf8");
    } catch {
      continue; // absence is reported by the set comparison
    }
    const m = html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i);
    const expected = `${CANONICAL_HOST}/center/${slug}`;
    if (!m) wrong.push(`${slug} — no <link rel="canonical">`);
    else if (m[1] !== expected) wrong.push(`${slug} — canonical is ${m[1]}, expected ${expected}`);
  }
  return wrong;
}

/**
 * Minimum-inventory sanity guard.
 *
 * Deliberately not an exact count: the catalogue legitimately moves as
 * facilities are added, suspended or claimed, and a build must not fail
 * because one facility changed state. It exists to catch the catastrophic
 * shape — thousands → a handful → zero — which is always a broken read, never
 * a real edit.
 *
 * Two independent tripwires:
 *   1. An absolute floor. A national treatment directory is never a few dozen
 *      rows, so anything under the floor is a broken fetch by definition.
 *   2. A relative drop against the last recorded good production count. 30% is
 *      generous enough to absorb a large legitimate purge while still catching
 *      a collapse. Raise the baseline deliberately when the catalogue grows.
 */
function checkMinimumInventory(count) {
  const errors = [];
  const floor = Number(process.env.FACILITY_MIN_INVENTORY ?? 1000);

  if (count < floor) {
    errors.push(
      `Facility source returned ${count} facilities, below the absolute floor of ${floor}. ` +
        `A live national directory is never this small — treat this as a broken read, not an empty catalogue.`,
    );
  }

  if (existsSync(BASELINE)) {
    try {
      const baseline = JSON.parse(readFileSync(BASELINE, "utf8"));
      const expected = Number(baseline.count);
      if (Number.isFinite(expected) && expected > 0) {
        const minAllowed = Math.floor(expected * 0.7);
        if (count < minAllowed) {
          errors.push(
            `Facility count ${count} is more than 30% below the recorded baseline of ${expected} ` +
              `(minimum ${minAllowed}). If this drop is real, update ${
                BASELINE.replace(ROOT + "/", "")
              } in the same change that causes it.`,
          );
        } else {
          console.log(
            `${DIM}  Inventory vs baseline: ${count} / ${expected} (floor ${floor}, min allowed ${minAllowed})${RESET}`,
          );
        }
      }
    } catch (err) {
      errors.push(`Could not read facility inventory baseline: ${err.message}`);
    }
  }

  return errors;
}

function main() {
  console.log(`${DIM}── Facility inventory completeness check ──${RESET}`);

  if (!existsSync(SITEMAP)) {
    fail(`Missing sitemap: ${SITEMAP}`);
    return 1;
  }
  if (!existsSync(CENTER_DIR)) {
    if (process.env.REQUIRE_FACILITY_MANIFEST === "1") {
      fail("No public/center directory — a production build must generate facility profiles.");
      return 1;
    }
    warn("No public/center directory found — nothing to verify.");
    return 0;
  }

  const htmlSlugs = readdirSync(CENTER_DIR)
    .filter((f) => f.endsWith(".html"))
    .map((f) => f.replace(/\.html$/, ""));
  const htmlSet = new Set(htmlSlugs);

  const { slugs: sitemapSlugList, malformed } = readSitemapSlugs();
  const sitemapSet = new Set(sitemapSlugList);

  let errors = 0;

  // ── Duplicates ──────────────────────────────────────────────────────────
  const dupes = [...new Set(sitemapSlugList.filter((s, i) => sitemapSlugList.indexOf(s) !== i))];
  if (dupes.length) {
    fail(`${dupes.length} slug(s) appear more than once in sitemap-facilities.xml:`);
    console.error(sample(dupes));
    errors += dupes.length;
  }
  if (malformed.length) {
    fail(`${malformed.length} facility sitemap URL(s) are not bare canonicals:`);
    console.error(sample(malformed));
    errors += malformed.length;
  }

  // ── Manifest (source of truth) ──────────────────────────────────────────
  let manifest = null;
  if (existsSync(MANIFEST)) {
    manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  } else if (process.env.REQUIRE_FACILITY_MANIFEST === "1") {
    fail(
      `Missing ${MANIFEST.replace(ROOT + "/", "")}.\n` +
        `  REQUIRE_FACILITY_MANIFEST=1 means this is a production build, so the\n` +
        `  facility fetch must have run and recorded what it published. Without\n` +
        `  it this check can only compare the corpus against itself, which is\n` +
        `  exactly the blind spot that shipped 3,032 of 3,794 facilities.`,
    );
    return 1;
  }

  if (manifest) {
    const sourceSlugs = manifest.facilities.map((f) => f.slug);
    const sourceSet = new Set(sourceSlugs);
    console.log(
      `${DIM}  Source manifest:${RESET} ${sourceSet.size}  ` +
        `${DIM}Profiles:${RESET} ${htmlSet.size}  ${DIM}Sitemap:${RESET} ${sitemapSet.size}`,
    );

    const invErrors = checkMinimumInventory(sourceSet.size);
    for (const e of invErrors) {
      fail(e);
      errors++;
    }

    const missingProfile = sourceSlugs.filter((s) => !htmlSet.has(s));
    const extraProfile = htmlSlugs.filter((s) => !sourceSet.has(s));
    const missingSitemap = sourceSlugs.filter((s) => !sitemapSet.has(s));
    const extraSitemap = sitemapSlugList.filter((s) => !sourceSet.has(s));

    if (missingProfile.length) {
      fail(`${missingProfile.length} public facilit(y/ies) have no generated profile:`);
      console.error(sample(missingProfile));
      errors += missingProfile.length;
    }
    if (extraProfile.length) {
      fail(
        `${extraProfile.length} generated profile(s) are not in the public facility source ` +
          `(non-public, deleted, or stale):`,
      );
      console.error(sample(extraProfile));
      errors += extraProfile.length;
    }
    if (missingSitemap.length) {
      fail(`${missingSitemap.length} public facilit(y/ies) are missing from sitemap-facilities.xml:`);
      console.error(sample(missingSitemap));
      errors += missingSitemap.length;
    }
    if (extraSitemap.length) {
      fail(`${extraSitemap.length} sitemap URL(s) are not in the public facility source:`);
      console.error(sample(extraSitemap));
      errors += extraSitemap.length;
    }

    if (!missingProfile.length && !extraProfile.length && !missingSitemap.length && !extraSitemap.length) {
      ok(
        `Three-way parity holds: ${sourceSet.size} public facilities = ` +
          `${htmlSet.size} profiles = ${sitemapSet.size} sitemap URLs.`,
      );
    }
  } else {
    warn(
      "No facility build manifest — running the DEGRADED two-way check.\n" +
        "  This compares the corpus against itself and CANNOT detect that both\n" +
        "  sides shrank together. Provide SUPABASE_URL + SUPABASE_ANON_KEY so\n" +
        "  the generators can record what the live source actually returned.",
    );
    console.log(
      `${DIM}  Profiles:${RESET} ${htmlSet.size}  ${DIM}Sitemap:${RESET} ${sitemapSet.size}`,
    );
    const missingFromSitemap = htmlSlugs.filter((s) => !sitemapSet.has(s));
    const missingHtml = sitemapSlugList.filter((s) => !htmlSet.has(s));
    if (missingFromSitemap.length) {
      fail(`${missingFromSitemap.length} static /center/*.html file(s) have no sitemap entry:`);
      console.error(sample(missingFromSitemap));
      errors += missingFromSitemap.length;
    }
    if (missingHtml.length) {
      fail(`${missingHtml.length} sitemap entr(y/ies) have no static HTML mirror:`);
      console.error(sample(missingHtml));
      errors += missingHtml.length;
    }
    if (!missingFromSitemap.length && !missingHtml.length) {
      ok(`Profiles and sitemap agree (${htmlSet.size} each) — completeness NOT verified.`);
    }
  }

  // ── Canonical correctness ───────────────────────────────────────────────
  const wrongCanonicals = checkCanonicals(htmlSlugs);
  if (wrongCanonicals.length) {
    fail(`${wrongCanonicals.length} facility profile(s) have a wrong or missing canonical:`);
    console.error(sample(wrongCanonicals));
    errors += wrongCanonicals.length;
  } else if (htmlSlugs.length) {
    ok(`All ${htmlSlugs.length} facility profiles declare their own canonical.`);
  }

  if (errors > 0) {
    console.error(`\n${RED}✗ Facility inventory check failed with ${errors} error(s).${RESET}`);
    console.error(
      `${DIM}  Re-run: npm run generate:facility-profiles-html && npm run generate:sitemaps${RESET}`,
    );
    return 1;
  }

  console.log(`${GREEN}✓ Facility inventory check passed.${RESET}`);
  return 0;
}

process.exit(main());
