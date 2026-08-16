import { useRef, useState } from "react";
import { SingleQuestionFlow } from "./SingleQuestionFlow";
import { LeadIntakeSuccess } from "./LeadIntakeSuccess";
import { useLeadIntakeForm } from "./useLeadIntakeForm";
import { LeadFormErrorBoundary } from "./LeadFormErrorBoundary";
import { LeadIntakeFormData } from "./types";

interface LeadIntakeFormProps {
  className?: string;
  /** Facility ID - when provided, overrides URL param */
  facilityId?: string;
  /** Facility name - when provided, overrides URL param */
  facilityName?: string;
  /** Custom success component to render after form submission */
  renderSuccess?: (props: {
    firstName: string;
    facilityName?: string | null;
    contact: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      preferredContact: string;
      bestTimeToCall: string;
    };
  }) => React.ReactNode;
  /**
   * Custom submit handler - when provided, replaces the default submission
   * logic. Used by the standalone marketing landing funnels, which are not
   * selected-facility inquiries. The facility-contact surfaces
   * (RequestInfoModal) must NOT use this to smuggle a generic lead form in
   * front of a non-Pro facility — see docs/directory-cutover-stage-02.
   */
  onCustomSubmit?: (formData: LeadIntakeFormData) => Promise<void>;
  /**
   * Called when `submit-qualified-lead` answers with
   * `action: "DIRECT_CONTACT_REQUIRED"` — i.e. the server resolved the
   * selected facility as non-Pro (or could not confirm its entitlement)
   * after this form had already rendered. The facility did NOT receive the
   * inquiry, so the caller must show a direct-contact state, never success.
   */
  onDirectContactRequired?: () => void;
}

export function LeadIntakeForm({
  className,
  facilityId: propFacilityId,
  facilityName: propFacilityName,
  renderSuccess,
  onCustomSubmit,
  onDirectContactRequired,
}: LeadIntakeFormProps) {
  const formSectionRef = useRef<HTMLDivElement>(null);
  const [customSubmitting, setCustomSubmitting] = useState(false);
  const [customSubmitted, setCustomSubmitted] = useState(false);
  
  const {
    formData,
    updateFormData,
    facilityId: urlFacilityId,
    facilityName: urlFacilityName,
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
  } = useLeadIntakeForm({
    facilityIdOverride: propFacilityId,
    facilityNameOverride: propFacilityName,
    onDirectContactRequired,
  });

  // Use prop values if provided, otherwise use URL params
  const facilityId = propFacilityId || urlFacilityId;
  const facilityName = propFacilityName || urlFacilityName;

  // Determine which submission state to use
  const isSubmitting = onCustomSubmit ? customSubmitting : defaultSubmitting;
  const isSubmitted = onCustomSubmit ? customSubmitted : defaultSubmitted;

  // Handle submit - use custom handler if provided
  const handleSubmit = async (options?: { skipVerificationCheck?: boolean }) => {
    if (onCustomSubmit) {
      setCustomSubmitting(true);
      try {
        await onCustomSubmit(formData);
        setCustomSubmitted(true);
      } finally {
        setCustomSubmitting(false);
      }
    } else {
      await defaultHandleSubmit(options);
    }
  };

  if (isSubmitted) {
    if (renderSuccess) {
      return <>{renderSuccess({
        firstName: formData.firstName,
        facilityName,
        contact: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          preferredContact: formData.preferredContact,
          bestTimeToCall: formData.bestTimeToCall,
        },
      })}</>;
    }
    return (
      <LeadIntakeSuccess
        facilityName={facilityName}
        facilityId={facilityId}
        firstName={formData.firstName}
        contact={{
          email: formData.email,
          phone: formData.phone,
          preferredContact: formData.preferredContact,
          bestTimeToCall: formData.bestTimeToCall,
        }}
      />
    );
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
          facilityId={facilityId}
        />
      </div>
    </LeadFormErrorBoundary>
  );
}
