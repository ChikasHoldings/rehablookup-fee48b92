#!/usr/bin/env node
/**
 * CI Guard: pin the exact query shape used by `auto-reload-credits`
 * against the `provider_auto_reload_settings` table.
 *
 * Why: this query controls whether an off-session card is charged.
 * Drift in the column list, filters, or `.maybeSingle()` could:
 *  - leak rows belonging to a different provider,
 *  - bypass the `enabled = true` gate (charging disabled accounts),
 *  - return arrays where the function expects a single row (TypeError → 500),
 *  - or accidentally `select('*')` and pull unrelated columns.
 *
 * This script enforces the exact contract and fails CI if the query changes.
 * If a change is intentional, update both `index.ts` and the `EXPECTED`
 * constants below in the same commit.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FN_PATH = resolve(
  __dirname,
  "../../supabase/functions/auto-reload-credits/index.ts"
);

const EXPECTED = {
  table: "provider_auto_reload_settings",
  columns: [
    "provider_id",
    "facility_id",
    "enabled",
    "threshold_cents",
    "reload_amount_cents",
  ],
  filters: [
    { column: "provider_id", value: "providerId" }, // variable reference
    { column: "enabled", value: "true" },
  ],
  terminator: "maybeSingle",
};

function fail(msg) {
  console.error(`\n❌ auto-reload-credits query shape check FAILED:\n   ${msg}\n`);
  console.error(
    "   This guard exists because drift in this query can cause silent\n" +
    "   off-session charges against the wrong provider. If the change is\n" +
    "   intentional, update EXPECTED in scripts/audit/check-auto-reload-query-shape.mjs.\n"
  );
  process.exit(1);
}

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}

if (!existsSync(FN_PATH)) {
  fail(`Edge function not found at ${FN_PATH}`);
}

const source = readFileSync(FN_PATH, "utf8");

// ---------------------------------------------------------------------------
// 1. Locate the query chain: .from("provider_auto_reload_settings") ... ;
// ---------------------------------------------------------------------------
const fromIdx = source.indexOf(`.from("${EXPECTED.table}")`);
if (fromIdx === -1) {
  fail(`Missing \`.from("${EXPECTED.table}")\` call.`);
}

// Capture the chain up to the first terminating semicolon.
const tail = source.slice(fromIdx);
const semiIdx = tail.indexOf(";");
if (semiIdx === -1) fail("Could not find end of query chain (no `;`).");
const chain = tail.slice(0, semiIdx);

ok(`Found query chain on \`${EXPECTED.table}\``);

// ---------------------------------------------------------------------------
// 2. Reject `select(*)` and `select()` (no-arg).
// ---------------------------------------------------------------------------
if (/\.select\(\s*["'`]\*["'`]\s*\)/.test(chain)) {
  fail("Query uses `.select('*')`. Must list explicit columns.");
}
if (/\.select\(\s*\)/.test(chain)) {
  fail("Query uses `.select()` with no columns. Must list explicit columns.");
}

// ---------------------------------------------------------------------------
// 3. Pin the exact `.select(...)` column list (order-sensitive).
// ---------------------------------------------------------------------------
const selectMatch = chain.match(/\.select\(\s*["'`]([^"'`]+)["'`]\s*\)/);
if (!selectMatch) {
  fail("Could not find `.select(\"...\")` with a string column list.");
}
const actualColumns = selectMatch[1].split(",").map((c) => c.trim());
const expectedColumns = EXPECTED.columns;

if (actualColumns.length !== expectedColumns.length) {
  fail(
    `Column count mismatch. Expected ${expectedColumns.length} ` +
    `(${expectedColumns.join(", ")}), got ${actualColumns.length} ` +
    `(${actualColumns.join(", ")}).`
  );
}
for (let i = 0; i < expectedColumns.length; i++) {
  if (actualColumns[i] !== expectedColumns[i]) {
    fail(
      `Column #${i + 1} mismatch. Expected "${expectedColumns[i]}", ` +
      `got "${actualColumns[i]}". Full list: [${actualColumns.join(", ")}]`
    );
  }
}
ok(`select() pins exact columns: ${expectedColumns.join(", ")}`);

// ---------------------------------------------------------------------------
// 4. Require both `.eq(...)` filters in order.
// ---------------------------------------------------------------------------
const eqRegex = /\.eq\(\s*["'`]([^"'`]+)["'`]\s*,\s*([^)]+?)\s*\)/g;
const eqMatches = [...chain.matchAll(eqRegex)];

if (eqMatches.length < EXPECTED.filters.length) {
  fail(
    `Expected ${EXPECTED.filters.length} \`.eq(...)\` filters, ` +
    `found ${eqMatches.length}.`
  );
}

for (let i = 0; i < EXPECTED.filters.length; i++) {
  const want = EXPECTED.filters[i];
  const got = eqMatches[i];
  if (got[1] !== want.column) {
    fail(
      `Filter #${i + 1}: expected column "${want.column}", got "${got[1]}".`
    );
  }
  const gotValue = got[2].trim();
  if (gotValue !== want.value) {
    fail(
      `Filter #${i + 1} on "${want.column}": expected value \`${want.value}\`, ` +
      `got \`${gotValue}\`.`
    );
  }
  ok(`.eq("${want.column}", ${want.value}) present`);
}

// ---------------------------------------------------------------------------
// 5. Require `.maybeSingle()` terminator (NOT `.single()` or array return).
// ---------------------------------------------------------------------------
if (!new RegExp(`\\.${EXPECTED.terminator}\\(\\s*\\)`).test(chain)) {
  if (/\.single\(\s*\)/.test(chain)) {
    fail(
      "Query terminates with `.single()`. Must use `.maybeSingle()` so a " +
      "missing settings row returns null instead of throwing PGRST116."
    );
  }
  fail(`Query must terminate with \`.${EXPECTED.terminator}()\`.`);
}
ok(`.${EXPECTED.terminator}() terminator present`);

// ---------------------------------------------------------------------------
// 6. Sanity: nothing between `.maybeSingle()` and the chain end (no `.then`,
//    no extra filters that could change semantics).
// ---------------------------------------------------------------------------
const afterTerminator = chain.split(`.${EXPECTED.terminator}()`)[1] ?? "";
if (afterTerminator.trim().length > 0) {
  fail(
    `Unexpected content after \`.${EXPECTED.terminator}()\`: ` +
    `\`${afterTerminator.trim()}\``
  );
}
ok("No trailing chain methods after maybeSingle()");

console.log(
  "\n✅ auto-reload-credits query shape is pinned and unchanged.\n"
);
process.exit(0);
