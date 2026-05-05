/**
 * Regression test: the offline broken-link checker must pass on every PR.
 *
 * Wraps `scripts/check-broken-links.mjs` (SKIP_EXTERNAL=1) so the same gate
 * that runs in CI (.github/workflows/seo-validators.yml) is also enforced via
 * `vitest run` locally and in any future test pipeline. If a contributor
 * adds a hardcoded link to a non-existent route (or removes a SmartCatchAll
 * prefix), this test fails before the link checker job even starts.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

describe("broken-link checker (offline)", () => {
  it("resolves every internal href in prerendered HTML", () => {
    const script = resolve(__dirname, "../../scripts/check-broken-links.mjs");
    const result = spawnSync("node", [script], {
      env: { ...process.env, SKIP_EXTERNAL: "1" },
      encoding: "utf8",
      timeout: 5 * 60 * 1000,
    });

    if (result.status !== 0) {
      // Surface the report tail so failures are actionable in CI logs.
      console.error(result.stdout);
      console.error(result.stderr);
    }
    expect(result.status).toBe(0);
  }, 5 * 60 * 1000);
});
