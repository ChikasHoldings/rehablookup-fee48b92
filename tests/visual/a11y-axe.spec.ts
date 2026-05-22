import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Axe-core accessibility audit across the top 20 routes from the
 * prerender manifest (~50k paths total).
 *
 * Coverage strategy
 * ─────────────────
 *   • Always include "/" (canonical homepage)
 *   • Stratified sample across path prefixes so a homogeneous bucket of
 *     "/30-day-rehab-in-{city}" doesn't crowd out state pages, treatment
 *     pages, near-me pages, insurance pages, etc.
 *   • Same seed (alphabetical sort + round-robin pick) so every CI run
 *     audits the same 20 routes — failures are reproducible.
 *
 * Rule set
 * ────────
 * Configured to WCAG 2.1 A + AA. Best-practices rules (e.g. region
 * landmark hints) are intentionally NOT enabled — they generate noise
 * that hides real failures. Add `.withTags(["best-practice"])` locally
 * to triage them as a separate pass.
 *
 * The audit treats:
 *   • `serious` and `critical` violations as failures (axe's own labels)
 *   • `moderate` and `minor` violations as warnings (printed but no fail)
 *
 * Running locally
 * ───────────────
 *   1. npm run dev                     # terminal 1
 *   2. npx playwright install chromium # one-time
 *   3. npx playwright test a11y-axe    # terminal 2
 *
 * In CI
 * ─────
 * Add to .github/workflows/* once the baseline is green. Until then,
 * triage violations one route at a time — every new commit that fixes a
 * violation should remove its waiver here.
 */

const MANIFEST_PATH = join(__dirname, "..", "..", "public", "prerender-manifest.json");

function loadSampleRoutes(): string[] {
  const all: string[] = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  const groups = new Map<string, string[]>();
  for (const p of all) {
    const key = p === "/" ? "/" : p.split("/")[1] || "/";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(p);
  }
  // Sort each group so the sample is reproducible across machines.
  for (const list of groups.values()) list.sort();

  const result: string[] = [];
  // Force homepage first.
  if (groups.has("/")) {
    result.push("/");
    groups.delete("/");
  }

  // Round-robin across the remaining groups.
  const keys = [...groups.keys()].sort();
  while (result.length < 20 && keys.length > 0) {
    for (const k of keys) {
      const bucket = groups.get(k);
      if (bucket && bucket.length > 0) {
        result.push(bucket.shift()!);
        if (result.length >= 20) break;
      }
    }
  }
  return result;
}

const ROUTES = loadSampleRoutes();

test.describe("a11y — axe-core audit (WCAG 2.1 A + AA)", () => {
  // Force serial so we can read aggregate counts post-run if needed.
  test.describe.configure({ mode: "serial" });

  for (const route of ROUTES) {
    test(`${route} has no serious/critical axe violations`, async ({ page }) => {
      const response = await page.goto(route, { waitUntil: "networkidle" });
      // Some prerendered routes 200 from disk, others 200 via SPA fallback.
      // Either is fine for accessibility scanning; only hard 5xx/404s fail.
      if (response) {
        expect(response.status(), `unexpected HTTP status on ${route}`).toBeLessThan(400);
      }

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();

      const serious = results.violations.filter(
        (v) => v.impact === "serious" || v.impact === "critical",
      );

      if (serious.length > 0) {
        const lines: string[] = [];
        for (const v of serious) {
          lines.push(`  ✗ [${v.impact}] ${v.id}: ${v.help}`);
          lines.push(`      help: ${v.helpUrl}`);
          for (const n of v.nodes.slice(0, 3)) {
            lines.push(`      target: ${n.target.join(" ")}`);
            const summary = n.failureSummary?.split("\n").slice(0, 2).join(" | ");
            if (summary) lines.push(`      why: ${summary}`);
          }
          if (v.nodes.length > 3) lines.push(`      … and ${v.nodes.length - 3} more node(s)`);
        }
        console.error(`\n${route} — ${serious.length} serious/critical violation(s):\n` + lines.join("\n"));
      }

      // Surface moderate/minor as console warnings so they're visible in
      // CI logs but don't fail the run.
      const lesser = results.violations.filter(
        (v) => v.impact === "moderate" || v.impact === "minor",
      );
      if (lesser.length > 0) {
        console.warn(`${route} — ${lesser.length} non-blocking violation(s): ` +
          lesser.map((v) => `${v.id} (${v.impact})`).join(", "));
      }

      expect(
        serious,
        `Expected zero serious/critical axe violations on ${route}; see console output for details.`,
      ).toHaveLength(0);
    });
  }
});
