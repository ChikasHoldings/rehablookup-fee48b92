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
    setIsEmailVerified,
    resendCount,
    resendCooldown,
    sendVerificationCode,
    verifyCode,
    resetEmailVerification,
    checkEmailAlreadyVerified,
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
          setIsEmailVerified={setIsEmailVerified}
          resendCount={resendCount}
          resendCooldown={resendCooldown}
          sendVerificationCode={sendVerificationCode}
          verifyCode={verifyCode}
          resetEmailVerification={resetEmailVerification}
          checkEmailAlreadyVerified={checkEmailAlreadyVerified}
          isSubmitting={isSubmitting}
          facilityName={facilityName}
        />
      </div>
    </LeadFormErrorBoundary>
  );
}
