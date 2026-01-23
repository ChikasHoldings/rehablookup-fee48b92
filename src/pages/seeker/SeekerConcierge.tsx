import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { 
  Clock, 
  Search, 
  Users, 
  Send, 
  CheckCircle, 
  XCircle,
  ArrowRight,
  Calendar,
  MapPin,
  CreditCard,
  HeartHandshake,
  RefreshCw,
  MessageCircle,
  CalendarDays,
  ThumbsDown,
  Loader2,
  Mail
} from "lucide-react";
import { format } from "date-fns";
import { CaseStatusTimeline } from "@/components/seeker/CaseStatusTimeline";
import { MatchedFacilityCard } from "@/components/seeker/MatchedFacilityCard";
import { ConfirmAdmissionModal } from "@/components/seeker/ConfirmAdmissionModal";
import { FeedbackForm } from "@/components/seeker/FeedbackForm";
import { TourRequestModal } from "@/components/seeker/TourRequestModal";
import { ConciergeToursList } from "@/components/seeker/ConciergeToursList";
import { ConciergeMessaging } from "@/components/seeker/ConciergeMessaging";
import { ConciergeInlineIntake } from "@/components/seeker/ConciergeInlineIntake";
import { ConciergeLandingContent } from "@/components/seeker/ConciergeLandingContent";
import { ConciergePaymentRecovery } from "@/components/seeker/ConciergePaymentRecovery";
import { TourTabsSection } from "@/components/seeker/TourTabsSection";

interface ConciergeInquiry {
  id: string;
  status: string;
  created_at: string;
  intake_submitted_at: string | null;
  matched_at: string | null;
  matched_facility_ids: string[] | null;
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

const STATUS_CONFIG: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  new: { label: "Submitted", icon: Clock, color: "bg-blue-500" },
  reviewing: { label: "Reviewing", icon: Search, color: "bg-yellow-500" },
  matching: { label: "Finding Matches", icon: Users, color: "bg-purple-500" },
  introductions_sent: { label: "Introductions Sent", icon: Send, color: "bg-indigo-500" },
  in_contact: { label: "In Contact", icon: MessageCircle, color: "bg-teal-500" },
  confirming: { label: "Awaiting Confirmation", icon: Clock, color: "bg-amber-500" },
  placed: { label: "Placed", icon: CheckCircle, color: "bg-green-500" },
  closed: { label: "Closed", icon: XCircle, color: "bg-muted-foreground" },
};

const TIMELINE_STEPS = ["new", "reviewing", "matching", "introductions_sent", "in_contact", "placed"];

const HOW_IT_WORKS_STEPS = [
  {
    step: 1,
    title: "Tell Us About Your Needs",
    description: "Complete a brief intake form about your situation, preferences, and treatment goals.",
  },
  {
    step: 2,
    title: "Our Specialists Review Your Case",
    description: "A dedicated placement advisor reviews your information and identifies the best matches.",
  },
  {
    step: 3,
    title: "We Connect You With Facilities",
    description: "We introduce you to matched treatment centers that fit your specific needs.",
  },
  {
    step: 4,
    title: "Coordinate Tours and Calls",
    description: "Schedule tours, ask questions, and communicate directly with facilities.",
  },
  {
    step: 5,
    title: "Get Admitted With Support",
    description: "We help coordinate your admission and ensure a smooth transition to treatment.",
  },
];

export default function SeekerConcierge() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast: toastHook } = useToast();
  const queryClient = useQueryClient();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [tourModalFacility, setTourModalFacility] = useState<Facility | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [showIntakeFlow, setShowIntakeFlow] = useState(false);
  const previousStatusRef = useRef<Record<string, string>>({});

  // Fetch current user
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    },
  });

  // Get user display name from metadata or email
  const userName = currentUser?.user_metadata?.full_name || 
                   currentUser?.user_metadata?.name || 
                   currentUser?.email?.split("@")[0] || 
                   "User";
  const userEmail = currentUser?.email || "";
  const userPhone = currentUser?.user_metadata?.phone || "";

  // Fetch user's concierge cases
  const { data: cases, isLoading: casesLoading, refetch } = useQuery({
    queryKey: ["seeker-concierge-cases"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("concierge_inquiries")
        .select(`
          id, status, created_at, intake_submitted_at, matched_at,
          matched_facility_ids, level_of_care, payment_type, insurance_carrier,
          timeline_urgency, preferred_state, preferred_city,
          seeker_confirmed, seeker_confirmed_at, placement_confirmed,
          placement_confirmed_at, placed_facility_id, seeker_rating,
          seeker_feedback, user_name
        `)
        .eq("user_id", user.id)
        .eq("payment_status", "paid")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ConciergeInquiry[];
    },
  });

  // Note: Real-time subscription removed - users are notified via email/SMS instead

  // Handle payment verification from Stripe redirect
  const verifyPaymentAndSubmit = useCallback(async (sessionId: string) => {
    setIsVerifyingPayment(true);
    
    // Helper to store failed submission for retry
    const storeFailedSubmission = (data: any, error: string) => {
      localStorage.setItem("concierge_failed_submission", JSON.stringify({
        sessionId,
        data,
        error,
        timestamp: Date.now(),
      }));
    };

    try {
      // Verify payment
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
        // Get pending intake data from localStorage
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
            userId: currentUser?.id, // Pass user ID for linking
          };

          // Submit the intake with retry logic
          const { data: submitData, error: submitError } = await supabase.functions.invoke("submit-concierge-intake", {
            body: intakePayload,
          });

          if (submitError) {
            // Store for potential retry
            storeFailedSubmission(intakePayload, submitError.message);
            throw submitError;
          }

          // Clear pending data on success
          localStorage.removeItem("concierge_pending_intake");
          localStorage.removeItem("concierge_failed_submission");
          
          toast.success("Your intake has been submitted! We'll be in touch soon.");
          refetch();
        } else {
          // Check for failed submission to retry
          const failedSubmission = localStorage.getItem("concierge_failed_submission");
          if (failedSubmission) {
            const { data: failedData } = JSON.parse(failedSubmission);
            if (failedData?.sessionId === sessionId) {
              // Retry failed submission
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

      // Clear URL params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("session_id");
      newParams.delete("payment");
      setSearchParams(newParams, { replace: true });
    } catch (err) {
      console.error("Payment verification error:", err);
      toast.error("Failed to submit intake. Your payment was successful - please email placement@rehablookup.com for assistance.");
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

  // Fetch placed facility details
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

  // Submit feedback mutation
  const feedbackMutation = useMutation({
    mutationFn: async ({ rating, feedback }: { rating: number; feedback: string }) => {
      const { error } = await supabase
        .from("concierge_inquiries")
        .update({
          seeker_rating: rating,
          seeker_feedback: feedback,
        })
        .eq("id", selectedCase!.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Thank you! Your feedback has been submitted.");
      queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
    },
    onError: () => {
      toast.error("Failed to submit feedback. Please try again.");
    },
  });

  if (casesLoading) {
    return (
      <div className="container max-w-4xl py-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  // ========== STATE A: No concierge case yet ==========
  if (!cases?.length) {
    // Show loading if verifying payment
    if (isVerifyingPayment) {
      return (
        <div className="container max-w-4xl py-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying your payment...</p>
        </div>
      );
    }

    // Logged-in user: show landing page OR intake flow based on state
    if (currentUser) {
      return (
        <div className="container max-w-4xl py-8 space-y-8">
          {/* Payment Recovery Component - shows only if there's a failed submission */}
          <ConciergePaymentRecovery 
            userId={currentUser.id} 
            onRecoveryComplete={() => refetch()} 
          />
          
          {showIntakeFlow ? (
            <>
              {/* Back button */}
              <Button 
                variant="ghost" 
                onClick={() => setShowIntakeFlow(false)}
                className="gap-2"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Back to Overview
              </Button>
              
              {/* Inline Intake Form */}
              <ConciergeInlineIntake 
                userEmail={userEmail} 
                userName={userName}
                userPhone={userPhone}
                userId={currentUser?.id}
              />
            </>
          ) : (
            <>
              {/* Landing Page Content */}
              <ConciergeLandingContent onStartFlow={() => setShowIntakeFlow(true)} />
              
              {/* Email Support Card */}
              <Card className="bg-muted/30">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Questions about concierge?</p>
                      <p className="text-sm text-muted-foreground">Our team is here to help.</p>
                    </div>
                  </div>
                  <Button variant="outline" asChild>
                    <a href="mailto:placement@rehablookup.com">Email Support</a>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      );
    }

    // Non-logged in user: redirect to public concierge page
    return (
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
            <HeartHandshake className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Personalized Placement Assistance</h1>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            Let our specialists guide you to the right treatment center. We handle the research, 
            introductions, and coordination so you can focus on recovery.
          </p>
        </div>

        {/* How It Works */}
        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
            <CardDescription>
              Our concierge service simplifies your treatment search in 5 simple steps
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {HOW_IT_WORKS_STEPS.map((step, index) => (
                <div key={step.step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-white font-bold text-sm">
                      {step.step}
                    </div>
                    {index < HOW_IT_WORKS_STEPS.length - 1 && (
                      <div className="w-0.5 h-full bg-border mt-2" />
                    )}
                  </div>
                  <div className="pb-6">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* CTA */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-8 text-center space-y-4">
            <h2 className="text-xl font-semibold">Ready to Get Started?</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Complete our intake form and a placement specialist will be assigned to your case.
            </p>
            <Button size="lg" onClick={() => navigate("/concierge")} className="gap-2">
              Start Placement Request
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        {/* Email Support Card */}
        <Card className="bg-muted/30">
          <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Questions about concierge?</p>
                <p className="text-sm text-muted-foreground">Our team is here to help.</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href="mailto:placement@rehablookup.com">Email Support</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ========== STATE B & C: Case exists ==========
  const currentStatusConfig = STATUS_CONFIG[selectedCase?.status || "new"];
  const showMatchedFacilities = selectedCase && 
    ["matching", "introductions_sent", "in_contact", "confirming", "placed"].includes(selectedCase.status);
  const showConfirmation = selectedCase?.status === "in_contact" && !selectedCase.seeker_confirmed;
  const showAwaitingProvider = selectedCase?.seeker_confirmed && !selectedCase.placement_confirmed;
  const showFeedback = selectedCase?.status === "placed" && !selectedCase.seeker_feedback;
  const hasMatches = matchedFacilities && matchedFacilities.length > 0;

  return (
    <div className="container max-w-4xl py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Concierge Hub</h1>
          <p className="text-muted-foreground">Track your placement progress and communicate with facilities</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
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

      {/* Main Case Card */}
      {selectedCase && (
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-3">
                  Case #{selectedCase.id.slice(0, 8).toUpperCase()}
                  <Badge className={`${currentStatusConfig.color} text-white`}>
                    {currentStatusConfig.label}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  Submitted {format(new Date(selectedCase.created_at), "MMMM d, yyyy")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Timeline */}
            <CaseStatusTimeline 
              currentStatus={selectedCase.status} 
              steps={TIMELINE_STEPS}
              statusConfig={STATUS_CONFIG}
            />

            {/* Case Details Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
              {selectedCase.level_of_care && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">Care Type</p>
                  <p className="text-sm font-medium capitalize">{selectedCase.level_of_care.replace(/_/g, ' ')}</p>
                </div>
              )}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <CreditCard className="h-3 w-3" /> Payment
                </p>
                <p className="text-sm font-medium capitalize">
                  {selectedCase.payment_type === "insurance" 
                    ? selectedCase.insurance_carrier || "Insurance"
                    : selectedCase.payment_type?.replace(/_/g, ' ') || "Not specified"}
                </p>
              </div>
              {selectedCase.timeline_urgency && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Urgency
                  </p>
                  <p className="text-sm font-medium capitalize">{selectedCase.timeline_urgency.replace(/_/g, ' ')}</p>
                </div>
              )}
              {(selectedCase.preferred_city || selectedCase.preferred_state) && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> Location
                  </p>
                  <p className="text-sm font-medium">
                    {[selectedCase.preferred_city, selectedCase.preferred_state].filter(Boolean).join(", ")}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Placed Facility */}
      {selectedCase?.status === "placed" && placedFacility && (
        <Card className="border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700 dark:text-green-400">
              <CheckCircle className="h-5 w-5" />
              Successfully Placed
            </CardTitle>
            <CardDescription>
              Congratulations! You've been placed at the following facility.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MatchedFacilityCard facility={placedFacility} isPlaced />
          </CardContent>
        </Card>
      )}

      {/* Tabs for Matches, Tours, Messages - STATE C */}
      {showMatchedFacilities && selectedCase?.status !== "placed" && (
        <TourTabsSection 
          selectedCase={selectedCase}
          matchedFacilities={matchedFacilities}
          hasMatches={hasMatches}
          setTourModalFacility={setTourModalFacility}
        />
      )}

      {/* Awaiting Provider Confirmation */}
      {showAwaitingProvider && (
        <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
          <CardContent className="flex items-center gap-4 py-6">
            <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-700 dark:text-amber-400">
                Awaiting Facility Confirmation
              </h3>
              <p className="text-sm text-muted-foreground">
                You've confirmed your admission. We're waiting for the facility to confirm as well.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Section */}
      {showConfirmation && hasMatches && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Ready to Confirm?
            </CardTitle>
            <CardDescription>
              Have you been admitted to one of the matched facilities? Let us know!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowConfirmModal(true)} className="gap-2">
              Confirm My Admission
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Feedback Section */}
      {showFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>How was your experience?</CardTitle>
            <CardDescription>
              Your feedback helps us improve our concierge service for others.
            </CardDescription>
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

      {/* Email Support Card - No Phone */}
      <Card className="bg-muted/30">
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Questions about your case?</p>
              <p className="text-sm text-muted-foreground">Our specialists are here to help.</p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <a href="mailto:placement@rehablookup.com">Email Support</a>
          </Button>
        </CardContent>
      </Card>

      {/* Tour Request Modal */}
      {tourModalFacility && selectedCase && (
        <TourRequestModal
          open={!!tourModalFacility}
          onClose={() => setTourModalFacility(null)}
          inquiryId={selectedCase.id}
          facilityId={tourModalFacility.id}
          facilityName={tourModalFacility.name}
        />
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && selectedCase && matchedFacilities && (
        <ConfirmAdmissionModal
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          inquiryId={selectedCase.id}
          facilities={matchedFacilities}
          onConfirmed={() => {
            setShowConfirmModal(false);
            queryClient.invalidateQueries({ queryKey: ["seeker-concierge-cases"] });
          }}
        />
      )}
    </div>
  );
}
