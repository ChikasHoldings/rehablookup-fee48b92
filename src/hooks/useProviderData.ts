import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
}

interface Facility {
  id: string;
  name: string;
  slug: string | null;
  status: string;
  email: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  description: string | null;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  website: string | null;
  profile_completion_celebrated: boolean | null;
}

interface ProviderData {
  profile: Profile | null;
  facility: Facility | null;
  viewsCount: number;
  leadsCount: number;
  monthlyLeadsCount: number;
}

export function useProviderData(facilityId?: string) {
  const queryClient = useQueryClient();

  // Set up realtime subscriptions for stats updates
  useEffect(() => {
    if (!facilityId) return;

    // Subscribe to facility changes (for profile completion updates)
    const facilityChannel = supabase
      .channel(`facility-data-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facilities',
          filter: `id=eq.${facilityId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
        }
      )
      .subscribe();

    // Subscribe to facility_views changes
    const viewsChannel = supabase
      .channel(`facility-views-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'facility_views',
          filter: `facility_id=eq.${facilityId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
        }
      )
      .subscribe();

    // Subscribe to leads changes
    const leadsChannel = supabase
      .channel(`leads-${facilityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'leads',
          filter: `facility_id=eq.${facilityId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilityChannel);
      supabase.removeChannel(viewsChannel);
      supabase.removeChannel(leadsChannel);
    };
  }, [facilityId, queryClient]);

  return useQuery({
    queryKey: ["provider-data", facilityId],
    queryFn: async (): Promise<ProviderData> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone, job_title")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Fetch facility - either specific one or first one
      let facilityData: Facility | null = null;
      
      if (facilityId) {
        const { data } = await supabase
          .from("facilities")
          .select("id, name, slug, status, email, logo_url, gallery_urls, description, phone, address, city, state, zip_code, website, profile_completion_celebrated")
          .eq("id", facilityId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        facilityData = data;
      } else {
        const { data } = await supabase
          .from("facilities")
          .select("id, name, slug, status, email, logo_url, gallery_urls, description, phone, address, city, state, zip_code, website, profile_completion_celebrated")
          .eq("user_id", session.user.id)
          .limit(1)
          .maybeSingle();
        facilityData = data;
      }

      let viewsCount = 0;
      let leadsCount = 0;
      let monthlyLeadsCount = 0;

      if (facilityData) {
        // Fetch view counts for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: viewsData } = await supabase
          .from("facility_views")
          .select("view_count")
          .eq("facility_id", facilityData.id)
          .gte("view_date", thirtyDaysAgo.toISOString().split('T')[0]);
        
        if (viewsData) {
          viewsCount = viewsData.reduce((sum, row) => sum + row.view_count, 0);
        }

        // Fetch total leads count
        const { count: totalCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityData.id);
        
        leadsCount = totalCount || 0;

        // Fetch monthly QUALIFIED leads count (current month) - this is what counts against the cap
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthlyCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityData.id)
          .eq("qualified", true) // Only count qualified leads against the cap
          .gte("created_at", startOfMonth.toISOString());
        
        monthlyLeadsCount = monthlyCount || 0;
      }

      return {
        profile: profileData,
        facility: facilityData,
        viewsCount,
        leadsCount,
        monthlyLeadsCount,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });
}
