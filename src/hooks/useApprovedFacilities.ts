import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  hasFeaturedSubscription?: boolean;
  hasPaidPlan?: boolean; // true for professional or featured plans
  verified?: boolean | null;
  year_established?: number | null;
  facilityType?: string | null;
  googleRating?: number | null;
  googleReviewCount?: number | null;
}

interface FeaturedFacilitiesResponse {
  featuredFacilityIds: string[];
  homepageFeaturedIds: string[];
  allEligibleIds: string[];
  paidFacilityIds?: string[]; // All facilities with any paid subscription
}

// Hook to get featured facility IDs from subscription data
export const useFeaturedFacilityIds = () => {
  return useQuery({
    queryKey: ["featured-facility-ids"],
    queryFn: async (): Promise<FeaturedFacilitiesResponse> => {
      try {
        const { data, error } = await supabase.functions.invoke("get-featured-facilities");
        if (error) {
          console.error("Error fetching featured facilities:", error);
          return { featuredFacilityIds: [], homepageFeaturedIds: [], allEligibleIds: [] };
        }
        return {
          featuredFacilityIds: data?.featuredFacilityIds || [],
          homepageFeaturedIds: data?.homepageFeaturedIds || [],
          allEligibleIds: data?.allEligibleIds || [],
        };
      } catch (err) {
        console.error("Failed to fetch featured facility IDs:", err);
        return { featuredFacilityIds: [], homepageFeaturedIds: [], allEligibleIds: [] };
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes - cached per session to prevent flickering
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useApprovedFacilities = () => {
  const queryClient = useQueryClient();
  const { data: featuredData } = useFeaturedFacilityIds();
  const featuredIds = featuredData?.featuredFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  // Real-time subscription for approved facilities updates
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("approved-facilities-realtime")
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
      .channel("approved-facilities-services")
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
      .channel("approved-facilities-insurance")
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

  return useQuery({
    queryKey: ["approved-facilities", featuredIds, homepageFeaturedIds],
    queryFn: async (): Promise<ApprovedFacility[]> => {
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
          facility_type,
          logo_url,
          gallery_urls
        `);

      if (facilitiesError) throw facilitiesError;

      // Fetch services, insurance, and reviews separately since views don't support joins
      const facilityIds = (facilitiesData || []).map(f => f.id).filter(Boolean) as string[];
      
      const [servicesResult, insuranceResult, reviewsResult] = await Promise.all([
        supabase.from("facility_services").select("facility_id, service_name").in("facility_id", facilityIds),
        supabase.from("facility_insurance").select("facility_id, insurance_name").in("facility_id", facilityIds),
        supabase.from("facility_reviews_config").select("facility_id, google_rating, google_review_count, show_on_profile").in("facility_id", facilityIds).eq("show_on_profile", true),
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

      const reviewsMap = new Map<string, { rating: number | null; count: number | null }>();
      (reviewsResult.data || []).forEach(r => {
        reviewsMap.set(r.facility_id, { rating: r.google_rating, count: r.google_review_count });
      });

      const data = (facilitiesData || []).map(f => ({
        ...f,
        year_established: null as number | null, // Not in public view
        facility_services: (servicesMap.get(f.id!) || []).map(name => ({ service_name: name })),
        facility_insurance: (insuranceMap.get(f.id!) || []).map(name => ({ insurance_name: name })),
        reviewsConfig: reviewsMap.get(f.id!) || null,
      }));

      // Transform database facilities to TreatmentCenter format
      return (data as (FacilityWithRelations & { reviewsConfig: { rating: number | null; count: number | null } | null })[]).map((facility) => {
        const hasFeaturedSubscription = featuredIds.includes(facility.id);
        const isHomepageFeatured = homepageFeaturedIds.includes(facility.id);
        // For now, assume featured subscription means paid plan
        // In the future, this could be expanded to include professional plan checks
        const hasPaidPlan = hasFeaturedSubscription;
        
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
          // Featured if they have Featured subscription OR legacy featured flag
          featured: hasFeaturedSubscription || facility.featured,
          hasFeaturedSubscription,
          hasPaidPlan,
          isHomepageFeatured,
          verified: facility.verified,
          year_established: facility.year_established,
          facilityType: facility.facility_type,
          rating: 4.5,
          reviewCount: 0,
          amenities: [],
          image: "/placeholder.svg",
          isFromDatabase: true,
          logo_url: facility.logo_url,
          gallery_urls: facility.gallery_urls,
          googleRating: facility.reviewsConfig?.rating ?? null,
          googleReviewCount: facility.reviewsConfig?.count ?? null,
        };
      });
    },
    staleTime: 1000 * 60 * 2, // 2 minutes for fresher data
  });
};

// Export homepage featured IDs for components that need just that
export const useHomepageFeaturedIds = () => {
  const { data } = useFeaturedFacilityIds();
  return data?.homepageFeaturedIds || [];
};
