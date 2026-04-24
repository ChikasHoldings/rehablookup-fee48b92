import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { toast } from "sonner";
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
  HandMetal,
  Loader2,
  AlertTriangle,
  Building2,
} from "lucide-react";

type CaseView = "mine" | "unassigned" | "all";

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

// Canonical statuses live in conciergeStatusConstants.ts to keep dashboards,
// filters, and counts aligned with the Postgres validation trigger.
import { ACTIVE_STATUSES, TERMINAL_STATUSES_NOT_IN } from "@/components/admin/concierge/conciergeStatusConstants";

const statusConfig: Record<string, { label: string; color: string; bgColor: string; order: number }> = {
  pending_intake: { label: "Pending", color: "text-muted-foreground", bgColor: "bg-muted/40 border-border", order: 0 },
  intake_submitted: { label: "New", color: "text-info", bgColor: "bg-info/10 border-info/30", order: 1 },
  intake_reviewed: { label: "Reviewed", color: "text-warning", bgColor: "bg-warning/10 border-warning/30", order: 2 },
  advisor_assigned: { label: "Assigned", color: "text-warning", bgColor: "bg-warning/10 border-warning/30", order: 3 },
  matching_providers: { label: "Matching", color: "text-warning", bgColor: "bg-warning/10 border-warning/30", order: 4 },
  provider_prequalification: { label: "Pre-Qual", color: "text-warning", bgColor: "bg-warning/10 border-warning/30", order: 5 },
  providers_accepted: { label: "Ready", color: "text-accent-foreground", bgColor: "bg-accent/10 border-accent/30", order: 6 },
  presented_to_seeker: { label: "Presented", color: "text-accent-foreground", bgColor: "bg-accent/10 border-accent/30", order: 7 },
  seeker_selected: { label: "Selected", color: "text-info", bgColor: "bg-info/10 border-info/30", order: 8 },
  admission_in_progress: { label: "Admitting", color: "text-info", bgColor: "bg-info/10 border-info/30", order: 9 },
  admitted: { label: "Admitted", color: "text-success", bgColor: "bg-success/10 border-success/30", order: 10 },
  billed: { label: "Billed", color: "text-success", bgColor: "bg-success/10 border-success/30", order: 11 },
  completed: { label: "Completed", color: "text-success", bgColor: "bg-success/10 border-success/30", order: 12 },
  closed: { label: "Closed", color: "text-muted-foreground", bgColor: "bg-muted/50 border-border", order: 13 },
};

export function AdvisorDashboard() {
  const queryClient = useQueryClient();
  const { user, hasPermission } = useAdminAuth();
  const [caseView, setCaseView] = useState<CaseView>("mine");
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [initialDetailTab, setInitialDetailTab] = useState<string | undefined>(undefined);

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
    staleTime: 5 * 60 * 1000,
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

  // Claim case mutation
  // NOTE: We only assign the advisor — we do NOT change status here.
  // The DB transition trigger only allows the advisor to claim from
  // intake_reviewed → advisor_assigned via the regular stage-action flow.
  // Touching status from this card would have failed for any case in
  // intake_submitted/matching_providers/etc.
  const claimCaseMutation = useMutation({
    mutationFn: async (caseId: string) => {
      if (!advisorId) throw new Error("Not authenticated");
      setClaimingId(caseId);

      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ assigned_advisor_id: advisorId })
        .eq("id", caseId)
        .is("assigned_advisor_id", null);

      if (error) throw error;

      // Log event
      await supabase.from("concierge_case_events").insert({
        inquiry_id: caseId,
        event_type: "advisor_claimed",
        event_data: { advisor_id: advisorId },
        actor_id: advisorId,
        actor_type: "advisor",
      });
    },
    onSuccess: (_data, caseId) => {
      toast.success("Case claimed! Opening placement workflow...");
      invalidateDashboard();
      // Auto-open the case detail sheet on the placement tab
      setSelectedCaseId(caseId);
      setInitialDetailTab("placement");
    },
    onError: (err: Error) => {
      toast.error("Failed to claim case: " + err.message);
    },
    onSettled: () => {
      setClaimingId(null);
    },
  });

  // Fetch concierge inquiry stats (always for my cases).
  // Buckets group the canonical 14 statuses into the 7 visual stages used
  // in the pipeline UI so counts always add up to `total`.
  const { data: inquiryStats, isLoading: loadingInquiries } = useQuery({
    queryKey: ["advisor-inquiry-stats", advisorId],
    queryFn: async () => {
      if (!advisorId) return null;

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("status")
        .eq("assigned_advisor_id", advisorId);

      if (error) throw error;
      const rows = data || [];

      const inBucket = (statuses: readonly string[]) =>
        rows.filter((r) => statuses.includes(r.status)).length;

      return {
        total: rows.length,
        newCases: inBucket(["pending_intake", "intake_submitted"]),
        reviewing: inBucket(["intake_reviewed", "advisor_assigned"]),
        matching: inBucket(["matching_providers", "provider_prequalification", "providers_accepted"]),
        introsSent: inBucket(["presented_to_seeker"]),
        inContact: inBucket(["seeker_selected", "admission_in_progress"]),
        placed: inBucket(["admitted", "billed", "completed"]),
        closed: inBucket(["closed"]),
      };
    },
    enabled: !!advisorId,
    staleTime: 30 * 1000,
  });

  // Fetch recent inquiries based on view
  const { data: recentInquiries, isLoading: loadingRecent } = useQuery({
    queryKey: ["advisor-recent-inquiries", caseView, advisorId],
    queryFn: async () => {
      let query = supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_phone, status, created_at, timeline_urgency, level_of_care, desired_location_state, preferred_state, payment_status, assigned_advisor_id")
        .order("created_at", { ascending: false })
        .limit(10);

      if (caseView === "mine") {
        query = query
          .eq("assigned_advisor_id", advisorId!)
          .in("status", ACTIVE_STATUSES as unknown as string[]);
      } else if (caseView === "unassigned") {
        query = query
          .is("assigned_advisor_id", null)
          .not("status", "in", "(completed,closed)");
      } else {
        query = query.in("status", ACTIVE_STATUSES as unknown as string[]);
      }

      const { data } = await query;
      return data || [];
    },
    enabled: !!advisorId,
    staleTime: 30 * 1000,
  });

  // Fetch message stats
  const { data: messageStats, isLoading: loadingMessages } = useQuery({
    queryKey: ["advisor-message-stats", advisorId],
    queryFn: async () => {
      // Get threads for advisor's cases
      const { data: myInquiries } = await supabase
        .from("concierge_inquiries")
        .select("id")
        .eq("assigned_advisor_id", advisorId!)
        .not("status", "eq", "closed");

      if (!myInquiries || myInquiries.length === 0) return { totalThreads: 0, unread: 0 };

      const { data: threads } = await supabase
        .from("concierge_threads")
        .select("id, last_message_at, admin_last_read_at")
        .in("inquiry_id", myInquiries.map(i => i.id));
      
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
    enabled: !!advisorId,
    staleTime: 30 * 1000,
  });

  // Fetch tour requests for advisor's cases
  const { data: tourStats, isLoading: loadingTours } = useQuery({
    queryKey: ["advisor-tour-stats", advisorId],
    queryFn: async () => {
      const { data: myInquiries } = await supabase
        .from("concierge_inquiries")
        .select("id")
        .eq("assigned_advisor_id", advisorId!)
        .not("status", "eq", "closed");

      if (!myInquiries || myInquiries.length === 0) return { pending: 0, scheduled: 0 };

      const [pending, scheduled] = await Promise.all([
        supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true })
          .in("inquiry_id", myInquiries.map(i => i.id)).eq("status", "pending"),
        supabase.from("concierge_tour_requests").select("id", { count: "exact", head: true })
          .in("inquiry_id", myInquiries.map(i => i.id)).eq("status", "scheduled"),
      ]);
      return {
        pending: pending.count || 0,
        scheduled: scheduled.count || 0,
      };
    },
    enabled: !!advisorId,
    staleTime: 30 * 1000,
  });

  // Count unassigned cases
  const { data: unassignedCount } = useQuery({
    queryKey: ["advisor-unassigned-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("concierge_inquiries")
        .select("id", { count: "exact", head: true })
        .is("assigned_advisor_id", null)
        .not("status", "in", "(completed,closed)");
      return count || 0;
    },
    staleTime: 30 * 1000,
  });

  // Fetch full case data when a case is selected for the detail sheet
  const { data: selectedCase } = useQuery({
    queryKey: ["advisor-case-detail", selectedCaseId],
    queryFn: async () => {
      if (!selectedCaseId) return undefined;
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select("id, user_name, user_email, user_phone, status, payment_status, payment_amount_cents, intake_data, created_at, updated_at, admin_notes, assigned_advisor_id, matched_facility_ids, placed_facility_id, level_of_care, primary_concern, insurance_carrier, budget_range, timeline_urgency, preferred_state, preferred_city, gender, age_range, tour_coordination_status, admission_status, admission_substatus, notes, admin_matched_facility_ids, admission_notes, introductions_sent_at, introductions_sent_count, matched_at, closed_at, seeker_rating, seeker_feedback, provider_fee_cents, provider_fee_status, provider_fee_type, provider_invoice_id, draft_id, checkout_session_id, stripe_payment_intent_id, payment_type, idempotency_key, user_id, match_scores, referral_source, placement_confirmed, placement_confirmed_at, abandoned_cart_email_sent_at, alternative_contact_name, alternative_contact_phone, amenity_preferences, assessment_preference, benefits_verified, best_time_to_call, co_occurring_concerns, current_living_situation, current_medications, decision_maker_name, decision_maker_phone, desired_location_city, desired_location_state, desired_radius_miles, detox_needed, email_verified_at, emergency_contact_name, emergency_contact_phone, employer_name, faith_based_preference, form_completed_at, hipaa_consent, holistic_interest, insurance_group_number, insurance_member_id, intake_submitted_at, match_count, mobility_needs, move_in_date, needs_transport_help, payment_reminder_count, preferred_environment, preferred_language, prior_treatment_history, prior_treatment_notes, relationship_to_decision_maker, relationship_to_seeker, scholarship_interest, seeker_confirmed, seeker_confirmed_at, stripe_customer_id, substance_use_duration, substance_use_frequency, suicide_history, willing_to_travel")
        .eq("id", selectedCaseId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!selectedCaseId,
  });

  const activeCases = (inquiryStats?.newCases || 0) + (inquiryStats?.reviewing || 0) + 
    (inquiryStats?.matching || 0) + (inquiryStats?.introsSent || 0) + (inquiryStats?.inContact || 0);
  const placementRate = inquiryStats?.total 
    ? Math.round(((inquiryStats.placed || 0) / inquiryStats.total) * 100) 
    : 0;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shrink-0">
            <HeartHandshake className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Placement Advisor</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Your cases, messaging & placement tracking</p>
          </div>
        </div>

        <Tabs value={caseView} onValueChange={(v) => setCaseView(v as CaseView)}>
          <TabsList className="h-8 sm:h-9">
            <TabsTrigger value="mine" className="text-xs px-2.5 sm:px-3">My Cases</TabsTrigger>
            <TabsTrigger value="unassigned" className="text-xs px-2.5 sm:px-3 gap-1">
              Unclaimed
              {unassignedCount && unassignedCount > 0 ? (
                <span className="text-[10px] bg-warning text-warning-foreground rounded-full px-1.5">{unassignedCount}</span>
              ) : null}
            </TabsTrigger>
            <TabsTrigger value="all" className="text-xs px-2.5 sm:px-3">All</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Summary Cards - always show MY stats */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {/* Active Cases */}
        <Card className={`border shadow-sm overflow-hidden ${activeCases > 0 ? "border-accent/50 bg-accent/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">My Active</CardTitle>
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
                      {unassignedCount} unclaimed
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
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">My Rate</CardTitle>
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
        {/* Case List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">
                  {caseView === "mine" ? "My Active Cases" : caseView === "unassigned" ? "Unclaimed Cases" : "All Active Cases"}
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {caseView === "mine" ? "Cases assigned to you" : caseView === "unassigned" ? "Claim to start working" : "All concierge inquiries"}
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
                  const status = statusConfig[inquiry.status] || statusConfig.intake_submitted;
                  const isPaid = inquiry.payment_status === 'paid' || inquiry.payment_status === 'succeeded';
                  const location = inquiry.desired_location_state || inquiry.preferred_state;
                  const isUnassigned = !inquiry.assigned_advisor_id;
                  const isClaiming = claimingId === inquiry.id;

                  return (
                    <div
                      key={inquiry.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() => !isUnassigned && setSelectedCaseId(inquiry.id)}
                        className="flex-1 min-w-0 text-left"
                        disabled={isUnassigned}
                      >
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
                          {inquiry.timeline_urgency === "immediate" && (
                            <Badge variant="outline" className="text-[10px] bg-destructive/10 text-destructive border-destructive/30">
                              Urgent
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
                      </button>

                      {/* Claim button for unassigned cases */}
                      {isUnassigned && (
                        <Button
                          size="sm"
                          variant="default"
                          className="ml-2 shrink-0"
                          disabled={isClaiming}
                          onClick={(e) => {
                            e.stopPropagation();
                            claimCaseMutation.mutate(inquiry.id);
                          }}
                        >
                          {isClaiming ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <HandMetal className="h-3.5 w-3.5 mr-1" />
                              Claim
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                {caseView === "unassigned" ? (
                  <>
                    <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                    <p className="text-sm">All cases are assigned</p>
                  </>
                ) : (
                  <>
                    <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">{caseView === "mine" ? "No cases assigned to you" : "No active cases"}</p>
                    {caseView === "mine" && unassignedCount && unassignedCount > 0 ? (
                      <Button variant="link" size="sm" className="mt-1" onClick={() => setCaseView("unassigned")}>
                        {unassignedCount} unclaimed cases available →
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full Pipeline - visual board */}
        <Card className="border shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-medium">My Pipeline</CardTitle>
                <CardDescription className="text-xs sm:text-sm">Your case status breakdown</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/concierge" className="text-xs">
                  Full Board <ChevronRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingInquiries ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { key: "newCases", label: "New / Intake", color: "bg-primary", count: inquiryStats?.newCases || 0 },
                  { key: "reviewing", label: "Reviewing", color: "bg-info", count: inquiryStats?.reviewing || 0 },
                  { key: "matching", label: "Matching / Outreach", color: "bg-warning", count: inquiryStats?.matching || 0 },
                  { key: "introsSent", label: "Intros Sent", color: "bg-accent", count: inquiryStats?.introsSent || 0 },
                  { key: "inContact", label: "In Contact / Tours", color: "bg-info", count: inquiryStats?.inContact || 0 },
                  { key: "placed", label: "Admitted ✓", color: "bg-success", count: inquiryStats?.placed || 0 },
                  { key: "closed", label: "Closed", color: "bg-muted-foreground", count: inquiryStats?.closed || 0 },
                ].map(({ key, label, color, count }) => {
                  const pct = inquiryStats?.total ? (count / inquiryStats.total) * 100 : 0;
                  const isActive = key !== "placed" && key !== "closed" && count > 0;
                  return (
                    <div key={key} className={isActive ? "bg-muted/30 rounded-lg p-2 -mx-2" : ""}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${color}`} />
                          {label}
                        </span>
                        <span className="text-sm font-bold tabular-nums">{count}</span>
                      </div>
                      <Progress value={pct} className="h-1.5" />
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
          {unassignedCount && unassignedCount > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" onClick={() => setCaseView("unassigned")}>
              <HandMetal className="h-5 w-5 text-warning mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Claim Cases</span>
                <span className="text-xs text-muted-foreground">{unassignedCount} unclaimed</span>
              </div>
            </Button>
          )}
          {messageStats?.unread && messageStats.unread > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
              <Link to="/admin/inbox">
                <MessageCircle className="h-5 w-5 text-warning mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Unread Messages</span>
                  <span className="text-xs text-muted-foreground">{messageStats.unread} to reply</span>
                </div>
              </Link>
            </Button>
          )}
          {tourStats?.pending && tourStats.pending > 0 && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-info/10" asChild>
              <Link to="/admin/concierge">
                <Calendar className="h-5 w-5 text-info mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Pending Tours</span>
                  <span className="text-xs text-muted-foreground">{tourStats.pending} to schedule</span>
                </div>
              </Link>
            </Button>
          )}
          <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-accent/10" asChild>
            <Link to="/admin/concierge">
              <Activity className="h-5 w-5 text-accent-foreground mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Placement Center</span>
                <span className="text-xs text-muted-foreground">Full case management</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-info/10" asChild>
            <Link to="/admin/inbox">
              <Inbox className="h-5 w-5 text-info mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Advisor Inbox</span>
                <span className="text-xs text-muted-foreground">Messages & coordination</span>
              </div>
            </Link>
          </Button>
          <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-primary/10" asChild>
            <Link to="/admin/provider-directory">
              <Building2 className="h-5 w-5 text-primary mr-3 shrink-0" />
              <div className="flex flex-col items-start min-w-0">
                <span className="text-sm font-medium">Provider Directory</span>
                <span className="text-xs text-muted-foreground">Enroll & outreach</span>
              </div>
            </Link>
          </Button>
          {hasPermission("escalations") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-destructive/10" asChild>
              <Link to="/admin/escalations">
                <AlertTriangle className="h-5 w-5 text-destructive mr-3 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Escalations</span>
                  <span className="text-xs text-muted-foreground">Escalate to manager</span>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Contractor Earnings */}
      {isContractor && <AdvisorEarningsCard />}

      {/* Case Detail Sheet - opens directly from dashboard */}
      <ConciergeDetailSheet
        caseData={selectedCase}
        open={!!selectedCaseId}
        onClose={() => { setSelectedCaseId(null); setInitialDetailTab(undefined); }}
        onRefresh={() => {
          invalidateDashboard();
          queryClient.invalidateQueries({ queryKey: ["advisor-case-detail", selectedCaseId] });
        }}
        initialTab={initialDetailTab}
      />
    </div>
  );
}
