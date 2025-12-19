import { useRef, useEffect } from "react";
import { LeadIntakeStepper } from "./LeadIntakeStepper";
import { StepImmediateNeed } from "./StepImmediateNeed";
import { StepEligibility } from "./StepEligibility";
import { StepContactVerify } from "./StepContactVerify";
import { LeadIntakeSuccess } from "./LeadIntakeSuccess";
import { useLeadIntakeForm } from "./useLeadIntakeForm";

interface LeadIntakeFormProps {
  className?: string;
}

export function LeadIntakeForm({ className }: LeadIntakeFormProps) {
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
    // Email verification
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
  } = useLeadIntakeForm();

  // Scroll to form when step changes
  useEffect(() => {
    if (currentStep > 1) {
      setTimeout(() => {
        formSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 50);
    }
  }, [currentStep]);

  if (isSubmitted) {
    return <LeadIntakeSuccess facilityName={facilityName} firstName={formData.firstName} />;
  }

  const isUrgent = formData.urgency === "immediate";

  return (
    <div className={className}>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          Free & Confidential
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
          Get Help Now
        </h1>
        {facilityName && (
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Requesting information from <span className="font-medium text-foreground">{facilityName}</span>
          </p>
        )}
        {!facilityName && (
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            Complete this short form and we'll connect you with verified treatment centers
          </p>
        )}
      </div>

      {/* Stepper */}
      <LeadIntakeStepper currentStep={currentStep} />

      {/* Form Steps */}
      <div ref={formSectionRef} className="bg-card rounded-2xl border border-border p-6 md:p-8 shadow-lg shadow-primary/5 scroll-mt-4">
        {currentStep === 1 && (
          <StepImmediateNeed
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
          />
        )}
        {currentStep === 2 && (
          <StepEligibility
            formData={formData}
            updateFormData={updateFormData}
            onNext={nextStep}
            onBack={prevStep}
            isUrgent={isUrgent}
          />
        )}
        {currentStep === 3 && (
          <StepContactVerify
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
    </div>
  );
}
