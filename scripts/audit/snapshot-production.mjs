#!/usr/bin/env node
/**
 * Pre-cutover production snapshot.
 *
 * Crawls a list of URLs (sourced from sitemap-index.xml on the target host)
 * and records per-URL: HTTP status, final URL after redirects, canonical,
 * <title>, meta description, primary <h1>, count of JSON-LD blocks, and
 * a SHA-256 hash of the page <body> (minus dynamic markers).
 *
 * Output: CSV at the path passed as --out (default
 * docs/audit/vercel-cutover/<host>-snapshot.csv).
 *
 * Usage:
 *   node scripts/audit/snapshot-production.mjs \
 *     --host https://rehablookup.com \
 *     --sample 200 \
 *     --out docs/audit/vercel-cutover/pre-cutover-snapshot.csv
 *
 * Sources URLs (in priority order):
 *   1. <host>/sitemap.xml  (top N by lastmod desc, capped at --sample)
 *   2. A small required-hub list (homepage, /rehab-centers, top states, etc.)
 *
 * Designed to be run twice (Lovable origin + Vercel origin) and diffed.
 */

import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");

const argv = process.argv.slice(2);
const get = (k, d) => {
  const i = argv.indexOf(`--${k}`);
  return i === -1 ? d : argv[i + 1];
};

const HOST = (get("host", "https://rehablookup.com") || "").replace(/\/$/, "");
const SAMPLE = parseInt(get("sample", "200"), 10);
const OUT = resolve(ROOT, get("out", `docs/audit/vercel-cutover/${new URL(HOST).hostname}-snapshot.csv`));
const UA = "Mozilla/5.0 (compatible; RehabLookupCutoverAuditBot/1.0)";

const REQUIRED_HUBS = [
  "/", "/rehab-centers", "/treatment-types", "/locations", "/insurance",
  "/about", "/contact", "/for-providers", "/concierge", "/resources",
  "/rehab-near-me", "/drug-rehab-near-me", "/alcohol-rehab-near-me",
  "/luxury-rehab-near-me", "/rehab-centers/california", "/rehab-centers/texas",
  "/rehab-centers/florida", "/rehab-centers/new-york",
  "/treatment-types/detox-programs", "/treatment-types/residential-inpatient",
  "/insurance/aetna-rehab", "/insurance/bcbs-treatment",
  "/sitemap-index.xml", "/sitemap.xml", "/robots.txt",
];

async function fetchSitemapUrls() {
  const urls = new Set();
  for (const sm of ["/sitemap.xml", "/sitemap-facilities.xml", "/sitemap-extras.xml"]) {
    try {
      const r = await fetch(`${HOST}${sm}`, { headers: { "user-agent": UA } });
      if (!r.ok) continue;
      const txt = await r.text();
      for (const m of txt.matchAll(/<loc>([^<]+)<\/loc>/g)) urls.add(m[1].trim());
    } catch {}
  }
  return [...urls];
}

function extract(html) {
  const get1 = (re) => (html.match(re) || [, ""])[1].trim();
  const title = get1(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = get1(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)
    || get1(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  const canonical = get1(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)
    || get1(/<link\s+href=["']([^"']*)["']\s+rel=["']canonical["']/i);
  const robots = get1(/<meta\s+name=["']robots["']\s+content=["']([^"']*)["']/i);
  const h1 = get1(/<h1[^>]*>([\s\S]*?)<\/h1>/i).replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  const jsonLdCount = (html.match(/<script[^>]+type=["']application\/ld\+json["']/gi) || []).length;
  const body = (html.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [, ""])[1]
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/data-[a-z-]+="[^"]*"/gi, "")
    .replace(/\s+/g, " ");
  const bodyHash = createHash("sha256").update(body).digest("hex").slice(0, 16);
  return { title, desc, canonical, robots, h1, jsonLdCount, bodyHash, bytes: html.length };
}

async function probe(url) {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { headers: { "user-agent": UA }, redirect: "follow" });
    const html = await r.text();
    const meta = r.headers.get("content-type")?.includes("html") ? extract(html) : {};
    return { url, status: r.status, finalUrl: r.url, ms: Date.now() - t0, contentType: r.headers.get("content-type") || "", ...meta };
  } catch (e) {
    return { url, status: 0, finalUrl: "", ms: Date.now() - t0, error: e.message };
  }
}

function csvEscape(v) {
  if (v == null) return "";
  const s = String(v).replace(/"/g, '""');
  return /[",\n]/.test(s) ? `"${s}"` : s;
}

(async () => {
  console.log(`📸 Snapshotting ${HOST}`);
  const sitemap = await fetchSitemapUrls();
  console.log(`  Sitemap URLs found: ${sitemap.length}`);
  const sample = sitemap.slice(0, Math.max(0, SAMPLE - REQUIRED_HUBS.length));
  const targets = [
    ...REQUIRED_HUBS.map((p) => `${HOST}${p}`),
    ...sample,
  ];
  // dedupe
  const uniq = [...new Set(targets)];
  console.log(`  Crawling ${uniq.length} URLs...`);

  const rows = [];
  // Concurrency 8
  const queue = [...uniq];
  const workers = Array.from({ length: 8 }, async () => {
    while (queue.length) {
      const u = queue.shift();
      const r = await probe(u);
      rows.push(r);
      if (rows.length % 25 === 0) console.log(`  ${rows.length}/${uniq.length}`);
    }
  });
  await Promise.all(workers);

  rows.sort((a, b) => a.url.localeCompare(b.url));

  const header = ["url", "status", "finalUrl", "ms", "contentType", "title", "desc", "canonical", "robots", "h1", "jsonLdCount", "bodyHash", "bytes", "error"];
  const csv = [header.join(",")]
    .concat(rows.map((r) => header.map((h) => csvEscape(r[h])).join(",")))
    .join("\n");

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, csv);
  console.log(`✅ Wrote ${rows.length} rows → ${OUT}`);

  // quick stats
  const ok = rows.filter((r) => r.status >= 200 && r.status < 300).length;
  const redir = rows.filter((r) => r.status >= 300 && r.status < 400).length;
  const fail = rows.filter((r) => r.status === 0 || r.status >= 400).length;
  console.log(`  ${ok} ok, ${redir} redirects, ${fail} failures`);
})();
