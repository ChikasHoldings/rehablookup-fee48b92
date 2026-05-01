#!/usr/bin/env node
/**
 * Live 404 / broken-route crawler.
 *
 * Fetches every URL listed in the project's sitemaps against a deployed
 * environment and reports any non-2xx/3xx response. Designed to run on a
 * nightly schedule and on demand against production or preview URLs that
 * the static validators cannot reach (Vercel rewrites, edge functions,
 * runtime data fetches, etc).
 *
 * Inputs (env or CLI):
 *   BASE_URL         deployed origin to crawl (default: https://rehablookup.com)
 *   CONCURRENCY      parallel requests (default: 16)
 *   TIMEOUT_MS       per-request timeout (default: 15000)
 *   MAX_URLS         optional cap on URLs crawled (default: all)
 *   SAMPLE_RATE      fraction 0..1 of URLs to sample (default: 1)
 *   REPORT_PATH      output markdown report (default: ./crawl-404-report.md)
 *   USER_AGENT       UA string (default: RehabLookupCrawlBot/1.0)
 *
 * Behaviour:
 *   - Pulls every <loc> from local public/sitemap*.xml (source of truth)
 *   - Rewrites host to BASE_URL so we crawl the target environment
 *   - Considers HTTP 200/301/302/308 healthy; 3xx → follows once, asserts final 200
 *   - Reports 4xx/5xx, network errors, and timeouts in a markdown table
 *   - Exits non-zero if any failure is found, so CI can fail the PR / job
 */

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");

const BASE_URL = (process.env.BASE_URL || "https://rehablookup.com").replace(/\/$/, "");
const CONCURRENCY = Number(process.env.CONCURRENCY || 16);
const TIMEOUT_MS = Number(process.env.TIMEOUT_MS || 15000);
const MAX_URLS = process.env.MAX_URLS ? Number(process.env.MAX_URLS) : Infinity;
const SAMPLE_RATE = Number(process.env.SAMPLE_RATE || 1);
const REPORT_PATH = process.env.REPORT_PATH || join(ROOT, "crawl-404-report.md");
const USER_AGENT = process.env.USER_AGENT || "RehabLookupCrawlBot/1.0 (+https://rehablookup.com)";

const HEALTHY_CODES = new Set([200, 301, 302, 308]);

function loadSitemapUrls() {
  const files = readdirSync(PUBLIC_DIR).filter((f) => /^sitemap.*\.xml$/.test(f));
  const urls = new Set();
  for (const f of files) {
    const xml = readFileSync(join(PUBLIC_DIR, f), "utf8");
    for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      urls.add(m[1].trim());
    }
  }
  return [...urls];
}

function rewriteToBase(url) {
  try {
    const u = new URL(url);
    const target = new URL(BASE_URL);
    u.protocol = target.protocol;
    u.host = target.host;
    return u.toString();
  } catch {
    return null;
  }
}

async function fetchOnce(url, { redirect } = { redirect: "manual" }) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect,
      signal: ctrl.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    });
    return { status: res.status, location: res.headers.get("location"), ok: res.ok };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  try {
    const first = await fetchOnce(url, { redirect: "manual" });
    if (HEALTHY_CODES.has(first.status) && first.status === 200) {
      return { url, status: 200, kind: "ok" };
    }
    if ([301, 302, 308].includes(first.status) && first.location) {
      // Follow one hop to make sure the redirect lands on a real page.
      const next = first.location.startsWith("http")
        ? first.location
        : new URL(first.location, url).toString();
      const final = await fetchOnce(next, { redirect: "follow" });
      if (final.status === 200) {
        return { url, status: final.status, kind: "ok-redirect", redirectedTo: next };
      }
      return { url, status: final.status, kind: "broken-redirect", redirectedTo: next };
    }
    return { url, status: first.status, kind: first.status >= 500 ? "server-error" : "client-error" };
  } catch (err) {
    const msg = err?.name === "AbortError" ? "timeout" : (err?.message || String(err));
    return { url, status: 0, kind: "network-error", error: msg };
  }
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      if ((i + 1) % 100 === 0 || i + 1 === items.length) {
        process.stderr.write(`  …checked ${i + 1}/${items.length}\n`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function groupFailures(results) {
  const buckets = {
    "client-error": [],     // 4xx (404, 410, 403…)
    "server-error": [],     // 5xx
    "broken-redirect": [],  // 3xx → non-200
    "network-error": [],    // timeout / DNS / refused
  };
  for (const r of results) {
    if (buckets[r.kind]) buckets[r.kind].push(r);
  }
  return buckets;
}

function renderReport({ baseUrl, total, sampled, buckets, durationMs }) {
  const failureCount = Object.values(buckets).reduce((n, arr) => n + arr.length, 0);
  const lines = [];
  lines.push(`# 404 / Broken-Route Crawl Report`);
  lines.push("");
  lines.push(`- **Target:** \`${baseUrl}\``);
  lines.push(`- **Total sitemap URLs:** ${total}`);
  lines.push(`- **URLs crawled:** ${sampled}`);
  lines.push(`- **Failures:** ${failureCount}`);
  lines.push(`- **Duration:** ${(durationMs / 1000).toFixed(1)}s`);
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push("");

  if (failureCount === 0) {
    lines.push(`✅ All crawled URLs returned 200 (or 3xx → 200).`);
    return lines.join("\n");
  }

  const labels = {
    "client-error": "❌ 4xx Client Errors (likely 404s)",
    "server-error": "🔥 5xx Server Errors",
    "broken-redirect": "↪️ Broken Redirects (3xx → non-200)",
    "network-error": "🌐 Network / Timeout Errors",
  };

  for (const [kind, items] of Object.entries(buckets)) {
    if (items.length === 0) continue;
    lines.push(`## ${labels[kind]} (${items.length})`);
    lines.push("");
    lines.push(`| Status | URL | Notes |`);
    lines.push(`| ---: | --- | --- |`);
    for (const r of items.slice(0, 200)) {
      const note = r.error ? `\`${r.error}\`` : r.redirectedTo ? `→ ${r.redirectedTo}` : "";
      lines.push(`| ${r.status || "—"} | ${r.url} | ${note} |`);
    }
    if (items.length > 200) {
      lines.push(`| … | _${items.length - 200} more truncated_ | |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

(async () => {
  const t0 = Date.now();
  const all = loadSitemapUrls();
  if (all.length === 0) {
    console.error("No sitemap URLs found under public/sitemap*.xml");
    process.exit(2);
  }

  // Sample + cap
  let urls = all;
  if (SAMPLE_RATE < 1) {
    urls = urls.filter(() => Math.random() < SAMPLE_RATE);
  }
  if (urls.length > MAX_URLS) urls = urls.slice(0, MAX_URLS);

  // Rewrite to target environment
  const targets = urls.map(rewriteToBase).filter(Boolean);

  console.log(`\n🕷  Crawling ${targets.length} URL(s) against ${BASE_URL} ` +
    `(concurrency=${CONCURRENCY}, timeout=${TIMEOUT_MS}ms)…\n`);

  const results = await runPool(targets, checkUrl, CONCURRENCY);
  const buckets = groupFailures(results);
  const durationMs = Date.now() - t0;

  const report = renderReport({
    baseUrl: BASE_URL,
    total: all.length,
    sampled: targets.length,
    buckets,
    durationMs,
  });

  writeFileSync(REPORT_PATH, report + "\n");

  const failureCount = Object.values(buckets).reduce((n, arr) => n + arr.length, 0);
  console.log("\n" + "─".repeat(60));
  console.log(`Crawled:    ${targets.length}`);
  console.log(`Healthy:    ${targets.length - failureCount}`);
  console.log(`Failures:   ${failureCount}`);
  console.log(`Report:     ${REPORT_PATH}`);
  console.log("─".repeat(60));

  if (failureCount > 0) {
    // Print a tight summary so CI logs are immediately useful
    for (const [kind, items] of Object.entries(buckets)) {
      if (!items.length) continue;
      console.error(`\n${kind}: ${items.length}`);
      for (const r of items.slice(0, 20)) {
        console.error(`  [${r.status || "—"}] ${r.url}${r.error ? `  (${r.error})` : ""}`);
      }
      if (items.length > 20) console.error(`  … ${items.length - 20} more`);
    }
    console.error(`\n❌ Crawl found ${failureCount} broken URL(s). See ${REPORT_PATH}.`);
    process.exit(1);
  }

  console.log(`\n✅ Crawl passed — no broken routes detected.\n`);
})();
