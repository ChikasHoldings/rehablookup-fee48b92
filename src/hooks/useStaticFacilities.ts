import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useFeaturedFacilityIds } from "./useApprovedFacilities";
import type { TreatmentCenter } from "@/data/treatmentCenters";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPublicFacilitiesSnapshot,
  getCachedPublicFacilitiesSnapshot,
  type PublicFacilitySnapshot,
} from "@/lib/publicFacilitiesSnapshot";

/**
 * React-Query key for the public facility snapshot. Exposed so admin
 * approval flows can manually invalidate without recreating the constant.
 */
export const PUBLIC_FACILITIES_QUERY_KEY = ["static-public-facilities"] as const;

const REALTIME_INVALIDATION_DEBOUNCE_MS = 1500;

export type StaticFacility = PublicFacilitySnapshot;

export interface PublicFacility extends TreatmentCenter {
  slug: string | null;
  isFromDatabase: boolean;
  logo_url: string | null;
  gallery_urls: string[] | null;
  isPro?: boolean;
  isClaimed?: boolean;
  verified?: boolean | null;
  year_established?: number | null;
  facilityType?: string | null;
  bedCount?: string | null;
  genderServed?: string | null;
  calculatedRankingScore?: number;
  listingCompletenessScore?: number;
  responseRateScore?: number;
  acceptingAdmissions?: boolean | null;
  hoursOfOperation?: string | null;
  languagesSpoken?: string[];
  accessibilityFeatures?: string[];
  featuredPinned?: boolean;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  email?: string | null;
  website?: string | null;
  planTier?: "pro" | "free";
}

/**
 * Hook to fetch public facilities from static edge function.
 *
 * Freshness story (post-2026-05-21):
 *  - React Query: 5-min staleTime, refetch on remount/window-focus.
 *  - Edge function CDN: 2-min s-maxage with 1-hour stale-while-revalidate.
 *  - Realtime: subscribes to `facilities`, `facility_services`,
 *    `facility_insurance` and invalidates the query (debounced 1.5s) the
 *    moment a row changes status or a join table updates. Means a freshly
 *    approved facility surfaces in the search UI without a page reload.
 *  - localStorage cache: schema-versioned so post-deploy cache entries
 *    that don't carry the new column shape are automatically discarded.
 *
 * The combination means worst-case lag from "admin approves facility" to
 * "facility visible at /search-results" is ~2 min (for first-time visitors
 * hitting the CDN) and effectively instant for any visitor with the page
 * open.
 */
export const useStaticFacilities = () => {
  const queryClient = useQueryClient();
  const { data: featuredData, isLoading: isFeaturedLoading } = useFeaturedFacilityIds();
  // `proFacilityIds` is deliberately NOT read here. Pro comes from the
  // snapshot's canonical `isPro` (public_facilities.is_pro). Only the
  // homepage rotation ids are a legitimate consumer of this endpoint.
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  const query = useQuery({
    queryKey: PUBLIC_FACILITIES_QUERY_KEY,
    queryFn: fetchPublicFacilitiesSnapshot,
    placeholderData: getCachedPublicFacilitiesSnapshot,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Realtime invalidation. Per-instance channel name + try/catch on both
  // setup and cleanup. RESTORED 2026-05-21 after the useFavorites channel-
  // collision incident — neither this nor useGAInternalTrafficFlag was the
  // actual cause of that outage. Pattern matches the fix applied to
  // useFavorites: unique per-mount channel name so Supabase Realtime's
  // channel cache can't collide when multiple `useStaticFacilities`
  // consumers mount (which happens routinely — SearchResults, RehabCenters,
  // CenterProfile, near-me pages all use it).
  const invalidateTimer = useRef<number | null>(null);
  const channelIdRef = useRef<string>(
    `public-facilities-realtime-${Math.random().toString(36).slice(2, 10)}`,
  );
  useEffect(() => {
    const scheduleInvalidate = () => {
      if (typeof window === "undefined") return;
      if (invalidateTimer.current !== null) {
        window.clearTimeout(invalidateTimer.current);
      }
      invalidateTimer.current = window.setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: PUBLIC_FACILITIES_QUERY_KEY });
        invalidateTimer.current = null;
      }, REALTIME_INVALIDATION_DEBOUNCE_MS);
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    try {
      channel = supabase
        .channel(channelIdRef.current)
        .on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "facilities" } as never,
          scheduleInvalidate as never,
        )
        .on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "facility_services" } as never,
          scheduleInvalidate as never,
        )
        .on(
          "postgres_changes" as never,
          { event: "*", schema: "public", table: "facility_insurance" } as never,
          scheduleInvalidate as never,
        )
        .subscribe();
    } catch (err) {
      console.warn("[useStaticFacilities] realtime subscribe failed; falling back to polling", err);
      channel = null;
    }

    return () => {
      if (invalidateTimer.current !== null) {
        try { window.clearTimeout(invalidateTimer.current); } catch { /* noop */ }
        invalidateTimer.current = null;
      }
      if (channel) {
        try { supabase.removeChannel(channel); } catch { /* noop */ }
      }
    };
  }, [queryClient]);

  // Transform static facilities to PublicFacility format with Pro data
  const publicFacilities: PublicFacility[] = (query.data || []).map((facility) => {
    // CANONICAL PRO, FAIL CLOSED.
    //
    // The snapshot's `isPro` comes from `public_facilities.is_pro`, i.e.
    // has_active_pro(id) — the single definition of Pro. This was
    // `facility.isPro || proIds.includes(facility.id)`, described as a
    // "redundant safety net". It was not redundant: a union can only ever
    // ADD Pro, so a secondary list could elevate a facility the canonical
    // projection says is NOT Pro, and Pro unlocks the public phone. The
    // legacy list carried no tier predicate at all, so the "safety net"
    // was a path for any active subscription to buy Pro product features.
    //
    // `=== true` rather than a truthiness test so a null/undefined column
    // (an older cached snapshot shape) reads as not-Pro instead of being
    // coerced by a later refactor.
    const isPro = facility.isPro === true;
    const isHomepageFeatured = homepageFeaturedIds.includes(facility.id);
    const planTier: "pro" | "free" = isPro ? "pro" : "free";

    return {
      id: facility.id,
      name: facility.name,
      slug: facility.slug,
      city: facility.city,
      state: facility.state,
      zipCode: facility.zipCode,
      address: facility.address,
      phone: facility.phone ?? "",
      // Defensive defaults: the edge function already coerces these to []
      // via `servicesMap.get(f.id) || []`, but cards across the codebase
      // call .slice() / .length / .map() on these without their own null
      // guards. A single old-shape JSON in localStorage cache (pre-schema
      // bump) or a transient edge fn shape change would otherwise crash
      // every listing card on the page.
      treatmentTypes: facility.treatmentTypes ?? [],
      insuranceAccepted: facility.insuranceAccepted ?? [],
      description: facility.description || "Treatment center offering quality care and support.",
      programOverview: facility.description || "Comprehensive treatment programs tailored to individual needs.",
      // PRO IS NOT FEATURED, AND THE CATALOG BOOLEAN IS NOT AN ENTITLEMENT.
      //
      // This was `facility.featured || isPro`. The `|| isPro` half made every
      // $99 Pro subscriber display a Featured badge and count as Featured
      // inventory. The remaining half is the raw `facilities.featured` catalog
      // column — which is the very flag the retired pro-benefits Pro
      // activation wrote, so it cannot be read back as proof of a Featured
      // purchase. Production's two surviving rows have no facility_subscription,
      // no featured_placement and no audit trail covering when they were set.
      //
      // Paid Featured is featured_placements + facility_subscriptions.
      // has_featured, served by get-featured-rotation into the separately
      // labeled Featured rail, which sets its own badge. Organic cards from
      // this hook claim no paid placement. B3 defines the canonical
      // representation and decides whether a per-card signal returns.
      featured: false,
      featuredPinned: facility.featuredPinned,
      isPro,
      isClaimed: facility.isClaimed,
      isHomepageFeatured,
      planTier,
      verified: facility.verified,
      year_established: facility.yearEstablished,
      facilityType: facility.facilityType,
      bedCount: facility.bedCount,
      genderServed: facility.genderServed,
      calculatedRankingScore: facility.calculatedRankingScore,
      listingCompletenessScore: facility.listingCompletenessScore,
      responseRateScore: facility.responseRateScore,
      acceptingAdmissions: facility.acceptingAdmissions,
      hoursOfOperation: facility.hoursOfOperation,
      languagesSpoken: facility.languagesSpoken ?? [],
      accessibilityFeatures: facility.accessibilityFeatures ?? [],
      email: facility.email,
      website: facility.website,
      rating: null,
      reviewCount: 0,
      amenities: [],
      image: null,
      isFromDatabase: true,
      logo_url: facility.logoUrl,
      gallery_urls: facility.galleryUrls ?? [],
      googleRating: facility.googleRating,
      googleReviewCount: facility.googleReviewCount,
    };
  });

  return {
    data: publicFacilities,
    isLoading: query.isLoading,
    isFetching: query.isFetching || isFeaturedLoading,
    error: query.error,
    refetch: query.refetch,
  };
};
