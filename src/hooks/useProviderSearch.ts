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
  { id: "leads", type: "page", title: "Leads", subtitle: "View all contact requests", url: "/provider/leads" },
  { id: "analytics", type: "page", title: "Analytics", subtitle: "Performance metrics", url: "/provider/analytics" },
  { id: "billing", type: "page", title: "Billing", subtitle: "Plans & payment methods", url: "/provider/billing" },
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
      
      const { data, error } = await supabase
        .from("leads")
        .select("id, name, email, phone, status, created_at, message")
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data || [];
    },
    enabled: !!facilityId,
    staleTime: 60 * 1000,
  });

  // Filter and format results
  const results = useMemo(() => {
    const searchTerm = debouncedQuery.toLowerCase().trim();
    
    if (!searchTerm) {
      return { leads: [], pages: [], total: 0 };
    }

    // Search leads
    const matchedLeads: SearchResult[] = leads
      .filter((lead) => {
        return (
          lead.name?.toLowerCase().includes(searchTerm) ||
          lead.email?.toLowerCase().includes(searchTerm) ||
          lead.phone?.includes(searchTerm) ||
          lead.message?.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5)
      .map((lead) => ({
        id: lead.id,
        type: "lead" as const,
        title: lead.name,
        subtitle: `${lead.email} • ${lead.status}`,
        url: `/provider/leads?highlight=${lead.id}`,
        metadata: { status: lead.status, email: lead.email, phone: lead.phone },
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
