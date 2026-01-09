import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, ArrowLeft, ArrowRight, Loader2, Save, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Step components
import { StepWhoNeedsHelp } from "@/components/concierge/StepWhoNeedsHelp";
import { StepCareNeed } from "@/components/concierge/StepCareNeed";
import { StepLogistics } from "@/components/concierge/StepLogistics";
import { StepPaymentInfo } from "@/components/concierge/StepPaymentInfo";
import { StepContact } from "@/components/concierge/StepContact";
import { StepReviewSubmit } from "@/components/concierge/StepReviewSubmit";
import { IntakeProgress } from "@/components/concierge/IntakeProgress";

export interface ConciergeIntakeData {
  // Step 1: Who needs help
  ageRange: string;
  gender: string;
  preferredLanguage: string;
  state: string;
  city: string;
  currentLivingSituation: string;
  relationship: string;
  mobilityNeeds: string;
  
  // Step 2: Care need
  primaryConcern: string;
  substanceUseFrequency: string;
  substanceUseDuration: string;
  detoxNeeded: string;
  levelOfCare: string;
  priorTreatment: boolean | null;
  priorTreatmentNotes: string;
  currentMedications: string;
  coOccurringConcerns: string[];
  suicideHistory: string;
  
  // Step 3: Logistics
  desiredState: string;
  desiredCity: string;
  radiusMiles: number;
  preferredEnvironment: string;
  timeline: string;
  faithBasedPreference: string;
  holisticInterest: boolean;
  amenityPreferences: string[];
  needsTransport: boolean;
  assessmentPreference: string;
  
  // Step 4: Payment
  paymentType: string;
  insuranceCarrier: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  employerName: string;
  benefitsVerified: boolean;
  budgetRange: string;
  scholarshipInterest: boolean;
  willingToTravel: boolean;
  
  // Step 5: Contact
  decisionMakerName: string;
  phone: string;
  email: string;
  bestTimeToCall: string;
  alternativeContactName: string;
  alternativeContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  referralSource: string;
  hipaaConsent: boolean;
}

interface PaymentState {
  sessionId: string | null;
  paid: boolean;
  verifiedAt: string | null;
}

const STORAGE_KEY = "concierge_intake_draft";
const PAYMENT_STATE_KEY = "concierge_payment_state";
const SUBMITTED_SESSIONS_KEY = "concierge_submitted_sessions";

const initialData: ConciergeIntakeData = {
  ageRange: "",
  gender: "",
  preferredLanguage: "english",
  state: "",
  city: "",
  currentLivingSituation: "",
  relationship: "self",
  mobilityNeeds: "",
  primaryConcern: "",
  substanceUseFrequency: "",
  substanceUseDuration: "",
  detoxNeeded: "",
  levelOfCare: "",
  priorTreatment: null,
  priorTreatmentNotes: "",
  currentMedications: "",
  coOccurringConcerns: [],
  suicideHistory: "",
  desiredState: "",
  desiredCity: "",
  radiusMiles: 50,
  preferredEnvironment: "",
  timeline: "",
  faithBasedPreference: "",
  holisticInterest: false,
  amenityPreferences: [],
  needsTransport: false,
  assessmentPreference: "",
  paymentType: "",
  insuranceCarrier: "",
  insuranceMemberId: "",
  insuranceGroupNumber: "",
  employerName: "",
  benefitsVerified: false,
  budgetRange: "",
  scholarshipInterest: false,
  willingToTravel: false,
  decisionMakerName: "",
  phone: "",
  email: "",
  bestTimeToCall: "",
  alternativeContactName: "",
  alternativeContactPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
  referralSource: "",
  hipaaConsent: false,
};

const STEP_CONFIG = [
  { 
    title: "Who Needs Help", 
    description: "Tell us about the person seeking treatment",
    icon: "👤"
  },
  { 
    title: "Care Needs", 
    description: "Substance concerns and treatment requirements",
    icon: "💊"
  },
  { 
    title: "Location & Preferences", 
    description: "Where and how you'd like to receive care",
    icon: "📍"
  },
  { 
    title: "Payment & Insurance", 
    description: "How treatment will be funded",
    icon: "💳"
  },
  { 
    title: "Contact Information", 
    description: "How we can reach you with matches",
    icon: "📞"
  },
  { 
    title: "Review & Submit", 
    description: "Confirm your information and complete payment",
    icon: "✅"
  },
];

export default function ConciergeIntake() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ConciergeIntakeData>(initialData);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>({
    sessionId: null,
    paid: false,
    verifiedAt: null,
  });

  // Verify payment function
  const verifyPayment = useCallback(async (sessionId: string) => {
    setIsVerifyingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-concierge-payment", {
        body: { sessionId }
      });

      if (error) throw error;

      if (data?.alreadySubmitted) {
        // Already submitted, redirect to thank you
        toast.success("Your intake was already submitted!");
        navigate(`/concierge/thank-you?session_id=${sessionId}`);
        return;
      }

      if (data?.paid) {
        const newState: PaymentState = {
          sessionId,
          paid: true,
          verifiedAt: new Date().toISOString(),
        };
        setPaymentState(newState);
        localStorage.setItem(PAYMENT_STATE_KEY, JSON.stringify(newState));
        setCurrentStep(6);
        toast.success("Payment verified! Review and submit your intake.");
        
        // Clear session_id from URL without triggering re-render
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("session_id");
        setSearchParams(newParams, { replace: true });
      } else {
        toast.error("Payment verification failed. Please try again.");
      }
    } catch (err) {
      console.error("Payment verification error:", err);
      toast.error("Failed to verify payment. Please try again.");
    } finally {
      setIsVerifyingPayment(false);
    }
  }, [navigate, searchParams, setSearchParams]);

  // Handle return from Stripe with session_id
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (sessionId && !paymentState.paid && !isVerifyingPayment) {
      verifyPayment(sessionId);
    }
  }, [searchParams, paymentState.paid, isVerifyingPayment, verifyPayment]);

  // Show canceled message if returned from checkout
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      setCurrentStep(6); // Go to review step to show cancellation alert
    }
  }, [searchParams]);

  // Load draft and payment state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed.data }));
        if (parsed.savedAt) {
          setLastSaved(new Date(parsed.savedAt));
        }
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }

    const savedPayment = localStorage.getItem(PAYMENT_STATE_KEY);
    if (savedPayment) {
      try {
        const parsedPayment = JSON.parse(savedPayment);
        setPaymentState(parsedPayment);
      } catch (e) {
        console.error("Failed to parse saved payment state", e);
      }
    }
  }, []);

  // Save draft to localStorage on every change
  useEffect(() => {
    const saveData = {
      data: formData,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    setLastSaved(new Date());
  }, [formData]);

  // Block navigation during submission
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isSubmitting]);

  const updateFormData = (updates: Partial<ConciergeIntakeData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const newErrors = { ...stepErrors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setStepErrors(newErrors);
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Who needs help
        if (!formData.ageRange) errors.ageRange = "Age range is required";
        if (!formData.gender) errors.gender = "Gender is required";
        if (!formData.state) errors.state = "State is required";
        if (!formData.city) errors.city = "City is required";
        if (!formData.currentLivingSituation) errors.currentLivingSituation = "Living situation is required";
        if (!formData.relationship) errors.relationship = "Relationship is required";
        break;
      case 2: // Care need
        if (!formData.primaryConcern) errors.primaryConcern = "Primary concern is required";
        if (!formData.substanceUseFrequency) errors.substanceUseFrequency = "Use frequency is required";
        if (!formData.detoxNeeded) errors.detoxNeeded = "Please indicate if detox is needed";
        if (!formData.levelOfCare) errors.levelOfCare = "Level of care is required";
        if (formData.priorTreatment === null) errors.priorTreatment = "Please indicate prior treatment";
        break;
      case 3: // Logistics
        if (!formData.desiredState) errors.desiredState = "Preferred location is required";
        if (!formData.timeline) errors.timeline = "Timeline is required";
        if (!formData.assessmentPreference) errors.assessmentPreference = "Assessment preference is required";
        break;
      case 4: // Payment
        if (!formData.paymentType) errors.paymentType = "Payment type is required";
        if ((formData.paymentType === "insurance" || formData.paymentType === "both") && !formData.insuranceCarrier) {
          errors.insuranceCarrier = "Insurance carrier is required";
        }
        if ((formData.paymentType === "self-pay" || formData.paymentType === "both") && !formData.budgetRange) {
          errors.budgetRange = "Budget range is required";
        }
        break;
      case 5: // Contact
        if (!formData.decisionMakerName) errors.decisionMakerName = "Name is required";
        if (!formData.phone) errors.phone = "Phone is required";
        if (!formData.email) errors.email = "Email is required";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = "Please enter a valid email";
        }
        if (!formData.bestTimeToCall) errors.bestTimeToCall = "Best time to call is required";
        if (!formData.notes || formData.notes.length < 10) {
          errors.notes = "Please add at least 10 characters of notes";
        }
        if (!formData.hipaaConsent) errors.hipaaConsent = "You must consent to continue";
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditStep = (step: number) => {
    setCurrentStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleProceedToPayment = async () => {
    // Validate all previous steps before payment
    for (let step = 1; step <= 5; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        toast.error("Please complete all required fields before payment");
        return;
      }
    }

    setIsProcessingPayment(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-concierge-checkout", {
        body: {
          email: formData.email,
          intakeDraftKey: STORAGE_KEY,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Redirect in same window (will return with session_id)
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to create checkout session. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const handleSubmitIntake = async () => {
    if (!paymentState.paid || !paymentState.sessionId) {
      toast.error("Please complete payment first");
      return;
    }

    // Check if already submitted (client-side)
    const submittedSessions = JSON.parse(localStorage.getItem(SUBMITTED_SESSIONS_KEY) || "[]");
    if (submittedSessions.includes(paymentState.sessionId)) {
      toast.success("Your intake was already submitted!");
      navigate(`/concierge/thank-you?session_id=${paymentState.sessionId}`);
      return;
    }

    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke("submit-concierge-intake", {
        body: {
          sessionId: paymentState.sessionId,
          intakeData: formData,
        },
      });

      if (error) throw error;

      if (data?.alreadySubmitted) {
        toast.success("Your intake was already submitted!");
      } else {
        toast.success("Your intake has been submitted successfully!");
      }

      // Track submitted sessions
      submittedSessions.push(paymentState.sessionId);
      localStorage.setItem(SUBMITTED_SESSIONS_KEY, JSON.stringify(submittedSessions));

      // Clear drafts
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(PAYMENT_STATE_KEY);

      // Navigate to thank you page
      navigate(`/concierge/thank-you?session_id=${paymentState.sessionId}`);
    } catch (err) {
      console.error("Submission error:", err);
      toast.error("Failed to submit intake. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepWhoNeedsHelp
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 2:
        return (
          <StepCareNeed
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 3:
        return (
          <StepLogistics
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 4:
        return (
          <StepPaymentInfo
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 5:
        return (
          <StepContact
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 6:
        return (
          <StepReviewSubmit
            data={formData}
            paymentState={paymentState}
            onEdit={handleEditStep}
            onPay={handleProceedToPayment}
            onSubmit={handleSubmitIntake}
            isSubmitting={isSubmitting}
            isProcessingPayment={isProcessingPayment}
          />
        );
      default:
        return null;
    }
  };

  // Show loading state while verifying payment
  if (isVerifyingPayment) {
    return (
      <>
        <Helmet>
          <title>Verifying Payment | RehabLookup</title>
        </Helmet>
        <div className="min-h-screen flex flex-col bg-gradient-to-b from-muted/50 to-background">
          <PublicHeader />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Verifying Payment</h2>
              <p className="text-muted-foreground">Please wait while we confirm your payment...</p>
            </div>
          </main>
          <PublicFooter />
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet>
        <title>Concierge Intake | RehabLookup</title>
        <meta name="description" content="Complete your intake form to get matched with the right treatment programs." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-gradient-to-b from-muted/50 to-background">
        <PublicHeader />

        <main className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-3xl">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 text-sm text-primary font-medium mb-2">
                <Shield className="h-4 w-4" />
                100% Confidential
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Find Your Path to Recovery
              </h1>
              <p className="text-muted-foreground">
                Complete this intake form and we'll match you with 2-3 treatment programs within 48 hours.
              </p>
            </div>

            {/* Progress Stepper */}
            <div className="mb-8">
              <IntakeProgress currentStep={currentStep} totalSteps={6} />
            </div>

            {/* Step Info Card */}
            <div className="mb-6 p-4 bg-primary/5 rounded-xl border border-primary/10">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{STEP_CONFIG[currentStep - 1].icon}</span>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">
                    Step {currentStep}: {STEP_CONFIG[currentStep - 1].title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {STEP_CONFIG[currentStep - 1].description}
                  </p>
                </div>
              </div>
            </div>

            {/* Form Card */}
            <Card className="border-0 shadow-xl bg-card/80 backdrop-blur">
              <CardContent className="pt-6 pb-8">
                {renderStep()}

                {/* Navigation Buttons - Only show for steps 1-5 */}
                {currentStep < 6 && (
                  <div className="flex flex-col sm:flex-row justify-between gap-4 mt-10 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      disabled={currentStep === 1}
                      className="order-2 sm:order-1"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>

                    <Button onClick={handleNext} size="lg" className="order-1 sm:order-2">
                      {currentStep === 5 ? "Review & Submit" : "Next Step"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Back button for Step 6 */}
                {currentStep === 6 && (
                  <div className="mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handlePrev}
                      className="w-full sm:w-auto"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Edit
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auto-save indicator */}
            {lastSaved && (
              <div className="mt-4 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Save className="h-3.5 w-3.5" />
                Draft auto-saved {lastSaved.toLocaleTimeString()}
              </div>
            )}

            {/* Trust Indicators */}
            <div className="mt-8 text-center">
              <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  SSL Encrypted
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  HIPAA Aware
                </span>
                <span className="flex items-center gap-1">
                  <svg className="h-4 w-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Never Shared Without Consent
                </span>
              </div>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
