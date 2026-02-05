import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useRef, useState } from "react";

export interface ProviderFacility {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  facility_type: string;
  logo_url: string | null;
  gallery_urls: string[] | null;
  featured: boolean;
  created_at: string;
}

export function useProviderFacilities() {
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const initializedRef = useRef(false);

  // Get cached facilities for instant initial render (user-specific)
  const getCachedFacilities = (userId?: string | null): ProviderFacility[] | undefined => {
    try {
      // Try user-specific cache first
      if (userId) {
        const userCache = localStorage.getItem(`provider-facilities-cache-${userId}`);
        if (userCache) {
          const { data, timestamp } = JSON.parse(userCache);
          if (Date.now() - timestamp < 1000 * 60 * 5) {
            return data;
          }
        }
      }
      
      // Fallback to legacy global cache (for backwards compatibility during migration)
      const cached = localStorage.getItem("provider-facilities-cache");
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < 1000 * 60 * 5) {
          return data;
        }
      }
    } catch {
      // Ignore parse errors
    }
    return undefined;
  };

  const query = useQuery({
    queryKey: ["provider-facilities"],
    queryFn: async (): Promise<ProviderFacility[]> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return [];
      }

      // Track current user for cache management
      if (currentUserId !== session.user.id) {
        setCurrentUserId(session.user.id);
      }

      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, slug, status, address, city, state, zip_code, facility_type, logo_url, gallery_urls, featured, created_at")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      const facilities = (data || []) as ProviderFacility[];
      
      // Cache the result with user-specific key
      try {
        localStorage.setItem(`provider-facilities-cache-${session.user.id}`, JSON.stringify({
          data: facilities,
          timestamp: Date.now(),
        }));
        // Also clear any stale legacy cache
        localStorage.removeItem("provider-facilities-cache");
      } catch {
        // Ignore storage errors
      }
      
      return facilities;
    },
    // Use cached data for instant initial render (user-specific when available)
    placeholderData: () => getCachedFacilities(currentUserId),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  // Real-time subscription for facilities
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      channel = supabase
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
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [queryClient]);

  return {
    facilities: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
