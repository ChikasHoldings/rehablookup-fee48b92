import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Link as LinkIcon,
  Check as CheckIcon,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageSizeSelect } from "@/components/common/PageSizeSelect";
import { usePagination } from "@/hooks/usePagination";

type TimeRange = "24h" | "7d" | "30d" | "all";
type StatusFilter =
  | "all"
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed"
  | "dlq"
  | "retry";

const TIME_RANGES = new Set<TimeRange>(["24h", "7d", "30d", "all"]);
const STATUS_FILTERS = new Set<StatusFilter>([
  "all", "sent", "delivered", "opened", "clicked",
  "bounced", "complained", "failed", "suppressed", "dlq", "retry",
]);

// CSV cell escape with formula-injection guard. Cells starting with
// =/+/-/@/\t/\r get a leading single-quote so Excel / Sheets treat the
// value as text. Email logs contain recipient addresses and event-data
// JSON — both attacker-controllable via the wider system.
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const needsQuote =
    /^[=+\-@\t\r]/.test(raw) ||
    raw.includes(",") ||
    raw.includes('"') ||
    raw.includes("\n") ||
    raw.includes("\r");
  const prefixed = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  if (!needsQuote) return prefixed;
  return `"${prefixed.replace(/"/g, '""')}"`;
}



function getTimeRangeStart(range: TimeRange): string | null {
  const now = new Date();
  switch (range) {
    case "24h": return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    case "7d": return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all": return null;
  }
}

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    case "delivered":
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Delivered</Badge>;
    case "opened":
      return <Badge className="bg-sky-100 text-sky-800 border-sky-200"><Mail className="h-3 w-3 mr-1" />Opened</Badge>;
    case "clicked":
      return <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200"><Mail className="h-3 w-3 mr-1" />Clicked</Badge>;
    case "bounced":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Bounced</Badge>;
    case "complained":
      return <Badge className="bg-rose-100 text-rose-800 border-rose-200"><AlertTriangle className="h-3 w-3 mr-1" />Complained</Badge>;
    case "failed":
    case "dlq":
      return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status === "dlq" ? "Dead Letter" : "Failed"}</Badge>;
    case "suppressed":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Suppressed</Badge>;
    case "retry":
      return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />Retry</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

type EmailLogRow = {
  id: string;
  email_id: string | null;
  email_type: string | null;
  event_type: string | null;
  recipient_email: string | null;
  event_data: unknown;
  created_at: string;
};

export default function AdminEmailLogs() {
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [detailLog, setDetailLog] = useState<EmailLogRow | null>(null);
  const { page: pageOneBased, pageSize: PAGE_SIZE, totalPages, setPage: setPageOneBased, setPageSize } = usePagination({
    tableId: "admin-email-logs",
    defaultPageSize: 50,
    totalItems: 0,
  });
  const page = pageOneBased - 1;
  const setPage = (next: number | ((p: number) => number)) => {
    const resolved = typeof next === "function" ? (next as (p: number) => number)(page) : next;
    setPageOneBased(resolved + 1);
  };

  // URL state hydration (once on mount).
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;
    const r = searchParams.get("range");
    const s = searchParams.get("status");
    const t = searchParams.get("type");
    const q = searchParams.get("q");
    if (r && TIME_RANGES.has(r as TimeRange)) setTimeRange(r as TimeRange);
    if (s && STATUS_FILTERS.has(s as StatusFilter)) setStatusFilter(s as StatusFilter);
    if (t) setTypeFilter(t);
    if (q) setSearchQuery(q);
  }, [searchParams]);

  // Loop-guarded URL sync.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete("range", timeRange, "7d");
    setOrDelete("status", statusFilter, "all");
    setOrDelete("type", typeFilter, "all");
    setOrDelete("q", searchQuery, "");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [timeRange, statusFilter, typeFilter, searchQuery, searchParams, setSearchParams]);

  const filtersActive =
    timeRange !== "7d" || statusFilter !== "all" || typeFilter !== "all" || searchQuery !== "";

  const handleClearFilters = () => {
    setTimeRange("7d");
    setStatusFilter("all");
    setTypeFilter("all");
    setSearchQuery("");
    setPage(0);
  };

  const handleCopyLink = useCallback(async () => {
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = url;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLink(true);
      toast.success("Filtered view link copied");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      toast.error(`Failed to copy link: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  }, []);

  // Fetch all email types for filter dropdown
  const { data: emailTypes = [] } = useQuery({
    queryKey: ["email-log-types"],
    queryFn: async () => {
      const { data } = await supabase
        .from("email_tracking_events")
        .select("email_type")
        .order("email_type");
      const unique = [...new Set((data || []).map(r => r.email_type))].filter(Boolean);
      return unique;
    },
    staleTime: 60_000,
  });

  // Main data query - deduplicated by email_id (latest per email_id)
  const { data: rawLogs = [], isLoading, isError, error, refetch } = useQuery({
    queryKey: ["email-logs", timeRange, statusFilter, typeFilter, searchQuery, page],
    queryFn: async () => {
      let query = supabase
        .from("email_tracking_events")
        .select("id, email_id, email_type, event_type, recipient_email, event_data, created_at")
        .order("created_at", { ascending: false });

      const start = getTimeRangeStart(timeRange);
      if (start) query = query.gte("created_at", start);
      if (statusFilter !== "all") query = query.eq("event_type", statusFilter);
      if (typeFilter !== "all") query = query.eq("email_type", typeFilter);
      if (searchQuery.trim()) query = query.ilike("recipient_email", `%${searchQuery.trim()}%`);

      query = query.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  // Deduplicate: latest event per email_id
  const logs = useMemo(() => {
    const map = new Map<string, typeof rawLogs[0]>();
    for (const row of rawLogs) {
      const key = row.email_id || row.id;
      const existing = map.get(key);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) {
        map.set(key, row);
      }
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [rawLogs]);

  // Summary stats query
  const { data: stats } = useQuery({
    queryKey: ["email-stats", timeRange],
    queryFn: async () => {
      const start = getTimeRangeStart(timeRange);

      // Prefer the server-side aggregate — it dedups + buckets across the FULL
      // window with no ~1000-row PostgREST cap. Fall back to the capped
      // client-side computation if the RPC isn't deployed yet.
      const { data: agg, error: rpcErr } = await supabase.rpc("admin_email_log_stats", {
        p_start: start ?? undefined,
      });
      if (!rpcErr && Array.isArray(agg) && agg.length > 0) {
        const r = agg[0];
        return {
          total: Number(r.total) || 0,
          sent: Number(r.sent) || 0,
          failed: Number(r.failed) || 0,
          suppressed: Number(r.suppressed) || 0,
        };
      }

      let query = supabase
        .from("email_tracking_events")
        .select("email_id, event_type, created_at");

      if (start) query = query.gte("created_at", start);

      const { data } = await query;
      if (!data) return { total: 0, sent: 0, failed: 0, suppressed: 0 };

      // Deduplicate by email_id; pick the "best" terminal status per email.
      // Priority: delivered > sent > opened/clicked > bounced/complained/failed/dlq > suppressed > retry
      const RANK: Record<string, number> = {
        delivered: 6, sent: 5, opened: 4, clicked: 4,
        bounced: 3, complained: 3, failed: 3, dlq: 3,
        suppressed: 2, retry: 1,
      };
      const latest = new Map<string, string>();
      for (const row of data) {
        const key = row.email_id || crypto.randomUUID();
        const existing = latest.get(key);
        if (!existing || (RANK[row.event_type] ?? 0) > (RANK[existing] ?? 0)) {
          latest.set(key, row.event_type);
        }
      }
      const counts = { total: 0, sent: 0, failed: 0, suppressed: 0 };
      for (const status of latest.values()) {
        counts.total++;
        if (status === "sent" || status === "delivered" || status === "opened" || status === "clicked") counts.sent++;
        else if (status === "failed" || status === "dlq" || status === "bounced" || status === "complained") counts.failed++;
        else if (status === "suppressed") counts.suppressed++;
      }
      return counts;
    },
    staleTime: 30_000,
  });

  const handleExportCsv = useCallback(() => {
    if (logs.length === 0) {
      toast.error("No rows in current view to export");
      return;
    }
    const headers = ["timestamp", "email_type", "recipient_email", "event_type", "error_message", "email_id"];
    const rows = logs.map((log) => {
      const eventData = log.event_data as Record<string, unknown> | null;
      const errorMsg = eventData && typeof eventData.error === "string" ? (eventData.error as string) : "";
      return [
        log.created_at,
        log.email_type ?? "",
        log.recipient_email,
        log.event_type,
        errorMsg,
        log.email_id ?? "",
      ].map(csvCell).join(",");
    });
    const csv = [headers.map(csvCell).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `email-logs-${new Date().toISOString().slice(0, 10)}-page${pageOneBased}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success(`Exported ${logs.length} email log entries`);
  }, [logs, pageOneBased]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Logs</h1>
          <p className="text-muted-foreground text-sm">Monitor all platform email delivery, failures, and retries</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={!filtersActive}
            aria-label="Copy link to filtered view"
            className="gap-2"
          >
            {copiedLink ? <CheckIcon className="h-4 w-4 text-success" /> : <LinkIcon className="h-4 w-4" />}
            Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            aria-label="Export current page to CSV"
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2"
            aria-label="Refresh email logs"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Emails</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold">{stats?.total ?? "–"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Sent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span className="text-2xl font-bold text-emerald-700">{stats?.sent ?? "–"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Failed / DLQ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              <span className="text-2xl font-bold text-destructive">{stats?.failed ?? "–"}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suppressed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <span className="text-2xl font-bold text-amber-700">{stats?.suppressed ?? "–"}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* Time range */}
            <div className="flex gap-1">
              {(["24h", "7d", "30d", "all"] as TimeRange[]).map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={timeRange === r ? "default" : "outline"}
                  onClick={() => { setTimeRange(r); setPage(0); }}
                >
                  {r === "all" ? "All Time" : `Last ${r}`}
                </Button>
              ))}
            </div>

            {/* Status filter */}
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as StatusFilter); setPage(0); }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="opened">Opened</SelectItem>
                <SelectItem value="clicked">Clicked</SelectItem>
                <SelectItem value="bounced">Bounced</SelectItem>
                <SelectItem value="complained">Complained</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="dlq">Dead Letter</SelectItem>
                <SelectItem value="suppressed">Suppressed</SelectItem>
                <SelectItem value="retry">Retry</SelectItem>
              </SelectContent>
            </Select>

            {/* Email type filter */}
            <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(0); }}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Email type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {emailTypes.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by recipient email…"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
                className="pl-9"
                aria-label="Search by recipient email"
              />
            </div>

            {filtersActive && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                aria-label="Clear all filters"
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Error / Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={`sk-${i}`}>
                      <TableCell><div className="h-4 w-24 rounded bg-muted animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-40 rounded bg-muted animate-pulse" /></TableCell>
                      <TableCell><div className="h-5 w-16 rounded-full bg-muted animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-32 rounded bg-muted animate-pulse" /></TableCell>
                      <TableCell><div className="h-4 w-48 rounded bg-muted animate-pulse" /></TableCell>
                    </TableRow>
                  ))
                ) : isError ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <div className="flex flex-col items-center gap-3 text-center">
                        <XCircle className="h-8 w-8 text-destructive/70" />
                        <div>
                          <p className="font-medium text-sm">Couldn't load email logs</p>
                          <p className="text-xs text-muted-foreground mt-1 max-w-md">
                            {(error as Error)?.message || "Something went wrong fetching the data."}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => refetch()} className="gap-1.5">
                          <RefreshCw className="h-3.5 w-3.5" />
                          Try again
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <Mail className="h-8 w-8 text-muted-foreground/40" />
                        <p className="text-sm font-medium">No emails found</p>
                        <p className="text-xs text-muted-foreground max-w-sm">
                          Try widening the time range or clearing filters to see results.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => {
                    const eventData = log.event_data as Record<string, unknown> | null;
                    const errorMsg = eventData?.error as string | undefined;
                    return (
                      <TableRow
                        key={log.id}
                        className="cursor-pointer hover:bg-muted/40"
                        role="button"
                        tabIndex={0}
                        aria-label={`View email event detail for ${log.recipient_email || "recipient"}`}
                        onClick={() => setDetailLog(log as EmailLogRow)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDetailLog(log as EmailLogRow); } }}
                      >
                        <TableCell>
                          <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                            {log.email_type?.replace(/_/g, " ") || "–"}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm max-w-[220px] truncate" title={log.recipient_email}>
                          {log.recipient_email}
                        </TableCell>
                        <TableCell>{statusBadge(log.event_type)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          {errorMsg ? (
                            <span className="text-xs text-destructive truncate block" title={errorMsg}>
                              {errorMsg}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination (cursor-style; no total count for tracking events) */}
          <div className="flex flex-col gap-3 px-4 py-3 border-t sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pageOneBased} · Showing {logs.length} results
            </p>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <PageSizeSelect value={PAGE_SIZE} onChange={setPageSize} />
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={rawLogs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row-click detail: full tracking-event payload */}
      <Dialog open={!!detailLog} onOpenChange={(o) => !o && setDetailLog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Email event detail</DialogTitle>
            <DialogDescription>Full tracking-event payload for this delivery event.</DialogDescription>
          </DialogHeader>
          {detailLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
                <span className="text-muted-foreground">Type</span>
                <span className="col-span-2 font-medium">{detailLog.email_type?.replace(/_/g, " ") || "—"}</span>
                <span className="text-muted-foreground">Event</span>
                <span className="col-span-2 font-medium">{detailLog.event_type || "—"}</span>
                <span className="text-muted-foreground">Recipient</span>
                <span className="col-span-2 font-mono break-all">{detailLog.recipient_email || "—"}</span>
                <span className="text-muted-foreground">Email ID</span>
                <span className="col-span-2 font-mono break-all">{detailLog.email_id || "—"}</span>
                <span className="text-muted-foreground">Time</span>
                <span className="col-span-2">{format(new Date(detailLog.created_at), "MMM d, yyyy HH:mm:ss")}</span>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">event_data</p>
                <pre className="text-xs bg-muted rounded-md p-3 overflow-auto max-h-72 whitespace-pre-wrap break-all">
                  {detailLog.event_data ? JSON.stringify(detailLog.event_data, null, 2) : "—"}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
