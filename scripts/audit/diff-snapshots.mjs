#!/usr/bin/env node
/**
 * Diff two snapshot CSVs produced by snapshot-production.mjs.
 *
 * Compares per-URL: status, canonical, title, meta description, h1,
 * jsonLdCount, robots. Outputs a markdown report grouped by severity.
 *
 * Severities:
 *   CRITICAL — status changed (200 → 404, 301 → 200, etc.)
 *              or canonical changed
 *   HIGH     — title or description changed
 *   LOW      — h1 / jsonLdCount / robots changed
 *
 * Usage:
 *   node scripts/audit/diff-snapshots.mjs \
 *     --before docs/audit/vercel-cutover/pre-cutover-snapshot.csv \
 *     --after  docs/audit/vercel-cutover/vercel-build-snapshot.csv \
 *     --out    docs/audit/vercel-cutover/diff-report.md
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
const argv = process.argv.slice(2);
const get = (k, d) => { const i = argv.indexOf(`--${k}`); return i === -1 ? d : argv[i + 1]; };

const BEFORE = resolve(ROOT, get("before", "docs/audit/vercel-cutover/pre-cutover-snapshot.csv"));
const AFTER = resolve(ROOT, get("after", "docs/audit/vercel-cutover/vercel-build-snapshot.csv"));
const OUT = resolve(ROOT, get("out", "docs/audit/vercel-cutover/diff-report.md"));

function parseCsv(path) {
  const txt = readFileSync(path, "utf8");
  const lines = txt.split("\n").filter(Boolean);
  const header = parseRow(lines[0]);
  const rows = new Map();
  for (let i = 1; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const row = Object.fromEntries(header.map((h, j) => [h, cells[j] ?? ""]));
    // Normalize URL for keying: strip host so we can compare across origins
    const u = row.url || "";
    let path;
    try { path = new URL(u).pathname; } catch { path = u; }
    rows.set(path, row);
  }
  return rows;
}

function parseRow(line) {
  const out = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") { out.push(cur); cur = ""; }
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

const before = parseCsv(BEFORE);
const after = parseCsv(AFTER);

const allPaths = new Set([...before.keys(), ...after.keys()]);
const issues = { CRITICAL: [], HIGH: [], LOW: [] };

for (const path of [...allPaths].sort()) {
  const a = before.get(path);
  const b = after.get(path);
  if (!a) { issues.LOW.push({ path, kind: "added", note: `New URL in after-snapshot (${b.status})` }); continue; }
  if (!b) { issues.CRITICAL.push({ path, kind: "missing", note: `URL present before, missing in after-snapshot` }); continue; }
  if (a.status !== b.status) issues.CRITICAL.push({ path, kind: "status", note: `${a.status} → ${b.status}` });
  if ((a.canonical || "") !== (b.canonical || "")) issues.CRITICAL.push({ path, kind: "canonical", note: `${a.canonical} → ${b.canonical}` });
  if ((a.title || "") !== (b.title || "")) issues.HIGH.push({ path, kind: "title", note: `"${a.title}" → "${b.title}"` });
  if ((a.desc || "") !== (b.desc || "")) issues.HIGH.push({ path, kind: "desc", note: `"${(a.desc || "").slice(0, 60)}…" → "${(b.desc || "").slice(0, 60)}…"` });
  if ((a.h1 || "") !== (b.h1 || "")) issues.LOW.push({ path, kind: "h1", note: `"${a.h1}" → "${b.h1}"` });
  if ((a.jsonLdCount || "0") !== (b.jsonLdCount || "0")) issues.LOW.push({ path, kind: "jsonLd", note: `${a.jsonLdCount} → ${b.jsonLdCount}` });
  if ((a.robots || "") !== (b.robots || "")) issues.LOW.push({ path, kind: "robots", note: `"${a.robots}" → "${b.robots}"` });
}

const total = issues.CRITICAL.length + issues.HIGH.length + issues.LOW.length;
const lines = [];
lines.push(`# Cutover Snapshot Diff`);
lines.push(``);
lines.push(`- Before: \`${BEFORE.replace(ROOT + "/", "")}\` (${before.size} URLs)`);
lines.push(`- After:  \`${AFTER.replace(ROOT + "/", "")}\` (${after.size} URLs)`);
lines.push(`- Total differences: **${total}** (CRITICAL ${issues.CRITICAL.length}, HIGH ${issues.HIGH.length}, LOW ${issues.LOW.length})`);
lines.push(``);

for (const sev of ["CRITICAL", "HIGH", "LOW"]) {
  lines.push(`## ${sev} (${issues[sev].length})`);
  if (!issues[sev].length) { lines.push(`_None._`); lines.push(``); continue; }
  for (const i of issues[sev]) lines.push(`- **${i.kind}** \`${i.path}\` — ${i.note}`);
  lines.push(``);
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"));
console.log(`✅ Wrote ${OUT}`);
console.log(`   CRITICAL ${issues.CRITICAL.length} | HIGH ${issues.HIGH.length} | LOW ${issues.LOW.length}`);
process.exit(issues.CRITICAL.length ? 1 : 0);
