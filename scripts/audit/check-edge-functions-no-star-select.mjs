#!/usr/bin/env node
/**
 * Fails the build if any file under supabase/functions/ uses
 *   .select("*")  or  .select('*')
 *
 * Rationale (project memory, Core rule):
 *   "No `select(*)`. Use explicit columns. PII masked at DB level
 *    until explicitly unlocked."
 *
 * Allowlist a line by appending  // no-star-ok  with a justification.
 *
 * Examples that PASS:
 *   .select("id, name")
 *   .select("*", { count: "exact", head: true })  // count-only, no rows returned
 *
 * Examples that FAIL:
 *   .select("*")
 *   .select('*')
 *
 * The `count/head` form is treated as safe because Postgrest never returns the
 * row data — it is shape-equivalent to selecting nothing.
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const FUNCTIONS_DIR = "supabase/functions";
const ROOT = process.cwd();
const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_PATH = join(__dirname, "no-star-select-baseline.json");

// Pre-existing violations we tolerate (audit M-tier debt). New violations
// must be fixed at write-time. Match key is "file:line".
let baseline = new Set();
if (existsSync(BASELINE_PATH)) {
  try {
    const raw = JSON.parse(readFileSync(BASELINE_PATH, "utf8"));
    if (Array.isArray(raw)) baseline = new Set(raw);
  } catch (e) {
    console.error(`WARN: could not parse ${BASELINE_PATH}: ${e.message}`);
  }
}

// Bare star: .select("*") or .select('*') with optional whitespace, no extra args
const BARE_STAR = /\.select\(\s*(['"])\*\1\s*\)/;

// Count-only form: .select("*", { count: ..., head: true }) — safe (no rows returned)
const COUNT_HEAD = /\.select\(\s*(['"])\*\1\s*,\s*\{[^}]*\bhead\s*:\s*true[^}]*\}\s*\)/;

// Allowlist marker
const ALLOW = "no-star-ok";

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      // Skip _shared types tests fixtures? Scan everything that's TS/JS.
      yield* walk(full);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry)) {
      yield full;
    }
  }
}

const violations = [];
const grandfathered = [];

for (const file of walk(FUNCTIONS_DIR)) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!BARE_STAR.test(line)) continue;
    if (COUNT_HEAD.test(line)) continue; // safe count-only
    if (line.includes(ALLOW)) continue;
    const rel = relative(ROOT, file);
    const key = `${rel}:${i + 1}`;
    const entry = { file: rel, line: i + 1, text: line.trim(), key };
    if (baseline.has(key)) {
      grandfathered.push(entry);
    } else {
      violations.push(entry);
    }
  }
}

if (violations.length === 0) {
  const msg =
    grandfathered.length > 0
      ? ` — ${grandfathered.length} pre-existing violations grandfathered via baseline.json`
      : "";
  console.log(
    `✅ no-star-select: scanned ${FUNCTIONS_DIR} — no NEW .select("*") found${msg}.`
  );
  process.exit(0);
}

console.error(
  `❌ no-star-select: found ${violations.length} NEW forbidden .select("*") call(s) in edge functions.\n`
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    ${v.text}`);
}
console.error(
  `\nFix: replace .select("*") with explicit columns, or annotate the line with` +
    ` "// ${ALLOW} <justification>" if it's truly safe (e.g. count/head).\n` +
    `(Pre-existing violations are tracked in scripts/audit/no-star-select-baseline.json` +
    ` — do NOT add new entries; fix the call instead.)\n`
);
process.exit(1);
