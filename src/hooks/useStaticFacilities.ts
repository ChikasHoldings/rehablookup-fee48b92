import { useQuery } from "@tanstack/react-query";

import { useFeaturedFacilityIds } from "./useApprovedFacilities";
import type { TreatmentCenter } from "@/data/treatmentCenters";
import {
  fetchPublicFacilitiesSnapshot,
  getCachedPublicFacilitiesSnapshot,
  type PublicFacilitySnapshot,
} from "@/lib/publicFacilitiesSnapshot";

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
 * This eliminates direct database calls for public browsing pages.
 * Data is served from CDN cache (10 min) for optimal performance.
 */
export const useStaticFacilities = () => {
  const { data: featuredData, isLoading: isFeaturedLoading } = useFeaturedFacilityIds();
  const proIds = featuredData?.proFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  const query = useQuery({
    queryKey: ["static-public-facilities"],
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
      treatmentTypes: facility.treatmentTypes,
      insuranceAccepted: facility.insuranceAccepted,
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
      languagesSpoken: facility.languagesSpoken,
      accessibilityFeatures: facility.accessibilityFeatures,
      email: facility.email,
      website: facility.website,
      rating: null,
      reviewCount: 0,
      amenities: [],
      image: null,
      isFromDatabase: true,
      logo_url: facility.logoUrl,
      gallery_urls: facility.galleryUrls,
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
