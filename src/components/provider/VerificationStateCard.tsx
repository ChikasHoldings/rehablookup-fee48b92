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
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Upload,
  HelpCircle,
  Clock,
  History,
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

function humanizeEventType(type: string): string {
  return EVENT_LABEL[type] ?? type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// resolution is free-text written by the monitoring engine / admins. We
// classify the known states and humanize anything unrecognized so a new
// status string never renders as a raw snake_case token.
const OPEN_RESOLUTIONS = new Set([
  "pending",
  "notified",
  "lapsed",
  "pending_review",
  "open",
  "in_progress",
]);
const RESOLVED_RESOLUTIONS = new Set([
  "resolved",
  "cleared",
  "auto_resolved",
  "dismissed",
  "confirmed",
  "verified",
]);

function formatResolution(resolution: string | null): {
  label: string;
  tone: "open" | "resolved" | "neutral";
} {
  const r = (resolution ?? "").toLowerCase();
  if (!r) return { label: "Open", tone: "open" };
  const human = r.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  if (RESOLVED_RESOLUTIONS.has(r)) return { label: human, tone: "resolved" };
  if (OPEN_RESOLUTIONS.has(r)) return { label: human, tone: "open" };
  return { label: human, tone: "neutral" };
}

function resolutionPillClass(tone: "open" | "resolved" | "neutral"): string {
  const base = "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ";
  if (tone === "resolved") return base + "bg-emerald-100 text-emerald-700";
  if (tone === "open") return base + "bg-amber-100 text-amber-700";
  return base + "bg-slate-100 text-slate-600";
}

interface FullHistoryEvent {
  id: string;
  event_type: string;
  severity: "soft" | "medium" | "hard";
  resolution: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
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
  // (probably never verified). Previously this rendered nothing, which left
  // "is my listing verified?" unanswered on the dashboard and — worse — left a
  // gap the Pro upsell used to fill with a "Verified badge" promise. Render the
  // honest not-yet state instead, and say plainly that verification is earned
  // rather than purchased.
  if (!state) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b py-3.5">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4 text-slate-400" aria-hidden />
            Verification
          </CardTitle>
          <Badge variant="secondary" className="text-[11px] font-medium">
            Not verified yet
          </Badge>
        </CardHeader>
        <CardContent className="space-y-2.5 p-4 sm:p-5">
          <p className="text-xs leading-relaxed text-slate-600">
            RehabLookup verifies facilities against authoritative sources — licensing,
            accreditation, and SAMHSA records. Keeping your credentials current on your
            listing is what puts you in the review queue.
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500">
            Verification is earned through our review process. It is never sold, bundled
            with Pro, or affected by what you spend.
          </p>
          <Button asChild variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
            <Link to="/provider/listings">
              <Upload className="h-3.5 w-3.5" aria-hidden />
              Add credentials
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

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
            <ReVerificationHistoryDialog
              facilityId={facilityId}
              trigger={
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 shrink-0 gap-1 px-2 text-xs text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-800 dark:text-emerald-400"
                >
                  <History className="h-3.5 w-3.5" aria-hidden />
                  History
                </Button>
              }
            />
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
          <ReVerificationHistoryDialog
            facilityId={facilityId}
            trigger={
              <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs">
                <History className="h-3 w-3" aria-hidden />
                Full history
              </Button>
            }
          />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Full re-verification event log for one facility, shown in a dialog.
 * Lazily fetches every event (newest first) only when opened, so the
 * dashboard card stays cheap. Read access is owner-or-admin (RLS:
 * re_verification_events_select_owner_or_admin).
 */
function ReVerificationHistoryDialog({
  facilityId,
  trigger,
}: {
  facilityId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["re-verification-history", facilityId],
    enabled: open,
    staleTime: 1000 * 60,
    queryFn: async (): Promise<FullHistoryEvent[]> => {
      const { data, error } = await supabase
        .from("re_verification_events")
        .select(
          "id, event_type, severity, resolution, resolution_notes, created_at, resolved_at",
        )
        .eq("facility_id", facilityId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as FullHistoryEvent[];
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4 text-muted-foreground" aria-hidden />
            Verification history
          </DialogTitle>
          <DialogDescription>
            Every re-check signal recorded for this listing, newest first.
            RehabLookup logs each one automatically — you can't be penalized
            for a signal you've already resolved.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-destructive">
            Couldn't load history. Close this and try again.
          </p>
        ) : !data || data.length === 0 ? (
          <div className="py-8 text-center">
            <ShieldCheck className="mx-auto h-8 w-8 text-emerald-500/70" aria-hidden />
            <p className="mt-2 text-sm font-medium">No re-check signals yet</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Nothing has flagged your listing for re-verification. New signals
              will appear here as they happen.
            </p>
          </div>
        ) : (
          <ScrollArea className="-mr-3 max-h-[55vh] pr-3">
            <ul className="space-y-2.5">
              {data.map((e) => {
                const r = formatResolution(e.resolution);
                return (
                  <li
                    key={e.id}
                    className="rounded-md border border-border/60 p-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge
                          variant={
                            e.severity === "hard"
                              ? "destructive"
                              : e.severity === "medium"
                                ? "secondary"
                                : "outline"
                          }
                          className="h-4 shrink-0 text-[10px]"
                        >
                          {e.severity}
                        </Badge>
                        <span className="truncate text-sm font-medium">
                          {humanizeEventType(e.event_type)}
                        </span>
                      </div>
                      <span className={resolutionPillClass(r.tone)}>{r.label}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <Clock className="h-3 w-3" aria-hidden />
                      <span>
                        {new Date(e.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      {e.resolved_at && (
                        <span>
                          · resolved{" "}
                          {new Date(e.resolved_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                    {e.resolution_notes && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {e.resolution_notes}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
