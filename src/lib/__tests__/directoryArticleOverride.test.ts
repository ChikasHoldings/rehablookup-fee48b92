/**
 * Deterministic regression coverage for the directory-cutover article
 * override — the layer that keeps two legacy RehabLookup "Platform News"
 * articles directory-compatible while their production `blog_articles` rows
 * are still stale.
 *
 * These tests exist because the previous hotfix passed locally and failed on
 * Vercel. The local sandbox cannot reach production Supabase, so
 * `generate:resources-html` skipped and the committed mirrors were never
 * regenerated; Vercel reached the database, regenerated both pages from the
 * live rows, and reintroduced `href="/concierge/intake"`.
 *
 * So: NO NETWORK. The fixtures in ../__fixtures__/legacyPlatformArticles.ts
 * are verbatim copies of the live rows, and they are pushed through the exact
 * renderer `build:vercel` runs. If the override ever stops covering these
 * slugs, this file fails offline, in CI, before a deploy is attempted.
 */

import { describe, it, expect } from "vitest";
import {
  applyDirectoryArticleOverride,
  hasDirectoryArticleOverride,
  DIRECTORY_OVERRIDE_SLUGS,
  type DirectoryArticleContent,
} from "../directoryArticleOverride";
import {
  LIVE_APRIL_ANALYTICS_ARTICLE,
  LIVE_CEO_SCALING_ARTICLE,
  CONTROL_EDITORIAL_ARTICLE,
  type LegacyArticleFixture,
} from "../__fixtures__/legacyPlatformArticles";
// The real static generator used by `npm run generate:resources-html`. Imported
// directly so the test renders through the SAME code path Vercel does — a
// separate test-only renderer would be free to diverge from production.
import { renderArticleHtml } from "../../../scripts/generate-resources-html.mjs";

/**
 * RehabLookup-operated claims that must never survive to a public artifact.
 * Mirrors the phrase rules in scripts/check-directory-public-shell.mjs.
 * Deliberately phrase-specific — bare "placement" / "advisor" / "concierge"
 * are legal English and are asserted to survive in the control article below.
 */
const RETIRED_CLAIMS: Array<[string, RegExp]> = [
  ["retired route link", /href="\/(?:concierge|request-help|placement-help)(?=["/?#])/i],
  ["retired route (markdown/raw)", /\/concierge\/intake/i],
  ["The Concierge Placement Network", /\bthe concierge placement network\b/i],
  ["24/7 placement advisors", /24\/7\s+placement advisors?\b/i],
  ["24/7 advisor coverage", /24\/7\s+advisor coverage\b/i],
  ["24/7 advisor team", /24\/7\s+advisor team\b/i],
  ["free domestic placement support", /free domestic placement support/i],
  ["free domestic … placement service", /free domestic[^.<]{0,60}placement service/i],
  ["our international placement network", /\b(?:our|rehablookup'?s)\s+(?:international\s+)?placement network\b/i],
  ["operating a placement network", /\b(?:deepening|expanding|growing|scaling|launching)\s+(?:our|the)\s+placement network\b/i],
  ["our advisors are available 24/7", /\b(?:our|rehablookup'?s)\s+advisors?\s+(?:are|is)\s+(?:available|standing by|online)\s*(?:24\/7|around the clock)/i],
  ["connect with advisors", /\bconnect with (?:our |rehablookup'?s )?advisors?\b/i],
  ["reach out to our advisors", /\b(?:reach out to|talk to|speak (?:to|with)|call)\s+our\s+advisors?\b/i],
  ["we are not building a directory", /\bwe(?:'re| are)\s+not\s+building\s+a\s+directory\b/i],
];

/** Flatten a content array to plain text the way both renderers consume it. */
function contentText(content: DirectoryArticleContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((block) => {
      if (typeof block === "string") return block;
      return [block.content ?? "", ...(block.items ?? [])].join("\n");
    })
    .join("\n");
}

/** Everything a consumer could publish: metadata + body. */
function publishableText(article: Record<string, unknown>): string {
  return [
    article.title,
    article.meta_title,
    article.meta_description,
    article.excerpt,
    contentText(article.content as DirectoryArticleContent[] | undefined),
  ]
    .filter(Boolean)
    .join("\n");
}

const LEGACY_FIXTURES: Array<[string, LegacyArticleFixture]> = [
  ["april analytics milestone", LIVE_APRIL_ANALYTICS_ARTICLE],
  ["CEO scaling note", LIVE_CEO_SCALING_ARTICLE],
];

describe("legacy Platform News fixtures", () => {
  // Guard the guard: if these fixtures ever stop containing the retired copy,
  // every assertion below becomes vacuous and would pass against a no-op
  // override. Assert the failure mode is actually reproduced.
  it.each(LEGACY_FIXTURES)(
    "%s fixture still reproduces the live retired-product copy",
    (_name, fixture) => {
      const raw = publishableText(fixture as unknown as Record<string, unknown>);
      const matched = RETIRED_CLAIMS.filter(([, re]) => re.test(raw)).map(([n]) => n);
      expect(matched.length).toBeGreaterThan(0);
    },
  );

  it("april fixture carries the exact /concierge/intake CTA that broke the Vercel build", () => {
    expect(contentText(LIVE_APRIL_ANALYTICS_ARTICLE.content)).toContain("(/concierge/intake)");
  });

  it("CEO fixture carries the contradictory directory statement", () => {
    expect(contentText(LIVE_CEO_SCALING_ARTICLE.content)).toContain(
      "We are not building a directory.",
    );
  });
});

describe("applyDirectoryArticleOverride — slug targeting", () => {
  it("covers exactly the two known legacy slugs", () => {
    expect(DIRECTORY_OVERRIDE_SLUGS.sort()).toEqual(
      [
        "ceo-chiedu-kabakwu-scaling-rehablookup",
        "rehablookup-april-2026-analytics-milestone",
      ].sort(),
    );
  });

  it.each(DIRECTORY_OVERRIDE_SLUGS)("recognizes %s", (slug) => {
    expect(hasDirectoryArticleOverride(slug)).toBe(true);
  });

  it("matches case-insensitively (ArticleDetail lowercases, the generator does not)", () => {
    const upper = { ...LIVE_APRIL_ANALYTICS_ARTICLE, slug: "RehabLookup-April-2026-Analytics-Milestone" };
    expect(hasDirectoryArticleOverride(upper.slug)).toBe(true);
    expect(applyDirectoryArticleOverride(upper)).not.toBe(upper);
  });

  it("ignores unknown slugs, null and undefined", () => {
    expect(hasDirectoryArticleOverride("how-interventions-work")).toBe(false);
    expect(hasDirectoryArticleOverride(null)).toBe(false);
    expect(hasDirectoryArticleOverride(undefined)).toBe(false);
    expect(applyDirectoryArticleOverride(null)).toBeNull();
    expect(applyDirectoryArticleOverride(undefined)).toBeUndefined();
  });
});

describe("applyDirectoryArticleOverride — legacy articles are rewritten", () => {
  it.each(LEGACY_FIXTURES)("%s emits no retired RehabLookup claim", (_name, fixture) => {
    const text = publishableText(
      applyDirectoryArticleOverride(fixture) as unknown as Record<string, unknown>,
    );
    for (const [name, re] of RETIRED_CLAIMS) {
      expect(re.test(text), `retired claim survived the override: ${name}`).toBe(false);
    }
  });

  it("replaces the /concierge/intake CTA with a directory CTA", () => {
    const text = contentText(
      applyDirectoryArticleOverride(LIVE_APRIL_ANALYTICS_ARTICLE)!
        .content as DirectoryArticleContent[],
    );
    expect(text).not.toContain("/concierge");
    expect(text).toContain("[search treatment centers](/search-results)");
  });

  it("drops the 24/7 advisor claim from the april CTA", () => {
    const text = contentText(
      applyDirectoryArticleOverride(LIVE_APRIL_ANALYTICS_ARTICLE)!
        .content as DirectoryArticleContent[],
    );
    expect(text).not.toMatch(/advisors? (?:are|is) available/i);
    expect(text).not.toMatch(/24\/7/);
  });

  it("preserves the april article's legitimate historical facts", () => {
    const overridden = applyDirectoryArticleOverride(LIVE_APRIL_ANALYTICS_ARTICLE)!;
    const text = contentText(overridden.content as DirectoryArticleContent[]);
    // Title and the already-clean metadata pass straight through.
    expect(overridden.title).toBe(LIVE_APRIL_ANALYTICS_ARTICLE.title);
    expect(overridden.meta_description).toBe(LIVE_APRIL_ANALYTICS_ARTICLE.meta_description);
    expect(overridden.excerpt).toBe(LIVE_APRIL_ANALYTICS_ARTICLE.excerpt);
    // The analytics themselves are facts and must survive verbatim.
    for (const fact of [
      "**65,000 total users**",
      "**279,000 tracked events**",
      "1,520%",
      "**1,002 active users in the last 30 minutes**",
      "SEO-first content engine",
    ]) {
      expect(text).toContain(fact);
    }
  });

  it("rewrites the CEO article's directory-contradicting quote", () => {
    const text = contentText(
      applyDirectoryArticleOverride(LIVE_CEO_SCALING_ARTICLE)!
        .content as DirectoryArticleContent[],
    );
    expect(text).not.toContain("We are not building a directory");
    expect(text).toMatch(/building the directory families wish existed/i);
  });

  it("rewrites the CEO article's stale meta description", () => {
    const overridden = applyDirectoryArticleOverride(LIVE_CEO_SCALING_ARTICLE)!;
    const meta = String(overridden.meta_description);
    expect(meta).not.toBe(LIVE_CEO_SCALING_ARTICLE.meta_description);
    for (const banned of ["placement network", "advisor team", "concierge", "placement service"]) {
      expect(meta.toLowerCase()).not.toContain(banned);
    }
    expect(meta).toMatch(/directory/i);
    // Must still fit the 160-char meta budget the generator truncates at.
    expect(meta.length).toBeLessThanOrEqual(160);
  });

  it("preserves the CEO article's legitimate subject matter", () => {
    const text = contentText(
      applyDirectoryArticleOverride(LIVE_CEO_SCALING_ARTICLE)!
        .content as DirectoryArticleContent[],
    );
    for (const kept of [
      "Chiedu Kabakwu",
      "Verified provider network",
      "documented verification process",
      "SEO and content infrastructure",
      "Engineering reliability",
    ]) {
      expect(text).toContain(kept);
    }
  });
});

describe("applyDirectoryArticleOverride — normal articles are untouched", () => {
  it("returns the same object reference for an unrelated article", () => {
    expect(applyDirectoryArticleOverride(CONTROL_EDITORIAL_ARTICLE)).toBe(
      CONTROL_EDITORIAL_ARTICLE,
    );
  });

  it("does not sanitize legitimate third-party placement/advisor/concierge language", () => {
    const text = publishableText(
      applyDirectoryArticleOverride(CONTROL_EDITORIAL_ARTICLE) as unknown as Record<
        string,
        unknown
      >,
    );
    // These are external/clinical uses — an interventionist, a state program,
    // an EAP, and a facility amenity. A keyword sanitizer would wreck them.
    expect(text).toContain("handles treatment placement");
    expect(text).toContain("state placement programs");
    expect(text).toContain("EAP advisor");
    expect(text).toContain("24/7 concierge services as part of the amenity package");
  });
});

describe("static generator (crawler path) applies the override", () => {
  it.each(LEGACY_FIXTURES)(
    "%s renders no retired claim even from the raw live row",
    (_name, fixture) => {
      // `fixture` is the UNMODIFIED live row — exactly what Vercel receives
      // from Supabase. This is the reproduction of the failed build.
      const html = renderArticleHtml(fixture);
      for (const [name, re] of RETIRED_CLAIMS) {
        expect(re.test(html), `retired claim reached the static mirror: ${name}`).toBe(false);
      }
    },
  );

  it("emits a directory CTA in place of the retired intake link", () => {
    const html = renderArticleHtml(LIVE_APRIL_ANALYTICS_ARTICLE);
    expect(html).toContain('<a href="/search-results">search treatment centers</a>');
    expect(html).not.toContain("/concierge");
  });

  it("carries the override into meta tags and JSON-LD, not just the body", () => {
    const html = renderArticleHtml(LIVE_CEO_SCALING_ARTICLE);
    const head = html.slice(0, html.indexOf("<body>"));
    expect(head).not.toMatch(/placement network|advisor team|concierge/i);
    // og:description / twitter:description / meta description all derive from
    // the overridden meta_description.
    expect(head).toContain("verified providers, transparent facility data");
  });

  it("leaves an unrelated article's content intact through the renderer", () => {
    const html = renderArticleHtml(CONTROL_EDITORIAL_ARTICLE);
    expect(html).toContain("handles treatment placement");
    expect(html).toContain("24/7 concierge services");
    // …while still emitting no link to a retired route.
    expect(html).not.toMatch(/href="\/concierge/);
  });
});

describe("static and React consumers cannot drift", () => {
  it.each(LEGACY_FIXTURES)(
    "%s renders identically from the raw row and the pre-overridden row",
    (_name, fixture) => {
      // The React page applies `applyDirectoryArticleOverride` at the data
      // boundary; the generator applies it inside `renderArticleHtml`. Both
      // must land on the same article object — so rendering a row that was
      // already overridden must be byte-identical to rendering the raw row.
      const fromRaw = renderArticleHtml(fixture);
      const fromReactShapedRow = renderArticleHtml(applyDirectoryArticleOverride(fixture));
      expect(fromReactShapedRow).toBe(fromRaw);
    },
  );

  it.each(LEGACY_FIXTURES)("%s override is idempotent", (_name, fixture) => {
    const once = applyDirectoryArticleOverride(fixture);
    const twice = applyDirectoryArticleOverride(once);
    expect(twice).toEqual(once);
  });

  it("gives the React path the same body text the crawler receives", () => {
    // Every text node the React renderer would print, checked against the
    // static HTML the crawler gets.
    for (const [, fixture] of LEGACY_FIXTURES) {
      const reactArticle = applyDirectoryArticleOverride(fixture)!;
      const html = renderArticleHtml(fixture);
      const blocks = reactArticle.content as DirectoryArticleContent[];
      for (const block of blocks) {
        const raw = typeof block === "string" ? block : (block.content ?? "");
        // Strip Markdown so the comparison works against rendered HTML.
        const plain = raw
          .replace(/^#{2,3}\s+/, "")
          .replace(/\*\*([^*]+)\*\*/g, "$1")
          .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        if (plain.length < 40) continue;
        const needle = plain.slice(0, 40).replace(/&/g, "&amp;");
        expect(html, `React block missing from static mirror: ${needle}`).toContain(needle);
      }
    }
  });
});
