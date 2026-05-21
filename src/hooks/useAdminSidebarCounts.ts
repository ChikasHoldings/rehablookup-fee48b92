import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  resolveNotificationRoute,
  type AdminRouteKey,
} from "@/lib/notificationRouteMap";

/**
 * Sidebar badges now reflect ONLY unread notification counts, grouped
 * by the admin route the notification belongs to. The mapping lives in
 * `src/lib/notificationRouteMap.ts` so every surface (sidebar badges,
 * notification list click-through) agrees on where a given type
 * routes.
 *
 * Two sources contribute to each route's badge:
 *  1. `admin_notifications` — global broadcast stream
 *  2. `admin_user_notifications` — per-user personal stream (filtered
 *     to the current user via RLS)
 *
 * Both tables are in the supabase_realtime publication (migrations
 * 20260626000000 + 20260630000000). This hook subscribes to both so
 * the badges update within ~200ms of any notification insert / read
 * flip / delete. A 60s polling fallback covers channel drops.
 */

// Legacy field names retained as keys for sidebar items that historically
// surfaced operational counts (leads / pendingProviders / etc.). They
// now report UNREAD NOTIFICATION counts for the route, not raw status
// row counts. See adminNavConfig.ts for how `countKey` resolves.
export interface AdminSidebarCounts {
  // Per-route unread counts — primary surface for sidebar badges.
  unreadByRoute: Record<AdminRouteKey, number>;

  // Total unread (header bell icon, mobile nav). Equals the sum of
  // both streams' unread rows.
  totalUnread: number;

  // Legacy keys mapped to per-route unread for backwards compatibility
  // with existing adminNavConfig.ts entries. Each maps to the route
  // its sidebar item points at.
  leads: number;                  // -> /admin/leads
  pendingProviders: number;       // -> /admin/providers
  supportTickets: number;         // -> /admin/support
  pendingReviews: number;         // -> /admin/reviews
  placements: number;             // -> /admin/concierge
  marketingLeads: number;         // -> /admin/marketing
  openEscalations: number;        // -> /admin/escalations
  insuranceVerifications: number; // -> /admin/insurance-verifications
}

const EMPTY_ROUTE_MAP: Record<AdminRouteKey, number> = {
  "/admin/providers": 0,
  "/admin/leads": 0,
  "/admin/subscriptions": 0,
  "/admin/reviews": 0,
  "/admin/escalations": 0,
  "/admin/security-logs": 0,
  "/admin/concierge": 0,
  "/admin/support": 0,
  "/admin/not-found-events": 0,
  "/admin/marketing": 0,
  "/admin/email-logs": 0,
  "/admin/seekers": 0,
  "/admin/insurance-verifications": 0,
  "/admin/notifications": 0,
};

export function useAdminSidebarCounts() {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["admin-sidebar-unread-counts"],
    queryFn: async (): Promise<AdminSidebarCounts> => {
      const { data: { user } } = await supabase.auth.getUser();

      // Fetch only what we need: `type` so we can aggregate by route.
      // `read=false` filter is applied server-side. Cap at 5000 each
      // (more than 5000 unread is a triage failure, not a UI concern).
      const [globalRes, userRes] = await Promise.all([
        supabase
          .from("admin_notifications")
          .select("type")
          .eq("read", false)
          .limit(5000),
        user
          ? supabase
              .from("admin_user_notifications")
              .select("type")
              .eq("user_id", user.id)
              .eq("read", false)
              .limit(5000)
          : Promise.resolve({ data: [], error: null } as { data: Array<{ type: string }>; error: null }),
      ]);

      if (globalRes.error) throw new Error(`Global unread fetch failed: ${globalRes.error.message}`);
      if (userRes.error) throw new Error(`Personal unread fetch failed: ${userRes.error.message}`);

      const routeCounts: Record<AdminRouteKey, number> = { ...EMPTY_ROUTE_MAP };
      let totalUnread = 0;

      for (const row of globalRes.data || []) {
        const route = resolveNotificationRoute(row.type);
        routeCounts[route] = (routeCounts[route] || 0) + 1;
        totalUnread += 1;
      }
      for (const row of userRes.data || []) {
        const route = resolveNotificationRoute(row.type);
        routeCounts[route] = (routeCounts[route] || 0) + 1;
        totalUnread += 1;
      }

      return {
        unreadByRoute: routeCounts,
        totalUnread,
        // Backwards-compatible alias fields, each pulling from the
        // route map so the sidebar's existing `countKey` lookups still
        // resolve through this hook.
        leads: routeCounts["/admin/leads"],
        pendingProviders: routeCounts["/admin/providers"],
        supportTickets: routeCounts["/admin/support"],
        pendingReviews: routeCounts["/admin/reviews"],
        placements: routeCounts["/admin/concierge"],
        marketingLeads: routeCounts["/admin/marketing"],
        openEscalations: routeCounts["/admin/escalations"],
        insuranceVerifications: routeCounts["/admin/insurance-verifications"],
      };
    },
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
    retry: 1,
  });

  // Realtime invalidation: any change to either notifications table
  // re-pulls the unread counts. Cheap because we only SELECT `type`.
  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-sidebar-unread-counts"] });
    };
    const channel = supabase
      .channel(`admin-sidebar-unread-live-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_notifications" },
        invalidate,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "admin_user_notifications" },
        invalidate,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}
