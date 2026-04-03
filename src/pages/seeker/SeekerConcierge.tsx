import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useSeekerSession } from "@/hooks/useSeekerSession";
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
  AlertTriangle
} from "lucide-react";
import { 
  PlacementStatusCard, 
  PlacementHero, 
  PlacementTabs,
  PlacementConfirmationCard,
  PlacementMatchCard,
  PlacementSupportCard,
  SeekerPlacementModal,
} from "@/components/seeker/placement";
import { FeedbackForm } from "@/components/seeker/FeedbackForm";

import { ConciergeInlineIntake } from "@/components/seeker/ConciergeInlineIntake";
import { ConciergePaymentRecovery } from "@/components/seeker/ConciergePaymentRecovery";

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
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  // Brokerage model — advisor coordinates all contact
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  const userName = currentUser?.user_metadata?.full_name || 
                   currentUser?.user_metadata?.name || 
                   currentUser?.email?.split("@")[0] || 
                   "User";
  const userEmail = currentUser?.email || "";
  const userPhone = currentUser?.user_metadata?.phone || "";

  // Fetch user's concierge cases
  const { data: cases, isLoading: casesLoading, isError: casesError, refetch } = useQuery({
    queryKey: ["seeker-concierge-cases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, status, created_at, intake_submitted_at, matched_at,
          matched_facility_ids, admin_matched_facility_ids, level_of_care, payment_type, insurance_carrier,
          timeline_urgency, preferred_state, preferred_city,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed,
          placement_confirmed_at, placed_facility_id, seeker_rating,
          seeker_feedback, user_name
        `)
        .eq("user_id", user.id)
        .in("payment_status", ["paid", "succeeded"])
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
  });

  // Payment verification
  const verifyPaymentAndSubmit = useCallback(async (sessionId: string) => {
    setIsVerifyingPayment(true);
    
    const storeFailedSubmission = (data: any, error: string) => {
      localStorage.setItem("concierge_failed_submission", JSON.stringify({
        sessionId, data, error, timestamp: Date.now(),
      }));
    };

    try {
      const { data: verifyData, error: verifyError } = await supabase.functions.invoke("verify-concierge-payment", {
        body: { sessionId }
      });

      if (verifyError) throw verifyError;

      if (verifyData?.alreadySubmitted) {
        toast.success("Your intake was already submitted!");
        localStorage.removeItem("concierge_pending_intake");
        localStorage.removeItem("concierge_failed_submission");
        refetch();
        return;
      }

      if (verifyData?.paid) {
        const pendingIntake = localStorage.getItem("concierge_pending_intake");
        if (pendingIntake) {
          const { formData, userName, userEmail, userPhone } = JSON.parse(pendingIntake);
          
          const intakePayload = {
            sessionId,
            intakeData: {
              ...formData,
              decisionMakerName: userName,
              email: userEmail,
              phone: userPhone || "",
            },
            userId: currentUser?.id,
          };

          const { error: submitError } = await supabase.functions.invoke("submit-concierge-intake", {
            body: intakePayload,
          });

          if (submitError) {
            storeFailedSubmission(intakePayload, submitError.message);
            throw submitError;
          }

          localStorage.removeItem("concierge_pending_intake");
          localStorage.removeItem("concierge_failed_submission");
          
          toast.success("Your intake has been submitted! We'll be in touch soon.");
          refetch();
        } else {
          const failedSubmission = localStorage.getItem("concierge_failed_submission");
          if (failedSubmission) {
            const { data: failedData } = JSON.parse(failedSubmission);
            if (failedData?.sessionId === sessionId) {
              const { error: retryError } = await supabase.functions.invoke("submit-concierge-intake", {
                body: failedData,
              });

              if (!retryError) {
                localStorage.removeItem("concierge_failed_submission");
                toast.success("Your intake has been submitted! We'll be in touch soon.");
                refetch();
              } else {
                throw retryError;
              }
            }
          } else {
            toast.success("Payment verified! Please complete the intake form.");
          }
        }
      }

      const newParams = new URLSearchParams(searchParams);
      newParams.delete("session_id");
      newParams.delete("payment");
      setSearchParams(newParams, { replace: true });
    } catch (err) {
      console.error("Payment verification error:", err);
      toast.error("Failed to submit intake. Please email placement@rehablookup.com for assistance.");
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [refetch, searchParams, setSearchParams, currentUser?.id]);

  // Check for payment return
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const paymentStatus = searchParams.get("payment");
    
    if (sessionId && paymentStatus === "success" && !isVerifyingPayment) {
      verifyPaymentAndSubmit(sessionId);
    } else if (paymentStatus === "canceled") {
      toast.error("Payment was canceled. Please try again.");
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("payment");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, isVerifyingPayment, verifyPaymentAndSubmit, setSearchParams]);

  // Realtime: auto-refresh when case status or matches change
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`seeker-cases-${currentUser.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "concierge_inquiries",
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentUser?.id, queryClient]);

  const selectedCase = cases?.find(c => c.id === selectedCaseId) || cases?.[0];

  // Fetch matched facilities
  const { data: matchedFacilities } = useQuery({
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
      
      const { data, error } = await supabase
        .from("facilities")
        .select("id, name, city, state, phone, slug, logo_url, facility_type")
        .eq("id", selectedCase.placed_facility_id)
        .single();
      
      if (error) throw error;
      return data as Facility;
    },
    enabled: !!selectedCase?.placed_facility_id,
  });

  // Feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback: string }) => {
      if (selectedCase?.seeker_feedback || feedbackSubmitted) {
        throw new Error("Feedback already submitted");
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .update({ seeker_rating: rating, seeker_feedback: feedback })
        .eq("id", selectedCase!.id)
        .eq("user_id", user.id)
        .is("seeker_feedback", null)
        .select("id")
        .single();
      
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Only allow cancellation of own cases (RLS enforces this too)
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({ status: "closed", closed_at: new Date().toISOString() })
        .eq("id", selectedCase.id)
        .eq("user_id", user.id);
      
      if (error) throw error;

      await supabase.from("concierge_case_events").insert({
        inquiry_id: selectedCase.id,
        event_type: "seeker_cancelled",
        event_data: { reason: "Cancelled by seeker" },
        actor_type: "seeker",
        actor_id: user.id,
      });
    },
    onSuccess: () => {
      toast.success("Your request has been cancelled.");
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
    },
    onError: () => {
      toast.error("Failed to cancel request. Please try again.");
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
    if (isVerifyingPayment) {
      return (
        <div className="container max-w-4xl py-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      );
    }

    if (currentUser) {
      return (
        <>
          <Helmet>
            <title>Placement Network | RehabLookup</title>
            <meta name="description" content="Get personalized treatment center placement with our professional placement service." />
            <meta name="robots" content="noindex, nofollow" />
          </Helmet>
          <div className="container max-w-4xl py-6 space-y-6">
            <ConciergePaymentRecovery userId={currentUser.id} onRecoveryComplete={() => refetch()} />
            
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
    ["matching", "matched", "introductions_sent", "in_contact", "confirming", "placed"].includes(selectedCase.status);
  // Brokerage model: admin confirms placement on behalf of both parties
  // Show "in contact" info card when case is in_contact (advisor coordinating)
  const showInContactInfo = selectedCase?.status === "in_contact";
  const showFeedback = selectedCase?.status === "placed" && !selectedCase.seeker_feedback && !feedbackSubmitted;
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
            
            {selectedCase && selectedCase.status !== "closed" && selectedCase.status !== "placed" && (
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

        {/* Case Selector (if multiple) */}
        {cases.length > 1 && (
          <div className="flex gap-2 flex-wrap">
            {cases.map((c) => (
              <Button
                key={c.id}
                variant={selectedCaseId === c.id || (!selectedCaseId && c.id === cases[0].id) ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCaseId(c.id)}
              >
                Case #{c.id.slice(0, 8).toUpperCase()}
              </Button>
            ))}
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

        {/* Placed Facility */}
        {selectedCase?.status === "placed" && placedFacility && (
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
          </div>
        )}

        {/* Tabs for active cases */}
        {showMatchedFacilities && selectedCase?.status !== "placed" && (
          <PlacementTabs 
            inquiryId={selectedCase.id}
            matchedFacilityIds={selectedCase.matched_facility_ids}
            matchedFacilities={matchedFacilities}
          />
        )}

        {/* In Contact - Advisor is coordinating with facilities */}
        {showInContactInfo && (
          <PlacementConfirmationCard type="ready" />
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
