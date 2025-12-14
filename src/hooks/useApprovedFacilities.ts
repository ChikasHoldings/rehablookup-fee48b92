import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TreatmentCenter } from "@/data/treatmentCenters";

interface FacilityWithRelations {
  id: string;
  name: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string;
  description: string | null;
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
}

export const useApprovedFacilities = () => {
  return useQuery({
    queryKey: ["approved-facilities"],
    queryFn: async (): Promise<TreatmentCenter[]> => {
      const { data, error } = await supabase
        .from("facilities")
        .select(`
          id,
          name,
          city,
          state,
          zip_code,
          address,
          phone,
          description,
          facility_services (service_name),
          facility_insurance (insurance_name)
        `)
        .eq("status", "approved");

      if (error) throw error;

      // Transform database facilities to TreatmentCenter format
      return (data as FacilityWithRelations[]).map((facility) => ({
        id: facility.id,
        name: facility.name,
        city: facility.city,
        state: facility.state,
        zipCode: facility.zip_code,
        address: facility.address,
        phone: facility.phone,
        treatmentTypes: facility.facility_services.map((s) => s.service_name),
        insuranceAccepted: facility.facility_insurance.map((i) => i.insurance_name),
        description: facility.description || "Treatment center offering quality care and support.",
        programOverview: facility.description || "Comprehensive treatment programs tailored to individual needs.",
        featured: false,
        rating: 4.5,
        reviewCount: 0,
        amenities: [],
        image: "/placeholder.svg",
      }));
    },
  });
};
