import { useRef, useEffect } from "react";
import { SingleQuestionFlow } from "./SingleQuestionFlow";
import { LeadIntakeSuccess } from "./LeadIntakeSuccess";
import { useLeadIntakeForm } from "./useLeadIntakeForm";
import { LeadFormErrorBoundary } from "./LeadFormErrorBoundary";

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

  if (isSubmitted) {
    if (renderSuccess) {
      return <>{renderSuccess({ firstName: formData.firstName, facilityName })}</>;
    }
    return <LeadIntakeSuccess facilityName={facilityName} firstName={formData.firstName} />;
  }

  return (
    <LeadFormErrorBoundary>
      <div className={className} ref={formSectionRef}>
        {/* Header Badge */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary"></span>
            </span>
            Free & Confidential
          </div>
        </div>

        {/* Single Question Flow */}
        <SingleQuestionFlow
          formData={formData}
          updateFormData={updateFormData}
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
          facilityName={facilityName}
        />
      </div>
    </LeadFormErrorBoundary>
  );
}
