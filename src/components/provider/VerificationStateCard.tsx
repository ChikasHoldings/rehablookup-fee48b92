/**
 * VerificationStateCard
 * ─────────────────────
 * Surfaces the live verification state of a single facility on the
 * provider dashboard. Pulls from facility_verification_state +
 * re_verification_events (both populated by the monitoring engine —
 * migrations 20260803…20260805).
 *
 * Two display modes:
 *   1. healthy   — state=verified, badge visible. Renders compact "all
 *      good" card with the recency hint ("Verified · confirmed Mar 2026")
 *      and the next-check date. No CTAs.
 *   2. attention — state ≠ verified. Highlights the issue, shows the
 *      remediation deadline, and surfaces clear next steps (upload
 *      document, contact support).
 *
 * Provider can only TAKE action — they can't resolve events themselves.
 * Resolution is admin-side via /admin/re-verification.
 */

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Upload,
  HelpCircle,
  Clock,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type VerificationState =
  | "verified"
  | "review_due"
  | "expiring_soon"
  | "lapsed"
  | "suspended";

interface StateRow {
  state: VerificationState;
  badge_visible: boolean;
  last_verified_at: string | null;
  next_check_due: string | null;
  remediation_deadline: string | null;
  last_trigger: string | null;
}

interface RecentEvent {
  id: string;
  event_type: string;
  severity: "soft" | "medium" | "hard";
  created_at: string;
}

const EVENT_LABEL: Record<string, string> = {
  samhsa_dropout: "SAMHSA listing changed",
  license_expiring_60d: "License expires in 60 days",
  license_expiring_30d: "License expires in 30 days",
  license_expired: "License past expiry",
  accreditation_lapsed: "Accreditation lapsed",
  backstop_sweep_due: "Routine re-check",
  competing_claim: "New claim filed",
  provider_field_edit: "Listing field changed",
  user_report: "User-reported issue",
  google_permanently_closed: "Google reports closure",
  address_change: "Address changed",
};

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function recencyLabel(last: string | null): string {
  if (!last) return "Verified";
  const d = new Date(last);
  if (Number.isNaN(d.getTime())) return "Verified";
  return `Verified · confirmed ${d.toLocaleDateString(undefined, { month: "short", year: "numeric" })}`;
}

export function VerificationStateCard({
  facilityId,
}: {
  facilityId: string | undefined;
}) {
  const [state, setState] = useState<StateRow | null>(null);
  const [events, setEvents] = useState<RecentEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!facilityId) return;
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: sRow }, { data: eRows }] = await Promise.all([
        supabase
          .from("facility_verification_state")
          .select(
            "state, badge_visible, last_verified_at, next_check_due, remediation_deadline, last_trigger",
          )
          .eq("facility_id", facilityId)
          .maybeSingle(),
        supabase
          .from("re_verification_events")
          .select("id, event_type, severity, created_at")
          .eq("facility_id", facilityId)
          .in("resolution", ["pending", "notified", "lapsed", "pending_review"])
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      if (!mounted) return;
      setState((sRow as StateRow | null) ?? null);
      setEvents((eRows ?? []) as RecentEvent[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [facilityId]);

  if (!facilityId || loading) return null;
  // No state row means the facility isn't yet in the engine's population
  // (probably never verified). Don't render — there's nothing to action.
  if (!state) return null;

  const remediationDays = daysFromNow(state.remediation_deadline);
  const healthy = state.state === "verified" && state.badge_visible;

  if (healthy) {
    return (
      <Card className="border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20">
        <CardContent className="p-3.5">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{recencyLabel(state.last_verified_at)}</p>
              <p className="text-xs text-muted-foreground">
                Listing badge is live. RehabLookup re-checks authoritative
                sources continuously.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tone = state.state === "suspended" ? "destructive"
    : state.state === "lapsed" ? "destructive"
    : state.state === "expiring_soon" ? "warning"
    : "warning";

  const headerClass = tone === "destructive"
    ? "border-red-300/70 bg-red-50/50 dark:bg-red-950/20"
    : "border-amber-300/70 bg-amber-50/40 dark:bg-amber-950/20";
  const iconBg = tone === "destructive"
    ? "bg-red-500/15 text-red-700 dark:text-red-400"
    : "bg-amber-500/15 text-amber-700 dark:text-amber-400";

  const headline = state.state === "suspended"
    ? "Listing suspended"
    : state.state === "lapsed"
    ? "Verified badge paused"
    : state.state === "expiring_soon"
    ? "License/accreditation expiring soon"
    : "Action needed on your listing";

  return (
    <Card className={headerClass}>
      <CardHeader className="pb-2 pt-3.5 px-3.5">
        <CardTitle className="flex items-center gap-2 text-sm">
          <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${iconBg}`}>
            {state.state === "suspended" || state.state === "lapsed" ? (
              <ShieldAlert className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
          </div>
          {headline}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3.5 pb-3.5 pt-0 space-y-2.5">
        {!state.badge_visible && state.state !== "suspended" && (
          <p className="text-xs text-muted-foreground">
            Your listing remains live, but the verified badge is hidden
            while we re-confirm. Upload a current document below to
            restore it.
          </p>
        )}
        {state.state === "suspended" && (
          <p className="text-xs text-muted-foreground">
            Your listing is currently unpublished. Reach out to support
            to begin remediation.
          </p>
        )}
        {remediationDays != null && remediationDays > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
            <span className="text-muted-foreground">
              Remediation window: <span className="font-medium text-foreground">{remediationDays} day{remediationDays === 1 ? "" : "s"}</span>
            </span>
          </div>
        )}

        {events.length > 0 && (
          <div className="space-y-1 border-t pt-2 mt-2 border-border/50">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
              Recent signals
            </p>
            {events.map((e) => (
              <div key={e.id} className="flex items-center gap-2 text-xs">
                <Badge
                  variant={e.severity === "hard" ? "destructive" : e.severity === "medium" ? "secondary" : "outline"}
                  className="text-[10px] h-4"
                >
                  {e.severity}
                </Badge>
                <span className="flex-1 min-w-0 truncate">{EVENT_LABEL[e.event_type] ?? e.event_type}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1">
          {state.state !== "suspended" && (
            <Button asChild size="sm" variant="default" className="h-7 text-xs">
              <Link to="/provider/listings">
                <Upload className="h-3 w-3 mr-1" aria-hidden />
                Upload document
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline" className="h-7 text-xs">
            <Link to="/provider/help">
              <HelpCircle className="h-3 w-3 mr-1" aria-hidden />
              Get help
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost" className="h-7 text-xs">
            <Link to="/provider/notifications?type=listings">
              History
              <ChevronRight className="h-3 w-3 ml-0.5" aria-hidden />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
