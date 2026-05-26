import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateRotationSeed } from "@/lib/featuredSeed";

export type PlacementType =
  | "homepage" | "state" | "city" | "search"
  | "near_me" | "treatment" | "insurance" | "international" | "article";

export interface FeaturedRotationFacility {
  facility_id: string;
  slug: string | null;
  name: string;
  city: string;
  state: string;
  facility_type: string | null;
  description: string | null;
  logo_url: string | null;
  verified: boolean | null;
  /** Resolved display phone: verified_phone if has_facility_verified_contact
   *  is true on the facility, otherwise the standard public phone. */
  display_phone: string | null;
  position_in_rail: number;
  /** Optional 120-char tagline the facility set in their dashboard.
   *  NULL means the renderer should auto-generate one from
   *  top_levels_of_care + top_insurance. */
  sponsored_tagline?: string | null;
  /** Top 3 levels of care, sorted by the canonical continuum
   *  (Detox → Inpatient → PHP → IOP → Outpatient). Strip card uses
   *  these; the legacy rail ignores them. */
  top_levels_of_care?: string[];
  /** Top 3 insurance carriers, alphabetical. Strip card uses these. */
  top_insurance?: string[];
}

interface FeaturedRotationResult {
  facilities: FeaturedRotationFacility[];
  pool_size: number;
  seed: number;
  /** True when no paid Featured subscribers covered the bucket and
   *  the edge function fell back to top-rated approved facilities.
   *  Clients use this to relabel the section ("Top-Rated" not
   *  "Featured") so the paid/organic line stays honest. */
  is_fallback?: boolean;
}

/**
 * Pulls the rotated subset of eligible Featured facilities for one
 * placement bucket. Uses the visitor's `rl_rot_seed` cookie so refresh
 * doesn't shuffle the cards; sees a deterministic slice of the pool.
 *
 * Returns an empty `facilities` list when:
 *   • the bucket has no eligible subscribers AND fallback is disabled
 *   • the placement_value is falsy (the caller hasn't resolved it yet,
 *     e.g. on a /[loc]-near-me page before geo-IP completes)
 *
 * `fallback_to_top_rated` (default false) tells the edge function to
 * return top-rated approved facilities matching the bucket when the
 * paid pool is empty, so the section always has something to render.
 * The returned `is_fallback` flag flips when this path is hit.
 *
 * `log_impressions` defaults to true (legacy rail behavior — server
 * logs one impression per facility returned). The FeaturedStrip
 * passes false because it logs per-card via IntersectionObserver in
 * useLogFeaturedStripImpression instead.
 */
export function useFeaturedRotation(args: {
  placement_type: PlacementType;
  placement_value: string | null | undefined;
  slot_count: number;
  log_impressions?: boolean;
  fallback_to_top_rated?: boolean;
}) {
  const seed = useMemo(() => getOrCreateRotationSeed(), []);
  const pagePath = typeof window !== "undefined" ? window.location.pathname : null;
  const logImpressions = args.log_impressions ?? true;
  const fallback = args.fallback_to_top_rated ?? false;

  return useQuery({
    queryKey: [
      "featured-rotation",
      args.placement_type,
      args.placement_value,
      args.slot_count,
      seed,
      logImpressions,
      fallback,
    ],
    queryFn: async (): Promise<FeaturedRotationResult> => {
      if (!args.placement_value) {
        return { facilities: [], pool_size: 0, seed, is_fallback: false };
      }
      const { data, error } = await supabase.functions.invoke("get-featured-rotation", {
        body: {
          placement_type: args.placement_type,
          placement_value: args.placement_value,
          slot_count: args.slot_count,
          seed,
          page_path: pagePath,
          log_impressions: logImpressions,
          fallback_to_top_rated: fallback,
        },
      });
      if (error) throw error;
      return data as FeaturedRotationResult;
    },
    enabled: !!args.placement_value,
    staleTime: 1000 * 60 * 5, // match the edge function's 5min cache window
    refetchOnWindowFocus: false,
  });
}

/**
 * Fire-and-forget Featured phone-click logger. Called by the rail's
 * Call CTA. Returns a stable callback that never throws and never
 * blocks the dialer — even if the network is down, the dialer opens.
 */
export function useLogFeaturedPhoneClick(args: {
  placement_type: PlacementType;
  placement_value: string;
}) {
  return (facility_id: string) => {
    if (typeof window === "undefined") return;
    const pagePath = window.location.pathname;
    const seed = getOrCreateRotationSeed();
    // Fire-and-forget. Errors are swallowed; the dialer is opening
    // natively in parallel via the tel: link.
    supabase.functions
      .invoke("log-phone-click", {
        body: {
          facility_id,
          placement_type: args.placement_type,
          placement_value: args.placement_value,
          page_path: pagePath,
          visitor_seed: seed,
        },
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[log-phone-click] failed", err);
      });
  };
}

/**
 * Fire-and-forget FeaturedStrip impression logger. Called by each
 * FeaturedStripCard when IntersectionObserver confirms the card has
 * been ≥50% visible for ≥500ms. Once per card per page view —
 * debouncing is the card's responsibility.
 *
 * Uses fetch + keepalive (not supabase.functions.invoke) so the log
 * survives page navigation triggered by the user tapping a card link.
 */
export function useLogFeaturedStripImpression(args: {
  placement_type: PlacementType;
  placement_value: string;
}) {
  return (facility_id: string, position_in_strip: number) => {
    if (typeof window === "undefined") return;
    const pagePath = window.location.pathname;
    const seed = getOrCreateRotationSeed();
    supabase.functions
      .invoke("log-strip-impression", {
        body: {
          facility_id,
          placement_type: args.placement_type,
          placement_value: args.placement_value,
          page_path: pagePath,
          visitor_seed: seed,
          position_in_strip,
        },
      })
      .catch((err) => {
        if (import.meta.env.DEV) console.warn("[log-strip-impression] failed", err);
      });
  };
}
