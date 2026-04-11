import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect } from "react";
import {
  Crown,
  Star,
  Eye,
  Users,
  RefreshCw,
  MapPin,
  Info,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FeaturedAnalyticsDashboard } from "@/components/admin/FeaturedAnalyticsDashboard";

type Facility = {
  id: string;
  name: string;
  city: string;
  state: string;
  featured: boolean;
  verified: boolean;
  logo_url: string | null;
  status: string;
  slug: string | null;
  featured_pinned: boolean | null;
  last_featured_shown_at: string | null;
  suspended: boolean | null;
};

type FacilityStats = {
  facility_id: string;
  total_views: number;
  total_leads: number;
};

export function FeaturedPlacementTab() {
  const queryClient = useQueryClient();

  const invalidateFeaturedQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["admin-featured-facilities"] });
    queryClient.invalidateQueries({ queryKey: ["admin-pro-featured-ids"] });
    queryClient.invalidateQueries({ queryKey: ["admin-featured-stats"] });
  }, [queryClient]);

  // Real-time subscriptions
  useEffect(() => {
    const facilitiesChannel = supabase
      .channel("admin-featured-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "facilities" },
        () => invalidateFeaturedQueries()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(facilitiesChannel);
    };
  }, [invalidateFeaturedQueries]);

  // Fetch all approved facilities
  const { data: allFacilities, isLoading: loadingFacilities, refetch } = useQuery({
    queryKey: ["admin-featured-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, slug, city, state, facility_type, featured, featured_pinned, featured_display_order, status, verified, logo_url, calculated_ranking_score, last_featured_shown_at, created_at, suspended")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch Pro featured facility IDs from edge function
  const { data: featuredData, isLoading: loadingFeaturedIds } = useQuery({
    queryKey: ["admin-pro-featured-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-featured-facilities");
      if (error) throw error;
      return {
        proFacilityIds: data?.proFacilityIds || [],
        homepageFeaturedIds: data?.homepageFeaturedIds || [],
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  // Fetch facility stats
  const { data: facilityStats } = useQuery({
    queryKey: ["admin-featured-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const [viewsRes, leadsRes] = await Promise.all([
        supabase
          .from("provider_events")
          .select("facility_id")
          .in("event_type", ["profile_view", "listing_impression"])
          .gte("created_at", thirtyDaysAgo.toISOString()),
        supabase
          .from("leads")
          .select("facility_id")
          .gte("created_at", thirtyDaysAgo.toISOString()),
      ]);

      const stats: Record<string, FacilityStats> = {};
      
      viewsRes.data?.forEach((v) => {
        if (!stats[v.facility_id]) {
          stats[v.facility_id] = { facility_id: v.facility_id, total_views: 0, total_leads: 0 };
        }
        stats[v.facility_id].total_views += 1;
      });

      leadsRes.data?.forEach((l) => {
        if (l.facility_id) {
          if (!stats[l.facility_id]) {
            stats[l.facility_id] = { facility_id: l.facility_id, total_views: 0, total_leads: 0 };
          }
          stats[l.facility_id].total_leads += 1;
        }
      });

      return stats;
    },
  });

  const proFacilityIds = featuredData?.proFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  // Pro subscriber facilities (auto-featured)
  const proFacilities = allFacilities?.filter(f => proFacilityIds.includes(f.id)) || [];
  
  // Calculate total stats for Pro facilities
  const totalFeaturedViews = proFacilities.reduce(
    (sum, f) => sum + (facilityStats?.[f.id]?.total_views || 0), 0
  );
  const totalFeaturedLeads = proFacilities.reduce(
    (sum, f) => sum + (facilityStats?.[f.id]?.total_leads || 0), 0
  );

  const getStats = (facilityId: string) => {
    if (!facilityId || !facilityStats) return { total_views: 0, total_leads: 0 };
    return facilityStats[facilityId] || { total_views: 0, total_leads: 0 };
  };

  const isLoading = loadingFacilities || loadingFeaturedIds;

  return (
    <div className="space-y-6">
      {/* Info Alert */}
      <Alert className="border-amber-200 bg-amber-50">
        <Info className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          <strong>Pro Members Only:</strong> Featured placement is automatically included with Pro subscription ($399/mo). 
          Pro facilities are rotated daily using a fairness algorithm to ensure equal exposure.
        </AlertDescription>
      </Alert>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pro Members</p>
                <p className="text-2xl font-bold">{proFacilities.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Crown className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">On Homepage Today</p>
                <p className="text-2xl font-bold">{homepageFeaturedIds.length}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Views (30d)</p>
                <p className="text-2xl font-bold">{totalFeaturedViews.toLocaleString()}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Eye className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Inquiries (30d)</p>
                <p className="text-2xl font-bold">{totalFeaturedLeads}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pro Members List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Pro Members (Auto-Featured)
              </CardTitle>
              <CardDescription>
                These providers are automatically featured and rotated daily
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : proFacilities.length > 0 ? (
            <div className="space-y-3">
              {proFacilities.map((facility) => {
                const stats = getStats(facility.id);
                const isOnHomepage = homepageFeaturedIds.includes(facility.id);

                return (
                  <div
                    key={facility.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                      isOnHomepage 
                        ? "border-green-300 bg-gradient-to-r from-green-50 to-white" 
                        : "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-amber-200">
                        <AvatarImage src={facility.logo_url || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-700">
                          {facility.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{facility.name}</p>
                          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
                            Pro
                          </Badge>
                          {isOnHomepage && (
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              <Star className="h-3 w-3 mr-1" />
                              On Homepage
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {facility.city}, {facility.state}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{stats.total_views.toLocaleString()}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Views (30 days)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-1.5 text-sm">
                              <Users className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{stats.total_leads}</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>Inquiries (30 days)</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      {facility.slug && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/facility/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Crown className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">No Pro subscribers yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pro members are automatically featured on the homepage
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Analytics Dashboard */}
      <FeaturedAnalyticsDashboard />
    </div>
  );
}
