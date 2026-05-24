import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
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
  { id: "pro-upgrade", type: "page", title: "Upgrade to Pro", subtitle: "$99/mo — featured placement, unlimited listings, Marketing Hub", url: "/provider/billing" },
  { id: "analytics", type: "page", title: "Analytics", subtitle: "Performance metrics", url: "/provider/analytics" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Account preferences", url: "/provider/settings" },
  { id: "notifications", type: "page", title: "Notifications", subtitle: "View all notifications", url: "/provider/notifications" },
  { id: "reviews", type: "page", title: "Reviews", subtitle: "Manage facility reviews", url: "/provider/reviews" },
  { id: "marketing", type: "page", title: "Marketing Hub", subtitle: "Featured + Concierge add-ons", url: "/provider/marketing" },
  { id: "billing", type: "page", title: "Billing", subtitle: "Subscription, payments & invoices", url: "/provider/billing" },
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
  const { data: leads = [], isLoading: leadsLoading, isError: leadsError } = useQuery({
    queryKey: ["provider-search-leads", facilityId],
    queryFn: async () => {
      if (!facilityId) return [];
      const { data, error } = await fromLeadsProviderView()
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
  const { data: placements = [], isLoading: placementsLoading, isError: placementsError } = useQuery({
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

  // Fetch provider's own facilities (listings) for search.
  // Active/approved facilities should outrank archived ones in the
  // result panel — Postgres has no nullable-aware ordering on the
  // string `status` column, so we order by suspended (false first)
  // then status alphabetically (approved < pending < rejected etc.),
  // then by created_at as the tie-breaker.
  const { data: listings = [], isLoading: listingsLoading, isError: listingsError } = useQuery({
    queryKey: ["provider-search-listings"],
    queryFn: async () => {
      const session = await getCachedSession();
      if (!session) return [];
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, status, suspended")
        .eq("user_id", session.user.id)
        .order("suspended", { ascending: true })
        .order("status", { ascending: true })
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

  // Strip combining diacritical marks so a search for "Jose" matches
  // a lead row stored as "José" — significant for our Spanish-speaking
  // seeker demographic. Uses Unicode NFD then drops the combining
  // range; works on every modern browser since `String.normalize`
  // ships in Node 12+ / Chrome 67+ / Safari 10+.
  const stripDiacritics = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // True if EVERY whitespace-delimited token in the query appears
  // somewhere in any of the supplied haystack strings. Lets "John 555"
  // match a lead named "John Smith" with phone 555-1234 — the previous
  // monolithic `includes` only matched if the literal phrase appeared
  // verbatim. Empty haystacks short-circuit to false.
  const tokensMatchAll = (tokens: string[], haystacks: string[]): boolean => {
    if (tokens.length === 0) return true;
    const joined = haystacks.filter(Boolean).map(stripDiacritics).join(" ").toLowerCase();
    if (!joined) return false;
    return tokens.every((t) => joined.includes(t));
  };

  // Filter and format results
  const results = useMemo(() => {
    const rawTerm = debouncedQuery.trim();
    if (!rawTerm) {
      return { leads: [], pages: [], placements: [], listings: [], total: 0 };
    }

    // Tokenize: split on whitespace, lowercase + strip diacritics on
    // each. The whole-string phone digits are kept separately so a
    // pure-digit token still matches the normalized phone via the
    // existing prefix logic.
    const normalizedTerm = stripDiacritics(rawTerm).toLowerCase();
    const tokens = normalizedTerm.split(/\s+/).filter(Boolean);
    const phoneDigits = rawTerm.replace(/\D/g, "");

    // Search leads
    const matchedLeads: SearchResult[] = leads
      .filter((lead) => {
        const phoneMatch =
          phoneDigits.length >= 3 &&
          normalizePhone(lead.phone).includes(phoneDigits);
        if (phoneMatch) return true;
        return tokensMatchAll(tokens, [
          lead.name || "",
          lead.email || "",
          lead.message || "",
          lead.location_city_state || "",
        ]);
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
        return tokensMatchAll(tokens, [name, status, care]);
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
          // The retired /provider/placement-network route redirected
          // to /provider/marketing (hub) which then required another
          // click to drill into the concierge management UI. Route
          // straight to the management surface so the click lands the
          // user on the screen where they can actually act on this
          // placement.
          url: "/provider/marketing/concierge",
          metadata: { status, response: p.provider_response },
        };
      });

    // Search listings
    const matchedListings: SearchResult[] = listings
      .filter((l) =>
        tokensMatchAll(tokens, [l.name || "", l.city || "", l.state || ""]),
      )
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
    const matchedPages: SearchResult[] = NAVIGATION_PAGES.filter((page) =>
      tokensMatchAll(tokens, [page.title, page.subtitle || ""]),
    );

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
    // Surface prefetch failures so the UI can show an error state
    // instead of rendering "No results for X" — which is misleading
    // when the cache is empty because the network call failed.
    isError: leadsError || placementsError || listingsError,
    query: debouncedQuery,
  };
}
