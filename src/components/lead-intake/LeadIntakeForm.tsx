import { useRef, useEffect } from "react";
import { LeadIntakeStepper } from "./LeadIntakeStepper";
import { StepImmediateNeed } from "./StepImmediateNeed";
import { StepEligibility } from "./StepEligibility";
import { StepContactVerify } from "./StepContactVerify";
import { LeadIntakeSuccess } from "./LeadIntakeSuccess";
import { useLeadIntakeForm } from "./useLeadIntakeForm";

interface LeadIntakeFormProps {
  className?: string;
  /** Custom success component to render after form submission */
  renderSuccess?: (props: { firstName: string; facilityName?: string | null }) => React.ReactNode;
}

export function LeadIntakeForm({ className, renderSuccess }: LeadIntakeFormProps) {
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
    if (renderSuccess) {
      return <>{renderSuccess({ firstName: formData.firstName, facilityName })}</>;
    }
    return <LeadIntakeSuccess facilityName={facilityName} firstName={formData.firstName} />;
  }

  const isUrgent = formData.urgency === "immediate";

  return (
    <div className={className}>
      {/* Compact Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
          </span>
          Free & Confidential
        </div>
        {facilityName && (
          <p className="text-sm text-muted-foreground">
            Requesting info from <span className="font-medium text-foreground">{facilityName}</span>
          </p>
        )}
      </div>

      {/* Stepper */}
      <LeadIntakeStepper currentStep={currentStep} />

      {/* Form Steps */}
      <div ref={formSectionRef} className="bg-card rounded-xl border border-border p-5 md:p-6 shadow-sm scroll-mt-4">
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
