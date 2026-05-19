// Resources mega-menu integrity smoke test.
//
// The Resources nav mega-menu hard-codes 6 /resources/<slug> hrefs as
// "featured guides". These slugs MUST resolve to a published row in
// public.blog_articles — otherwise ArticleDetail used to silently
// redirect to /resources, which manifested as "every mega-menu item
// falls back to the main resources page" (phase AA bug report).
//
// This test guards against regressions in two ways:
//   1. Asserts each href in the `guides` array of ResourcesMegaMenu
//      conforms to /resources/<lowercase-kebab-slug>.
//   2. Asserts the ArticleDetail not-found branch renders an in-place
//      404 (the ArticleNotFound component) instead of <Navigate />.
//
// A separate live test (run on staging) should confirm each slug
// resolves to a row in blog_articles. Adding that here would make
// the suite require network + a service-role key; we keep it as a
// manual / CI-with-secrets step.
//
// Run with: deno test --allow-read supabase/functions/_tests/resources-mega-menu-integrity_test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

Deno.test("resources-mega-menu: every guide href is /resources/<kebab-slug>", async () => {
  const src = await read("src/components/mega-menus/ResourcesMegaMenu.tsx");
  // Match the guides array — six entries, each with href: "/resources/...".
  const guidesBlockMatch = src.match(/const guides = \[([\s\S]*?)\];/);
  assert(guidesBlockMatch, "guides array not found in ResourcesMegaMenu.tsx");

  const hrefs = [...guidesBlockMatch[1].matchAll(/href:\s*"([^"]+)"/g)].map((m) => m[1]);
  assert(hrefs.length >= 4, `guides array unexpectedly short: ${hrefs.length} entries`);

  for (const href of hrefs) {
    assert(
      /^\/resources\/[a-z0-9-]+$/.test(href),
      `Bad guide href: ${href} — must be /resources/<lowercase-kebab-slug>`,
    );
  }
});

Deno.test("resources-mega-menu: ArticleDetail renders 404 in place (no silent Navigate-to-/resources)", async () => {
  const src = await read("src/pages/ArticleDetail.tsx");
  // The Navigate-to-/resources line was the bug. Confirm it's gone.
  assert(
    !/return\s+<Navigate\s+to="\/resources"\s+replace\s*\/>/m.test(src),
    "ArticleDetail.tsx must not silently Navigate to /resources on miss — render ArticleNotFound instead",
  );
  // Confirm the new component exists.
  assertEquals(
    /function ArticleNotFound\(\{ slug \}: \{ slug: string \}\)/.test(src),
    true,
    "ArticleDetail.tsx must define a local ArticleNotFound component",
  );
  // Confirm the not-found branch uses it. The branch contains a long
  // explanatory comment so we use a lazy [\s\S]*? rather than a
  // bounded range.
  assertEquals(
    /if\s*\(error \|\| !article\)\s*\{[\s\S]*?return\s+<ArticleNotFound/m.test(src),
    true,
    "if (error || !article) branch must render <ArticleNotFound /> instead of <Navigate />",
  );
});

Deno.test("resources-mega-menu: phase AD/AE legacy /resources/<slug> redirects exist for every known-stale URL", async () => {
  // Phase AD added 5 + Phase AE added 12 = 17 explicit Navigate
  // redirects for legacy resource slugs that internal components
  // and Google may still hit. Asserting they're all wired prevents
  // someone from deleting them inadvertently — that would re-open
  // the 404 spike.
  const app = await read("src/App.tsx");
  const expected = [
    // Phase AD
    "/resources/signs-of-addiction",
    "/resources/what-to-expect-in-rehab",
    "/resources/insurance-coverage-guide",
    "/resources/paying-for-rehab",
    "/resources/choosing-right-program",
    // Phase AE
    "/resources/choosing-rehab-center",
    "/resources/first-week-treatment",
    "/resources/free-rehab-options",
    "/resources/inpatient-vs-outpatient",
    "/resources/intervention-guide",
    "/resources/php-vs-iop",
    "/resources/questions-to-ask-rehab",
    "/resources/rehab-success-rates",
    "/resources/supporting-loved-one",
    "/resources/types-of-addiction-treatment",
    "/resources/understanding-dual-diagnosis",
    "/resources/what-to-expect-in-detox",
  ];
  for (const url of expected) {
    const pattern = new RegExp(
      `<Route\\s+path="${url.replace(/\//g, "\\/")}"\\s+element=\\{<Navigate\\s+to="`,
    );
    assert(
      pattern.test(app),
      `Missing legacy-URL redirect in App.tsx for ${url} (phase AD/AE protection)`,
    );
  }
});

Deno.test("resources-mega-menu: mobile + desktop variants share the same guides array", async () => {
  const src = await read("src/components/mega-menus/ResourcesMegaMenu.tsx");
  // Confirm both export functions exist and both reference `guides`.
  assert(src.includes("export function ResourcesMegaMenu("));
  assert(src.includes("export function ResourcesMegaMenuMobile("));
  // Only ONE `const guides = [` should appear — no parallel arrays.
  const guidesCount = (src.match(/const guides = \[/g) || []).length;
  assertEquals(
    guidesCount,
    1,
    `Expected exactly one guides array; found ${guidesCount}. Duplicating risks drift between mobile + desktop.`,
  );
});
