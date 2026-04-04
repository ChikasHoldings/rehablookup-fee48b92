import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Headphones,
  Users,
  MessageSquare,
  Building2,
  Clock,
  ChevronRight,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
} from "lucide-react";

export function CustomerRepDashboard() {
  const queryClient = useQueryClient();
  const { hasPermission } = useAdminAuth();

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rep-review-stats"] });
    queryClient.invalidateQueries({ queryKey: ["rep-pending-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["rep-seeker-stats"] });
    queryClient.invalidateQueries({ queryKey: ["rep-lead-stats"] });
    queryClient.invalidateQueries({ queryKey: ["rep-provider-stats"] });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("rep-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_reviews" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateDashboard]);

  // Fetch review stats
  const { data: reviewStats, isLoading: loadingReviews } = useQuery({
    queryKey: ["rep-review-stats"],
    queryFn: async () => {
      const [total, pending, approved, rejected] = await Promise.all([
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return {
        total: total.count || 0,
        pending: pending.count || 0,
        approved: approved.count || 0,
        rejected: rejected.count || 0,
      };
    },
  });

  // Fetch recent pending reviews
  const { data: pendingReviews, isLoading: loadingPendingReviews } = useQuery({
    queryKey: ["rep-pending-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_reviews")
        .select(`
          id,
          rating,
          review_text,
          created_at,
          facility_id,
          facilities (name)
        `)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // Fetch seeker stats
  const { data: seekerStats, isLoading: loadingSeekers } = useQuery({
    queryKey: ["rep-seeker-stats"],
    queryFn: async () => {
      const [total, withInquiries] = await Promise.all([
        supabase.from("seeker_profiles").select("id", { count: "exact", head: true }),
        supabase.from("concierge_inquiries").select("user_id", { count: "exact", head: true }).not("user_id", "is", null),
      ]);
      return {
        total: total.count || 0,
        withInquiries: withInquiries.count || 0,
      };
    },
  });

  // Fetch lead stats
  const { data: leadStats, isLoading: loadingLeads } = useQuery({
    queryKey: ["rep-lead-stats"],
    queryFn: async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      const [total, todayCount, newLeads] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        supabase.from("leads").select("id", { count: "exact", head: true }).eq("status", "new"),
      ]);
      return {
        total: total.count || 0,
        today: todayCount.count || 0,
        newLeads: newLeads.count || 0,
      };
    },
  });

  // Fetch provider stats
  const { data: providerStats, isLoading: loadingProviders } = useQuery({
    queryKey: ["rep-provider-stats"],
    queryFn: async () => {
      const [total, approved] = await Promise.all([
        supabase.from("facilities").select("id", { count: "exact", head: true }),
        supabase.from("facilities").select("id", { count: "exact", head: true }).eq("status", "approved"),
      ]);
      return {
        total: total.count || 0,
        approved: approved.count || 0,
      };
    },
  });

  const pendingActionsCount = reviewStats?.pending || 0;

  function formatTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shrink-0">
          <Headphones className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Customer Support</h1>
          <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">User support, reviews moderation & lead management</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Reviews to Moderate */}
        <Card className={`border shadow-sm overflow-hidden ${pendingActionsCount > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Reviews</CardTitle>
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingReviews ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{reviewStats?.pending || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">of {reviewStats?.total} total</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Users */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Users</CardTitle>
            <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingSeekers ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{seekerStats?.total || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{seekerStats?.withInquiries} inquiries</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Leads Today */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Today's Leads</CardTitle>
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingLeads ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{leadStats?.today || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{leadStats?.total} total</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Providers */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Providers</CardTitle>
            <Building2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingProviders ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{providerStats?.approved || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{providerStats?.total} total</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Pending Reviews */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Pending Reviews</CardTitle>
                <CardDescription>Reviews awaiting moderation</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/reviews" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPendingReviews ? (
              <div className="space-y-3">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : pendingReviews && pendingReviews.length > 0 ? (
              <div className="space-y-3">
                {pendingReviews.map((review: any) => (
                  <div key={review.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 ${i < review.rating ? "fill-warning text-warning" : "text-muted-foreground"}`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{formatTimeAgo(review.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium truncate mt-1">{review.facilities?.name || "Unknown Facility"}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {review.review_text ? `${review.review_text.slice(0, 50)}...` : "No review text"}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-2 bg-warning/10 text-warning border-warning/30 text-[10px] shrink-0">
                      Pending
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">All reviews moderated!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Stats */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Review Moderation Stats</CardTitle>
            <CardDescription>All-time review decisions</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingReviews ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 sm:gap-4">
                <div className="text-center p-3 sm:p-4 rounded-lg bg-warning/10 border border-warning/20">
                  <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-warning mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-warning">{reviewStats?.pending}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Pending</div>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-success/10 border border-success/20">
                  <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-success mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-success">{reviewStats?.approved}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Approved</div>
                </div>
                <div className="text-center p-3 sm:p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                  <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-destructive mx-auto mb-1 sm:mb-2" />
                  <div className="text-xl sm:text-2xl font-bold text-destructive">{reviewStats?.rejected}</div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground">Rejected</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {hasPermission("reviews") && reviewStats?.pending && reviewStats.pending > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-warning/10" asChild>
              <Link to="/admin/reviews?status=pending">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Moderate Reviews</span>
                  <span className="text-xs text-muted-foreground">{reviewStats.pending} pending</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("seekers") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-info/10" asChild>
              <Link to="/admin/seekers">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-info mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Manage Users</span>
                  <span className="text-xs text-muted-foreground">View seeker accounts</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("leads") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-primary/10" asChild>
              <Link to="/admin/leads">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">View Leads</span>
                  <span className="text-xs text-muted-foreground">Recent inquiries</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("providers") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-muted" asChild>
              <Link to="/admin/providers">
                <Building2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Browse Providers</span>
                  <span className="text-xs text-muted-foreground">View listings</span>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
