import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Star,
  MapPin,
  TrendingUp,
  Clock,
  ArrowUpRight,
  DollarSign,
  ShieldCheck,
  Eye,
  UserPlus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

export default function AdminDashboard() {
  // Fetch providers stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["admin-provider-stats"],
    queryFn: async () => {
      const { count: total } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true });

      const { count: approved } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("status", "approved");

      const { count: pending } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: featured } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("featured", true);

      const { count: verified } = await supabase
        .from("facilities")
        .select("*", { count: "exact", head: true })
        .eq("verified", true);

      return {
        total: total || 0,
        approved: approved || 0,
        pending: pending || 0,
        featured: featured || 0,
        verified: verified || 0,
      };
    },
  });

  // Fetch leads stats
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-lead-stats"],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: totalMonth } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte("created_at", startOfMonth.toISOString());

      const { count: totalAll } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true });

      const { count: verified } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("email_verified", true)
        .gte("created_at", startOfMonth.toISOString());

      const { count: unassigned } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .is("facility_id", null);

      const { count: newLeads } = await supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");

      return {
        totalMonth: totalMonth || 0,
        totalAll: totalAll || 0,
        verified: verified || 0,
        verificationRate: totalMonth ? Math.round(((verified || 0) / totalMonth) * 100) : 0,
        unassigned: unassigned || 0,
        newLeads: newLeads || 0,
      };
    },
  });

  // Fetch top cities
  const { data: topCities } = useQuery({
    queryKey: ["admin-top-cities"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("location_city_state")
        .not("location_city_state", "is", null)
        .limit(500);

      if (!data) return [];

      const cityCounts: Record<string, number> = {};
      data.forEach((lead) => {
        if (lead.location_city_state) {
          cityCounts[lead.location_city_state] = (cityCounts[lead.location_city_state] || 0) + 1;
        }
      });

      const sorted = Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      
      const maxCount = sorted.length > 0 ? sorted[0][1] : 1;

      return sorted.map(([city, count]) => ({ 
        city, 
        count,
        percentage: Math.round((count / maxCount) * 100)
      }));
    },
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ["admin-recent-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, created_at, facility_id, email_verified, source")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key performance metrics</p>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Revenue Card - Placeholder for future */}
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-primary-foreground/90">Monthly Revenue</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$0</div>
            <p className="text-xs text-primary-foreground/70 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Revenue tracking coming soon
            </p>
          </CardContent>
        </Card>

        {/* Total Providers */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Providers</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.total}</div>
                <div className="flex items-center gap-3 mt-2">
                  <span className="inline-flex items-center text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                    {providerStats?.approved} approved
                  </span>
                  <span className="inline-flex items-center text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">
                    {providerStats?.pending} pending
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Featured Providers */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured Providers</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center">
              <Star className="h-4 w-4 text-amber-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.featured}</div>
                <div className="flex items-center gap-2 mt-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-xs text-muted-foreground">
                    {providerStats?.verified} verified providers
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending Verification */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Review</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-orange-50 flex items-center justify-center">
              <Clock className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{providerStats?.pending}</div>
                {providerStats?.pending && providerStats.pending > 0 ? (
                  <Link 
                    to="/admin/providers?status=pending"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-2"
                  >
                    Review now <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">All caught up!</p>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Total Leads */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Leads</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.totalAll}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats?.totalMonth} this month
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Verification Rate */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Verification Rate</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.verificationRate}%</div>
                <div className="mt-2">
                  <Progress value={leadStats?.verificationRate || 0} className="h-1.5" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* New Leads */}
        <Card className="border-0 shadow-card bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Awaiting Response</CardTitle>
            <div className="h-8 w-8 rounded-lg bg-rose-50 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-rose-600" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-9 w-20" />
            ) : (
              <>
                <div className="text-3xl font-bold text-foreground">{leadStats?.newLeads}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {leadStats?.unassigned} unassigned
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <Card className="border-0 shadow-card bg-card lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {providerStats?.pending && providerStats.pending > 0 && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto py-3 px-3 hover:bg-amber-50 group"
                asChild
              >
                <Link to="/admin/providers?status=pending">
                  <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-colors">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Review Providers</span>
                    <span className="text-xs text-muted-foreground">{providerStats.pending} pending approval</span>
                  </div>
                </Link>
              </Button>
            )}
            {leadStats?.unassigned && leadStats.unassigned > 0 && (
              <Button 
                variant="ghost" 
                className="w-full justify-start h-auto py-3 px-3 hover:bg-blue-50 group"
                asChild
              >
                <Link to="/admin/leads?unassigned=true">
                  <div className="h-9 w-9 rounded-lg bg-blue-100 flex items-center justify-center mr-3 group-hover:bg-blue-200 transition-colors">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex flex-col items-start">
                    <span className="text-sm font-medium">Route Leads</span>
                    <span className="text-xs text-muted-foreground">{leadStats.unassigned} unassigned leads</span>
                  </div>
                </Link>
              </Button>
            )}
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-amber-50 group"
              asChild
            >
              <Link to="/admin/featured">
                <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center mr-3 group-hover:bg-amber-200 transition-colors">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Featured Placement</span>
                  <span className="text-xs text-muted-foreground">Manage premium listings</span>
                </div>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-emerald-50 group"
              asChild
            >
              <Link to="/admin/subscriptions">
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center mr-3 group-hover:bg-emerald-200 transition-colors">
                  <CreditCard className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Subscriptions</span>
                  <span className="text-xs text-muted-foreground">View billing & plans</span>
                </div>
              </Link>
            </Button>
            <Button 
              variant="ghost" 
              className="w-full justify-start h-auto py-3 px-3 hover:bg-violet-50 group"
              asChild
            >
              <Link to="/admin/users">
                <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center mr-3 group-hover:bg-violet-200 transition-colors">
                  <ShieldCheck className="h-4 w-4 text-violet-600" />
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">User Management</span>
                  <span className="text-xs text-muted-foreground">Manage roles & access</span>
                </div>
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="border-0 shadow-card bg-card lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <MapPin className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold">Top Cities by Leads</CardTitle>
                <CardDescription>Geographic distribution of inquiries</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {topCities && topCities.length > 0 ? (
              <div className="space-y-4">
                {topCities.map((item, index) => (
                  <div key={item.city} className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-secondary text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium truncate">{item.city}</span>
                        <span className="text-sm font-semibold text-foreground">{item.count}</span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-primary rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <MapPin className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No location data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card className="border-0 shadow-card bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-violet-100 flex items-center justify-center">
              <Users className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">Recent Leads</CardTitle>
              <CardDescription>Latest contact requests from the platform</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shadow-none" asChild>
            <Link to="/admin/leads">
              View All
              <ArrowUpRight className="h-3.5 w-3.5 ml-1.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between py-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-sm font-semibold text-primary">
                      {lead.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex items-center gap-2">
                        {lead.email_verified && (
                          <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 text-[10px] px-1.5 py-0">
                            <CheckCircle className="h-2.5 w-2.5 mr-0.5" />
                            Verified
                          </Badge>
                        )}
                        {!lead.facility_id && (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 text-[10px] px-1.5 py-0">
                            Unassigned
                          </Badge>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" />
                        {formatTimeAgo(lead.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-40" />
                <p className="text-sm">No leads yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
