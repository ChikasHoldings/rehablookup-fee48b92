import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { RequestHelpStepper } from "@/components/request-help/RequestHelpStepper";
import { StepWhoNeedsHelp } from "@/components/request-help/StepWhoNeedsHelp";
import { StepTreatmentNeeds } from "@/components/request-help/StepTreatmentNeeds";
import { StepInsurance } from "@/components/request-help/StepInsurance";
import { StepContactVerification } from "@/components/request-help/StepContactVerification";
import { RequestHelpSuccess } from "@/components/request-help/RequestHelpSuccess";

export interface RequestHelpFormData {
  // Step 1
  whoSeekingHelp: string;
  locationZip: string;
  locationCityState: string;
  urgency: string;
  // Step 2
  primarySubstance: string[];
  levelOfCare: string;
  dualDiagnosis: string;
  // Step 3
  insuranceType: string;
  insuranceProvider: string;
  budgetPreference: string;
  // Step 4
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  preferredContact: string;
  message: string;
}

const initialFormData: RequestHelpFormData = {
  whoSeekingHelp: "",
  locationZip: "",
  locationCityState: "",
  urgency: "",
  primarySubstance: [],
  levelOfCare: "",
  dualDiagnosis: "",
  insuranceType: "",
  insuranceProvider: "",
  budgetPreference: "",
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  preferredContact: "call",
  message: "",
};

export default function RequestHelp() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<RequestHelpFormData>(initialFormData);
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [facilityName, setFacilityName] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const formSectionRef = useRef<HTMLDivElement>(null);

  const scrollToFormSection = () => {
    setTimeout(() => {
      formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  useEffect(() => {
    const fId = searchParams.get("facility");
    const fName = searchParams.get("facilityName");
    if (fId) setFacilityId(fId);
    if (fName) setFacilityName(decodeURIComponent(fName));
  }, [searchParams]);

  const updateFormData = (updates: Partial<RequestHelpFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(prev => prev + 1);
      scrollToFormSection();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      scrollToFormSection();
    }
  };

  const handleSuccess = () => {
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <Layout>
        <RequestHelpSuccess facilityName={facilityName} />
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-[calc(100vh-200px)] bg-background py-8 md:py-12">
        <div className="container max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
              Get Help Now
            </h1>
            {facilityName && (
              <p className="text-muted-foreground">
                Requesting information from <span className="font-medium text-foreground">{facilityName}</span>
              </p>
            )}
            {!facilityName && (
              <p className="text-muted-foreground">
                Complete this form and we'll connect you with the right treatment center
              </p>
            )}
          </div>

          {/* Stepper */}
          <RequestHelpStepper currentStep={currentStep} totalSteps={4} />

          {/* Form Steps */}
          <div ref={formSectionRef} className="bg-card rounded-xl border border-border p-6 md:p-8 shadow-sm scroll-mt-4">
            {currentStep === 1 && (
              <StepWhoNeedsHelp
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
              />
            )}
            {currentStep === 2 && (
              <StepTreatmentNeeds
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 3 && (
              <StepInsurance
                formData={formData}
                updateFormData={updateFormData}
                onNext={nextStep}
                onBack={prevStep}
              />
            )}
            {currentStep === 4 && (
              <StepContactVerification
                formData={formData}
                updateFormData={updateFormData}
                facilityId={facilityId}
                onBack={prevStep}
                onSuccess={handleSuccess}
              />
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
