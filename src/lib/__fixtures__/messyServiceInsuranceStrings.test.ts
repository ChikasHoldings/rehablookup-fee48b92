/**
 * Word-boundary leak tests for the service / insurance regex matchers used
 * in src/lib/profileRelatedLinks.ts.
 *
 * These tests exercise the REGEX patterns directly (not the family-deduped
 * builder) so each fixture string is judged on its own merits — i.e. which
 * canonical slugs its regex set matches. The builder layers additional
 * "first-match-wins per service" + "one-per-family" dedupe on top; that's
 * tested separately in profileRelatedLinks tests. Here we lock down the
 * substring traps the *regex* must never fall into:
 *
 *   - \bmen\b  inside  'women' / 'acumen' / 'regimen' / 'omen'
 *   - \bveterans?\b  inside  'veterinary'
 *   - \bcigna\b  inside  'cignal'
 *   - \banthem\b  beating  BCBS on  'Anthem Blue Cross …'
 *   - \bmedicare\b  inside  'premedicare'
 */

import { describe, it, expect } from "vitest";
import {
  MESSY_SERVICE_FIXTURES,
  MESSY_INSURANCE_FIXTURES,
  type FixtureCase,
} from "./messyServiceInsuranceStrings";

// Mirror of the regex tables in src/lib/profileRelatedLinks.ts. Kept as a
// separate copy so a future refactor of the prod file (e.g. exporting the
// tables) doesn't silently change what these fixtures gate on. If the prod
// regexes drift, this mirror MUST be updated in lockstep.
const TREATMENT_PATTERNS: { match: RegExp; slug: string }[] = [
  { match: /\b(inpatient|residential)\b/i, slug: "residential-inpatient" },
  { match: /\b(outpatient|iop|php|partial hospitalization)\b/i, slug: "outpatient-programs" },
  { match: /\bdetox(ification)?\b/i, slug: "drug-addiction-treatment" },
  { match: /\b(alcohol|alcoholism)\b/i, slug: "alcohol-rehabilitation" },
  { match: /\bfentanyl\b/i, slug: "fentanyl-rehab" },
  { match: /\b(dual[- ]?diagnosis|co[- ]?occurring|mental[- ]health)\b/i, slug: "dual-diagnosis-treatment" },
  { match: /\b(holistic|yoga|meditation|mindfulness)\b/i, slug: "holistic-therapy" },
  { match: /\b(faith[- ]?based|christian|spiritual)\b/i, slug: "faith-based-rehab" },
  { match: /\b(luxury|executive)\b/i, slug: "luxury-rehab" },
  { match: /\b(free|low[- ]?cost|no[- ]?cost)\b/i, slug: "free-rehab" },
  { match: /\b(sober[- ]living|halfway)\b/i, slug: "sober-living" },
  { match: /\bveterans?\b/i, slug: "veterans-rehab" },
  { match: /\bwomen('s)?\b/i, slug: "womens-rehab" },
  { match: /\bmen('s)?\b/i, slug: "mens-rehab" },
];

// IMPORTANT: insurance ordering is significant. The BCBS entry must come
// BEFORE the standalone /anthem/ entry so 'Anthem Blue Cross …' resolves
// to BCBS via first-match-wins.
const INSURANCE_PATTERNS: { match: RegExp; slug: string }[] = [
  { match: /\b(blue\s*cross|bcbs|blue\s*shield|anthem\s*blue)\b/i, slug: "bcbs-treatment" },
  { match: /\baetna\b/i, slug: "aetna-rehab" },
  { match: /\bcigna\b/i, slug: "cigna-rehab" },
  { match: /\b(united[- ]?health(care)?|uhc)\b/i, slug: "united-healthcare-rehab" },
  { match: /\bhumana\b/i, slug: "humana-rehab" },
  { match: /\bkaiser\b/i, slug: "kaiser-rehab" },
  { match: /\bmedicare\b/i, slug: "medicare-rehab" },
  { match: /\bmedicaid\b/i, slug: "medicaid-rehab" },
  { match: /\banthem\b/i, slug: "anthem-rehab" },
];

/**
 * Returns every slug whose regex matches `input`, in pattern-table order.
 * Mirrors the regex layer ONLY — the builder's per-service first-match
 * + per-family dedupe lives elsewhere.
 */
function matchAllSlugs(
  input: string,
  patterns: { match: RegExp; slug: string }[],
): string[] {
  const out: string[] = [];
  for (const p of patterns) {
    if (p.match.test(input)) out.push(p.slug);
  }
  return out;
}

/**
 * For "first-match-wins" precedence assertions (the BCBS-vs-Anthem case
 * is the canonical example): returns the FIRST matching slug only.
 */
function firstMatchingSlug(
  input: string,
  patterns: { match: RegExp; slug: string }[],
): string | null {
  for (const p of patterns) if (p.match.test(input)) return p.slug;
  return null;
}

function assertFixture(
  fixture: FixtureCase,
  patterns: { match: RegExp; slug: string }[],
) {
  const allMatched = matchAllSlugs(fixture.input, patterns);

  // mustEmitSlugs: every required slug's regex must match this string.
  for (const slug of fixture.mustEmitSlugs) {
    expect(
      allMatched,
      `expected ${slug} regex to match input ${JSON.stringify(fixture.input)} — ${fixture.notes}`,
    ).toContain(slug);
  }

  // mustNotEmitSlugs: none of these regexes may match this string. This is
  // the leakage guard — the whole point of the fixture set.
  for (const slug of fixture.mustNotEmitSlugs) {
    expect(
      allMatched,
      `expected ${slug} regex NOT to leak on input ${JSON.stringify(fixture.input)} — ${fixture.notes}`,
    ).not.toContain(slug);
  }
}

describe("profileRelatedLinks regex — service_name fixtures (word-boundary leakage)", () => {
  for (const fixture of MESSY_SERVICE_FIXTURES) {
    const label = JSON.stringify(fixture.input).slice(0, 60);
    it(`service ${label}`, () => {
      assertFixture(fixture, TREATMENT_PATTERNS);
    });
  }
});

describe("profileRelatedLinks regex — insurance_name fixtures (word-boundary leakage)", () => {
  for (const fixture of MESSY_INSURANCE_FIXTURES) {
    const label = JSON.stringify(fixture.input).slice(0, 60);
    it(`insurance ${label}`, () => {
      assertFixture(fixture, INSURANCE_PATTERNS);
    });
  }
});

// Precedence guard: BCBS must beat the standalone /anthem/ regex on any
// "Anthem Blue …" string. This is enforced by table ordering, not the
// regex itself, so it gets its own dedicated assertion.
describe("profileRelatedLinks regex — insurance precedence", () => {
  it("'Anthem Blue Cross …' resolves to BCBS, never to anthem-rehab", () => {
    expect(
      firstMatchingSlug("Anthem Blue Cross Blue Shield of California", INSURANCE_PATTERNS),
    ).toBe("bcbs-treatment");
  });

  it("'Anthem' alone (no Blue) resolves to anthem-rehab", () => {
    expect(firstMatchingSlug("Anthem Inc.", INSURANCE_PATTERNS)).toBe(
      "anthem-rehab",
    );
  });
});
