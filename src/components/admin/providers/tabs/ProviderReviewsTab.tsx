import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Star, Flag, CheckCircle, AlertTriangle, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import type { Facility } from "../ProviderListItem";

interface ProviderReviewsTabProps {
  provider: Facility;
  providerFacilities: Facility[];
}

export function ProviderReviewsTab({ provider, providerFacilities }: ProviderReviewsTabProps) {
  const queryClient = useQueryClient();
  const facilityIds = providerFacilities?.map((f) => f.id) || [provider.id];

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-provider-reviews", provider.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_reviews")
        .select("id, facility_id, rating, review_text, status, reviewer_display_name, helpful_count, disputed, created_at, admin_notes")
        .in("facility_id", facilityIds)
        .order("created_at", { ascending: false });
      return data || [];
    },
  });

  const updateReviewStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("facility_reviews")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-provider-reviews"] });
      toast.success("Review updated");
    },
    onError: () => toast.error("Failed to update review"),
  });

  const avgRating = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : "—";
  const approvedCount = reviews?.filter((r) => r.status === "approved").length || 0;
  const pendingCount = reviews?.filter((r) => r.status === "pending").length || 0;
  const disputedCount = reviews?.filter((r) => r.disputed).length || 0;

  const facilityName = (id: string) => providerFacilities?.find((f) => f.id === id)?.name || "—";

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold">{reviews?.length || 0}</p>
          <p className="text-xs text-muted-foreground">Total Reviews</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <div className="flex items-center justify-center gap-1">
            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
            <p className="text-2xl font-bold">{avgRating}</p>
          </div>
          <p className="text-xs text-muted-foreground">Avg Rating</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
          <p className="text-xs text-muted-foreground">Pending</p>
        </CardContent></Card>
        <Card><CardContent className="p-3 text-center">
          <p className="text-2xl font-bold text-destructive">{disputedCount}</p>
          <p className="text-xs text-muted-foreground">Disputed</p>
        </CardContent></Card>
      </div>

      {/* Review list */}
      {reviews && reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{review.reviewer_display_name || "Anonymous"}</span>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-3.5 w-3.5 ${i < review.rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    {review.disputed && (
                      <Badge variant="destructive" className="text-xs gap-1"><AlertTriangle className="h-3 w-3" />Disputed</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={`text-xs ${
                      review.status === "approved" ? "text-emerald-600" : review.status === "pending" ? "text-amber-600" : "text-destructive"
                    }`}>{review.status}</Badge>
                    <span className="text-xs text-muted-foreground">{format(new Date(review.created_at), "MMM d, yyyy")}</span>
                  </div>
                </div>

                {review.review_text && (
                  <p className="text-sm text-muted-foreground mb-2 line-clamp-3">{review.review_text}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">{facilityName(review.facility_id)} • {review.helpful_count} helpful votes</span>
                  <div className="flex gap-1.5">
                    {review.status !== "approved" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => updateReviewStatus.mutate({ id: review.id, status: "approved" })}>
                        <CheckCircle className="h-3 w-3 mr-1" />Approve
                      </Button>
                    )}
                    {review.status !== "rejected" && (
                      <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => updateReviewStatus.mutate({ id: review.id, status: "rejected" })}>
                        <Flag className="h-3 w-3 mr-1" />Reject
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">No reviews yet</p>
        </div>
      )}
    </div>
  );
}
