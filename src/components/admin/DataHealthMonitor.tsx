import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle,
  Database,
  RefreshCw,
  Server,
  Zap,
  FileText,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TableStats {
  name: string;
  rowCount: number;
  lastUpdated: string | null;
  status: "healthy" | "warning" | "error";
}

export function DataHealthMonitor() {
  const queryClient = useQueryClient();
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Null until the first realtime event actually arrives — initialising to
  // `now` would display the mount time as if a sync had happened.
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [realtimeStatus, setRealtimeStatus] = useState<"connected" | "disconnected" | "connecting">("connecting");

  // Fetch comprehensive table statistics
  const { data: tableStats, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useQuery({
    queryKey: ["data-health-table-stats"],
    queryFn: async () => {
      const tables: TableStats[] = [];

      // Fetch counts for all major tables
      const queries = [
        { name: "facilities", query: supabase.from("facilities").select("id, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1) },
        { name: "leads", query: supabase.from("leads").select("id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1) },
        { name: "profiles", query: supabase.from("profiles").select("id, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1) },
        { name: "user_roles", query: supabase.from("user_roles").select("id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1) },
        { name: "admin_audit_log", query: supabase.from("admin_audit_log").select("id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1) },
        { name: "admin_notifications", query: supabase.from("admin_notifications").select("id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1) },
        { name: "platform_settings", query: supabase.from("platform_settings").select("id, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1) },
        { name: "flagged_images", query: supabase.from("flagged_images").select("id, flagged_at", { count: "exact" }).order("flagged_at", { ascending: false }).limit(1) },
        
        { name: "notification_preferences", query: supabase.from("notification_preferences").select("id, updated_at", { count: "exact" }).order("updated_at", { ascending: false }).limit(1) },
        { name: "provider_events", query: supabase.from("provider_events").select("id, created_at", { count: "exact" }).order("created_at", { ascending: false }).limit(1) },
      ];

      const results = await Promise.all(queries.map(async (q) => {
        const { data, count, error } = await q.query;
        const firstRecord = data?.[0] as Record<string, unknown> | undefined;
        const lastUpdated = (firstRecord?.updated_at || firstRecord?.created_at || firstRecord?.flagged_at || null) as string | null;
        return {
          name: q.name,
          rowCount: count || 0,
          lastUpdated,
          status: error ? "error" : "healthy" as const,
        };
      }));

      return results;
    },
    refetchInterval: 60000, // Refresh every 60 seconds
    staleTime: 30000,
  });

  // Monitor realtime connection
  useEffect(() => {
    const channel = supabase
      .channel(`data-health-monitor-${Math.random().toString(36).slice(2,8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "facilities" }, () => {
        setLastSyncTime(new Date());
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setRealtimeStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setRealtimeStatus("disconnected");
        } else {
          setRealtimeStatus("connecting");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch database connection stats
  const { data: connectionStats, isLoading: loadingConnection } = useQuery({
    queryKey: ["data-health-connection"],
    queryFn: async () => {
      const startTime = Date.now();
      
      // Test database connectivity with a simple query
      const { error } = await supabase.from("platform_settings").select("id").limit(1);
      
      const latency = Date.now() - startTime;
      
      return {
        latency,
        status: error ? "error" : latency > 500 ? "warning" : "healthy",
        connected: !error,
      };
    },
    refetchInterval: 60000, // Check every 60 seconds
    staleTime: 30000,
  });

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    try {
      await refetchStats();
      queryClient.invalidateQueries({ queryKey: ["data-health-connection"] });
      setLastSyncTime(new Date());
      toast.success("Data health refreshed");
    } catch (error) {
      toast.error("Failed to refresh data health");
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatLastUpdated = (date: string | null) => {
    if (!date) return "Never";
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getTotalRows = () => {
    if (!tableStats) return 0;
    return tableStats.reduce((sum, t) => sum + t.rowCount, 0);
  };

  const getHealthyCount = () => {
    if (!tableStats) return 0;
    return tableStats.filter(t => t.status === "healthy").length;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Activity className="h-5 w-5 text-emerald-500" />
              Data Health Monitor
            </CardTitle>
            <CardDescription>Real-time database health and sync status</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Connection Status Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Database Connection */}
          <div className={cn(
            "p-4 rounded-lg border",
            connectionStats?.status === "healthy" 
              ? "bg-green-50 border-green-100" 
              : connectionStats?.status === "warning"
              ? "bg-amber-50 border-amber-100"
              : "bg-red-50 border-red-100"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Database className={cn(
                "h-4 w-4",
                connectionStats?.status === "healthy" ? "text-green-600" : 
                connectionStats?.status === "warning" ? "text-amber-600" : "text-red-600"
              )} />
              <span className="text-sm font-medium">Database</span>
            </div>
            {loadingConnection ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <>
                <p className={cn(
                  "text-lg font-bold",
                  connectionStats?.status === "healthy" ? "text-green-700" : 
                  connectionStats?.status === "warning" ? "text-amber-700" : "text-red-700"
                )}>
                  {connectionStats?.connected ? "Connected" : "Disconnected"}
                </p>
                <p className={cn(
                  "text-xs mt-1",
                  connectionStats?.status === "healthy" ? "text-green-600" : 
                  connectionStats?.status === "warning" ? "text-amber-600" : "text-red-600"
                )}>
                  Latency: {connectionStats?.latency || 0}ms
                </p>
              </>
            )}
          </div>

          {/* Realtime Status */}
          <div className={cn(
            "p-4 rounded-lg border",
            realtimeStatus === "connected" 
              ? "bg-green-50 border-green-100" 
              : realtimeStatus === "connecting"
              ? "bg-amber-50 border-amber-100"
              : "bg-red-50 border-red-100"
          )}>
            <div className="flex items-center gap-2 mb-2">
              <Zap className={cn(
                "h-4 w-4",
                realtimeStatus === "connected" ? "text-green-600" : 
                realtimeStatus === "connecting" ? "text-amber-600" : "text-red-600"
              )} />
              <span className="text-sm font-medium">Realtime Sync</span>
            </div>
            <p className={cn(
              "text-lg font-bold capitalize",
              realtimeStatus === "connected" ? "text-green-700" : 
              realtimeStatus === "connecting" ? "text-amber-700" : "text-red-700"
            )}>
              {realtimeStatus}
            </p>
            <p className={cn(
              "text-xs mt-1",
              realtimeStatus === "connected" ? "text-green-600" : 
              realtimeStatus === "connecting" ? "text-amber-600" : "text-red-600"
            )}>
              Last sync: {lastSyncTime ? lastSyncTime.toLocaleTimeString() : "—"}
            </p>
          </div>

          {/* Table Health */}
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Tables Health</span>
            </div>
            {loadingStats ? (
              <Skeleton className="h-6 w-24" />
            ) : statsError ? (
              <p className="text-sm font-medium text-red-600">Unavailable</p>
            ) : (
              <>
                <p className="text-lg font-bold text-blue-700">
                  {getHealthyCount()}/{tableStats?.length || 0} Healthy
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {getTotalRows().toLocaleString()} total rows
                </p>
              </>
            )}
          </div>
        </div>

        {/* Table Statistics Grid */}
        <div>
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            Table Statistics
          </h4>
          {loadingStats ? (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : statsError ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed p-6 text-center">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <p className="text-sm text-muted-foreground">Table statistics failed to load.</p>
              <Button variant="outline" size="sm" onClick={() => refetchStats()}>Retry</Button>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {tableStats?.map((table) => (
                <div
                  key={table.name}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border hover:bg-muted/70 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "h-2 w-2 rounded-full shrink-0",
                      table.status === "healthy" ? "bg-green-500" :
                      table.status === "warning" ? "bg-amber-500" : "bg-red-500"
                    )} />
                    <span className="text-sm font-medium truncate">{table.name}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {table.rowCount.toLocaleString()}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">
                      {formatLastUpdated(table.lastUpdated)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Health Summary */}
        {!loadingStats && tableStats && (() => {
          const errorCount = tableStats.filter(t => t.status === "error").length;
          const warnCount = tableStats.filter(t => t.status === "warning").length;
          const connBad = connectionStats?.status === "error";
          const connWarn = connectionStats?.status === "warning";
          if (errorCount > 0 || connBad) {
            return (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-100">
                <CheckCircle className="h-4 w-4 text-red-500 shrink-0" />
                <p className="text-sm text-red-700">
                  {errorCount > 0
                    ? `${errorCount} table${errorCount > 1 ? "s" : ""} reporting errors.`
                    : "Database connection error."}{" "}
                  Check table statistics above.
                </p>
              </div>
            );
          }
          if (warnCount > 0 || connWarn) {
            return (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <CheckCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <p className="text-sm text-amber-700">
                  {warnCount > 0
                    ? `${warnCount} table${warnCount > 1 ? "s" : ""} may be slow or stale.`
                    : `High database latency (${connectionStats?.latency || 0}ms).`}
                </p>
              </div>
            );
          }
          return (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700">
                All systems operational. Database connection stable with {connectionStats?.latency || 0}ms latency.
                {` Monitoring ${tableStats.length} tables with ${getTotalRows().toLocaleString()} total records.`}
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
