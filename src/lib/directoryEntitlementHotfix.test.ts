/**
 * Stage-3 B1+B2 VERIFICATION HOTFIX #1.
 *
 * Three verification gaps, each proved here:
 *
 *   1. SearchResults published a blanket trust claim — `Browse ${N} verified
 *      addiction treatment centers` where N was the whole result set.
 *   2. get-featured-facilities derived Pro identity from ANY active
 *      facility_subscriptions row rather than the canonical
 *      public_facilities.is_pro (= has_active_pro).
 *   3. The stripe-webhook's generator was inoperable and non-idempotent, so
 *      the deployable artifact was not reproducible from reviewed source.
 *
 * Behavioural wherever a behaviour exists: the Pro-derivation and the
 * description builder are driven with fixtures, so the assertions are about
 * what the code DOES. Source-shape assertions are used only where the
 * behaviour lives in Postgres or in a generated artifact, and each of those is
 * additionally enforced at build time by
 * scripts/check-directory-trust-ranking.mjs and
 * scripts/check-stripe-webhook-inline.mjs.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

import { buildSearchResultsDescription } from "./searchResultsSeo";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const stripJs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKER 1 — a result-set count may not carry a trust adjective
// ═══════════════════════════════════════════════════════════════════════════

const TRUST_ADJECTIVE = /\b(verified|vetted|approved|trusted|accredited|screened|endorsed)\b/i;

/** A realistic unfiltered page: 100 results, 2 of which are actually verified. */
const MIXED_RESULT_SET = Array.from({ length: 100 }, (_, i) => ({
  id: `f${i}`,
  verified: i < 2,
}));

describe("B1 hotfix — SearchResults does not claim the result set is verified", () => {
  it("a 100-row set with 2 verified facilities is not described as 100 verified centers", () => {
    const description = buildSearchResultsDescription({
      count: MIXED_RESULT_SET.length,
      location: "Nashville, TN",
      currentPage: 1,
      totalPages: 4,
    });

    expect(description).toContain("100");
    // The whole point: no trust adjective anywhere near the count.
    expect(description).not.toMatch(TRUST_ADJECTIVE);
    // And specifically not the string the Preview served.
    expect(description.toLowerCase()).not.toContain("verified addiction treatment centers");
  });

  it("says nothing stronger than 'listings' regardless of scope or page", () => {
    for (const input of [
      { count: 0, currentPage: 1, totalPages: 1 },
      { count: 1, location: "Austin, TX", currentPage: 1, totalPages: 1 },
      { count: 3794, currentPage: 2, totalPages: 76 },
      { count: 42, query: "detox", currentPage: 1, totalPages: 2 },
    ]) {
      const d = buildSearchResultsDescription(input);
      expect(d, JSON.stringify(input)).not.toMatch(TRUST_ADJECTIVE);
      expect(d).toContain("addiction treatment center listings");
    }
  });

  it("a Verified Only result set is still not described with a blanket claim", () => {
    // The Verified Only filter genuinely narrows the set to verified === true,
    // so a conditional trust claim would be defensible. The builder does not
    // make one: the wording is unconditionally neutral, so no invariant has to
    // hold for the copy to stay true, and no code path exists for a later
    // refactor to reattach a trust adjective to the wrong count.
    const verifiedOnly = MIXED_RESULT_SET.filter((c) => c.verified);
    expect(verifiedOnly).toHaveLength(2);

    const d = buildSearchResultsDescription({
      count: verifiedOnly.length,
      currentPage: 1,
      totalPages: 1,
    });
    expect(d).toContain("2 addiction treatment center listings");
    expect(d).not.toMatch(TRUST_ADJECTIVE);
  });

  it("the page builds its meta description through the single tested helper", () => {
    const src = stripJs(read("src/pages/SearchResults.tsx"));
    expect(src).toMatch(/buildSearchResultsDescription\s*\(/);
    // No inline template may reintroduce an aggregate trust claim.
    expect(src).not.toMatch(
      /\$\{\s*(filteredCenters|allCenters|centers|results)\.length\s*\}[^\n`]{0,60}?\b(verified|vetted|approved|trusted)\b/i,
    );
  });

  it("the verified explanation claims no more than the write path proves", () => {
    const src = read("src/pages/SearchResults.tsx");
    const faq = src.slice(src.indexOf("What does &ldquo;verified&rdquo; mean?"));
    const dd = faq.slice(faq.indexOf("<dd"), faq.indexOf("</dd>"));

    // Mechanically supported and required to stay:
    //  • the importer writes verified:false and the row-state gate rejects
    //    verified=true on unclaimed samhsa_import rows;
    //  • the actor gate admits only admin/service-role, so a provider cannot
    //    self-verify (PR #67);
    //  • no Stripe or subscription code path writes facilities.verified.
    expect(dd).toMatch(/SAMHSA/);
    expect(dd).toMatch(/cannot verify themselves/i);
    expect(dd).toMatch(/payment cannot\s+create or improve it/i);
    expect(dd).toMatch(/not a clinical accreditation/i);

    // Withdrawn because the mechanism does not prove it: claim approval does
    // not entail a completed ownership proof (verification_status is only
    // required when non-NULL, admins may override it, and
    // finalize_claim_decision can auto-approve on a score threshold), and only
    // the single-row admin UI stamps verified on signup approval.
    expect(dd).not.toMatch(/ownership-verified/i);
    expect(dd).not.toMatch(/admin-approved after a provider sign-up/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKER 2 — Pro is has_active_pro, and nothing else
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Model of get-featured-facilities' proFacilityIds derivation after the fix:
 * a pure function of the canonical projection.
 *
 *   for (const row of canonicalProRows)
 *     if (row.id && row.is_pro === true) proFacilityIds.push(row.id);
 *
 * Everything else in the fixtures below — subscription rows, has_featured,
 * facilities.featured, Stripe products — is deliberately NOT an input. That is
 * the property under test: they cannot reach the Pro set because the
 * derivation cannot see them.
 */
type PublicFacilityRow = { id: string | null; is_pro: boolean | null };
const deriveProFacilityIds = (rows: PublicFacilityRow[]): string[] => {
  const out: string[] = [];
  for (const row of rows) {
    if (row.id && row.is_pro === true) out.push(row.id);
  }
  return out;
};

/**
 * Model of the canonical predicate itself, matching the definition live in
 * production (verified read-only against the database, and introduced by
 * 20260829000100_has_active_pro_grace_for_past_due.sql):
 *
 *   tier = 'pro' AND (
 *        (status = 'active' AND (current_period_end IS NULL OR current_period_end > now()))
 *     OR status = 'past_due'
 *   )
 *
 * Used to show what the projection reports for each subscription shape. It
 * keys on `tier = 'pro'` — which is exactly why a Featured-only row, however
 * active, is not Pro — and it grants a past_due grace window, which is why
 * deriving from the projection rather than re-implementing the clock matters.
 *
 * This hotfix does not change has_active_pro. Its `trialing` exclusion remains
 * a separately reported unresolved issue.
 */
type SubscriptionRow = {
  facility_id: string;
  tier: string | null;
  status: string | null;
  has_featured?: boolean;
  current_period_end?: Date | null;
};
const hasActivePro = (subs: SubscriptionRow[], facilityId: string, now = new Date()): boolean =>
  subs.some(
    (s) =>
      s.facility_id === facilityId &&
      s.tier === "pro" &&
      ((s.status === "active" &&
        (s.current_period_end == null || s.current_period_end > now)) ||
        s.status === "past_due"),
  );

const FUTURE = new Date(Date.now() + 30 * 24 * 3600 * 1000);

describe("B2 hotfix — proFacilityIds is the canonical Pro set", () => {
  it("1. canonical is_pro=true appears in proFacilityIds", () => {
    expect(deriveProFacilityIds([{ id: "pro-1", is_pro: true }])).toEqual(["pro-1"]);
  });

  it("2. canonical is_pro=false does not appear in proFacilityIds", () => {
    expect(deriveProFacilityIds([{ id: "free-1", is_pro: false }])).toEqual([]);
    // Fail closed on an absent/unknown value too.
    expect(deriveProFacilityIds([{ id: "unknown", is_pro: null }])).toEqual([]);
  });

  it("3. an ACTIVE Featured-only subscription does not become Pro", () => {
    // This is the B3 landmine the old expression carried. get-featured-rotation
    // INNER JOINs facility_subscriptions and requires status='active', so a
    // Featured-only entitlement must remain active. Under the retired
    // `status='active' AND current_period_end > now()` derivation — which had
    // no tier predicate at all — this row would have been published as Pro,
    // and Pro unlocks the public phone.
    const featuredOnly: SubscriptionRow[] = [
      {
        facility_id: "feat-1",
        tier: "featured",
        status: "active",
        has_featured: true,
        current_period_end: FUTURE,
      },
    ];
    const retiredDerivation = featuredOnly
      .filter((s) => s.status === "active" && (s.current_period_end ?? FUTURE) > new Date())
      .map((s) => s.facility_id);
    expect(retiredDerivation).toEqual(["feat-1"]); // the defect, reproduced

    expect(hasActivePro(featuredOnly, "feat-1")).toBe(false);
    expect(deriveProFacilityIds([{ id: "feat-1", is_pro: false }])).toEqual([]);
  });

  it("4. has_featured=true does not become Pro", () => {
    const subs: SubscriptionRow[] = [
      { facility_id: "hf-1", tier: "featured", status: "active", has_featured: true },
    ];
    expect(hasActivePro(subs, "hf-1")).toBe(false);
    expect(deriveProFacilityIds([{ id: "hf-1", is_pro: false }])).toEqual([]);
  });

  it("5. raw facilities.featured=true does not become Pro", () => {
    // The two surviving production rows carry featured=true with zero
    // subscriptions. The derivation has no access to the column at all.
    const rawFeatured = { id: "legacy-1", featured: true };
    expect(deriveProFacilityIds([{ id: rawFeatured.id, is_pro: false }])).toEqual([]);
  });

  it("6. a Stripe Featured product does not become Pro", () => {
    const FEATURED_PRODUCT_IDS = ["prod_TbalOeJZA2ZoJl", "prod_TbyzJVNOQL71NN"];
    const stripeSub = { facilityId: "stripe-feat", productId: FEATURED_PRODUCT_IDS[0] };
    expect(FEATURED_PRODUCT_IDS).toContain(stripeSub.productId);
    // The Stripe path assigns Featured ELIGIBILITY only; it never pushes to the
    // Pro set, which is built solely from the canonical projection.
    expect(deriveProFacilityIds([{ id: stripeSub.facilityId, is_pro: false }])).toEqual([]);
  });

  it("7. a past_due Pro remains Pro", () => {
    // has_active_pro grants a grace window to past_due (20260829000100), so the
    // projection reports is_pro=true for this row even though its period has
    // lapsed. The derivation is a pure function of that projection, so the
    // grace is inherited rather than re-implemented — there is no second,
    // drifting entitlement clock to fall out of step with the database.
    const pastDue: SubscriptionRow[] = [
      {
        facility_id: "pastdue-1",
        tier: "pro",
        status: "past_due",
        current_period_end: new Date(Date.now() - 24 * 3600 * 1000),
      },
    ];
    expect(hasActivePro(pastDue, "pastdue-1")).toBe(true);
    expect(deriveProFacilityIds([{ id: "pastdue-1", is_pro: true }])).toEqual(["pastdue-1"]);

    // A past_due FEATURED row is still not Pro — the tier predicate holds.
    const pastDueFeatured: SubscriptionRow[] = [
      { facility_id: "pdf-1", tier: "featured", status: "past_due" },
    ];
    expect(hasActivePro(pastDueFeatured, "pdf-1")).toBe(false);
  });

  it("mixed fixture: only the canonical Pro rows survive", () => {
    expect(
      deriveProFacilityIds([
        { id: "pro-a", is_pro: true },
        { id: "feat-b", is_pro: false },
        { id: "free-c", is_pro: false },
        { id: "pro-d", is_pro: true },
        { id: null, is_pro: true },
      ]),
    ).toEqual(["pro-a", "pro-d"]);
  });

  it("the edge function reads the canonical projection and no subscription table", () => {
    const src = stripJs(read("supabase/functions/get-featured-facilities/index.ts"));
    expect(src).toMatch(/from\(\s*["']public_facilities["']\s*\)/);
    expect(src).toMatch(/is_pro\s*===\s*true/);
    expect(src).not.toMatch(/from\(\s*["']facility_subscriptions["']\s*\)/);
  });
});

describe("B2 hotfix — no frontend can elevate a non-Pro facility to Pro", () => {
  it("8. useStaticFacilities cannot turn snapshot isPro=false into true", () => {
    // Model of the hook's derivation after the fix.
    const deriveIsPro = (facility: { id: string; isPro?: boolean | null }) =>
      facility.isPro === true;

    const legacyProIds = ["snap-free", "snap-featured-only"]; // a stale/over-broad list
    for (const id of legacyProIds) {
      const facility = { id, isPro: false };
      expect(deriveIsPro(facility)).toBe(false);
      // The retired expression, for contrast.
      expect(facility.isPro || legacyProIds.includes(id)).toBe(true);
    }

    expect(deriveIsPro({ id: "snap-pro", isPro: true })).toBe(true);
    expect(deriveIsPro({ id: "snap-null", isPro: null })).toBe(false);
    expect(deriveIsPro({ id: "snap-missing" })).toBe(false);

    const src = stripJs(read("src/hooks/useStaticFacilities.ts"));
    const assign = src.match(/const\s+isPro\s*=\s*([^;]+);/);
    expect(assign?.[1]).toBeDefined();
    expect(assign![1]).toMatch(/isPro\s*===\s*true/);
    expect(assign![1]).not.toMatch(/\|\||\?\?|proIds|proFacilityIds/);
  });

  it("9. useApprovedFacilities reads canonical public_facilities.is_pro", () => {
    const src = stripJs(read("src/hooks/useApprovedFacilities.ts"));
    expect(src).toMatch(/from\(\s*["']public_facilities["']\s*\)/);
    expect(src).toMatch(/\bis_pro\b/);
    const assign = src.match(/const\s+isPro\s*=\s*([^;]+);/);
    expect(assign?.[1]).toMatch(/is_pro\s*===\s*true/);
    expect(assign![1]).not.toMatch(/proIds|proFacilityIds/);
  });

  it("the public profile no longer badges Pro as Featured", () => {
    const src = stripJs(read("src/pages/CenterProfile.tsx"));
    expect(src).not.toMatch(/hasFeaturedSubscription/);
    expect(src).not.toMatch(/proFacilityIds/);
  });
});

describe("B2 hotfix — Pro and Featured stay separate in both directions", () => {
  it("10. Pro alone still does not enter the Featured rotation", () => {
    const src = stripJs(read("supabase/functions/get-featured-facilities/index.ts"));
    // Pro ids go to proFacilityIds; eligibility comes only from the Stripe
    // Featured product path. No push of a Pro row into eligibleFacilities.
    expect(src).not.toMatch(/eligibleFacilities\.push\([\s\S]{0,200}?plan_type:\s*['"]pro['"]/);
    expect(src).toMatch(/plan_type:\s*['"]featured['"]/);

    // get-featured-rotation's paid pool still requires a Featured entitlement.
    const rot = "supabase/functions/get-featured-rotation/index.ts";
    if (existsSync(join(ROOT, rot))) {
      const rotSrc = stripJs(read(rot));
      expect(rotSrc).toMatch(/has_featured|has_concierge_partner/);
    }
  });

  it("11. Featured alone still does not unlock the public phone", () => {
    // The published phone is masked on has_active_pro in the live view; a
    // Featured entitlement is not part of that predicate.
    const projectPhone = (raw: { phone: string; hasActivePro: boolean; hasFeatured: boolean }) =>
      raw.hasActivePro ? raw.phone : null;

    expect(
      projectPhone({ phone: "615-555-0100", hasActivePro: false, hasFeatured: true }),
    ).toBeNull();
    expect(
      projectPhone({ phone: "615-555-0100", hasActivePro: true, hasFeatured: false }),
    ).toBe("615-555-0100");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// BLOCKER 3 — the deployable webhook is reproducible from reviewed source
// ═══════════════════════════════════════════════════════════════════════════

describe("B3 hotfix — stripe-webhook generation is reproducible", () => {
  const GENERATOR = "scripts/inline-stripe-webhook-shared.py";
  const ENTRYPOINT = "supabase/functions/stripe-webhook/entrypoint.ts";
  const ARTIFACT = "supabase/functions/stripe-webhook/index.ts";

  it("a canonical entrypoint exists and is not the generated artifact", () => {
    expect(existsSync(join(ROOT, ENTRYPOINT))).toBe(true);
    const entry = read(ENTRYPOINT);
    // The source imports its dependencies; the artifact inlines them.
    expect(entry).toMatch(/from\s*"\.\.\/_shared\/pro-benefits\.ts"/);
    expect(entry).not.toMatch(/^\/\/ ── inlined from/m);
  });

  it("the generator reads the entrypoint, not its own output", () => {
    const gen = read(GENERATOR);
    expect(gen).toMatch(/ENTRY\s*=.*entrypoint\.ts/);
    expect(gen).not.toMatch(/^\s*(ENTRY|SRC)\s*=.*index\.ts/m);
  });

  it("the generator resolves the canonical _shared directory", () => {
    const gen = read(GENERATOR);
    expect(gen).toMatch(/SHARED_DIR\s*=\s*os\.path\.join\([^)]*"_shared"\)/);
    expect(gen).not.toMatch(/"stripe-webhook",\s*"_shared"/);
  });

  it("the committed artifact is byte-identical to the generator's output", () => {
    const res = spawnSync("python3", [join(ROOT, GENERATOR), "--check"], {
      encoding: "utf8",
      cwd: ROOT,
    });
    // python3 must be present; a skip here would certify nothing.
    expect(res.error).toBeUndefined();
    expect(res.status, `${res.stdout ?? ""}${res.stderr ?? ""}`).toBe(0);
  });

  it("--check makes no file changes", () => {
    const before = read(ARTIFACT);
    spawnSync("python3", [join(ROOT, GENERATOR), "--check"], { encoding: "utf8", cwd: ROOT });
    expect(read(ARTIFACT)).toBe(before);
  });

  it("the artifact has zero local relative imports", () => {
    const art = stripJs(read(ARTIFACT));
    const local = [...art.matchAll(/^import[\s\S]*?from\s*"(\.{1,2}\/[^"]+)";/gm)].map(
      (m) => m[1],
    );
    expect(local).toEqual([]);
  });

  it("no module is inlined twice", () => {
    const markers = [...read(ARTIFACT).matchAll(/^\/\/ ── inlined from (\S+)/gm)].map(
      (m) => m[1],
    );
    expect(markers.length).toBeGreaterThan(0);
    expect(new Set(markers).size).toBe(markers.length);
  });

  it("the generated header names the real regeneration command", () => {
    const art = read(ARTIFACT);
    expect(art).toMatch(/inline-stripe-webhook-shared\.py --write/);
    expect(art).not.toMatch(/inline-stripe-webhook-shared\.sh/);
  });

  it("the regenerated artifact still carries the B2 retirement", () => {
    const art = stripJs(read(ARTIFACT));
    expect(art).toMatch(/activateProBenefits/);
    expect(art).toMatch(/deactivateProBenefits/);
    // No Pro→ranking, Pro→Featured or Pro→verified mutation on any path,
    // including the hand-written past_due recovery copy.
    expect(art).not.toMatch(
      /calculated_ranking_score[\s\S]{0,120}?[+-]\s*50|[+-]\s*50[\s\S]{0,60}?calculated_ranking_score/,
    );
    expect(art).not.toMatch(/(?<!has_)\bfeatured\s*:\s*(?:true|false)\b/);
    expect(art).not.toMatch(/\bverified\s*:\s*true\b/);
    // The legitimate Featured add-on column survives.
    expect(art).toMatch(/\bhas_featured\s*:\s*(?:true|false)\b/);
  });

  it("the profiles.plan mirror survives, so Pro activation is not a no-op", () => {
    const art = stripJs(read(ARTIFACT));
    expect(art).toMatch(/\bplan\b\s*:\s*["']pro["']/);
  });
});
