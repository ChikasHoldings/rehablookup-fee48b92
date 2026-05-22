import { test, expect } from "@playwright/test";

/**
 * Provider auth-guard regression suite.
 *
 * Acceptance criteria:
 *   1. Anonymous request to /provider/dashboard → SPA-redirect to
 *      /login?redirect=%2Fprovider%2Fdashboard  (no "unavailable" page).
 *   2. Anonymous request to any /provider/* route preserves the destination
 *      in the ?redirect= parameter.
 *   3. The page does NOT render h1 "This page is temporarily unavailable"
 *      for anonymous users on any provider route.
 *
 * Running:
 *   npm run dev          # terminal 1
 *   npx playwright test provider-auth-guard.spec.ts
 *
 * Note: logged-in-seeker scenario requires a real session cookie and is
 * verified manually / in integration tests. The anon redirect is the
 * business-critical case (anonymous traffic that was being dropped).
 */

const PROVIDER_ROUTES = [
  "/provider/dashboard",
  "/provider/listings",
  "/provider/inquiries",
  "/provider/reviews",
  "/provider/analytics",
  "/provider/billing",
  "/provider/settings",
  "/provider/notifications",
];

test.describe("Provider auth guard — anonymous user", () => {
  test.use({ storageState: { cookies: [], origins: [] } }); // ensure no session

  for (const route of PROVIDER_ROUTES) {
    test(`${route} redirects to /login?redirect=... and never shows "unavailable"`, async ({
      page,
    }) => {
      // Navigate and wait for the SPA to settle
      await page.goto(route, { waitUntil: "networkidle" });

      // The SPA-redirect must land on /login with the ?redirect param
      const url = new URL(page.url());
      expect(url.pathname, `pathname after redirect from ${route}`).toBe("/login");

      const redirectParam = url.searchParams.get("redirect");
      expect(
        redirectParam,
        `?redirect param must be set to the original path`,
      ).toBeTruthy();

      // The param must encode the requested provider path (no /login loop)
      expect(
        decodeURIComponent(redirectParam!),
        `?redirect must equal the original route, got: ${redirectParam}`,
      ).toBe(route);

      // Must NOT show the SEORouteBoundary error fallback
      const unavailableH1 = page.locator("h1", {
        hasText: "This page is temporarily unavailable",
      });
      await expect(
        unavailableH1,
        "SEORouteBoundary fallback must not render for anonymous users",
      ).not.toBeVisible();

      // Extra: must NOT show a bare empty page (login form should be present)
      // This guards against a silent white-screen redirect failure.
      const loginHeading = page.locator("h1, h2").filter({
        hasText: /sign in|log in|welcome back/i,
      });
      await expect(
        loginHeading.first(),
        "Login page heading must be visible after redirect",
      ).toBeVisible({ timeout: 5000 });
    });
  }

  test("/provider/dashboard does not redirect to /login?type=provider (old pattern)", async ({
    page,
  }) => {
    await page.goto("/provider/dashboard", { waitUntil: "networkidle" });

    const url = new URL(page.url());
    // Old pattern: /login?type=provider (no redirect param)
    const hasOldParam = url.searchParams.has("type") && !url.searchParams.has("redirect");
    expect(
      hasOldParam,
      "Must NOT use the old /login?type=provider pattern (drops destination)",
    ).toBe(false);
  });
});
