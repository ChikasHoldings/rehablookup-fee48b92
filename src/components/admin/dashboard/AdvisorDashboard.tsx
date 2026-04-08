import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { ConciergeDetailSheet } from "@/components/admin/ConciergeDetailSheet";
import { AdvisorEarningsCard } from "@/components/admin/dashboard/AdvisorEarningsCard";
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
  Inbox,
  MapPin,
  Activity,
} from "lucide-react";

type CaseView = "mine" | "all";

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
  reviewing: { label: "Reviewing", color: "text-warning", bgColor: "bg-warning/10 border-warning/30" },
  matching: { label: "Placing", color: "text-warning", bgColor: "bg-warning/10 border-warning/30" },
  matched: { label: "Matched", color: "text-success", bgColor: "bg-success/10 border-success/30" },
  introductions_sent: { label: "Intros Sent", color: "text-accent-foreground", bgColor: "bg-accent/10 border-accent/30" },
  in_contact: { label: "In Contact", color: "text-info", bgColor: "bg-info/10 border-info/30" },
  placed: { label: "Placed", color: "text-success", bgColor: "bg-success/10 border-success/30" },
};

export function AdvisorDashboard() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAdminAuth();
  const [caseView, setCaseView] = useState<CaseView>("mine");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const advisorId = user?.id;

  // Check if this advisor is a contractor (for earnings card)
  const { data: advisorProfile } = useQuery({
    queryKey: ["advisor-profile", advisorId],
    queryFn: async () => {
      if (!advisorId) return null;
      const { data } = await supabase
        .from("admin_user_profiles")
        .select("employment_type, commission_rate")
        .eq("user_id", advisorId)
        .single();
      return data;
    },
    enabled: !!advisorId,
  });

  const isContractor = advisorProfile?.employment_type === "contractor";

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["advisor-inquiry-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-recent-inquiries"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-message-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-tour-stats"] });
    queryClient.invalidateQueries({ queryKey: ["advisor-unassigned-count"] });
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
    queryKey: ["advisor-inquiry-stats", caseView, advisorId],
    queryFn: async () => {
      const buildQuery = (status?: string) => {
        let q = supabase.from("concierge_inquiries").select("id", { count: "exact", head: true });
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
        if (thread.last_message_at && (!thread.admin_last_read_at || new Date(thread.last_message_at) > new Date(thread.admin_last_read_at))) {
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
        supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      ]);
      return {
        pending: pending.count || 0,
        scheduled: scheduled.count || 0,
      };
    },
  });

  // Count unassigned cases
  const { data: unassignedCount } = useQuery({
    queryKey: ["advisor-unassigned-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_inquiries")
        .select("id", { count: "exact", head: true })
        .is("assigned_advisor_id", null)
        .not("status", "in", '("placed","closed")');
      return count || 0;
    },
  });

  // Fetch full case data when a case is selected for the detail sheet
  const { data: selectedCase } = useQuery({
    queryKey: ["advisor-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("*")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
  });

  const activeCases = (inquiryStats?.newCases || 0) + (inquiryStats?.inProgress || 0) + (inquiryStats?.matched || 0);
  const placementRate = inquiryStats?.total 
    ? Math.round(((inquiryStats.placed || 0) / inquiryStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg shrink-0">
            <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Placement Advisor</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your cases, messaging & placement tracking</p>
          </div>
        </div>

        <Tabs value={caseView} onValueChange={(v) => setCaseView(v as CaseView)}>
          <TabsList className="h-8 sm:h-9">
            <TabsTrigger value="mine" className="text-xs px-2.5 sm:px-3">My Cases</TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-2.5 sm:px-3">All Cases</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Active Cases */}
        <Card className={`border shadow-sm overflow-hidden ${activeCases > 0 ? "border-accent/50 bg-accent/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">
              {caseView === "mine" ? "My Cases" : "All Cases"}
            </CardTitle>
            <UserPlus className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingInquiries ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{activeCases}</div>
                <div className="flex gap-1 sm:gap-1.5 mt-0.5 flex-wrap">
                  {inquiryStats?.newCases ? (
                    <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-info/20 text-info-foreground">
                      {inquiryStats.newCases} new
                    </Badge>
                  ) : null}
                  {unassignedCount && unassignedCount > 0 ? (
                    <Badge variant="secondary" className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-0 bg-warning/20 text-warning-foreground">
                      {unassignedCount} unassigned
                    </Badge>
                  ) : null}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Unread Messages */}
        <Card className={`border shadow-sm overflow-hidden ${(messageStats?.unread || 0) > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Messages</CardTitle>
            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingMessages ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{messageStats?.unread || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{messageStats?.totalThreads} threads</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Tour Requests */}
        <Card className={`border shadow-sm overflow-hidden ${(tourStats?.pending || 0) > 0 ? "border-info/50 bg-info/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Tours</CardTitle>
            <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingTours ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{tourStats?.pending || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{tourStats?.scheduled} scheduled</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Placement Rate */}
        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">
              {caseView === "mine" ? "My Rate" : "Rate"}
            </CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingInquiries ? (
              <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" />
            ) : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{placementRate}%</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{inquiryStats?.placed} placed</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Recent Cases */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  {caseView === "mine" ? "My Active Cases" : "All Active Cases"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
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
                    <button
                      key={inquiry.id}
                      onClick={() => setSelectedCaseId(inquiry.id)}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors w-full text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{inquiry.user_name}</span>
                          <Badge variant="outline" className={`text-[10px] ${status.bgColor} ${status.color}`}>
                            {status.label}
                          </Badge>
                          {!isPaid && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                              Unpaid
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
                          {inquiry.user_phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3 shrink-0" />
                              •••• {inquiry.user_phone.slice(-4)}
                            </span>
                          )}
                          {location && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3 shrink-0" />
                              {location}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 shrink-0" />
                            {formatTimeAgo(inquiry.created_at)}
                          </span>
                        </div>
                        {inquiry.timeline_urgency && (
                          <Badge variant="secondary" className="mt-1.5 text-[10px] bg-muted">
                            {inquiry.timeline_urgency}
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
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
            <CardDescription className="text-xs sm:text-sm">
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
                  { key: "newCases", label: "New Cases", color: "text-info" },
                  { key: "inProgress", label: "In Progress", color: "text-warning" },
                  { key: "matched", label: "Facilities Found", color: "text-success" },
                  { key: "placed", label: "Placed", color: "text-success" },
                  { key: "closed", label: "Closed", color: "text-muted-foreground" },
                ].map(({ key, label, color }) => {
                  const count = (inquiryStats as any)?.[key] || 0;
                  const pct = inquiryStats?.total ? (count / inquiryStats.total) * 100 : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-sm font-medium ${color}`}>{label}</span>
                        <span className="text-sm text-muted-foreground tabular-nums">{count}</span>
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
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-info/10" asChild>
              <Link to="/admin/concierge?status=new">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-info mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">New Cases</span>
                  <span className="text-xs text-muted-foreground">{inquiryStats.newCases} awaiting review</span>
                </div>
              </Link>
            </Button>
          )}
          {messageStats?.unread && messageStats.unread > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-warning/10" asChild>
              <Link to="/admin/concierge">
                <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-warning mr-2 sm:mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Unread Messages</span>
                  <span className="text-xs text-muted-foreground">{messageStats.unread} to reply</span>
                </div>
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-accent/10" asChild>
            <Link to="/admin/concierge">
              <Activity className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground mr-2 sm:mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Placement Center</span>
                <span className="text-xs text-muted-foreground">Full case management</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-2.5 sm:py-3 px-3 sm:px-4 hover:bg-info/10" asChild>
            <Link to="/admin/inbox">
              <Inbox className="h-4 w-4 sm:h-5 sm:w-5 text-info mr-2 sm:mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Advisor Inbox</span>
                <span className="text-xs text-muted-foreground">Messages & coordination</span>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Contractor Earnings */}
      {isContractor && advisorId && (
        <AdvisorEarningsCard advisorId={advisorId} />
      )}

      {/* Case Detail Sheet - opens directly from dashboard */}
      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => setSelectedCaseId(null)}
        onRefresh={() => {
          invalidateDashboard();
          queryClient.invalidateQueries({ queryKey: ["advisor-case-detail", selectedCaseId] });
        }}
      />
    </div>
  );
}
