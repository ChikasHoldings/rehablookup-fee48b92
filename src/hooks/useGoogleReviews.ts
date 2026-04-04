import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GoogleReviewsConfig {
  id: string;
  facility_id: string;
  google_place_id: string | null;
  google_place_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  show_on_profile: boolean;
  last_updated_at: string;
  created_at: string;
}

export interface GoogleReviewsInput {
  google_place_url: string | null;
  google_rating: number | null;
  google_review_count: number | null;
  show_on_profile: boolean;
}

export function useGoogleReviews(facilityId: string | undefined) {
  const queryClient = useQueryClient();

  const { data: reviewsConfig, isLoading } = useQuery({
    queryKey: ["google-reviews-config", facilityId],
    queryFn: async (): Promise<GoogleReviewsConfig | null> => {
      if (!facilityId) return null;
      
      const { data, error } = await supabase
        .from("facility_reviews_config")
        .select("id, facility_id, google_place_id, google_place_url, google_rating, google_review_count, show_on_profile, last_updated_at")
        .eq("facility_id", facilityId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching reviews config:", error);
        return null;
      }
      
      return data as GoogleReviewsConfig | null;
    },
    enabled: !!facilityId,
  });

  const mutation = useMutation({
    mutationFn: async (input: GoogleReviewsInput) => {
      if (!facilityId) throw new Error("No facility ID");

      const payload = {
        facility_id: facilityId,
        google_place_url: input.google_place_url,
        google_rating: input.google_rating,
        google_review_count: input.google_review_count,
        show_on_profile: input.show_on_profile,
        last_updated_at: new Date().toISOString(),
      };

      if (reviewsConfig?.id) {
        // Update existing
        const { error } = await supabase
          .from("facility_reviews_config")
          .update(payload)
          .eq("id", reviewsConfig.id);
        
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("facility_reviews_config")
          .insert(payload);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["google-reviews-config", facilityId] });
    },
  });

  return {
    reviewsConfig,
    isLoading,
    saveReviews: mutation.mutateAsync,
    isSaving: mutation.isPending,
  };
}

// Hook for fetching public reviews (for profile display)
export function usePublicGoogleReviews(facilityId: string | undefined) {
  return useQuery({
    queryKey: ["public-google-reviews", facilityId],
    queryFn: async (): Promise<GoogleReviewsConfig | null> => {
      if (!facilityId) return null;
      
      const { data, error } = await supabase
        .from("facility_reviews_config")
        .select("id, facility_id, google_place_id, google_place_url, google_rating, google_review_count, show_on_profile, last_updated_at")
        .eq("facility_id", facilityId)
        .eq("show_on_profile", true)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching public reviews:", error);
        return null;
      }
      
      return data as GoogleReviewsConfig | null;
    },
    enabled: !!facilityId,
  });
}
