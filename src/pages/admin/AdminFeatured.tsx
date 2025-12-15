import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  GripVertical,
  Eye,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
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
};

export default function AdminFeatured() {
  const queryClient = useQueryClient();

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

  // Toggle featured mutation
  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase
        .from("facilities")
        .update({ featured })
        .eq("id", id);
      if (error) throw error;

      // Log admin action
      const { data: { user } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: user?.id,
        action_type: featured ? "featured" : "unfeatured",
        target_type: "facility",
        target_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-facilities"] });
      queryClient.invalidateQueries({ queryKey: ["admin-eligible-featured"] });
      toast.success("Featured status updated");
    },
    onError: () => {
      toast.error("Failed to update featured status");
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Featured Placement</h1>
        <p className="text-muted-foreground">
          Manage which providers appear in featured sections
        </p>
      </div>

      {/* Currently Featured */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
            Currently Featured ({featuredFacilities?.length || 0})
          </CardTitle>
          <CardDescription>
            These providers appear in the featured section on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingFeatured ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : featuredFacilities && featuredFacilities.length > 0 ? (
            <div className="space-y-2">
              {featuredFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-amber-50 border-amber-200"
                >
                  <div className="flex items-center gap-4">
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={facility.logo_url || undefined} />
                      <AvatarFallback className="bg-amber-100 text-amber-800">
                        {facility.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{facility.name}</p>
                        {facility.verified && (
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {facility.city}, {facility.state}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleFeatured.mutate({ id: facility.id, featured: false })
                      }
                    >
                      <ToggleRight className="h-4 w-4 mr-2 text-amber-500" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Star className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>No featured providers yet</p>
              <p className="text-sm">Add providers from the eligible list below</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eligible for Featured */}
      <Card>
        <CardHeader>
          <CardTitle>Eligible for Featured</CardTitle>
          <CardDescription>
            Approved providers that can be added to featured placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingEligible ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : eligibleFacilities && eligibleFacilities.length > 0 ? (
            <div className="space-y-2">
              {eligibleFacilities.map((facility) => (
                <div
                  key={facility.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-background"
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
                          <Badge variant="outline" className="text-blue-600 border-blue-200">
                            Verified
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {facility.city}, {facility.state}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      toggleFeatured.mutate({ id: facility.id, featured: true })
                    }
                  >
                    <ToggleLeft className="h-4 w-4 mr-2" />
                    Add to Featured
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No eligible providers available
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview
          </CardTitle>
          <CardDescription>
            How featured providers will appear on the homepage
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {featuredFacilities?.slice(0, 3).map((facility) => (
              <div
                key={facility.id}
                className="p-4 rounded-lg border bg-gradient-to-br from-amber-50 to-white"
              >
                <div className="flex items-center gap-3 mb-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={facility.logo_url || undefined} />
                    <AvatarFallback className="bg-amber-100 text-amber-800 text-sm">
                      {facility.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{facility.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {facility.city}, {facility.state}
                    </p>
                  </div>
                </div>
                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                  <Star className="h-3 w-3 mr-1 fill-amber-500 text-amber-500" />
                  Featured
                </Badge>
              </div>
            ))}
            {(!featuredFacilities || featuredFacilities.length === 0) && (
              <div className="col-span-3 text-center py-8 text-muted-foreground">
                Add featured providers to see a preview
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
