import { useQuery } from "@tanstack/react-query";

import { useFeaturedFacilityIds } from "./useApprovedFacilities";
import type { TreatmentCenter } from "@/data/treatmentCenters";

export interface StaticFacility {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  phone: string;
  description: string;
  featured: boolean;
  verified: boolean;
  facilityType: string | null;
  logoUrl: string | null;
  galleryUrls: string[];
  yearEstablished: number | null;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  googleRating: number | null;
  googleReviewCount: number | null;
}

export interface PublicFacility extends TreatmentCenter {
  slug: string | null;
  isFromDatabase: boolean;
  logo_url: string | null;
  gallery_urls: string[] | null;
  isPro?: boolean;
  verified?: boolean | null;
  year_established?: number | null;
  facilityType?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
  planTier?: "pro" | "free";
}

interface StaticFacilitiesResponse {
  facilities: StaticFacility[];
  generatedAt: string;
  count: number;
}

// Get cached facilities for instant initial render
const getCachedStaticFacilities = (): StaticFacility[] | undefined => {
  try {
    const cached = localStorage.getItem("static-facilities-cache");
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Return cached data if less than 10 minutes old
      if (Date.now() - timestamp < 1000 * 60 * 10) {
        return data;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
};

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
    queryFn: async (): Promise<StaticFacility[]> => {
      console.log("[useStaticFacilities] Fetching from edge function...");
      
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // GET request so the CDN can cache the response (POST is never cached).
      // Use direct fetch to avoid supabase-js auth initialization deadlock.
      const res = await fetch(`${supabaseUrl}/functions/v1/get-public-facilities`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${anonKey}`,
          "apikey": anonKey,
        },
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[useStaticFacilities] Error:", text);
        throw new Error(`Edge function error: ${res.status}`);
      }

      const data: StaticFacilitiesResponse = await res.json();
      const facilities = data?.facilities || [];
      console.log("[useStaticFacilities] Loaded", facilities.length, "facilities from edge");

      // Cache for instant future loads
      try {
        localStorage.setItem(
          "static-facilities-cache",
          JSON.stringify({ data: facilities, timestamp: Date.now() })
        );
      } catch {
        // Ignore storage errors
      }

      return facilities;
    },
    placeholderData: getCachedStaticFacilities,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });

  // Transform static facilities to PublicFacility format with Pro data
  const publicFacilities: PublicFacility[] = (query.data || []).map((facility) => {
    const isPro = proIds.includes(facility.id);
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
      phone: facility.phone,
      treatmentTypes: facility.treatmentTypes,
      insuranceAccepted: facility.insuranceAccepted,
      description: facility.description || "Treatment center offering quality care and support.",
      programOverview: facility.description || "Comprehensive treatment programs tailored to individual needs.",
      featured: isPro,
      isPro,
      isHomepageFeatured,
      planTier,
      verified: facility.verified,
      year_established: facility.yearEstablished,
      facilityType: facility.facilityType,
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
