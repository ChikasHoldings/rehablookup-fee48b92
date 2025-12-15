import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Building2,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Search,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Calendar,
  ChevronUp,
  ChevronDown,
  Minus,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { PLAN_DETAILS } from "@/hooks/useSubscription";

type SubscriptionStats = {
  total_subscriptions: number;
  active_subscriptions: number;
  professional_count: number;
  featured_count: number;
  basic_count: number;
  mrr: number;
  mrr_growth: number;
  new_last_30_days: number;
  canceled_last_30_days: number;
  churn_rate: number;
  subscriptions: Array<{
    customer_id: string;
    customer_email: string;
    customer_name: string;
    plan: string;
    status: string;
    current_period_end: string;
    created: string;
    cancel_at_period_end: boolean;
    monthly_amount: number;
  }>;
  recent_events: Array<{
    type: "upgrade" | "downgrade" | "canceled" | "new";
    customer_email: string;
    from_plan?: string;
    to_plan?: string;
    date: string;
  }>;
};

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  featured: boolean;
  logo_url: string | null;
  created_at: string;
  user_id: string;
};

type Profile = {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
};

// Plan badge component
function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { label: string; className: string }> = {
    basic: { label: "Basic", className: "bg-slate-100 text-slate-700 border-slate-200" },
    professional: { label: "Professional", className: "bg-blue-100 text-blue-700 border-blue-200" },
    featured: { label: "Featured", className: "bg-amber-100 text-amber-700 border-amber-200" },
  };

  const { label, className } = config[plan] || { label: plan, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Status badge component
function StatusBadge({ status, cancelAtPeriodEnd }: { status: string; cancelAtPeriodEnd?: boolean }) {
  if (cancelAtPeriodEnd) {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
        Canceling
      </Badge>
    );
  }

  const config: Record<string, { label: string; className: string }> = {
    active: { label: "Active", className: "bg-green-50 text-green-700 border-green-200" },
    canceled: { label: "Canceled", className: "bg-red-50 text-red-700 border-red-200" },
    past_due: { label: "Past Due", className: "bg-red-50 text-red-700 border-red-200" },
    trialing: { label: "Trial", className: "bg-purple-50 text-purple-700 border-purple-200" },
    incomplete: { label: "Incomplete", className: "bg-slate-50 text-slate-600 border-slate-200" },
  };

  const { label, className } = config[status] || { label: status, className: "bg-muted text-muted-foreground" };

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// Event type icon
function EventIcon({ type }: { type: string }) {
  switch (type) {
    case "upgrade":
      return <ChevronUp className="h-4 w-4 text-green-500" />;
    case "downgrade":
      return <ChevronDown className="h-4 w-4 text-amber-500" />;
    case "canceled":
      return <Minus className="h-4 w-4 text-red-500" />;
    case "new":
      return <ArrowUpRight className="h-4 w-4 text-blue-500" />;
    default:
      return null;
  }
}

export default function AdminSubscriptions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch subscription stats from Stripe
  const { data: stripeStats, isLoading: isLoadingStripe, refetch } = useQuery({
    queryKey: ["admin-subscription-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-revenue-stats");
      if (error) throw error;
      return data as SubscriptionStats;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch all facilities
  const { data: facilities, isLoading: isLoadingFacilities } = useQuery({
    queryKey: ["admin-subscriptions-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch profiles to map emails
  const { data: profiles } = useQuery({
    queryKey: ["admin-subscriptions-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, email, first_name, last_name");
      if (error) throw error;
      return data as Profile[];
    },
  });

  // Fetch lead counts
  const { data: leadCounts } = useQuery({
    queryKey: ["admin-subscription-lead-counts"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("leads")
        .select("facility_id")
        .gte("created_at", startOfMonth.toISOString());

      const counts: Record<string, number> = {};
      data?.forEach((lead) => {
        if (lead.facility_id) {
          counts[lead.facility_id] = (counts[lead.facility_id] || 0) + 1;
        }
      });
      return counts;
    },
  });

  // Map email to profile
  const emailToProfile = useMemo(() => {
    const map: Record<string, Profile> = {};
    profiles?.forEach((p) => {
      map[p.email.toLowerCase()] = p;
    });
    return map;
  }, [profiles]);

  // Map user_id to facility
  const userToFacility = useMemo(() => {
    const map: Record<string, Facility> = {};
    facilities?.forEach((f) => {
      map[f.user_id] = f;
    });
    return map;
  }, [facilities]);

  // Combine subscription data with facility data
  const enrichedSubscriptions = useMemo(() => {
    if (!stripeStats?.subscriptions) return [];

    return stripeStats.subscriptions.map((sub) => {
      const profile = emailToProfile[sub.customer_email.toLowerCase()];
      const facility = profile ? userToFacility[profile.user_id] : null;
      const leadsUsed = facility ? (leadCounts?.[facility.id] || 0) : 0;
      const planDetails = PLAN_DETAILS[sub.plan as keyof typeof PLAN_DETAILS];

      return {
        ...sub,
        facility_name: facility?.name || "No facility",
        facility_city: facility?.city,
        facility_state: facility?.state,
        leads_used: leadsUsed,
        lead_limit: planDetails?.qualified_lead_limit || 4,
      };
    });
  }, [stripeStats?.subscriptions, emailToProfile, userToFacility, leadCounts]);

  // Filter subscriptions
  const filteredSubscriptions = useMemo(() => {
    return enrichedSubscriptions.filter((sub) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = sub.facility_name.toLowerCase().includes(query);
        const matchesEmail = sub.customer_email.toLowerCase().includes(query);
        if (!matchesName && !matchesEmail) return false;
      }

      // Plan filter
      if (planFilter !== "all" && sub.plan !== planFilter) return false;

      // Status filter
      if (statusFilter === "active" && sub.status !== "active") return false;
      if (statusFilter === "canceled" && sub.status !== "canceled") return false;
      if (statusFilter === "canceling" && !sub.cancel_at_period_end) return false;
      if (statusFilter === "past_due" && sub.status !== "past_due") return false;

      return true;
    });
  }, [enrichedSubscriptions, searchQuery, planFilter, statusFilter]);

  const isLoading = isLoadingStripe || isLoadingFacilities;

  // Calculate plan distribution for visual indicator
  const planDistribution = useMemo(() => {
    if (!stripeStats) return { basic: 0, professional: 0, featured: 0 };
    const total = stripeStats.active_subscriptions || 1;
    return {
      basic: Math.round((stripeStats.basic_count / total) * 100),
      professional: Math.round((stripeStats.professional_count / total) * 100),
      featured: Math.round((stripeStats.featured_count / total) * 100),
    };
  }, [stripeStats]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Subscriptions</h1>
          <p className="text-muted-foreground">Monitor revenue, plan distribution, and churn</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoadingStripe}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingStripe ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Revenue Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Monthly Revenue</p>
                <p className="text-2xl font-bold">
                  ${stripeStats?.mrr?.toLocaleString() || "0"}
                </p>
              </div>
              <div className={`flex items-center gap-1 text-sm ${(stripeStats?.mrr_growth || 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {(stripeStats?.mrr_growth || 0) >= 0 ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
                {stripeStats?.mrr_growth || 0}%
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Subscriptions</p>
                <p className="text-2xl font-bold">{stripeStats?.active_subscriptions || 0}</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-green-600">
                <ArrowUpRight className="h-4 w-4" />
                +{stripeStats?.new_last_30_days || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Churn Rate (30d)</p>
                <p className="text-2xl font-bold">{stripeStats?.churn_rate || 0}%</p>
              </div>
              <div className="flex items-center gap-1 text-sm text-red-600">
                <ArrowDownRight className="h-4 w-4" />
                {stripeStats?.canceled_last_30_days || 0}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">At-Risk</p>
                <p className="text-2xl font-bold">
                  {enrichedSubscriptions.filter((s) => s.cancel_at_period_end).length}
                </p>
              </div>
              <AlertTriangle className="h-5 w-5 text-amber-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Plan Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Basic</span>
                <span className="text-sm text-muted-foreground">{stripeStats?.basic_count || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-slate-400 rounded-full transition-all duration-500"
                  style={{ width: `${planDistribution.basic}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Professional</span>
                <span className="text-sm text-muted-foreground">{stripeStats?.professional_count || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 rounded-full transition-all duration-500"
                  style={{ width: `${planDistribution.professional}%` }}
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Featured</span>
                <span className="text-sm text-muted-foreground">{stripeStats?.featured_count || 0}</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 rounded-full transition-all duration-500"
                  style={{ width: `${planDistribution.featured}%` }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Activity */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <CardDescription>Upgrades, downgrades & cancellations</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : stripeStats?.recent_events && stripeStats.recent_events.length > 0 ? (
              <div className="space-y-3">
                {stripeStats.recent_events.slice(0, 8).map((event, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="mt-0.5">
                      <EventIcon type={event.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{event.customer_email}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.type === "new" && `Subscribed to ${event.to_plan}`}
                        {event.type === "canceled" && `Canceled ${event.from_plan}`}
                        {event.type === "upgrade" && `Upgraded to ${event.to_plan}`}
                        {event.type === "downgrade" && `Downgraded to ${event.to_plan}`}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(event.date), { addSuffix: true })}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-sm text-muted-foreground">No recent activity</p>
            )}
          </CardContent>
        </Card>

        {/* Subscriptions Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Subscriptions
                </CardTitle>
                <CardDescription>
                  {filteredSubscriptions.length} of {enrichedSubscriptions.length} providers
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="canceling">Canceling</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredSubscriptions.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Provider</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead>Revenue</TableHead>
                      <TableHead>Renews</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubscriptions.map((sub) => (
                      <TableRow key={sub.customer_id}>
                        <TableCell>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[200px]">{sub.facility_name}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {sub.customer_email}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <PlanBadge plan={sub.plan} />
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={sub.status} cancelAtPeriodEnd={sub.cancel_at_period_end} />
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div 
                                      className={`h-full rounded-full transition-all ${
                                        sub.leads_used >= sub.lead_limit ? "bg-red-500" : 
                                        sub.leads_used >= sub.lead_limit * 0.8 ? "bg-amber-500" : "bg-green-500"
                                      }`}
                                      style={{ width: `${Math.min((sub.leads_used / sub.lead_limit) * 100, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {sub.leads_used}/{sub.lead_limit}
                                  </span>
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{sub.leads_used} of {sub.lead_limit} leads used this month</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">${sub.monthly_amount}</span>
                          <span className="text-muted-foreground">/mo</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {format(new Date(sub.current_period_end), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
