import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useEffect } from "react";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  primary_contact_name: string | null;
  timezone: string | null;
  phone_verified: boolean | null;
  phone_verified_at: string | null;
  /** Set by complete_provider_onboarding RPC once the wizard finishes
   *  (or by a post-checkout Pro recovery in Dashboard.tsx). Null until
   *  the user has finished onboarding. */
  onboarding_completed_at: string | null;
  /** profiles.plan mirror — 'free' | 'pro'. Lets components avoid an
   *  extra useProStatus call when they only need the tier. */
  plan: "free" | "pro" | null;
  /** Account-level status. 'active' for normal accounts; 'suspended' blocks
   *  dashboard access in ProviderShell. */
  status: string | null;
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
  /** Reply-to address for lead notification emails. Falls back to
   *  the account email when null. Read by EmailLeadDialog to decide
   *  whether to show the unverified-email warning. */
  reply_email: string | null;
  reply_email_verified: boolean | null;
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

  // Set up realtime subscription for facility changes + polling for leads/views
  // (leads table removed from Realtime publication for PII security).
  //
  // Channel name carries a per-mount random suffix so that successive
  // mounts can never collide on a name still held in Supabase's
  // internal channel registry. Without the suffix, supabase.channel()
  // returns the existing subscribed channel and the next .on() throws
  // "cannot add postgres_changes callbacks after subscribe()" —
  // crashing the dashboard right after the user lands from PlanStep.
  useEffect(() => {
    if (!facilityId) return;

    const channelName = `facility-data-${facilityId}-${Math.random().toString(36).slice(2, 10)}`;
    const facilityChannel = supabase
      .channel(channelName)
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

    // Poll for leads and views updates every 60 seconds
    const pollInterval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["provider-data", facilityId] });
    }, 60000);

    return () => {
      try {
        supabase.removeChannel(facilityChannel);
      } catch {
        /* removeChannel may throw if the channel was already torn down */
      }
      clearInterval(pollInterval);
    };
  }, [facilityId, queryClient]);

  // Get cached provider data for instant initial render
  const getCachedData = (): ProviderData | undefined => {
    try {
      const cached = localStorage.getItem(`provider-data-${facilityId || 'default'}`);
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

  return useQuery({
    queryKey: ["provider-data", facilityId],
    queryFn: async (): Promise<ProviderData> => {
      const session = await getCachedSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Run all queries in parallel for faster loading
      const [profileResult, facilityResult] = await Promise.all([
        // Fetch profile
        supabase
          .from("profiles")
          .select("first_name, last_name, email, phone, job_title, primary_contact_name, timezone, phone_verified, phone_verified_at, onboarding_completed_at, plan, status")
          .eq("user_id", session.user.id)
          .maybeSingle(),
        // Fetch facility
        facilityId
          ? supabase
              .from("facilities")
              .select("id, name, slug, status, email, logo_url, gallery_urls, description, phone, address, city, state, zip_code, website, profile_completion_celebrated, reply_email, reply_email_verified")
              .eq("id", facilityId)
              .eq("user_id", session.user.id)
              .maybeSingle()
          : supabase
              .from("facilities")
              .select("id, name, slug, status, email, logo_url, gallery_urls, description, phone, address, city, state, zip_code, website, profile_completion_celebrated, reply_email, reply_email_verified")
              .eq("user_id", session.user.id)
              .limit(1)
              .maybeSingle(),
      ]);

      const profileData = profileResult.data;
      const facilityData = facilityResult.data as Facility | null;

      let viewsCount = 0;
      let leadsCount = 0;
      let monthlyLeadsCount = 0;

      if (facilityData) {
        // Fetch stats in parallel
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const [viewsResult, leadsCountResult] = await Promise.all([
          // Profile views count for last 30 days from provider_events (excludes impressions to avoid double-counting)
          supabase
            .from("provider_events")
            .select("id", { count: "exact", head: true })
            .eq("facility_id", facilityData.id)
            .eq("event_type", "profile_view")
            .eq("is_internal", false)
            .eq("is_bot", false)
            .gte("created_at", thirtyDaysAgo.toISOString()),
          // Accurate leads count via SECURITY DEFINER RPC so the count
          // reflects all rows owned by the facility regardless of view-
          // level row filtering or query-level limits.
          supabase.rpc("get_facility_leads_count", { p_facility_id: facilityData.id }),
        ]);

        if (viewsResult.count != null) {
          viewsCount = viewsResult.count;
        }
        if (leadsCountResult.data && leadsCountResult.data.length > 0) {
          leadsCount = Number(leadsCountResult.data[0].total_count) || 0;
          monthlyLeadsCount = Number(leadsCountResult.data[0].monthly_qualified_count) || 0;
        }
      }

      const result: ProviderData = {
        profile: profileData,
        facility: facilityData,
        viewsCount,
        leadsCount,
        monthlyLeadsCount,
      };

      // Cache the result for instant future loads
      try {
        localStorage.setItem(`provider-data-${facilityId || 'default'}`, JSON.stringify({
          data: result,
          timestamp: Date.now(),
        }));
      } catch {
        // Ignore storage errors
      }

      return result;
    },
    // Use cached data for instant initial render
    placeholderData: getCachedData,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 60, // 1 hour cache
    refetchOnWindowFocus: true, // Refetch when user returns to tab
    refetchOnMount: true, // Refetch when component mounts
    retry: 2, // Retry failed requests
  });
}
