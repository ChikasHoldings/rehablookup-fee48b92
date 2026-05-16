import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getOrCreateRotationSeed } from "@/lib/featuredSeed";

export type PlacementType =
  | "homepage" | "state" | "city" | "search"
  | "near_me" | "treatment" | "insurance" | "article";

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
}

interface FeaturedRotationResult {
  facilities: FeaturedRotationFacility[];
  pool_size: number;
  seed: number;
}

/**
 * Pulls the rotated subset of eligible Featured facilities for one
 * placement bucket. Uses the visitor's `rl_rot_seed` cookie so refresh
 * doesn't shuffle the cards; sees a deterministic slice of the pool.
 *
 * Returns an empty `facilities` list when:
 *   • the bucket has no eligible subscribers (silent absence is the
 *     designed empty state — don't render a placeholder)
 *   • the placement_value is falsy (the caller hasn't resolved it yet,
 *     e.g. on a /[loc]-near-me page before geo-IP completes)
 */
export function useFeaturedRotation(args: {
  placement_type: PlacementType;
  placement_value: string | null | undefined;
  slot_count: number;
}) {
  const seed = useMemo(() => getOrCreateRotationSeed(), []);
  const pagePath = typeof window !== "undefined" ? window.location.pathname : null;

  return useQuery({
    queryKey: [
      "featured-rotation",
      args.placement_type,
      args.placement_value,
      args.slot_count,
      seed,
    ],
    queryFn: async (): Promise<FeaturedRotationResult> => {
      if (!args.placement_value) {
        return { facilities: [], pool_size: 0, seed };
      }
      const { data, error } = await supabase.functions.invoke("get-featured-rotation", {
        body: {
          placement_type: args.placement_type,
          placement_value: args.placement_value,
          slot_count: args.slot_count,
          seed,
          page_path: pagePath,
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
