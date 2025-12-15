import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Eye,
  Search,
  MapPin,
  Shield,
  TrendingUp,
  Users,
  ExternalLink,
  Pin,
  PinOff,
  CheckCircle2,
  Info,
  RefreshCw,
  Crown,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

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

export default function AdminFeatured() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch all approved facilities for featured eligibility display
  const { data: allFacilities, isLoading: loadingFacilities, refetch } = useQuery({
    queryKey: ["admin-all-facilities-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch auto-featured facility IDs from edge function
  const { data: featuredData, isLoading: loadingFeaturedIds } = useQuery({
    queryKey: ["admin-auto-featured-ids"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("get-featured-facilities");
      if (error) throw error;
      return {
        featuredFacilityIds: data?.featuredFacilityIds || [],
        homepageFeaturedIds: data?.homepageFeaturedIds || [],
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  const autoFeaturedIds = featuredData?.featuredFacilityIds || [];
  const homepageFeaturedIds = featuredData?.homepageFeaturedIds || [];

  // Auto-featured facilities (from Featured plan subscription)
  const autoFeaturedFacilities = allFacilities?.filter(f => autoFeaturedIds.includes(f.id)) || [];
  
  // Legacy featured (manually set, not from subscription)
  const legacyFeaturedFacilities = allFacilities?.filter(
    f => f.featured && !autoFeaturedIds.includes(f.id)
  ) || [];

  // Eligible for legacy featuring (approved, not suspended, not already featured)
  const eligibleFacilities = allFacilities?.filter(
    f => !f.featured && !autoFeaturedIds.includes(f.id) && !f.suspended
  ) || [];

  // Fetch stats for facilities
  const { data: facilityStats } = useQuery({
    queryKey: ["admin-facility-stats"],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateStr = thirtyDaysAgo.toISOString().split("T")[0];

      const [viewsRes, leadsRes] = await Promise.all([
        supabase
          .from("facility_views")
          .select("facility_id, view_count")
          .gte("view_date", dateStr),
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
        stats[v.facility_id].total_views += v.view_count;
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

  // Toggle pinned status
  const togglePinned = useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured_pinned: pinned })
        .eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: pinned ? "pinned_featured" : "unpinned_featured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
      queryClient.invalidateQueries({ queryKey: ["admin-auto-featured-ids"] });
      toast.success(variables.pinned ? "Provider pinned to featured" : "Provider unpinned");
    },
    onError: () => {
      toast.error("Failed to update pinned status");
    },
  });

  // Toggle legacy featured
  const toggleLegacyFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured })
        .eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: featured ? "legacy_featured" : "legacy_unfeatured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-all-facilities-featured"] });
      toast.success(variables.featured ? "Provider added to legacy featured" : "Provider removed from featured");
    },
    onError: () => {
      toast.error("Failed to update featured status");
    },
  });

  const filteredEligible = eligibleFacilities.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStats = (facilityId: string) => facilityStats?.[facilityId] || { total_views: 0, total_leads: 0 };

  const isLoading = loadingFacilities || loadingFeaturedIds;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Featured Placement</h1>
          <p className="text-muted-foreground">
            Auto-featured rotation for Featured plan subscribers + legacy manual featuring
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Badge variant="outline" className="px-3 py-1.5 text-amber-700 bg-amber-50 border-amber-200">
            <Crown className="h-3.5 w-3.5 mr-1.5" />
            {autoFeaturedFacilities.length} Auto-Featured
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-current" />
            {legacyFeaturedFacilities.length} Legacy
          </Badge>
        </div>
      </div>

      {/* Info Alert */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800">
          <strong>Auto-Featured System:</strong> Providers on the Featured plan ($899/mo) are automatically 
          featured and rotated daily. Homepage shows max 6 at a time. Pinned providers always appear.
          Featured providers appear first in all search results.
        </AlertDescription>
      </Alert>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Auto-Featured</p>
                <p className="text-3xl font-bold text-amber-900">{autoFeaturedFacilities.length}</p>
                <p className="text-xs text-amber-600 mt-1">Featured Plan subscribers</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                <Zap className="h-6 w-6 text-amber-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Homepage Display</p>
                <p className="text-3xl font-bold">{homepageFeaturedIds.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Max 6, rotates daily</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Eye className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pinned</p>
                <p className="text-3xl font-bold">
                  {autoFeaturedFacilities.filter(f => f.featured_pinned).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Always shown on homepage</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <Pin className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Featured Views (30d)</p>
                <p className="text-3xl font-bold">
                  {autoFeaturedFacilities.reduce((sum, f) => sum + (getStats(f.id).total_views), 0).toLocaleString()}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Auto-Featured Providers (Featured Plan) */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Zap className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                Auto-Featured Providers
                <Badge className="bg-amber-100 text-amber-800 border-amber-200">Featured Plan</Badge>
              </CardTitle>
              <CardDescription>
                Automatically featured based on active Featured plan subscription. Rotates daily on homepage.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : autoFeaturedFacilities.length > 0 ? (
            <div className="space-y-3">
              {autoFeaturedFacilities.map((facility) => {
                const stats = getStats(facility.id);
                const isOnHomepage = homepageFeaturedIds.includes(facility.id);
                return (
                  <div
                    key={facility.id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-shadow ${
                      facility.featured_pinned 
                        ? "border-purple-300 bg-gradient-to-r from-purple-50 to-white" 
                        : "border-amber-200 bg-gradient-to-r from-amber-50 to-white"
                    } hover:shadow-md`}
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-amber-200">
                        <AvatarImage src={facility.logo_url || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
                          {facility.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground">{facility.name}</p>
                          {facility.featured_pinned && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                          {isOnHomepage && (
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                              <Eye className="h-3 w-3 mr-1" />
                              On Homepage
                            </Badge>
                          )}
                          {facility.verified && (
                            <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {facility.city}, {facility.state}
                          </span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-green-600 font-medium">
                            {stats.total_views.toLocaleString()} views
                          </span>
                          <span className="text-sm text-muted-foreground">•</span>
                          <span className="text-sm text-purple-600 font-medium">
                            {stats.total_leads} leads
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {facility.slug && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant={facility.featured_pinned ? "default" : "outline"}
                              size="sm"
                              className={facility.featured_pinned ? "bg-purple-600 hover:bg-purple-700" : ""}
                              onClick={() => togglePinned.mutate({ 
                                id: facility.id, 
                                pinned: !facility.featured_pinned 
                              })}
                              disabled={togglePinned.isPending}
                            >
                              {facility.featured_pinned ? (
                                <>
                                  <PinOff className="h-4 w-4 mr-1" />
                                  Unpin
                                </>
                              ) : (
                                <>
                                  <Pin className="h-4 w-4 mr-1" />
                                  Pin
                                </>
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {facility.featured_pinned 
                              ? "Remove from always-shown list" 
                              : "Always show on homepage (bypass rotation)"}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
              <Zap className="h-12 w-12 mx-auto mb-3 text-amber-300" />
              <p className="font-medium text-foreground">No Featured Plan subscribers</p>
              <p className="text-sm text-muted-foreground mt-1">
                Providers on the Featured plan will appear here automatically
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legacy Featured (Manual) */}
      {legacyFeaturedFacilities.length > 0 && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-slate-600 fill-slate-400" />
              </div>
              <div>
                <CardTitle>Legacy Featured</CardTitle>
                <CardDescription>
                  Manually featured providers (not from subscription). Consider migrating to Featured plan.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {legacyFeaturedFacilities.map((facility) => {
                const stats = getStats(facility.id);
                return (
                  <div
                    key={facility.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
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
                          {facility.city}, {facility.state} • {stats.total_views} views
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleLegacyFeatured.mutate({ id: facility.id, featured: false })}
                      disabled={toggleLegacyFeatured.isPending}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Legacy Featured */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Add Legacy Featured</CardTitle>
                <CardDescription>
                  Manually feature providers (for providers not on Featured plan)
                </CardDescription>
              </div>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEligible.length > 0 ? (
            <div className="space-y-2">
              {filteredEligible.slice(0, 10).map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background hover:bg-muted/30 transition-colors"
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleLegacyFeatured.mutate({ id: facility.id, featured: true })}
                    disabled={toggleLegacyFeatured.isPending}
                  >
                    <Star className="h-4 w-4 mr-1" />
                    Feature
                  </Button>
                </div>
              ))}
              {filteredEligible.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing 10 of {filteredEligible.length} providers
                </p>
              )}
            </div>
          ) : searchQuery ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No providers match "{searchQuery}"</p>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              All providers are either featured or on Featured plan
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
              <Eye className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <CardTitle>Homepage Preview</CardTitle>
              <CardDescription>
                Current homepage featured display (max 6, rotates daily for fairness)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-center mb-6">Featured Treatment Centers</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {allFacilities?.filter(f => homepageFeaturedIds.includes(f.id)).slice(0, 6).map((facility) => (
                <div
                  key={facility.id}
                  className="p-5 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-14 w-14 border-2 border-amber-200">
                      <AvatarImage src={facility.logo_url || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
                        {facility.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{facility.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {facility.city}, {facility.state}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                      <Crown className="h-3 w-3 mr-1" />
                      Featured
                    </Badge>
                    {facility.featured_pinned && (
                      <Badge variant="outline" className="text-purple-600 border-purple-200 text-xs">
                        <Pin className="h-3 w-3 mr-1" />
                        Pinned
                      </Badge>
                    )}
                    {facility.verified && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {homepageFeaturedIds.length === 0 && (
                <div className="col-span-full text-center py-12 text-muted-foreground">
                  <Crown className="h-10 w-10 mx-auto mb-2 text-amber-200" />
                  <p>No Featured plan subscribers to display</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
