#!/usr/bin/env node
/**
 * Canonical ↔ GA4 page_location parity audit.
 *
 * Two goals:
 *
 *   1. STATIC: Every public, pre-rendered page in /public must ship a
 *      <link rel="canonical" href="https://rehablookup.com/..."> that
 *      matches the file path it was rendered for. No prerendered SEO
 *      page may go out without a canonical.
 *
 *   2. RUNTIME: The SPA must report GA4 `page_location` from the
 *      canonical tag (not window.location.href), so utm/query/uppercase
 *      paths can't fragment GA4 hostnames or paths and Search Console
 *      data lines up with GA4 Pages reports.
 *
 * Wired into `npm run build` so a regression (missing canonical, host
 * mismatch, or RouteChangeTracker dropping the canonical lookup) fails
 * CI before deploy.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT = resolve(__dirname, "..");
const PUBLIC_DIR = join(ROOT, "public");
const TRACKER = join(ROOT, "src/components/RouteChangeTracker.tsx");

const PROD_ORIGIN = "https://rehablookup.com";
const ALLOWED_HOSTS = new Set(["rehablookup.com", "www.rehablookup.com"]);

// Files that intentionally don't carry canonical-per-path (SPA shell, 404).
const SKIP = new Set(["index.html", "404.html"]);

/** Map a /public/*.html filename to the public URL path it represents. */
function fileToPath(file) {
  // Vercel hybrid prerender ships both /foo.html and /foo/index.html.
  // Both should canonical-ize to /foo.
  if (file === "index.html") return "/";
  if (file.endsWith("/index.html")) {
    return "/" + file.slice(0, -"/index.html".length);
  }
  return "/" + file.replace(/\.html$/, "");
}

function listHtml(dir, prefix = "") {
  const out = [];
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    if (name.isDirectory()) {
      // Skip `embed` — the widget iframe payloads are explicitly
      // noindex/nofollow and don't represent canonical-able pages.
      // The SPA never navigates to them and search engines should
      // never crawl them, so the canonical-GA invariants don't apply.
      if (!prefix && name.name === "embed") continue;
      out.push(...listHtml(join(dir, name.name), join(prefix, name.name)));
    } else if (name.name.endsWith(".html")) {
      out.push(prefix ? `${prefix}/${name.name}` : name.name);
    }
  }
  return out;
}

function getCanonical(html) {
  const m = html.match(
    /<link[^>]*\brel=["']canonical["'][^>]*\bhref=["']([^"']+)["'][^>]*>/i,
  );
  return m ? m[1] : null;
}

function normalize(p) {
  // Lowercase, strip trailing slash (except root), strip query/hash.
  let s = p.toLowerCase();
  s = s.split("?")[0].split("#")[0];
  if (s.length > 1 && s.endsWith("/")) s = s.slice(0, -1);
  return s;
}

// ---------- 1. Static audit over prerendered HTML ---------------------------

const files = listHtml(PUBLIC_DIR).filter((f) => !SKIP.has(f)).sort();
console.log(
  `\n🔍 Checking canonical parity on ${files.length} prerendered pages…\n`,
);

let errors = 0;
const failed = [];

for (const file of files) {
  const html = readFileSync(join(PUBLIC_DIR, file), "utf8");
  const canonical = getCanonical(html);
  if (!canonical) {
    errors++;
    failed.push(file);
    console.log(`❌ ${file}\n   ERROR: missing <link rel="canonical">`);
    continue;
  }

  let url;
  try {
    url = new URL(canonical);
  } catch {
    errors++;
    failed.push(file);
    console.log(`❌ ${file}\n   ERROR: malformed canonical "${canonical}"`);
    continue;
  }

  if (url.protocol !== "https:") {
    errors++;
    failed.push(file);
    console.log(`❌ ${file}\n   ERROR: canonical must be https — "${canonical}"`);
    continue;
  }
  if (!ALLOWED_HOSTS.has(url.hostname)) {
    errors++;
    failed.push(file);
    console.log(
      `❌ ${file}\n   ERROR: canonical host "${url.hostname}" not in allow-list (${PROD_ORIGIN})`,
    );
    continue;
  }

  const expected = normalize(fileToPath(file));
  const actual = normalize(url.pathname);
  if (expected !== actual) {
    errors++;
    failed.push(file);
    console.log(
      `❌ ${file}\n   ERROR: canonical path "${actual}" ≠ file path "${expected}"`,
    );
    continue;
  }

  // Canonical should be lowercase and free of query/hash.
  if (canonical !== canonical.toLowerCase()) {
    errors++;
    failed.push(file);
    console.log(
      `❌ ${file}\n   ERROR: canonical not lowercase: "${canonical}"`,
    );
    continue;
  }
  if (url.search || url.hash) {
    errors++;
    failed.push(file);
    console.log(
      `❌ ${file}\n   ERROR: canonical contains query/hash: "${canonical}"`,
    );
  }
}

// ---------- 2. Runtime audit: GA4 must read from canonical ------------------

console.log("");
let trackerErrors = 0;
try {
  const tracker = readFileSync(TRACKER, "utf8");
  const readsCanonical = /link\[rel=["']canonical["']\]/.test(tracker);
  const sendsPageLocation = /page_location\s*:/.test(tracker);
  const usesCanonicalForLocation =
    /pageLocation\s*=\s*canonicalEl\?\.href/.test(tracker) ||
    /canonicalEl\?\.href\s*\|\|\s*window\.location\.href/.test(tracker);

  if (!readsCanonical) {
    trackerErrors++;
    console.log(
      `❌ ${TRACKER}\n   ERROR: RouteChangeTracker must query 'link[rel="canonical"]' so GA4 page_location matches what Google indexes.`,
    );
  }
  if (!sendsPageLocation) {
    trackerErrors++;
    console.log(
      `❌ ${TRACKER}\n   ERROR: RouteChangeTracker must send page_location on every SPA navigation.`,
    );
  }
  if (!usesCanonicalForLocation) {
    trackerErrors++;
    console.log(
      `❌ ${TRACKER}\n   ERROR: page_location must be derived from the canonical tag (with window.location.href as fallback).`,
    );
  }
} catch (e) {
  trackerErrors++;
  console.log(`❌ Could not read RouteChangeTracker: ${e.message}`);
}

// ---------- Summary ---------------------------------------------------------

console.log("─".repeat(60));
console.log(`Pages scanned:              ${files.length}`);
console.log(`Pages with canonical errors: ${failed.length}`);
console.log(`Tracker errors:             ${trackerErrors}`);
console.log("─".repeat(60));

const total = errors + trackerErrors;
if (total > 0) {
  console.error(
    `\n❌ Canonical/GA parity check failed: ${total} error(s).\n` +
      `   Every public page must ship a canonical that matches its path,\n` +
      `   and the SPA must report GA4 page_location from that canonical.\n`,
  );
  process.exit(1);
}

console.log(
  `\n✅ Canonical/GA parity passed — every page has a canonical and GA4 page_location reads from it.\n`,
);
