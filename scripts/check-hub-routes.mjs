#!/usr/bin/env node
/**
 * Hub & near-me live route checker.
 *
 * For every prerendered hub route in /public (state hubs, city hubs, near-me
 * pages, treatment-types, insurance, concierge, etc.), this script:
 *
 *   1. Reads the *expected* <title> and canonical from the local prerendered
 *      HTML (the file that will ship to Vercel).
 *   2. Fetches the same path on the target HOST (Vercel preview, production,
 *      or any deployment URL).
 *   3. Asserts HTTP 200 + same <title> + same canonical on the served HTML.
 *
 * This catches regressions like:
 *   - SPA fallback served instead of prerendered HTML (title = generic shell)
 *   - Stale build serving old canonicals
 *   - Routing rule swallowing a hub directory
 *   - Vercel filesystem handler missing nested vs flat HTML files
 *
 * Usage:
 *   node scripts/check-hub-routes.mjs --host https://rehablookup-fee48b92.vercel.app
 *   node scripts/check-hub-routes.mjs --host https://rehablookup.com --concurrency 8
 *   node scripts/check-hub-routes.mjs --sample 50            # spot-check
 *   node scripts/check-hub-routes.mjs --include rehab-near-me,treatment-types
 *
 * Exit code 0 = all green, 1 = at least one failure.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  discoverPrerenderedFiles,
  readPrerenderedHead,
} from "./lib/prerender-discovery.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

// ──────────────────────────────────────────────────────────────────────────
// Args
// ──────────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};
const HOST = (arg("host", "https://rehablookup.com") || "").replace(/\/$/, "");
const CONCURRENCY = Number(arg("concurrency", "10")) || 10;
const SAMPLE = Number(arg("sample", "0")) || 0; // 0 = all
const INCLUDE = (arg("include", "") || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const VERBOSE = argv.includes("--verbose");

const UA =
  "Mozilla/5.0 (compatible; RehabLookupHubChecker/1.0; +https://rehablookup.com)";

// ──────────────────────────────────────────────────────────────────────────
// Hub route classifier
// ──────────────────────────────────────────────────────────────────────────
// We only check pages that are part of the discovery / hub surface — center
// profile pages are validated separately (check-prerender-content.mjs and
// check-structured-data.mjs already cover /center/<slug>).
const HUB_PREFIXES = [
  "/rehab-centers",
  "/rehab-near-me",
  "/best-rehab-centers-in-",
  "/treatment-types",
  "/insurance",
  "/concierge",
  "/us-rehab",
  "/state-rehab-guides",
  "/provider-guides",
];

const ROOT_HUBS = new Set([
  "/",
  "/about",
  "/contact",
  "/faq",
  "/how-it-works",
  "/cost-estimator",
  "/editorial-policy",
  "/medical-disclaimer",
  "/for-providers",
  "/provider-resources",
  "/provider-faq",
]);

function isHubRoute(route) {
  if (ROOT_HUBS.has(route)) return true;
  return HUB_PREFIXES.some((p) => route === p || route.startsWith(p + "/") || route.startsWith(p + "-"));
}

// Skip /center/<slug> — these have their own check.
function isCenterProfile(route) {
  return route === "/center" || route.startsWith("/center/");
}

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────
function normalizeCanonical(c) {
  if (!c) return null;
  // Strip trailing slash (except root) and lowercase the path so we compare
  // semantically — the prerendered HTML uses canonical URLs and the live HTML
  // should match exactly.
  try {
    const u = new URL(c);
    u.hash = "";
    if (u.pathname !== "/" && u.pathname.endsWith("/")) {
      u.pathname = u.pathname.replace(/\/+$/, "");
    }
    return u.toString();
  } catch {
    return c.replace(/\/+$/, "");
  }
}

function pickTitle(html) {
  const m = html.match(/<title>\s*([^<]+?)\s*<\/title>/i);
  return m ? m[1] : null;
}

function pickCanonical(html) {
  const m = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

// SPA shell title — if the live HTML returns this, it means the prerendered
// file was NOT served and Vercel fell back to /index.html.
const SPA_SHELL_TITLE_HINTS = [
  /lovable/i,
  /^rehablookup$/i,
  /^find addiction treatment & rehab centers near you/i, // generic homepage title
];
function looksLikeSpaShell(title, expectedTitle) {
  if (!title) return true;
  if (title === expectedTitle) return false;
  // Only flag as shell if the served title is one of the known generic fallbacks
  // AND it differs from the expected page title. This avoids false positives
  // when a hub legitimately uses a brand-prefixed title.
  return SPA_SHELL_TITLE_HINTS.some((re) => re.test(title));
}

async function fetchHtml(url) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch(url, {
      redirect: "manual",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
      },
      signal: ctrl.signal,
    });
    const status = res.status;
    let body = "";
    if (status >= 200 && status < 300) {
      body = await res.text();
    }
    return { status, body, location: res.headers.get("location") || null };
  } finally {
    clearTimeout(t);
  }
}

async function pool(items, worker, concurrency) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────
async function main() {
  if (!HOST.startsWith("http")) {
    console.error(`✖ Invalid --host: ${HOST}`);
    process.exit(2);
  }

  const all = discoverPrerenderedFiles(publicDir);
  let hubs = all.filter(({ route }) => !isCenterProfile(route) && isHubRoute(route));

  if (INCLUDE.length > 0) {
    hubs = hubs.filter(({ route }) =>
      INCLUDE.some((seg) => route === `/${seg}` || route.startsWith(`/${seg}/`) || route.startsWith(`/${seg}-`)),
    );
  }

  hubs.sort((a, b) => a.route.localeCompare(b.route));

  if (SAMPLE > 0 && hubs.length > SAMPLE) {
    // Deterministic stride sample so coverage stays diverse across each
    // hub family even when --sample is small.
    const stride = Math.ceil(hubs.length / SAMPLE);
    hubs = hubs.filter((_, i) => i % stride === 0).slice(0, SAMPLE);
  }

  console.log("\n🌐 Hub & near-me live route check");
  console.log("────────────────────────────────────────────────────────────");
  console.log(`Host        : ${HOST}`);
  console.log(`Routes      : ${hubs.length}`);
  console.log(`Concurrency : ${CONCURRENCY}`);
  if (SAMPLE) console.log(`Sample      : ${SAMPLE} (stride)`);
  if (INCLUDE.length) console.log(`Include     : ${INCLUDE.join(", ")}`);
  console.log("");

  /** @type {{route:string, kind:string, msg:string}[]} */
  const failures = [];
  let ok = 0;

  await pool(
    hubs,
    async ({ route, file }) => {
      const expected = readPrerenderedHead(file);
      const expectedTitle = expected.title;
      const expectedCanonical = normalizeCanonical(expected.canonical);
      const url = HOST + route;

      let result;
      try {
        result = await fetchHtml(url);
      } catch (err) {
        failures.push({ route, kind: "fetch", msg: String(err?.message || err) });
        return;
      }

      if (result.status !== 200) {
        failures.push({
          route,
          kind: "status",
          msg: `expected 200, got ${result.status}${result.location ? ` → ${result.location}` : ""}`,
        });
        return;
      }

      const liveTitle = pickTitle(result.body);
      const liveCanonical = normalizeCanonical(pickCanonical(result.body));

      if (!liveTitle) {
        failures.push({ route, kind: "title", msg: "live HTML has no <title>" });
        return;
      }
      if (expectedTitle && liveTitle !== expectedTitle) {
        // SPA shell fallback is the most common cause — call it out explicitly.
        if (looksLikeSpaShell(liveTitle, expectedTitle)) {
          failures.push({
            route,
            kind: "spa-fallback",
            msg: `served SPA shell ("${liveTitle}") instead of prerendered HTML ("${expectedTitle}")`,
          });
        } else {
          failures.push({
            route,
            kind: "title",
            msg: `title mismatch:\n      expected: ${expectedTitle}\n      got:      ${liveTitle}`,
          });
        }
        return;
      }

      if (!liveCanonical) {
        failures.push({ route, kind: "canonical", msg: "live HTML has no canonical link" });
        return;
      }
      if (expectedCanonical && liveCanonical !== expectedCanonical) {
        failures.push({
          route,
          kind: "canonical",
          msg: `canonical mismatch:\n      expected: ${expectedCanonical}\n      got:      ${liveCanonical}`,
        });
        return;
      }

      ok++;
      if (VERBOSE) console.log(`  ✓ ${route}`);
    },
    CONCURRENCY,
  );

  console.log(`✅ Passed : ${ok}/${hubs.length}`);
  if (failures.length === 0) {
    console.log("\n🎉 All hub & near-me routes return 200 with correct title + canonical.\n");
    process.exit(0);
  }

  // Group failures by kind for readability.
  const byKind = new Map();
  for (const f of failures) {
    if (!byKind.has(f.kind)) byKind.set(f.kind, []);
    byKind.get(f.kind).push(f);
  }

  console.log(`\n❌ Failed : ${failures.length}`);
  for (const [kind, list] of byKind) {
    console.log(`\n── ${kind} (${list.length}) ──`);
    for (const f of list.slice(0, 25)) {
      console.log(`  • ${f.route}`);
      console.log(`    ${f.msg}`);
    }
    if (list.length > 25) console.log(`  … and ${list.length - 25} more`);
  }
  console.log("");
  process.exit(1);
}

main().catch((err) => {
  console.error("✖ Hub route check crashed:", err);
  process.exit(2);
});
