import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronRight,
  AlertCircle,
  Link as LinkIcon,
  Check as CheckIcon,
  X,
  Download,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { PaginationFooter } from "@/components/common/PaginationFooter";
import { usePagination } from "@/hooks/usePagination";
import { resolvePattern } from "@/lib/notFoundPatterns";

type TimeRange = "24h" | "7d" | "30d" | "all";
type KindFilter = "all" | "spa_route" | "static_asset";
type GroupMode = "pattern" | "path";

interface PatternSummary {
  patternId: string;
  patternLabel: string;
  hits: number;
  uniquePaths: number;
  lastSeen: string;
  hasBotTraffic: boolean;
  paths: PathSummary[];
}

interface NotFoundEvent {
  id: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
  http_method: string | null;
  query_string: string | null;
  request_kind: string | null;
  asset_extension: string | null;
}

interface PathSummary {
  path: string;
  hits: number;
  lastSeen: string;
  topReferrer: string | null;
  hasBotTraffic: boolean;
  topMethod: string;
  requestKind: string;
  assetExtension: string | null;
  sampleQuery: string | null;
}

const URL_RANGE_VALUES = new Set<TimeRange>(["24h", "7d", "30d", "all"]);
const URL_KIND_VALUES = new Set<KindFilter>(["all", "spa_route", "static_asset"]);
const URL_GROUP_VALUES = new Set<GroupMode>(["pattern", "path"]);

// Row cap was 5000 — at scale a 30-day window can blow past this and the
// stats cards / aggregations silently reflect a clipped slice. Bumped to
// 10,000; a truncation banner fires when the result equals the cap.
const NOT_FOUND_ROW_CAP = 10_000;

function getTimeRangeStart(range: TimeRange): string | null {
  const now = Date.now();
  switch (range) {
    case "24h": return new Date(now - 24 * 60 * 60 * 1000).toISOString();
    case "7d": return new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
    case "30d": return new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
    case "all": return null;
  }
}

function isBot(ua: string | null): boolean {
  if (!ua) return false;
  return /bot|crawler|spider|slurp|bingpreview|googlebot|facebookexternalhit/i.test(ua);
}

// CSV cell escape with formula-injection guard. Cells starting with
// =/+/-/@/\t/\r get a leading single-quote so Excel / Sheets treat the
// value as text. URLs from referrers and arbitrary paths from the
// not_found stream are the realistic attacker-controlled inputs.
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

export default function AdminNotFoundEvents() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const hydratedRef = useRef(false);

  const [range, setRange] = useState<TimeRange>("30d");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("pattern");
  const [drillPattern, setDrillPattern] = useState<PatternSummary | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // URL state hydration (once)
  useEffect(() => {
    if (hydratedRef.current) return;
    hydratedRef.current = true;

    const r = searchParams.get("range");
    const k = searchParams.get("kind");
    const q = searchParams.get("q");
    const g = searchParams.get("group");

    if (r && URL_RANGE_VALUES.has(r as TimeRange)) setRange(r as TimeRange);
    if (k && URL_KIND_VALUES.has(k as KindFilter)) setKindFilter(k as KindFilter);
    if (q) setSearch(q);
    if (g && URL_GROUP_VALUES.has(g as GroupMode)) setGroupMode(g as GroupMode);
  }, [searchParams]);

  // Loop-guarded URL sync. Defaults are NOT written to keep the bare URL clean.
  useEffect(() => {
    if (!hydratedRef.current) return;
    const next = new URLSearchParams(searchParams);
    const setOrDelete = (key: string, value: string, defaultValue: string) => {
      if (value && value !== defaultValue) next.set(key, value);
      else next.delete(key);
    };
    setOrDelete("range", range, "30d");
    setOrDelete("kind", kindFilter, "all");
    setOrDelete("q", search, "");
    setOrDelete("group", groupMode, "pattern");

    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [range, kindFilter, search, groupMode, searchParams, setSearchParams]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["not-found-events"] });
  }, [queryClient]);

  // Realtime: not_found_events was added to supabase_realtime in
  // migration 20260628000000. New 404 hits propagate within ~200ms. A
  // 30-second polling fallback covers channel drops.
  useEffect(() => {
    const channel = supabase
      .channel("admin-not-found-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "not_found_events" },
        () => invalidate(),
      )
      .subscribe();

    const interval = setInterval(() => invalidate(), 30_000);
    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [invalidate]);

  const {
    data,
    isLoading,
    isFetching,
    refetch,
    error: queryError,
  } = useQuery({
    queryKey: ["not-found-events", range],
    queryFn: async () => {
      const since = getTimeRangeStart(range);
      let query = supabase
        .from("not_found_events")
        .select(
          "id, path, referrer, user_agent, created_at, http_method, query_string, request_kind, asset_extension",
        )
        .order("created_at", { ascending: false })
        .limit(NOT_FOUND_ROW_CAP);
      if (since) query = query.gte("created_at", since);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NotFoundEvent[];
    },
    staleTime: 10_000,
  });

  const dataTruncated = (data?.length ?? 0) >= NOT_FOUND_ROW_CAP;

  const summaries = useMemo<PathSummary[]>(() => {
    if (!data) return [];
    type Acc = {
      hits: number;
      lastSeen: string;
      refs: Map<string, number>;
      methods: Map<string, number>;
      bot: boolean;
      kind: string;
      assetExtension: string | null;
      sampleQuery: string | null;
    };
    const byPath = new Map<string, Acc>();
    for (const e of data) {
      const entry: Acc =
        byPath.get(e.path) || {
          hits: 0,
          lastSeen: e.created_at,
          refs: new Map<string, number>(),
          methods: new Map<string, number>(),
          bot: false,
          kind: e.request_kind || "spa_route",
          assetExtension: e.asset_extension,
          sampleQuery: null,
        };
      entry.hits++;
      if (e.created_at > entry.lastSeen) entry.lastSeen = e.created_at;
      const ref = e.referrer || "(direct)";
      entry.refs.set(ref, (entry.refs.get(ref) || 0) + 1);
      const method = (e.http_method || "GET").toUpperCase();
      entry.methods.set(method, (entry.methods.get(method) || 0) + 1);
      if (isBot(e.user_agent)) entry.bot = true;
      if (!entry.sampleQuery && e.query_string) entry.sampleQuery = e.query_string;
      if (!entry.assetExtension && e.asset_extension) entry.assetExtension = e.asset_extension;
      byPath.set(e.path, entry);
    }
    const out: PathSummary[] = [];
    for (const [path, info] of byPath) {
      let topRef: string | null = null;
      let topCount = 0;
      for (const [r, c] of info.refs) {
        if (c > topCount) { topCount = c; topRef = r; }
      }
      let topMethod = "GET";
      let topMethodCount = 0;
      for (const [m, c] of info.methods) {
        if (c > topMethodCount) { topMethodCount = c; topMethod = m; }
      }
      out.push({
        path,
        hits: info.hits,
        lastSeen: info.lastSeen,
        topReferrer: topRef,
        hasBotTraffic: info.bot,
        topMethod,
        requestKind: info.kind,
        assetExtension: info.assetExtension,
        sampleQuery: info.sampleQuery,
      });
    }
    out.sort((a, b) => b.hits - a.hits);
    return out;
  }, [data]);

  const filtered = useMemo(() => {
    let list = summaries;
    if (kindFilter !== "all") {
      list = list.filter((s) => s.requestKind === kindFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((s) => s.path.toLowerCase().includes(q));
  }, [summaries, search, kindFilter]);

  const patternSummaries = useMemo<PatternSummary[]>(() => {
    const byPattern = new Map<string, PatternSummary>();
    for (const p of filtered) {
      const rule = resolvePattern(p.path);
      let bucket = byPattern.get(rule.id);
      if (!bucket) {
        bucket = {
          patternId: rule.id,
          patternLabel: rule.label,
          hits: 0,
          uniquePaths: 0,
          lastSeen: p.lastSeen,
          hasBotTraffic: false,
          paths: [],
        };
        byPattern.set(rule.id, bucket);
      }
      bucket.hits += p.hits;
      bucket.uniquePaths += 1;
      if (p.lastSeen > bucket.lastSeen) bucket.lastSeen = p.lastSeen;
      if (p.hasBotTraffic) bucket.hasBotTraffic = true;
      bucket.paths.push(p);
    }
    const out = Array.from(byPattern.values());
    for (const b of out) b.paths.sort((a, b) => b.hits - a.hits);
    out.sort((a, b) => b.hits - a.hits);
    return out;
  }, [filtered]);

  const eventsPagination = usePagination({
    tableId: "admin-not-found",
    defaultPageSize: 50,
    totalItems: groupMode === "pattern" ? patternSummaries.length : filtered.length,
  });
  const visibleFiltered = eventsPagination.paginate(filtered);
  const visiblePatterns = eventsPagination.paginate(patternSummaries);

  useEffect(() => {
    eventsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kindFilter, groupMode]);

  const totalHits = summaries.reduce((sum, s) => sum + s.hits, 0);
  const uniquePaths = summaries.length;

  const filtersActive =
    range !== "30d" ||
    kindFilter !== "all" ||
    search !== "" ||
    groupMode !== "pattern";

  const handleClearFilters = useCallback(() => {
    setRange("30d");
    setKindFilter("all");
    setSearch("");
    setGroupMode("pattern");
  }, []);

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

  const handleExportCsv = useCallback(() => {
    const rows = groupMode === "pattern" ? patternSummaries : filtered;
    if (rows.length === 0) {
      toast.error("No rows in current view to export");
      return;
    }

    let csv: string;
    if (groupMode === "pattern") {
      const header = ["Pattern", "Pattern ID", "Hits", "Unique paths", "Last seen", "Has bot traffic"];
      const body = patternSummaries.map((p) =>
        [
          p.patternLabel,
          p.patternId,
          p.hits,
          p.uniquePaths,
          p.lastSeen,
          p.hasBotTraffic ? "yes" : "no",
        ]
          .map(csvCell)
          .join(","),
      );
      csv = [header.map(csvCell).join(","), ...body].join("\n");
    } else {
      const header = [
        "Path",
        "Hits",
        "Last seen",
        "Top method",
        "Request kind",
        "Asset extension",
        "Top referrer",
        "Has bot traffic",
        "Sample query",
      ];
      const body = filtered.map((s) =>
        [
          s.path,
          s.hits,
          s.lastSeen,
          s.topMethod,
          s.requestKind,
          s.assetExtension ?? "",
          s.topReferrer ?? "",
          s.hasBotTraffic ? "yes" : "no",
          s.sampleQuery ?? "",
        ]
          .map(csvCell)
          .join(","),
      );
      csv = [header.map(csvCell).join(","), ...body].join("\n");
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `not-found-events-${groupMode}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success(`Exported ${rows.length} ${groupMode === "pattern" ? "patterns" : "paths"}`);
  }, [groupMode, patternSummaries, filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            404 Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live feed of paths that hit the NotFound page. Use this to identify legacy slugs that need a redirect.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            disabled={!filtersActive}
            aria-label="Copy link to filtered view"
            title={filtersActive ? "Copy filtered view URL" : "Apply a filter first"}
          >
            {copiedLink ? (
              <CheckIcon className="h-4 w-4 mr-2 text-success" />
            ) : (
              <LinkIcon className="h-4 w-4 mr-2" />
            )}
            Copy link
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            disabled={(groupMode === "pattern" ? patternSummaries.length : filtered.length) === 0}
            aria-label="Export current view to CSV"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh 404 monitor"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Error banner */}
      {queryError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-3"
        >
          <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-destructive">Failed to load 404 events</p>
            <p className="text-xs text-muted-foreground mt-0.5 break-words">
              {queryError instanceof Error ? queryError.message : String(queryError)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
          </Button>
        </div>
      )}

      {/* Truncation banner */}
      {dataTruncated && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-md border border-warning/40 bg-warning/5 p-3 flex items-start gap-3"
        >
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-warning">
              Showing the first {NOT_FOUND_ROW_CAP.toLocaleString()} 404 events
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              The query hit the row cap. Narrow the window to see a complete
              slice — stats and totals above only reflect the capped data.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total 404 hits</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{totalHits.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unique paths</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">{uniquePaths.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Window</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={range} onValueChange={(v) => setRange(v as TimeRange)}>
              <SelectTrigger aria-label="Time range"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-col items-stretch gap-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle>{groupMode === "pattern" ? "Top missing patterns" : "Top missing paths"}</CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
                <TabsList>
                  <TabsTrigger value="pattern">By pattern</TabsTrigger>
                  <TabsTrigger value="path">By exact path</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindFilter)}>
                <SelectTrigger className="w-44" aria-label="Filter by request kind"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All requests</SelectItem>
                  <SelectItem value="spa_route">SPA routes</SelectItem>
                  <SelectItem value="static_asset">Static assets</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-72">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter paths…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                  aria-label="Search paths"
                />
              </div>
              {filtersActive && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  aria-label="Clear all filters"
                >
                  <X className="h-4 w-4 mr-2" /> Clear
                </Button>
              )}
            </div>
          </div>
          {isFetching && !isLoading && (
            <p className="text-xs text-muted-foreground" aria-live="polite">
              Refreshing 404 monitor…
            </p>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No 404 events in this window. 🎉
            </div>
          ) : groupMode === "pattern" ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pattern</TableHead>
                    <TableHead className="w-32 text-right">Hits</TableHead>
                    <TableHead className="w-32 text-right">Unique paths</TableHead>
                    <TableHead className="w-32">Last seen</TableHead>
                    <TableHead className="w-20">Source</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiblePatterns.map((p) => (
                    <TableRow
                      key={p.patternId}
                      className="cursor-pointer hover:bg-muted/40 focus-within:bg-muted/40"
                      onClick={() => setDrillPattern(p)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setDrillPattern(p);
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-label={`View paths for pattern ${p.patternLabel}`}
                    >
                      <TableCell className="font-mono text-xs">{p.patternLabel}</TableCell>
                      <TableCell className="text-right font-semibold">{p.hits}</TableCell>
                      <TableCell className="text-right">{p.uniquePaths}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(p.lastSeen), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {p.hasBotTraffic ? (
                          <Badge variant="secondary" className="text-xs">bot</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">user</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Path</TableHead>
                    <TableHead className="w-20">Method</TableHead>
                    <TableHead className="w-24">Kind</TableHead>
                    <TableHead className="w-24 text-right">Hits</TableHead>
                    <TableHead>Top referrer</TableHead>
                    <TableHead className="w-32">Last seen</TableHead>
                    <TableHead className="w-20">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleFiltered.map((s) => (
                    <TableRow key={s.path}>
                      <TableCell className="font-mono text-xs break-all">
                        <div>{s.path}</div>
                        {s.sampleQuery && (
                          <div className="text-[10px] text-muted-foreground truncate max-w-md">
                            query: {s.sampleQuery}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {s.topMethod}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {s.requestKind === "static_asset" ? (
                          <Badge variant="secondary" className="text-[10px]">
                            asset{s.assetExtension ? ` ${s.assetExtension}` : ""}
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                            SPA
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{s.hits}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                        {s.topReferrer === "(direct)" ? (
                          <span className="italic">direct / unknown</span>
                        ) : s.topReferrer ? (
                          <a
                            href={s.topReferrer}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="hover:underline inline-flex items-center gap-1"
                          >
                            {s.topReferrer}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          "—"
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(s.lastSeen), { addSuffix: true })}
                      </TableCell>
                      <TableCell>
                        {s.hasBotTraffic ? (
                          <Badge variant="secondary" className="text-xs">bot</Badge>
                        ) : (
                          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-xs">user</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          <PaginationFooter
            page={eventsPagination.page}
            pageSize={eventsPagination.pageSize}
            totalPages={eventsPagination.totalPages}
            totalItems={groupMode === "pattern" ? patternSummaries.length : filtered.length}
            onPageChange={eventsPagination.setPage}
            onPageSizeChange={eventsPagination.setPageSize}
            itemLabel={groupMode === "pattern" ? "pattern" : "path"}
          />
        </CardContent>
      </Card>

      {/* Drill-down: paths inside a pattern bucket */}
      <Dialog open={!!drillPattern} onOpenChange={(o) => !o && setDrillPattern(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm break-all">
              {drillPattern?.patternLabel}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground mb-3">
            {drillPattern?.hits.toLocaleString()} hits across {drillPattern?.uniquePaths.toLocaleString()} unique paths
          </div>
          <div className="max-h-[60vh] overflow-y-auto overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Path</TableHead>
                  <TableHead className="w-20 text-right">Hits</TableHead>
                  <TableHead className="w-32">Last seen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(drillPattern?.paths || []).slice(0, 200).map((p) => (
                  <TableRow key={p.path}>
                    <TableCell className="font-mono text-xs break-all">{p.path}</TableCell>
                    <TableCell className="text-right font-semibold">{p.hits}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(p.lastSeen), { addSuffix: true })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {(drillPattern?.paths.length ?? 0) > 200 && (
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Showing first 200 of {drillPattern!.paths.length.toLocaleString()} paths.
                Use Export CSV from the main view for the full list.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How to add a redirect</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            For paths with meaningful traffic, add a <code className="font-mono bg-muted px-1 rounded">{`<Route>`}</code> in
            <code className="font-mono bg-muted px-1 rounded mx-1">src/App.tsx</code> inside the legacy redirect block:
          </p>
          <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
{`<Route path="/old-slug" element={<Navigate to="/new-slug" replace />} />`}
          </pre>
          <p>
            Or run <code className="font-mono bg-muted px-1 rounded">node scripts/suggest-redirects-from-gsc.mjs &lt;export.csv&gt;</code> to
            auto-generate suggestions from a Google Search Console export.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
