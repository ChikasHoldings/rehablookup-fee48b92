import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  ChevronDown,
  ChevronUp,
  Route,
  Building2,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const ITEMS_PER_PAGE = 10;

export function RoutingLogsTable() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch routing logs
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-routing-logs", currentPage],
    queryFn: async () => {
      const from = (currentPage - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;

      const { data, error } = await supabase
        .from("lead_routing_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;
      return data as RoutingLog[];
    },
    enabled: isOpen,
  });

  // Fetch total count
  const { data: totalCount } = useQuery({
    queryKey: ["admin-routing-logs-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("lead_routing_logs")
        .select("id", { count: "exact", head: true });

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

  const getReasonBadge = (reason: string) => {
    if (reason.includes("Auto-assigned") || reason.includes("assigned")) {
      return (
        <Badge className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Assigned
        </Badge>
      );
    }
    if (reason.includes("ineligible") || reason.includes("Basic")) {
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
    
    const colors: Record<string, string> = {
      Featured: "bg-amber-50 text-amber-700 border-amber-200",
      Professional: "bg-blue-50 text-blue-700 border-blue-200",
      Basic: "bg-slate-50 text-slate-600 border-slate-200",
    };
    
    return (
      <Badge variant="outline" className={colors[plan] || ""}>
        {plan}
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
