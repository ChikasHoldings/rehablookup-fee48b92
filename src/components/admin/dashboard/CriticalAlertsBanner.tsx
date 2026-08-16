import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertTriangle, AlertOctagon, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Surfaces the highest-priority admin notifications above the KPI row
 * so ops sees them before anything else on the dashboard. The card
 * collapses entirely when there's nothing to see (no empty-state
 * clutter on a healthy day).
 *
 * Categories surfaced:
 *   • crisis_flag (any unread admin_notification.metadata.crisis_flag=true)
 *     — a seeker who self-reported active risk. Safety-critical, so this stays
 *     regardless of which product wrote the row.
 *   • lead_notification_event_failure — submit-qualified-lead could not record
 *     the notification audit event for a delivered inquiry
 *   • retired_product_webhook — Stripe webhook fired for a retired product,
 *     needs manual reconciliation
 *
 * Historical alert types from the retired Concierge product are still matched
 * so an unread safety row from that era cannot silently disappear, but the
 * call-to-action no longer opens a placement queue — there isn't one. Every
 * alert routes to /admin/notifications, the canonical surface. The alert types
 * themselves are Stage-4 debt.
 */

type CriticalNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const PRIORITY_TYPES = [
  "lead_notification_event_failure",
  "retired_product_webhook",
  // Historical — no longer emitted, matched so unread rows stay visible.
  "concierge_intake_crisis",
  "concierge_no_matches",
  "free_tier_redirect_notify_failure",
];

export function CriticalAlertsBanner() {
  const { data: alerts = [] } = useQuery({
    queryKey: ["admin-critical-alerts"],
    queryFn: async (): Promise<CriticalNotification[]> => {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("id, type, title, message, metadata, created_at")
        .eq("read", false)
        .or(
          `type.in.(${PRIORITY_TYPES.join(",")}),metadata->>crisis_flag.eq.true`,
        )
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) {
        console.error("[CriticalAlertsBanner] fetch failed", error);
        return [];
      }
      return (data || []) as CriticalNotification[];
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  if (alerts.length === 0) return null;

  const counts = alerts.reduce<Record<string, number>>((acc, a) => {
    const isCrisis =
      a.type === "concierge_intake_crisis" ||
      (a.metadata && (a.metadata as Record<string, unknown>).crisis_flag === true);
    const bucket = isCrisis ? "crisis" : a.type;
    acc[bucket] = (acc[bucket] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50/70 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <AlertOctagon className="h-5 w-5 sm:h-6 sm:w-6 text-red-700 mt-0.5 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-red-900">
            {alerts.length} priority {alerts.length === 1 ? "alert" : "alerts"} require attention
          </p>
          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
            {Object.entries(counts).map(([bucket, n]) => (
              <div key={bucket} className="flex items-center gap-2 text-red-800">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="font-medium">{n}×</span>
                <span className="truncate">{labelFor(bucket)}</span>
              </div>
            ))}
          </div>

          {/* Show first 2 most recent alerts inline for context */}
          <div className="mt-3 space-y-1.5 text-xs text-red-900/90">
            {alerts.slice(0, 2).map((a) => (
              <div key={a.id} className="truncate">
                <span className="font-medium">{a.title}</span>
                <span className="opacity-75"> — {a.message}</span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="default" className="bg-red-700 hover:bg-red-800 text-white">
              <Link to="/admin/notifications" className="gap-1.5">
                Review alerts <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="border-red-300 text-red-900 hover:bg-red-100">
              <Link to="/admin/leads">Go to inquiries</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function labelFor(bucket: string): string {
  switch (bucket) {
    case "crisis":
      return "Crisis intake (active risk reported)";
    case "concierge_intake_crisis":
      return "Crisis intake (active risk reported)";
    case "lead_notification_event_failure":
      return "Inquiry notification audit event failed";
    case "concierge_no_matches":
      return "Historical intake — no facilities matched";
    case "free_tier_redirect_notify_failure":
      return "Historical free-tier notification failed";
    case "retired_product_webhook":
      return "Stripe webhook for retired product";
    default:
      return bucket.replace(/_/g, " ");
  }
}
