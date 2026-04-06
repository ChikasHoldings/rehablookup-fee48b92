import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SearchResult {
  id: string;
  type: "lead" | "page";
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

const NAVIGATION_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Overview & statistics", url: "/provider/dashboard" },
  { id: "listing", type: "page", title: "My Listing", subtitle: "Edit facility information", url: "/provider/listing" },
  { id: "inquiries", type: "page", title: "Inquiries", subtitle: "View all inquiries", url: "/provider/inquiries" },
  { id: "credits", type: "page", title: "Credits", subtitle: "Purchase & manage credits", url: "/provider/billing?purchase_credits=true" },
  { id: "unlock-history", type: "page", title: "Unlock History", subtitle: "View unlocked leads", url: "/provider/settings?tab=unlock-history" },
  { id: "pro-upgrade", type: "page", title: "Pro Upgrade", subtitle: "Get featured placement", url: "/provider/pro-upgrade" },
  { id: "analytics", type: "page", title: "Analytics", subtitle: "Performance metrics", url: "/provider/analytics" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Account preferences", url: "/provider/settings" },
  { id: "notifications", type: "page", title: "Notifications", subtitle: "View all notifications", url: "/provider/notifications" },
];

export function useProviderSearch(query: string, facilityId?: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  // Proper debounce with useEffect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  // Fetch leads for search
  const { data: leads = [], isLoading: leadsLoading } = useQuery({
    queryKey: ["provider-search-leads", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      
      // Use leads_provider_view instead of leads table directly
      // (RLS on leads requires unlock, which would hide new leads from search)
      const { data, error } = await supabase
        .from("leads_provider_view")
        .select("id, name, email, phone, status, created_at, message, location_city_state")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
    staleTime: 60 * 1000,
  });

  // Normalize phone number for search (remove all non-digits)
  const normalizePhone = (phone: string | null | undefined) => 
    phone?.replace(/\D/g, "") || "";

  // Filter and format results
  const results = useMemo(() => {
    const searchTerm = debouncedQuery.toLowerCase().trim();
    const normalizedSearchTerm = searchTerm.replace(/\D/g, "");
    
    if (!searchTerm) {
      return { leads: [], pages: [], total: 0 };
    }

    // Search leads
    const matchedLeads: SearchResult[] = leads
      .filter((lead) => {
        const phoneMatch = normalizedSearchTerm.length >= 3 && 
          normalizePhone(lead.phone).includes(normalizedSearchTerm);
        return (
          lead.name?.toLowerCase().includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm) ||
          phoneMatch ||
          lead.message?.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5)
      .map((lead) => ({
        id: lead.id,
        type: "lead" as const,
        title: lead.name,
        subtitle: [lead.location_city_state, lead.phone, lead.status].filter(Boolean).join(" • "),
        url: `/provider/inquiries?highlight=${lead.id}`,
        metadata: { status: lead.status, email: lead.email, phone: lead.phone, location: lead.location_city_state },
      }));

    // Search pages
    const matchedPages: SearchResult[] = NAVIGATION_PAGES.filter((page) => {
      return (
        page.title.toLowerCase().includes(searchTerm) ||
        page.subtitle?.toLowerCase().includes(searchTerm)
      );
    });

    return {
      leads: matchedLeads,
      pages: matchedPages,
      total: matchedLeads.length + matchedPages.length,
    };
  }, [debouncedQuery, leads]);

  return {
    results,
    isLoading: leadsLoading && !!debouncedQuery,
    query: debouncedQuery,
  };
}
