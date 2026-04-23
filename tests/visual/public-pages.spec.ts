import { test, expect } from "@playwright/test";

/**
 * Visual regression baseline for key public pages.
 *
 * IMPORTANT — running these tests:
 *   1. Start the dev server:        npm run dev
 *   2. (one-time) Install browsers: npx playwright install chromium
 *   3. Generate baselines:          npx playwright test --update-snapshots
 *   4. On every PR / CI run:        npx playwright test
 *
 * If a layout regression occurs, the diff PNG will be written to
 * test-results/ for inspection. To accept an intentional change, re-run
 * with --update-snapshots and commit the new baseline.
 */

const PAGES = [
  { path: "/", name: "home" },
  { path: "/rehab-centers", name: "rehab-centers" },
  { path: "/treatment-types", name: "treatment-types" },
  { path: "/about", name: "about" },
  { path: "/how-it-works", name: "how-it-works" },
  { path: "/faq", name: "faq" },
  { path: "/contact", name: "contact" },
  { path: "/concierge", name: "concierge" },
  { path: "/insurance", name: "insurance" },
  { path: "/cost-estimator", name: "cost-estimator" },
  { path: "/blog", name: "blog" },
  { path: "/rehab-centers/california", name: "state-california" },
  { path: "/treatment-types/detox-programs", name: "tx-detox" },
];

for (const page of PAGES) {
  test(`${page.name} — full-page visual snapshot`, async ({ page: pw }, testInfo) => {
    await pw.goto(page.path, { waitUntil: "networkidle" });

    // Stabilise: disable animations and wait for fonts/images
    await pw.addStyleTag({
      content: `*,*::before,*::after{animation:none!important;transition:none!important;}`,
    });
    await pw.evaluate(() => (document as any).fonts?.ready);
    // Give lazy-loaded images a beat to resolve
    await pw.waitForTimeout(500);

    await expect(pw).toHaveScreenshot(`${page.name}.png`, {
      fullPage: true,
      // Mask volatile regions that change per-render (e.g. counters, dates)
      mask: [pw.locator("[data-volatile]")],
    });
    testInfo.annotations.push({ type: "viewport", description: testInfo.project.name });
  });
}
