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
      <div className="text-center mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
          Get Help Now
        </h1>
        {facilityName && (
          <p className="text-base md:text-base text-muted-foreground">
            Requesting information from <span className="font-medium text-foreground">{facilityName}</span>
          </p>
        )}
        {!facilityName && (
          <p className="text-base md:text-base text-muted-foreground">
            Complete this form and we'll connect you with the right treatment center
          </p>
        )}
      </div>

      {/* Stepper */}
      <LeadIntakeStepper currentStep={currentStep} />

      {/* Form Steps */}
      <div ref={formSectionRef} className="bg-card rounded-2xl border border-border p-5 md:p-8 shadow-sm scroll-mt-4">
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
