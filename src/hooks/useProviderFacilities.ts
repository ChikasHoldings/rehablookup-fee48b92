import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthSync } from "./useAuthSync";

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
  suspended: boolean;
  created_at: string;
}

export function useProviderFacilities() {
  const queryClient = useQueryClient();
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuthSync();
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem("rl_cached_uid");
    } catch {
      return null;
    }
  });

  const getCachedFacilities = (userId?: string | null): ProviderFacility[] | undefined => {
    try {
      if (userId) {
        const userCache = localStorage.getItem(`provider-facilities-cache-${userId}`);
        if (userCache) {
          const { data, timestamp } = JSON.parse(userCache);
          if (Date.now() - timestamp < 1000 * 60 * 5) {
            return data;
          }
        }
      }

      if (!userId) {
        const cachedUid = localStorage.getItem("rl_cached_uid");
        if (cachedUid) {
          const userCache = localStorage.getItem(`provider-facilities-cache-${cachedUid}`);
          if (userCache) {
            const { data, timestamp } = JSON.parse(userCache);
            if (Date.now() - timestamp < 1000 * 60 * 5) {
              return data;
            }
          }
        }
      }
    } catch {
      // Ignore parse/storage errors
    }

    return undefined;
  };

  useEffect(() => {
    const nextUserId = user?.id ?? null;
    if (nextUserId !== currentUserId) {
      setCurrentUserId(nextUserId);
    }
  }, [user?.id, currentUserId]);

  const cachedFacilities = useMemo(
    () => getCachedFacilities(user?.id ?? currentUserId),
    [user?.id, currentUserId]
  );

  const query = useQuery({
    queryKey: ["provider-facilities", user?.id ?? "anonymous"],
    queryFn: async (): Promise<ProviderFacility[]> => {
      if (!user?.id || !isAuthenticated) {
        return [];
      }

      const COLS =
        "id, name, slug, status, address, city, state, zip_code, facility_type, logo_url, gallery_urls, featured, suspended, created_at";

      // Owned facilities.
      const { data: owned, error } = await supabase
        .from("facilities")
        .select(COLS)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Facilities this user is an active team member of (manager/viewer).
      // Their access is enforced server-side (facility RLS + facility_role
      // helpers, Pro-gated). We merge them in so members see the panel for
      // facilities they belong to. A non-member gets an empty list here.
      const { data: memberRows } = await supabase
        .from("facility_team_members")
        .select("facility_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const memberIds = (memberRows ?? [])
        .map((r) => (r as { facility_id: string }).facility_id)
        .filter((id) => !(owned ?? []).some((f) => (f as { id: string }).id === id));

      let memberFacilities: ProviderFacility[] = [];
      if (memberIds.length > 0) {
        const { data: mem } = await supabase
          .from("facilities")
          .select(COLS)
          .in("id", memberIds)
          .order("created_at", { ascending: false });
        memberFacilities = (mem ?? []) as ProviderFacility[];
      }

      const facilities = [
        ...((owned ?? []) as ProviderFacility[]),
        ...memberFacilities,
      ];

      try {
        localStorage.setItem(
          `provider-facilities-cache-${user.id}`,
          JSON.stringify({
            data: facilities,
            timestamp: Date.now(),
          })
        );
        localStorage.removeItem("provider-facilities-cache");
      } catch {
        // Ignore storage errors
      }

      return facilities;
    },
    enabled: !isAuthLoading && isAuthenticated && !!user?.id,
    placeholderData: () => cachedFacilities,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 2,
  });

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !user?.id) return;

    const channel = supabase
      .channel(`provider-facilities-realtime-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "facilities",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-facilities", user.id] });
          queryClient.invalidateQueries({ queryKey: ["provider-data"] });
          queryClient.invalidateQueries({ queryKey: ["centralized-engagement-analytics"] });
          queryClient.invalidateQueries({ queryKey: ["centralized-lead-analytics"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id, isAuthLoading, isAuthenticated]);

  return {
    facilities: query.data || cachedFacilities || [],
    isLoading: isAuthLoading || query.isLoading,
    // BUGFIX: Expose isError so consumers can render an error state instead of
    // silently showing an empty facilities list when the DB query fails.
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
