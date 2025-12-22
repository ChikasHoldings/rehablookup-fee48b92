import { useRef, useEffect } from "react";
import { IntakeProgress } from "./IntakeProgress";
import { StepSituation } from "./StepSituation";
import { StepTreatment } from "./StepTreatment";
import { StepInsurance } from "./StepInsurance";
import { StepContact } from "./StepContact";
import { IntakeSuccess } from "./IntakeSuccess";
import { useIntakeForm } from "./useIntakeForm";
import { Shield, Building2 } from "lucide-react";

interface CentralizedIntakeFormProps {
  className?: string;
}

export function CentralizedIntakeForm({ className }: CentralizedIntakeFormProps) {
  const formSectionRef = useRef<HTMLDivElement>(null);
  
  const {
    formData,
    updateFormData,
    currentStep,
    nextStep,
    prevStep,
    facilityId,
    facilityName,
    isSubmitting,
    isSubmitted,
    handleSubmit,
    codeSent,
    isSendingCode,
    verificationCode,
    setVerificationCode,
    isVerifying,
    isEmailVerified,
    resendCount,
    resendCooldown,
    sendVerificationCode,
    verifyCode,
    resetEmailVerification,
  } = useIntakeForm();

  // Scroll to form when step changes
  useEffect(() => {
    if (currentStep > 1) {
      setTimeout(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [currentStep]);

  if (isSubmitted) {
    return <IntakeSuccess facilityName={facilityName} firstName={formData.firstName} />;
  }

  return (
    <div className={className}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Free & 100% Confidential
        </div>
        
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Find the Right Treatment for You
        </h1>
        
        <p className="text-muted-foreground max-w-lg mx-auto">
          Answer a few questions to get matched with treatment centers that fit your needs.
        </p>

        {facilityName && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Requesting info from</span>
            <span className="font-semibold text-foreground">{facilityName}</span>
          </div>
        )}
      </div>

      {/* Progress Indicator */}
      <IntakeProgress currentStep={currentStep} />

      {/* Form Container */}
      <div 
        ref={formSectionRef} 
        className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-sm scroll-mt-4"
      >
        {currentStep === 1 && (
          <StepSituation
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        )}
        {currentStep === 2 && (
          <StepTreatment
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
          <StepContact
            formData={formData}
            updateFormData={updateFormData}
            onBack={prevStep}
            onSubmit={handleSubmit}
            codeSent={codeSent}
            isSendingCode={isSendingCode}
            verificationCode={verificationCode}
            setVerificationCode={setVerificationCode}
            isVerifying={isVerifying}
            isEmailVerified={isEmailVerified}
            resendCount={resendCount}
            resendCooldown={resendCooldown}
            sendVerificationCode={sendVerificationCode}
            verifyCode={verifyCode}
            resetEmailVerification={resetEmailVerification}
            isSubmitting={isSubmitting}
          />
        )}
      </div>

      {/* Trust Indicators */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Shield className="h-4 w-4 text-primary" />
          <span>HIPAA Compliant</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5">
          <span>🔒</span>
          <span>256-bit SSL Encryption</span>
        </div>
        <span className="text-border">•</span>
        <div className="flex items-center gap-1.5">
          <span>✓</span>
          <span>No Cost to You</span>
        </div>
      </div>
    </div>
  );
}
