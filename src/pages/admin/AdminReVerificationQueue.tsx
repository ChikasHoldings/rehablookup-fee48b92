/**
 * AdminReVerificationQueue
 * ────────────────────────
 * Admin triage surface for re_verification_events fired by the
 * monitoring engine (migration 20260804000000).
 *
 * The engine continuously raises events from four sources — data-feed
 * diffs, accreditation expiry sweeps, the periodic backstop, and
 * trigger-driven events (competing claims, provider field edits, Google
 * "permanently closed"). Soft + medium signals notify the provider and
 * advance state automatically; hard signals (and any 'pending_review')
 * land in this queue for a human to resolve.
 *
 * Actions on each row:
 *   • Remediated — restores state=verified + badge_visible
 *   • Suspended  — unpublishes the listing
 *   • Noop       — closes the event without state change (e.g. dup data)
 *   • Superseded — closes when a later event makes this one stale
 *
 * Each resolution calls resolve_re_verification_event() (admin-gated
 * SECURITY DEFINER RPC). RLS scopes the queue to admins; non-admins
 * never reach this route.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Severity = "soft" | "medium" | "hard";
type Resolution =
  | "pending"
  | "noop"
  | "notified"
  | "lapsed"
  | "suspended"
  | "pending_review"
  | "remediated"
  | "superseded";

interface EventRow {
  id: string;
  facility_id: string;
  event_type: string;
  severity: Severity;
  resolution: Resolution;
  resolution_notes: string | null;
  payload: Record<string, unknown> | null;
  dedup_key: string | null;
  created_at: string;
  resolved_at: string | null;
  facilities: {
    id: string;
    name: string;
    slug: string;
    city: string | null;
    state: string | null;
    verified: boolean | null;
    suspended: boolean | null;
  } | null;
}

const SEVERITY_LABEL: Record<Severity, string> = {
  soft: "Soft",
  medium: "Medium",
  hard: "Hard",
};

const SEVERITY_VARIANT: Record<
  Severity,
  "default" | "secondary" | "destructive" | "outline"
> = {
  soft: "outline",
  medium: "secondary",
  hard: "destructive",
};

const RESOLUTION_LABEL: Record<Resolution, string> = {
  pending: "Pending",
  noop: "Noop",
  notified: "Notified",
  lapsed: "Lapsed",
  suspended: "Suspended",
  pending_review: "Pending review",
  remediated: "Remediated",
  superseded: "Superseded",
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  samhsa_dropout: "SAMHSA drop-out",
  license_expiring_60d: "License expires in 60d",
  license_expiring_30d: "License expires in 30d",
  license_expired: "License expired",
  accreditation_lapsed: "Accreditation lapsed",
  backstop_sweep_due: "Backstop sweep due",
  competing_claim: "Competing claim",
  provider_field_edit: "Provider edited key field",
  user_report: "User reported issue",
  google_permanently_closed: "Google: permanently closed",
  address_change: "Address change",
};

type StatusFilter = "open" | "pending_review" | "resolved" | "all";

function formatTimestamp(ts: string | null): string {
  if (!ts) return "—";
  const d = new Date(ts);
  return Number.isNaN(d.getTime())
    ? ts
    : d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function ageOf(ts: string): string {
  const d = new Date(ts).getTime();
  if (Number.isNaN(d)) return "—";
  const diffMs = Date.now() - d;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "<1h";
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export default function AdminReVerificationQueue() {
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [search, setSearch] = useState("");
  const [resolveDialog, setResolveDialog] = useState<{
    event: EventRow;
    resolution: Resolution;
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolveInFlight, setResolveInFlight] = useState(false);

  async function fetchEvents() {
    setRefreshing(true);
    let query = supabase
      .from("re_verification_events")
      .select(
        "id, facility_id, event_type, severity, resolution, resolution_notes, payload, dedup_key, created_at, resolved_at, facilities ( id, name, slug, city, state, verified, suspended )",
      )
      .order("created_at", { ascending: false })
      .limit(500);

    if (statusFilter === "open") {
      query = query.in("resolution", ["pending", "notified", "lapsed"]);
    } else if (statusFilter === "pending_review") {
      query = query.eq("resolution", "pending_review");
    } else if (statusFilter === "resolved") {
      query = query.in("resolution", [
        "noop",
        "remediated",
        "suspended",
        "superseded",
      ]);
    }
    if (severityFilter !== "all") {
      query = query.eq("severity", severityFilter);
    }

    const { data, error } = await query;
    if (error) {
      toast.error(`Failed to load events: ${error.message}`);
      setRefreshing(false);
      setLoading(false);
      return;
    }
    setEvents((data ?? []) as unknown as EventRow[]);
    setLoading(false);
    setRefreshing(false);
  }

  useEffect(() => {
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter]);

  const filtered = useMemo(() => {
    if (!search.trim()) return events;
    const q = search.trim().toLowerCase();
    return events.filter((e) => {
      const fn = e.facilities?.name?.toLowerCase() ?? "";
      const et = e.event_type.toLowerCase();
      return fn.includes(q) || et.includes(q);
    });
  }, [events, search]);

  const counts = useMemo(() => {
    const open = events.filter((e) =>
      ["pending", "notified", "lapsed"].includes(e.resolution),
    ).length;
    const review = events.filter(
      (e) => e.resolution === "pending_review",
    ).length;
    const hard = events.filter((e) => e.severity === "hard").length;
    return { open, review, hard };
  }, [events]);

  async function submitResolution() {
    if (!resolveDialog) return;
    setResolveInFlight(true);
    const { error } = await supabase.rpc("resolve_re_verification_event", {
      p_event_id: resolveDialog.event.id,
      p_resolution: resolveDialog.resolution,
      p_notes: resolveNotes.trim() || null,
    });
    setResolveInFlight(false);
    if (error) {
      toast.error(`Failed to resolve: ${error.message}`);
      return;
    }
    toast.success(
      `Marked ${RESOLUTION_LABEL[resolveDialog.resolution].toLowerCase()}`,
    );
    setResolveDialog(null);
    setResolveNotes("");
    fetchEvents();
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ShieldAlert className="h-6 w-6" aria-hidden />
            Re-verification queue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Events raised by the monitoring engine that need a human
            decision. Soft signals self-resolve via provider notification;
            anything here is medium / hard or waiting on confirmation.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchEvents}
          disabled={refreshing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            aria-hidden
          />
          Refresh
        </Button>
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Open
          </div>
          <div className="text-2xl font-semibold mt-1">{counts.open}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Pending / notified / lapsed
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Awaiting review
          </div>
          <div className="text-2xl font-semibold mt-1">{counts.review}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Hard signals (config gates auto-suspend)
          </div>
        </div>
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            Hard severity
          </div>
          <div className="text-2xl font-semibold mt-1">{counts.hard}</div>
          <div className="text-xs text-muted-foreground mt-1">
            Closed-status, license-revoked, etc.
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            aria-hidden
          />
          <Input
            placeholder="Search facility / event type"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="pending_review">Pending review</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={severityFilter}
          onValueChange={(v) => setSeverityFilter(v as "all" | Severity)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="soft">Soft</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="hard">Hard</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event</TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Age</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No events match this filter. The engine reports nothing to
                  triage.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((event) => {
                const isOpen =
                  event.resolution === "pending" ||
                  event.resolution === "notified" ||
                  event.resolution === "lapsed" ||
                  event.resolution === "pending_review";
                return (
                  <TableRow key={event.id}>
                    <TableCell>
                      <div className="font-medium">
                        {EVENT_TYPE_LABEL[event.event_type] ?? event.event_type}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {event.event_type}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {event.facilities?.name ?? "(unknown)"}
                      </div>
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        {event.facilities?.city}, {event.facilities?.state}
                        {event.facilities?.slug && (
                          <a
                            href={`/facility/${event.facilities.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-1 ml-1"
                          >
                            <ExternalLink className="h-3 w-3" aria-hidden />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_VARIANT[event.severity]}>
                        {SEVERITY_LABEL[event.severity]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {RESOLUTION_LABEL[event.resolution]}
                      </Badge>
                      {event.facilities?.suspended && (
                        <Badge
                          variant="destructive"
                          className="ml-1 text-[10px]"
                        >
                          unpublished
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {ageOf(event.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      {isOpen ? (
                        <div className="flex gap-1 justify-end flex-wrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setResolveDialog({
                                event,
                                resolution: "remediated",
                              })
                            }
                            title="Provider has addressed the issue; restore badge"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1" aria-hidden />
                            Remediated
                          </Button>
                          {event.severity === "hard" && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                setResolveDialog({
                                  event,
                                  resolution: "suspended",
                                })
                              }
                              title="Suspend the listing"
                            >
                              <XCircle className="h-3 w-3 mr-1" aria-hidden />
                              Suspend
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setResolveDialog({ event, resolution: "noop" })
                            }
                            title="Close without action"
                          >
                            Noop
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setResolveDialog({
                                event,
                                resolution: "superseded",
                              })
                            }
                            title="A later event handled this one"
                          >
                            Superseded
                          </Button>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Resolved {formatTimestamp(event.resolved_at)}
                          {event.resolution_notes && (
                            <span className="block italic mt-0.5">
                              "{event.resolution_notes}"
                            </span>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={!!resolveDialog}
        onOpenChange={(o) => {
          if (!o) {
            setResolveDialog(null);
            setResolveNotes("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Resolve as{" "}
              {resolveDialog
                ? RESOLUTION_LABEL[resolveDialog.resolution].toLowerCase()
                : ""}
            </DialogTitle>
            <DialogDescription>
              {resolveDialog?.resolution === "remediated" && (
                <>
                  Restores <span className="font-medium">state=verified</span>{" "}
                  and re-shows the badge. Use when the provider has uploaded a
                  current license or otherwise addressed the underlying issue.
                </>
              )}
              {resolveDialog?.resolution === "suspended" && (
                <>
                  Sets <span className="font-medium">facilities.suspended = true</span>{" "}
                  (unpublishes the listing). Reserved for confirmed closures,
                  license revocations, or fraud.
                </>
              )}
              {resolveDialog?.resolution === "noop" && (
                <>
                  Closes the event without changing facility state. Use when
                  the signal turned out to be a false positive (e.g. transient
                  data drift).
                </>
              )}
              {resolveDialog?.resolution === "superseded" && (
                <>
                  Closes the event because a later event for the same facility
                  rendered this one obsolete.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="resolve-notes">Notes (optional)</Label>
            <Textarea
              id="resolve-notes"
              placeholder="What did you confirm? Link the document or call notes."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              rows={4}
            />
          </div>
          {resolveDialog?.event.payload && (
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground">
                Event payload
              </summary>
              <pre className="mt-1 bg-muted p-2 rounded overflow-x-auto">
                {JSON.stringify(resolveDialog.event.payload, null, 2)}
              </pre>
            </details>
          )}
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => {
                setResolveDialog(null);
                setResolveNotes("");
              }}
              disabled={resolveInFlight}
            >
              Cancel
            </Button>
            <Button
              onClick={submitResolution}
              disabled={resolveInFlight}
              variant={
                resolveDialog?.resolution === "suspended"
                  ? "destructive"
                  : "default"
              }
            >
              {resolveInFlight ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" aria-hidden />
              ) : null}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
