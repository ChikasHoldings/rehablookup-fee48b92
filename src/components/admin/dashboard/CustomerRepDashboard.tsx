import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useEffect, useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { SupportTicketModal } from "@/components/admin/SupportTicketModal";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
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
  Ticket,
  ArrowUpRight,
  Eye,
  MailOpen,
  Loader2,
} from "lucide-react";

export function CustomerRepDashboard() {
  const queryClient = useQueryClient();
  const { hasPermission, user } = useAdminAuth();
  const [escalateTicketId, setEscalateTicketId] = useState<string | null>(null);
  const [escalateSubject, setEscalateSubject] = useState("");
  const [escalateDescription, setEscalateDescription] = useState("");
  const [escalatePriority, setEscalatePriority] = useState<string>("medium");
  const [isEscalating, setIsEscalating] = useState(false);
  const [moderatingReviewId, setModeratingReviewId] = useState<string | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [claimingTicketId, setClaimingTicketId] = useState<string | null>(null);

  const invalidateDashboard = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["rep-ticket-stats"] });
    queryClient.invalidateQueries({ queryKey: ["rep-my-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["rep-unassigned-tickets"] });
    queryClient.invalidateQueries({ queryKey: ["rep-review-stats"] });
    queryClient.invalidateQueries({ queryKey: ["rep-pending-reviews"] });
    queryClient.invalidateQueries({ queryKey: ["rep-my-escalations"] });
  }, [queryClient]);

  useEffect(() => {
    const channel = supabase
      .channel("rep-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "facility_reviews" }, invalidateDashboard)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, invalidateDashboard)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [invalidateDashboard]);

  // Support ticket stats
  const { data: ticketStats, isLoading: loadingTickets } = useQuery({
    queryKey: ["rep-ticket-stats"],
    queryFn: async () => {
      const [total, newTickets, openTickets, resolved] = await Promise.all([
        supabase.from("support_tickets").select("id", { count: "exact", head: true }),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true }).eq("status", "resolved"),
      ]);
      return {
        total: total.count || 0,
        new: newTickets.count || 0,
        open: openTickets.count || 0,
        resolved: resolved.count || 0,
      };
    },
  });

  // Review stats
  const { data: reviewStats, isLoading: loadingReviews } = useQuery({
    queryKey: ["rep-review-stats"],
    queryFn: async () => {
      const [total, pending, approved, rejected] = await Promise.all([
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "approved"),
        supabase.from("facility_reviews").select("id", { count: "exact", head: true }).eq("status", "rejected"),
      ]);
      return { total: total.count || 0, pending: pending.count || 0, approved: approved.count || 0, rejected: rejected.count || 0 };
    },
  });

  // My assigned tickets
  const { data: myTickets, isLoading: loadingMyTickets } = useQuery({
    queryKey: ["rep-my-tickets", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, subject, category, priority, status, source, created_at")
        .eq("assigned_to", user.id)
        .in("status", ["open", "in_progress", "new"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Unassigned tickets
  const { data: unassignedTickets, isLoading: loadingUnassigned } = useQuery({
    queryKey: ["rep-unassigned-tickets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("support_tickets")
        .select("id, sender_name, sender_email, subject, category, priority, status, source, created_at")
        .is("assigned_to", null)
        .in("status", ["new"])
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
  });

  // Pending reviews
  const { data: pendingReviews, isLoading: loadingPendingReviews } = useQuery({
    queryKey: ["rep-pending-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("facility_reviews")
        .select("id, rating, review_text, created_at, facility_id, facilities (name)")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
  });

  // My escalations
  const { data: myEscalations } = useQuery({
    queryKey: ["rep-my-escalations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data } = await supabase
        .from("admin_escalations")
        .select("id, subject, priority, status, created_at")
        .eq("created_by", user.id)
        .order("created_at", { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Claim ticket
  const claimTicket = async (ticketId: string) => {
    if (!user?.id) return;
    setClaimingTicketId(ticketId);
    const { error } = await supabase
      .from("support_tickets")
      .update({ assigned_to: user.id, assigned_at: new Date().toISOString(), assigned_by: user.id, status: "open" })
      .eq("id", ticketId);
    setClaimingTicketId(null);
    if (error) { toast.error("Failed to claim ticket"); return; }
    toast.success("Ticket claimed — opening details...");
    invalidateDashboard();
    // Auto-open the ticket detail
    setSelectedTicketId(ticketId);
  };

  // Resolve ticket inline
  const resolveTicket = async (ticketId: string) => {
    if (!user?.id) return;
    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", ticketId);
    if (error) { toast.error("Failed to resolve ticket"); return; }
    toast.success("Ticket resolved");
    invalidateDashboard();
  };

  // Escalate ticket
  const handleEscalate = async () => {
    if (!user?.id || !escalateSubject || !escalateDescription) return;
    setIsEscalating(true);
    const { error } = await supabase.from("admin_escalations").insert({
      created_by: user.id,
      subject: escalateSubject,
      description: escalateDescription,
      priority: escalatePriority as any,
      related_type: escalateTicketId ? "support_ticket" : null,
      related_id: escalateTicketId,
      status: "open",
    });
    setIsEscalating(false);
    if (error) { toast.error("Failed to escalate"); return; }
    toast.success("Issue escalated to management");
    setEscalateTicketId(null);
    setEscalateSubject("");
    setEscalateDescription("");
    queryClient.invalidateQueries({ queryKey: ["rep-my-escalations"] });
  };

  const priorityColors: Record<string, string> = {
    low: "bg-muted text-muted-foreground",
    normal: "bg-primary/10 text-primary",
    high: "bg-warning/10 text-warning",
    urgent: "bg-destructive/10 text-destructive",
    medium: "bg-warning/10 text-warning",
    critical: "bg-destructive/10 text-destructive",
  };

  const statusColors: Record<string, string> = {
    new: "bg-info/10 text-info",
    open: "bg-primary/10 text-primary",
    in_progress: "bg-warning/10 text-warning",
    resolved: "bg-success/10 text-success",
    closed: "bg-muted text-muted-foreground",
  };

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

  const actionableItems = (ticketStats?.new || 0) + (ticketStats?.open || 0) + (reviewStats?.pending || 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shrink-0">
            <Headphones className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-semibold tracking-tight text-foreground truncate">Support Center</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Tickets, reviews, and user support</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEscalateTicketId("");
            setEscalateSubject("");
            setEscalateDescription("");
            setEscalatePriority("medium");
          }}
          className="gap-1.5"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Escalate Issue</span>
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-2 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className={`border shadow-sm overflow-hidden ${(ticketStats?.new || 0) > 0 ? "border-info/50 bg-info/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">New Tickets</CardTitle>
            <Ticket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingTickets ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" /> : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{ticketStats?.new || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{ticketStats?.open || 0} in progress</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={`border shadow-sm overflow-hidden ${(reviewStats?.pending || 0) > 0 ? "border-warning/50 bg-warning/5" : ""}`}>
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Pending Reviews</CardTitle>
            <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingReviews ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" /> : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{reviewStats?.pending || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">{reviewStats?.total} total</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">Resolved</CardTitle>
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingTickets ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" /> : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{ticketStats?.resolved || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">all time</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="border shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 space-y-0 p-3 sm:p-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground truncate pr-1">My Assigned</CardTitle>
            <MailOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0" />
          </CardHeader>
          <CardContent className="min-h-[40px] sm:min-h-[60px] p-3 pt-0 sm:p-6 sm:pt-0">
            {loadingMyTickets ? <Skeleton className="h-6 sm:h-8 w-16 sm:w-20" /> : (
              <>
                <div className="text-lg sm:text-2xl font-bold tabular-nums">{myTickets?.length || 0}</div>
                <p className="text-[9px] sm:text-xs text-muted-foreground mt-0.5">active</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="my-tickets" className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-tickets" className="gap-1.5">
            My Tickets
            {(myTickets?.length || 0) > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] px-1.5">{myTickets?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="unassigned" className="gap-1.5">
            Unassigned
            {(unassignedTickets?.length || 0) > 0 && (
              <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] px-1.5 bg-info/20 text-info">{unassignedTickets?.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="escalations">My Escalations</TabsTrigger>
        </TabsList>

        {/* My Tickets */}
        <TabsContent value="my-tickets">
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Assigned to Me</CardTitle>
                  <CardDescription>Tickets you're currently working on</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/support" className="text-xs">View all <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingMyTickets ? (
                <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : myTickets && myTickets.length > 0 ? (
                <div className="space-y-2">
                  {myTickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => setSelectedTicketId(ticket.id)}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{ticket.subject || ticket.category}</p>
                          <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority] || ""}`}>
                            {ticket.priority}
                          </Badge>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[ticket.status] || ""}`}>
                            {ticket.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ticket.sender_name} · {ticket.source === "seeker_support" ? "Seeker" : ticket.source === "provider_support" ? "Provider" : "Contact"} · {formatTimeAgo(ticket.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 ml-2 shrink-0">
                        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                          <Link to={`/admin/support?ticket=${ticket.id}`}><Eye className="h-3.5 w-3.5" /></Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-success hover:text-success"
                          title="Resolve ticket"
                          onClick={() => resolveTicket(ticket.id)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-warning hover:text-warning"
                          title="Escalate"
                          onClick={() => {
                            setEscalateTicketId(ticket.id);
                            setEscalateSubject(`Escalation: ${ticket.subject || ticket.category}`);
                            setEscalateDescription(`Ticket from ${ticket.sender_name} (${ticket.source}) needs management attention.\n\nOriginal ticket: ${ticket.subject || ticket.category}`);
                          }}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm">No assigned tickets</p>
                  <p className="text-xs mt-1">Claim tickets from the Unassigned tab</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unassigned */}
        <TabsContent value="unassigned">
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Unassigned Tickets</CardTitle>
                  <CardDescription>New tickets waiting to be claimed</CardDescription>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/admin/support" className="text-xs">View all <ChevronRight className="h-3 w-3 ml-1" /></Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUnassigned ? (
                <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>
              ) : unassignedTickets && unassignedTickets.length > 0 ? (
                <div className="space-y-2">
                  {unassignedTickets.map((ticket: any) => (
                    <div key={ticket.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium truncate">{ticket.subject || ticket.category}</p>
                          <Badge variant="outline" className={`text-[10px] ${priorityColors[ticket.priority] || ""}`}>
                            {ticket.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ticket.sender_name} · {ticket.source === "seeker_support" ? "Seeker" : ticket.source === "provider_support" ? "Provider" : "Contact"} · {formatTimeAgo(ticket.created_at)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 ml-2 text-xs"
                        disabled={claimingTicketId === ticket.id}
                        onClick={() => claimTicket(ticket.id)}
                      >
                        {claimingTicketId === ticket.id ? (
                          <><Loader2 className="h-3 w-3 animate-spin mr-1" />Claiming</>
                        ) : (
                          "Claim"
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm">All tickets assigned!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews */}
        <TabsContent value="reviews">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            <Card className="border shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-medium">Pending Reviews</CardTitle>
                    <CardDescription>Reviews awaiting moderation</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link to="/admin/reviews?status=pending" className="text-xs">View all <ChevronRight className="h-3 w-3 ml-1" /></Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loadingPendingReviews ? (
                  <div className="space-y-3"><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" /></div>
                ) : pendingReviews && pendingReviews.length > 0 ? (
                  <div className="space-y-3">
                    {pendingReviews.map((review: any) => (
                      <div key={review.id} className="flex items-start justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-0.5">
                              {[...Array(5)].map((_, i) => (
                                <Star key={i} className={`h-3 w-3 ${i < review.rating ? "fill-warning text-warning" : "text-muted-foreground"}`} />
                              ))}
                            </div>
                            <span className="text-xs text-muted-foreground">{formatTimeAgo(review.created_at)}</span>
                          </div>
                          <p className="text-sm font-medium truncate mt-1">{review.facilities?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{review.review_text ? `${review.review_text.slice(0, 60)}...` : "No text"}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-success hover:text-success hover:bg-success/10"
                            title="Approve review"
                            disabled={moderatingReviewId === review.id}
                            onClick={async () => {
                              setModeratingReviewId(review.id);
                              const { error } = await supabase
                                .from("facility_reviews")
                                .update({ status: "approved" })
                                .eq("id", review.id);
                              setModeratingReviewId(null);
                              if (error) { toast.error("Failed to approve"); return; }
                              toast.success("Review approved");
                              invalidateDashboard();
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Reject review"
                            disabled={moderatingReviewId === review.id}
                            onClick={async () => {
                              setModeratingReviewId(review.id);
                              const { error } = await supabase
                                .from("facility_reviews")
                                .update({ status: "rejected" })
                                .eq("id", review.id);
                              setModeratingReviewId(null);
                              if (error) { toast.error("Failed to reject"); return; }
                              toast.success("Review rejected");
                              invalidateDashboard();
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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

            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-medium">Review Stats</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReviews ? <Skeleton className="h-20 w-full" /> : (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-3 rounded-lg bg-warning/10 border border-warning/20">
                      <AlertTriangle className="h-5 w-5 text-warning mx-auto mb-1" />
                      <div className="text-xl font-bold text-warning">{reviewStats?.pending}</div>
                      <div className="text-[10px] text-muted-foreground">Pending</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
                      <CheckCircle2 className="h-5 w-5 text-success mx-auto mb-1" />
                      <div className="text-xl font-bold text-success">{reviewStats?.approved}</div>
                      <div className="text-[10px] text-muted-foreground">Approved</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <XCircle className="h-5 w-5 text-destructive mx-auto mb-1" />
                      <div className="text-xl font-bold text-destructive">{reviewStats?.rejected}</div>
                      <div className="text-[10px] text-muted-foreground">Rejected</div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Escalations */}
        <TabsContent value="escalations">
          <Card className="border shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">My Escalations</CardTitle>
                  <CardDescription>Issues you've escalated to management</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setEscalateTicketId("")} className="gap-1.5 text-xs">
                  <ArrowUpRight className="h-3 w-3" /> New Escalation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {myEscalations && myEscalations.length > 0 ? (
                <div className="space-y-2">
                  {myEscalations.map((esc: any) => (
                    <div key={esc.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{esc.subject}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={`text-[10px] ${priorityColors[esc.priority] || ""}`}>{esc.priority}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${statusColors[esc.status] || ""}`}>{esc.status}</Badge>
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(esc.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-success" />
                  <p className="text-sm">No escalations</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {hasPermission("support") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-info/10" asChild>
              <Link to="/admin/support">
                <Headphones className="h-4 w-4 text-info mr-2 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Support Inbox</span>
                  <span className="text-xs text-muted-foreground">Manage all tickets</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("reviews") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-warning/10" asChild>
              <Link to="/admin/reviews?status=pending">
                <MessageSquare className="h-4 w-4 text-warning mr-2 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Moderate Reviews</span>
                  <span className="text-xs text-muted-foreground">{reviewStats?.pending || 0} pending</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("seekers") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-primary/10" asChild>
              <Link to="/admin/seekers">
                <Users className="h-4 w-4 text-primary mr-2 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">User Accounts</span>
                  <span className="text-xs text-muted-foreground">View seekers</span>
                </div>
              </Link>
            </Button>
          )}
          {hasPermission("providers") && (
            <Button variant="ghost" className="justify-start h-auto py-2.5 px-3 hover:bg-muted" asChild>
              <Link to="/admin/providers">
                <Building2 className="h-4 w-4 text-muted-foreground mr-2 shrink-0" />
                <div className="flex flex-col items-start min-w-0">
                  <span className="text-sm font-medium">Providers</span>
                  <span className="text-xs text-muted-foreground">Browse listings</span>
                </div>
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Escalation Dialog */}
      <Dialog open={escalateTicketId !== null} onOpenChange={(open) => !open && setEscalateTicketId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Escalate Issue</DialogTitle>
            <DialogDescription>This will be sent to Managers and Super Admins for review.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Subject</label>
              <Input
                value={escalateSubject}
                onChange={(e) => setEscalateSubject(e.target.value)}
                placeholder="Brief description of the issue"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Priority</label>
              <Select value={escalatePriority} onValueChange={setEscalatePriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Details</label>
              <Textarea
                value={escalateDescription}
                onChange={(e) => setEscalateDescription(e.target.value)}
                placeholder="Describe why this needs management attention..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEscalateTicketId(null)}>Cancel</Button>
            <Button onClick={handleEscalate} disabled={isEscalating || !escalateSubject || !escalateDescription}>
              {isEscalating ? "Escalating..." : "Escalate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      {/* Support Ticket Detail Modal - inline open from dashboard */}
      <SupportTicketModal
        ticket={selectedTicketId ? { id: selectedTicketId } as any : null}
        open={!!selectedTicketId}
        onOpenChange={(open) => { if (!open) setSelectedTicketId(null); }}
        onTicketUpdated={invalidateDashboard}
      />
    </div>
  );
}
