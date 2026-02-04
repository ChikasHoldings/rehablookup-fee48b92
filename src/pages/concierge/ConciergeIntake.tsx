import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

// Step components
import { StepWhoNeedsHelp } from "@/components/concierge/StepWhoNeedsHelp";
import { StepCareNeed } from "@/components/concierge/StepCareNeed";
import { StepLogistics } from "@/components/concierge/StepLogistics";
import { StepPaymentInfo } from "@/components/concierge/StepPaymentInfo";
import { StepContact } from "@/components/concierge/StepContact";
import { StepReviewSubmit } from "@/components/concierge/StepReviewSubmit";
import { IntakeProgress } from "@/components/international/IntakeProgress";

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
  firstName: string;
  lastName: string;
  decisionMakerName: string; // Legacy - computed from firstName + lastName
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
  firstName: "",
  lastName: "",
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
    description: "How we can reach you about your placement",
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
  const [direction, setDirection] = useState(1);
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
        if (!formData.firstName) errors.firstName = "First name is required";
        if (!formData.lastName) errors.lastName = "Last name is required";
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
        setDirection(1);
        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleEditStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
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

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <>
      <Helmet>
        <title>Concierge Intake | RehabLookup</title>
        <meta name="description" content="Complete your intake form to get matched with the right treatment programs." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />

        <main className="flex-1 py-4 sm:py-6 md:py-12">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="max-w-2xl mx-auto">
              {/* Form Container */}
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Progress */}
                <div className="px-4 sm:px-6 md:px-8 pt-4 pb-3 border-b bg-muted/30">
                  <IntakeProgress currentStep={currentStep} totalSteps={6} />
                </div>

                {/* Step Content */}
                <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8 min-h-[300px]">
                  {/* Step Header */}
                  <motion.div
                    key={`header-${currentStep}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 sm:mb-6"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xl sm:text-2xl">{STEP_CONFIG[currentStep - 1].icon}</span>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                        {STEP_CONFIG[currentStep - 1].title}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {STEP_CONFIG[currentStep - 1].description}
                    </p>
                  </motion.div>

                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                {currentStep < 6 && (
                  <div className="px-4 sm:px-6 md:px-8 py-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row justify-center gap-3">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                        className="h-11 px-5"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      className="h-11 px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      {currentStep === 5 ? "Review & Submit" : "Continue"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === 6 && (
                  <div className="px-4 sm:px-6 py-3 border-t bg-muted/20 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handlePrev}
                      className="text-muted-foreground"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go back to edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Auto-save indicator */}
              {lastSaved && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Auto-saved
                </motion.div>
              )}
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
