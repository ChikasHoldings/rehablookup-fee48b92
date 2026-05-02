/**
 * Word-boundary leak tests for the service / insurance regex matchers in
 * src/lib/profileRelatedLinks.ts.
 *
 * Drives the messy fixtures through the real builder and asserts both
 * positive matches (`mustEmitSlugs`) and — most importantly — negative
 * matches (`mustNotEmitSlugs`) so that:
 *
 *   - \bmen\b never leaks into 'women' / 'acumen' / 'regimen' / 'omen'
 *   - \bveterans?\b never leaks into 'veterinary'
 *   - \bcigna\b never leaks into 'cignal'
 *   - \banthem\b never wins over BCBS on 'Anthem Blue Cross …'
 *   - \bmedicare\b never matches 'premedicare'
 *
 * These are the exact substring traps real facility CMS data has produced.
 */

import { describe, it, expect } from "vitest";
import { buildProfileRelatedLinks } from "../profileRelatedLinks";
import {
  MESSY_SERVICE_FIXTURES,
  MESSY_INSURANCE_FIXTURES,
  type FixtureCase,
} from "./messyServiceInsuranceStrings";

/**
 * Pull the slug back out of a generated href.
 *   /treatment-types/<slug>/<state>      → <slug>
 *   /insurance/<slug>                     → <slug>
 * Anything else (location hubs etc.) is ignored — we only assert on
 * regex-driven slug emission here.
 */
function slugsFromLinks(links: { href: string }[]): string[] {
  const out: string[] = [];
  for (const { href } of links) {
    const parts = href.split("/").filter(Boolean);
    if (parts[0] === "treatment-types" && parts[1]) out.push(parts[1]);
    else if (parts[0] === "insurance" && parts[1]) out.push(parts[1]);
  }
  return out;
}

function runService(fixture: FixtureCase) {
  const { treatmentLinks } = buildProfileRelatedLinks({
    city: "Phoenix",
    state: "Arizona",
    services: [{ service_name: fixture.input }],
    insurance: [],
  });
  return slugsFromLinks(treatmentLinks);
}

function runInsurance(fixture: FixtureCase) {
  const { insuranceLinks } = buildProfileRelatedLinks({
    city: "Phoenix",
    state: "Arizona",
    services: [],
    insurance: [{ insurance_name: fixture.input }],
  });
  return slugsFromLinks(insuranceLinks);
}

describe("profileRelatedLinks — service_name word-boundary fixtures", () => {
  for (const fixture of MESSY_SERVICE_FIXTURES) {
    const label = JSON.stringify(fixture.input).slice(0, 60);
    it(`service ${label} — ${fixture.notes.slice(0, 80)}`, () => {
      const emitted = runService(fixture);

      for (const slug of fixture.mustEmitSlugs) {
        expect(
          emitted,
          `expected ${slug} to be emitted for input ${label}`,
        ).toContain(slug);
      }
      for (const slug of fixture.mustNotEmitSlugs) {
        expect(
          emitted,
          `expected ${slug} NOT to leak for input ${label}`,
        ).not.toContain(slug);
      }
    });
  }
});

describe("profileRelatedLinks — insurance_name word-boundary fixtures", () => {
  for (const fixture of MESSY_INSURANCE_FIXTURES) {
    const label = JSON.stringify(fixture.input).slice(0, 60);
    it(`insurance ${label} — ${fixture.notes.slice(0, 80)}`, () => {
      const emitted = runInsurance(fixture);

      for (const slug of fixture.mustEmitSlugs) {
        expect(
          emitted,
          `expected ${slug} to be emitted for input ${label}`,
        ).toContain(slug);
      }
      for (const slug of fixture.mustNotEmitSlugs) {
        expect(
          emitted,
          `expected ${slug} NOT to leak for input ${label}`,
        ).not.toContain(slug);
      }
    });
  }
});
