// ============================================================================
// Featured Add-On activation / deactivation — single source of truth.
//
// activateFeaturedAddon:
//   - Flip facility_subscriptions.has_featured=true, store the Featured
//     Stripe sub id on the row keyed on facility_id. CREATES that row as
//     tier='free' when none exists — a Featured-only facility. Featured is
//     independent of Pro: it is advertising, not a Pro entitlement.
//   - Seed featured_placements rows for the facility's geography so the
//     facility appears in homepage / state / city / search rotations on
//     purchase. Treatment-type + insurance slots remain provider-driven
//     via the slot-selector UI (BillingPlacements add-flow).
//   - Re-activate any previously deactivated placements (re-purchase
//     after a cancel/refund).
//
// deactivateFeaturedAddon:
//   - Flip has_featured=false, clear featured_stripe_subscription_id.
//   - Set all featured_placements rows for this subscription to
//     active=false, deactivated_at=now().
//
// Idempotency: both helpers are safe to re-run on Stripe retries.
// has_featured flips are guarded; placement seeding uses upsert
// semantics; deactivation is a WHERE active=true filter.
// ============================================================================

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

interface FacilityRow {
  id: string;
  state: string | null;
  city: string | null;
}

export interface ActivateFeaturedResult {
  has_featured_set: boolean;
  placements_inserted: number;
  placements_reactivated: number;
  // H5: set to the INCOMING Stripe sub id when activation was refused because a
  // DIFFERENT Featured sub is already tracked for this facility (a duplicate
  // purchase within the checkout→webhook window). The caller cancels + refunds
  // this id so the orphaned live sub stops double-charging. null = no duplicate.
  duplicateSubscriptionId: string | null;
  failed: { step: string; error: string }[];
}

// Slugify matches src/lib/featuredBucket.ts so server-side seeds line up
// with the bucket tokens client-side resolveSearchBucket() produces.
function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildSeedPlacements(facility: FacilityRow): { type: string; value: string }[] {
  const out: { type: string; value: string }[] = [];
  // Featured is LOCAL/REGIONAL only — NO homepage/national seed. National +
  // international exposure is reserved for the Concierge Partner upgrade. We
  // seed the facility's own state + city pages, derived from its address.
  // State pool — slugified to match what StatePage queries (stateData.slug)
  // and what AddFeaturedPlacementForm derives, so the paid placement actually
  // applies on the facility's own state page (UPPER(name) never matched the
  // slug-keyed pages).
  if (facility.state && facility.state.trim().length > 0) {
    const stateSlug = slugify(facility.state);
    if (stateSlug.length >= 2 && stateSlug !== "unknown" && stateSlug !== "n-a") {
      out.push({ type: "state", value: stateSlug });
    }
  }
  // City pool — slugified to match the resolveSearchBucket() / CityPage output.
  // Skip empty/junk slugs so misnamed facilities don't share a "" / "unknown"
  // bucket.
  if (facility.city && facility.city.trim().length > 0) {
    const citySlug = slugify(facility.city);
    if (citySlug.length >= 2 && citySlug !== "unknown" && citySlug !== "n-a") {
      out.push({ type: "city", value: citySlug });
    }
  }
  return out;
}

export async function activateFeaturedAddon(
  supabase: SupabaseClient,
  args: {
    facilityId: string;
    stripeSubscriptionId: string;
    currentPeriodEnd: string | null;
  },
): Promise<ActivateFeaturedResult> {
  const result: ActivateFeaturedResult = {
    has_featured_set: false,
    placements_inserted: 0,
    placements_reactivated: 0,
    duplicateSubscriptionId: null,
    failed: [],
  };

  const { data: facSubRow, error: subLookupErr } = await supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_featured, featured_stripe_subscription_id")
    .eq("facility_id", args.facilityId)
    .maybeSingle();
  if (subLookupErr) {
    result.failed.push({ step: "subscription_lookup", error: subLookupErr.message });
    return result;
  }
  // FEATURED-ONLY ACTIVATION.
  // ─────────────────────────
  // No row means this facility has never held Pro — which, since Featured is
  // independent advertising, is a perfectly ordinary Featured purchase. This
  // used to hard-refuse ("Pro upgrade must precede Featured"), so once the
  // checkout gate came off the provider would have been CHARGED by Stripe and
  // received nothing. Create the row instead.
  //
  // tier='free' is explicit and load-bearing: the column has no DEFAULT any
  // more (migration 20260902000000), and has_active_pro() predicates on
  // tier='pro', so this row grants Featured advertising and NOTHING else — no
  // Pro capabilities, no verification, no ranking influence. status='active' is
  // required because get-featured-rotation INNER JOINs this row and filters
  // status='active' before letting a paid placement render.
  //
  // provider_id comes from facilities.user_id — the same owner that
  // create-checkout-session verified before allowing the purchase — rather than
  // from Stripe metadata, so a malformed or absent metadata field cannot strand
  // a paid subscription.
  let facSubId: string;
  if (!facSubRow) {
    const { data: ownerRow, error: ownerErr } = await supabase
      .from("facilities")
      .select("user_id")
      .eq("id", args.facilityId)
      .maybeSingle();
    const ownerId = (ownerRow as { user_id: string | null } | null)?.user_id ?? null;
    if (ownerErr || !ownerId) {
      result.failed.push({
        step: "featured_only_row_create",
        error: ownerErr?.message ?? "facility has no owner; cannot record a Featured-only subscription",
      });
      return result;
    }
    const { data: createdRow, error: createErr } = await supabase
      .from("facility_subscriptions")
      .insert({
        facility_id: args.facilityId,
        provider_id: ownerId,
        // Listing plan stays Free. Advertising is not a tier.
        tier: "free",
        status: "active",
        // No Pro subscription exists, so no Pro Stripe identifiers and no Pro
        // period. The Featured sub's own period is written just below.
        stripe_subscription_id: null,
        price_cents: 0,
        paid_amount_cents: null,
        has_featured: false,
        has_concierge_partner: false,
        started_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
    // A concurrent Stripe retry may have inserted the row first (facility_id is
    // unique). Re-read rather than fail — activation must stay idempotent.
    if (createErr || !createdRow) {
      const { data: raceRow } = await supabase
        .from("facility_subscriptions")
        .select("id")
        .eq("facility_id", args.facilityId)
        .maybeSingle();
      const raceId = (raceRow as { id: string } | null)?.id ?? null;
      if (!raceId) {
        result.failed.push({
          step: "featured_only_row_create",
          error: createErr?.message ?? "insert returned no row",
        });
        return result;
      }
      facSubId = raceId;
    } else {
      facSubId = (createdRow as { id: string }).id;
    }
  } else {
    facSubId = (facSubRow as { id: string }).id;
  }

  // H5 duplicate-purchase orphan guard: Featured is already active on a
  // DIFFERENT Stripe subscription. Overwriting featured_stripe_subscription_id
  // would strand that live sub (untracked, still billing the provider). Keep
  // the existing sub, hand the incoming duplicate back to the caller to cancel
  // + refund, and stop — the existing sub already owns the placements. A re-run
  // for the SAME sub id (Stripe retry) falls through to the idempotent path.
  // A row we just created carries has_featured=false, so this guard is a no-op
  // on the Featured-only path and only fires for a genuine duplicate purchase.
  const existingFeaturedSubId =
    (facSubRow as { featured_stripe_subscription_id: string | null } | null)?.featured_stripe_subscription_id ?? null;
  if (
    (facSubRow as { has_featured?: boolean } | null)?.has_featured === true &&
    existingFeaturedSubId &&
    existingFeaturedSubId !== args.stripeSubscriptionId
  ) {
    result.duplicateSubscriptionId = args.stripeSubscriptionId;
    return result;
  }

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: true,
      featured_stripe_subscription_id: args.stripeSubscriptionId,
      // Persist the add-on sub's own period (it bills independently of Pro).
      featured_current_period_end: args.currentPeriodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_update", error: flagErr.message });
    return result;
  }
  result.has_featured_set = true;

  const { data: facility, error: facErr } = await supabase
    .from("facilities")
    .select("id, state, city")
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

  const seeds = buildSeedPlacements(facility as FacilityRow);

  for (const seed of seeds) {
    const { data: existing } = await supabase
      .from("featured_placements")
      .select("id, active")
      .eq("facility_id", args.facilityId)
      .eq("placement_type", seed.type)
      .eq("placement_value", seed.value)
      .maybeSingle();

    if (existing) {
      const wasInactive = (existing as { active: boolean }).active === false;
      if (wasInactive) {
        const { error: reactErr } = await supabase
          .from("featured_placements")
          .update({
            subscription_id: facSubId,
            active: true,
            activated_at: new Date().toISOString(),
            deactivated_at: null,
          })
          .eq("id", (existing as { id: string }).id);
        if (reactErr) {
          result.failed.push({
            step: `placement_reactivate:${seed.type}:${seed.value}`,
            error: reactErr.message,
          });
        } else {
          result.placements_reactivated++;
        }
      }
      continue;
    }

    const { error: insErr } = await supabase.from("featured_placements").insert({
      facility_id: args.facilityId,
      subscription_id: facSubId,
      placement_type: seed.type,
      placement_value: seed.value,
      active: true,
      activated_at: new Date().toISOString(),
    });
    if (insErr) {
      result.failed.push({
        step: `placement_insert:${seed.type}:${seed.value}`,
        error: insErr.message,
      });
    } else {
      result.placements_inserted++;
    }
  }

  return result;
}

export interface DeactivateFeaturedResult {
  has_featured_cleared: boolean;
  placements_deactivated: number;
  failed: { step: string; error: string }[];
}

export async function deactivateFeaturedAddon(
  supabase: SupabaseClient,
  args: { facilityId?: string; stripeSubscriptionId?: string },
): Promise<DeactivateFeaturedResult> {
  const result: DeactivateFeaturedResult = {
    has_featured_cleared: false,
    placements_deactivated: 0,
    failed: [],
  };

  let query = supabase
    .from("facility_subscriptions")
    .select("id, facility_id, has_featured, has_concierge_partner");
  if (args.facilityId) {
    query = query.eq("facility_id", args.facilityId);
  } else if (args.stripeSubscriptionId) {
    query = query.eq("featured_stripe_subscription_id", args.stripeSubscriptionId);
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
  const hasConcierge = (facSubRow as { has_concierge_partner: boolean }).has_concierge_partner === true;

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: false,
      featured_stripe_subscription_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", facSubId);
  if (flagErr) {
    result.failed.push({ step: "flag_clear", error: flagErr.message });
  } else {
    result.has_featured_cleared = true;
  }

  // Concierge Partner is the mutually-exclusive upgrade that INCLUDES Featured
  // exposure and OWNS the shared featured_placements rows (homepage/national,
  // international, state, city) for this subscription. When Featured is being
  // retired BECAUSE Concierge superseded it, the Featured Stripe sub's
  // subscription.deleted event must NOT deactivate those placements — Concierge
  // still needs them. Only deactivate when Concierge is not (also) active.
  if (hasConcierge) {
    return result;
  }

  const { data: deactivatedRows, error: placeErr } = await supabase
    .from("featured_placements")
    .update({ active: false, deactivated_at: new Date().toISOString() })
    .eq("subscription_id", facSubId)
    .eq("active", true)
    .select("id");
  if (placeErr) {
    result.failed.push({ step: "placement_deactivate", error: placeErr.message });
  } else {
    result.placements_deactivated = (deactivatedRows ?? []).length;
  }

  return result;
}

export async function notifyFeaturedAddonPartialFailure(
  supabase: SupabaseClient,
  args: {
    eventType: string;
    facilityId?: string;
    stripeSubscriptionId?: string;
    stripeEventId?: string | null;
    result: ActivateFeaturedResult | DeactivateFeaturedResult;
  },
): Promise<void> {
  if (args.result.failed.length === 0) return;
  try {
    await supabase.from("admin_notifications").insert({
      type: "featured_addon_partial_failure",
      title: `Featured add-on sync had ${args.result.failed.length} failure(s)`,
      message:
        `Event ${args.eventType} for facility ${args.facilityId ?? "?"} / sub ${args.stripeSubscriptionId ?? "?"} ` +
        `couldn't fully sync the Featured add-on state. Steps that failed: ` +
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
    console.warn("[featured-addon] admin notification failed", err);
  }
}
