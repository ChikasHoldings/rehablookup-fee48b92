import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { IntakeProgress } from "@/components/international/IntakeProgress";
import { StepContact } from "@/components/international/steps/StepContact";
import { StepEmail } from "@/components/international/steps/StepEmail";
import { StepPhone } from "@/components/international/steps/StepPhone";
import { StepLocation } from "@/components/international/steps/StepLocation";
import { StepPatient } from "@/components/international/steps/StepPatient";
import { StepLevelOfCare } from "@/components/international/steps/StepLevelOfCare";
import { StepClinical } from "@/components/international/steps/StepClinical";
import { StepPreferences } from "@/components/international/steps/StepPreferences";
import { StepAmenities } from "@/components/international/steps/StepAmenities";
import { StepReview } from "@/components/international/steps/StepReview";

const TOTAL_STEPS = 10;

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
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<IntakeData>(initialData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.first_name.trim() && data.last_name.trim();
      case 2:
        return data.email.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email);
      case 3:
        return true; // Phone is optional
      case 4:
        return data.country && data.preferred_language;
      case 5:
        return data.seeking_for && data.age_range && data.gender;
      case 6:
        return data.level_of_care;
      case 7:
        return data.primary_concern;
      case 8:
        return data.budget_range && data.rehab_style;
      case 9:
        return true; // Amenities are optional
      case 10:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS && canProceed()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // Store intake data in localStorage for retrieval after payment
      localStorage.setItem("international_intake_data", JSON.stringify(data));

      const { data: response, error } = await supabase.functions.invoke("create-international-checkout", {
        body: {
          name: `${data.first_name} ${data.last_name}`.trim(),
          email: data.email,
          phone: data.phone,
          country: data.country,
          intakeData: data,
        },
      });

      if (error) throw error;
      if (response?.url) {
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
            onChange={(d) => updateData(d)}
          />
        );
      case 3:
        return (
          <StepPhone
            data={{ phone: data.phone }}
            onChange={(d) => updateData(d)}
          />
        );
      case 4:
        return (
          <StepLocation
            data={{ country: data.country, preferred_language: data.preferred_language }}
            onChange={(d) => updateData(d)}
          />
        );
      case 5:
        return (
          <StepPatient
            data={{ seeking_for: data.seeking_for, age_range: data.age_range, gender: data.gender }}
            onChange={(d) => updateData(d)}
          />
        );
      case 6:
        return (
          <StepLevelOfCare
            data={{ level_of_care: data.level_of_care }}
            onChange={(d) => updateData(d)}
          />
        );
      case 7:
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
      case 8:
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
      case 9:
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
      case 10:
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

        <main className="flex-1 py-8 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              {/* Form Container */}
              <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
                {/* Progress */}
                <div className="px-6 md:px-10 pt-6 md:pt-8 pb-4 border-b bg-muted/30">
                  <IntakeProgress currentStep={currentStep} totalSteps={TOTAL_STEPS} />
                </div>

                {/* Step Content */}
                <div className="px-6 md:px-10 py-8 md:py-12 min-h-[400px] flex items-center justify-center">
                  <div className="w-full max-w-xl">
                    <AnimatePresence mode="wait">
                      {renderStep()}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Navigation */}
                {currentStep < TOTAL_STEPS && (
                  <div className="px-6 md:px-10 py-6 border-t bg-muted/20 flex justify-center gap-4">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={handleBack}
                        className="h-12 px-6"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    <Button
                      onClick={handleNext}
                      disabled={!canProceed()}
                      className="h-12 px-8 bg-accent hover:bg-accent/90 text-accent-foreground"
                    >
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}

                {currentStep === TOTAL_STEPS && (
                  <div className="px-6 md:px-10 py-4 border-t bg-muted/20 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleBack}
                      className="text-muted-foreground"
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
