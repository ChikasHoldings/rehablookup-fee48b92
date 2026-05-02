import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, RefreshCw, Search, ExternalLink, ChevronRight } from "lucide-react";
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

export default function AdminNotFoundEvents() {
  const [range, setRange] = useState<TimeRange>("30d");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [groupMode, setGroupMode] = useState<GroupMode>("pattern");
  const [drillPattern, setDrillPattern] = useState<PatternSummary | null>(null);

  const { data, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["not-found-events", range],
    queryFn: async () => {
      const since = getTimeRangeStart(range);
      let query = supabase
        .from("not_found_events")
        .select(
          "id, path, referrer, user_agent, created_at, http_method, query_string, request_kind, asset_extension",
        )
        .order("created_at", { ascending: false })
        .limit(5000);
      if (since) query = query.gte("created_at", since);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as NotFoundEvent[];
    },
    refetchInterval: 60_000,
  });

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


  // Aggregate paths into pattern buckets using the shared resolver. We
  // build this off `filtered` so kind+search filters apply uniformly to
  // both views.
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

  // Reset to page 1 on filter/search/group change.
  useEffect(() => {
    eventsPagination.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, kindFilter, groupMode]);


  const totalHits = summaries.reduce((sum, s) => sum + s.hits, 0);
  const uniquePaths = summaries.length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            404 Monitor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live feed of paths that hit the NotFound page. Use this to identify legacy slugs that need a redirect.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

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
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <div className="flex items-center gap-2">
              <Tabs value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
                <TabsList>
                  <TabsTrigger value="pattern">By pattern</TabsTrigger>
                  <TabsTrigger value="path">By exact path</TabsTrigger>
                </TabsList>
              </Tabs>
              <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindFilter)}>
                <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
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
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              No 404 events in this window. 🎉
            </div>
          ) : groupMode === "pattern" ? (
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
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setDrillPattern(p)}
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
          ) : (
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
          <div className="max-h-[60vh] overflow-y-auto">
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
