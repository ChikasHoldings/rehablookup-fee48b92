import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Profile {
  first_name: string;
  last_name: string;
  email: string;
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
}

export function useProviderData() {
  return useQuery({
    queryKey: ["provider-data"],
    queryFn: async (): Promise<ProviderData> => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("user_id", session.user.id)
        .maybeSingle();

      // Fetch facility
      const { data: facilityData } = await supabase
        .from("facilities")
        .select("id, name, slug, status, email, logo_url, gallery_urls")
        .eq("user_id", session.user.id)
        .limit(1)
        .maybeSingle();

      let viewsCount = 0;
      let leadsCount = 0;

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

        // Fetch leads count
        const { count } = await supabase
          .from("leads")
          .select("*", { count: "exact", head: true })
          .eq("facility_id", facilityData.id);
        
        leadsCount = count || 0;
      }

      return {
        profile: profileData,
        facility: facilityData,
        viewsCount,
        leadsCount,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
    refetchOnWindowFocus: false,
  });
}
