#!/usr/bin/env node
/**
 * Fail on references to names that do not exist (TypeScript TS2304 "Cannot
 * find name" / TS2552 "Cannot find name … Did you mean …").
 *
 * The app has a backlog of unrelated type errors, so `tsc` is not a build
 * gate. These two codes are different: each one is a ReferenceError at
 * runtime. In November 2026 nine public pages (the treatment-types hub,
 * Contact, Cost Estimator, several treatment and international pages) and the
 * provider Settings screen were crashing for every visitor because of exactly
 * this: icons used without an import, and setters removed while still called.
 *
 * Usage: node scripts/check-undefined-identifiers.mjs
 */
import { spawnSync } from "node:child_process";

const res = spawnSync("npx", ["tsc", "-p", "tsconfig.app.json", "--noEmit", "--pretty", "false"], {
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
const hits = out.split("\n").filter((l) => /error TS(2304|2552):/.test(l));
if (hits.length) {
  console.error(`✗ check-undefined-identifiers: ${hits.length} reference(s) to undefined names (runtime crashes):`);
  for (const h of hits) console.error(`  ${h}`);
  process.exit(1);
}
if (!/error TS\d+/.test(out) && res.status !== 0 && res.status !== 2) {
  console.error(`✗ check-undefined-identifiers: tsc did not run (exit ${res.status}).\n${out.slice(0, 2000)}`);
  process.exit(1);
}
console.log("✓ check-undefined-identifiers: no references to undefined names");
