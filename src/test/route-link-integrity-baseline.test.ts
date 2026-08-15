/**
 * R9 — Route / link / sitemap integrity baseline.
 *
 * Stage 2 regenerates tens of thousands of prerendered SEO files and removes
 * public routes. The repository already owns validators for each invariant we
 * care about, but most of them run only in `npm run build` /
 * `npm run validate:blocking` — NOT in `npm run test`. This file wraps the
 * remaining ones so a single `vitest run` fails fast on a broken route graph,
 * mirroring the pattern `src/__tests__/broken-links-checker.test.ts` already
 * established for the offline link crawler.
 *
 * Existing coverage, deliberately NOT duplicated here:
 *   • internal hrefs inside prerendered HTML resolve
 *       → src/__tests__/broken-links-checker.test.ts
 *         (wraps scripts/check-broken-links.mjs, SKIP_EXTERNAL=1)
 *   • provider redirect targets resolve to declared routes
 *       → src/test/provider-marketing-navigation.test.tsx (R8)
 *
 * Added here:
 *   • every redirect destination (vercel.json + SPA) resolves
 *   • hardcoded internal links resolve
 *   • no internal link 404s
 *   • sitemap coverage does not silently collapse
 *
 * These are intentionally generic invariants. None of them require Concierge
 * or international routes to exist — they only require that whatever is linked
 * or listed actually resolves. That is exactly what must stay true through
 * Stage 2.
 */
import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "../..");

function runValidator(script: string, env: Record<string, string> = {}) {
  const result = spawnSync("node", [resolve(ROOT, "scripts", script)], {
    cwd: ROOT,
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 5 * 60 * 1000,
  });
  if (result.status !== 0) {
    // Surface the report so CI logs are actionable.
    console.error(result.stdout);
    console.error(result.stderr);
  }
  return result;
}

describe("R9 — route and link integrity baseline", () => {
  it("every redirect destination resolves (no dead or chained redirects)", () => {
    const result = runValidator("check-redirect-targets.mjs");
    expect(result.status).toBe(0);
  }, 5 * 60 * 1000);

  it("every hardcoded internal link resolves to a real route", () => {
    const result = runValidator("validate-internal-links.mjs");
    expect(result.status).toBe(0);
  }, 5 * 60 * 1000);

  it("no internal link resolves to a 404 route", () => {
    const result = runValidator("check-no-internal-404.mjs");
    expect(result.status).toBe(0);
  }, 5 * 60 * 1000);

  it("sitemap coverage has not collapsed against its baseline", () => {
    // Stage 2 removes entries from the sitemap. This validator tolerates small
    // deltas but fails on a collapse, which is the accident we care about
    // (a regeneration that silently drops thousands of indexed URLs).
    const result = runValidator("check-sitemap-coverage.mjs");
    expect(result.status).toBe(0);
  }, 5 * 60 * 1000);
});
