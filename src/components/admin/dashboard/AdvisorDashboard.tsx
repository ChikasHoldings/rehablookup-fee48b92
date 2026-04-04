import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  MessageCircle,
  Phone,
  CheckCircle2,
  Clock,
  ChevronRight,
  HeartHandshake,
  Calendar,
  AlertCircle,
  Headphones,
  MapPin,
  Activity,
} from "lucide-react";

type CaseView = "mine" | "all";

export function AdvisorDashboard() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAdminAuth();
  const [caseView, setCaseView] = useState<CaseView>("mine");

  const advisorId = user?.id;

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["advisor-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-inquiry-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-recent-inquiries"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-message-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-tour-stats"] });
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

  // Fetch concierge inquiry stats - filtered by advisor when "mine"
  const { data: inquiryStats, isLoading: loadingInquiries } = useQuery({
    queryKey: ["advisor-inquiry-stats", caseView, advisorId],
    queryFn: async () => {
      const buildQuery = (status?: string) => {
        let q = supabase.from("concierge_inquiries").select("*", { count: "exact", head: true });
        if (caseView === "mine" && advisorId) {
          q = q.eq("assigned_advisor_id", advisorId);
        }
        if (status) q = q.eq("status", status);
        return q;
      };

      const [total, newCases, inProgress, matched, placed, closed] = await Promise.all([
        buildQuery(),
        buildQuery("new"),
        buildQuery("reviewing"),
        buildQuery("matched"),
        buildQuery("placed"),
        buildQuery("closed"),
      ]);
      return {
        total: total.count || 0,
        newCases: newCases.count || 0,
        inProgress: inProgress.count || 0,
        matched: matched.count || 0,
        placed: placed.count || 0,
        closed: closed.count || 0,
      };
    },
    enabled: !!advisorId,
  });

  // Fetch recent inquiries
  const { data: recentInquiries, isLoading: loadingRecent } = useQuery({
    queryKey: ["advisor-recent-inquiries", caseView, advisorId],
    queryFn: async () => {
      let query = supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_phone, status, created_at, timeline_urgency, level_of_care, desired_location_state, preferred_state, payment_status")
        .in("status", ["new", "reviewing", "matching", "matched", "introductions_sent", "in_contact"])
        .order("created_at", { ascending: false })
        .limit(8);

      if (caseView === "mine" && advisorId) {
        query = query.eq("assigned_advisor_id", advisorId);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!advisorId,
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

  // Count unassigned cases (cases with no advisor)
  const { data: unassignedCount } = useQuery({
    queryKey: ["advisor-unassigned-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_inquiries")
        .select("*", { count: "exact", head: true })
        .is("assigned_advisor_id", null)
        .not("status", "in", '("placed","closed")');
      return count || 0;
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
    new: { label: "New", color: "text-blue-600", bgColor: "bg-blue-50 border-blue-200" },
    reviewing: { label: "Reviewing", color: "text-amber-600", bgColor: "bg-amber-50 border-amber-200" },
    matching: { label: "Placing", color: "text-orange-600", bgColor: "bg-orange-50 border-orange-200" },
    matched: { label: "Facilities Found", color: "text-emerald-600", bgColor: "bg-emerald-50 border-emerald-200" },
    introductions_sent: { label: "Intros Sent", color: "text-violet-600", bgColor: "bg-violet-50 border-violet-200" },
    in_contact: { label: "In Contact", color: "text-cyan-600", bgColor: "bg-cyan-50 border-cyan-200" },
    placed: { label: "Placed", color: "text-green-700", bgColor: "bg-green-50 border-green-200" },
  };

  const activeCases = (inquiryStats?.newCases || 0) + (inquiryStats?.inProgress || 0) + (inquiryStats?.matched || 0);
  const placementRate = inquiryStats?.total 
    ? Math.round(((inquiryStats.placed || 0) / inquiryStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
            <HeartHandshake className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Placement Advisor</h1>
            <p className="text-sm text-muted-foreground">Your cases, messaging & placement tracking</p>
          </div>
        </div>

        {/* View Toggle */}
        <Tabs value={caseView} onValueChange={(v) => setCaseView(v as CaseView)}>
          <TabsList className="h-9">
            <TabsTrigger value="mine" className="text-xs px-3">My Cases</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-3">All Cases</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Cases */}
        <Card className={`border shadow-sm ${actionItemsCount > 0 ? "border-purple-300 bg-purple-50/50 dark:border-purple-700 dark:bg-purple-950/20" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {caseView === "mine" ? "My Active Cases" : "All Active Cases"}
            </CardTitle>
            <UserPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">{activeCases}</div>
                <div className="flex gap-1.5 mt-1 flex-wrap">
                  {inquiryStats?.newCases ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {inquiryStats.newCases} new
                    </Badge>
                  ) : null}
                  {unassignedCount && unassignedCount > 0 ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {unassignedCount} unassigned
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card className={`border shadow-sm ${(messageStats?.unread || 0) > 0 ? "border-amber-300 bg-amber-50/50 dark:border-amber-700 dark:bg-amber-950/20" : ""}`}>
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
        <Card className={`border shadow-sm ${(tourStats?.pending || 0) > 0 ? "border-cyan-300 bg-cyan-50/50 dark:border-cyan-700 dark:bg-cyan-950/20" : ""}`}>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {caseView === "mine" ? "My Placement Rate" : "Overall Rate"}
            </CardTitle>
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
                <CardTitle className="text-base font-medium">
                  {caseView === "mine" ? "My Active Cases" : "All Active Cases"}
                </CardTitle>
                <CardDescription>
                  {caseView === "mine" ? "Cases assigned to you" : "All concierge inquiries"}
                </CardDescription>
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
              <div className="space-y-2.5">
                {recentInquiries.map((inquiry: any) => {
                  const status = statusConfig[inquiry.status] || statusConfig.new;
                  const isPaid = inquiry.payment_status === 'paid' || inquiry.payment_status === 'succeeded';
                  const location = inquiry.desired_location_state || inquiry.preferred_state;
                  return (
                    <Link
                      key={inquiry.id}
                      to="/admin/concierge"
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{inquiry.user_name}</span>
                          <Badge variant="outline" className={`text-[10px] ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </Badge>
                          {!isPaid && (
                            <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-200">
                              Unpaid
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {inquiry.user_phone?.slice(-4) || "N/A"}
                          </span>
                          {location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </span>
                          )}
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
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                <p className="text-sm">
                  {caseView === "mine" ? "No cases assigned to you" : "No active cases"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Case Pipeline */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-medium">Case Pipeline</CardTitle>
            <CardDescription>
              {caseView === "mine" ? "Your case status breakdown" : "All cases by status"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <div className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  { key: "newCases", label: "New Cases", color: "text-blue-600" },
                  { key: "inProgress", label: "In Progress", color: "text-amber-600" },
                  { key: "matched", label: "Facilities Found", color: "text-emerald-600" },
                  { key: "placed", label: "Placed", color: "text-green-700" },
                  { key: "closed", label: "Closed", color: "text-slate-500" },
                ].map(({ key, label, color }) => {
                  const count = (inquiryStats as any)?.[key] || 0;
                  const pct = inquiryStats?.total ? (count / inquiryStats.total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-sm font-medium ${color}`}>{label}</span>
                        <span className="text-sm text-muted-foreground">{count}</span>
                      </div>
                      <Progress value={pct} className="h-2" />
                    </div>
                  );
                })}
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
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-blue-50 dark:hover:bg-blue-950/20" asChild>
              <Link to="/admin/concierge?status=new">
                <AlertCircle className="h-5 w-5 text-blue-500 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">New Cases</span>
                  <span className="text-xs text-muted-foreground">{inquiryStats.newCases} awaiting review</span>
                </div>
              </Link>
            </Button>
          )}
          {messageStats?.unread && messageStats.unread > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-amber-50 dark:hover:bg-amber-950/20" asChild>
              <Link to="/admin/concierge">
                <MessageCircle className="h-5 w-5 text-amber-500 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Unread Messages</span>
                  <span className="text-xs text-muted-foreground">{messageStats.unread} to reply</span>
                </div>
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-purple-50 dark:hover:bg-purple-950/20" asChild>
            <Link to="/admin/concierge">
              <Activity className="h-5 w-5 text-purple-500 mr-3" />
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">Placement Center</span>
                <span className="text-xs text-muted-foreground">Full case management</span>
              </div>
            </Link>
          </Button>
          {hasPermission("support") && (
            <Button variant="ghost" className="justify-start h-auto py-3 px-4 hover:bg-cyan-50 dark:hover:bg-cyan-950/20" asChild>
              <Link to="/admin/support">
                <Headphones className="h-5 w-5 text-cyan-500 mr-3" />
                <div className="flex flex-col items-start">
                  <span className="text-sm font-medium">Support Inbox</span>
                  <span className="text-xs text-muted-foreground">Seeker communications</span>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
