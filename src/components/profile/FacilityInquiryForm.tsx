import { useMemo, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLeadIntakeForm } from "@/components/lead-intake/useLeadIntakeForm";
import { LeadFormErrorBoundary } from "@/components/lead-intake/LeadFormErrorBoundary";
import {
  LEVEL_OF_CARE_OPTIONS,
  INSURANCE_TYPE_OPTIONS,
  URGENCY_OPTIONS,
} from "@/components/lead-intake/types";

/**
 * The Contact-Facility inquiry form.
 *
 * Replaces SingleQuestionFlow on the facility-contact surface. That flow was a
 * long one-question-at-a-time intake wizard built for a placement funnel: it
 * asked for age range, gender, veteran status, legal involvement, prior
 * treatment history, co-occurring conditions, readiness level and more. A
 * directory does not need any of that to let someone ask a treatment center a
 * question, and a person in crisis should not have to answer twenty screens to
 * do it. Everything collected here is something the FACILITY needs in order to
 * reply.
 *
 * What is deliberately preserved from the hardened pipeline:
 *   • server-side email verification (send code → verify code) — NOT relaxed
 *     to shorten the UI; only its presentation is cleaner
 *   • the idempotency key + 3s submission debounce + honeypot
 *   • the exact request field names `submit-qualified-lead` already expects,
 *     so the backend contract is untouched
 *   • the DIRECT_CONTACT_REQUIRED defensive handoff for the rollout window
 *
 * Seeker phone vs facility phone
 *   The seeker's own callback number is OPTIONAL, for every tier. The Pro
 *   restriction in this amendment is about publishing the FACILITY's phone
 *   number, and has nothing to do with whether the seeker may leave one.
 */

interface FacilityInquiryFormProps {
  facilityId: string;
  facilityName: string;
  /** Rendered instead of the form once the inquiry has been accepted. */
  renderSuccess: (args: {
    firstName: string;
    email: string;
    deliveryState: "delivered_to_provider" | "stored_pending_claim" | null;
  }) => React.ReactNode;
  /** Server said the inquiry was NOT accepted (legacy rollout safety valve). */
  onDirectContactRequired?: () => void;
}

type FieldErrors = Partial<Record<"firstName" | "lastName" | "email" | "phone" | "code", string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function FacilityInquiryForm({
  facilityId,
  facilityName,
  renderSuccess,
  onDirectContactRequired,
}: FacilityInquiryFormProps) {
  const {
    formData,
    updateFormData,
    isSubmitting,
    isSubmitted,
    deliveryState,
    handleSubmit,
    codeSent,
    isSendingCode,
    verificationCode,
    setVerificationCode,
    isVerifying,
    isEmailVerified,
    sendVerificationCode,
    verifyCode,
    checkAndAutoVerifyEmail,
  } = useLeadIntakeForm({
    facilityIdOverride: facilityId,
    facilityNameOverride: facilityName,
    onDirectContactRequired,
  });

  const [errors, setErrors] = useState<FieldErrors>({});

  const phoneDigits = useMemo(
    () => (formData.phone || "").replace(/\D/g, ""),
    [formData.phone],
  );
  const hasUsablePhone = phoneDigits.length >= 10;

  // PREFERRED-CONTACT RULE
  // Phone and Text are only offered once the seeker has actually given us a
  // number to use. Offering "call me" with no number is a promise the facility
  // cannot keep, so the option does not exist until it is real, and any
  // previously-chosen phone/text selection collapses back to Email.
  const preferredContact = hasUsablePhone
    ? (formData.preferredContact || "email")
    : "email";

  if (isSubmitted) {
    return (
      <>
        {renderSuccess({
          firstName: formData.firstName.trim(),
          email: formData.email.trim(),
          deliveryState,
        })}
      </>
    );
  }

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!formData.firstName.trim()) next.firstName = "Enter your first name.";
    if (!formData.lastName.trim()) next.lastName = "Enter your last name.";
    if (!formData.email.trim()) {
      next.email = "Enter your email address.";
    } else if (!EMAIL_RE.test(formData.email.trim())) {
      next.email = "Enter a valid email address.";
    }
    if (phoneDigits.length > 0 && phoneDigits.length < 10) {
      next.phone = "Enter a 10-digit phone number, or leave this blank.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onSendCode = async () => {
    if (!validate()) return;
    // Skip the round-trip if this address was already verified recently.
    const already = await checkAndAutoVerifyEmail(formData.email.trim());
    if (already) return;
    await sendVerificationCode();
  };

  const onVerify = async () => {
    if (verificationCode.length !== 6) {
      setErrors((e) => ({ ...e, code: "Enter the 6-digit code from your email." }));
      return;
    }
    setErrors((e) => ({ ...e, code: undefined }));
    const ok = await verifyCode(verificationCode);
    // Verification success submits immediately — the seeker has already filled
    // the form, so a second "now press Send" step is pure friction.
    if (ok) await handleSubmit({ skipVerificationCheck: true });
  };

  const onFormSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!validate()) return;
    if (!isEmailVerified) {
      await onSendCode();
      return;
    }
    await handleSubmit();
  };

  const fieldError = (key: keyof FieldErrors) =>
    errors[key] ? (
      <p id={`${key}-error`} role="alert" className="flex items-center gap-1.5 text-xs text-destructive mt-1.5">
        <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {errors[key]}
      </p>
    ) : null;

  const inputCls = (key: keyof FieldErrors) =>
    cn("h-11", errors[key] && "border-destructive focus-visible:ring-destructive");

  return (
    <LeadFormErrorBoundary>
      <form onSubmit={onFormSubmit} className="space-y-5" noValidate>
        {/* Honeypot — must stay empty. Hidden from AT and from sighted users. */}
        <input
          type="text"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
          value={formData.website}
          onChange={(e) => updateFormData({ website: e.target.value })}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="inq-first">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inq-first"
              autoComplete="given-name"
              className={cn("mt-1.5", inputCls("firstName"))}
              value={formData.firstName}
              onChange={(e) => updateFormData({ firstName: e.target.value })}
              aria-invalid={!!errors.firstName}
              aria-describedby={errors.firstName ? "firstName-error" : undefined}
            />
            {fieldError("firstName")}
          </div>
          <div>
            <Label htmlFor="inq-last">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inq-last"
              autoComplete="family-name"
              className={cn("mt-1.5", inputCls("lastName"))}
              value={formData.lastName}
              onChange={(e) => updateFormData({ lastName: e.target.value })}
              aria-invalid={!!errors.lastName}
              aria-describedby={errors.lastName ? "lastName-error" : undefined}
            />
            {fieldError("lastName")}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="inq-email">
              Email <span className="text-destructive">*</span>
            </Label>
            <Input
              id="inq-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              className={cn("mt-1.5", inputCls("email"))}
              value={formData.email}
              onChange={(e) => updateFormData({ email: e.target.value })}
              disabled={isEmailVerified}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            {fieldError("email")}
          </div>
          <div>
            <Label htmlFor="inq-phone">
              Your phone <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="inq-phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 555-5555"
              className={cn("mt-1.5", inputCls("phone"))}
              value={formData.phone}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {fieldError("phone")}
          </div>
        </div>

        {/* Preferred contact — Phone/Text appear only with a usable number. */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-2">
            How should they reach you?
          </legend>
          <RadioGroup
            value={preferredContact}
            onValueChange={(v) => updateFormData({ preferredContact: v })}
            className="flex flex-wrap gap-2"
          >
            {[
              { value: "email", label: "Email" },
              ...(hasUsablePhone
                ? [
                    { value: "phone", label: "Phone call" },
                    { value: "text", label: "Text" },
                  ]
                : []),
            ].map((opt) => (
              // RadioGroupItem renders a <button role="radio">, which is not a
              // labellable element — `<label htmlFor>` alone would leave it
              // with no accessible name. The explicit aria-label is what
              // screen readers actually announce; the wrapping label keeps the
              // whole chip a 44px-min click target for pointer users.
              <Label
                key={opt.value}
                htmlFor={`pc-${opt.value}`}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3.5 min-h-11 cursor-pointer transition-colors font-normal",
                  preferredContact === opt.value
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-border hover:bg-muted/50",
                )}
              >
                <RadioGroupItem id={`pc-${opt.value}`} value={opt.value} aria-label={opt.label} />
                {opt.label}
              </Label>
            ))}
          </RadioGroup>
          {!hasUsablePhone && (
            <p className="text-xs text-muted-foreground mt-2">
              Add a phone number above if you'd rather they call or text.
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="inq-loc">
              What are you looking for?{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={formData.levelOfCare || undefined}
              onValueChange={(v) => updateFormData({ levelOfCare: v })}
            >
              <SelectTrigger id="inq-loc" className="mt-1.5 h-11">
                <SelectValue placeholder="Select level of care" />
              </SelectTrigger>
              <SelectContent>
                {LEVEL_OF_CARE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="inq-ins">
              Insurance or payment{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Select
              value={formData.insuranceType || undefined}
              onValueChange={(v) => updateFormData({ insuranceType: v })}
            >
              <SelectTrigger id="inq-ins" className="mt-1.5 h-11">
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="inq-urgency">
            Timeline <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Select
            value={formData.urgency || undefined}
            onValueChange={(v) => updateFormData({ urgency: v })}
          >
            <SelectTrigger id="inq-urgency" className="mt-1.5 h-11">
              <SelectValue placeholder="When are you hoping to start?" />
            </SelectTrigger>
            <SelectContent>
              {URGENCY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="inq-message">
            Message <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Textarea
            id="inq-message"
            rows={3}
            className="mt-1.5 resize-y"
            placeholder={`Anything you'd like ${facilityName} to know or questions you have.`}
            value={formData.message}
            onChange={(e) => updateFormData({ message: e.target.value })}
          />
        </div>

        {/* ── Email verification ─────────────────────────────────────────── */}
        {codeSent && !isEmailVerified && (
          <div className="rounded-xl border border-primary/25 bg-primary/5 p-4 space-y-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm text-foreground">
                We sent a 6-digit code to{" "}
                <span className="font-medium break-all">{formData.email.trim()}</span>. Enter it to
                confirm your email and send your inquiry.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                id="inq-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                aria-label="6-digit verification code"
                aria-invalid={!!errors.code}
                aria-describedby={errors.code ? "code-error" : undefined}
                className={cn("h-11 sm:max-w-[10rem] tracking-[0.3em] text-center", errors.code && "border-destructive")}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
              />
              <Button
                type="button"
                className="h-11 flex-1"
                onClick={onVerify}
                disabled={isVerifying || isSubmitting}
              >
                {isVerifying || isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Verifying…
                  </>
                ) : (
                  "Verify & send inquiry"
                )}
              </Button>
            </div>
            {fieldError("code")}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-9 px-2 text-xs"
              onClick={() => sendVerificationCode()}
              disabled={isSendingCode}
            >
              {isSendingCode ? "Sending…" : "Resend code"}
            </Button>
          </div>
        )}

        {(!codeSent || isEmailVerified) && (
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 text-base"
            disabled={isSubmitting || isSendingCode}
            data-testid="facility-inquiry-submit"
          >
            {isSubmitting || isSendingCode ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Send inquiry"
            )}
          </Button>
        )}

        <p className="text-xs text-muted-foreground leading-relaxed">
          Your inquiry goes to {facilityName} only. RehabLookup does not share it with other
          facilities and does not contact you on their behalf.
        </p>
      </form>
    </LeadFormErrorBoundary>
  );
}
