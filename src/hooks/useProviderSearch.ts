import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";

export interface SearchResult {
  id: string;
  type: "lead" | "page" | "placement" | "listing";
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

const NAVIGATION_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Overview & statistics", url: "/provider/dashboard" },
  { id: "listing", type: "page", title: "My Listings", subtitle: "Edit facility information", url: "/provider/listings" },
  { id: "inquiries", type: "page", title: "Inquiries", subtitle: "View all inquiries", url: "/provider/inquiries" },
  { id: "credits", type: "page", title: "Credits", subtitle: "Purchase & manage credits", url: "/provider/billing?purchase_credits=true" },
  { id: "unlock-history", type: "page", title: "Unlock History", subtitle: "View unlocked leads", url: "/provider/settings?tab=unlock-history" },
  { id: "pro-upgrade", type: "page", title: "Pro Upgrade", subtitle: "Get featured placement", url: "/provider/pro-upgrade" },
  { id: "analytics", type: "page", title: "Analytics", subtitle: "Performance metrics", url: "/provider/analytics" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Account preferences", url: "/provider/settings" },
  { id: "notifications", type: "page", title: "Notifications", subtitle: "View all notifications", url: "/provider/notifications" },
  { id: "reviews", type: "page", title: "Reviews", subtitle: "Manage facility reviews", url: "/provider/reviews" },
  { id: "placement-network", type: "page", title: "Placement Network", subtitle: "Manage placements & tours", url: "/provider/placement-network" },
  { id: "billing", type: "page", title: "Billing", subtitle: "Credits, payments & invoices", url: "/provider/billing" },
];

export function useProviderSearch(query: string, facilityId?: string) {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

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

  // Fetch placements (concierge introductions) for search
  const { data: placements = [], isLoading: placementsLoading } = useQuery({
    queryKey: ["provider-search-placements", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      // Provider RLS no longer permits row-level reads of concierge_inquiries.
      // Fetch introductions and enrich with safe inquiry fields via RPC.
      const [introsRes, safeRes] = await Promise.all([
        supabase
          .from("concierge_introductions")
          .select("id, inquiry_id, provider_response, created_at")
          .eq("facility_id", facilityId)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.rpc("get_provider_safe_inquiries", { p_facility_id: facilityId }),
      ]);
      if (introsRes.error) throw introsRes.error;
      if (safeRes.error) throw safeRes.error;
      const inquiryMap = new Map((safeRes.data || []).map((i: any) => [i.id, i]));
      return (introsRes.data || []).map((intro: any) => ({
        ...intro,
        concierge_inquiries: inquiryMap.get(intro.inquiry_id) || null,
      }));
    },
    enabled: !!facilityId,
    staleTime: 60 * 1000,
  });

  // Fetch provider's own facilities (listings) for search
  const { data: listings = [], isLoading: listingsLoading } = useQuery({
    queryKey: ["provider-search-listings"],
    queryFn: async () => {
      const session = await getCachedSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, status, suspended")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
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
      return { leads: [], pages: [], placements: [], listings: [], total: 0 };
    }

    // Search leads
    const matchedLeads: SearchResult[] = leads
      .filter((lead) => {
        const phoneMatch =
          normalizedSearchTerm.length >= 3 &&
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

    // Search placements
    const matchedPlacements: SearchResult[] = placements
      .filter((p) => {
        const inquiry = p.concierge_inquiries as Record<string, unknown> | null;
        const name = (inquiry?.user_name as string) || "";
        const status = (inquiry?.status as string) || "";
        const care = (inquiry?.level_of_care as string) || "";
        return (
          name.toLowerCase().includes(searchTerm) ||
          status.toLowerCase().includes(searchTerm) ||
          care.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5)
      .map((p) => {
        const inquiry = p.concierge_inquiries as Record<string, unknown> | null;
        const name = (inquiry?.user_name as string) || "Unknown";
        const status = (inquiry?.status as string) || "new";
        const care = (inquiry?.level_of_care as string) || "";
        return {
          id: p.id,
          type: "placement" as const,
          title: name,
          subtitle: [care, status, p.provider_response].filter(Boolean).join(" • "),
          url: "/provider/placement-network",
          metadata: { status, response: p.provider_response },
        };
      });

    // Search listings
    const matchedListings: SearchResult[] = listings
      .filter((l) => {
        return (
          l.name?.toLowerCase().includes(searchTerm) ||
          l.city?.toLowerCase().includes(searchTerm) ||
          l.state?.toLowerCase().includes(searchTerm)
        );
      })
      .slice(0, 5)
      .map((l) => ({
        id: l.id,
        type: "listing" as const,
        title: l.name,
        subtitle: `${l.city}, ${l.state} • ${l.suspended ? "Suspended" : l.status}`,
        url: `/provider/listings`,
        metadata: { status: l.status, suspended: l.suspended },
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
      placements: matchedPlacements,
      listings: matchedListings,
      total: matchedLeads.length + matchedPages.length + matchedPlacements.length + matchedListings.length,
    };
  }, [debouncedQuery, leads, placements, listings]);

  return {
    results,
    isLoading: (leadsLoading || placementsLoading || listingsLoading) && !!debouncedQuery,
    query: debouncedQuery,
  };
}
