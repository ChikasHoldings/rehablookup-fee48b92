// ============================================================================
// Featured Add-On activation / deactivation — single source of truth.
//
// activateFeaturedAddon:
//   - Flip facility_subscriptions.has_featured=true, store the Featured
//     Stripe sub id alongside the canonical (Pro) row keyed on facility_id.
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
  // National homepage pool — `"national"` matches the token used by
  // src/pages/Index.tsx and src/lib/featuredBucket.ts.
  out.push({ type: "homepage", value: "national" });
  // State pool — only seed if state matches a US 2-letter code OR
  // a longer US state name string (defensive against junk data).
  // Round-31 audit: validate format so we don't pollute the state
  // bucket with garbage placement_values.
  if (facility.state && facility.state.trim().length > 0) {
    const stateTrimmed = facility.state.trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(stateTrimmed) || /^[A-Z][A-Z\s.-]{1,30}$/.test(stateTrimmed)) {
      out.push({ type: "state", value: stateTrimmed });
    }
  }
  // City pool — slugified to match the resolveSearchBucket() output.
  // Round-31 audit: skip if the slug is empty after sanitization
  // (e.g. city="!!!" or "(Unknown)" → after sanitization could be
  // empty or "unknown"). Empty slug would pollute the city bucket
  // with a "" key. Also skip the literal "unknown" so misnamed
  // facilities don't all share a placement bucket.
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
  if (!facSubRow) {
    result.failed.push({
      step: "subscription_lookup",
      error: "no facility_subscriptions row exists; Pro upgrade must precede Featured",
    });
    return result;
  }

  const facSubId = (facSubRow as { id: string }).id;

  const { error: flagErr } = await supabase
    .from("facility_subscriptions")
    .update({
      has_featured: true,
      featured_stripe_subscription_id: args.stripeSubscriptionId,
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
    .select("id, facility_id, has_featured");
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
