import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Building2,
  Users,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Star,
  MapPin,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

      return Object.entries(cityCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([city, count]) => ({ city, count }));
    },
  });

  // Fetch recent leads
  const { data: recentLeads } = useQuery({
    queryKey: ["admin-recent-leads"],
    queryFn: async () => {
      const { data } = await supabase
        .from("leads")
        .select("id, name, email, created_at, facility_id, email_verified")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
        <p className="text-muted-foreground">Platform overview and key metrics</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{providerStats?.total}</div>
                <p className="text-xs text-muted-foreground">
                  {providerStats?.approved} approved, {providerStats?.pending} pending
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Leads This Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{leadStats?.totalMonth}</div>
                <p className="text-xs text-muted-foreground">
                  {leadStats?.newLeads} awaiting response
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Verification Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingLeads ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{leadStats?.verificationRate}%</div>
                <p className="text-xs text-muted-foreground">
                  Email verified leads
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Featured Providers</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingProviders ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{providerStats?.featured}</div>
                <p className="text-xs text-muted-foreground">
                  {providerStats?.verified} verified
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common administrative tasks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providerStats?.pending && providerStats.pending > 0 && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/admin/providers?status=pending">
                  <AlertCircle className="h-4 w-4 mr-2 text-amber-500" />
                  Review {providerStats.pending} pending providers
                </Link>
              </Button>
            )}
            {leadStats?.unassigned && leadStats.unassigned > 0 && (
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/admin/leads?unassigned=true">
                  <Users className="h-4 w-4 mr-2 text-blue-500" />
                  Route {leadStats.unassigned} unassigned leads
                </Link>
              </Button>
            )}
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/featured">
                <Star className="h-4 w-4 mr-2 text-amber-500" />
                Manage featured placement
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link to="/admin/subscriptions">
                <CreditCard className="h-4 w-4 mr-2 text-green-500" />
                View subscriptions
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Top Cities by Leads
            </CardTitle>
            <CardDescription>Most active locations</CardDescription>
          </CardHeader>
          <CardContent>
            {topCities && topCities.length > 0 ? (
              <div className="space-y-3">
                {topCities.map((item, index) => (
                  <div key={item.city} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-muted-foreground w-4">
                        {index + 1}.
                      </span>
                      <span className="text-sm font-medium">{item.city}</span>
                    </div>
                    <Badge variant="secondary">{item.count} leads</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No location data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Leads</CardTitle>
            <CardDescription>Latest contact requests</CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/admin/leads">View All</Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentLeads && recentLeads.length > 0 ? (
              recentLeads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center">
                      <Users className="h-4 w-4 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{lead.name}</p>
                      <p className="text-xs text-muted-foreground">{lead.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {lead.email_verified && (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                        Verified
                      </Badge>
                    )}
                    {!lead.facility_id && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        Unassigned
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No leads yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
