import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProviderFacility {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  city: string;
  state: string;
  logo_url: string | null;
  created_at: string;
}

export function useProviderFacilities() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["provider-facilities"],
    queryFn: async (): Promise<ProviderFacility[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return [];
      }

      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, slug, status, city, state, logo_url, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProviderFacility[];
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - data doesn't change often
    gcTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: false,
    refetchOnMount: false, // Don't refetch when component remounts (navigation)
  });

  // Real-time subscription for facilities
  useEffect(() => {
    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel("provider-facilities-realtime")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "facilities",
            filter: `user_id=eq.${session.user.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ["provider-facilities"] });
            queryClient.invalidateQueries({ queryKey: ["provider-data"] });
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupSubscription();
  }, [queryClient]);

  return {
    facilities: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
