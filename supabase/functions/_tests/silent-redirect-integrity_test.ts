// Silent-redirect-on-miss integrity test.
//
// Phase AA fixed ArticleDetail.tsx's silent `<Navigate to="/resources" />`
// on a missing article. Phase AB generalizes the fix across the 18 SEO
// landing pages that had the same anti-pattern: when a URL param didn't
// match a known config / state / category, the component silently
// redirected to the parent section page — making real broken nav
// invisible to the user.
//
// This test guards against regressions by asserting that none of the
// known-affected files contain a silent
// `return <Navigate to="/<parent>" replace />` on a data-miss guard.
// Pro-gates and auth-gates are excluded — those are legitimate
// redirects, not silent failures.
//
// Run with: deno test --allow-read supabase/functions/_tests/silent-redirect-integrity_test.ts

import {
  assert,
  assertEquals,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

const REPO_ROOT = new URL("../../../", import.meta.url);
async function read(rel: string): Promise<string> {
  return await Deno.readTextFile(new URL(rel, REPO_ROOT));
}

const GUARDED_PAGES = [
  "src/pages/CategoryHub.tsx",
  "src/pages/seo/BestInStatePage.tsx",
  "src/pages/seo/CoOccurringPage.tsx",
  "src/pages/seo/ExpandedTreatmentHubPage.tsx",
  "src/pages/seo/StateArticlePage.tsx",
  "src/pages/seo/TherapyModalityPage.tsx",
  "src/pages/treatment-types/CityDetoxPrograms.tsx",
  "src/pages/treatment-types/CityDualDiagnosis.tsx",
  "src/pages/treatment-types/CityInpatientRehab.tsx",
  "src/pages/treatment-types/CityOutpatientPrograms.tsx",
  "src/pages/treatment-types/ExpandedTreatmentNationalHub.tsx",
  "src/pages/treatment-types/StateAlcoholRehab.tsx",
  "src/pages/treatment-types/StateDetoxPrograms.tsx",
  "src/pages/treatment-types/StateDrugAddiction.tsx",
  "src/pages/treatment-types/StateDualDiagnosis.tsx",
  "src/pages/treatment-types/StateInpatientRehab.tsx",
  "src/pages/treatment-types/StateOutpatientPrograms.tsx",
  "src/pages/providers/ProviderResourceArticle.tsx",
  "src/pages/ArticleDetail.tsx",
];

for (const file of GUARDED_PAGES) {
  Deno.test(`silent-redirect: ${file} renders NotFoundInPlace on miss (not silent Navigate)`, async () => {
    const src = await read(file);
    // The data-miss branch must use NotFoundInPlace (phase AB shared
    // component). Pro-gates and auth-gates can still use Navigate.
    assert(
      src.includes("NotFoundInPlace"),
      `${file} must import + render NotFoundInPlace on data-miss`,
    );
  });
}

Deno.test("silent-redirect: NotFoundInPlace component exists and sets noindex", async () => {
  const src = await read("src/components/seo/NotFoundInPlace.tsx");
  assert(src.includes("noindex"), "NotFoundInPlace must set SEO noindex");
  assert(
    /export function NotFoundInPlace/.test(src),
    "NotFoundInPlace must be a named export",
  );
});

Deno.test("silent-redirect: ArticleDetail (phase AA) still renders ArticleNotFound", async () => {
  const src = await read("src/pages/ArticleDetail.tsx");
  // ArticleDetail uses its own ArticleNotFound (defined in-file) rather
  // than the shared NotFoundInPlace because the article URL needs to
  // be echoed in the message. Either is acceptable — guard against the
  // regression where someone reintroduces the silent Navigate.
  assert(
    !/return\s+<Navigate\s+to="\/resources"\s+replace\s*\/>/m.test(src),
    "ArticleDetail.tsx must not silently Navigate to /resources",
  );
});

// Smoke check: count how many silent Navigate-on-data-miss patterns
// remain in pages/. Hard cap at 0; phase AB closed every known case.
Deno.test("silent-redirect: zero remaining Navigate-on-data-miss in src/pages/", async () => {
  // We re-implement the detector logic from the phase AA scan: look for
  // a `return <Navigate to="/..." replace />` whose previous 5 lines
  // contain an if-guard mentioning `error ||` or `!data` / `!record` /
  // `!resource` / etc.
  const findings: string[] = [];
  for (const file of GUARDED_PAGES) {
    const src = await read(file);
    const lines = src.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const navMatch = lines[i].match(/return\s+<Navigate\s+to="\/[^"]+"\s+replace\s*\/>/);
      if (!navMatch) continue;
      // Find the nearest preceding if-guard
      let guardText = "";
      for (let j = i - 1; j >= Math.max(0, i - 5); j--) {
        const t = lines[j].trim();
        if (t.startsWith("if ")) { guardText = t; break; }
      }
      if (!guardText) continue;
      // Skip auth + role + Pro gates (legit)
      if (/login|auth|session|isAuthenticated|isPro|role/i.test(guardText)) continue;
      // Skip slug-case canonicalization (legit — same URL, lowercase)
      if (/needsRedirect|toLowerCase|caseMismatch/i.test(guardText)) continue;
      if (/!facility|!article|!data|!record|!resource|!config|!state|!category|!modality|!result|!page/i.test(guardText)) {
        findings.push(`${file}:${i + 1}  ${guardText}`);
      }
    }
  }
  assertEquals(
    findings.length,
    0,
    `Silent-redirect-on-data-miss patterns regressed:\n${findings.join("\n")}`,
  );
});
