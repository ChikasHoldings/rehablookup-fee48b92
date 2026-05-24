import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FacilityAmenity {
  id: string;
  facility_id: string;
  amenity_name: string;
  is_highlighted: boolean;
  display_order: number;
  created_at: string;
}

// Curated suggestion list — providers can also type their own. Kept
// short and concrete so the public profile doesn't fill with vague
// adjectives. Roughly mirrors what Healthgrades / Yelp surface.
export const AMENITY_SUGGESTIONS = [
  "Private Rooms",
  "Semi-Private Rooms",
  "Pool",
  "Gym / Fitness Center",
  "Yoga Studio",
  "Meditation Space",
  "Outdoor Recreation",
  "Pet Friendly",
  "Family Visiting Hours",
  "Nutritional Counseling",
  "On-Site Medical Staff",
  "Transportation Assistance",
  "Aftercare Programs",
  "Alumni Network",
  "Holistic Therapies",
  "Art Therapy",
  "Music Therapy",
  "Equine Therapy",
  "Wi-Fi",
  "Private Bathrooms",
] as const;

export function useFacilityAmenities(facilityId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: amenities = [], isLoading, error, refetch } = useQuery({
    queryKey: ["facility-amenities", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("facility_amenities")
        .select("id, facility_id, amenity_name, is_highlighted, display_order, created_at")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FacilityAmenity[];
    },
    enabled: !!facilityId,
  });

  const addAmenity = useMutation({
    mutationFn: async (input: {
      facility_id: string;
      amenity_name: string;
      is_highlighted?: boolean;
    }) => {
      const trimmed = input.amenity_name.trim();
      if (!trimmed) throw new Error("Amenity name can't be empty.");
      // Display order: next available slot after current max
      const nextOrder = amenities.length;
      const { data, error } = await supabase
        .from("facility_amenities")
        .insert([{
          facility_id: input.facility_id,
          amenity_name: trimmed,
          is_highlighted: input.is_highlighted ?? false,
          display_order: nextOrder,
        }])
        .select()
        .single();
      if (error) {
        // 23505 = unique_violation (the lower(amenity_name) UNIQUE index)
        if ((error as { code?: string }).code === "23505") {
          throw new Error(`"${trimmed}" is already in your amenities list.`);
        }
        throw error;
      }
      return data as FacilityAmenity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-amenities", facilityId] });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't add amenity", description: err.message, variant: "destructive" }),
  });

  const updateAmenity = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { is_highlighted?: boolean; display_order?: number } }) => {
      const { data: row, error } = await supabase
        .from("facility_amenities")
        .update(data)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return row as FacilityAmenity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-amenities", facilityId] });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't update amenity", description: err.message, variant: "destructive" }),
  });

  const removeAmenity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_amenities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["facility-amenities", facilityId] });
    },
    onError: (err: Error) =>
      toast({ title: "Couldn't remove amenity", description: err.message, variant: "destructive" }),
  });

  return { amenities, isLoading, error, refetch, addAmenity, updateAmenity, removeAmenity };
}

// Public read — Pro-gated server-side via public_facility_amenities view.
export function usePublicFacilityAmenities(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["public-facility-amenities", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await supabase
        .from("public_facility_amenities")
        .select("id, amenity_name, is_highlighted, display_order")
        .eq("facility_id", facilityId)
        .order("display_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!facilityId,
  });
}
