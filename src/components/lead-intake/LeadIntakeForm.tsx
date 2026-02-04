import { useRef, useState } from "react";
import { SingleQuestionFlow } from "./SingleQuestionFlow";
import { LeadIntakeSuccess } from "./LeadIntakeSuccess";
import { useLeadIntakeForm } from "./useLeadIntakeForm";
import { LeadFormErrorBoundary } from "./LeadFormErrorBoundary";
import { LeadIntakeFormData } from "./types";

interface LeadIntakeFormProps {
  className?: string;
  /** Custom success component to render after form submission */
  renderSuccess?: (props: { firstName: string; facilityName?: string | null }) => React.ReactNode;
  /** Custom submit handler - when provided, replaces the default submission logic */
  onCustomSubmit?: (formData: LeadIntakeFormData) => Promise<void>;
}

export function LeadIntakeForm({ className, renderSuccess, onCustomSubmit }: LeadIntakeFormProps) {
  const formSectionRef = useRef<HTMLDivElement>(null);
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customSubmitted, setCustomSubmitted] = useState(false);
  
  const {
    formData,
    updateFormData,
    facilityName,
    isSubmitting: defaultSubmitting,
    isSubmitted: defaultSubmitted,
    handleSubmit: defaultHandleSubmit,
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
    checkAndAutoVerifyEmail,
  } = useLeadIntakeForm();

  // Determine which submission state to use
  const isSubmitting = onCustomSubmit ? customSubmitting : defaultSubmitting;
  const isSubmitted = onCustomSubmit ? customSubmitted : defaultSubmitted;

  // Handle submit - use custom handler if provided
  const handleSubmit = async () => {
    if (onCustomSubmit) {
      setCustomSubmitting(true);
      try {
        await onCustomSubmit(formData);
        setCustomSubmitted(true);
      } finally {
        setCustomSubmitting(false);
      }
    } else {
      await defaultHandleSubmit();
    }
  };

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
          checkAndAutoVerifyEmail={checkAndAutoVerifyEmail}
          isSubmitting={isSubmitting}
          facilityName={facilityName}
        />
      </div>
    </LeadFormErrorBoundary>
  );
}
