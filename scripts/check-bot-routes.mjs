#!/usr/bin/env node
/**
 * check:bot-routes — sample-crawl the deployed site as Googlebot and assert
 * that every URL returns 200/301/308. Catches the migration-routing class of
 * bug where SPA-only paths return 404 to crawlers because no <path>.html
 * exists on disk.
 *
 * Inputs (env):
 *   BASE_URL       deployed origin (default: https://rehablookup.com)
 *   SAMPLE_SIZE    URLs to sample from sitemaps (default: 400)
 *   CONCURRENCY    parallel requests (default: 16)
 *   FAIL_AT        max acceptable failure count (default: 0)
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const BASE = (process.env.BASE_URL || "https://rehablookup.com").replace(/\/$/, "");
const SAMPLE_SIZE = Number(process.env.SAMPLE_SIZE || 400);
const CONCURRENCY = Number(process.env.CONCURRENCY || 16);
const FAIL_AT = Number(process.env.FAIL_AT || 0);
const UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function loadUrls() {
  const files = fs.readdirSync(PUBLIC_DIR).filter((f) => /^sitemap.*\.xml$/.test(f));
  const urls = new Set();
  for (const f of files) {
    const xml = fs.readFileSync(path.join(PUBLIC_DIR, f), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
  }
  return [...urls];
}

const urls = loadUrls()
  .filter((u) => !u.endsWith(".xml"))
  .map((u) => {
    const x = new URL(u);
    const target = new URL(BASE);
    x.protocol = target.protocol;
    x.host = target.host;
    return x.toString();
  });

// Ensure deterministic sample with seeded shuffle
const seed = Number(process.env.SEED || Date.now()) >>> 0;
let s = seed;
function rand() { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }
const shuffled = urls.slice().sort(() => rand() - 0.5);
const sample = shuffled.slice(0, Math.min(SAMPLE_SIZE, shuffled.length));

console.log(`🤖 Crawling ${sample.length}/${urls.length} URLs as Googlebot against ${BASE}…`);

const failures = [];
let done = 0;
async function check(u) {
  try {
    const r = await fetch(u, { headers: { "User-Agent": UA }, redirect: "manual" });
    if (![200, 301, 302, 308].includes(r.status)) {
      failures.push({ status: r.status, url: u });
    }
  } catch (e) {
    failures.push({ status: "ERR", url: u, error: String(e) });
  }
  done++;
  if (done % 50 === 0) process.stderr.write(`  …${done}/${sample.length}\n`);
}

const queue = sample.slice();
await Promise.all(
  Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await check(queue.pop());
  })
);

console.log(`\nChecked: ${sample.length}   Failures: ${failures.length}`);
if (failures.length) {
  const patterns = {};
  for (const f of failures) {
    const p = new URL(f.url).pathname.split("/").slice(0, 3).join("/") || "/";
    patterns[p] = (patterns[p] || 0) + 1;
  }
  console.log("Top failing patterns:");
  for (const [p, n] of Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 15)) {
    console.log(`  ${n.toString().padStart(4)}  ${p}`);
  }
  console.log("\nSample failures:");
  for (const f of failures.slice(0, 10)) console.log(`  ${f.status}  ${f.url}`);
}

if (failures.length > FAIL_AT) {
  console.error(`\n❌ Bot-route check failed (${failures.length} > ${FAIL_AT})`);
  process.exit(1);
}
console.log("✅ Bot-route check passed");
