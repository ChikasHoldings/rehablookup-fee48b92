import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  UserPlus,
  Users,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  ChevronRight,
  HeartHandshake,
  Calendar,
  Building2,
  AlertCircle,
} from "lucide-react";

export function AdvisorDashboard() {
  const queryClient = useQueryClient();

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["advisor-stats"] });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("advisor-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "concierge_inquiries" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "concierge_threads" }, invalidateDashboard)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [invalidateDashboard]);

  // Fetch concierge inquiry stats
  const { data: inquiryStats, isLoading: loadingInquiries } = useQuery({
    queryKey: ["advisor-inquiry-stats"],
    queryFn: async () => {
      const [total, newCases, inProgress, matched, placed] = await Promise.all([
        supabase.from("concierge_inquiries").select("*", { count: "exact", head: true }),
        supabase.from("concierge_inquiries").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("concierge_inquiries").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("concierge_inquiries").select("*", { count: "exact", head: true }).eq("status", "matched"),
        supabase.from("concierge_inquiries").select("*", { count: "exact", head: true }).eq("status", "placed"),
      ]);
      return {
        total: total.count || 0,
        newCases: newCases.count || 0,
        inProgress: inProgress.count || 0,
        matched: matched.count || 0,
        placed: placed.count || 0,
      };
    },
  });

  // Fetch recent inquiries
  const { data: recentInquiries, isLoading: loadingRecent } = useQuery({
    queryKey: ["advisor-recent-inquiries"],
    queryFn: async () => {
      const { data } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_phone, status, created_at, timeline_urgency, level_of_care")
        .in("status", ["new", "in_progress", "matched"])
        .order("created_at", { ascending: false })
        .limit(6);
      return data || [];
    },
  });

  // Fetch message stats
  const { data: messageStats, isLoading: loadingMessages } = useQuery({
    queryKey: ["advisor-message-stats"],
    queryFn: async () => {
      const { data: threads } = await supabase
        .from("concierge_threads")
        .select("id, last_message_at, admin_last_read_at");
      
      let unread = 0;
      threads?.forEach((thread) => {
        if (thread.last_message_at && thread.admin_last_read_at) {
          if (new Date(thread.last_message_at) > new Date(thread.admin_last_read_at)) {
            unread++;
          }
        } else if (thread.last_message_at && !thread.admin_last_read_at) {
          unread++;
        }
      });

      return {
        totalThreads: threads?.length || 0,
        unread,
      };
    },
  });

  // Fetch tour requests
  const { data: tourStats, isLoading: loadingTours } = useQuery({
    queryKey: ["advisor-tour-stats"],
    queryFn: async () => {
      const [pending, scheduled] = await Promise.all([
        supabase.from("concierge_tour_requests").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("concierge_tour_requests").select("*", { count: "exact", head: true }).eq("status", "scheduled"),
      ]);
      return {
        pending: pending.count || 0,
        scheduled: scheduled.count || 0,
      };
    },
  });

  const actionItemsCount = (inquiryStats?.newCases || 0) + (messageStats?.unread || 0) + (tourStats?.pending || 0);

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

  const statusConfig: Record<string, { label: string; color: string; bgColor: string }> = {
    new: { label: "New", color: "text-info", bgColor: "bg-info/10 border-info/30" },
    in_progress: { label: "In Progress", color: "text-warning", bgColor: "bg-warning/10 border-warning/30" },
    matched: { label: "Matched", color: "text-success", bgColor: "bg-success/10 border-success/30" },
    placed: { label: "Placed", color: "text-primary", bgColor: "bg-primary/10 border-primary/30" },
  };

  const placementRate = inquiryStats?.total 
    ? Math.round(((inquiryStats.placed || 0) / inquiryStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
          <HeartHandshake className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Placement Advisor Dashboard</h1>
          <p className="text-sm text-muted-foreground">Concierge cases, messaging & placement tracking</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Cases */}
        <Card className={`border shadow-sm ${actionItemsCount > 0 ? "border-purple-500/50 bg-purple-50/50" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Cases</CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{(inquiryStats?.newCases || 0) + (inquiryStats?.inProgress || 0) + (inquiryStats?.matched || 0)}</div>
                <div className="flex gap-1.5 mt-1">
                  {inquiryStats?.newCases ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-info/20 text-info-foreground">
                      {inquiryStats.newCases} new
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card className={`border shadow-sm ${(messageStats?.unread || 0) > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread Messages</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingMessages ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{messageStats?.unread || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{messageStats?.totalThreads} total threads</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tour Requests */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Tour Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingTours ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{tourStats?.pending || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">{tourStats?.scheduled} scheduled</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Placement Rate */}
        <Card className="border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Placement Rate</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{placementRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">{inquiryStats?.placed} placements</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">Active Cases</CardTitle>
                <CardDescription>Recent concierge inquiries</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/concierge" className="text-xs">
                  View all <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingRecent ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : recentInquiries && recentInquiries.length > 0 ? (
              <div className="space-y-3">
                {recentInquiries.map((inquiry: any) => {
                  const status = statusConfig[inquiry.status] || statusConfig.new;
                  return (
                    <div key={inquiry.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{inquiry.user_name}</span>
                          <Badge variant="outline" className={`text-[10px] ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {inquiry.user_phone?.slice(-4) || "N/A"}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimeAgo(inquiry.created_at)}
                          </span>
                        </div>
                        {inquiry.timeline_urgency && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px] bg-muted">
                            {inquiry.timeline_urgency}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                <p className="text-sm">No active cases</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Pipeline */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Case Pipeline</CardTitle>
            <CardDescription>Status breakdown of all cases</CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-info">New Cases</span>
                    <span className="text-sm text-muted-foreground">{inquiryStats?.newCases}</span>
                  </div>
                  <Progress value={inquiryStats?.total ? ((inquiryStats.newCases || 0) / inquiryStats.total) * 100 : 0} className="h-2 bg-info/20" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-warning">In Progress</span>
                    <span className="text-sm text-muted-foreground">{inquiryStats?.inProgress}</span>
                  </div>
                  <Progress value={inquiryStats?.total ? ((inquiryStats.inProgress || 0) / inquiryStats.total) * 100 : 0} className="h-2 bg-warning/20" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-success">Matched</span>
                    <span className="text-sm text-muted-foreground">{inquiryStats?.matched}</span>
                  </div>
                  <Progress value={inquiryStats?.total ? ((inquiryStats.matched || 0) / inquiryStats.total) * 100 : 0} className="h-2 bg-success/20" />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium text-primary">Placed</span>
                    <span className="text-sm text-muted-foreground">{inquiryStats?.placed}</span>
                  </div>
                  <Progress value={inquiryStats?.total ? ((inquiryStats.placed || 0) / inquiryStats.total) * 100 : 0} className="h-2" />
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
          {inquiryStats?.newCases && inquiryStats.newCases > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-info/10" asChild>
              <Link to="/admin/concierge?status=new">
                <AlertCircle className="h-5 w-5 text-info mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">New Cases</span>
                  <span className="text-xs text-muted-foreground">{inquiryStats.newCases} awaiting</span>
                </div>
              </Link>
            </Button>
          )}
          {messageStats?.unread && messageStats.unread > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-warning/10" asChild>
              <Link to="/admin/concierge">
                <MessageCircle className="h-5 w-5 text-warning mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Unread Messages</span>
                  <span className="text-xs text-muted-foreground">{messageStats.unread} to reply</span>
                </div>
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-purple-500/10" asChild>
            <Link to="/admin/concierge">
              <UserPlus className="h-5 w-5 text-purple-500 mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">All Cases</span>
                <span className="text-xs text-muted-foreground">View concierge queue</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-muted" asChild>
            <Link to="/admin/seekers">
              <Users className="h-5 w-5 text-muted-foreground mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Seekers</span>
                <span className="text-xs text-muted-foreground">User profiles</span>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
