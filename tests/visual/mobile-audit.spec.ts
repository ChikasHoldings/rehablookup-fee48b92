import { test, expect, type Page } from "@playwright/test";

/**
 * Mobile responsiveness audit — programmatic checks.
 *
 * Sister spec to `public-pages.spec.ts` (visual regression). This one runs
 * DOM-level assertions instead of pixel diffs, so it catches the four most
 * common mobile-layout bugs without needing baseline screenshots:
 *
 *   1. Horizontal overflow         — anything causing the page to scroll
 *                                    sideways at 320 / 375 / 414.
 *   2. Image CLS risk              — <img> without explicit width+height
 *                                    or an aspect-ratio'd parent.
 *   3. iOS auto-zoom on inputs     — <input>/<select>/<textarea> with
 *                                    computed font-size < 16px.
 *   4. Sub-44px tap targets        — interactive elements with a hit-area
 *                                    smaller than the iOS HIG minimum.
 *
 * The same PAGES list lives in `public-pages.spec.ts`. Keep the two in sync
 * when you add or remove a public route worth auditing.
 *
 * Each failure surfaces an actionable line with the offending selector +
 * computed value so the fix is obvious from the test output alone.
 */

interface PageSpec {
  path: string;
  name: string;
  titleIncludes: string;
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
  { path: "/rehab-centers/california", name: "state-california", titleIncludes: "california" },
  { path: "/treatment-types/detox-programs", name: "tx-detox", titleIncludes: "detox" },
];

/**
 * Drive React Router from inside the page so we don't trigger a full
 * document reload between specs — matches the public-pages.spec.ts pattern.
 */
async function spaNavigate(pw: Page, path: string) {
  await pw.evaluate((p) => {
    window.history.pushState({}, "", p);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
}

async function stabilise(pw: Page) {
  await pw.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await pw.waitForLoadState("networkidle");
  await pw.evaluate(() => window.scrollTo(0, 0));
  await pw.waitForTimeout(150);
}

// Only run this suite at the mobile breakpoint — the same project config
// already covers 320 in playwright.config.ts. The skip below keeps tablet
// and desktop runs fast (they pass these checks trivially).
test.describe("Mobile responsiveness audit", () => {
  test.beforeEach(async ({ page: pw }, testInfo) => {
    // Suite is only meaningful at narrow viewports — skip the tablet and
    // desktop projects so they don't double-count noise.
    test.skip(
      !testInfo.project.name.startsWith("mobile"),
      "mobile-audit only runs at mobile-* viewports",
    );
    await pw.goto("/", { waitUntil: "domcontentloaded" });
    await pw.waitForFunction(() => {
      const root = document.getElementById("root");
      return !!root && root.childElementCount > 0;
    });
  });

  for (const spec of PAGES) {
    test(`${spec.name} — no horizontal overflow`, async ({ page: pw }) => {
      if (spec.path !== "/") await spaNavigate(pw, spec.path);
      await expect.poll(() => pw.evaluate(() => location.pathname)).toBe(spec.path);
      await expect(pw).toHaveTitle(new RegExp(spec.titleIncludes, "i"), { timeout: 10_000 });
      await expect(pw.locator("h1").first()).toBeVisible({ timeout: 10_000 });
      await stabilise(pw);

      // Check 1: document does not scroll horizontally.
      const overflow = await pw.evaluate(() => {
        const html = document.documentElement;
        const body = document.body;
        return {
          docScrollW: html.scrollWidth,
          docClientW: html.clientWidth,
          bodyScrollW: body.scrollWidth,
          viewportW: window.innerWidth,
        };
      });
      expect(
        overflow.docScrollW,
        `documentElement.scrollWidth (${overflow.docScrollW}) exceeds clientWidth (${overflow.docClientW}). Something is wider than the viewport.`,
      ).toBeLessThanOrEqual(overflow.docClientW + 1); // +1 for sub-pixel rounding

      // Check 2: locate the WORST offender so the fix is obvious.
      // Walks every element and records the highest right-edge that
      // extends past the viewport. We tolerate 1px of sub-pixel slop.
      const offender = await pw.evaluate((viewport) => {
        let worst: { selector: string; right: number; tag: string } | null = null;
        const all = document.querySelectorAll<HTMLElement>("body *");
        for (const el of Array.from(all)) {
          const rect = el.getBoundingClientRect();
          // Skip zero-sized and offscreen-on-purpose elements.
          if (rect.width === 0 || rect.height === 0) continue;
          if (rect.right <= viewport + 1) continue;
          // Skip elements deliberately hidden via overflow-clip ancestors
          // (e.g., translate-x-full mobile menu panel off-canvas).
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          // Skip the off-canvas mobile menu (translated to translate-x-full).
          if (el.closest('[class*="translate-x-full"]')) continue;
          // Build a short selector for the report.
          const id = el.id ? `#${el.id}` : "";
          const cls = el.className && typeof el.className === "string"
            ? "." + el.className.split(/\s+/).slice(0, 3).join(".")
            : "";
          const selector = `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 200);
          if (!worst || rect.right > worst.right) {
            worst = { selector, right: rect.right, tag: el.tagName.toLowerCase() };
          }
        }
        return worst;
      }, overflow.viewportW);

      expect(
        offender,
        offender
          ? `Worst overflow: <${offender.tag}> "${offender.selector}" extends to x=${offender.right}px (viewport=${overflow.viewportW}px)`
          : "no overflow",
      ).toBeNull();
    });

    test(`${spec.name} — images have intrinsic dimensions (CLS)`, async ({ page: pw }) => {
      if (spec.path !== "/") await spaNavigate(pw, spec.path);
      await expect.poll(() => pw.evaluate(() => location.pathname)).toBe(spec.path);
      await expect(pw.locator("h1").first()).toBeVisible({ timeout: 10_000 });
      await stabilise(pw);

      const badImages = await pw.evaluate(() => {
        const imgs = Array.from(document.querySelectorAll<HTMLImageElement>("img"));
        return imgs
          .filter((img) => {
            // Image is valid if it has width+height attrs, OR if its parent
            // reserves space via aspect-ratio / fixed height.
            const hasAttrs = img.hasAttribute("width") && img.hasAttribute("height");
            if (hasAttrs) return false;
            const parent = img.parentElement;
            if (!parent) return true;
            const cs = getComputedStyle(parent);
            const parentReserves =
              cs.aspectRatio !== "auto" ||
              (cs.height !== "auto" && parseFloat(cs.height) > 0);
            return !parentReserves;
          })
          .map((img) => ({
            src: img.currentSrc || img.src || "(empty)",
            alt: img.alt || "(no alt)",
          }))
          .slice(0, 5);
      });

      expect(
        badImages,
        `images without explicit dimensions or aspect-ratio parent (CLS risk): ${JSON.stringify(badImages, null, 2)}`,
      ).toEqual([]);
    });

    test(`${spec.name} — form inputs are >= 16px to avoid iOS zoom`, async ({ page: pw }) => {
      if (spec.path !== "/") await spaNavigate(pw, spec.path);
      await expect.poll(() => pw.evaluate(() => location.pathname)).toBe(spec.path);
      await expect(pw.locator("h1").first()).toBeVisible({ timeout: 10_000 });
      await stabilise(pw);

      const smallInputs = await pw.evaluate(() => {
        const inputs = Array.from(
          document.querySelectorAll<HTMLElement>("input, select, textarea"),
        );
        return inputs
          .filter((el) => {
            const cs = getComputedStyle(el);
            const size = parseFloat(cs.fontSize);
            return !isNaN(size) && size < 16;
          })
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            type: (el as HTMLInputElement).type || "",
            fontSize: getComputedStyle(el).fontSize,
            name: (el as HTMLInputElement).name || (el as HTMLInputElement).id || "(unnamed)",
          }))
          .slice(0, 5);
      });

      expect(
        smallInputs,
        `inputs with computed font-size < 16px (iOS will auto-zoom): ${JSON.stringify(smallInputs, null, 2)}`,
      ).toEqual([]);
    });

    test(`${spec.name} — interactive elements meet 44px tap target`, async ({ page: pw }) => {
      if (spec.path !== "/") await spaNavigate(pw, spec.path);
      await expect.poll(() => pw.evaluate(() => location.pathname)).toBe(spec.path);
      await expect(pw.locator("h1").first()).toBeVisible({ timeout: 10_000 });
      await stabilise(pw);

      const smallTaps = await pw.evaluate(() => {
        // Elements expected to be tappable. Excludes inline links inside
        // paragraphs (those follow line-height, not WCAG 2.5.5 tap-target).
        const sel = 'a:not(p a):not(li a):not(span a), button, [role="button"], input[type="button"], input[type="submit"]';
        const els = Array.from(document.querySelectorAll<HTMLElement>(sel));
        return els
          .filter((el) => {
            const cs = getComputedStyle(el);
            if (cs.display === "none" || cs.visibility === "hidden") return false;
            // Skip hidden/off-canvas
            if (el.closest('[class*="translate-x-full"]')) return false;
            if (el.closest('[aria-hidden="true"]')) return false;
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            return r.width < 40 || r.height < 40; // 4px slop under 44
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            const label = (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40);
            return {
              tag: el.tagName.toLowerCase(),
              size: `${Math.round(r.width)}x${Math.round(r.height)}`,
              label: label || "(no label)",
            };
          })
          .slice(0, 8);
      });

      expect(
        smallTaps,
        `tappable elements smaller than 44px (WCAG 2.5.5): ${JSON.stringify(smallTaps, null, 2)}`,
      ).toEqual([]);
    });
  }
});
