import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, CheckCircle2, XCircle, AlertTriangle, Clock, Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type TimeRange = "24h" | "7d" | "30d" | "all";
type StatusFilter = "all" | "sent" | "failed" | "suppressed" | "dlq" | "retry";

const PAGE_SIZE = 50;

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
    case "sent": return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" />Sent</Badge>;
    case "failed":
    case "dlq": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{status === "dlq" ? "Dead Letter" : "Failed"}</Badge>;
    case "suppressed": return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><AlertTriangle className="h-3 w-3 mr-1" />Suppressed</Badge>;
    case "retry": return <Badge className="bg-blue-100 text-blue-800 border-blue-200"><Clock className="h-3 w-3 mr-1" />Retry</Badge>;
    default: return <Badge variant="outline">{status}</Badge>;
  }
}

export default function AdminEmailLogs() {
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(0);

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
      let query = supabase
        .from("email_tracking_events")
        .select("email_id, event_type, created_at");

      const start = getTimeRangeStart(timeRange);
      if (start) query = query.gte("created_at", start);

      const { data } = await query;
      if (!data) return { total: 0, sent: 0, failed: 0, suppressed: 0 };

      // Deduplicate by email_id, take latest event_type
      const latest = new Map<string, string>();
      for (const row of data) {
        const key = row.email_id || crypto.randomUUID();
        const existing = latest.get(key);
        if (!existing) latest.set(key, row.event_type);
      }
      const counts = { total: 0, sent: 0, failed: 0, suppressed: 0 };
      for (const status of latest.values()) {
        counts.total++;
        if (status === "sent") counts.sent++;
        else if (status === "failed" || status === "dlq") counts.failed++;
        else if (status === "suppressed") counts.suppressed++;
      }
      return counts;
    },
    staleTime: 30_000,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Logs</h1>
          <p className="text-muted-foreground text-sm">Monitor all platform email delivery, failures, and retries</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
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
              />
            </div>
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
                      <TableRow key={log.id}>
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Page {page + 1} · Showing {logs.length} results
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" disabled={rawLogs.length < PAGE_SIZE} onClick={() => setPage(p => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
