import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAdminErrorHandler } from "@/hooks/useAdminErrorHandler";
import { supabase } from "@/integrations/supabase/client";
import { format, formatDistanceToNow, subDays } from "date-fns";
import {
  ArrowRight,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RotateCcw,
  Filter,
  Calendar,
  ChevronDown,
  ChevronUp,
  BarChart3,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 20;

interface RoutingLog {
  id: string;
  lead_id: string | null;
  requested_facility_id: string | null;
  assigned_provider_id: string | null;
  assignment_reason: string;
  routing_source: string;
  plan_tier: string | null;
  lead_limit: number | null;
  used_leads: number | null;
  eligibility_check_result: any;
  created_at: string;
  lead?: {
    name: string;
    email: string;
    location_city_state: string | null;
  } | null;
  requested_facility?: {
    name: string;
  } | null;
  assigned_facility?: {
    name: string;
  } | null;
}

const DATE_PRESETS = [
  { label: "Last 24 hours", days: 1 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

export default function AdminLeadRouting() {
  const { logError } = useAdminErrorHandler("AdminLeadRouting");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [routingSource, setRoutingSource] = useState<string>("all");
  const [resultType, setResultType] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(ITEMS_PER_PAGE);

  // Fetch routing statistics
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ["routing-stats", dateRange],
    queryFn: async () => {
      const fromDate = dateRange.from?.toISOString() || subDays(new Date(), 30).toISOString();
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();

      // Total re-routes
      const { count: totalReroutes } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .eq("routing_source", "reroute_stale")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Successful re-routes
      const { count: successfulReroutes } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .eq("routing_source", "reroute_stale")
        .not("assigned_provider_id", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Failed re-routes
      const { count: failedReroutes } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .eq("routing_source", "reroute_stale")
        .is("assigned_provider_id", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // Total initial assignments
      const { count: totalInitial } = await supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .neq("routing_source", "reroute_stale")
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      // By plan tier
      const { data: byPlan } = await supabase
        .from("lead_routing_logs")
        .select("plan_tier")
        .not("plan_tier", "is", null)
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      const planCounts = (byPlan || []).reduce((acc: Record<string, number>, log) => {
        const plan = log.plan_tier || "unknown";
        acc[plan] = (acc[plan] || 0) + 1;
        return acc;
      }, {});

      return {
        totalReroutes: totalReroutes || 0,
        successfulReroutes: successfulReroutes || 0,
        failedReroutes: failedReroutes || 0,
        totalInitial: totalInitial || 0,
        successRate: totalReroutes ? Math.round((successfulReroutes || 0) / totalReroutes * 100) : 0,
        byPlan: planCounts,
      };
    },
  });

  // Fetch total count for pagination
  const { data: totalCount, error: countError } = useQuery({
    queryKey: ["routing-logs-count", dateRange, routingSource, resultType],
    queryFn: async () => {
      const fromDate = dateRange.from?.toISOString() || subDays(new Date(), 30).toISOString();
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();

      let query = supabase
        .from("lead_routing_logs")
        .select("*", { count: "exact", head: true })
        .gte("created_at", fromDate)
        .lte("created_at", toDate);

      if (routingSource !== "all") {
        if (routingSource === "reroute") {
          query = query.eq("routing_source", "reroute_stale");
        } else {
          query = query.neq("routing_source", "reroute_stale");
        }
      }

      if (resultType !== "all") {
        if (resultType === "success") {
          query = query.not("assigned_provider_id", "is", null);
        } else {
          query = query.is("assigned_provider_id", null);
        }
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  // Fetch routing logs with pagination
  const { data: logs, isLoading: logsLoading, refetch, error: logsError } = useQuery({
    queryKey: ["routing-logs-detailed", dateRange, routingSource, resultType, currentPage, itemsPerPage],
    queryFn: async () => {
      const fromDate = dateRange.from?.toISOString() || subDays(new Date(), 30).toISOString();
      const toDate = dateRange.to?.toISOString() || new Date().toISOString();

      const from = (currentPage - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      let query = supabase
        .from("lead_routing_logs")
        .select(`
          *,
          lead:leads!lead_routing_logs_lead_id_fkey(name, email, location_city_state),
          requested_facility:facilities!lead_routing_logs_requested_facility_id_fkey(name),
          assigned_facility:facilities!lead_routing_logs_assigned_provider_id_fkey(name)
        `)
        .gte("created_at", fromDate)
        .lte("created_at", toDate)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (routingSource !== "all") {
        if (routingSource === "reroute") {
          query = query.eq("routing_source", "reroute_stale");
        } else {
          query = query.neq("routing_source", "reroute_stale");
        }
      }

      if (resultType !== "all") {
        if (resultType === "success") {
          query = query.not("assigned_provider_id", "is", null);
        } else {
          query = query.is("assigned_provider_id", null);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as RoutingLog[];
    },
  });

  // Log query errors
  useEffect(() => {
    if (statsError) logError("fetch_routing_stats", statsError, { queryKey: "routing-stats" });
  }, [statsError, logError]);

  useEffect(() => {
    if (countError) logError("fetch_routing_count", countError, { queryKey: "routing-logs-count" });
  }, [countError, logError]);

  useEffect(() => {
    if (logsError) logError("fetch_routing_logs", logsError, { queryKey: "routing-logs-detailed" });
  }, [logsError, logError]);

  const totalPages = Math.ceil((totalCount || 0) / itemsPerPage);

  // Safe data accessors
  const safeLogs = logs || [];
  const safeStats = stats || { totalReroutes: 0, successfulReroutes: 0, failedReroutes: 0, totalInitial: 0, successRate: 0, byPlan: {} };

  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setCurrentPage(1);
  };

  const handlePresetClick = (days: number) => {
    setDateRange({
      from: subDays(new Date(), days),
      to: new Date(),
    });
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lead Routing Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Track lead assignments and re-routing history
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Initial Assignments
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-slate-900">{stats?.totalInitial}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Total Re-routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-amber-600">{stats?.totalReroutes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              Successful Re-routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <p className="text-3xl font-bold text-emerald-600">{stats?.successfulReroutes}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              Failed Re-routes
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold text-red-600">{stats?.failedReroutes}</p>
                {stats?.totalReroutes > 0 && (
                  <span className="text-sm text-slate-500">
                    ({100 - stats.successRate}%)
                  </span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      {stats?.byPlan && Object.keys(stats.byPlan).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Assignments by Plan Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.byPlan).map(([plan, count]) => {
                // Map legacy plan names to new Free/Pro model for display
                const displayPlan = plan === "featured" || plan === "professional" ? "pro" : plan === "basic" ? "free" : plan;
                return (
                  <div key={plan} className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        (plan === "pro" || plan === "featured" || plan === "professional") && "border-amber-500 bg-amber-50 text-amber-700",
                        (plan === "free" || plan === "basic") && "border-slate-400 bg-slate-50 text-slate-600"
                      )}
                    >
                      {displayPlan === "pro" ? "Pro" : displayPlan === "free" ? "Free" : displayPlan.charAt(0).toUpperCase() + displayPlan.slice(1)}
                    </Badge>
                    <span className="font-semibold text-slate-900">{count as number}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Routing History
            </CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              {/* Date Presets */}
              <div className="flex gap-1">
                {DATE_PRESETS.map((preset) => (
                  <Button
                    key={preset.days}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePresetClick(preset.days)}
                    className={cn(
                      "text-xs",
                      dateRange.from &&
                        Math.abs(
                          (dateRange.from.getTime() - subDays(new Date(), preset.days).getTime()) /
                            (1000 * 60 * 60 * 24)
                        ) < 1 &&
                        "bg-slate-900 text-white hover:bg-slate-800"
                    )}
                  >
                    {preset.label}
                  </Button>
                ))}
              </div>

              {/* Custom Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Calendar className="h-4 w-4" />
                    Custom
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) =>
                      setDateRange({ from: range?.from, to: range?.to || range?.from })
                    }
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>

              {/* Source Filter */}
              <Select value={routingSource} onValueChange={handleFilterChange(setRoutingSource)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="initial">Initial</SelectItem>
                  <SelectItem value="reroute">Re-routes</SelectItem>
                </SelectContent>
              </Select>

              {/* Result Filter */}
              <Select value={resultType} onValueChange={handleFilterChange(setResultType)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="success">Assigned</SelectItem>
                  <SelectItem value="failed">Unassigned</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logs && logs.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Original Provider</TableHead>
                      <TableHead className="text-center">→</TableHead>
                      <TableHead>Assigned Provider</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <RoutingLogRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Showing</span>
                    <Select 
                      value={itemsPerPage.toString()} 
                      onValueChange={(value) => {
                        setItemsPerPage(Number(value));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>of {totalCount} results</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {totalPages <= 7 ? (
                        [...Array(totalPages)].map((_, i) => (
                          <Button
                            key={i + 1}
                            variant={currentPage === i + 1 ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(i + 1)}
                          >
                            {i + 1}
                          </Button>
                        ))
                      ) : (
                        <>
                          {currentPage > 3 && (
                            <>
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(1)}
                              >
                                1
                              </Button>
                              {currentPage > 4 && <span className="px-1 text-muted-foreground">...</span>}
                            </>
                          )}
                          {[...Array(5)].map((_, i) => {
                            let pageNum: number;
                            if (currentPage <= 3) {
                              pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                              pageNum = totalPages - 4 + i;
                            } else {
                              pageNum = currentPage - 2 + i;
                            }
                            if (pageNum < 1 || pageNum > totalPages) return null;
                            return (
                              <Button
                                key={pageNum}
                                variant={currentPage === pageNum ? "default" : "outline"}
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(pageNum)}
                              >
                                {pageNum}
                              </Button>
                            );
                          })}
                          {currentPage < totalPages - 2 && (
                            <>
                              {currentPage < totalPages - 3 && <span className="px-1 text-muted-foreground">...</span>}
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-8 h-8 p-0"
                                onClick={() => setCurrentPage(totalPages)}
                              >
                                {totalPages}
                              </Button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <RotateCcw className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No routing logs found for the selected filters</p>
              <p className="text-xs text-slate-400 mt-2">
                Logs will appear here when leads are submitted through the Request Help form
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Expandable row component for showing scoring breakdown
function RoutingLogRow({ log }: { log: RoutingLog }) {
  const [isOpen, setIsOpen] = useState(false);
  const eligibility = log.eligibility_check_result as Record<string, any> | null;
  const hasScoring = eligibility && Object.keys(eligibility).length > 0;

  return (
    <>
      <TableRow className="cursor-pointer hover:bg-slate-50" onClick={() => hasScoring && setIsOpen(!isOpen)}>
        <TableCell className="w-8">
          {hasScoring && (
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-500" />
              )}
            </Button>
          )}
        </TableCell>
        <TableCell className="whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <div>
              <p className="text-sm font-medium">
                {format(new Date(log.created_at), "MMM d, h:mm a")}
              </p>
              <p className="text-xs text-slate-500">
                {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
        </TableCell>
        <TableCell>
          {log.lead ? (
            <div>
              <p className="font-medium text-slate-900">{log.lead.name}</p>
              <p className="text-xs text-slate-500">
                {log.lead.location_city_state || "—"}
              </p>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </TableCell>
        <TableCell>
          {log.requested_facility ? (
            <span className="text-slate-700">{log.requested_facility.name}</span>
          ) : (
            <span className="text-slate-400">None (auto-routed)</span>
          )}
        </TableCell>
        <TableCell className="text-center">
          <ArrowRight
            className={cn(
              "h-4 w-4 mx-auto",
              log.assigned_provider_id ? "text-emerald-500" : "text-red-400"
            )}
          />
        </TableCell>
        <TableCell>
          {log.assigned_facility ? (
            <span className="font-medium text-emerald-700">
              {log.assigned_facility.name}
            </span>
          ) : (
            <Badge variant="destructive" className="text-xs">
              Unassigned
            </Badge>
          )}
        </TableCell>
        <TableCell>
          <Badge
            variant="outline"
            className={cn(
              log.routing_source === "reroute_stale"
                ? "border-amber-500 bg-amber-50 text-amber-700"
                : "border-blue-500 bg-blue-50 text-blue-700"
            )}
          >
            {log.routing_source === "reroute_stale" ? "Re-route" : "Initial"}
          </Badge>
        </TableCell>
        <TableCell>
          {log.plan_tier ? (
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                (log.plan_tier === "pro" || log.plan_tier === "featured" || log.plan_tier === "professional") && "bg-amber-100 text-amber-800",
                (log.plan_tier === "free" || log.plan_tier === "basic") && "bg-slate-100 text-slate-700"
              )}
            >
              {log.plan_tier === "featured" || log.plan_tier === "professional" ? "Pro" : log.plan_tier === "basic" ? "Free" : log.plan_tier.charAt(0).toUpperCase() + log.plan_tier.slice(1)}
            </Badge>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </TableCell>
        <TableCell>
          {log.used_leads !== null && log.lead_limit !== null ? (
            <div className="text-xs">
              <span className={cn(
                "font-medium",
                log.used_leads >= log.lead_limit ? "text-red-600" : "text-slate-700"
              )}>
                {log.used_leads}/{log.lead_limit}
              </span>
            </div>
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </TableCell>
        <TableCell className="max-w-[200px]">
          <p className="text-xs text-slate-600 truncate" title={log.assignment_reason}>
            {log.assignment_reason}
          </p>
        </TableCell>
      </TableRow>
      
      {/* Expanded Scoring Breakdown Row */}
      {isOpen && hasScoring && (
        <TableRow className="bg-slate-50 border-t-0">
          <TableCell colSpan={10} className="py-4">
            <ScoringBreakdown eligibility={eligibility} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// Scoring breakdown component
function ScoringBreakdown({ eligibility }: { eligibility: Record<string, any> | null }) {
  if (!eligibility) return null;

  const scoreFields = [
    { key: "total_score", label: "Total Score", highlight: true },
    { key: "location_score", label: "Location Match" },
    { key: "insurance_score", label: "Insurance Match" },
    { key: "service_score", label: "Service Match" },
    { key: "lead_capacity_score", label: "Lead Capacity" },
    { key: "response_time_score", label: "Response Time" },
    { key: "plan_tier_score", label: "Plan Tier Bonus" },
  ];

  const metaFields = [
    { key: "subscription_status", label: "Subscription Status" },
    { key: "is_eligible", label: "Eligible" },
    { key: "rejection_reason", label: "Rejection Reason" },
    { key: "candidates_evaluated", label: "Candidates Evaluated" },
    { key: "winning_provider_name", label: "Winner" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <BarChart3 className="h-4 w-4" />
        Scoring Breakdown
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {scoreFields.map(({ key, label, highlight }) => {
          const value = eligibility[key];
          if (value === undefined) return null;
          return (
            <div
              key={key}
              className={cn(
                "rounded-lg p-3 text-center",
                highlight ? "bg-slate-900 text-white" : "bg-white border border-slate-200"
              )}
            >
              <p className={cn("text-2xl font-bold", highlight ? "text-white" : "text-slate-900")}>
                {typeof value === "number" ? value.toFixed(1) : value}
              </p>
              <p className={cn("text-xs", highlight ? "text-slate-300" : "text-slate-500")}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Meta information */}
      <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200">
        {metaFields.map(({ key, label }) => {
          const value = eligibility[key];
          if (value === undefined || value === null) return null;
          return (
            <div key={key} className="text-xs">
              <span className="text-slate-500">{label}:</span>{" "}
              <span className="font-medium text-slate-700">
                {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Raw JSON for debugging */}
      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="text-xs text-slate-400 hover:text-slate-600">
            View Raw Data
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <pre className="mt-2 p-3 bg-slate-100 rounded text-xs overflow-auto max-h-40">
            {JSON.stringify(eligibility, null, 2)}
          </pre>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
