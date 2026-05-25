/**
 * Regression guard for the "design switches to the SEO shell on reload" bug.
 *
 * CORE INVARIANT: a non-crawler request (any human browser, first load OR
 * refresh) is ALWAYS rewritten to the SPA — never to a prerendered .html
 * shell. Only crawlers may receive the prerendered HTML. The /center/* and
 * /resources/* handlers previously served the shell to everyone (no isCrawler
 * gate), which is what made humans see the stripped-down SEO design on reload.
 */
import { describe, it, expect, vi } from "vitest";

// Mock the ~2 MB prerender manifest with a tiny known set so the test is fast
// and independent of which real pages happen to be prerendered.
vi.mock("../../prerender-manifest.js", () => ({
  PRERENDERED_PATHS: [
    "/center/test-facility",
    "/resources/test-article",
    "/alcohol-rehab-centers",
  ],
}));

import middleware from "../../middleware";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GOOGLEBOT_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

function run(path: string, ua: string): Response {
  const req = new Request(`https://rehablookup.com${path}`, {
    headers: { "user-agent": ua },
  });
  return middleware(req) as Response;
}

function rewriteTarget(res: Response): string | null {
  const h = res.headers.get("x-middleware-rewrite");
  return h ? new URL(h).pathname : null;
}

describe("middleware: humans always get the SPA, never the SEO shell", () => {
  const prerenderedHumanPaths = [
    "/center/test-facility",
    "/resources/test-article",
    "/alcohol-rehab-centers",
  ];

  it.each(prerenderedHumanPaths)(
    "human request to prerendered %s is rewritten to the SPA, not a .html shell",
    (path) => {
      const target = rewriteTarget(run(path, CHROME_UA));
      expect(target).not.toMatch(/\.html$/);
      expect(target).toBe("/");
    },
  );

  it("human request to an unapproved /center/* slug still routes to the SPA", () => {
    // SPA renders CenterNotFound (noindex) rather than the SEO shell.
    expect(rewriteTarget(run("/center/nonexistent-facility", CHROME_UA))).toBe("/");
  });

  it("crawler gets the prerendered .html for an approved facility", () => {
    expect(rewriteTarget(run("/center/test-facility", GOOGLEBOT_UA))).toBe(
      "/center/test-facility.html",
    );
  });

  it("crawler gets the prerendered .html for a published article", () => {
    expect(rewriteTarget(run("/resources/test-article", GOOGLEBOT_UA))).toBe(
      "/resources/test-article.html",
    );
  });

  it("crawler gets the prerendered .html for a general SEO page", () => {
    expect(rewriteTarget(run("/alcohol-rehab-centers", GOOGLEBOT_UA))).toBe(
      "/alcohol-rehab-centers.html",
    );
  });
});
