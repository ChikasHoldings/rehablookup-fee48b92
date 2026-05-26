// ============================================================================
// Concierge Marketing Add-On activation / deactivation — single source of truth.
//
// activateConciergePartner:
//   - Flip facility_subscriptions.has_concierge_partner=true, store the
//     Concierge Stripe sub id alongside the canonical (Pro) row keyed on
//     facility_id.
//   - Auto-opt-in the facility to the concierge network (so it becomes
//     match-eligible immediately) and stamp concierge_opted_in_at.
//     concierge_terms_accepted_at stays null — explicit terms acceptance
//     is collected by BillingConcierge so the EKRA paper-trail is honest.
//   - Seed one concierge_partner_facilities row for the facility's home
//     geo (state + city) with a broad level_of_care default, so the
//     facility is instantly eligible for advisor matching in its own
//     home market. Provider refines via BillingConcierge "Add geo".
//   - Re-activate any previously deactivated partner rows on re-purchase
//     (UNIQUE on (facility_id, geo_state, geo_city) ⇒ rebuy after
//     cancel flips active=true rather than inserting).
//
// deactivateConciergePartner:
//   - Flip has_concierge_partner=false, clear concierge_stripe_subscription_id.
//   - Mark all active concierge_partner_facilities rows for this sub
//     active=false, deactivated_at=now().
//   - Does NOT auto-revert concierge_network_opted_in — that's the
//     provider's choice (they may want to stay opted in unpaid, just
//     without the partner badge).
//
// Idempotent under Stripe webhook retries.
// ============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

interface FacilityRow {
  id: string;
  state: string | null;
  city: string | null;
  concierge_network_opted_in: boolean | null;
  concierge_opted_in_at: string | null;
  concierge_accepted_care_types: string[] | null;
}

// Broad default LoC seed — mirrors the levelOfCareMap used by
// match-concierge-intake (detox / inpatient / residential / php / iop /
// outpatient / sober_living). Over-broad here is fine; the matching
// algorithm intersects with the seeker's specific LoC need.
const DEFAULT_LEVELS_OF_CARE = [
  "detox",
  "inpatient",
  "residential",
  "php",
  "iop",
  "outpatient",
  "sober_living",
] as const;

export interface ActivateConciergeResult {
  has_concierge_partner_set: boolean;
  network_opted_in_set: boolean;
  partner_rows_inserted: number;
  partner_rows_reactivated: number;
  failed: { step: string; error: string }[];
}

export async function activateConciergePartner(
  supabase: SupabaseClient,
  args: {
    facilityId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: string | null;
    // Round-31 audit fix: previously the activation hardcoded
    // DEFAULT_LEVELS_OF_CARE (all of them). The UI's BillingConcierge
    // add-geo form lets the provider pick which LoC they accept, but
    // those choices weren't reaching this helper. Now: the create-
    // checkout-session edge fn passes the chosen levels through
    // subscription metadata, the webhook extracts them, and they
    // arrive here. Empty/missing array falls back to DEFAULT for
    // backward compatibility with pre-fix subscriptions.
    levelsOfCare?: string[];
  },
): Promise<ActivateConciergeResult> {
  const result: ActivateConciergeResult = {
    has_concierge_partner_set: false,
    network_opted_in_set: false,
    partner_rows_inserted: 0,
    partner_rows_reactivated: 0,
    failed: [],
  };

  const { data: facSubRow, error: subLookupErr } = await supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_concierge_partner, concierge_stripe_subscription_id")
    .eq("facility_id", args.facilityId)
    .maybeSingle();
  if (subLookupErr) {
    result.failed.push({ step: "subscription_lookup", error: subLookupErr.message });
    return result;
  }
  if (!facSubRow) {
    result.failed.push({
      step: "subscription_lookup",
      error: "no facility_subscriptions row exists; Pro upgrade must precede Concierge",
    });
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;

  // 1. Flip the partner flag + record the Stripe sub id.
  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_concierge_partner: true,
      concierge_stripe_subscription_id: args.stripeSubscriptionId,
      // Persist the add-on sub's own period (it bills independently of Pro).
      concierge_current_period_end: args.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_update", error: flagErr.message });
    return result;
  }
  result.has_concierge_partner_set = true;

  // 2. Read the facility to seed geo + opt-in.
  const { data: facility, error: facErr } = await supabase
    .from("facilities")
    .select(
      "id, state, city, concierge_network_opted_in, concierge_opted_in_at, concierge_accepted_care_types",
    )
    .eq("id", args.facilityId)
    .maybeSingle();
  if (facErr) {
    result.failed.push({ step: "facility_lookup", error: facErr.message });
    return result;
  }
  if (!facility) {
    result.failed.push({ step: "facility_lookup", error: "facility row not found" });
    return result;
  }
  const fac = facility as FacilityRow;

  // 3. Auto-opt-in to the matching network if not already in (matching
  //    gates on concierge_network_opted_in=true). Don't auto-set
  //    concierge_terms_accepted_at — that's collected in the UI.
  if (!fac.concierge_network_opted_in) {
    const optInUpdate: Record<string, unknown> = {
      concierge_network_opted_in: true,
      updated_at: new Date().toISOString(),
    };
    if (!fac.concierge_opted_in_at) {
      optInUpdate.concierge_opted_in_at = new Date().toISOString();
    }
    // Seed accepted-care-types: prefer the user-selected levels passed
    // in via args.levelsOfCare (round-31 fix), fall back to the broad
    // default for backward compat / missing metadata.
    if (!fac.concierge_accepted_care_types || (Array.isArray(fac.concierge_accepted_care_types) && fac.concierge_accepted_care_types.length === 0)) {
      const chosen = (args.levelsOfCare && args.levelsOfCare.length > 0) ? args.levelsOfCare : [...DEFAULT_LEVELS_OF_CARE];
      optInUpdate.concierge_accepted_care_types = chosen;
    }
    const { error: optInErr } = await supabase
      .from("facilities")
      .update(optInUpdate)
      .eq("id", args.facilityId);
    if (optInErr) {
      result.failed.push({ step: "network_opt_in", error: optInErr.message });
    } else {
      result.network_opted_in_set = true;
    }
  }

  // 4. Seed the home-geo concierge_partner_facilities row. UNIQUE on
  //    (facility_id, geo_state, geo_city) — re-purchase reactivates.
  if (fac.state && fac.state.trim().length > 0) {
    const geoState = fac.state.trim().toUpperCase();
    const geoCity = fac.city && fac.city.trim().length > 0 ? fac.city.trim() : null;

    const { data: existing } = await supabase
      .from("concierge_partner_facilities")
      .select("id, active")
      .eq("facility_id", args.facilityId)
      .eq("geo_state", geoState)
      .eq("geo_city", geoCity as never)
      .maybeSingle();

    // Round-31 fix: use user-selected LoC if provided, else default.
    const partnerLOC = (args.levelsOfCare && args.levelsOfCare.length > 0)
      ? args.levelsOfCare
      : [...DEFAULT_LEVELS_OF_CARE];
    if (existing) {
      const wasInactive = (existing as { active: boolean }).active === false;
      if (wasInactive) {
        const { error: reactErr } = await supabase
          .from("concierge_partner_facilities")
          .update({
            subscription_id: facSubId,
            level_of_care: partnerLOC,
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (reactErr) {
          result.failed.push({ step: "partner_row_reactivate", error: reactErr.message });
        } else {
          result.partner_rows_reactivated++;
        }
      }
    } else {
      const { error: insErr } = await supabase.from("concierge_partner_facilities").insert({
        facility_id: args.facilityId,
        subscription_id: facSubId,
        geo_state: geoState,
        geo_city: geoCity,
        level_of_care: partnerLOC,
        active: true,
        activated_at: new Date().toISOString(),
      });
      if (insErr) {
        result.failed.push({ step: "partner_row_insert", error: insErr.message });
      } else {
        result.partner_rows_inserted++;
      }
    }
  }

  // 5. Concierge INCLUDES Featured exposure: seed featured_placements for the
  //    national homepage + the facility's local state/city + the international
  //    pages. The Phase-0 paywall guard accepts has_concierge_partner (set in
  //    step 1), so these writes are authorized. Idempotent; failures are
  //    non-fatal (core Concierge activation already succeeded).
  {
    const slugify = (s: string): string =>
      s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const featuredSeeds: { type: string; value: string }[] = [
      { type: "homepage", value: "national" },
      { type: "international", value: "global" },
    ];
    if (fac.state && fac.state.trim().length > 0) {
      const stateSlug = slugify(fac.state);
      if (stateSlug.length >= 2 && stateSlug !== "unknown" && stateSlug !== "n-a") {
        featuredSeeds.push({ type: "state", value: stateSlug });
      }
    }
    if (fac.city && fac.city.trim().length > 0) {
      const citySlug = slugify(fac.city);
      if (citySlug.length >= 2 && citySlug !== "unknown" && citySlug !== "n-a") {
        featuredSeeds.push({ type: "city", value: citySlug });
      }
    }
    for (const seed of featuredSeeds) {
      const { data: existingFp } = await supabase
        .from("featured_placements")
        .select("id, active")
        .eq("facility_id", args.facilityId)
        .eq("placement_type", seed.type)
        .eq("placement_value", seed.value)
        .maybeSingle();
      if (existingFp) {
        if ((existingFp as { active: boolean }).active === false) {
          const { error: reErr } = await supabase
            .from("featured_placements")
            .update({
              subscription_id: facSubId,
              active: true,
              activated_at: new Date().toISOString(),
              deactivated_at: null,
            })
            .eq("id", (existingFp as { id: string }).id);
          if (reErr) result.failed.push({ step: `featured_${seed.type}_reactivate`, error: reErr.message });
        }
      } else {
        const { error: insErr } = await supabase.from("featured_placements").insert({
          facility_id: args.facilityId,
          subscription_id: facSubId,
          placement_type: seed.type,
          placement_value: seed.value,
          active: true,
          activated_at: new Date().toISOString(),
        });
        if (insErr) result.failed.push({ step: `featured_${seed.type}_insert`, error: insErr.message });
      }
    }
  }

  return result;
}

export interface DeactivateConciergeResult {
  has_concierge_partner_cleared: boolean;
  partner_rows_deactivated: number;
  failed: { step: string; error: string }[];
}

export async function deactivateConciergePartner(
  supabase: SupabaseClient,
  args: { facilityId?: string; stripeSubscriptionId?: string },
): Promise<DeactivateConciergeResult> {
  const result: DeactivateConciergeResult = {
    has_concierge_partner_cleared: false,
    partner_rows_deactivated: 0,
    failed: [],
  };

  let query = supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_concierge_partner, has_featured");
  if (args.facilityId) {
    query = query.eq("facility_id", args.facilityId);
  } else if (args.stripeSubscriptionId) {
    query = query.eq("concierge_stripe_subscription_id", args.stripeSubscriptionId);
  } else {
    result.failed.push({ step: "lookup_args", error: "either facilityId or stripeSubscriptionId required" });
    return result;
  }
  const { data: facSubRow, error: lookupErr } = await query.maybeSingle();
  if (lookupErr) {
    result.failed.push({ step: "subscription_lookup", error: lookupErr.message });
    return result;
  }
  if (!facSubRow) {
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;
  const hasFeatured = (facSubRow as { has_featured: boolean }).has_featured === true;

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_concierge_partner: false,
      concierge_stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_clear", error: flagErr.message });
  } else {
    result.has_concierge_partner_cleared = true;
  }

  const { data: deactivatedRows, error: partnerErr } = await supabase
    .from("concierge_partner_facilities")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", facSubId)
    .eq("active", true)
    .select("id");
  if (partnerErr) {
    result.failed.push({ step: "partner_rows_deactivate", error: partnerErr.message });
  } else {
    result.partner_rows_deactivated = (deactivatedRows ?? []).length;
  }

  // Concierge activation also seeds featured_placements (homepage/national,
  // international/global, state, city) — its included advertising exposure.
  // Deactivate those on cancel so they stop rotating AND stop counting against
  // placement caps (get_placement_availability counts active rows regardless
  // of the subscription flags). Skip if Featured is (still) active and thus
  // owns the shared rows — mutually exclusive in practice, but guard anyway.
  if (!hasFeatured) {
    const { error: fpErr } = await supabase
      .from("featured_placements")
      .update({ active: false, deactivated_at: new Date().toISOString() })
      .eq("subscription_id", facSubId)
      .eq("active", true);
    if (fpErr) {
      result.failed.push({ step: "featured_placements_deactivate", error: fpErr.message });
    }
  }

  return result;
}

export async function notifyConciergeAddonPartialFailure(
  supabase: SupabaseClient,
  args: {
    eventType: string;
    facilityId?: string;
    stripeSubscriptionId?: string;
    stripeEventId?: string | null;
    result: ActivateConciergeResult | DeactivateConciergeResult;
  },
): Promise<void> {
  if (args.result.failed.length === 0) return;
  try {
    await supabase.from("admin_notifications").insert({
      type: "concierge_addon_partial_failure",
      title: `Concierge add-on sync had ${args.result.failed.length} failure(s)`,
      message:
        `Event ${args.eventType} for facility ${args.facilityId ?? "?"} / sub ${args.stripeSubscriptionId ?? "?"} ` +
        `couldn't fully sync the Concierge partner state. Steps that failed: ` +
        args.result.failed.map((f) => f.step).join(", "),
      metadata: {
        facility_id: args.facilityId ?? null,
        stripe_subscription_id: args.stripeSubscriptionId ?? null,
        stripe_event_id: args.stripeEventId ?? null,
        event_type: args.eventType,
        failures: args.result.failed,
      },
    });
  } catch (err) {
    console.warn("[concierge-addon] admin notification failed", err);
  }
}
