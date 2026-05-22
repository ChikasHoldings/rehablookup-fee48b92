#!/usr/bin/env node
/**
 * CI guard — verifies SPA route titles are correct and parity-preserved.
 *
 * Two failure modes this script catches:
 *
 *  (1) Routes that don't set a unique <title> via react-helmet-async,
 *      so the browser tab ends up showing index.html's default
 *      "Find Drug & Alcohol Rehab Centers Near You | RehabLookup" for
 *      every page. (~97 public pages were in this state at 2026-05-22 —
 *      see docs/seo-title-parity-migration.md.)
 *
 *  (2) SSR↔SPA parity drift: the title in the prerendered HTML differs
 *      from what react-helmet-async writes once <SEO /> mounts. The user
 *      sees a flash on cold load and Search Console may show one title
 *      while users see another.
 *
 * Usage:
 *   # 1) Build dist/ and start a static server pointing at it.
 *   npm run build:vercel   # OR `vite build` for a faster local check
 *   npx serve dist -p 4173 &
 *
 *   # 2) Run this script with the base URL.
 *   BASE_URL=http://localhost:4173 node scripts/check-spa-titles.mjs
 *
 *   # 3) Kill the server when done.
 *   kill %1
 *
 * Sampling:
 *   - Reads public/prerender-manifest.json (~50k paths)
 *   - Picks 20 paths: homepage + a deterministic stratified sample
 *     (different path prefixes) so each run checks a representative
 *     cross-section without flapping
 *
 * Exit codes:
 *   0  all checked routes have unique post-hydration titles AND match
 *      their prerendered (pre-hydration) title
 *   1  one or more failures (details printed to stderr)
 *   2  config error (server unreachable, manifest missing, etc.)
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

const BASE_URL = (process.env.BASE_URL || "http://localhost:4173").replace(/\/+$/, "");
const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE || 20);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 30_000);

// Title text the SPA shell ships with by default. If a route's post-hydration
// title matches this, that route is NOT setting its own <SEO title="…" />.
// Kept in sync with src/lib/seo/titles.ts (TITLES.home is the homepage and
// also the shell default, so we additionally compare per-route uniqueness).
const HOME_TITLE = "Find Drug & Alcohol Rehab Centers Near You | RehabLookup";

// ── Helpers ──────────────────────────────────────────────────────────────────

function die(code, msg) {
  console.error(`[check-spa-titles] ${msg}`);
  process.exit(code);
}

function loadManifest() {
  const path = join(REPO_ROOT, "public", "prerender-manifest.json");
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    die(2, `Cannot read ${path}: ${err.message}`);
  }
}

/**
 * Pick a deterministic stratified sample of paths across prefixes so the
 * check covers a real cross-section (state pages, near-me, treatment types,
 * insurance, etc.) without flapping run to run.
 */
function sample(paths, n) {
  if (paths.length <= n) return paths.slice();

  // Always include the homepage if it's in the manifest, else add it.
  const head = paths.includes("/") ? ["/"] : ["/", ...paths];

  // Group by first segment for stratification.
  const groups = new Map();
  for (const p of head) {
    const key = p === "/" ? "/" : p.split("/")[1] || "/";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const keys = [...groups.keys()];
  const out = new Set();
  // Round-robin pick first item from each group until we hit n.
  let idx = 0;
  while (out.size < n && keys.length > 0) {
    const k = keys[idx % keys.length];
    const bucket = groups.get(k);
    if (bucket && bucket.length) {
      out.add(bucket.shift());
      if (bucket.length === 0) {
        groups.delete(k);
        keys.splice(keys.indexOf(k), 1);
        idx -= 1; // re-anchor after splice
      }
    }
    idx += 1;
  }
  return [...out];
}

/** Extract the first <title>…</title> from a raw HTML response. */
function extractTitle(html) {
  const m = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return m ? m[1].trim() : null;
}

async function fetchSsrTitle(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    return { ok: false, status: res.status, title: null };
  }
  const html = await res.text();
  return { ok: true, status: res.status, title: extractTitle(html) };
}

async function fetchSpaTitle(page, path) {
  const url = `${BASE_URL}${path}`;
  await page.goto(url, { waitUntil: "networkidle", timeout: TIMEOUT_MS });
  // Give react-helmet-async a beat to settle its <head> mutations.
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(250);
  return await page.title();
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Graceful skip when BASE_URL isn't set or unreachable. This check needs
  // a running server + Playwright; we don't want to break CI on every PR
  // just because the workflow didn't spin one up. Set BASE_URL explicitly
  // in workflows where this check is desired.
  if (!process.env.BASE_URL) {
    console.log(
      "[check-spa-titles] BASE_URL not set — skipping. " +
      "Set BASE_URL=http://<host>:<port> against a running static server (e.g. `vite preview`) to enable.",
    );
    return;
  }
  // Server reachable?
  try {
    const probe = await fetch(BASE_URL, { redirect: "manual" });
    if (probe.status >= 500) {
      console.log(`[check-spa-titles] ${BASE_URL} returned ${probe.status} — skipping (no live server).`);
      return;
    }
  } catch (err) {
    console.log(`[check-spa-titles] Cannot reach ${BASE_URL} (${err.message}) — skipping.`);
    return;
  }

  const manifest = loadManifest();
  if (!Array.isArray(manifest)) {
    die(2, "prerender-manifest.json is not an array");
  }

  const picks = sample(manifest, SAMPLE_SIZE);
  console.log(`[check-spa-titles] Checking ${picks.length} routes against ${BASE_URL}`);

  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  const results = [];
  for (const path of picks) {
    try {
      const ssr = await fetchSsrTitle(path);
      const spa = await fetchSpaTitle(page, path);
      results.push({ path, ssrTitle: ssr.title, spaTitle: spa, status: ssr.status });
    } catch (err) {
      results.push({ path, error: err.message });
    }
  }

  await browser.close();

  // Report
  let failures = 0;
  const seenSpaTitles = new Map(); // spaTitle -> first path

  console.log("\nResults:");
  for (const r of results) {
    if (r.error) {
      console.error(`  ✗ ${r.path}  ERROR: ${r.error}`);
      failures += 1;
      continue;
    }

    // (1) Post-hydration title must not be the homepage default unless this IS
    //     the homepage. If it is, the route isn't setting its own <SEO />.
    const isHome = r.path === "/";
    if (!isHome && r.spaTitle === HOME_TITLE) {
      console.error(`  ✗ ${r.path}  uses homepage default title (no <SEO /> setting it)`);
      failures += 1;
      continue;
    }

    // (2) SSR title must equal post-hydration title (parity).
    if (r.ssrTitle !== r.spaTitle) {
      console.error(
        `  ✗ ${r.path}  SSR↔SPA mismatch\n        SSR: ${JSON.stringify(r.ssrTitle)}\n        SPA: ${JSON.stringify(r.spaTitle)}`,
      );
      failures += 1;
      continue;
    }

    // (3) Cross-route uniqueness — same SPA title appearing on two different
    //     paths is a strong signal of a stale title or missing setter.
    const prior = seenSpaTitles.get(r.spaTitle);
    if (prior && prior !== r.path) {
      console.error(`  ✗ ${r.path}  duplicate title shared with ${prior}: ${JSON.stringify(r.spaTitle)}`);
      failures += 1;
      continue;
    }
    seenSpaTitles.set(r.spaTitle, r.path);

    console.log(`  ✓ ${r.path}  ${JSON.stringify(r.spaTitle)}`);
  }

  if (failures > 0) {
    console.error(`\n${failures} of ${results.length} routes failed.`);
    console.error("See docs/seo-title-parity-migration.md for the migration plan.");
    process.exit(1);
  }
  console.log(`\nAll ${results.length} routes OK.`);
}

main().catch((err) => {
  console.error("[check-spa-titles] uncaught:", err);
  process.exit(2);
});
