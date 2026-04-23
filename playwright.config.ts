import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright visual regression config.
 *
 * Visual snapshots live next to specs in tests/visual/__screenshots__.
 * To create or refresh baselines after intentional UI changes:
 *   npx playwright test --update-snapshots
 *
 * To run locally:
 *   npm run dev   # in one terminal
 *   npx playwright test
 */
export default defineConfig({
  testDir: "./tests/visual",
  fullyParallel: true,
  reporter: "list",
  // Threshold tuned to ignore subtle anti-aliasing differences between
  // headless Chromium versions while still catching real layout shift.
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    // Disable JS animations / transitions to stabilise screenshots.
    launchOptions: { args: ["--font-render-hinting=none"] },
  },
  projects: [
    { name: "mobile-320", use: { ...devices["Desktop Chrome"], viewport: { width: 320, height: 568 } } },
    { name: "tablet-768", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop-1024", use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
  ],
});
