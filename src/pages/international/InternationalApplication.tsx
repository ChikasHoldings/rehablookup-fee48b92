import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";

import { IntakeProgress } from "@/components/international/IntakeProgress";
import { StepContact } from "@/components/international/steps/StepContact";
import { StepEmail } from "@/components/international/steps/StepEmail";
import { StepEmailVerification } from "@/components/international/steps/StepEmailVerification";
import { StepPhone } from "@/components/international/steps/StepPhone";
import { StepLocation } from "@/components/international/steps/StepLocation";
import { StepPatient } from "@/components/international/steps/StepPatient";
import { StepLevelOfCare } from "@/components/international/steps/StepLevelOfCare";
import { StepClinical } from "@/components/international/steps/StepClinical";
import { StepPreferences } from "@/components/international/steps/StepPreferences";
import { StepAmenities } from "@/components/international/steps/StepAmenities";
import { StepReview } from "@/components/international/steps/StepReview";

const TOTAL_STEPS = 11; // Added email verification step

interface IntakeData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  preferred_language: string;
  seeking_for: string;
  age_range: string;
  gender: string;
  level_of_care: string;
  primary_concern: string;
  co_occurring_conditions: string[];
  previous_treatment: string;
  budget_range: string;
  rehab_style: string;
  treatment_duration: string;
  amenities: string[];
  special_requirements: string;
  notes: string;
}

interface EmailVerificationState {
  verified: boolean;
  verifiedAt: string | null;
}

const initialData: IntakeData = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  country: "",
  preferred_language: "English",
  seeking_for: "",
  age_range: "",
  gender: "",
  level_of_care: "",
  primary_concern: "",
  co_occurring_conditions: [],
  previous_treatment: "",
  budget_range: "",
  rehab_style: "",
  treatment_duration: "",
  amenities: [],
  special_requirements: "",
  notes: "",
};

export default function InternationalApplication() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<IntakeData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftId, setDraftId] = useState<string | null>(null);
  const [emailVerification, setEmailVerification] = useState<EmailVerificationState>({
    verified: false,
    verifiedAt: null,
  });

  // Handle payment success return
  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    const paymentSuccess = searchParams.get("payment") === "success";
    
    if (sessionId && paymentSuccess) {
      // Payment successful - submit intake and redirect
      handlePaymentSuccess(sessionId);
    }
  }, [searchParams]);

  const handlePaymentSuccess = async (sessionId: string) => {
    try {
      // Get stored intake data
      const storedData = localStorage.getItem("international_intake_data");
      const intakeData = storedData ? JSON.parse(storedData) : data;

      // Submit the intake
      const { error } = await supabase.functions.invoke("submit-international-intake", {
        body: {
          sessionId,
          intakeData: {
            firstName: intakeData.first_name,
            lastName: intakeData.last_name,
            email: intakeData.email,
            phone: intakeData.phone,
            country: intakeData.country,
            preferredLanguage: intakeData.preferred_language,
            seekingFor: intakeData.seeking_for,
            ageRange: intakeData.age_range,
            gender: intakeData.gender,
            levelOfCare: intakeData.level_of_care,
            primaryConcern: intakeData.primary_concern,
            coOccurringConditions: intakeData.co_occurring_conditions,
            previousTreatment: intakeData.previous_treatment,
            budgetRange: intakeData.budget_range,
            rehabStyle: intakeData.rehab_style,
            treatmentDuration: intakeData.treatment_duration,
            amenities: intakeData.amenities,
            specialRequirements: intakeData.special_requirements,
            notes: intakeData.notes,
          },
        },
      });

      if (error) {
        console.error("Submit error:", error);
      }

      // Navigate to thank you page with data
      navigate("/international/thank-you", {
        state: {
          firstName: intakeData.first_name,
          email: intakeData.email,
        },
        replace: true,
      });
      
      // Clear stored data
      localStorage.removeItem("international_intake_data");
    } catch (err) {
      console.error("Payment success handling error:", err);
      navigate("/international/thank-you", { replace: true });
    }
  };

  // Step validation
  const canProceed = () => {
    switch (currentStep) {
      case 1: // Contact (name)
        return data.first_name.trim() && data.last_name.trim();
      case 2: // Email
        return data.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      case 3: // Email Verification (NEW)
        return emailVerification.verified;
      case 4: // Phone
        return true; // Optional
      case 5: // Location
        return data.country && data.preferred_language;
      case 6: // Patient
        return data.seeking_for && data.age_range && data.gender;
      case 7: // Level of Care
        return data.level_of_care;
      case 8: // Clinical
        return data.primary_concern;
      case 9: // Preferences
        return data.budget_range && data.rehab_style;
      case 10: // Amenities
        return true; // Optional
      case 11: // Review
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setCurrentStep(currentStep + 1);
      scrollToTopSmooth();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      scrollToTopSmooth();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Store intake data in localStorage for retrieval after payment
      localStorage.setItem("international_intake_data", JSON.stringify(data));

      // Save draft before payment
      const { data: draftResponse } = await supabase.functions.invoke("save-international-placement-draft", {
        body: {
          intakeData: data,
          emailVerifiedAt: emailVerification.verifiedAt,
          draftId: draftId,
        },
      });

      const newDraftId = draftResponse?.draftId || draftId;
      if (newDraftId) {
        setDraftId(newDraftId);
      }

      // Create checkout session
      const { data: response, error } = await supabase.functions.invoke("create-international-checkout", {
        body: {
          name: `${data.first_name} ${data.last_name}`.trim(),
          email: data.email,
          phone: data.phone,
          country: data.country,
          intakeData: data,
          draftId: newDraftId,
        },
      });

      if (error) throw error;
      if (response?.url && (response.url.startsWith("https://checkout.stripe.com") || response.url.startsWith("https://billing.stripe.com"))) {
        window.location.href = response.url;
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast({
        title: "Error",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateData = (updates: Partial<IntakeData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const handleEmailVerified = (verifiedAt: string) => {
    setEmailVerification({ verified: true, verifiedAt });
  };

  const handleEditEmail = () => {
    // Go back to email step and reset verification
    setCurrentStep(2);
    setEmailVerification({ verified: false, verifiedAt: null });
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepContact
            data={{ first_name: data.first_name, last_name: data.last_name }}
            onChange={(d) => updateData(d)}
          />
        );
      case 2:
        return (
          <StepEmail
            data={{ email: data.email }}
            onChange={(d) => {
              updateData(d);
              // Reset verification if email changes
              if (d.email !== data.email) {
                setEmailVerification({ verified: false, verifiedAt: null });
              }
            }}
          />
        );
      case 3: // NEW: Email Verification
        return (
          <StepEmailVerification
            email={data.email}
            onVerified={handleEmailVerified}
            onEditEmail={handleEditEmail}
            isVerified={emailVerification.verified}
            verifiedAt={emailVerification.verifiedAt}
          />
        );
      case 4:
        return (
          <StepPhone
            data={{ phone: data.phone }}
            onChange={(d) => updateData(d)}
          />
        );
      case 5:
        return (
          <StepLocation
            data={{ country: data.country, preferred_language: data.preferred_language }}
            onChange={(d) => updateData(d)}
          />
        );
      case 6:
        return (
          <StepPatient
            data={{ seeking_for: data.seeking_for, age_range: data.age_range, gender: data.gender }}
            onChange={(d) => updateData(d)}
          />
        );
      case 7:
        return (
          <StepLevelOfCare
            data={{ level_of_care: data.level_of_care }}
            onChange={(d) => updateData(d)}
          />
        );
      case 8:
        return (
          <StepClinical
            data={{
              primary_concern: data.primary_concern,
              co_occurring_conditions: data.co_occurring_conditions,
              previous_treatment: data.previous_treatment,
            }}
            onChange={(d) => updateData(d)}
          />
        );
      case 9:
        return (
          <StepPreferences
            data={{
              budget_range: data.budget_range,
              rehab_style: data.rehab_style,
              treatment_duration: data.treatment_duration,
            }}
            onChange={(d) => updateData(d)}
          />
        );
      case 10:
        return (
          <StepAmenities
            data={{
              amenities: data.amenities,
              special_requirements: data.special_requirements,
              notes: data.notes,
            }}
            onChange={(d) => updateData(d)}
          />
        );
      case 11:
        return (
          <StepReview
            data={data}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
      <SEO
        title="Apply for International Placement | RehabLookup"
        description="Complete your international placement application to access US treatment centers."
        noindex
      />

      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />

        <main className="flex-1 py-4 md:py-16">
          <div className="container mx-auto px-3 md:px-4">
            <div className="max-w-3xl mx-auto">
              {/* Form Container */}
              <div className="bg-card border rounded-xl md:rounded-2xl shadow-sm overflow-hidden">
                {/* Progress */}
                <div className="px-3 md:px-10 pt-3 md:pt-8 pb-2 md:pb-4 border-b bg-muted/30">
                  <IntakeProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
                </div>

                {/* Step Content */}
                <div className="px-3 md:px-10 py-4 md:py-12 min-h-[320px] md:min-h-[400px] flex items-center justify-center">
                  <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait">
                      {renderStep()}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Navigation */}
                {currentStep < TOTAL_STEPS && (
                  <div className="px-3 md:px-10 py-3 md:py-6 border-t bg-muted/20 flex justify-between items-center gap-3">
                    <Button
                      variant="outline"
                      onClick={handleBack}
                      disabled={currentStep === 1}
                      className={`h-10 md:h-12 px-4 md:px-6 ${currentStep === 1 ? 'invisible' : ''}`}
                    >
                      <ArrowLeft className="mr-1.5 md:mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Back</span>
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="h-10 md:h-12 px-5 md:px-8 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Continue
                      <ArrowRight className="ml-1.5 md:ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === TOTAL_STEPS && (
                  <div className="px-3 md:px-10 py-2 md:py-4 border-t bg-muted/20 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-muted-foreground text-sm"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go back to edit
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
