import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  Building2,
  Users,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: string;
  featured: boolean;
  logo_url: string | null;
  created_at: string;
};

export default function AdminSubscriptions() {
  // Fetch all facilities with their status
  const { data: facilities, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Facility[];
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

  // Simple plan determination based on featured flag
  const getPlanInfo = (facility: Facility) => {
    if (facility.featured) {
      return { plan: "Featured", leadLimit: 75, color: "bg-amber-100 text-amber-800" };
    }
    // In a real implementation, this would check Stripe subscription
    return { plan: "Basic", leadLimit: 4, color: "bg-slate-100 text-slate-800" };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Subscriptions</h1>
        <p className="text-muted-foreground">View provider subscription status and lead usage</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{facilities?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Featured Providers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {facilities?.filter((f) => f.featured).length || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active This Month</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(leadCounts || {}).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            All Subscriptions
          </CardTitle>
          <CardDescription>
            Provider subscription status and lead usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : facilities && facilities.length > 0 ? (
            <div className="space-y-2">
              {facilities.map((facility) => {
                const planInfo = getPlanInfo(facility);
                const leadsUsed = leadCounts?.[facility.id] || 0;

                return (
                  <div
                    key={facility.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-lg border bg-background gap-4"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={facility.logo_url || undefined} />
                        <AvatarFallback className="bg-slate-100 text-slate-600">
                          {facility.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{facility.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {facility.city}, {facility.state}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-4">
                      <Badge className={planInfo.color}>{planInfo.plan}</Badge>

                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {leadsUsed} / {planInfo.leadLimit} leads
                        </span>
                      </div>

                      <Badge
                        variant={facility.status === "approved" ? "default" : "secondary"}
                      >
                        {facility.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No subscriptions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
