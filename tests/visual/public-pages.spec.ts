import { test, expect, type Page } from "@playwright/test";

/**
 * Visual regression baseline for key public pages.
 *
 * Strategy
 * ────────
 * 1. Land on `/` once per worker so we boot the SPA + React Router with the
 *    correct base path (BrowserRouter, basename = "/").
 * 2. Navigate to each subsequent route via `history.pushState` + a synthetic
 *    `popstate` so React Router handles it in-app. This avoids a full reload
 *    per page and exercises the same code path users hit when clicking
 *    internal links.
 * 3. Verify the route resolved correctly:
 *      a) `location.pathname` matches what we asked for
 *      b) Helmet has set the expected `<title>` substring
 *      c) An <h1> is in the DOM (catches blank "shell-only" renders)
 * 4. Stabilise (disable animations, wait for fonts + lazy images).
 * 5. Screenshot full page and diff against the committed baseline.
 *
 * Running
 * ───────
 *   1. npm run dev                            # terminal 1
 *   2. npx playwright install chromium        # one-time
 *   3. npx playwright test --update-snapshots # generate baselines
 *   4. npx playwright test                    # regression check on every PR
 */

interface PageSpec {
  /** Router path — must match a <Route> in src/App.tsx */
  path: string;
  /** Stable filename for the snapshot baseline */
  name: string;
  /** Case-insensitive substring expected in <title>. Anchors content correctness. */
  titleIncludes: string;
  /** Optional CSS selector to wait for. Defaults to `h1`. */
  readySelector?: string;
}

const PAGES: PageSpec[] = [
  { path: "/", name: "home", titleIncludes: "rehab" },
  { path: "/rehab-centers", name: "rehab-centers", titleIncludes: "rehab" },
  { path: "/treatment-types", name: "treatment-types", titleIncludes: "treatment" },
  { path: "/about", name: "about", titleIncludes: "about" },
  { path: "/how-it-works", name: "how-it-works", titleIncludes: "how" },
  { path: "/faq", name: "faq", titleIncludes: "faq" },
  { path: "/contact", name: "contact", titleIncludes: "contact" },
  { path: "/concierge", name: "concierge", titleIncludes: "concierge" },
  { path: "/insurance", name: "insurance", titleIncludes: "insurance" },
  { path: "/cost-estimator", name: "cost-estimator", titleIncludes: "cost" },
  { path: "/blog", name: "blog", titleIncludes: "blog" },
  { path: "/rehab-centers/california", name: "state-california", titleIncludes: "california" },
  { path: "/treatment-types/detox-programs", name: "tx-detox", titleIncludes: "detox" },
];

/**
 * Stabilise a page for screenshotting. Idempotent — safe to call repeatedly
 * across in-SPA navigations.
 */
async function stabilise(pw: Page) {
  await pw.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
      /* Hide the scrollbar so screenshot widths line up across browsers */
      ::-webkit-scrollbar { display: none !important; }
      html { scrollbar-width: none !important; }
    `,
  });
  await pw.evaluate(async () => {
    if ((document as any).fonts?.ready) await (document as any).fonts.ready;
  });
  // Trigger any in-view lazy-load and wait for the network to settle.
  await pw.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pw.waitForLoadState("networkidle");
  await pw.evaluate(() => window.scrollTo(0, 0));
  await pw.waitForTimeout(200);
}

/**
 * Drive React Router from inside the page so we navigate via the SPA's own
 * basename rather than triggering a full document reload.
 */
async function spaNavigate(pw: Page, path: string) {
  await pw.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

test.describe("Public pages — visual regression", () => {
  // Boot the SPA once per worker by landing on "/", then navigate
  // in-app for every other page in the same context.
  test.beforeEach(async ({ page: pw }) => {
    await pw.goto("/", { waitUntil: "domcontentloaded" });
    // Wait for React to mount (the root element gets children)
    await pw.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.childElementCount > 0;
    });
  });

  for (const spec of PAGES) {
    test(`${spec.name} (${spec.path})`, async ({ page: pw }, testInfo) => {
      // 1. Navigate via the in-app router (no full reload)
      if (spec.path !== "/") {
        await spaNavigate(pw, spec.path);
      }

      // 2. Verify the router actually resolved the path
      await expect
        .poll(() => pw.evaluate(() => window.location.pathname), {
          message: `Router did not navigate to ${spec.path}`,
          timeout: 5_000,
        })
        .toBe(spec.path);

      // 3. Verify the correct page mounted: title + h1
      await expect(pw).toHaveTitle(new RegExp(spec.titleIncludes, "i"), { timeout: 10_000 });

      const ready = pw.locator(spec.readySelector ?? "h1").first();
      await expect(ready, `expected ${spec.readySelector ?? "h1"} to render on ${spec.path}`)
        .toBeVisible({ timeout: 10_000 });

      // 4. Stabilise then screenshot
      await stabilise(pw);

      await expect(pw).toHaveScreenshot(`${spec.name}.png`, {
        fullPage: true,
        mask: [pw.locator("[data-volatile]")],
      });

      testInfo.annotations.push(
        { type: "viewport", description: testInfo.project.name },
        { type: "route", description: spec.path },
      );
    });
  }
});
