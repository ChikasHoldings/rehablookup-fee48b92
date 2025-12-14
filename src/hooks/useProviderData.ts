import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
}

interface ProviderData {
  profile: Profile | null;
  facility: Facility | null;
  viewsCount: number;
  leadsCount: number;
  monthlyLeadsCount: number;
}

export function useProviderData(facilityId?: string) {
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
          .select("id, name, slug, status, email, logo_url, gallery_urls")
          .eq("id", facilityId)
          .eq("user_id", session.user.id)
          .maybeSingle();
        facilityData = data;
      } else {
        const { data } = await supabase
          .from("facilities")
          .select("id, name, slug, status, email, logo_url, gallery_urls")
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

        // Fetch monthly leads count (current month)
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        
        const { count: monthlyCount } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityData.id)
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
