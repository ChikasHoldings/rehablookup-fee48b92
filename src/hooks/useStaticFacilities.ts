import { useQuery } from "@tanstack/react-query";

import { useFeaturedFacilityIds } from "./useApprovedFacilities";
import type { TreatmentCenter } from "@/data/treatmentCenters";
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
  const { data: featuredData, isLoading: isFeaturedLoading } = useFeaturedFacilityIds();
  const proIds = featuredData?.proFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  // ROLLED BACK 2026-05-21: realtime invalidation for new-facility freshness
  // caused the entire seeker panel (and every route mounting this hook) to
  // throw "Something went wrong" / "This page is temporarily unavailable".
  // The pre-realtime polling behavior (5-min React Query stale, 10-min CDN
  // s-maxage) already gives new approvals an acceptable visibility lag.
  // Re-add when we can attach a precise repro to the subscribe/cleanup
  // flow without affecting unrelated routes.
  const query = useQuery({
    queryKey: PUBLIC_FACILITIES_QUERY_KEY,
    queryFn: fetchPublicFacilitiesSnapshot,
    placeholderData: getCachedPublicFacilitiesSnapshot,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Transform static facilities to PublicFacility format with Pro data
  const publicFacilities: PublicFacility[] = (query.data || []).map((facility) => {
    // Pro / Featured status: prefer the snapshot's `isPro` (live from the
    // `public_facilities` view) and union with the legacy `proFacilityIds`
    // map for back-compat with callers that read from that list. The
    // snapshot is authoritative; the proIds list is now a redundant safety
    // net that catches any short-window drift between the view and the
    // featured-facilities edge function.
    const isPro = facility.isPro || proIds.includes(facility.id);
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
      // Prefer the snapshot's `featured` flag (sourced from the catalog) and
      // also surface a paid-featured signal via `isPro`. Pre-2026-05-21 we
      // overwrote `featured` with isPro, which silently broke the
      // legacy-Featured badge for the handful of catalog rows manually
      // pinned via `facilities.featured=true`.
      featured: facility.featured || isPro,
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
