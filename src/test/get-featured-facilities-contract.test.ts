/**
 * Stage-3 B2 — get-featured-facilities entitlement contract.
 *
 * The helper's own behaviour is proved in stripe-featured-lookup.test.ts by
 * executing it. What THIS file protects is the wiring in the Edge function:
 * which source feeds which response field. Those are structural facts about
 * one file — Pro comes from the canonical projection, Featured comes from the
 * canonical Stripe lookup, and neither leaks into the other — so they are
 * asserted against the source, which is also what the deployed artifact is
 * built from.
 *
 * Comments are stripped before matching: the function documents the retired
 * v2.2.0 behaviour it replaced, and a guard that reads prose would either
 * fail on an accurate changelog or force the history to be deleted.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const FN = "supabase/functions/get-featured-facilities/index.ts";

/** Strip line and block comments so prose about retired behaviour cannot match. */
const stripComments = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const raw = readFileSync(join(ROOT, FN), "utf8");
const src = stripComments(raw);

describe("get-featured-facilities entitlement wiring", () => {
  it("declares version 2.3.0", () => {
    expect(raw).toMatch(/const\s+VERSION\s*=\s*["']2\.3\.0["']/);
  });

  it("21. raw facilities.featured=true does NOT grant Featured eligibility", () => {
    // The only place the raw boolean may appear in executable code is the
    // provenance log of rows it deliberately IGNORES.
    const pushes = [...src.matchAll(/eligibleFacilities\.push\(\{[\s\S]*?\}\)/g)].map((m) => m[0]);
    expect(pushes.length).toBeGreaterThan(0);
    for (const push of pushes) {
      expect(push).not.toMatch(/\bfacility\.featured\b/);
    }
    // No conditional grants eligibility from the raw column.
    expect(src).not.toMatch(/if\s*\([^)]*\bfacility\.featured\b[^)]*\)\s*\{[\s\S]{0,200}?eligibleFacilities\.push/);
    // The ignore-path is still present and still ignores.
    expect(src).toMatch(/unprovenLegacyFeatured/);
  });

  it("22. proFacilityIds comes only from public_facilities.is_pro === true", () => {
    const pushes = [...src.matchAll(/proFacilityIds\.push\([^)]*\)/g)].map((m) => m[0]);
    expect(pushes).toHaveLength(1);

    // The single push is guarded by the canonical fail-closed predicate.
    expect(src).toMatch(
      /row\.is_pro\s*===\s*true[\s\S]{0,80}?proFacilityIds\.push/,
    );
    // Sourced from the canonical projection, not from facility_subscriptions.
    expect(src).toMatch(/from\s*\(\s*["']public_facilities["']\s*\)[\s\S]{0,160}?is_pro/);
    expect(src).not.toMatch(/from\s*\(\s*["']facility_subscriptions["']\s*\)/);
    // Featured, in any representation, may never feed the Pro set.
    expect(src).not.toMatch(/proFacilityIds\.push\([^)]*\b(featured|has_featured|hasFeatured)\b/i);
  });

  it("23. professionalFacilityIds cannot independently elevate Pro", () => {
    // It is a copy of the canonical set, and nothing pushes into it.
    expect(src).toMatch(
      /const\s+professionalFacilityIds\s*:\s*string\[\]\s*=\s*\[\s*\.\.\.proFacilityIds\s*\]/,
    );
    expect(src).not.toMatch(/professionalFacilityIds\.push\(/);
    expect(src).not.toMatch(/professionalFacilityIds\s*=\s*\[\s*\]/);
  });

  it("24. a Pro-only facility never enters eligibleFacilities", () => {
    // Eligibility is gated on the canonical Featured lookup and nothing else.
    expect(src).toMatch(
      /emailFeaturedMap\.get\(profile\.email\)\s*!==\s*true[\s\S]{0,40}?continue/,
    );
    // No branch adds a facility on a Pro signal.
    expect(src).not.toMatch(/eligibleFacilities\.push\([\s\S]{0,300}?plan_type\s*:\s*['"]pro['"]/);
    expect(src).not.toMatch(/\bproFacilityIds\b[^\n]{0,80}eligibleFacilities\.push/);
  });

  it("25. a Featured-only facility can enter eligibleFacilities", () => {
    const push = src.match(/eligibleFacilities\.push\(\{[\s\S]*?\}\)/);
    expect(push).toBeTruthy();
    expect(push![0]).toMatch(/plan_type\s*:\s*['"]featured['"]/);
    // Reached without consulting Pro state at all.
    const gateToPush = src.match(
      /emailFeaturedMap\.get\(profile\.email\)[\s\S]{0,400}?eligibleFacilities\.push/,
    );
    expect(gateToPush).toBeTruthy();
    expect(gateToPush![0]).not.toMatch(/\bis_pro\b|\bproFacilityIds\b/);
  });

  it("26. Pro and Featured are computed independently, so Pro+Featured lands in both", () => {
    // Two separate producers: the DB projection loop and the Stripe lookup.
    // Neither reads the other's output as an input, and neither excludes it.
    expect(src).not.toMatch(/eligibleFacilities[\s\S]{0,120}?\bproFacilityIds\.includes\(/);
    expect(src).not.toMatch(/proFacilityIds[\s\S]{0,120}?\ballEligibleIds\.includes\(/);
    // Featured eligibility does not skip a facility for being Pro.
    expect(src).not.toMatch(/proFacilityIds\.includes\([^)]*\)\s*\)?\s*continue/);
  });

  it("27. paidFacilityIds is the union of Featured and canonical Pro only", () => {
    // Three assignments exist: two empty-array fallbacks (no Stripe key, and
    // the error path) plus the real union. Assert on the real one, and that
    // the fallbacks stay empty rather than acquiring a source of their own.
    const exprs = [...src.matchAll(/paidFacilityIds\s*:\s*(\[[\s\S]{0,240}?\])[,\n]/g)].map(
      (m) => m[1],
    );
    expect(exprs.length).toBeGreaterThan(0);

    const populated = exprs.filter((e) => e.trim() !== "[]");
    expect(populated).toHaveLength(1);
    const expr = populated[0];

    expect(expr).toMatch(/allEligibleIds/);
    expect(expr).toMatch(/proFacilityIds/);
    // No third, independently-derived entitlement source.
    expect(expr).not.toMatch(/professionalFacilityIds/);
    expect(expr).not.toMatch(/\bfacilit(y|ies)\.featured\b/);
  });

  it("keeps every legacy response key for external callers", () => {
    for (const key of [
      "featuredFacilityIds",
      "homepageFeaturedIds",
      "allEligibleIds",
      "professionalFacilityIds",
      "proFacilityIds",
      "paidFacilityIds",
    ]) {
      expect(src).toMatch(new RegExp(`\\b${key}\\b`));
    }
  });

  it("owns no local Stripe product-id list and no narrowing Stripe read", () => {
    expect(src).not.toMatch(/FEATURED_PRODUCT_IDS|PRO_PRODUCT_IDS/);
    expect(src).not.toMatch(/prod_[A-Za-z0-9]{6,}/);
    expect(src).not.toMatch(/customers\.list\(/);
    expect(src).not.toMatch(/subscriptions\.list\(/);
    expect(src).not.toMatch(/items\.data\[0\]/);
    expect(src).toMatch(/emailHasActiveFeaturedSubscription/);
  });
});
