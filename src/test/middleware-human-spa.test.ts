/**
 * Regression guard for the "design switches to the SEO shell on reload" bug.
 *
 * CORE INVARIANT: a non-crawler request (any human browser, first load OR
 * refresh, in ANY circumstance) is ALWAYS routed to the SPA — never to a
 * prerendered .html shell. Only crawlers may receive the prerendered HTML.
 *
 * The /center/* and /resources/* handlers previously served the prerendered
 * .html to everyone (no isCrawler gate), which is what made humans see the
 * stripped-down SEO design on reload. This suite locks the invariant across
 * every route family so the bug cannot silently come back.
 */
import { describe, it, expect, vi } from "vitest";

// A prerendered path from every middleware route family. Defined via
// vi.hoisted so the hoisted vi.mock factory and the test body share it. Mock
// the ~2 MB real manifest with this small known set so the test is fast and
// deterministic.
const PRERENDERED = vi.hoisted(() => [
  "/center/test-facility", // facility profile (special handler)
  "/resources/test-article", // article (special handler)
  "/providers/resources/test-guide", // provider article (special handler)
  "/alcohol-rehab-centers", // root SEO hub (general handler)
  "/rehab-centers/california", // state page
  "/rehab-centers/california/los-angeles", // city page
  "/insurance/aetna-rehab", // insurance
  "/treatment-types/detox-programs/california", // treatment-type
  "/detox-centers/california", // detox
  "/rehab-marketing/california", // provider marketing
  "/drug-rehab-near-me/california/los-angeles", // near-me city
]);

vi.mock("../../prerender-manifest.js", () => ({ PRERENDERED_PATHS: PRERENDERED }));

import middleware from "../../middleware";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const SAFARI_IOS_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1";
const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function run(path: string, ua: string): Response {
  const req = new Request(`https://rehablookup.com${path}`, { headers: { "user-agent": ua } });
  return middleware(req) as Response;
}
function rewriteTarget(res: Response): string | null {
  const h = res.headers.get("x-middleware-rewrite");
  return h ? new URL(h).pathname : null;
}

describe("middleware invariant: humans never get the SEO shell", () => {
  describe.each([
    ["desktop Chrome", CHROME_UA],
    ["mobile Safari", SAFARI_IOS_UA],
  ])("human (%s)", (_label, ua) => {
    it.each(PRERENDERED)(
      "is routed to the SPA (not a .html shell) for prerendered %s",
      (path) => {
        const target = rewriteTarget(run(path, ua));
        expect(target).not.toMatch(/\.html$/);
        expect(target).toBe("/");
      },
    );

    it("is routed to the SPA for an UNAPPROVED /center/* slug (SPA renders CenterNotFound)", () => {
      expect(rewriteTarget(run("/center/does-not-exist", ua))).toBe("/");
    });

    it("is routed to the SPA for a non-prerendered dynamic slug", () => {
      expect(rewriteTarget(run("/rehab-centers/california/nowhere-city", ua))).toBe("/");
    });

    it("is routed to the SPA for an arbitrary non-prerendered path", () => {
      expect(rewriteTarget(run("/some/brand-new/page", ua))).toBe("/");
    });
  });

  describe("crawlers still get SEO output (so indexing is preserved)", () => {
    it.each(PRERENDERED)("Googlebot gets the prerendered .html for %s", (path) => {
      expect(rewriteTarget(run(path, GOOGLEBOT_UA))).toBe(`${path}.html`);
    });

    it("Googlebot gets a 404 for an unapproved /center/* slug", () => {
      const res = run("/center/does-not-exist", GOOGLEBOT_UA);
      expect(res.status).toBe(404);
      expect(rewriteTarget(res)).toBeNull();
    });

    it("Googlebot gets a 404 for a non-existent dynamic slug", () => {
      const res = run("/rehab-centers/california/nowhere-city", GOOGLEBOT_UA);
      expect(res.status).toBe(404);
    });

    it("Googlebot gets the SPA shell (/index.html) for a non-prerendered, non-soft path", () => {
      expect(rewriteTarget(run("/some/brand-new/page", GOOGLEBOT_UA))).toBe("/index.html");
    });
  });
});
