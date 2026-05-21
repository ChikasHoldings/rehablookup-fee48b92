import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getNearbyStates } from "@/lib/proximitySearch";
import { getOrCreateRotationSeed } from "@/lib/featuredSeed";
import type {
  FeaturedRotationFacility,
  PlacementType,
} from "@/hooks/useFeaturedRotation";

export type GeoTier = "state" | "nearby" | "national" | "empty" | "loading";

export interface GeoTargetedFeaturedResult {
  facilities: FeaturedRotationFacility[];
  pool_size: number;
  tier: GeoTier;
  /** When tier='state' or 'nearby', the state abbr(s) the pool covers. */
  matched_states: string[];
  /** True while any of the tier queries are still resolving. */
  isLoading: boolean;
}

interface RotationResponse {
  facilities: FeaturedRotationFacility[];
  pool_size: number;
  seed: number;
}

async function fetchRotation(
  placement_type: PlacementType,
  placement_value: string,
  slot_count: number,
  seed: number,
  pagePath: string | null,
): Promise<RotationResponse> {
  const { data, error } = await supabase.functions.invoke("get-featured-rotation", {
    body: {
      placement_type,
      placement_value,
      slot_count,
      seed,
      page_path: pagePath,
      // The geo-targeted hook is the single source of truth for the
      // "no backfill with non-Featured" policy — fallback_to_top_rated
      // is hard-pinned to false here. Callers wanting organic backfill
      // should use useFeaturedRotation directly with the toggle.
      log_impressions: true,
      fallback_to_top_rated: false,
    },
  });
  if (error) throw error;
  return data as RotationResponse;
}

/**
 * Geo-tier Featured pool resolver for any non-geo-bound surface
 * (homepage, article, insurance, treatment-hub, search-results without
 * state filter, etc.).
 *
 * Works generically for ALL 50 US states + DC — never special-cased
 * to any specific state. Tier resolution:
 *
 *   tier='state'    — visitor's exact state has ≥1 paid Featured;
 *                     uses placement_type='state' + visitor regionCode.
 *                     Example: WI visitor lands on /, sees WI-paid
 *                     Featured (and equivalently for any other state).
 *
 *   tier='nearby'   — exact state empty, but ≥1 adjacent state has
 *                     paid Featured. Pulls in parallel from each
 *                     adjacent state, dedupes by facility_id, takes
 *                     the seed-based shuffle of the union, caps at
 *                     slot_count. nearbyStates is the canonical
 *                     adjacency map from lib/proximitySearch
 *                     (covers all 50 states).
 *                     Example: WY visitor with no WY-paid Featured
 *                     gets a mix of ID/MT/CO/UT/NE/SD paid Featured.
 *
 *   tier='national' — both state + nearby pools empty, but
 *                     placement_type='homepage' + 'national' bucket
 *                     has paid subscribers. National opt-in is rare
 *                     but explicit — it's the catch-all for
 *                     facilities that pay for nationwide exposure.
 *
 *   tier='empty'    — no paid Featured anywhere. Caller hides the
 *                     section (per 2026-05-20 "no backfill with
 *                     non-Featured" policy).
 *
 *   tier='loading'  — initial render while any tier query is still
 *                     resolving. Treat as 'hide' until settled to
 *                     avoid layout-shift flips between tiers.
 *
 * All tier queries run in parallel via useQueries — the tier decision
 * is made AFTER all settle so the user never sees a "national → state
 * → nearby" flip mid-paint. Server-side caching at the edge function
 * (5min staleTime) means the same nearby-states fan-out for a given
 * visitor state hits cache after the first query in the cluster.
 *
 * NOTE: this hook is the "general geo-aware Featured pool" — it is
 * NOT for pages that already have inherent geo context (StatePage,
 * CityPage, near-me variants). Those pages should keep using
 * useFeaturedRotation directly with placement_value bound to the URL
 * context, since the URL already implies the geo scope.
 */
export function useGeoTargetedFeatured(args: {
  slot_count: number;
}): GeoTargetedFeaturedResult {
  const geo = useGeoLocation();
  const seed = useMemo(() => getOrCreateRotationSeed(), []);
  const pagePath = typeof window !== "undefined" ? window.location.pathname : null;

  const isUSWithState = geo.isUS && !!geo.regionCode && !geo.isLoading;
  const visitorState = isUSWithState ? geo.regionCode.toUpperCase() : null;
  const nearby = useMemo(
    () => (visitorState ? getNearbyStates(visitorState) : []),
    [visitorState],
  );

  // Build the list of (type, value) tuples to query. We query the
  // visitor's state, every nearby state, AND the national bucket in
  // parallel so the tier decision is one round-trip not three.
  const queries = useMemo(() => {
    const q: Array<{ type: PlacementType; value: string }> = [];
    if (visitorState) q.push({ type: "state", value: visitorState });
    for (const s of nearby) q.push({ type: "state", value: s });
    q.push({ type: "homepage", value: "national" });
    return q;
  }, [visitorState, nearby]);

  const results = useQueries({
    queries: queries.map((q) => ({
      queryKey: [
        "geo-featured-rotation",
        q.type,
        q.value,
        args.slot_count,
        seed,
      ],
      queryFn: () => fetchRotation(q.type, q.value, args.slot_count, seed, pagePath),
      staleTime: 1000 * 60 * 5, // mirror edge-fn cache
      refetchOnWindowFocus: false,
    })),
  });

  const isLoading = results.some((r) => r.isLoading);
  if (isLoading) {
    return {
      facilities: [],
      pool_size: 0,
      tier: "loading",
      matched_states: [],
      isLoading: true,
    };
  }

  // Walk the tier ladder. The query order matches `queries` above:
  //   [0]                 — visitor's exact state (if known)
  //   [1 .. nearby.length] — nearby states
  //   [last]              — national bucket
  let stateIdx = 0;
  if (visitorState) {
    const ex = results[stateIdx]?.data;
    if (ex && ex.facilities.length > 0) {
      return {
        facilities: ex.facilities,
        pool_size: ex.pool_size,
        tier: "state",
        matched_states: [visitorState],
        isLoading: false,
      };
    }
    stateIdx++;
  }

  // Nearby states — union the pools, dedupe by facility_id, seed-shuffle.
  if (nearby.length > 0) {
    const nearbyResults = results.slice(stateIdx, stateIdx + nearby.length);
    const seen = new Set<string>();
    const merged: FeaturedRotationFacility[] = [];
    const hitStates: string[] = [];
    nearbyResults.forEach((r, i) => {
      const facs = r.data?.facilities ?? [];
      if (facs.length > 0) hitStates.push(nearby[i]);
      for (const f of facs) {
        if (seen.has(f.facility_id)) continue;
        seen.add(f.facility_id);
        merged.push(f);
      }
    });
    if (merged.length > 0) {
      // Seed-shuffle the union so visitors see consistent ordering
      // across reloads. Use the same seed the edge fn uses internally.
      const shuffled = [...merged];
      let cur = seed;
      for (let i = shuffled.length - 1; i > 0; i--) {
        cur = (cur * 1103515245 + 12345) & 0x7fffffff;
        const j = cur % (i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      return {
        facilities: shuffled.slice(0, args.slot_count).map((f, i) => ({
          ...f,
          position_in_rail: i,
        })),
        pool_size: merged.length,
        tier: "nearby",
        matched_states: hitStates,
        isLoading: false,
      };
    }
  }

  // National fallback
  const nat = results[results.length - 1]?.data;
  if (nat && nat.facilities.length > 0) {
    return {
      facilities: nat.facilities,
      pool_size: nat.pool_size,
      tier: "national",
      matched_states: [],
      isLoading: false,
    };
  }

  // tier='empty' — caller hides the section. No backfill.
  return {
    facilities: [],
    pool_size: 0,
    tier: "empty",
    matched_states: [],
    isLoading: false,
  };
}
