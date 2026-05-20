import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { FeaturedTooltip } from "./FeaturedTooltip";
import {
  useGeoTargetedFeatured,
  type GeoTier,
} from "@/hooks/useGeoTargetedFeatured";
import { useLogFeaturedPhoneClick } from "@/hooks/useFeaturedRotation";
import { getStateName } from "@/lib/proximitySearch";

/**
 * Fully geo-aware Featured rail for the homepage.
 *
 * Works generically across ALL 50 US states + DC — never hard-coded
 * to specific states. A visitor anywhere in the US sees the most-
 * relevant paid Featured pool available, with a graceful fallback
 * ladder.
 *
 * Tier resolution (delegated to useGeoTargetedFeatured):
 *
 *   tier='state'    — visitor's exact state has ≥1 paid Featured.
 *                     Section title reflects the state name.
 *
 *   tier='nearby'   — exact state empty, but ≥1 adjacent state has
 *                     paid Featured. Section pulls the union of all
 *                     adjacent-state pools, dedupes by facility_id,
 *                     seed-shuffles, and caps at slot_count. Title
 *                     mentions "near you".
 *
 *   tier='national' — both state + nearby pools empty, but the
 *                     national bucket has paid subscribers. Rare —
 *                     national opt-in is intentional (a facility
 *                     paying for nationwide exposure).
 *
 *   tier='empty'    — no paid Featured anywhere. Section silently
 *                     hides per the 2026-05-20 "no backfill with
 *                     non-Featured" policy.
 *
 *   tier='loading'  — initial render while any tier query is still
 *                     resolving. Hide until settled to avoid layout
 *                     shift.
 *
 * The geo-tier resolution uses the canonical adjacency map from
 * lib/proximitySearch.ts (`nearbyStates`), which has full 50-state
 * coverage. Tier 1 / 1.5 queries run in parallel — the tier
 * decision is made AFTER all results settle.
 */
export function HomepageGeoFeaturedRail() {
  const { facilities, tier, matched_states } = useGeoTargetedFeatured({
    slot_count: 6,
  });

  // useLogFeaturedPhoneClick is keyed by (placement_type, placement_value)
  // so the analytics correctly attribute the click to the bucket that
  // produced the impression. For the 'nearby' tier where multiple states
  // contributed, attribute to the first matched state (the most-relevant
  // adjacent one in the canonical adjacency map).
  const attributionType = tier === "nearby" ? "state" : tier === "state" ? "state" : "homepage";
  const attributionValue =
    tier === "nearby" ? (matched_states[0] ?? "national") :
    tier === "state" ? (matched_states[0] ?? "national") :
    "national";

  const logClick = useLogFeaturedPhoneClick({
    placement_type: attributionType,
    placement_value: attributionValue,
  });

  if (tier === "loading") return null;
  if (tier === "empty" || facilities.length === 0) return null;

  const title = computeTitle(tier, matched_states);

  return (
    <section className="pt-1 pb-10 md:pt-2 md:pb-12 bg-background" aria-label="Featured facilities">
      <div className="container px-4 md:px-6 lg:px-8">
        <header className="mb-3 flex items-center gap-1.5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-600">
            {title}
          </h2>
          <FeaturedTooltip />
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f) => {
            const center = {
              id: f.facility_id,
              name: f.name,
              slug: f.slug,
              city: f.city,
              state: f.state,
              zipCode: "",
              address: "",
              phone: f.display_phone ?? "",
              description: f.sponsored_tagline ?? f.description ?? "",
              programOverview: "",
              featured: true,
              rating: null,
              reviewCount: 0,
              amenities: [],
              image: null,
              isFromDatabase: true,
              logo_url: f.logo_url,
              verified: f.verified,
              facilityType: f.facility_type,
              treatmentTypes: f.top_levels_of_care ?? [],
              insuranceAccepted: f.top_insurance ?? [],
              hasFeaturedSubscription: true,
              isPro: true,
            } as Parameters<typeof TreatmentCenterCard>[0]["center"];
            return (
              <div
                key={f.facility_id}
                data-cta-location={`featured_rail_${tier}`}
                onClickCapture={() => logClick(f.facility_id)}
              >
                <TreatmentCenterCard center={center} featured />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function computeTitle(tier: GeoTier, matched_states: string[]): string {
  if (tier === "state" && matched_states.length > 0) {
    const name = getStateName(matched_states[0]);
    return name ? `Featured facilities in ${name}` : "Featured facilities";
  }
  if (tier === "nearby") {
    if (matched_states.length === 1) {
      const name = getStateName(matched_states[0]);
      return name ? `Featured facilities near you (${name})` : "Featured facilities near you";
    }
    return "Featured facilities near you";
  }
  if (tier === "national") {
    return "Nationwide Featured facilities";
  }
  return "Featured facilities";
}
