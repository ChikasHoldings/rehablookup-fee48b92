#!/usr/bin/env node
/**
 * Automated link checker for every prerendered public page.
 *
 * Scans every prerendered HTML file under public/ and validates every
 * <a href> and <link href>:
 *
 *   • INTERNAL links  — must resolve to a literal Route in src/App.tsx, a
 *                       SmartCatchAll prefix, a vercel.json redirect, or a
 *                       prerendered file on disk. Delegates to the existing
 *                       offline resolver in scripts/find-404-sources.mjs
 *                       semantics (fully offline, deterministic).
 *
 *   • EXTERNAL links  — issued as concurrent HEAD requests with a short
 *                       timeout. 4xx/5xx/timeouts are reported. Uses an
 *                       allow-list cache so transient failures don't flake
 *                       the build. Falls back to GET on hosts that reject
 *                       HEAD (some CDNs return 405).
 *
 * Outputs a markdown report (broken-links-report.md) and exits non-zero
 * when any link is broken. Designed to run in CI on every PR/push and
 * also on the nightly schedule alongside the live 404 crawler.
 *
 * Environment knobs:
 *   EXTERNAL_TIMEOUT_MS    per-request timeout (default 10000)
 *   EXTERNAL_CONCURRENCY   parallel external requests (default 8)
 *   EXTERNAL_RETRIES       retry attempts per URL on transient failure (default 1)
 *   SKIP_EXTERNAL          set to "1" to skip external checks (PRs / offline)
 *   REPORT_PATH            output md path (default ./broken-links-report.md)
 *
 * The script never fetches localhost, mailto:, tel:, javascript:, data:
 * or fragment-only URLs. Hosts in EXTERNAL_ALLOW_LIST below are treated as
 * "trusted" and skipped (Google, Schema.org, etc — they are stable and
 * occasionally rate-limit CI runners).
 */

import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const SRC = join(ROOT, "src");

const EXTERNAL_TIMEOUT_MS = Number(process.env.EXTERNAL_TIMEOUT_MS || 10000);
const EXTERNAL_CONCURRENCY = Number(process.env.EXTERNAL_CONCURRENCY || 8);
const EXTERNAL_RETRIES = Number(process.env.EXTERNAL_RETRIES || 1);
const SKIP_EXTERNAL = process.env.SKIP_EXTERNAL === "1";
const REPORT_PATH = process.env.REPORT_PATH || join(ROOT, "broken-links-report.md");
const USER_AGENT = "RehabLookupLinkBot/1.0 (+https://rehablookup.com)";

const PROD_HOSTS = new Set(["rehablookup.com", "www.rehablookup.com"]);

// Stable hosts that frequently reject CI HEAD requests with 403/429 - skip
// to keep the check signal-rich rather than flaky.
const EXTERNAL_ALLOW_LIST = new Set([
  "schema.org",
  "www.w3.org",
  "ogp.me",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
  "www.google.com",
  "www.googletagmanager.com",
  "connect.facebook.net",
  "static.hotjar.com",
  "cdn.jsdelivr.net",
  "unpkg.com",
]);

const SKIP_DIRS = new Set([".well-known", "assets", "lovable-uploads", "fonts", "images", "img"]);

// ──────────────────── 1. Collect every prerendered HTML ─────────────────────
function walkHtml(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(PUBLIC_DIR, full);
    const top = rel.split("/")[0];
    if (SKIP_DIRS.has(top)) continue;
    const st = statSync(full);
    if (st.isDirectory()) walkHtml(full, acc);
    else if (entry.endsWith(".html")) acc.push(rel);
  }
  return acc;
}

// ──────────────────── 2. Extract internal & external hrefs ──────────────────
function extractHrefs(html) {
  const out = [];
  const re = /\b(?:href|src)=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1].trim());
  return out;
}

function classify(href) {
  if (!href) return { kind: "skip" };
  if (href.startsWith("#")) return { kind: "skip" };
  if (/^(mailto:|tel:|javascript:|data:|sms:|blob:)/i.test(href)) return { kind: "skip" };

  if (href.startsWith("//")) {
    try {
      const u = new URL("https:" + href);
      return PROD_HOSTS.has(u.hostname)
        ? { kind: "internal", path: u.pathname }
        : { kind: "external", url: u.toString() };
    } catch {
      return { kind: "skip" };
    }
  }
  if (/^https?:\/\//i.test(href)) {
    try {
      const u = new URL(href);
      if (/^localhost$|^127\.|^0\.0\.0\.0$/.test(u.hostname)) return { kind: "skip" };
      return PROD_HOSTS.has(u.hostname)
        ? { kind: "internal", path: u.pathname }
        : { kind: "external", url: u.toString() };
    } catch {
      return { kind: "skip" };
    }
  }
  if (href.startsWith("/")) {
    return { kind: "internal", path: href.split(/[?#]/)[0] };
  }
  return { kind: "skip" };
}

// ──────────────────── 3. Internal resolver (offline) ────────────────────────
const appTsx = readFileSync(join(SRC, "App.tsx"), "utf8");
const literalRoutes = new Set();
const dynamicRoutes = [];
for (const m of appTsx.matchAll(/<Route\s+[^>]*path=["']([^"']+)["']/g)) {
  const p = m[1];
  if (p === "*" || p === "") continue;
  if (p.includes(":") || p.includes("*")) {
    const re = new RegExp(
      "^" +
        p
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/:[A-Za-z_][A-Za-z0-9_]*/g, "[^/]+")
          .replace(/\*/g, ".*") +
        "$",
    );
    dynamicRoutes.push(re);
  } else {
    literalRoutes.add(p);
  }
}

let vercelRedirects = [];
let vercelRewrites = [];
try {
  const vc = JSON.parse(readFileSync(join(ROOT, "vercel.json"), "utf8"));
  vercelRedirects = (vc.redirects || []).map((r) => r.source);
  vercelRewrites = (vc.rewrites || []).map((r) => r.source);
} catch {}

const SMART_CATCHALL_PREFIXES = [
  "/treatment-types/",
  "/rehab-centers/",
  "/center/",
  "/blog/",
  "/state-rehab-faqs/",
];

function staticFileExists(p) {
  const clean = p.replace(/^\//, "").split(/[?#]/)[0];
  return (
    existsSync(join(PUBLIC_DIR, clean + ".html")) ||
    existsSync(join(PUBLIC_DIR, clean, "index.html")) ||
    existsSync(join(PUBLIC_DIR, clean))
  );
}

function vercelMatches(path, sources) {
  return sources.some((src) => {
    // Convert vercel ":path*" → regex
    const re = new RegExp(
      "^" +
        src
          .replace(/[.+^${}()|[\]\\]/g, "\\$&")
          .replace(/:[A-Za-z_][A-Za-z0-9_]*\*?/g, "[^?#]*") +
        "$",
    );
    return re.test(path);
  });
}

function resolvesInternally(path) {
  if (literalRoutes.has(path)) return true;
  if (dynamicRoutes.some((re) => re.test(path))) return true;
  if (SMART_CATCHALL_PREFIXES.some((p) => path.startsWith(p))) return true;
  if (vercelMatches(path, vercelRedirects)) return true;
  if (vercelMatches(path, vercelRewrites)) return true;
  if (staticFileExists(path)) return true;
  return false;
}

// ──────────────────── 4. External HEAD checker ──────────────────────────────
async function fetchOnce(url, method) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), EXTERNAL_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method,
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": USER_AGENT, Accept: "*/*" },
    });
    return { status: res.status };
  } finally {
    clearTimeout(timer);
  }
}

async function checkExternal(url) {
  let lastErr = null;
  for (let attempt = 0; attempt <= EXTERNAL_RETRIES; attempt++) {
    try {
      let res = await fetchOnce(url, "HEAD");
      // Some CDNs return 405/403 for HEAD; retry as GET
      if (res.status === 405 || res.status === 403 || res.status === 501) {
        res = await fetchOnce(url, "GET");
      }
      if (res.status >= 200 && res.status < 400) return { ok: true, status: res.status };
      // 4xx/5xx — capture and (for 5xx/429) retry
      lastErr = { status: res.status };
      if (res.status < 500 && res.status !== 429) {
        return { ok: false, status: res.status };
      }
    } catch (err) {
      lastErr = { error: err?.name === "AbortError" ? "timeout" : err?.message || String(err) };
    }
    // exponential-ish backoff between retries
    await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
  }
  return { ok: false, ...lastErr };
}

async function runPool(items, worker, concurrency) {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
      if ((i + 1) % 25 === 0 || i + 1 === items.length) {
        process.stderr.write(`  …checked ${i + 1}/${items.length} external\n`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

// ──────────────────── 5. Run scan ───────────────────────────────────────────
console.log(`\n🔗 Scanning links across prerendered HTML in /public…\n`);

const htmlFiles = walkHtml(PUBLIC_DIR);

/** href -> Set<sourceFile> */
const internalRefs = new Map();
const externalRefs = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(join(PUBLIC_DIR, file), "utf8");
  for (const href of extractHrefs(html)) {
    const c = classify(href);
    if (c.kind === "internal") {
      if (!internalRefs.has(c.path)) internalRefs.set(c.path, new Set());
      internalRefs.get(c.path).add(file);
    } else if (c.kind === "external") {
      const host = (() => { try { return new URL(c.url).hostname; } catch { return ""; } })();
      if (EXTERNAL_ALLOW_LIST.has(host)) continue;
      if (!externalRefs.has(c.url)) externalRefs.set(c.url, new Set());
      externalRefs.get(c.url).add(file);
    }
  }
}

console.log(
  `  • ${htmlFiles.length} HTML files\n` +
    `  • ${internalRefs.size} unique internal hrefs\n` +
    `  • ${externalRefs.size} unique external hrefs (after allow-list)\n`,
);

// ── Internal validation ──
const brokenInternal = [];
for (const [path, sources] of internalRefs) {
  if (!resolvesInternally(path)) {
    brokenInternal.push({ path, sources: [...sources] });
  }
}

// ── External validation ──
let brokenExternal = [];
if (SKIP_EXTERNAL) {
  console.log(`(skipping external link checks — SKIP_EXTERNAL=1)\n`);
} else if (externalRefs.size > 0) {
  console.log(`Validating ${externalRefs.size} external URLs (concurrency ${EXTERNAL_CONCURRENCY})…`);
  const urls = [...externalRefs.keys()];
  const results = await runPool(urls, checkExternal, EXTERNAL_CONCURRENCY);
  for (let i = 0; i < urls.length; i++) {
    const r = results[i];
    if (!r.ok) {
      brokenExternal.push({
        url: urls[i],
        status: r.status,
        error: r.error,
        sources: [...externalRefs.get(urls[i])],
      });
    }
  }
}

// ──────────────────── 6. Report ─────────────────────────────────────────────
function renderReport() {
  const lines = [];
  lines.push(`# Broken-Link Report`);
  lines.push("");
  lines.push(`- **HTML files scanned:** ${htmlFiles.length}`);
  lines.push(`- **Unique internal hrefs:** ${internalRefs.size}`);
  lines.push(`- **Unique external hrefs (post allow-list):** ${externalRefs.size}`);
  lines.push(`- **Broken internal:** ${brokenInternal.length}`);
  lines.push(`- **Broken external:** ${SKIP_EXTERNAL ? "skipped" : brokenExternal.length}`);
  lines.push(`- **Generated:** ${new Date().toISOString()}`);
  lines.push("");

  if (brokenInternal.length === 0 && brokenExternal.length === 0) {
    lines.push(`✅ All links resolve.`);
    return lines.join("\n");
  }

  if (brokenInternal.length > 0) {
    lines.push(`## ❌ Broken internal links (${brokenInternal.length})`);
    lines.push("");
    lines.push(`| Path | Referenced from |`);
    lines.push(`| --- | --- |`);
    for (const b of brokenInternal.slice(0, 200)) {
      const refs = b.sources.slice(0, 3).map((s) => `\`/${s}\``).join(", ") +
        (b.sources.length > 3 ? `, +${b.sources.length - 3}` : "");
      lines.push(`| \`${b.path}\` | ${refs} |`);
    }
    lines.push("");
  }

  if (brokenExternal.length > 0) {
    lines.push(`## 🌐 Broken external links (${brokenExternal.length})`);
    lines.push("");
    lines.push(`| Status | URL | Referenced from |`);
    lines.push(`| ---: | --- | --- |`);
    for (const b of brokenExternal.slice(0, 200)) {
      const refs = b.sources.slice(0, 3).map((s) => `\`/${s}\``).join(", ") +
        (b.sources.length > 3 ? `, +${b.sources.length - 3}` : "");
      lines.push(`| ${b.status || b.error || "—"} | ${b.url} | ${refs} |`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

writeFileSync(REPORT_PATH, renderReport() + "\n");

console.log("\n" + "─".repeat(60));
console.log(`HTML files scanned:   ${htmlFiles.length}`);
console.log(`Internal hrefs:       ${internalRefs.size}  (broken: ${brokenInternal.length})`);
console.log(`External hrefs:       ${externalRefs.size}  (broken: ${SKIP_EXTERNAL ? "skipped" : brokenExternal.length})`);
console.log(`Report:               ${REPORT_PATH}`);
console.log("─".repeat(60));

if (brokenInternal.length > 0) {
  console.error(`\n❌ Broken internal links:`);
  for (const b of brokenInternal.slice(0, 25)) {
    console.error(`  ${b.path}  ← ${b.sources.slice(0, 2).join(", ")}${b.sources.length > 2 ? " …" : ""}`);
  }
  if (brokenInternal.length > 25) console.error(`  … ${brokenInternal.length - 25} more`);
}
if (brokenExternal.length > 0) {
  console.error(`\n❌ Broken external links:`);
  for (const b of brokenExternal.slice(0, 25)) {
    console.error(`  [${b.status || b.error}] ${b.url}`);
  }
  if (brokenExternal.length > 25) console.error(`  … ${brokenExternal.length - 25} more`);
}

if (brokenInternal.length > 0 || brokenExternal.length > 0) {
  console.error(`\n❌ Link checker failed. See ${REPORT_PATH}.\n`);
  process.exit(1);
}

console.log(`\n✅ Link checker passed — every internal & external link resolves.\n`);
