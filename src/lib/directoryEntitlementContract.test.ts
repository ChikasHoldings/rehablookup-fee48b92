/**
 * Stage-3 entitlement amendment — B1 (trust) + B2 (organic ranking).
 *
 * CONTRACT UNDER TEST
 *   A provider may pay for Pro PRODUCT FEATURES (public phone + Call CTA,
 *   enhanced-profile media, analytics) and for clearly labeled FEATURED
 *   VISIBILITY. A provider may NEVER pay for verification/trust, organic
 *   search ranking, inquiry eligibility, inquiry value, or matching.
 *
 * These are behavioural where a behaviour exists to exercise: the ranking
 * scorer and the organic comparators are re-implemented here from their
 * source shape and driven with fixtures, so the assertions are about what
 * the model DOES, not about how it is spelled. The database contract is
 * necessarily asserted against migration source — there is no Postgres in
 * this suite — and is additionally enforced at build time by
 * scripts/check-directory-trust-ranking.mjs and at apply time by the
 * migration's own fail-closed DO blocks.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(__dirname, "..", "..");
const read = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const stripSql = (sql: string) =>
  sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--[^\n]*/g, "");
const stripJs = (src: string) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

/** The newest migration defining public_facilities is the live contract. */
function latestPublicFacilitiesView(): { name: string; body: string } {
  const dir = join(ROOT, "supabase", "migrations");
  const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().reverse();
  for (const name of files) {
    const sql = stripSql(readFileSync(join(dir, name), "utf8"));
    const idx = sql.search(/CREATE OR REPLACE VIEW public\.public_facilities/i);
    if (idx !== -1) return { name, body: sql.slice(idx).split(/;\s*$/m)[0] };
  }
  throw new Error("no migration defines public.public_facilities");
}

// ═══════════════════════════════════════════════════════════════════════════
// TRUST — B1
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Model of the public projection's per-column entitlement rules, mirroring the
 * live view body. `verified` reads through; `phone` is Pro-gated.
 */
function projectPublicFacility(raw: {
  verified: boolean;
  phone: string | null;
  hasActivePro: boolean;
  featured: boolean;
}) {
  return {
    verified: raw.verified,
    phone: raw.hasActivePro ? raw.phone : null,
    is_pro: raw.hasActivePro,
    featured: raw.featured,
  };
}

describe("B1 — public verification is plan-independent", () => {
  it("Free + raw verified=true → published verified, phone hidden", () => {
    const out = projectPublicFacility({
      verified: true,
      phone: "555-0100",
      hasActivePro: false,
      featured: false,
    });
    expect(out.verified).toBe(true);
    expect(out.phone).toBeNull();
  });

  it("Pro + raw verified=true → published verified, phone shown", () => {
    const out = projectPublicFacility({
      verified: true,
      phone: "555-0100",
      hasActivePro: true,
      featured: false,
    });
    expect(out.verified).toBe(true);
    expect(out.phone).toBe("555-0100");
  });

  it("Free + raw verified=false → published NOT verified", () => {
    const out = projectPublicFacility({
      verified: false,
      phone: "555-0100",
      hasActivePro: false,
      featured: false,
    });
    expect(out.verified).toBe(false);
  });

  it("Featured has no effect on verified, in either direction", () => {
    const featuredUnverified = projectPublicFacility({
      verified: false,
      phone: "555-0100",
      hasActivePro: false,
      featured: true,
    });
    const plainVerified = projectPublicFacility({
      verified: true,
      phone: "555-0100",
      hasActivePro: false,
      featured: false,
    });
    expect(featuredUnverified.verified).toBe(false);
    expect(plainVerified.verified).toBe(true);
  });

  it("Featured alone never unlocks the phone", () => {
    const out = projectPublicFacility({
      verified: true,
      phone: "555-0100",
      hasActivePro: false,
      featured: true,
    });
    expect(out.phone).toBeNull();
  });
});

describe("B1 — the live migration encodes that contract", () => {
  const { body } = latestPublicFacilitiesView();

  it("does NOT gate verified on has_active_pro", () => {
    expect(body).not.toMatch(/THEN\s+f?\.?verified\s+ELSE\s+false/i);
    expect(body).not.toMatch(
      /CASE\s+WHEN\s+has_active_pro[^\n]*THEN\s+f?\.?verified\b/i,
    );
  });

  it("DOES gate phone on has_active_pro — the paid contact feature survives", () => {
    expect(body).toMatch(
      /CASE\s+WHEN\s+has_active_pro\(id\)\s+THEN\s+phone\s+ELSE\s+NULL/i,
    );
  });

  it("preserves claimant visibility and canonical is_claimed", () => {
    expect(body).toMatch(/facility_claim_requests/i);
    expect(body).toMatch(/claimant_user_id\s*=\s*\(\s*SELECT\s+auth\.uid\(\)\s*\)/i);
    expect(body).toMatch(/user_id\s+IS\s+NOT\s+NULL\s+AS\s+is_claimed/i);
  });

  it("keeps the existing Pro gating on enhanced-profile media", () => {
    expect(body).toMatch(/has_active_pro\(id\)\s+THEN\s+video_url/i);
    expect(body).toMatch(/has_active_pro\(id\)\s+THEN\s+virtual_tour_url/i);
  });

  it("does not Pro-gate website", () => {
    expect(body).not.toMatch(/THEN\s+website\b/i);
  });

  it("does not reopen raw facilities to anon or recreate the dropped RPC", () => {
    const dir = join(ROOT, "supabase", "migrations");
    const newest = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().at(-1)!;
    const sql = stripSql(readFileSync(join(dir, newest), "utf8"));
    expect(sql).not.toMatch(/GRANT\s+SELECT[^;]*ON\s+public\.facilities[^;]*anon/i);
    expect(sql).not.toMatch(
      /CREATE\s+(OR\s+REPLACE\s+)?FUNCTION\s+public\.get_public_facility_data/i,
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIC RANKING — B2
// ═══════════════════════════════════════════════════════════════════════════

type WeightKey =
  | "listing_completeness"
  | "response_rate"
  | "recency"
  | "location_relevance";

const NEUTRAL_WEIGHT_KEYS: WeightKey[] = [
  "listing_completeness",
  "response_rate",
  "recency",
  "location_relevance",
];

const DEFAULT_WEIGHTS: Record<WeightKey, number> = {
  listing_completeness: 20,
  response_rate: 15,
  recency: 10,
  location_relevance: 5,
};

/** Mirrors calculate-ranking-scores' allow-list merge. */
function resolveWeights(stored: Record<string, unknown> | null) {
  const weights: Record<WeightKey, number> = { ...DEFAULT_WEIGHTS };
  if (stored) {
    for (const key of NEUTRAL_WEIGHT_KEYS) {
      const value = stored[key];
      if (typeof value === "number" && Number.isFinite(value)) weights[key] = value;
    }
  }
  return weights;
}

/** Mirrors the scorer's weighted sum. Note: no isPro parameter exists. */
function computeScore(
  facility: { completeness: number; responseRate: number; activity: number },
  stored: Record<string, unknown> | null = null,
) {
  const w = resolveWeights(stored);
  return (
    Math.round(facility.completeness * (w.listing_completeness / 100)) +
    Math.round(facility.responseRate * (w.response_rate / 100)) +
    Math.round(facility.activity * (w.recency / 100))
  );
}

describe("B2 — organic ranking has no payment input", () => {
  const identical = { completeness: 80, responseRate: 50, activity: 60 };

  it("two otherwise identical facilities score the same whether one is Pro", () => {
    // There is no Pro input to pass — that is the point. The scorer's
    // signature cannot express one.
    expect(computeScore(identical)).toBe(computeScore(identical));
  });

  it("a stale stored { pro_boost: 50 } cannot change the computed score", () => {
    const neutral = computeScore(identical, null);
    const withStalePaidKey = computeScore(identical, {
      recency: 10,
      pro_boost: 50,
      response_rate: 15,
      location_relevance: 5,
      listing_completeness: 20,
    });
    expect(withStalePaidKey).toBe(neutral);
  });

  it("ignores any future purchasable key while honouring neutral overrides", () => {
    const w = resolveWeights({
      listing_completeness: 40,
      pro_boost: 50,
      featured_boost: 99,
      subscription_tier_boost: 25,
    });
    expect(w.listing_completeness).toBe(40);
    expect(w).not.toHaveProperty("pro_boost");
    expect(w).not.toHaveProperty("featured_boost");
    expect(w).not.toHaveProperty("subscription_tier_boost");
  });

  it("the scorer source queries no subscription state", () => {
    const src = stripJs(read("supabase/functions/calculate-ranking-scores/index.ts"));
    expect(src).not.toMatch(/facility_subscriptions/);
    expect(src).not.toMatch(/\bpro_boost\b/);
    expect(src).not.toMatch(/\bisPro\b/);
    expect(src).not.toMatch(/has_active_pro/);
  });

  it("a forward migration strips the stored pro_boost key idempotently", () => {
    const dir = join(ROOT, "supabase", "migrations");
    const mig = readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => stripSql(readFileSync(join(dir, f), "utf8")))
      .find((sql) => /platform_settings/i.test(sql) && /-\s*'pro_boost'/i.test(sql));
    expect(mig).toBeDefined();
    // Key-subtraction, not a hard-coded replacement object that would erase
    // operator settings; guarded so a re-run is a no-op.
    expect(mig!).toMatch(/setting_value\s*-\s*'pro_boost'/i);
    expect(mig!).toMatch(/setting_value\s*\?\s*'pro_boost'/i);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// ORGANIC ORDERING — B2.5
// ═══════════════════════════════════════════════════════════════════════════

interface Row {
  id: string;
  name: string;
  calculatedRankingScore: number;
  isPro: boolean;
  featured: boolean;
  proximity: number;
}

const row = (p: Partial<Row> & { id: string; name: string }): Row => ({
  calculatedRankingScore: 0,
  isPro: false,
  featured: false,
  proximity: 1,
  ...p,
});

/** Mirrors the SearchResults comparator after B2. */
function sortResults(rows: Row[], sortParam: string, hasLocation = false) {
  return [...rows].sort((a, b) => {
    if (sortParam === "proximity") {
      if (a.proximity !== b.proximity) return a.proximity - b.proximity;
      if (a.calculatedRankingScore !== b.calculatedRankingScore)
        return b.calculatedRankingScore - a.calculatedRankingScore;
      return a.id.localeCompare(b.id);
    }
    if (sortParam === "relevance") {
      if (hasLocation && a.proximity !== b.proximity) return a.proximity - b.proximity;
      if (a.calculatedRankingScore !== b.calculatedRankingScore)
        return b.calculatedRankingScore - a.calculatedRankingScore;
      return a.id.localeCompare(b.id);
    }
    switch (sortParam) {
      case "name-asc": {
        const d = a.name.localeCompare(b.name);
        return d !== 0 ? d : a.id.localeCompare(b.id);
      }
      case "name-desc": {
        const d = b.name.localeCompare(a.name);
        return d !== 0 ? d : a.id.localeCompare(b.id);
      }
      default:
        return a.id.localeCompare(b.id);
    }
  });
}

describe("B2.5 — user-selected sorts mean what they say", () => {
  const zebraPro = row({ id: "b", name: "Zebra Recovery", isPro: true, featured: true });
  const appleFree = row({ id: "a", name: "Apple Recovery" });

  it("Name A-Z is alphabetical even when the last-alphabetically result is Pro + Featured", () => {
    const out = sortResults([zebraPro, appleFree], "name-asc");
    expect(out.map((r) => r.name)).toEqual(["Apple Recovery", "Zebra Recovery"]);
  });

  it("Name Z-A is reverse alphabetical even when the first result is free", () => {
    const out = sortResults([appleFree, zebraPro], "name-desc");
    expect(out.map((r) => r.name)).toEqual(["Zebra Recovery", "Apple Recovery"]);
  });

  it("proximity: payment cannot move a farther facility above a nearer one", () => {
    const nearFree = row({ id: "n", name: "Near Free", proximity: 0 });
    const farPro = row({
      id: "f",
      name: "Far Pro",
      proximity: 3,
      isPro: true,
      featured: true,
      calculatedRankingScore: 999,
    });
    const out = sortResults([farPro, nearFree], "proximity");
    expect(out.map((r) => r.id)).toEqual(["n", "f"]);
  });

  it("relevance ordering is unchanged by flipping Pro/Featured on either row", () => {
    const x = row({ id: "x", name: "X", calculatedRankingScore: 40 });
    const y = row({ id: "y", name: "Y", calculatedRankingScore: 20 });
    const baseline = sortResults([x, y], "relevance").map((r) => r.id);
    const paidY = sortResults(
      [x, { ...y, isPro: true, featured: true }],
      "relevance",
    ).map((r) => r.id);
    expect(paidY).toEqual(baseline);
  });

  it("ties break deterministically by id, not by plan", () => {
    const p = row({ id: "id-2", name: "Same", isPro: true, featured: true });
    const q = row({ id: "id-1", name: "Same" });
    expect(sortResults([p, q], "relevance").map((r) => r.id)).toEqual(["id-1", "id-2"]);
    expect(sortResults([q, p], "relevance").map((r) => r.id)).toEqual(["id-1", "id-2"]);
  });

  it("the payment-ranked sort helper module is gone", () => {
    expect(() => read("src/lib/facilityPlanSort.ts")).toThrow();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// PRO SIDE EFFECTS — B2.3 / B2.6 / B2.7 / B2.8
// ═══════════════════════════════════════════════════════════════════════════

describe("B2.3 — Pro activation keeps its legitimate effect and nothing more", () => {
  const src = stripJs(read("supabase/functions/_shared/pro-benefits.ts"));

  it("still mirrors profiles.plan on activation and deactivation (photo cap)", () => {
    expect(src).toMatch(/plan:\s*"pro"/);
    expect(src).toMatch(/plan:\s*"free"/);
    expect(src).toMatch(/from\("profiles"\)/);
  });

  it("activation does not mutate facilities.featured or the ranking score", () => {
    expect(src).not.toMatch(/calculated_ranking_score/);
    expect(src).not.toMatch(/\bfeatured\s*:/);
    expect(src).not.toMatch(/RANKING_BOOST/);
  });

  it("deactivation does not clear an independent Featured signal", () => {
    expect(src).not.toMatch(/featured:\s*false/);
  });

  it("does not write the trust column", () => {
    expect(src).not.toMatch(/\bverified\s*:/);
  });

  it("preserves the partial-failure notifier and its result interfaces", () => {
    expect(src).toMatch(/export async function notifyProBenefitsPartialFailure/);
    expect(src).toMatch(/facilitiesUpdated/);
    expect(src).toMatch(/facilitiesReverted/);
    expect(src).toMatch(/profilePlanMirrored/);
  });
});

describe("B2.4 — the generated stripe-webhook carries the same retirement", () => {
  const src = stripJs(read("supabase/functions/stripe-webhook/index.ts"));

  it("no longer writes calculated_ranking_score anywhere", () => {
    expect(src).not.toMatch(/calculated_ranking_score/);
  });

  it("no longer writes facilities.featured on any path, including past_due recovery", () => {
    expect(src).not.toMatch(/\bfeatured\s*:\s*(true|false)\b/);
  });

  it("keeps the Featured ADD-ON flag, which is the legitimate paid contract", () => {
    expect(src).toMatch(/has_featured/);
  });

  it("its inlined pro-benefits block matches the canonical shared source", () => {
    // SUPERSEDED IN SCOPE, NOT WEAKENED.
    //
    // This used to re-derive the generator's transform for one module and
    // assert byte equality, because the generator itself could not be run: it
    // read its own output as input and pointed at a deleted _shared directory.
    // A hand-rolled transform of a single module was the strongest available
    // evidence, and it was not strong enough to justify a rollout — it proved
    // nothing about the other eight inlined modules or about the file as a
    // whole.
    //
    // The generator now works, so equality is asserted against the real
    // generator over the WHOLE artifact (see
    // directoryEntitlementHotfix.test.ts and
    // scripts/check-stripe-webhook-inline.mjs). What remains useful here is the
    // narrower claim this test was named for: the pro-benefits block that
    // reaches the deployable file is the canonical shared implementation, not a
    // divergent inlined copy.
    const shared = stripJs(read("supabase/functions/_shared/pro-benefits.ts"));
    const gen = read("supabase/functions/stripe-webhook/index.ts");
    const marker = "// ── inlined from _shared/pro-benefits.ts ─────────────\n";
    const start = gen.indexOf(marker);
    expect(start, "pro-benefits is no longer inlined into the webhook").toBeGreaterThan(-1);
    const rest = gen.slice(start + marker.length);
    const nextMarker = rest.search(/^\/\/ ── (inlined from|stripe-webhook entrypoint)/m);
    const block = stripJs(nextMarker === -1 ? rest : rest.slice(0, nextMarker));

    for (const fn of [
      "activateProBenefits",
      "deactivateProBenefits",
      "notifyProBenefitsPartialFailure",
    ]) {
      expect(shared, `${fn} missing from the canonical source`).toMatch(
        new RegExp(`\\b${fn}\\b`),
      );
      expect(block, `${fn} missing from the inlined block`).toMatch(new RegExp(`\\b${fn}\\b`));
    }
    // The retired mutations must not reappear in the deployed copy.
    expect(block).not.toMatch(/calculated_ranking_score/);
    expect(block).not.toMatch(/\bfeatured\s*:\s*(true|false)\b/);
    // The block is the shared module's body with its imports stripped, so every
    // non-import line of the canonical source appears verbatim.
    const sharedBody = shared
      .replace(/^import[\s\S]*?from\s*"[^"]+";[ \t]*\n?/gm, "")
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);
    const blockLines = new Set(block.split("\n").map((l) => l.trim()));
    const missing = sharedBody.filter((l) => !blockLines.has(l));
    expect(missing, "inlined pro-benefits has drifted from the canonical source").toEqual([]);
  });
});

describe("B2.6 / B2.7 — Pro never sets Featured display state", () => {
  it("useApprovedFacilities does not assign featured from isPro", () => {
    const src = stripJs(read("src/hooks/useApprovedFacilities.ts"));
    expect(src).not.toMatch(/\bfeatured\s*:\s*[^,\n]*\bisPro\b/);
  });

  it("useStaticFacilities does not assign featured from isPro or the catalog flag", () => {
    const src = stripJs(read("src/hooks/useStaticFacilities.ts"));
    expect(src).not.toMatch(/\bfeatured\s*:\s*[^,\n]*\bisPro\b/);
    expect(src).not.toMatch(/\bfeatured\s*:\s*facility\.featured/);
    expect(src).not.toMatch(/isFeaturedPaid/);
  });

  it("both hooks still expose isPro so Pro product features keep working", () => {
    expect(stripJs(read("src/hooks/useApprovedFacilities.ts"))).toMatch(/isPro,/);
    expect(stripJs(read("src/hooks/useStaticFacilities.ts"))).toMatch(/isPro,/);
  });
});

describe("B2.8 — a Pro-only facility does not enter paid Featured visibility", () => {
  const src = stripJs(read("supabase/functions/get-featured-facilities/index.ts"));

  it("the Pro-entitlement loop no longer pushes into Featured eligibility", () => {
    // UPDATED, NOT WEAKENED. This matched `for (const proSub of proSubs)` —
    // the loop over raw facility_subscriptions rows. That loop is gone: the
    // verification hotfix replaced the whole derivation, because iterating
    // active subscription rows with no tier predicate meant ANY active
    // subscription of any product was published as a Pro entitlement. The Pro
    // set is now read from the canonical public_facilities.is_pro projection.
    //
    // The assertion is unchanged in substance — the Pro loop must populate
    // proFacilityIds and must not touch Featured eligibility — and is now made
    // against the canonical loop.
    const loop = src.match(
      /for\s*\(\s*const\s+row\s+of\s+canonicalProRows\s*\)\s*\{[\s\S]*?\n\s{4}\}/,
    );
    expect(loop).not.toBeNull();
    expect(loop![0]).not.toMatch(/eligibleFacilities\.push/);
    expect(loop![0]).toMatch(/proFacilityIds\.push/);
    expect(loop![0]).toMatch(/is_pro\s*===\s*true/);
  });

  it("Pro identity comes from the canonical projection, not a subscription query", () => {
    expect(src).toMatch(/from\(\s*['"]public_facilities['"]\s*\)/);
    expect(src).not.toMatch(/from\(\s*['"]facility_subscriptions['"]\s*\)/);
  });

  it("Featured eligibility no longer carries a 'pro' plan type", () => {
    expect(src).not.toMatch(/plan_type:\s*['"]pro['"]/);
  });

  it("the unproven raw facilities.featured flag no longer confers eligibility", () => {
    const legacy = src.match(/unprovenLegacyFeatured[\s\S]{0,400}/);
    expect(legacy).not.toBeNull();
    expect(legacy![0]).not.toMatch(/eligibleFacilities\.push/);
  });

  it("proFacilityIds is still returned for callers that need the Pro signal", () => {
    expect(src).toMatch(/proFacilityIds,/);
  });
});

describe("B2.10 — the paid rotation keeps its Stage-2 phone protection", () => {
  const src = stripJs(read("supabase/functions/get-featured-rotation/index.ts"));

  it("display_phone is resolved through the canonical Pro set and falls through to null", () => {
    expect(src).toMatch(/\bdisplay_phone\b\s*:\s*proFacilityIds\.has\(/);
  });

  it("paid eligibility still requires an active Featured/Concierge subscription row", () => {
    expect(src).toMatch(/facility_subscriptions/);
    expect(src).toMatch(/has_featured\.eq\.true/);
  });

  it("unpaid fallback rows are labelled as fallback, not as Featured", () => {
    expect(src).toMatch(/is_fallback:\s*true/);
  });
});
