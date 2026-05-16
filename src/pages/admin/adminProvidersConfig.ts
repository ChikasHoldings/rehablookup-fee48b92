/**
 * Shared config for the admin Providers page.
 *
 * AdminProviders.tsx had two near-identical 50-line if/else chains (one for
 * the count query, one for the list query) plus three copies of the SELECT
 * column list. Both grow every time we add a tab. This file collapses both
 * into a single config map: each tab declares its filter function once,
 * and the page applies the same function in both the count and the list
 * queries. Adding a new tab is now one entry, not three.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

// Columns selected from `facilities` for both the list and the count of the
// admin Providers page. Keep this in sync with the `Facility` type in
// src/components/admin/providers/ProviderListItem.tsx.
export const FACILITY_LIST_COLUMNS =
  "id, name, slug, city, state, zip_code, phone, email, website, facility_type, status, featured, verified, suspended, concierge_network_opted_in, logo_url, created_at, updated_at, user_id, data_source, claimed_at, samhsa_facility_id";

export type AdminProvidersTab =
  | "all"
  | "approved"
  | "pending"
  | "suspended"
  | "pro"
  | "placement"
  | "samhsa"
  | "unclaimed"
  | "claimed"
  | "pending_claims";

// A tab filter takes a base `facilities` PostgrestQueryBuilder + the Supabase
// client (for the few tabs that need a subquery — `pro` reads pro_subscriptions
// and `pending_claims` reads facility_claim_requests) and returns the scoped
// query. Returning `null` from the resolver means "no rows match" (used when
// the prerequisite subquery returns an empty set, so we short-circuit instead
// of issuing a `.in("id", [])` that some Supabase versions reject).
export type TabFilter = (
  query: any,
  ctx: { supabase: SupabaseClient<any>; selectCols: string; range?: [number, number] },
) => Promise<any> | any;

// Each tab returns either the modified query or `null` (means "no results,
// short-circuit"). All tabs share the same plumbing in AdminProviders.tsx.
export const TAB_FILTERS: Record<AdminProvidersTab, TabFilter> = {
  all: (q) => q,
  approved: (q) => q.eq("status", "approved").neq("suspended", true),
  pending: (q) => q.eq("status", "pending"),
  suspended: (q) => q.eq("suspended", true),
  placement: (q) => q.eq("concierge_network_opted_in", true),
  samhsa: (q) => q.eq("data_source", "samhsa_import"),
  unclaimed: (q) => q.is("user_id", null),
  claimed: (q) => q.not("user_id", "is", null),

  // Pro / pending_claims pivot on a sibling table — fetch the matching
  // facility_ids first, then constrain the main query. Both return null
  // when the sibling query is empty so the caller can short-circuit.
  pro: async (_q, { supabase, selectCols, range }) => {
    const { data } = await supabase
      .from("facility_subscriptions")
      .select("facility_id")
      .eq("status", "active");
    const ids = (data || []).map((r: { facility_id: string }) => r.facility_id);
    if (!ids.length) return null;
    let q = supabase
      .from("facilities")
      .select(selectCols, range ? { count: "exact" } : undefined)
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (range) q = q.range(range[0], range[1]);
    return q;
  },
  pending_claims: async (_q, { supabase, selectCols, range }) => {
    const { data } = await supabase
      .from("facility_claim_requests")
      .select("facility_id")
      .eq("status", "pending");
    const ids = [...new Set((data || []).map((r: { facility_id: string }) => r.facility_id))];
    if (!ids.length) return null;
    let q = supabase
      .from("facilities")
      .select(selectCols, range ? { count: "exact" } : undefined)
      .in("id", ids)
      .order("created_at", { ascending: false });
    if (range) q = q.range(range[0], range[1]);
    return q;
  },
};

// Apply a search term to any facilities query. Centralized so list + count
// agree on which columns are searchable and how sanitization works.
export function applyProviderSearch<T>(query: T, raw: string): T {
  if (!raw) return query;
  const sanitized = raw.replace(/[%_\\]/g, "");
  if (!sanitized) return query;
  return (query as any).or(
    `name.ilike.%${sanitized}%,city.ilike.%${sanitized}%,email.ilike.%${sanitized}%`,
  );
}
