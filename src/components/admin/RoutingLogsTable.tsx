import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Route,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  CalendarIcon,
  Filter,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

type RoutingLog = {
  id: string;
  lead_id: string | null;
  assigned_provider_id: string | null;
  requested_facility_id: string | null;
  assignment_reason: string;
  routing_source: string;
  plan_tier: string | null;
  subscription_status: string | null;
  used_leads: number | null;
  lead_limit: number | null;
  eligibility_check_result: Record<string, unknown> | null;
  created_at: string;
};

type Facility = {
  id: string;
  name: string;
};

type Lead = {
  id: string;
  name: string;
};

type DateRange = {
  from: Date | undefined;
  to: Date | undefined;
};

const ITEMS_PER_PAGE = 10;

const DATE_PRESETS = [
  { label: "Today", getValue: () => ({ from: startOfDay(new Date()), to: endOfDay(new Date()) }) },
  { label: "Last 7 Days", getValue: () => ({ from: startOfDay(subDays(new Date(), 7)), to: endOfDay(new Date()) }) },
  { label: "Last 30 Days", getValue: () => ({ from: startOfDay(subDays(new Date(), 30)), to: endOfDay(new Date()) }) },
  { label: "All Time", getValue: () => ({ from: undefined, to: undefined }) },
];

export function RoutingLogsTable() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [resultFilter, setResultFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  // Determine result type from assignment_reason
  const getResultType = (reason: string): string => {
    if (reason.includes("Auto-assigned") || reason.includes("assigned")) return "assigned";
    if (reason.includes("ineligible") || reason.includes("Free")) return "ineligible";
    if (reason.includes("Unassigned") || reason.includes("No eligible")) return "unassigned";
    return "other";
  };

  // Fetch routing logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-routing-logs", currentPage, dateRange, resultFilter, planFilter],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      let query = supabase
        .from("lead_routing_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }
      if (planFilter !== "all") {
        query = query.eq("plan_tier", planFilter);
      }

      const { data, error } = await query.range(from, to);
      if (error) throw error;

      // Client-side filter for result type (based on assignment_reason text)
      let filtered = data as RoutingLog[];
      if (resultFilter !== "all") {
        filtered = filtered.filter((log) => getResultType(log.assignment_reason) === resultFilter);
      }

      return filtered;
    },
    enabled: isOpen,
  });

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-routing-logs-count", dateRange, planFilter],
    queryFn: async () => {
      let query = supabase
        .from("lead_routing_logs")
        .select("id", { count: "exact", head: true });

      if (dateRange.from) {
        query = query.gte("created_at", dateRange.from.toISOString());
      }
      if (dateRange.to) {
        query = query.lte("created_at", dateRange.to.toISOString());
      }
      if (planFilter !== "all") {
        query = query.eq("plan_tier", planFilter);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: isOpen,
  });

  // Fetch facilities for lookup
  const { data: facilities } = useQuery({
    queryKey: ["admin-facilities-routing-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facilities")
        .select("id, name");
      return new Map((data || []).map((f: Facility) => [f.id, f.name]));
    },
    enabled: isOpen,
  });

  // Fetch leads for lookup
  const { data: leads } = useQuery({
    queryKey: ["admin-leads-routing-lookup"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name");
      return new Map((data || []).map((l: Lead) => [l.id, l.name]));
    },
    enabled: isOpen,
  });

  const totalPages = Math.ceil((totalCount || 0) / ITEMS_PER_PAGE);

  const handleFilterChange = () => {
    setCurrentPage(1);
  };

  const getReasonBadge = (reason: string) => {
    if (reason.includes("Auto-assigned") || reason.includes("assigned")) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Assigned
        </Badge>
      );
    }
    if (reason.includes("ineligible") || reason.includes("Free")) {
      return (
        <Badge className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Ineligible
        </Badge>
      );
    }
    if (reason.includes("Unassigned") || reason.includes("No eligible")) {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Unassigned
        </Badge>
      );
    }
    return (
      <Badge variant="outline">
        {reason.slice(0, 20)}...
      </Badge>
    );
  };

  const getPlanBadge = (plan: string | null) => {
    if (!plan) return <span className="text-muted-foreground">—</span>;
    
    // Map legacy tier names to new Free/Pro model
    const displayPlan = (plan === "featured" || plan === "professional" || plan === "Featured" || plan === "Professional") 
      ? "Pro" 
      : (plan === "basic" || plan === "Basic") 
        ? "Free" 
        : plan;
    
    const colors: Record<string, string> = {
      Pro: "bg-amber-50 text-amber-700 border-amber-200",
      pro: "bg-amber-50 text-amber-700 border-amber-200",
      Free: "bg-slate-50 text-slate-600 border-slate-200",
      free: "bg-slate-50 text-slate-600 border-slate-200",
    };
    
    return (
      <Badge variant="outline" className={colors[displayPlan] || ""}>
        {displayPlan}
      </Badge>
    );
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Route className="h-5 w-5" />
                Lead Routing Logs
                {totalCount !== undefined && (
                  <Badge variant="secondary" className="ml-2">
                    {totalCount}
                  </Badge>
                )}
              </span>
              {isOpen ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="p-0">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3 p-4 border-b bg-muted/30">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" />
                Filters:
              </div>
              
              {/* Date Range */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 gap-2">
                    <CalendarIcon className="h-3.5 w-3.5" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "MMM d")} - {format(dateRange.to, "MMM d")}
                        </>
                      ) : (
                        format(dateRange.from, "MMM d, yyyy")
                      )
                    ) : (
                      "All Time"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <div className="p-2 border-b">
                    <div className="flex flex-wrap gap-1">
                      {DATE_PRESETS.map((preset) => (
                        <Button
                          key={preset.label}
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            const range = preset.getValue();
                            setDateRange(range);
                            handleFilterChange();
                          }}
                        >
                          {preset.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      setDateRange({ from: range?.from, to: range?.to });
                      handleFilterChange();
                    }}
                    numberOfMonths={1}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>

              {/* Result Type */}
              <Select
                value={resultFilter}
                onValueChange={(v) => {
                  setResultFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Results</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="ineligible">Ineligible</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                </SelectContent>
              </Select>

              {/* Plan Tier */}
              <Select
                value={planFilter}
                onValueChange={(v) => {
                  setPlanFilter(v);
                  handleFilterChange();
                }}
              >
                <SelectTrigger className="h-8 w-[130px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters */}
              {(dateRange.from || resultFilter !== "all" || planFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs text-muted-foreground"
                  onClick={() => {
                    setDateRange({ from: undefined, to: undefined });
                    setResultFilter("all");
                    setPlanFilter("all");
                    handleFilterChange();
                  }}
                >
                  Clear
                </Button>
              )}
            </div>

            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : logs && logs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Requested Provider</TableHead>
                      <TableHead>Assigned Provider</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {format(new Date(log.created_at), "MMM d, h:mm a")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.lead_id && leads?.get(log.lead_id) ? (
                            <span className="font-medium text-sm">
                              {leads.get(log.lead_id)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">
                              {log.lead_id?.slice(0, 8) || "—"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.requested_facility_id && facilities?.get(log.requested_facility_id) ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm truncate max-w-[120px]">
                                {facilities.get(log.requested_facility_id)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.assigned_provider_id && facilities?.get(log.assigned_provider_id) ? (
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 text-green-600" />
                              <span className="text-sm font-medium truncate max-w-[120px]">
                                {facilities.get(log.assigned_provider_id)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">None</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getPlanBadge(log.plan_tier)}
                        </TableCell>
                        <TableCell>
                          {log.used_leads !== null && log.lead_limit !== null ? (
                            <span className="text-sm">
                              {log.used_leads}/{log.lead_limit}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getReasonBadge(log.assignment_reason)}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-7 text-xs">
                                  View
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-md p-3">
                                <div className="space-y-2 text-xs">
                                  <p><strong>Source:</strong> {log.routing_source}</p>
                                  <p><strong>Reason:</strong> {log.assignment_reason}</p>
                                  <p><strong>Subscription:</strong> {log.subscription_status || "N/A"}</p>
                                  {log.eligibility_check_result && (
                                    <div>
                                      <strong>Eligibility Check:</strong>
                                      <pre className="mt-1 p-2 bg-muted rounded text-[10px] overflow-auto max-h-32">
                                        {JSON.stringify(log.eligibility_check_result, null, 2)}
                                      </pre>
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">
                No routing logs found
              </p>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
