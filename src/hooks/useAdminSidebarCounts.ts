import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Admin sidebar badges = the live count of *actionable / pending* items in each
 * section's work queue, read straight from the source-of-truth table using the
 * SAME filter the section's own page uses for its "pending" view. The badge
 * therefore always matches what the admin sees when they open the page.
 *
 * This replaced an older "unread notifications per route" model whose badges
 * drifted from reality: informational notifications (provider_signup,
 * claim_rejection_email_sent, orphaned_lead_closed, system_maintenance, …) were
 * never cleared by doing the work, so e.g. Providers showed 15 while there were
 * zero pending claims. Cross-cutting alerts still live in the notifications bell
 * (/admin/notifications) — the sidebar is now strictly about open work.
 *
 * Correctness / freshness guarantees:
 *  - Each count is a `head:true` / `count:exact` query — no rows transferred —
 *    and is RLS-scoped, so a badge only counts rows the current admin may see.
 *  - Counts refresh on a 60s poll AND immediately via postgres_changes on every
 *    source table (all are in the supabase_realtime publication), so a badge
 *    never shows a stale or phantom number.
 *  - A single failing count degrades to 0 for that one badge (logged) instead of
 *    blanking the whole sidebar.
 */

// Keys map 1:1 to nav items via `countKey` in adminNavConfig.ts. Only sections
// with a well-defined "needs attention" queue appear here; log/monitor pages
// (security, email, 404, audit) and management pages (subscriptions, seekers)
// intentionally have no badge.
export interface AdminSidebarCounts {
  leads: number;                  // /admin/leads                   leads.status = 'new'
  pendingProviders: number;       // /admin/providers               facility_claim_requests.status = 'pending'
  supportTickets: number;         // /admin/support                 support_tickets.status in ('new','open')
  pendingReviews: number;         // /admin/reviews                 facility_reviews + review_disputes, status = 'pending'
  placements: number;             // /admin/concierge               concierge_inquiries, status not in ('completed','closed')
  marketingLeads: number;         // /admin/marketing               marketing_leads.status = 'new'
  openEscalations: number;        // /admin/escalations             admin_escalations.status in ('open','in_progress')
  insuranceVerifications: number; // /admin/insurance-verifications  insurance_verification_requests.status in ('new','in_progress')
  reVerificationPending: number;  // /admin/re-verification         re_verification_events.resolution in (pending,notified,lapsed,pending_review)
}

const ZERO_COUNTS: AdminSidebarCounts = {
  leads: 0,
  pendingProviders: 0,
  supportTickets: 0,
  pendingReviews: 0,
  placements: 0,
  marketingLeads: 0,
  openEscalations: 0,
  insuranceVerifications: 0,
  reVerificationPending: 0,
};

// Every table whose rows can change a badge. We subscribe to all of them so a
// badge updates the moment the underlying queue changes, not just on the poll.
const SOURCE_TABLES = [
  "facility_claim_requests",
  "facility_reviews",
  "review_disputes",
  "support_tickets",
  "admin_escalations",
  "leads",
  "concierge_inquiries",
  "insurance_verification_requests",
  "marketing_leads",
  "re_verification_events",
] as const;

const QUERY_KEY = ["admin-sidebar-pending-counts"] as const;

// Pull the row count out of a PostgREST head/count response, degrading to 0 (and
// logging) if that one query failed — one bad count must not blank the sidebar.
function toCount(
  res: { count: number | null; error: { message: string } | null },
  label: string,
): number {
  if (res.error) {
    console.warn(`[admin-sidebar-counts] ${label} count failed:`, res.error.message);
    return 0;
  }
  return res.count ?? 0;
}

export function useAdminSidebarCounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AdminSidebarCounts> => {
      const head = { count: "exact" as const, head: true };

      const [
        claimsRes,
        reviewsRes,
        disputesRes,
        supportRes,
        escalationsRes,
        leadsRes,
        placementsRes,
        insuranceRes,
        marketingRes,
        reverifyRes,
      ] = await Promise.all([
        supabase.from("facility_claim_requests").select("id", head).eq("status", "pending"),
        supabase.from("facility_reviews").select("id", head).eq("status", "pending"),
        supabase.from("review_disputes").select("id", head).eq("status", "pending"),
        supabase.from("support_tickets").select("id", head).in("status", ["new", "open"]),
        supabase.from("admin_escalations").select("id", head).in("status", ["open", "in_progress"]),
        supabase.from("leads").select("id", head).eq("status", "new"),
        supabase.from("concierge_inquiries").select("id", head).not("status", "in", "(completed,closed)"),
        supabase.from("insurance_verification_requests").select("id", head).in("status", ["new", "in_progress"]),
        supabase.from("marketing_leads").select("id", head).eq("status", "new"),
        supabase
          .from("re_verification_events")
          .select("id", head)
          .in("resolution", ["pending", "notified", "lapsed", "pending_review"]),
      ]);

      return {
        leads: toCount(leadsRes, "leads"),
        pendingProviders: toCount(claimsRes, "providers"),
        supportTickets: toCount(supportRes, "support"),
        pendingReviews: toCount(reviewsRes, "reviews") + toCount(disputesRes, "review-disputes"),
        placements: toCount(placementsRes, "placements"),
        marketingLeads: toCount(marketingRes, "marketing"),
        openEscalations: toCount(escalationsRes, "escalations"),
        insuranceVerifications: toCount(insuranceRes, "insurance"),
        reVerificationPending: toCount(reverifyRes, "re-verification"),
      };
    },
    // Show "no badge" (zeros) while the first fetch is in flight rather than a
    // possibly-wrong cached value — a badge is never shown until it's real.
    placeholderData: ZERO_COUNTS,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  // Push-update: any insert/update/delete on a queue table re-pulls the counts.
  // Cheap because every query is head-only (no rows). The 60s poll above is the
  // fallback if the realtime channel drops.
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    };
    const channel = supabase.channel(
      `admin-sidebar-counts-${Math.random().toString(36).slice(2, 8)}`,
    );
    for (const table of SOURCE_TABLES) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, invalidate);
    }
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
