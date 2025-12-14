import { useQuery } from "@tanstack/react-query";
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
}

// Hook to get featured facility IDs from subscription data
export const useFeaturedFacilityIds = () => {
  return useQuery({
    queryKey: ["featured-facility-ids"],
    queryFn: async (): Promise<string[]> => {
      try {
        const { data, error } = await supabase.functions.invoke("get-featured-facilities");
        if (error) {
          console.error("Error fetching featured facilities:", error);
          return [];
        }
        return data?.featuredFacilityIds || [];
      } catch (err) {
        console.error("Failed to fetch featured facility IDs:", err);
        return [];
      }
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
};

export const useApprovedFacilities = () => {
  const { data: featuredIds = [] } = useFeaturedFacilityIds();

  return useQuery({
    queryKey: ["approved-facilities", featuredIds],
    queryFn: async (): Promise<ApprovedFacility[]> => {
      const { data, error } = await supabase
        .from("facilities")
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
          logo_url,
          gallery_urls,
          facility_services (service_name),
          facility_insurance (insurance_name)
        `)
        .eq("status", "approved");

      if (error) throw error;

      // Transform database facilities to TreatmentCenter format
      return (data as FacilityWithRelations[]).map((facility) => {
        const hasFeaturedSubscription = featuredIds.includes(facility.id);
        
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
          rating: 4.5,
          reviewCount: 0,
          amenities: [],
          image: "/placeholder.svg",
          isFromDatabase: true,
          logo_url: facility.logo_url,
          gallery_urls: facility.gallery_urls,
        };
      });
    },
  });
};
