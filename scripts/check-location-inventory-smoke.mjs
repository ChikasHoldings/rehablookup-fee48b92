#!/usr/bin/env node
/**
 * Core-market inventory smoke guard (SEO Phase 1, Part 11).
 *
 * The three-way parity guard proves profiles == sitemap == source. It does not
 * prove that a crawler landing on a location page can actually REACH any of
 * them: a corpus of 3,794 perfect facility profiles with zero inbound links
 * from the location pages would pass parity and still be an orphaned island.
 *
 * This guard closes that gap on a handful of markets that are known to hold
 * inventory, and checks the whole chain end to end in the raw HTML:
 *
 *   manifest has facilities for the market
 *        ↓
 *   the static location page contains ≥1 /center/ link IN THE RAW HTML
 *        ↓
 *   each linked slug belongs to this build's facility set
 *        ↓
 *   that facility's profile exists on disk
 *        ↓
 *   that facility appears in sitemap-facilities.xml
 *
 * Counts are never hardcoded — the expected inventory comes from the manifest
 * this build produced. The market list is fixed only because these are large
 * metros that will not plausibly drop to zero facilities; if one legitimately
 * does, the failure message says so and the list should be edited deliberately.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = process.cwd();
const MANIFEST = resolve(ROOT, ".tmp/facility-build-manifest.json");
const SITEMAP = resolve(ROOT, "public/sitemap-facilities.xml");
const CENTER_DIR = resolve(ROOT, "public/center");

const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

// state slug / city slug pairs, matched the same way groupByStateCity() keys.
const MARKETS = [
  { label: "Los Angeles, CA", state: "california", city: "los-angeles" },
  { label: "New York, NY", state: "new-york", city: "new-york" },
  { label: "Chicago, IL", state: "illinois", city: "chicago" },
  { label: "Houston, TX", state: "texas", city: "houston" },
  { label: "Denver, CO", state: "colorado", city: "denver" },
];

const slugify = (s) => String(s ?? "").toLowerCase().replace(/\s+/g, "-");

function centerLinksIn(html) {
  const re = /href="\/center\/([^"#?]+)"/g;
  const out = new Set();
  let m;
  while ((m = re.exec(html)) !== null) out.add(m[1]);
  return [...out];
}

function main() {
  console.log(`${DIM}── Core-market location inventory smoke check ──${RESET}`);

  if (!existsSync(MANIFEST)) {
    if (process.env.REQUIRE_FACILITY_MANIFEST === "1") {
      console.error(
        `${RED}✗ Missing .tmp/facility-build-manifest.json — a production build must produce it.${RESET}`,
      );
      return 1;
    }
    console.warn(
      `${YELLOW}⚠ No facility build manifest — skipping. Set SUPABASE_URL + ` +
        `SUPABASE_ANON_KEY so the generators record what the live source returned.${RESET}`,
    );
    return 0;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));
  const bySlug = new Map(manifest.facilities.map((f) => [f.slug, f]));

  // Facilities per market, straight from this build's manifest.
  const byMarket = new Map();
  for (const f of manifest.facilities) {
    const key = `${slugify(f.state)}/${slugify(f.city)}`;
    if (!byMarket.has(key)) byMarket.set(key, []);
    byMarket.get(key).push(f);
  }

  const sitemapSlugs = new Set();
  if (existsSync(SITEMAP)) {
    const xml = readFileSync(SITEMAP, "utf8");
    const re = /<loc>\s*[^<\s]*\/center\/([^<\s/?#]+)\s*<\/loc>/g;
    let m;
    while ((m = re.exec(xml)) !== null) sitemapSlugs.add(m[1]);
  }

  const profileSlugs = new Set(
    existsSync(CENTER_DIR)
      ? readdirSync(CENTER_DIR).filter((f) => f.endsWith(".html")).map((f) => f.slice(0, -5))
      : [],
  );

  let errors = 0;

  for (const market of MARKETS) {
    const key = `${market.state}/${market.city}`;
    const expected = byMarket.get(key) ?? [];
    const pagePath = resolve(ROOT, `public/rehab-centers/${market.state}/${market.city}.html`);

    if (expected.length === 0) {
      console.error(
        `${RED}✗ ${market.label}: the build manifest has no facilities for "${key}".${RESET}\n` +
          `    Either the source lost this market, or the state/city slug no longer matches.`,
      );
      errors++;
      continue;
    }

    if (!existsSync(pagePath)) {
      console.error(`${RED}✗ ${market.label}: no static page at ${pagePath.replace(ROOT + "/", "")}${RESET}`);
      errors++;
      continue;
    }

    const html = readFileSync(pagePath, "utf8");
    const links = centerLinksIn(html);

    if (links.length === 0) {
      console.error(
        `${RED}✗ ${market.label}: static page contains NO /center/ links in raw HTML, ` +
          `but the manifest has ${expected.length} facilit${expected.length === 1 ? "y" : "ies"} here.${RESET}\n` +
          `    A crawler reading this page cannot reach any facility profile.`,
      );
      errors++;
      continue;
    }

    const notInBuild = links.filter((s) => !bySlug.has(s));
    const noProfile = links.filter((s) => !profileSlugs.has(s));
    const noSitemap = links.filter((s) => !sitemapSlugs.has(s));

    if (notInBuild.length) {
      console.error(
        `${RED}✗ ${market.label}: ${notInBuild.length} linked facilit(y/ies) are not in this build's ` +
          `facility set: ${notInBuild.slice(0, 3).join(", ")}${RESET}`,
      );
      errors++;
    }
    if (noProfile.length) {
      console.error(
        `${RED}✗ ${market.label}: ${noProfile.length} linked facilit(y/ies) have no generated profile: ` +
          `${noProfile.slice(0, 3).join(", ")}${RESET}`,
      );
      errors++;
    }
    if (noSitemap.length) {
      console.error(
        `${RED}✗ ${market.label}: ${noSitemap.length} linked facilit(y/ies) are missing from ` +
          `sitemap-facilities.xml: ${noSitemap.slice(0, 3).join(", ")}${RESET}`,
      );
      errors++;
    }

    if (!notInBuild.length && !noProfile.length && !noSitemap.length) {
      console.log(
        `${GREEN}✓${RESET} ${market.label.padEnd(18)} ` +
          `${DIM}manifest${RESET} ${String(expected.length).padStart(3)}  ` +
          `${DIM}links in raw HTML${RESET} ${String(links.length).padStart(2)}  ` +
          `${DIM}all resolve to a profile + sitemap entry${RESET}`,
      );
    }
  }

  if (errors > 0) {
    console.error(`\n${RED}✗ Location inventory smoke check failed with ${errors} error(s).${RESET}`);
    return 1;
  }
  console.log(`${GREEN}✓ Location inventory smoke check passed for ${MARKETS.length} core markets.${RESET}`);
  return 0;
}

process.exit(main());
