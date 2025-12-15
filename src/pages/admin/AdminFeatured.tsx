import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  GripVertical,
  Eye,
  Search,
  MapPin,
  Shield,
  TrendingUp,
  Users,
  ExternalLink,
  Plus,
  X,
  ArrowUpDown,
  CheckCircle2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
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
};

type FacilityStats = {
  facility_id: string;
  total_views: number;
  total_leads: number;
};

export default function AdminFeatured() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch featured facilities
  const { data: featuredFacilities, isLoading: loadingFeatured } = useQuery({
    queryKey: ["admin-featured-facilities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("featured", true)
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch eligible facilities (approved but not featured)
  const { data: eligibleFacilities, isLoading: loadingEligible } = useQuery({
    queryKey: ["admin-eligible-featured"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("*")
        .eq("featured", false)
        .eq("status", "approved")
        .order("name");
      if (error) throw error;
      return data as Facility[];
    },
  });

  // Fetch stats for all facilities
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

  // Toggle featured mutation
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured })
        .eq("id", id);
      if (error) throw error;

      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: featured ? "featured" : "unfeatured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-eligible-featured"] });
      toast.success(variables.featured ? "Provider added to featured" : "Provider removed from featured");
    },
    onError: () => {
      toast.error("Failed to update featured status");
    },
  });

  // Filter eligible facilities by search
  const filteredEligible = eligibleFacilities?.filter((f) =>
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStats = (facilityId: string) => facilityStats?.[facilityId] || { total_views: 0, total_leads: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Featured Placement</h1>
          <p className="text-muted-foreground">
            Manage which providers appear in featured sections across the platform
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="px-3 py-1.5 text-amber-700 bg-amber-50 border-amber-200">
            <Star className="h-3.5 w-3.5 mr-1.5 fill-amber-500 text-amber-500" />
            {featuredFacilities?.length || 0} Featured
          </Badge>
          <Badge variant="outline" className="px-3 py-1.5">
            <Users className="h-3.5 w-3.5 mr-1.5" />
            {eligibleFacilities?.length || 0} Eligible
          </Badge>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Featured Providers</p>
                <p className="text-3xl font-bold text-amber-900">{featuredFacilities?.length || 0}</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-200 flex items-center justify-center">
                <Star className="h-6 w-6 text-amber-700 fill-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Verified Featured</p>
                <p className="text-3xl font-bold">
                  {featuredFacilities?.filter(f => f.verified).length || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Shield className="h-6 w-6 text-blue-600" />
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
                  {featuredFacilities?.reduce((sum, f) => sum + (getStats(f.id).total_views), 0).toLocaleString() || 0}
                </p>
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
                <p className="text-sm font-medium text-muted-foreground">Featured Leads (30d)</p>
                <p className="text-3xl font-bold">
                  {featuredFacilities?.reduce((sum, f) => sum + (getStats(f.id).total_leads), 0) || 0}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Featured */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Star className="h-5 w-5 text-amber-600 fill-amber-500" />
              </div>
              <div>
                <CardTitle>Currently Featured</CardTitle>
                <CardDescription>
                  These providers appear prominently across the platform
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled>
              <ArrowUpDown className="h-4 w-4 mr-2" />
              Reorder
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFeatured ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : featuredFacilities && featuredFacilities.length > 0 ? (
            <div className="space-y-3">
              {featuredFacilities.map((facility, index) => {
                const stats = getStats(facility.id);
                return (
                  <div
                    key={facility.id}
                    className="flex items-center justify-between p-4 rounded-xl border-2 border-amber-200 bg-gradient-to-r from-amber-50 to-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-amber-400 cursor-grab" />
                        <span className="text-sm font-medium text-amber-600 w-6">#{index + 1}</span>
                      </div>
                      <Avatar className="h-12 w-12 border-2 border-amber-200">
                        <AvatarImage src={facility.logo_url || undefined} />
                        <AvatarFallback className="bg-amber-100 text-amber-800 font-semibold">
                          {facility.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-foreground">{facility.name}</p>
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
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <a href={`/center/${facility.slug}`} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => toggleFeatured.mutate({ id: facility.id, featured: false })}
                        disabled={toggleFeatured.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted/30 rounded-xl border-2 border-dashed">
              <Star className="h-12 w-12 mx-auto mb-3 text-amber-300" />
              <p className="font-medium text-foreground">No featured providers yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add providers from the eligible list below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible for Featured */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <CardTitle>Eligible Providers</CardTitle>
                <CardDescription>
                  Approved providers that can be added to featured placement
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
          {loadingEligible ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredEligible && filteredEligible.length > 0 ? (
            <div className="space-y-2">
              {filteredEligible.slice(0, 10).map((facility) => {
                const stats = getStats(facility.id);
                return (
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{facility.name}</p>
                          {facility.verified && (
                            <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-sm text-muted-foreground">
                            {facility.city}, {facility.state}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {stats.total_views} views • {stats.total_leads} leads
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => toggleFeatured.mutate({ id: facility.id, featured: true })}
                      disabled={toggleFeatured.isPending}
                      className="bg-amber-500 hover:bg-amber-600 text-white"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Featured
                    </Button>
                  </div>
                );
              })}
              {filteredEligible.length > 10 && (
                <p className="text-sm text-muted-foreground text-center py-2">
                  Showing 10 of {filteredEligible.length} providers. Use search to find more.
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
              No eligible providers available
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
                How featured providers will appear on the public homepage
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-6 border">
            <h3 className="text-lg font-semibold text-center mb-6">Featured Treatment Centers</h3>
            <div className="grid gap-4 md:grid-cols-3">
              {featuredFacilities?.slice(0, 3).map((facility) => (
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
                  <div className="flex items-center gap-2">
                    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-xs">
                      <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                      Featured
                    </Badge>
                    {facility.verified && (
                      <Badge variant="outline" className="text-blue-600 border-blue-200 text-xs">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
              {(!featuredFacilities || featuredFacilities.length === 0) && (
                <div className="col-span-3 text-center py-12 text-muted-foreground">
                  <Star className="h-10 w-10 mx-auto mb-2 text-amber-200" />
                  <p>Add featured providers to see a preview</p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
