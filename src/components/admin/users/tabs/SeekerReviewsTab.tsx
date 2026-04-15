import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Flag, Trash2, CheckCircle, Building2, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SeekerReviewsTabProps {
  userId: string;
}

export function SeekerReviewsTab({ userId }: SeekerReviewsTabProps) {
  const queryClient = useQueryClient();

  const { data: reviews, isLoading } = useQuery({
    queryKey: ["admin-seeker-reviews", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_reviews")
        .select("id, facility_id, rating, review_text, status, created_at, helpful_count")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      const facilityIds = [...new Set((data || []).map((r: any) => r.facility_id).filter(Boolean))];
      let facilityMap: Record<string, any> = {};
      if (facilityIds.length) {
        const { data: facilities } = await supabase
          .from("facilities")
          .select("id, name, city, state")
          .in("id", facilityIds);
        facilities?.forEach((f: any) => { facilityMap[f.id] = f; });
      }

      return (data || []).map((r: any) => ({ ...r, facility: facilityMap[r.facility_id] }));
    },
  });

  const updateReviewStatus = useMutation({
    mutationFn: async ({ reviewId, status }: { reviewId: string; status: string }) => {
      const { error } = await supabase
        .from("facility_reviews")
        .update({ status })
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-seeker-reviews", userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (isLoading) {
    return <div className="p-5 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  }

  if (!reviews?.length) {
    return (
      <div className="p-5 text-center py-16">
        <Star className="h-10 w-10 mx-auto mb-2 text-muted-foreground/30" />
        <p className="text-muted-foreground font-medium">No reviews written</p>
      </div>
    );
  }

  // Detect suspicious patterns
  const avgRating = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
  const allSameRating = reviews.length > 2 && reviews.every((r: any) => r.rating === reviews[0].rating);

  return (
    <div className="p-5 space-y-4">
      {/* Summary */}
      <div className="flex items-center gap-4 p-3 rounded-xl border bg-card">
        <div className="text-center px-4">
          <p className="text-2xl font-bold">{reviews.length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total</p>
        </div>
        <div className="text-center px-4 border-l">
          <p className="text-2xl font-bold">{avgRating.toFixed(1)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Avg Rating</p>
        </div>
        <div className="text-center px-4 border-l">
          <p className="text-2xl font-bold">{reviews.filter((r: any) => r.status === "pending").length}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Pending</p>
        </div>
        {allSameRating && (
          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 gap-1 ml-auto">
            <Flag className="h-3 w-3" />Suspicious: All same rating
          </Badge>
        )}
      </div>

      {reviews.map((review: any) => (
        <div key={review.id} className="p-4 rounded-lg border bg-card">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary flex-shrink-0" />
                <p className="font-medium truncate">{review.facility?.name || "Unknown Facility"}</p>
                {review.facility && <span className="text-xs text-muted-foreground">{review.facility.city}, {review.facility.state}</span>}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-4 w-4", i < review.rating ? "fill-warning text-warning" : "text-muted-foreground/30")} />
                  ))}
                </div>
                <Badge variant="outline" className={cn("text-xs",
                  review.status === "approved" && "bg-success/10 text-success border-success/30",
                  review.status === "pending" && "bg-warning/10 text-warning border-warning/30",
                  review.status === "rejected" && "bg-destructive/10 text-destructive border-destructive/30",
                  review.status === "flagged" && "bg-orange-500/10 text-orange-600 border-orange-500/30"
                )}>{review.status}</Badge>
              </div>
              {review.review_text && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{review.review_text}</p>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {formatDistanceToNow(new Date(review.created_at), { addSuffix: true })}
              </span>
              <div className="flex gap-1">
                {review.status === "pending" && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-success" onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "approved" })}>
                    <CheckCircle className="h-3.5 w-3.5" />
                  </Button>
                )}
                {review.status !== "flagged" && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-warning" onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "flagged" })}>
                    <Flag className="h-3.5 w-3.5" />
                  </Button>
                )}
                {review.status !== "rejected" && (
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-destructive" onClick={() => updateReviewStatus.mutate({ reviewId: review.id, status: "rejected" })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
