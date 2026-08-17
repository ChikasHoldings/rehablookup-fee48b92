import { useState, useMemo, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fromLeadsProviderView } from "@/lib/leadsProviderView";
import { getCachedSession } from "@/lib/sessionCache";

export interface SearchResult {
  id: string;
  type: "lead" | "page" | "listing";
  title: string;
  subtitle?: string;
  url: string;
  metadata?: Record<string, unknown>;
}

// Command-palette destinations. Titles mirror the sidebar's job-shaped labels
// so searching for what you see in the nav actually finds it. The Pro entry
// describes what Pro publishes — it used to promise "featured placement", which
// Pro has never included.
const NAVIGATION_PAGES: SearchResult[] = [
  { id: "dashboard", type: "page", title: "Dashboard", subtitle: "Overview & statistics", url: "/provider/dashboard" },
  { id: "listing", type: "page", title: "Listings", subtitle: "Edit facility information", url: "/provider/listings" },
  { id: "enhanced-profile", type: "page", title: "Enhanced Profile", subtitle: "Programs, amenities, staff, media", url: "/provider/listings/profile" },
  { id: "inquiries", type: "page", title: "Inquiries", subtitle: "View all inquiries", url: "/provider/inquiries" },
  { id: "reviews", type: "page", title: "Reviews", subtitle: "Manage facility reviews", url: "/provider/reviews" },
  { id: "claims", type: "page", title: "Listing Claims", subtitle: "Claim status & history", url: "/provider/claims" },
  { id: "analytics", type: "page", title: "Performance", subtitle: "Search appearances, views, inquiries", url: "/provider/analytics" },
  { id: "marketing", type: "page", title: "Featured", subtitle: "Sponsored advertising, billed separately", url: "/provider/marketing" },
  { id: "billing", type: "page", title: "Plan & Billing", subtitle: "Plan, payments & invoices", url: "/provider/billing" },
  { id: "pro-upgrade", type: "page", title: "Upgrade to Pro", subtitle: "$99/mo — public phone, enhanced profile, rich media, up to 5 listings", url: "/provider/billing" },
  { id: "settings", type: "page", title: "Settings", subtitle: "Account preferences", url: "/provider/settings" },
  { id: "notifications", type: "page", title: "Notifications", subtitle: "View all notifications", url: "/provider/notifications" },
  { id: "help", type: "page", title: "Help & Support", subtitle: "FAQ, knowledge base, tickets", url: "/provider/help" },
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
  const stripDiacritics = useCallback(
    (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    [],
  );

  // True if EVERY whitespace-delimited token in the query appears
  // somewhere in any of the supplied haystack strings. Lets "John 555"
  // match a lead named "John Smith" with phone 555-1234 — the previous
  // monolithic `includes` only matched if the literal phrase appeared
  // verbatim. Empty haystacks short-circuit to false.
  const tokensMatchAll = useCallback(
    (tokens: string[], haystacks: string[]): boolean => {
      if (tokens.length === 0) return true;
      const joined = haystacks.filter(Boolean).map(stripDiacritics).join(" ").toLowerCase();
      if (!joined) return false;
      return tokens.every((t) => joined.includes(t));
    },
    [stripDiacritics],
  );

  // Filter and format results
  const results = useMemo(() => {
    const rawTerm = debouncedQuery.trim();
    if (!rawTerm) {
      return { leads: [], pages: [], listings: [], total: 0 };
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
      listings: matchedListings,
      total: matchedLeads.length + matchedPages.length + matchedListings.length,
    };
  }, [debouncedQuery, leads, listings, tokensMatchAll, stripDiacritics]);

  return {
    results,
    isLoading: (leadsLoading || listingsLoading) && !!debouncedQuery,
    // Surface prefetch failures so the UI can show an error state
    // instead of rendering "No results for X" — which is misleading
    // when the cache is empty because the network call failed.
    isError: leadsError || listingsError,
    query: debouncedQuery,
  };
}
