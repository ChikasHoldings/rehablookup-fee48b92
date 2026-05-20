import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useFeaturedRotation } from "@/hooks/useFeaturedRotation";
import { FeaturedRail } from "./FeaturedRail";

/**
 * Geo-targeted Featured rail for the homepage.
 *
 * 2026-05-20 policy:
 *   - NY visitors see NY-paid Featured only
 *   - CA visitors see CA-paid Featured only
 *   - Visitors with unresolved geo (loading, opt-out, non-US, error)
 *     fall back to the homepage:national bucket
 *   - When the visitor's state has zero paid subscribers AND the
 *     national bucket also has zero paid subscribers, the entire
 *     section silently hides (no editorial / non-Featured backfill)
 *
 * Behavior tiers (first non-empty wins):
 *   tier 1 — placement_type="state", placement_value=<visitor regionCode>
 *   tier 2 — placement_type="homepage", placement_value="national"
 *   tier 3 — hide entirely
 *
 * The two-tier query pattern is intentional: paid Featured pools are
 * typically very state-specific (a Texas facility's add-on only
 * surfaces in TX), so the state-first lookup gets the highest-CTR
 * placement. National-bucket subscribers (rare for now) get
 * fallback exposure when the visitor isn't in any state pool. If a
 * future EKRA-compliant variant lets us infer multi-state surfacing,
 * extend by adding nearby-states tier 1.5.
 */
export function HomepageGeoFeaturedRail() {
  const geo = useGeoLocation();
  const isUSWithState = geo.isUS && !!geo.regionCode && !geo.isLoading;
  const visitorState = isUSWithState ? geo.regionCode.toUpperCase() : null;

  // Tier 1: visitor's state. Only enabled when state is known.
  const stateBucket = useFeaturedRotation({
    placement_type: "state",
    placement_value: visitorState,
    slot_count: 6,
    log_impressions: true,
  });

  // Tier 2: national bucket. Always enabled — runs in parallel with
  // tier 1 so we don't pay a serial round-trip when tier 1 is empty.
  const nationalBucket = useFeaturedRotation({
    placement_type: "homepage",
    placement_value: "national",
    slot_count: 6,
    log_impressions: true,
  });

  // Pick the first non-empty tier. While either query is still
  // loading we render nothing — the FeaturedRail itself handles
  // is-empty + loading internally, but we want the tier decision to
  // be made AFTER both queries settle so we don't briefly show
  // national then flip to state.
  if (stateBucket.isLoading || nationalBucket.isLoading) {
    return null;
  }

  const stateFacilities = stateBucket.data?.facilities ?? [];
  const nationalFacilities = nationalBucket.data?.facilities ?? [];

  // Tier 1 hit
  if (stateFacilities.length > 0 && visitorState) {
    return (
      <section className="pt-1 pb-10 md:pt-2 md:pb-12 bg-background">
        <div className="container px-4 md:px-6 lg:px-8">
          <FeaturedRail
            placement_type="state"
            placement_value={visitorState}
            title={`Featured facilities in ${visitorState}`}
          />
        </div>
      </section>
    );
  }

  // Tier 2 hit
  if (nationalFacilities.length > 0) {
    return (
      <section className="pt-1 pb-10 md:pt-2 md:pb-12 bg-background">
        <div className="container px-4 md:px-6 lg:px-8">
          <FeaturedRail
            placement_type="homepage"
            placement_value="national"
          />
        </div>
      </section>
    );
  }

  // Tier 3 — silent absence. Per policy: NO backfill with non-Featured.
  return null;
}
