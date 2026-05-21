import { useMemo, useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";
import { format, formatDistanceToNow } from "date-fns";
import {
  ShieldCheck,
  Search,
  Phone,
  Mail,
  Clock,
  Loader2,
  ExternalLink,
  Filter,
  Copy,
  Check,
  AlertTriangle,
  FileCheck2,
  XCircle,
  Download,
  Link2,
  RefreshCw,
  CheckSquare,
  Square,
  Timer,
} from "lucide-react";
import { BulkStatusUpdateIvrDialog } from "@/components/admin/insurance/BulkStatusUpdateIvrDialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type Status =
  | "new"
  | "in_progress"
  | "verified"
  | "no_coverage"
  | "unable_to_verify"
  | "closed";

interface VOBRequest {
  id: string;
  created_at: string;
  updated_at: string;
  first_name: string;
  last_name: string;
  date_of_birth: string | null;
  phone: string;
  email: string;
  preferred_contact: "phone" | "email" | "text";
  carrier: string;
  member_id: string | null;
  group_number: string | null;
  policy_holder_name: string | null;
  policy_holder_relationship: string | null;
  primary_substance: string | null;
  urgency: "immediate" | "within_week" | "flexible" | null;
  level_of_care: string | null;
  preferred_state: string | null;
  preferred_city: string | null;
  notes: string | null;
  status: Status;
  assigned_admin_id: string | null;
  admin_notes: string | null;
  verified_at: string | null;
  verified_by: string | null;
  coverage_summary: string | null;
  estimated_out_of_pocket_cents: number | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
}

const STATUS_OPTIONS: { value: Status; label: string; tone: string }[] = [
  { value: "new", label: "New", tone: "bg-blue-500/15 text-blue-700 border-blue-200" },
  { value: "in_progress", label: "In progress", tone: "bg-amber-500/15 text-amber-700 border-amber-200" },
  { value: "verified", label: "Verified", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-200" },
  { value: "no_coverage", label: "No coverage", tone: "bg-rose-500/15 text-rose-700 border-rose-200" },
  { value: "unable_to_verify", label: "Unable to verify", tone: "bg-orange-500/15 text-orange-700 border-orange-200" },
  { value: "closed", label: "Closed", tone: "bg-muted text-muted-foreground" },
];

const URGENCY_LABEL: Record<string, string> = {
  immediate: "Immediate",
  within_week: "Within a week",
  flexible: "Flexible",
};

function urgencyTone(u: string | null): string {
  if (u === "immediate") return "bg-rose-500/15 text-rose-700 border-rose-200";
  if (u === "within_week") return "bg-amber-500/15 text-amber-700 border-amber-200";
  return "bg-muted text-muted-foreground";
}

function statusConfig(s: Status) {
  return STATUS_OPTIONS.find((o) => o.value === s) ?? STATUS_OPTIONS[0];
}

export default function AdminInsuranceVerifications() {
  const qc = useQueryClient();

  // URL-state — filter state mirrors to the URL so any view is
  // bookmarkable / shareable / reload-stable, matching /admin/leads.
  const [searchParams, setSearchParams] = useSearchParams();

  const [statusFilter, setStatusFilter] = useState<Status | "all">(
    () => (searchParams.get("status") as Status | "all") || "all",
  );
  const [carrierFilter, setCarrierFilter] = useState<string>(
    () => searchParams.get("carrier") || "all",
  );
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkStatusOpen, setBulkStatusOpen] = useState(false);

  // Sync state → URL (replace, not push). Skip defaults to keep the
  // URL tidy. Guards against the useSearchParams render loop by
  // comparing before write.
  useEffect(() => {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    if (statusFilter !== "all") next.set("status", statusFilter);
    if (carrierFilter !== "all") next.set("carrier", carrierFilter);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [search, statusFilter, carrierFilter, searchParams, setSearchParams]);

  // Explicit column list — replaces the previous `.select("*")` which
  // leaked the full row (including raw IP hash, full user-agent string)
  // to the client. Member ID + group # are still selected because the
  // admin detail modal needs them; admin role gates row visibility via
  // the "Admins can read all VOB requests" RLS policy.
  const IVR_COLUMNS = "id, created_at, updated_at, first_name, last_name, date_of_birth, phone, email, preferred_contact, carrier, member_id, group_number, policy_holder_name, policy_holder_relationship, primary_substance, urgency, level_of_care, preferred_state, preferred_city, notes, status, assigned_admin_id, admin_notes, source, verified_at, verified_by, coverage_summary, estimated_out_of_pocket_cents, linked_user_id";

  const { data: requests = [], isLoading, isFetching } = useQuery({
    queryKey: ["admin-insurance-verifications", statusFilter, carrierFilter],
    queryFn: async (): Promise<VOBRequest[]> => {
      let q = supabase
        .from("insurance_verification_requests")
        .select(IVR_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(500);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (carrierFilter !== "all") q = q.eq("carrier", carrierFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as VOBRequest[];
    },
    staleTime: 30_000,
  });

  // Realtime invalidation — Supabase channel keeps the list in sync
  // with INSERT/UPDATE/DELETE without waiting for the staleTime to
  // expire. RLS gates row visibility to admins; the channel only
  // delivers events the caller's JWT can read.
  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["admin-insurance-verifications"] });
  }, [qc]);

  useEffect(() => {
    const channel = supabase
      .channel(`admin-ivr-live-${Math.random().toString(36).slice(2,8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "insurance_verification_requests" },
        () => invalidate(),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "insurance_verification_requests" },
        () => invalidate(),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "insurance_verification_requests" },
        () => invalidate(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidate]);

  // Copy-link helper for sharable filtered URLs.
  const copyFilterLink = useCallback(async () => {
    try {
      const url = window.location.href;
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        const tmp = document.createElement("input");
        tmp.value = url;
        document.body.appendChild(tmp);
        tmp.select();
        document.execCommand("copy");
        document.body.removeChild(tmp);
      }
      toast.success("Filter link copied to clipboard");
    } catch {
      toast.error("Could not copy link");
    }
  }, []);

  // Multi-select helpers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = (visible: VOBRequest[]) => {
    if (selectedIds.size === visible.length && visible.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(visible.map((r) => r.id)));
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return requests;
    return requests.filter((r) => {
      const haystack = [
        r.first_name,
        r.last_name,
        r.email,
        r.phone,
        r.carrier,
        r.member_id,
        r.preferred_state,
        r.preferred_city,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(s);
    });
  }, [requests, search]);

  const carriers = useMemo(() => {
    const set = new Set<string>();
    requests.forEach((r) => r.carrier && set.add(r.carrier));
    return Array.from(set).sort();
  }, [requests]);

  const open = useMemo(
    () => requests.find((r) => r.id === openId) ?? null,
    [requests, openId],
  );

  const statusMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      status: Status;
      adminNotes?: string | null;
      coverageSummary?: string | null;
      estimatedOOPDollars?: number | null;
    }) => {
      // Capture the previous state so the audit log records exactly
      // what changed (and so the comparison can flag silent edits
      // like coverage_summary text changes that the prior version
      // didn't audit).
      const previous = requests.find((r) => r.id === input.id) ?? null;
      const newOOPCents =
        input.estimatedOOPDollars != null
          ? Math.round(input.estimatedOOPDollars * 100)
          : null;

      const patch: Record<string, unknown> = {
        status: input.status,
        admin_notes: input.adminNotes ?? null,
      };
      // Stamp verified_at + verified_by + coverage_summary + OOP only
      // when transitioning into 'verified' (matches the bulk path).
      if (input.status === "verified") {
        patch.verified_at = new Date().toISOString();
        patch.coverage_summary = input.coverageSummary ?? null;
        patch.estimated_out_of_pocket_cents = newOOPCents;
        // Capture the verifying admin too so seeker emails / billing
        // reconciliation can attribute the verification.
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) patch.verified_by = user.id;
      }
      // Stamp assigned_admin_id on first move to in_progress (so an
      // admin owns the case explicitly) — matches the bulk path.
      if (input.status === "in_progress" && !previous?.assigned_admin_id) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) patch.assigned_admin_id = user.id;
      }

      const { error } = await supabase
        .from("insurance_verification_requests")
        .update(patch as never)
        .eq("id", input.id);
      if (error) throw error;

      // Audit log captures every field that changed, not just status.
      // The previous version logged only `status` — coverage_summary
      // edits, admin_notes edits, and OOP edits were silent.
      try {
        const changes: Record<string, { from: unknown; to: unknown }> = {};
        if (previous && previous.status !== input.status) {
          changes.status = { from: previous.status, to: input.status };
        }
        if ((previous?.admin_notes ?? null) !== (input.adminNotes ?? null)) {
          changes.admin_notes = {
            from: previous?.admin_notes ?? null,
            to: input.adminNotes ?? null,
          };
        }
        if (input.status === "verified") {
          if ((previous?.coverage_summary ?? null) !== (input.coverageSummary ?? null)) {
            changes.coverage_summary = {
              from: previous?.coverage_summary ?? null,
              to: input.coverageSummary ?? null,
            };
          }
          if ((previous?.estimated_out_of_pocket_cents ?? null) !== newOOPCents) {
            changes.estimated_out_of_pocket_cents = {
              from: previous?.estimated_out_of_pocket_cents ?? null,
              to: newOOPCents,
            };
          }
        }
        await logAdminAction({
          actionType: "insurance_verification_updated",
          targetType: "insurance_verification_request",
          targetId: input.id,
          details: { status: input.status, changes },
        });
      } catch {
        // Audit log is best-effort.
      }
    },
    onSuccess: () => {
      toast.success("Request updated");
      qc.invalidateQueries({ queryKey: ["admin-insurance-verifications"] });
    },
    onError: (e: Error) => toast.error(e.message || "Update failed"),
  });

  // Mini KPI strip
  const counts = useMemo(() => {
    const c = { new: 0, in_progress: 0, verified: 0, no_coverage: 0, immediate: 0 };
    requests.forEach((r) => {
      if (r.status === "new") c.new++;
      if (r.status === "in_progress") c.in_progress++;
      if (r.status === "verified") c.verified++;
      if (r.status === "no_coverage") c.no_coverage++;
      if (r.urgency === "immediate" && r.status !== "closed") c.immediate++;
    });
    return c;
  }, [requests]);

  // CSV export of the currently-filtered set. Includes the fields
  // ops actually needs for cohort analysis (carrier success rate,
  // urgency-to-verification cycle time) without leaking sensitive
  // raw IP / user-agent strings.
  const exportCsv = useCallback(() => {
    if (filtered.length === 0) {
      toast.error("No requests to export");
      return;
    }
    const headers = [
      "ID", "Created", "Updated", "First Name", "Last Name", "DOB",
      "Phone", "Email", "Preferred Contact", "Carrier", "Member ID",
      "Group #", "Policy Holder", "Relationship", "Primary Substance",
      "Urgency", "Level of Care", "Preferred State", "Preferred City",
      "Status", "Verified At", "Coverage Summary", "OOP ($)",
      "Notes", "Admin Notes",
    ];
    const escape = (v: unknown): string => {
      if (v == null) return "";
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = filtered.map((r) => [
      r.id, r.created_at, r.updated_at, r.first_name, r.last_name,
      r.date_of_birth, r.phone, r.email, r.preferred_contact, r.carrier,
      r.member_id, r.group_number, r.policy_holder_name,
      r.policy_holder_relationship, r.primary_substance, r.urgency,
      r.level_of_care, r.preferred_state, r.preferred_city, r.status,
      r.verified_at,
      r.coverage_summary,
      r.estimated_out_of_pocket_cents != null
        ? (r.estimated_out_of_pocket_cents / 100).toFixed(2)
        : "",
      r.notes, r.admin_notes,
    ].map(escape).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date().toISOString().split("T")[0];
    a.download = `insurance-verifications-${date}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} requests`);
  }, [filtered]);

  const hasActiveFilters = statusFilter !== "all" || carrierFilter !== "all" || search !== "";

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold">Insurance Verifications</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pending and completed verification-of-benefits requests. Member IDs are visible to admin only.
        </p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPI label="New" value={counts.new} tone="bg-blue-500/10 text-blue-700" />
        <KPI label="In progress" value={counts.in_progress} tone="bg-amber-500/10 text-amber-700" />
        <KPI label="Verified" value={counts.verified} tone="bg-emerald-500/10 text-emerald-700" />
        <KPI label="No coverage" value={counts.no_coverage} tone="bg-rose-500/10 text-rose-700" />
        <KPI label="Urgent open" value={counts.immediate} tone="bg-rose-500/10 text-rose-700" icon={<AlertTriangle className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, email, carrier, member ID, city…"
                  className="pl-8 h-9 text-sm"
                />
              </div>
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as Status | "all")}>
                <SelectTrigger className="h-9 w-[160px] text-sm">
                  <Filter className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={carrierFilter} onValueChange={setCarrierFilter}>
                <SelectTrigger className="h-9 w-[180px] text-sm">
                  <SelectValue placeholder="All carriers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All carriers</SelectItem>
                  {carriers.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {selectedIds.size > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setBulkStatusOpen(true)}
                  aria-label={`Update status for ${selectedIds.size} selected request${selectedIds.size === 1 ? "" : "s"}`}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Status</span>
                  <span>({selectedIds.size})</span>
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={copyFilterLink}
                  aria-label="Copy a shareable link to this filtered view"
                  title="Copy a shareable link to this filtered view"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Copy link</span>
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={exportCsv}
                disabled={filtered.length === 0}
                aria-label="Export filtered requests to CSV"
              >
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              <div className="text-xs text-muted-foreground tabular-nums">
                {filtered.length} of {requests.length}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isFetching && !isLoading && (
            <div className="px-1 pb-2 -mt-1 flex items-center gap-1.5 text-[11px] text-muted-foreground" aria-live="polite">
              <Loader2 className="h-3 w-3 animate-spin" />
              Refreshing…
            </div>
          )}
          {isLoading ? (
            <div className="py-16 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center px-4">
              <ShieldCheck className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" aria-hidden />
              <p className="text-sm font-medium text-muted-foreground">
                {hasActiveFilters ? "No requests match these filters" : "No verification requests yet"}
              </p>
              <p className="text-xs text-muted-foreground/80 mt-1 max-w-sm mx-auto">
                {hasActiveFilters
                  ? "Try clearing a filter or broadening the carrier / status selection."
                  : "Submissions from /insurance-verification land here. Requests appear in real time."}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => {
                    setStatusFilter("all");
                    setCarrierFilter("all");
                    setSearch("");
                  }}
                  className="mt-3 text-primary"
                >
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Select-all row — gives admins a single keystroke to
                  reach the bulk-status action. Hidden when 0 visible. */}
              <div className="px-3 md:px-4 pb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <button
                  type="button"
                  onClick={() => toggleSelectAll(filtered)}
                  className="p-1 -m-1 hover:text-foreground transition-colors"
                  aria-label={
                    selectedIds.size === filtered.length && filtered.length > 0
                      ? "Deselect all visible requests"
                      : "Select all visible requests"
                  }
                >
                  {selectedIds.size === filtered.length && filtered.length > 0 ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </button>
                <span>
                  {selectedIds.size > 0
                    ? `${selectedIds.size} selected`
                    : `Select all (${filtered.length})`}
                </span>
              </div>

              <div className="space-y-2">
                {filtered.map((r) => {
                  const cfg = statusConfig(r.status);
                  // SLA indicator — surfaces requests that have sat
                  // unverified for >24h on a still-open status, so
                  // ops can scan for at-risk rows. Mirrors the
                  // staleness badge in /admin/leads.
                  const staleHours = (() => {
                    const terminal = r.status === "verified" || r.status === "no_coverage"
                      || r.status === "unable_to_verify" || r.status === "closed";
                    if (terminal) return 0;
                    const diffMs = Date.now() - new Date(r.created_at).getTime();
                    const hours = Math.floor(diffMs / (60 * 60 * 1000));
                    return hours >= 24 ? hours : 0;
                  })();
                  const isSelected = selectedIds.has(r.id);
                  return (
                    <div
                      key={r.id}
                      className={`w-full rounded-lg border bg-card hover:border-primary/40 transition-colors p-3 md:p-4 ${
                        isSelected ? "border-primary/50 ring-1 ring-inset ring-primary/20" : "border-border"
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); toggleSelect(r.id); }}
                          className="p-1 -m-1 shrink-0 self-start md:self-center"
                          aria-label={isSelected ? `Deselect ${r.first_name} ${r.last_name}` : `Select ${r.first_name} ${r.last_name}`}
                        >
                          {isSelected ? <CheckSquare className="h-4 w-4 text-primary" /> : <Square className="h-4 w-4 text-muted-foreground" />}
                        </button>

                        <button
                          type="button"
                          onClick={() => setOpenId(r.id)}
                          className="flex-1 min-w-0 text-left"
                          aria-label={`Open detail for ${r.first_name} ${r.last_name}'s ${r.carrier} request`}
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">
                              {r.first_name} {r.last_name}
                            </p>
                            <Badge variant="outline" className={cfg.tone}>{cfg.label}</Badge>
                            {r.urgency && r.urgency !== "flexible" && (
                              <Badge variant="outline" className={urgencyTone(r.urgency)}>
                                {URGENCY_LABEL[r.urgency]}
                              </Badge>
                            )}
                            {staleHours > 0 && (
                              <Badge
                                variant="outline"
                                className="text-[10px] gap-1 border-amber-300 bg-amber-50 text-amber-800 px-1.5 py-0"
                                title={`Open ${staleHours}h with no resolution`}
                              >
                                <Timer className="h-3 w-3" />
                                {staleHours >= 72 ? `${Math.floor(staleHours / 24)}d` : `${staleHours}h`}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {r.carrier}
                            {r.member_id ? " · ID on file" : " · ID NOT provided"}
                            {r.preferred_state ? ` · ${r.preferred_city || ""} ${r.preferred_state}` : ""}
                            {r.primary_substance ? ` · ${r.primary_substance}` : ""}
                          </p>
                        </button>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
                          <a
                            href={`tel:${r.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {r.phone}
                          </a>
                          <a
                            href={`mailto:${r.email}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex items-center gap-1 hover:text-foreground"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            <span className="hidden md:inline truncate max-w-[180px]">{r.email}</span>
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {open && (
        <RequestDetail
          request={open}
          onClose={() => setOpenId(null)}
          onUpdate={(input) => statusMutation.mutate(input)}
          updating={statusMutation.isPending}
        />
      )}

      <BulkStatusUpdateIvrDialog
        open={bulkStatusOpen}
        onOpenChange={setBulkStatusOpen}
        selectedIds={selectedIds}
        onSuccess={() => {
          invalidate();
          setSelectedIds(new Set());
        }}
      />
    </div>
  );
}

function KPI({ label, value, tone, icon }: { label: string; value: number; tone: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">{label}</span>
          {icon ? <span className={tone.split(" ").find((c) => c.startsWith("text-")) ?? ""}>{icon}</span> : null}
        </div>
        <p className={`text-xl font-bold ${tone.split(" ").find((c) => c.startsWith("text-")) ?? ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function RequestDetail({
  request,
  onClose,
  onUpdate,
  updating,
}: {
  request: VOBRequest;
  onClose: () => void;
  onUpdate: (input: {
    id: string;
    status: Status;
    adminNotes?: string | null;
    coverageSummary?: string | null;
    estimatedOOPDollars?: number | null;
  }) => void;
  updating: boolean;
}) {
  const [status, setStatus] = useState<Status>(request.status);
  const [adminNotes, setAdminNotes] = useState<string>(request.admin_notes ?? "");
  const [coverageSummary, setCoverageSummary] = useState<string>(request.coverage_summary ?? "");
  const [oopDollars, setOopDollars] = useState<string>(
    request.estimated_out_of_pocket_cents != null
      ? (request.estimated_out_of_pocket_cents / 100).toFixed(2)
      : "",
  );
  const [copiedField, setCopiedField] = useState<string | null>(null);

  function copy(value: string, key: string) {
    navigator.clipboard.writeText(value).then(() => {
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 1200);
    });
  }

  function handleSave() {
    onUpdate({
      id: request.id,
      status,
      adminNotes: adminNotes.trim() || null,
      coverageSummary: status === "verified" ? coverageSummary.trim() || null : null,
      estimatedOOPDollars:
        status === "verified" && oopDollars ? Number(oopDollars) : null,
    });
    onClose();
  }

  const cfg = statusConfig(request.status);

  return (
    <Dialog open={!!request} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {request.first_name} {request.last_name}
            <Badge variant="outline" className={cfg.tone}>{cfg.label}</Badge>
            {request.urgency && request.urgency !== "flexible" && (
              <Badge variant="outline" className={urgencyTone(request.urgency)}>
                {URGENCY_LABEL[request.urgency]}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Submitted {format(new Date(request.created_at), "PPpp")} ({formatDistanceToNow(new Date(request.created_at), { addSuffix: true })})
            · Ref {request.id.slice(0, 8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5 py-2">
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contact</h3>
            <Field label="Phone" value={request.phone} onCopy={() => copy(request.phone, "phone")} copied={copiedField === "phone"} />
            <Field label="Email" value={request.email} onCopy={() => copy(request.email, "email")} copied={copiedField === "email"} />
            {request.date_of_birth && <Field label="DOB" value={request.date_of_birth} />}
            <Field label="Preferred contact" value={request.preferred_contact} />
            {(request.preferred_city || request.preferred_state) && (
              <Field
                label="Location"
                value={[request.preferred_city, request.preferred_state].filter(Boolean).join(", ")}
              />
            )}
            {request.primary_substance && <Field label="Concern" value={request.primary_substance} />}
            {request.level_of_care && <Field label="Level of care" value={request.level_of_care} />}
          </section>

          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Insurance
              <Badge variant="outline" className="ml-2 text-[10px] py-0 px-1.5">
                <ShieldCheck className="h-3 w-3 mr-1" />
                admin only
              </Badge>
            </h3>
            <Field label="Carrier" value={request.carrier} />
            {request.member_id ? (
              <Field
                label="Member ID"
                value={request.member_id}
                onCopy={() => copy(request.member_id!, "member")}
                copied={copiedField === "member"}
                mono
              />
            ) : (
              <p className="text-xs text-rose-700">⚠ Member ID NOT provided — call to collect.</p>
            )}
            {request.group_number && (
              <Field
                label="Group #"
                value={request.group_number}
                onCopy={() => copy(request.group_number!, "group")}
                copied={copiedField === "group"}
                mono
              />
            )}
            {request.policy_holder_name && (
              <Field
                label="Policy holder"
                value={`${request.policy_holder_name}${request.policy_holder_relationship ? ` (${request.policy_holder_relationship})` : ""}`}
              />
            )}
            {request.notes && (
              <div className="mt-2 rounded-md bg-muted/40 p-3 text-sm">
                <p className="text-xs text-muted-foreground mb-1">Seeker notes</p>
                <p className="whitespace-pre-wrap">{request.notes}</p>
              </div>
            )}
          </section>
        </div>

        <section className="border-t border-border pt-4 space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Workflow</h3>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Status</label>
              <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status === "verified" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Estimated out-of-pocket (USD)</label>
                <Input
                  type="number"
                  inputMode="decimal"
                  min="0"
                  step="0.01"
                  value={oopDollars}
                  onChange={(e) => setOopDollars(e.target.value)}
                  placeholder="e.g. 1500.00"
                />
              </div>
            )}
          </div>
          {status === "verified" && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Coverage summary</label>
              <Textarea
                rows={2}
                value={coverageSummary}
                onChange={(e) => setCoverageSummary(e.target.value)}
                placeholder="e.g. In-network with Aetna PPO; 80% after deductible; 30 days residential authorized."
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Admin notes</label>
            <Textarea
              rows={3}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Carrier rep, reference number, follow-ups…"
            />
          </div>
        </section>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {request.email && (
            <Button variant="outline" asChild>
              <a href={`mailto:${request.email}`}>
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </a>
            </Button>
          )}
          <Button variant="outline" asChild>
            <a href={`tel:${request.phone}`}>
              <Phone className="h-4 w-4 mr-1.5" />
              Call
            </a>
          </Button>
          <Button onClick={handleSave} disabled={updating}>
            {updating ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : status === "verified" ? (
              <FileCheck2 className="h-4 w-4 mr-1.5" />
            ) : status === "no_coverage" || status === "unable_to_verify" ? (
              <XCircle className="h-4 w-4 mr-1.5" />
            ) : (
              <Check className="h-4 w-4 mr-1.5" />
            )}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  value,
  onCopy,
  copied,
  mono,
}: {
  label: string;
  value: string;
  onCopy?: () => void;
  copied?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className={`text-sm ${mono ? "font-mono" : ""} break-all`}>{value}</p>
      </div>
      {onCopy && (
        <button
          type="button"
          onClick={onCopy}
          className="text-muted-foreground hover:text-foreground p-1 -mr-1 mt-3"
          aria-label={`Copy ${label}`}
        >
          {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      )}
    </div>
  );
}
