import { test, expect, type Page } from "@playwright/test";

/**
 * Canonical URL regression suite.
 *
 * What this verifies
 * ──────────────────
 * For every key public route, at every viewport (320 / 768 / 1024),
 * the page MUST emit:
 *   1. Exactly one  <link rel="canonical" href="...">
 *   2. An og:url    <meta property="og:url" content="...">
 *   3. Both URLs MUST equal the expected absolute URL on the production
 *      origin (https://rehablookup.com{path}) — no trailing slash, no
 *      query string, no hash.
 *   4. The canonical MUST be identical across all three viewports for
 *      the same route (responsive layout never changes the canonical).
 *
 * Why
 * ───
 * Canonical drift between viewports or between og:url / link[rel=canonical]
 * causes Google to split crawl signals or pick the wrong URL as primary,
 * silently capping organic traffic. This guard makes any drift fail CI.
 *
 * Running
 * ───────
 *   1. npm run dev                   # terminal 1
 *   2. npx playwright test canonical-urls.spec.ts
 */

const PROD_ORIGIN = "https://rehablookup.com";

interface RouteSpec {
  /** Router path — must match a <Route> in src/App.tsx */
  path: string;
  /** Stable name for test output */
  name: string;
}

const ROUTES: RouteSpec[] = [
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

/** Build the URL the canonical *must* match for a given route. */
function expectedCanonical(path: string): string {
  // Root stays "/"; everything else is bare (no trailing slash, no query/hash).
  const cleaned = path === "/" ? "/" : path.replace(/\/+$/, "");
  return `${PROD_ORIGIN}${cleaned}`;
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

/**
 * Read the canonical href + og:url from the DOM. Returns counts so the test
 * can assert there is exactly one of each (Helmet duplicates are a real
 * regression we have shipped before).
 */
async function readCanonicalState(pw: Page) {
  return pw.evaluate(() => {
    const links = Array.from(
      document.head.querySelectorAll('link[rel="canonical"]'),
    ) as HTMLLinkElement[];
    const ogs = Array.from(
      document.head.querySelectorAll('meta[property="og:url"]'),
    ) as HTMLMetaElement[];
    return {
      canonicalCount: links.length,
      canonicalHref: links[0]?.href ?? null,
      ogUrlCount: ogs.length,
      ogUrl: ogs[0]?.content ?? null,
    };
  });
}

/**
 * Wait until Helmet has flushed a canonical tag for the current route.
 * Helmet updates async after navigation; without this we race the DOM.
 */
async function waitForCanonical(pw: Page, expected: string) {
  await expect
    .poll(
      async () => {
        const link = await pw
          .locator('link[rel="canonical"]')
          .first()
          .getAttribute("href")
          .catch(() => null);
        return link;
      },
      { message: `Canonical never resolved to ${expected}`, timeout: 10_000 },
    )
    .toBe(expected);
}

test.describe("Canonical URLs — correctness & cross-viewport consistency", () => {
  // Boot the SPA once per worker on "/", then navigate in-app for each route.
  test.beforeEach(async ({ page: pw }) => {
    await pw.goto("/", { waitUntil: "domcontentloaded" });
    await pw.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.childElementCount > 0;
    });
  });

  for (const route of ROUTES) {
    test(`${route.name} (${route.path}) emits the correct canonical`, async ({
      page: pw,
    }, testInfo) => {
      const expected = expectedCanonical(route.path);

      if (route.path !== "/") {
        await spaNavigate(pw, route.path);
      }

      // Verify the router actually resolved the requested path.
      await expect
        .poll(() => pw.evaluate(() => window.location.pathname), {
          message: `Router did not navigate to ${route.path}`,
          timeout: 5_000,
        })
        .toBe(route.path);

      await waitForCanonical(pw, expected);

      const state = await readCanonicalState(pw);

      // 1. Exactly one canonical tag (catches Helmet duplicates).
      expect(
        state.canonicalCount,
        `Expected exactly 1 <link rel="canonical">, got ${state.canonicalCount}`,
      ).toBe(1);

      // 2. Exactly one og:url tag.
      expect(
        state.ogUrlCount,
        `Expected exactly 1 <meta property="og:url">, got ${state.ogUrlCount}`,
      ).toBe(1);

      // 3. Both URLs match the expected absolute URL on the prod origin.
      expect(state.canonicalHref).toBe(expected);
      expect(state.ogUrl).toBe(expected);

      // 4. URL hygiene — no query, no hash, no trailing slash (except "/").
      expect(state.canonicalHref!).not.toMatch(/[?#]/);
      if (route.path !== "/") {
        expect(state.canonicalHref!.endsWith("/")).toBe(false);
      }

      testInfo.annotations.push(
        { type: "viewport", description: testInfo.project.name },
        { type: "route", description: route.path },
        { type: "canonical", description: state.canonicalHref ?? "(none)" },
      );
    });
  }

  /**
   * Cross-viewport consistency check.
   *
   * Playwright runs each project (320 / 768 / 1024) as a separate worker, so
   * we can't compare across them in a single test. Instead, every per-route
   * test above asserts the canonical equals `expectedCanonical(path)`, which
   * is a constant string. If any viewport produces a different value, that
   * viewport's test fails — proving cross-viewport consistency by construction.
   *
   * This block adds an explicit in-test consistency check for the *current*
   * viewport: navigate to a route, then resize within the same page context
   * and confirm the canonical does not change.
   */
  test("canonical is stable when viewport changes mid-session", async ({
    page: pw,
  }) => {
    const path = "/rehab-centers/california";
    const expected = expectedCanonical(path);

    await spaNavigate(pw, path);
    await waitForCanonical(pw, expected);
    const initial = await readCanonicalState(pw);
    expect(initial.canonicalHref).toBe(expected);

    // Resize through every supported breakpoint and re-read.
    for (const size of [
      { width: 320, height: 568 },
      { width: 768, height: 1024 },
      { width: 1024, height: 768 },
      { width: 1440, height: 900 },
    ]) {
      await pw.setViewportSize(size);
      // Give Helmet a tick — though canonical should never change on resize.
      await pw.waitForTimeout(150);
      const after = await readCanonicalState(pw);
      expect(
        after.canonicalHref,
        `Canonical changed at ${size.width}x${size.height}: was ${initial.canonicalHref}, now ${after.canonicalHref}`,
      ).toBe(initial.canonicalHref);
      expect(after.canonicalCount).toBe(1);
      expect(after.ogUrl).toBe(initial.ogUrl);
    }
  });
});
