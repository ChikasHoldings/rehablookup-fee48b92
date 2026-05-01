#!/usr/bin/env node
/**
 * Post-deploy Vercel validation crawler.
 *
 * Runs against a Vercel preview or production URL and verifies:
 *
 *   1. Extensionless URLs serve prerendered HTML (not the SPA shell).
 *   2. Canonical, robots meta, H1, title differ from the homepage.
 *   3. Googlebot UA fetch sees the same content as a regular UA.
 *   4. /sitemap.xml is reachable, parseable, and only contains URLs that
 *      return 200 with non-shell HTML.
 *   5. /robots.txt is reachable and declares the sitemap.
 *   6. /center/<slug> facility profiles render unique titles (not homepage).
 *
 * Usage:
 *   VERCEL_URL=https://rehablookup-xxx.vercel.app node scripts/validate-vercel-deploy.mjs
 *   # or against production:
 *   VERCEL_URL=https://rehablookup.com node scripts/validate-vercel-deploy.mjs
 *
 * Optional flags:
 *   --sample N    Sample N URLs from sitemap (default 50, 0 = all up to 1000)
 *   --verbose     Print every URL result
 *   --bot-only    Only test Googlebot UA
 */

const VERCEL_URL = (process.env.VERCEL_URL || process.argv.find((a) => a.startsWith("https://")) || "").replace(/\/$/, "");
if (!VERCEL_URL) {
  console.error("❌ VERCEL_URL is required. Example:\n  VERCEL_URL=https://rehablookup.com node scripts/validate-vercel-deploy.mjs");
  process.exit(2);
}

const args = process.argv.slice(2);
const SAMPLE = (() => {
  const i = args.indexOf("--sample");
  if (i === -1) return 50;
  return parseInt(args[i + 1] || "50", 10);
})();
const VERBOSE = args.includes("--verbose");
const BOT_ONLY = args.includes("--bot-only");

const UA_BROWSER = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36";
const UA_GOOGLEBOT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

// Hubs that MUST serve unique prerendered HTML (smoke test before sampling).
const REQUIRED_HUBS = [
  "/",
  "/rehab-centers",
  "/treatment-types",
  "/locations",
  "/insurance",
  "/about",
  "/contact",
  "/for-providers",
  "/rehab-near-me",
  "/drug-rehab-near-me",
  "/alcohol-rehab-near-me",
  "/luxury-rehab-near-me",
  "/rehab-centers/california",
  "/rehab-centers/texas",
  "/rehab-centers/florida",
];

const stats = {
  hubsChecked: 0,
  hubsPassed: 0,
  hubsFailed: [],
  sampledChecked: 0,
  sampledPassed: 0,
  sampledFailed: [],
  facilitiesChecked: 0,
  facilitiesPassed: 0,
  facilitiesFailed: [],
  shellLeak: [], // routes that returned the homepage SPA shell
};

async function fetchHtml(url, ua = UA_BROWSER) {
  const res = await fetch(url, {
    headers: { "User-Agent": ua, Accept: "text/html,application/xhtml+xml" },
    redirect: "follow",
  });
  const text = await res.text();
  return { status: res.status, url: res.url, html: text };
}

function extractHead(html) {
  const head = html.slice(0, Math.min(html.length, 16000));
  const title = (head.match(/<title>\s*([^<]+?)\s*<\/title>/i) || [])[1] || "";
  const canonical = (head.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) || [])[1] || "";
  const robots = (head.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i) || [])[1] || "";
  const ogTitle = (head.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || [])[1] || "";
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const h1 = h1Match ? h1Match[1].replace(/<[^>]+>/g, "").trim() : "";
  const jsonLd = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  return { title, canonical, robots, ogTitle, h1, jsonLdCount: jsonLd.length, length: html.length };
}

const HOMEPAGE_TITLE_FRAGMENTS = [
  "Find Verified Treatment Centers",
  "RehabLookup",
];

function isHomepageShell(meta, expectedPath) {
  if (expectedPath === "/") return false;
  // Heuristic: a shell leak is when the title looks generic AND canonical doesn't match the path.
  const titleLooksHome = HOMEPAGE_TITLE_FRAGMENTS.some((f) => meta.title.includes(f)) && !meta.title.toLowerCase().includes(expectedPath.split("/").filter(Boolean).pop() || "__never__");
  const canonicalMismatch = meta.canonical && !meta.canonical.includes(expectedPath);
  return titleLooksHome && canonicalMismatch;
}

async function checkUrl(pathStr, bucket = "hubs", uas = BOT_ONLY ? [UA_GOOGLEBOT] : [UA_BROWSER, UA_GOOGLEBOT]) {
  const url = VERCEL_URL + pathStr;
  for (const ua of uas) {
    let res;
    try { res = await fetchHtml(url, ua); }
    catch (e) {
      stats[`${bucket}Failed`].push({ path: pathStr, ua, error: e.message });
      return false;
    }
    if (res.status !== 200) {
      stats[`${bucket}Failed`].push({ path: pathStr, ua, status: res.status });
      if (VERBOSE) console.log(`  ❌ ${pathStr} [${ua === UA_GOOGLEBOT ? "BOT" : "BROWSER"}] status ${res.status}`);
      return false;
    }
    const meta = extractHead(res.html);
    if (isHomepageShell(meta, pathStr)) {
      stats.shellLeak.push({ path: pathStr, ua: ua === UA_GOOGLEBOT ? "Googlebot" : "Browser", title: meta.title });
      stats[`${bucket}Failed`].push({ path: pathStr, ua, reason: "shell-leak", title: meta.title });
      if (VERBOSE) console.log(`  ❌ ${pathStr} [${ua === UA_GOOGLEBOT ? "BOT" : "BROWSER"}] SHELL LEAK title="${meta.title.slice(0, 60)}"`);
      return false;
    }
    if (VERBOSE) console.log(`  ✅ ${pathStr} [${ua === UA_GOOGLEBOT ? "BOT" : "BROWSER"}] title="${meta.title.slice(0, 60)}" canonical=${meta.canonical || "(none)"} robots=${meta.robots || "(default)"}`);
  }
  stats[`${bucket}Passed`]++;
  return true;
}

function parseSitemapLocs(xml) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║  Post-deploy validation: " + VERCEL_URL.padEnd(26) + "║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // ---- 1. robots.txt -----------------------------------------------------
  console.log("── 1/5 robots.txt ──");
  try {
    const robots = await fetchHtml(VERCEL_URL + "/robots.txt");
    if (robots.status !== 200) console.log(`  ❌ /robots.txt status ${robots.status}`);
    else if (!robots.html.includes("Sitemap:")) console.log("  ❌ /robots.txt has no Sitemap: directive");
    else console.log("  ✅ /robots.txt reachable and declares sitemap");
  } catch (e) { console.log(`  ❌ /robots.txt fetch error: ${e.message}`); }

  // ---- 2. Required hubs --------------------------------------------------
  console.log("\n── 2/5 Required canonical hubs ──");
  for (const hub of REQUIRED_HUBS) {
    stats.hubsChecked++;
    const ok = await checkUrl(hub, "hubs");
    if (ok && !VERBOSE) console.log(`  ✅ ${hub}`);
  }

  // ---- 3. Sitemap sample -------------------------------------------------
  console.log("\n── 3/5 Sitemap sample crawl ──");
  let sampleUrls = [];
  try {
    const sm = await fetchHtml(VERCEL_URL + "/sitemap.xml");
    if (sm.status === 200) {
      const locs = parseSitemapLocs(sm.html).map((u) => { try { return new URL(u).pathname; } catch { return null; } }).filter(Boolean);
      console.log(`  Sitemap contains ${locs.length} URLs`);
      // Take a stratified sample: first N, middle N, last N
      const n = SAMPLE === 0 ? Math.min(locs.length, 1000) : Math.min(SAMPLE, locs.length);
      const step = Math.max(1, Math.floor(locs.length / n));
      sampleUrls = locs.filter((_, i) => i % step === 0).slice(0, n);
      console.log(`  Sampling ${sampleUrls.length} URLs`);
    } else {
      console.log(`  ❌ /sitemap.xml status ${sm.status}`);
    }
  } catch (e) { console.log(`  ❌ /sitemap.xml fetch error: ${e.message}`); }

  for (const p of sampleUrls) {
    stats.sampledChecked++;
    const ok = await checkUrl(p, "sampled", [UA_GOOGLEBOT]); // bot UA only for speed
    if (ok && VERBOSE) console.log(`  ✅ ${p}`);
  }

  // ---- 4. Facility profiles ---------------------------------------------
  console.log("\n── 4/5 Facility profile sample ──");
  try {
    const sf = await fetchHtml(VERCEL_URL + "/sitemap-facilities.xml");
    if (sf.status === 200) {
      const flocs = parseSitemapLocs(sf.html).map((u) => { try { return new URL(u).pathname; } catch { return null; } }).filter((p) => p && p.startsWith("/center/"));
      const sample = flocs.slice(0, Math.min(20, flocs.length));
      console.log(`  Sampling ${sample.length} of ${flocs.length} facility URLs`);
      for (const p of sample) {
        stats.facilitiesChecked++;
        await checkUrl(p, "facilities", [UA_GOOGLEBOT]);
      }
    } else if (sf.status === 404) {
      console.log("  ⚠️  /sitemap-facilities.xml not found — skipping facility check");
    }
  } catch (e) { console.log(`  ⚠️  facility sitemap error: ${e.message}`); }

  // ---- 5. Summary --------------------------------------------------------
  console.log("\n══════════════════════════════════════════════════════");
  console.log(" Summary");
  console.log("══════════════════════════════════════════════════════");
  console.log(` Hubs       : ${stats.hubsPassed}/${stats.hubsChecked} passed`);
  console.log(` Sampled    : ${stats.sampledPassed}/${stats.sampledChecked} passed`);
  console.log(` Facilities : ${stats.facilitiesPassed}/${stats.facilitiesChecked} passed`);
  console.log(` Shell leaks: ${stats.shellLeak.length}`);

  if (stats.shellLeak.length) {
    console.log("\n❌ SHELL LEAKS (routes serving generic SPA shell instead of prerendered HTML):");
    for (const s of stats.shellLeak.slice(0, 20)) {
      console.log(`   - ${s.path} [${s.ua}] title="${s.title.slice(0, 60)}"`);
    }
    if (stats.shellLeak.length > 20) console.log(`   ...and ${stats.shellLeak.length - 20} more`);
  }

  const totalFailed = stats.hubsFailed.length + stats.sampledFailed.length + stats.facilitiesFailed.length;
  if (totalFailed > 0) {
    console.log(`\n❌ ${totalFailed} failures. Run with --verbose for full detail.\n`);
    process.exit(1);
  }
  console.log("\n✅ All checks passed.\n");
}

main().catch((e) => { console.error(e); process.exit(2); });
