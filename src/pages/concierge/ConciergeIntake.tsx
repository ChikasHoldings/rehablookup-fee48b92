import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Shield, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Step components
import { StepWhoNeedsHelp } from "@/components/concierge/StepWhoNeedsHelp";
import { StepCareNeed } from "@/components/concierge/StepCareNeed";
import { StepLogistics } from "@/components/concierge/StepLogistics";
import { StepPaymentInfo } from "@/components/concierge/StepPaymentInfo";
import { StepContact } from "@/components/concierge/StepContact";

export interface ConciergeIntakeData {
  // Step A: Who needs help
  ageRange: string;
  state: string;
  city: string;
  relationship: string;
  
  // Step B: Care need
  primaryConcern: string;
  levelOfCare: string;
  priorTreatment: boolean | null;
  priorTreatmentNotes: string;
  coOccurringConcerns: string[];
  
  // Step C: Logistics
  desiredState: string;
  desiredCity: string;
  radiusMiles: number;
  timeline: string;
  needsTransport: boolean;
  assessmentPreference: string;
  
  // Step D: Payment
  paymentType: string;
  insuranceCarrier: string;
  budgetRange: string;
  willingToTravel: boolean;
  
  // Step E: Contact
  decisionMakerName: string;
  phone: string;
  email: string;
  bestTimeToCall: string;
  notes: string;
}

const STORAGE_KEY = "concierge_intake_draft";

const initialData: ConciergeIntakeData = {
  ageRange: "",
  state: "",
  city: "",
  relationship: "self",
  primaryConcern: "",
  levelOfCare: "",
  priorTreatment: null,
  priorTreatmentNotes: "",
  coOccurringConcerns: [],
  desiredState: "",
  desiredCity: "",
  radiusMiles: 50,
  timeline: "",
  needsTransport: false,
  assessmentPreference: "",
  paymentType: "",
  insuranceCarrier: "",
  budgetRange: "",
  willingToTravel: false,
  decisionMakerName: "",
  phone: "",
  email: "",
  bestTimeToCall: "",
  notes: "",
};

const STEP_TITLES = [
  "Who Needs Help",
  "Care Needs",
  "Logistics",
  "Payment",
  "Contact Info",
];

export default function ConciergeIntake() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ConciergeIntakeData>(initialData);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Show canceled message if returned from checkout
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      toast.error("Payment was canceled. You can try again when ready.");
    }
  }, [searchParams]);

  // Load draft from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFormData(prev => ({ ...prev, ...parsed }));
      } catch (e) {
        console.error("Failed to parse saved draft", e);
      }
    }
  }, []);

  // Save draft to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
  }, [formData]);

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
        if (!formData.state) errors.state = "State is required";
        if (!formData.city) errors.city = "City is required";
        if (!formData.relationship) errors.relationship = "Relationship is required";
        break;
      case 2: // Care need
        if (!formData.primaryConcern) errors.primaryConcern = "Primary concern is required";
        if (!formData.levelOfCare) errors.levelOfCare = "Level of care is required";
        if (formData.priorTreatment === null) errors.priorTreatment = "Please indicate prior treatment";
        break;
      case 3: // Logistics
        if (!formData.desiredState) errors.desiredState = "Desired location is required";
        if (!formData.timeline) errors.timeline = "Timeline is required";
        if (!formData.assessmentPreference) errors.assessmentPreference = "Assessment preference is required";
        break;
      case 4: // Payment
        if (!formData.paymentType) errors.paymentType = "Payment type is required";
        if (formData.paymentType === "insurance" && !formData.insuranceCarrier) {
          errors.insuranceCarrier = "Insurance carrier is required";
        }
        if (formData.paymentType === "self-pay" && !formData.budgetRange) {
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
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 5) {
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

  const handleProceedToPayment = async () => {
    if (!validateStep(5)) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("create-concierge-checkout", {
        body: {
          email: formData.email,
          intakeDraftKey: STORAGE_KEY,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open checkout in new tab
        window.open(data.url, "_blank");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to create checkout session. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const progress = (currentStep / 5) * 100;

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
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet>
        <title>Concierge Intake | RehabLookup</title>
        <meta name="description" content="Complete your intake form to get matched with the right treatment programs." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-muted/30">
        <PublicHeader />

        <main className="flex-1 py-8 md:py-12">
          <div className="container mx-auto px-4 max-w-2xl">
            {/* Progress Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">
                  Step {currentStep} of 5: {STEP_TITLES[currentStep - 1]}
                </span>
                <span className="text-sm text-muted-foreground">
                  {Math.round(progress)}% Complete
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>

            {/* Form Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="border-b bg-muted/50">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">{STEP_TITLES[currentStep - 1]}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {renderStep()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t">
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    disabled={currentStep === 1}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>

                  {currentStep < 5 ? (
                    <Button onClick={handleNext}>
                      Next
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleProceedToPayment}
                      disabled={isSubmitting}
                      className="min-w-[180px]"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Continue to Payment ($29)"
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="mt-6 text-center text-sm text-muted-foreground">
              <p>Your information is encrypted and handled with care.</p>
              <p>We follow HIPAA-aware practices to protect your privacy.</p>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
