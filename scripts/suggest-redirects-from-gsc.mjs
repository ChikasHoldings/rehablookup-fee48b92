#!/usr/bin/env node
/**
 * Suggest legacy-slug redirects from a Google Search Console CSV.
 *
 * Accepts a CSV exported from GSC's "Pages" report (or "Page indexing" /
 * "Crawl errors"). Looks for a column containing URLs, derives the path,
 * and classifies each:
 *
 *   ALREADY_LIVE  → the path already maps to a live React route. No action.
 *   AUTO_FIXABLE  → matches one of our heuristic patterns (e.g. /seeker/* →
 *                   /client/*). The active App.tsx redirects already cover it.
 *   SUGGEST       → no live route + no heuristic match. Emits a stub
 *                   `<Route ... element={<Navigate to="..." replace />} />`
 *                   line for review with a best-guess target.
 *
 * Usage:
 *   node scripts/suggest-redirects-from-gsc.mjs <path-to.csv>
 *   node scripts/suggest-redirects-from-gsc.mjs <path-to.csv> --min-clicks=5
 *
 * The script is read-only — it never edits App.tsx. Output goes to stdout
 * AND to /tmp/redirect-suggestions.txt for easy review.
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const args = process.argv.slice(2);
const csvPath = args.find((a) => !a.startsWith("--"));
const minClicks = Number(
  (args.find((a) => a.startsWith("--min-clicks=")) || "--min-clicks=1").split("=")[1]
) || 1;

if (!csvPath || !existsSync(csvPath)) {
  console.error("Usage: node scripts/suggest-redirects-from-gsc.mjs <path-to.csv> [--min-clicks=N]");
  process.exit(1);
}

// ---- Parse CSV (lightweight, handles quoted fields) ------------------------
function parseCsv(text) {
  const rows = [];
  let i = 0,
    field = "",
    row = [],
    inQ = false;
  while (i < text.length) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 2;
        continue;
      }
      if (c === '"') {
        inQ = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQ = true;
      i++;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i++;
      continue;
    }
    if (c === "\r") {
      i++;
      continue;
    }
    if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      i++;
      continue;
    }
    field += c;
    i++;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length && r.some((v) => v.trim() !== ""));
}

// ---- Discover live App.tsx routes (literals + dynamic prefixes) -----------
function readAppRoutes() {
  const literal = new Set();
  const dynamicPrefixes = [];
  const src = readFileSync(join(ROOT, "src/App.tsx"), "utf8");
  for (const m of src.matchAll(/<Route\s+path=["']([^"']+)["']/g)) {
    let p = m[1].toLowerCase();
    if (!p.startsWith("/")) p = "/" + p;
    if (/[:*]/.test(p)) {
      const parts = [];
      for (const seg of p.split("/")) {
        if (/[:*]/.test(seg)) break;
        parts.push(seg);
      }
      dynamicPrefixes.push(parts.join("/") || "/");
    } else {
      literal.add(p.replace(/\/+$/, "") || "/");
    }
  }
  return { literal, dynamicPrefixes };
}

function isLive(path, { literal, dynamicPrefixes }) {
  const p = path.replace(/\/+$/, "").toLowerCase() || "/";
  if (literal.has(p)) return true;
  for (const pfx of dynamicPrefixes) {
    if (pfx === "/" || pfx === "") return true;
    if (p === pfx || p.startsWith(pfx + "/")) return true;
  }
  return false;
}

// ---- Heuristic guess for redirect target ----------------------------------
function suggestTarget(path) {
  const p = path.toLowerCase();
  // .html stripping
  if (p.endsWith(".html")) return p.replace(/\.html$/, "");
  // Trailing slash
  if (p.length > 1 && p.endsWith("/")) return p.replace(/\/+$/, "");
  // /seeker/* → /client/*
  if (p === "/seeker") return "/client";
  if (p.startsWith("/seeker/")) return "/client/" + p.slice("/seeker/".length);
  // /facility/:slug, /profile/:slug → /center/:slug
  const fac = p.match(/^\/(facility|profile)\/([^/]+)$/);
  if (fac) return `/center/${fac[2]}`;
  // /state/:slug → /rehab-centers/:slug
  const st = p.match(/^\/state\/([^/]+)$/);
  if (st) return `/rehab-centers/${st[1]}`;
  // /location/:state/:city → /rehab-centers/:state/:city
  const loc = p.match(/^\/location\/([^/]+)\/([^/]+)$/);
  if (loc) return `/rehab-centers/${loc[1]}/${loc[2]}`;
  // Common search shorthand
  if (["/find-rehab", "/find-treatment", "/rehab", "/directory", "/search", "/centers"].includes(p))
    return "/rehab-centers";
  if (p === "/treatment") return "/treatment-types";
  // /rehab/:state → /rehab-centers/:state
  const rs = p.match(/^\/rehab\/([^/]+)$/);
  if (rs) return `/rehab-centers/${rs[1]}`;
  // Unknown
  return null;
}

// ---- Main ------------------------------------------------------------------
function main() {
  const text = readFileSync(csvPath, "utf8");
  const rows = parseCsv(text);
  if (rows.length < 2) {
    console.error("CSV appears empty");
    process.exit(1);
  }
  const header = rows[0].map((h) => h.trim().toLowerCase());
  const urlIdx = header.findIndex((h) => /url|page|address/.test(h));
  const clicksIdx = header.findIndex((h) => /click/.test(h));
  if (urlIdx === -1) {
    console.error("Could not find a URL/Page column. Headers:", header);
    process.exit(1);
  }

  const appRoutes = readAppRoutes();
  const seen = new Map(); // path → clicks

  for (const row of rows.slice(1)) {
    const raw = (row[urlIdx] || "").trim();
    if (!raw) continue;
    let path;
    try {
      path = new URL(raw, "https://rehablookup.com").pathname;
    } catch {
      continue;
    }
    path = path.toLowerCase();
    const clicks = clicksIdx === -1 ? 1 : Number(row[clicksIdx]) || 1;
    seen.set(path, (seen.get(path) || 0) + clicks);
  }

  const live = [];
  const autoFixable = [];
  const suggest = [];
  const unknown = [];

  for (const [path, clicks] of seen.entries()) {
    if (clicks < minClicks) continue;
    if (isLive(path, appRoutes)) {
      live.push({ path, clicks });
      continue;
    }
    const target = suggestTarget(path);
    if (target && isLive(target, appRoutes)) {
      autoFixable.push({ path, target, clicks });
    } else if (target) {
      suggest.push({ path, target, clicks });
    } else {
      unknown.push({ path, clicks });
    }
  }

  const byClicks = (a, b) => b.clicks - a.clicks;
  live.sort(byClicks);
  autoFixable.sort(byClicks);
  suggest.sort(byClicks);
  unknown.sort(byClicks);

  const lines = [];
  lines.push(`# Redirect suggestions from ${csvPath}`);
  lines.push(`# min-clicks=${minClicks}`);
  lines.push(``);
  lines.push(`## ✅ Already live (${live.length})`);
  for (const x of live.slice(0, 20)) lines.push(`  ${x.clicks.toString().padStart(5)}  ${x.path}`);
  if (live.length > 20) lines.push(`  …and ${live.length - 20} more`);
  lines.push(``);
  lines.push(`## 🔁 Heuristic-covered, no action needed (${autoFixable.length})`);
  for (const x of autoFixable.slice(0, 30))
    lines.push(`  ${x.clicks.toString().padStart(5)}  ${x.path}  →  ${x.target}`);
  if (autoFixable.length > 30) lines.push(`  …and ${autoFixable.length - 30} more`);
  lines.push(``);
  lines.push(`## ✏️  Suggested new redirects (${suggest.length})`);
  lines.push(`# Add these inside the legacy-redirect block in src/App.tsx:`);
  for (const x of suggest)
    lines.push(
      `  <Route path="${x.path}" element={<Navigate to="${x.target}" replace />} />  // ${x.clicks} clicks`
    );
  lines.push(``);
  lines.push(`## ❓ Unknown — manual review required (${unknown.length})`);
  for (const x of unknown.slice(0, 30))
    lines.push(`  ${x.clicks.toString().padStart(5)}  ${x.path}`);
  if (unknown.length > 30) lines.push(`  …and ${unknown.length - 30} more`);

  const out = lines.join("\n");
  console.log(out);
  writeFileSync("/tmp/redirect-suggestions.txt", out, "utf8");
  console.log(`\nFull report saved to /tmp/redirect-suggestions.txt`);
}

main();
