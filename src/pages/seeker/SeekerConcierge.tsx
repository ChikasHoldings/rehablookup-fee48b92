import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
import { validateTransition } from "@/lib/statusTransitions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  RefreshCw,
  XCircle,
  Loader2,
  ArrowLeft,
  HeartHandshake,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  PlacementStatusCard, 
  PlacementHero, 
  PlacementTabs,
  PlacementConfirmationCard,
  PlacementMatchCard,
  PlacementSupportCard,
  SeekerPlacementModal,
  SeekerProviderReviewCard,
  AdmissionStatusCard,
  AdvisorTrustCard,
} from "@/components/seeker/placement";
import { FeedbackForm } from "@/components/seeker/FeedbackForm";

import { ConciergeInlineIntake } from "@/components/seeker/ConciergeInlineIntake";
// ConciergePaymentRecovery was tied to the retired $29 paid concierge flow.
// Domestic concierge is now free; this recovery surface no longer fires.

interface ConciergeInquiry {
  id: string;
  status: string;
  created_at: string;
  intake_submitted_at: string | null;
  matched_at: string | null;
  matched_facility_ids: string[] | null;
  admin_matched_facility_ids: string[] | null;
  level_of_care: string | null;
  payment_type: string | null;
  insurance_carrier: string | null;
  timeline_urgency: string | null;
  preferred_state: string | null;
  preferred_city: string | null;
  seeker_confirmed: boolean;
  seeker_confirmed_at: string | null;
  placement_confirmed: boolean;
  placement_confirmed_at: string | null;
  placed_facility_id: string | null;
  seeker_rating: number | null;
  seeker_feedback: string | null;
  user_name: string;
  tour_coordination_status: string;
  admission_status: string;
  move_in_date: string | null;
  assigned_advisor_id: string | null;
}

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  phone: string;
  slug: string;
  logo_url: string | null;
  facility_type: string;
}

export default function SeekerConcierge() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  // Deep-link support: /account/concierge/:inquiryId is a valid route
  // (App.tsx:1364). Previously the inquiryId was silently dropped —
  // clicking "Resume" on SeekerHome landed on the concierge page but
  // selectedCase fell back to cases[0]. Now the route param seeds the
  // initial selection and stays in sync with user selections.
  const { inquiryId: routeInquiryId } = useParams<{ inquiryId?: string }>();
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(routeInquiryId ?? null);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Use non-blocking session hook instead of supabase.auth.getUser()
  const { user: currentUser, userId, isReady } = useSeekerSession();

  const userName = currentUser?.user_metadata?.full_name || 
                   currentUser?.user_metadata?.name || 
                   currentUser?.email?.split("@")[0] || 
                   "User";
  const userEmail = currentUser?.email || "";
  const userPhone = currentUser?.user_metadata?.phone || "";

  // Auto-link unlinked inquiries to current user on login (by email match).
  // Hardened:
  //   1. Surface fetch errors via console.warn (was bare try/catch)
  //   2. Parallelise link-inquiry-to-user calls (was serial in a for-loop)
  //   3. Cancellation flag so a fast remount doesn't double-link
  useEffect(() => {
    if (!userId || !userEmail) return;
    let cancelled = false;
    const linkUnlinked = async () => {
      // Payment gate removed — domestic concierge is free for seekers
      // under the EKRA flat-fee model. Auto-link any unlinked inquiry
      // matching this email.
      const { data: unlinked, error } = await supabase
        .from("concierge_inquiries")
        .select("id")
        .eq("user_email", userEmail.toLowerCase())
        .is("user_id", null);

      if (cancelled) return;
      if (error) {
        console.warn("[SeekerConcierge] auto-link lookup failed:", error.message);
        return;
      }
      if (!unlinked || unlinked.length === 0) return;

      const results = await Promise.allSettled(
        unlinked.map((inquiry) =>
          supabase.functions.invoke("link-inquiry-to-user", {
            body: { inquiryId: inquiry.id, userId },
          }),
        ),
      );
      if (cancelled) return;

      const failures = results.filter((r) => r.status === "rejected").length;
      if (failures > 0) {
        console.warn(`[SeekerConcierge] auto-link: ${failures}/${results.length} invocations rejected`);
      }
      // Any success (or even error — RLS may have already linked via
      // upstream session establish) is worth a refetch so we pick up
      // newly-visible cases.
      refetchRef.current?.();
    };
    linkUnlinked();
    return () => { cancelled = true; };
  }, [userId, userEmail]);

  const refetchRef = useRef<(() => void) | null>(null);

  // Fetch user's concierge cases
  const { data: cases, isLoading: casesLoading, isError: casesError, refetch } = useQuery({
    queryKey: ["seeker-concierge-cases", userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, status, created_at, intake_submitted_at, matched_at,
          matched_facility_ids, admin_matched_facility_ids, level_of_care, payment_type, insurance_carrier,
          timeline_urgency, preferred_state, preferred_city,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed,
          placement_confirmed_at, placed_facility_id, seeker_rating,
          seeker_feedback, user_name,
          tour_coordination_status, admission_status, move_in_date,
          assigned_advisor_id
        `)
        .eq("user_id", userId)
        // Only SUBMITTED inquiries are real placement cases. An unsubmitted
        // draft (intake_submitted_at IS NULL) — e.g. a save-placement-draft row
        // later linked to this user by email — would otherwise make
        // cases.length>=1 and render a dead "Submitted" status card with no way
        // to finish the intake. Excluding drafts routes a draft-only user to the
        // resumable intake form (STATE A) instead.
        .not("intake_submitted_at", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      // Merge matched_facility_ids and admin_matched_facility_ids for consistent visibility
      return (data || []).map(row => ({
        ...row,
        matched_facility_ids: [
          ...new Set([
            ...(row.matched_facility_ids || []),
            ...(row.admin_matched_facility_ids || []),
          ])
        ].length > 0 ? [
          ...new Set([
            ...(row.matched_facility_ids || []),
            ...(row.admin_matched_facility_ids || []),
          ])
        ] : null,
      })) as ConciergeInquiry[];
    },
    enabled: !!userId && isReady,
  });

  // Store refetch for auto-link callback
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  // Legacy `?session_id=…&payment=success` and `?payment=canceled` query
  // parameters are no longer produced by the concierge flow (domestic
  // intake is free; the $29 Stripe step was retired 2026-05-18). Strip
  // any stale instances from old bookmarks so they don't sit in the URL.
  useEffect(() => {
    const stalePayment = searchParams.get("payment");
    const staleSessionId = searchParams.get("session_id");
    if (!stalePayment && !staleSessionId) return;
    const newParams = new URLSearchParams(searchParams);
    newParams.delete("payment");
    newParams.delete("session_id");
    setSearchParams(newParams, { replace: true });
  }, [searchParams, setSearchParams]);

  // Realtime: auto-refresh when case status or matches change.
  // Listens to ALL events (was UPDATE only) so a new case submitted
  // in another tab/device shows up here within ~200ms, and case
  // deletions by the admin propagate too.
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`seeker-cases-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "concierge_inquiries",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases", userId] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, queryClient]);

  const selectedCase = cases?.find(c => c.id === selectedCaseId) || cases?.[0];

  // Keep the URL in sync with the selected case id, so:
  //   - /account/concierge/<id> deep-links land on the right case
  //   - clicking a different case in the selector below updates the
  //     URL via history.replaceState (so back/forward doesn't pile up)
  //   - the bare /account/concierge URL drops the id when only one
  //     case (or no cases) exists.
  useEffect(() => {
    if (!cases || cases.length === 0) return;
    const targetId = selectedCase?.id ?? null;
    if (!targetId) return;
    if (routeInquiryId === targetId) return;
    // Only one case + URL has no id → leave bare URL alone.
    if (cases.length === 1 && !routeInquiryId) return;
    navigate(`/account/concierge/${targetId}`, { replace: true });
  }, [selectedCase?.id, routeInquiryId, cases, navigate]);

  // Fetch matched facilities. The previous version dropped errors
  // into a generic React-Query failure that rendered as an empty
  // facilities list — visually indistinguishable from "no matches
  // yet." Now isError is surfaced inline next to the tabs.
  const {
    data: matchedFacilities,
    isError: matchedFacilitiesError,
    refetch: refetchMatched,
  } = useQuery({
    queryKey: ["matched-facilities", selectedCase?.matched_facility_ids],
    queryFn: async () => {
      if (!selectedCase?.matched_facility_ids?.length) return [];

      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, phone, slug, logo_url, facility_type")
        .in("id", selectedCase.matched_facility_ids);

      if (error) throw error;
      return (data || []) as Facility[];
    },
    enabled: !!selectedCase?.matched_facility_ids?.length,
  });

  // Fetch placed facility
  const { data: placedFacility } = useQuery({
    queryKey: ["placed-facility", selectedCase?.placed_facility_id],
    queryFn: async () => {
      if (!selectedCase?.placed_facility_id) return null;
      
      // .maybeSingle() — if the placed facility was deleted or RLS
      // hides it, returning null is better UX than throwing through to
      // the error boundary. The placement card already handles a
      // missing facility gracefully.
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, phone, slug, logo_url, facility_type")
        .eq("id", selectedCase.placed_facility_id)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as Facility | null;
    },
    enabled: !!selectedCase?.placed_facility_id,
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback: string }) => {
      if (selectedCase?.seeker_feedback || feedbackSubmitted) {
        throw new Error("Feedback already submitted");
      }

      if (!userId) throw new Error("Not authenticated");

      // .maybeSingle() — if the UPDATE matched zero rows (another tab
      // already submitted feedback, or the case status moved out from
      // under the conditional `.is(seeker_feedback, null)` filter),
      // data will be null and we throw a friendly "already submitted"
      // instead of a bare PostgrestError from .single()'s "no rows
      // returned" error.
      const { data, error } = await supabase
        .from("concierge_inquiries")
        .update({ seeker_rating: rating, seeker_feedback: feedback })
        .eq("id", selectedCase!.id)
        .eq("user_id", userId)
        .is("seeker_feedback", null)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!data) throw new Error("Feedback already submitted");

      return data;
    },
    onSuccess: () => {
      setFeedbackSubmitted(true);
      toast.success("Thank you! Your feedback has been submitted.");
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
    },
    onError: (error) => {
      if (error.message.includes("already submitted")) {
        toast.info("Your feedback was already recorded.");
        queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
      } else {
        toast.error("Failed to submit feedback. Please try again.");
      }
    },
  });

  // Cancel case mutation - verified against current user
  const cancelCaseMutation = useMutation({
    mutationFn: async () => {
      if (!selectedCase) throw new Error("No case selected");
      if (!userId) throw new Error("Not authenticated");

      // Run the same client-side state-machine guard the admin path uses,
      // so we surface a clear message instead of an opaque DB rejection if
      // the case has already advanced past a closeable stage.
      const check = validateTransition("concierge", selectedCase.status, "closed");
      if (!check.ok) {
        throw new Error(
          check.reason ||
            "This case can no longer be cancelled — please contact your advisor."
        );
      }

      // Only allow cancellation of own cases (RLS enforces this too).
      // The .eq("status", fromStatus) clause acts as an optimistic lock so
      // we never blindly overwrite a status that has shifted under us.
      const { data: updated, error } = await supabase
        .from("concierge_inquiries")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", selectedCase.id)
        .eq("user_id", userId)
        .eq("status", selectedCase.status)
        .select("id")
        .maybeSingle();

      if (error) throw error;
      if (!updated) {
        // Optimistic-lock failed: the case advanced under us. Don't
        // log a "seeker_cancelled" event or send the notification —
        // they'd be inaccurate. Return a structured sentinel so
        // onSuccess can show the right message.
        return { cancelled: false as const };
      }

      // Log case event
      const { error: eventErr } = await supabase
        .from("concierge_case_events")
        .insert({
          inquiry_id: selectedCase.id,
          event_type: "seeker_cancelled",
          event_data: { reason: "Cancelled by seeker" },
          actor_type: "seeker",
          actor_id: userId,
        });
      if (eventErr) {
        // The cancel itself succeeded; an event-log failure shouldn't
        // bubble up as a user-visible error, but log it for ops.
        console.warn(
          "[SeekerConcierge] cancel event log failed (cancel still applied):",
          eventErr.message,
        );
      }

      // Notify admin/advisor of cancellation (non-blocking)
      supabase.functions.invoke("send-concierge-notifications", {
        body: {
          type: "seeker_cancelled",
          inquiryId: selectedCase.id,
        },
      }).catch((e) => console.error("Cancel notification error:", e));

      return { cancelled: true as const };
    },
    onSuccess: (result) => {
      if (result?.cancelled === false) {
        toast.info("Your case has moved forward in another tab — refreshing the view.");
      } else {
        toast.success("Your request has been cancelled.");
      }
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
    },
    onError: (error) => {
      toast.error(error.message || "Failed to cancel request. Please try again.");
    },
  });

  // Loading state
  if (casesLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  // Error state
  if (casesError) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="py-12 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-3" />
            <h2 className="text-lg font-semibold mb-1">Unable to load your placement cases</h2>
            <p className="text-sm text-muted-foreground mb-4">
              This may be a temporary issue. Please try again.
            </p>
            <Button variant="outline" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== STATE A: No case yet ==========
  if (!cases?.length) {
    if (currentUser) {
      return (
        <>
          <Helmet>
            <title>Placement Network | RehabLookup</title>
            <meta name="description" content="Get personalized treatment center placement with our professional placement service." />
            <meta name="robots" content="noindex, nofollow" />
          </Helmet>
          <div className="container max-w-4xl py-6 space-y-6">
            <AnimatePresence mode="wait">
              {showIntakeFlow ? (
                <motion.div
                  key="intake"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <Button 
                    variant="ghost" 
                    onClick={() => setShowIntakeFlow(false)}
                    className="gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </Button>
                  <ConciergeInlineIntake 
                    userEmail={userEmail} 
                    userName={userName}
                    userPhone={userPhone}
                    userId={currentUser?.id}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="hero"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <PlacementHero onGetStarted={() => setShowIntakeFlow(true)} />
                  <PlacementSupportCard />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </>
      );
    }

    // Not logged in
    return (
      <>
        <Helmet>
          <title>Placement Network | RehabLookup</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <div className="container max-w-4xl py-8 text-center space-y-6">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <HeartHandshake className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Personalized Placement Assistance</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Get connected with treatment centers that fit your needs. Sign in to get started.
          </p>
          <Button size="lg" onClick={() => navigate("/concierge")} className="gap-2">
            Get Started
          </Button>
        </div>
      </>
    );
  }

  // ========== STATE B & C: Case exists ==========
   const showMatchedFacilities = selectedCase &&
    ["matching_providers", "matched", "provider_prequalification", "providers_accepted", "presented_to_seeker", "seeker_selected", "admission_in_progress"].includes(selectedCase.status);
  // Brokerage model: admin confirms placement on behalf of both parties
  // Show provider review when seeker can select from interested facilities
  const showProviderReview = selectedCase?.status === "presented_to_seeker" || selectedCase?.status === "seeker_selected";
  const isTerminalSuccess = ["admitted", "billed", "completed"].includes(selectedCase?.status || "");
  const isClosed = selectedCase?.status === "closed";
  const showFeedback = isTerminalSuccess && !selectedCase?.seeker_feedback && !feedbackSubmitted;
  const hasMatches = matchedFacilities && matchedFacilities.length > 0;

  return (
    <>
      <Helmet>
        <title>Placement Network | RehabLookup</title>
        <meta name="description" content="Track your placement progress and communicate with your assigned treatment facilities." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      
      <div className="container max-w-4xl py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Placement Network</h1>
            <p className="text-muted-foreground text-sm">Track your placement progress</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            
            {selectedCase && selectedCase.status !== "closed" && !["admitted", "billed", "completed"].includes(selectedCase.status) && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    disabled={cancelCaseMutation.isPending}
                  >
                    {cancelCaseMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancel your placement request?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will close your case and stop the placement process. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Keep Request</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => cancelCaseMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Cancel Request
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>

        {/* Case Selector (when multiple). Small list = buttons; long
            list = dropdown so it doesn't wrap into a wall of pills. */}
        {cases.length > 1 && cases.length <= 3 && (
          <div className="flex gap-2 flex-wrap">
            {cases.map((c) => {
              const isActive = (selectedCase?.id === c.id);
              return (
                <Button
                  key={c.id}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCaseId(c.id)}
                  aria-label={`Switch to case ${c.id.slice(0, 8).toUpperCase()}`}
                  aria-pressed={isActive}
                >
                  Case #{c.id.slice(0, 8).toUpperCase()}
                </Button>
              );
            })}
          </div>
        )}
        {cases.length > 3 && (
          <div className="flex items-center gap-2">
            <label htmlFor="concierge-case-select" className="text-sm text-muted-foreground">
              Case:
            </label>
            <Select
              value={selectedCase?.id ?? cases[0].id}
              onValueChange={(v) => setSelectedCaseId(v)}
            >
              <SelectTrigger id="concierge-case-select" className="w-72" aria-label="Select placement case">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {cases.map((c) => {
                  const date = new Date(c.created_at);
                  const dateLabel = date.toLocaleDateString(undefined, {
                    month: "short", day: "numeric", year: "numeric",
                  });
                  const statusLabel = c.status.replace(/_/g, " ");
                  return (
                    <SelectItem key={c.id} value={c.id}>
                      <span className="font-mono text-xs mr-2">#{c.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-xs text-muted-foreground">{dateLabel} · {statusLabel}</span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Status Card */}
        {selectedCase && (
          <div 
            className="cursor-pointer hover:shadow-lg transition-shadow rounded-xl"
            onClick={() => setDetailModalOpen(true)}
          >
            <PlacementStatusCard caseData={selectedCase} />
          </div>
        )}

        {/* Advisor Trust Layer */}
        {selectedCase && (
          <AdvisorTrustCard
            advisorId={selectedCase.assigned_advisor_id}
            caseStatus={selectedCase.status}
            inquiryId={selectedCase.id}
          />
        )}

        {/* Closed Case */}
        {isClosed && selectedCase && (
          <Card className="bg-muted/30 border-muted">
            <CardContent className="py-8 text-center space-y-3">
              <XCircle className="h-10 w-10 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-semibold text-muted-foreground">Request Closed</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                This placement request has been closed. If you'd like to start a new request, click below.
              </p>
              <Button variant="outline" onClick={() => navigate("/concierge/intake")} className="mt-2">
                Start New Request
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Placed / Admitted Facility */}
        {isTerminalSuccess && placedFacility && (
          <div className="space-y-4">
            <PlacementConfirmationCard type="confirmed" facilityName={placedFacility.name} />
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Your Treatment Center</CardTitle>
              </CardHeader>
              <CardContent>
                <PlacementMatchCard facility={placedFacility} isPlaced />
              </CardContent>
            </Card>
            
            {/* Admission & Move-In Status */}
            <AdmissionStatusCard
              tourStatus={selectedCase.tour_coordination_status}
              admissionStatus={selectedCase.admission_status}
              moveInDate={selectedCase.move_in_date}
            />
          </div>
        )}

        {/* Matched-facilities fetch error: surfaced inline so the
            seeker knows their match list couldn't load (rather than
            being silently empty). */}
        {showMatchedFacilities && matchedFacilitiesError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/40 bg-destructive/5 p-3 flex items-start gap-3"
          >
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-destructive">
                Couldn't load your matched facilities
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Your advisor still has them — this is just a display issue. Try again.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchMatched()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Retry
            </Button>
          </div>
        )}

        {/* Tabs for active cases */}
        {showMatchedFacilities && !showProviderReview && (
          <PlacementTabs
            inquiryId={selectedCase!.id}
            matchedFacilityIds={selectedCase!.matched_facility_ids}
            matchedFacilities={matchedFacilities}
          />
        )}

        {/* Seeker reviews and selects from interested facilities */}
        {showProviderReview && selectedCase && (
          <>
            <SeekerProviderReviewCard
              inquiryId={selectedCase.id}
              onConfirmed={() => {
                queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases", userId] });
              }}
            />
            <PlacementTabs 
              inquiryId={selectedCase.id}
              matchedFacilityIds={selectedCase.matched_facility_ids}
              matchedFacilities={matchedFacilities}
            />
          </>
        )}

        {/* Seeker confirmed, awaiting admin final confirmation */}
        {selectedCase?.seeker_confirmed && !selectedCase.placement_confirmed && !isTerminalSuccess && (
          <>
            <PlacementConfirmationCard type="awaiting_admin" />
            <AdmissionStatusCard
              tourStatus={selectedCase.tour_coordination_status}
              admissionStatus={selectedCase.admission_status}
              moveInDate={selectedCase.move_in_date}
            />
          </>
        )}

        {/* Feedback */}
        {showFeedback && (
          <Card>
            <CardHeader>
              <CardTitle>How was your experience?</CardTitle>
              <CardDescription>Your feedback helps us improve.</CardDescription>
            </CardHeader>
            <CardContent>
              <FeedbackForm 
                onSubmit={(rating, feedback) => feedbackMutation.mutate({ rating, feedback })}
                isSubmitting={feedbackMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Already gave feedback */}
        {selectedCase?.seeker_feedback && (
          <Card className="bg-muted/30">
            <CardContent className="py-6">
              <p className="text-sm text-muted-foreground">
                Thank you for your feedback! You rated your experience {selectedCase.seeker_rating}/5 stars.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Support Card */}
        <PlacementSupportCard />

        {/* Case Detail Modal */}
        <SeekerPlacementModal
          caseData={selectedCase || null}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      </div>
    </>
  );
}
