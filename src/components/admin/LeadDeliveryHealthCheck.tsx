import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  AlertCircle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  XCircle,
  Building2,
  Mail,
  Users,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type DeliveryStatus = "delivered" | "failed" | "pending" | "unassigned";

interface LeadDeliveryRecord {
  id: string;
  lead_id: string;
  lead_name: string;
  lead_email: string;
  lead_phone: string;
  created_at: string;
  facility_id: string | null;
  facility_name: string | null;
  assignment_status: string | null;
  assignment_reason: string | null;
  qualified: boolean | null;
  exclusivity: string | null;
}

interface HealthStats {
  total: number;
  delivered: number;
  failed: number;
  pending: number;
  deliveryRate: number;
}

function getDeliveryStatus(lead: LeadDeliveryRecord): DeliveryStatus {
  if (!lead.facility_id) {
    if (lead.assignment_status === "unassigned_no_capacity" || 
        lead.assignment_status === "unassigned_no_match") {
      return "failed";
    }
    return "unassigned";
  }
  
  if (lead.assignment_status === "assigned") {
    return "delivered";
  }
  
  if (lead.assignment_status === "pending") {
    return "pending";
  }
  
  return "delivered"; // Default if has facility_id
}

function StatusBadge({ status }: { status: DeliveryStatus }) {
  const config = {
    delivered: {
      label: "Delivered",
      className: "bg-green-50 text-green-700 border-green-200",
      icon: CheckCircle2,
    },
    failed: {
      label: "Failed",
      className: "bg-red-50 text-red-700 border-red-200",
      icon: XCircle,
    },
    pending: {
      label: "Pending",
      className: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Clock,
    },
    unassigned: {
      label: "Unassigned",
      className: "bg-slate-50 text-slate-600 border-slate-200",
      icon: AlertCircle,
    },
  };

  const { label, className, icon: Icon } = config[status];

  return (
    <Badge variant="outline" className={cn("gap-1", className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

export function LeadDeliveryHealthCheck() {
  const queryClient = useQueryClient();
  const [isResending, setIsResending] = useState<string | null>(null);

  // Fetch recent leads with delivery info
  const { data: recentLeads = [], isLoading } = useQuery({
    queryKey: ["admin-lead-delivery-health"],
    queryFn: async (): Promise<LeadDeliveryRecord[]> => {
      // Get recent leads with facility info
      const { data: leads, error } = await supabase
        .from("leads")
        .select(`
          id,
          name,
          email,
          phone,
          created_at,
          facility_id,
          assignment_status,
          assignment_reason,
          qualified,
          exclusivity
        `)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      // Get facility names for assigned leads
      const facilityIds = [...new Set(leads?.filter(l => l.facility_id).map(l => l.facility_id) || [])];
      
      let facilityMap = new Map<string, string>();
      if (facilityIds.length > 0) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name")
          .in("id", facilityIds);
        
        facilities?.forEach(f => facilityMap.set(f.id, f.name));
      }

      return (leads || []).map(lead => ({
        id: lead.id,
        lead_id: lead.id,
        lead_name: lead.name,
        lead_email: lead.email,
        lead_phone: lead.phone,
        created_at: lead.created_at,
        facility_id: lead.facility_id,
        facility_name: lead.facility_id ? facilityMap.get(lead.facility_id) || "Unknown" : null,
        assignment_status: lead.assignment_status,
        assignment_reason: lead.assignment_reason,
        qualified: lead.qualified,
        exclusivity: lead.exclusivity,
      }));
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  // Calculate health stats
  const healthStats: HealthStats = recentLeads.reduce(
    (acc, lead) => {
      const status = getDeliveryStatus(lead);
      acc.total++;
      if (status === "delivered") acc.delivered++;
      else if (status === "failed") acc.failed++;
      else if (status === "pending") acc.pending++;
      return acc;
    },
    { total: 0, delivered: 0, failed: 0, pending: 0, deliveryRate: 0 }
  );
  healthStats.deliveryRate = healthStats.total > 0 
    ? Math.round((healthStats.delivered / healthStats.total) * 100) 
    : 0;

  // Re-route mutation
  const rerouteMutation = useMutation({
    mutationFn: async (leadId: string) => {
      // Call the reroute function
      const { data, error } = await supabase.functions.invoke("reroute-stale-leads", {
        body: { leadId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Lead re-routed successfully");
      queryClient.invalidateQueries({ queryKey: ["admin-lead-delivery-health"] });
    },
    onError: (error) => {
      toast.error(`Failed to re-route: ${error.message}`);
    },
  });

  const handleReroute = async (leadId: string) => {
    setIsResending(leadId);
    try {
      await rerouteMutation.mutateAsync(leadId);
    } finally {
      setIsResending(null);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Send className="h-5 w-5 text-primary" />
              Lead Delivery Health
            </CardTitle>
            <CardDescription>
              Monitor lead delivery status and troubleshoot failures
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ["admin-lead-delivery-health"] })}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border bg-card p-3 text-center">
            <div className="text-2xl font-bold text-foreground">{healthStats.total}</div>
            <div className="text-xs text-muted-foreground">Total (Last 50)</div>
          </div>
          <div className="rounded-lg border bg-green-50 dark:bg-green-950/20 p-3 text-center">
            <div className="text-2xl font-bold text-green-700 dark:text-green-400">
              {healthStats.delivered}
            </div>
            <div className="text-xs text-green-600 dark:text-green-500">Delivered</div>
          </div>
          <div className="rounded-lg border bg-red-50 dark:bg-red-950/20 p-3 text-center">
            <div className="text-2xl font-bold text-red-700 dark:text-red-400">
              {healthStats.failed}
            </div>
            <div className="text-xs text-red-600 dark:text-red-500">Failed</div>
          </div>
          <div className="rounded-lg border bg-primary/5 p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <TrendingUp className="h-5 w-5 text-primary" />
              <span className="text-2xl font-bold text-primary">{healthStats.deliveryRate}%</span>
            </div>
            <div className="text-xs text-muted-foreground">Delivery Rate</div>
          </div>
        </div>

        {/* Recent Leads Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Provider</TableHead>
                <TableHead className="hidden lg:table-cell">Reason</TableHead>
                <TableHead className="hidden sm:table-cell">Time</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : recentLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No leads found
                  </TableCell>
                </TableRow>
              ) : (
                recentLeads.slice(0, 10).map((lead) => {
                  const status = getDeliveryStatus(lead);
                  return (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{lead.lead_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{lead.lead_email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {lead.facility_name ? (
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm truncate max-w-[150px]">{lead.facility_name}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {lead.assignment_reason ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-xs text-muted-foreground truncate max-w-[180px] block cursor-help">
                                  {lead.assignment_reason.slice(0, 40)}...
                                </span>
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <p>{lead.assignment_reason}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {(status === "failed" || status === "unassigned") && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReroute(lead.id)}
                            disabled={isResending === lead.id}
                            className="h-7 px-2 text-xs gap-1"
                          >
                            {isResending === lead.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <RefreshCw className="h-3 w-3" />
                            )}
                            Re-route
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
