import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { filterRowsWithKeys, pluckNonNull } from "@/lib/nullableRows";
import type { TreatmentCenter } from "@/data/treatmentCenters";

interface FacilityWithRelations {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string;
  description: string | null;
  featured: boolean;
  verified: boolean | null;
  /** Canonical Pro entitlement from `public_facilities.is_pro` = has_active_pro(id). */
  is_pro: boolean | null;
  year_established: number | null;
  facility_type: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
}

export interface ApprovedFacility extends TreatmentCenter {
  slug: string | null;
  isFromDatabase: boolean;
  logo_url: string | null;
  gallery_urls: string[] | null;
  isPro?: boolean; // true for Pro subscription
  verified?: boolean | null;
  year_established?: number | null;
  facilityType?: string | null;
  calculatedRankingScore?: number; // cached ranking score for sorting
  // Plan tier for sorting
  planTier?: 'pro' | 'free';
}

interface FeaturedFacilitiesResponse {
  proFacilityIds: string[]; // Facilities with Pro subscription
  homepageFeaturedIds: string[]; // For homepage featured rotation
}

// Get cached featured IDs for instant initial render
const getCachedFeaturedIds = (): FeaturedFacilitiesResponse | undefined => {
  try {
    const cached = localStorage.getItem("featured-facility-ids-cache");
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

// Hook to get featured facility IDs from subscription data
export const useFeaturedFacilityIds = () => {
  return useQuery({
    queryKey: ["featured-facility-ids"],
    queryFn: async (): Promise<FeaturedFacilitiesResponse> => {
      try {
        const { data, error } = await supabase.functions.invoke("get-featured-facilities");
        if (error) {
          return { proFacilityIds: [], homepageFeaturedIds: [] };
        }
        
        const result: FeaturedFacilitiesResponse = {
          proFacilityIds: data?.proFacilityIds || [],
          homepageFeaturedIds: data?.homepageFeaturedIds || [],
        };
        
        // Cache the result for instant future loads
        try {
          localStorage.setItem("featured-facility-ids-cache", JSON.stringify({
            data: result,
            timestamp: Date.now(),
          }));
        } catch {
          // Ignore storage errors
        }
        
        return result;
      } catch (err) {
        console.error("Failed to fetch Pro facility IDs:", err);
        return { proFacilityIds: [], homepageFeaturedIds: [] };
      }
    },
    // Use cached data for instant initial render
    placeholderData: getCachedFeaturedIds,
    staleTime: 1000 * 60 * 5, // 5 minutes - cached per session to prevent flickering
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

// Get cached facilities for instant initial render
const getCachedFacilities = (): ApprovedFacility[] | undefined => {
  try {
    const cached = localStorage.getItem("approved-facilities-cache");
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Return cached data if less than 5 minutes old
      if (Date.now() - timestamp < 1000 * 60 * 5) {
        return data;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return undefined;
};

export const useApprovedFacilities = () => {
  const queryClient = useQueryClient();
  const { data: featuredData, isLoading: isFeaturedLoading } = useFeaturedFacilityIds();
  // `proFacilityIds` is deliberately NOT read here. Pro is sourced from
  // `public_facilities.is_pro` in the facilities query below. This endpoint is
  // consumed only for the homepage rotation ids.
  // Wrap in useMemo so the array reference is stable when featuredData hasn't changed
  const homepageFeaturedIds = useMemo(() => featuredData?.homepageFeaturedIds || [], [featuredData?.homepageFeaturedIds]);

  // Real-time subscription for approved facilities updates
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel(`approved-facilities-realtime-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        }
      )
      .subscribe();

    const servicesChannel = supabase
      .channel(`approved-facilities-services-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_services",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        }
      )
      .subscribe();

    const insuranceChannel = supabase
      .channel(`approved-facilities-insurance-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facility_insurance",
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["approved-facilities"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
      supabase.removeChannel(servicesChannel);
      supabase.removeChannel(insuranceChannel);
    };
  }, [queryClient]);

  // Fetch facilities independently - don't block on featured IDs
  const facilitiesQuery = useQuery({
    queryKey: ["approved-facilities-base"],
    queryFn: async () => {
      // Use public_facilities view which excludes sensitive fields like admin_notes
      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from("public_facilities")
        .select(`
          id,
          name,
          slug,
          city,
          state,
          zip_code,
          address,
          phone,
          description,
          featured,
          verified,
          is_pro,
          facility_type,
          logo_url,
          gallery_urls,
          year_established
        `);

      if (facilitiesError) throw facilitiesError;

      // Fetch services, insurance, and reviews separately since views don't support joins.
      // `pluckNonNull` filters and narrows the nullable `id` from the view in one step.
      const facilityIds = pluckNonNull(facilitiesData, "id");

      const [servicesResult, insuranceResult] = await Promise.all([
        supabase.from("facility_services").select("facility_id, service_name").in("facility_id", facilityIds),
        supabase.from("facility_insurance").select("facility_id, insurance_name").in("facility_id", facilityIds),
      ]);

      // Create lookup maps
      const servicesMap = new Map<string, string[]>();
      (servicesResult.data || []).forEach(s => {
        const existing = servicesMap.get(s.facility_id) || [];
        servicesMap.set(s.facility_id, [...existing, s.service_name]);
      });

      const insuranceMap = new Map<string, string[]>();
      (insuranceResult.data || []).forEach(i => {
        const existing = insuranceMap.get(i.facility_id) || [];
        insuranceMap.set(i.facility_id, [...existing, i.insurance_name]);
      });

      
      // Drop view rows missing the primary key so `f.id` is non-null in the
      // returned shape — no more `f.id!` non-null assertions downstream.
      return filterRowsWithKeys(facilitiesData, ["id"]).map(f => ({
        ...f,
        facility_services: (servicesMap.get(f.id) || []).map(name => ({ service_name: name })),
        facility_insurance: (insuranceMap.get(f.id) || []).map(name => ({ insurance_name: name })),
      }));
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for fresher data
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  // Combine facilities with Pro data using useMemo for efficiency
  const approvedFacilities = useMemo((): ApprovedFacility[] => {
    const baseFacilities = facilitiesQuery.data || [];
    
    return (baseFacilities as (FacilityWithRelations & { reviewsConfig: { rating: number | null; count: number | null } | null })[]).map((facility) => {
      // CANONICAL PRO, FAIL CLOSED. This was `proIds.includes(facility.id)`,
      // sourced from get-featured-facilities' `proFacilityIds` — a list that
      // carried no tier predicate, so any active subscription row read as Pro.
      // `public_facilities.is_pro` IS has_active_pro(id), the single
      // definition. `=== true` so a null column never coerces to Pro.
      const isPro = facility.is_pro === true;
      const isHomepageFeatured = homepageFeaturedIds.includes(facility.id);
      
      // Determine plan tier for sorting: Pro or Free
      const planTier: 'pro' | 'free' = isPro ? 'pro' : 'free';
      
      return {
        id: facility.id,
        name: facility.name,
        slug: facility.slug,
        city: facility.city,
        state: facility.state,
        zipCode: facility.zip_code,
        address: facility.address,
        phone: facility.phone,
        treatmentTypes: facility.facility_services.map((s) => s.service_name),
        insuranceAccepted: facility.facility_insurance.map((i) => i.insurance_name),
        description: facility.description || "Treatment center offering quality care and support.",
        programOverview: facility.description || "Comprehensive treatment programs tailored to individual needs.",
        // PRO IS NOT FEATURED. This was `featured: isPro`, which turned a $99
        // product subscription into a public Featured badge and into paid
        // placement in every consumer that reads this flag.
        //
        // It is not replaced with the raw `public_facilities.featured` column
        // either. That catalog boolean is the same one the retired
        // pro-benefits Pro activation used to set, so it is not evidence of a
        // Featured purchase, and the rows still carrying it have no
        // subscription, placement or audit record behind them. Publishing a
        // Featured claim from it would be fabricating an entitlement.
        //
        // Paid Featured inventory is served by get-featured-rotation from
        // featured_placements into the separately labeled Featured rail, which
        // sets its own badge. Organic cards assert nothing.
        featured: false,
        isPro,
        isHomepageFeatured,
        planTier,
        verified: facility.verified,
        year_established: facility.year_established,
        facilityType: facility.facility_type,
        rating: null,
        reviewCount: 0,
        amenities: [],
        image: null,
        isFromDatabase: true,
        logo_url: facility.logo_url,
        gallery_urls: facility.gallery_urls,
        calculatedRankingScore: (facility as { calculated_ranking_score?: number }).calculated_ranking_score ?? 0,
      };
    });
  }, [facilitiesQuery.data, homepageFeaturedIds]);

  // Cache facilities for instant future loads
  useEffect(() => {
    if (approvedFacilities.length > 0) {
      try {
        localStorage.setItem("approved-facilities-cache", JSON.stringify({
          data: approvedFacilities,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }
    }
  }, [approvedFacilities]);

  return {
    data: approvedFacilities,
    isLoading: facilitiesQuery.isLoading,
    isFetching: facilitiesQuery.isFetching || isFeaturedLoading,
    error: facilitiesQuery.error,
    refetch: facilitiesQuery.refetch,
  };
};

// Export homepage featured IDs for components that need just that
export const useHomepageFeaturedIds = () => {
  const { data } = useFeaturedFacilityIds();
  return data?.homepageFeaturedIds || [];
};
