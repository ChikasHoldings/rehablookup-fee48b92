import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  ArrowLeft, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Shield,
  Send,
  RefreshCw,
  Phone,
  Mail,
  MessageSquare
} from "lucide-react";
import { LeadIntakeData, PREFERRED_CONTACT_OPTIONS } from "./types";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { isValidPhoneNumber } from "@/lib/phoneUtils";
import { isValidEmail } from "@/lib/emailUtils";
import { cn } from "@/lib/utils";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface StepContactProps {
  formData: LeadIntakeData;
  updateFormData: (updates: Partial<LeadIntakeData>) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  // Email verification
  codeSent: boolean;
  isSendingCode: boolean;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isVerifying: boolean;
  isEmailVerified: boolean;
  resendCount: number;
  resendCooldown: number;
  sendVerificationCode: () => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  resetEmailVerification: () => void;
  isSubmitting: boolean;
}

export function StepContact({
  formData,
  updateFormData,
  onBack,
  onSubmit,
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
  isSubmitting,
}: StepContactProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [previousEmail, setPreviousEmail] = useState(formData.email);

  // Reset verification if email changes
  useEffect(() => {
    if (formData.email !== previousEmail && codeSent) {
      resetEmailVerification();
      setPreviousEmail(formData.email);
    }
  }, [formData.email, previousEmail, codeSent, resetEmailVerification]);

  // Auto-verify when code is complete
  useEffect(() => {
    if (verificationCode.length === 6 && !isVerifying && !isEmailVerified) {
      verifyCode(verificationCode);
    }
  }, [verificationCode, isVerifying, isEmailVerified, verifyCode]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }
    if (!formData.phone || !isValidPhoneNumber(formData.phone)) {
      newErrors.phone = "Please enter a valid phone number";
    }
    if (!formData.email || !isValidEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validate()) return;
    await sendVerificationCode();
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSubmit();
  };

  const canSubmit = isEmailVerified && !isSubmitting;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Honeypot - hidden from users */}
      <input
        type="text"
        name="website"
        value={formData.website}
        onChange={(e) => updateFormData({ website: e.target.value })}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
      />

      {/* Name Fields */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="font-semibold">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            type="text"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => {
              updateFormData({ firstName: e.target.value });
              setErrors(prev => ({ ...prev, firstName: "" }));
            }}
            className={cn("h-12", errors.firstName && "border-destructive")}
          />
          {errors.firstName && (
            <p className="text-xs text-destructive">{errors.firstName}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName" className="font-semibold">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            type="text"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => {
              updateFormData({ lastName: e.target.value });
              setErrors(prev => ({ ...prev, lastName: "" }));
            }}
            className={cn("h-12", errors.lastName && "border-destructive")}
          />
          {errors.lastName && (
            <p className="text-xs text-destructive">{errors.lastName}</p>
          )}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="font-semibold">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <PhoneInput
          value={formData.phone}
          onChange={(value) => {
            updateFormData({ phone: value });
            setErrors(prev => ({ ...prev, phone: "" }));
          }}
          className={cn("h-12", errors.phone && "border-destructive")}
        />
        {errors.phone && (
          <p className="text-xs text-destructive">{errors.phone}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="font-semibold">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <EmailInput
            value={formData.email}
            onChange={(value) => {
              updateFormData({ email: value });
              setErrors(prev => ({ ...prev, email: "" }));
            }}
            disabled={isEmailVerified}
            className={cn("h-12 pr-24", errors.email && "border-destructive")}
          />
          {isEmailVerified && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-medium">Verified</span>
            </div>
          )}
        </div>
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email}</p>
        )}
      </div>

      {/* Email Verification Section */}
      {!isEmailVerified && (
        <div className="rounded-xl border bg-muted/30 p-4 space-y-4">
          {!codeSent ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <Shield className="h-4 w-4 text-primary" />
                <span className="font-medium">Verify your email to continue</span>
              </div>
              <Button
                type="button"
                onClick={handleSendCode}
                disabled={isSendingCode || !formData.email || !isValidEmail(formData.email)}
                className="w-full gap-2"
              >
                {isSendingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm font-medium">Enter the 6-digit code sent to</p>
                <p className="text-sm text-primary font-semibold">{formData.email}</p>
              </div>
              
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={verificationCode}
                  onChange={setVerificationCode}
                  disabled={isVerifying}
                >
                  <InputOTPGroup>
                    {[0, 1, 2, 3, 4, 5].map((index) => (
                      <InputOTPSlot key={index} index={index} className="h-12 w-10" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verifying...
                </div>
              )}

              <div className="flex items-center justify-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={sendVerificationCode}
                  disabled={resendCooldown > 0 || resendCount >= 3}
                  className="text-sm gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {resendCooldown > 0 
                    ? `Resend in ${resendCooldown}s` 
                    : "Resend Code"}
                </Button>
                <span className="text-muted-foreground">•</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetEmailVerification}
                  className="text-sm"
                >
                  Change Email
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Preferred Contact Method */}
      <div className="space-y-3">
        <Label className="font-semibold">Preferred Contact Method</Label>
        <div className="grid grid-cols-3 gap-2">
          {PREFERRED_CONTACT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => updateFormData({ preferredContact: option.value })}
              className={cn(
                "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all duration-200",
                "hover:border-primary/50 hover:bg-primary/5",
                formData.preferredContact === option.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-foreground"
              )}
            >
              <span>{option.emoji}</span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Message (Optional) */}
      <div className="space-y-2">
        <Label htmlFor="message" className="font-semibold">
          Anything else you'd like us to know? <span className="text-muted-foreground font-normal">(Optional)</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Share any additional details about your situation..."
          value={formData.message}
          onChange={(e) => updateFormData({ message: e.target.value })}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Privacy Notice */}
      <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
        <Shield className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-foreground">Your privacy is protected.</strong> Your information is encrypted and will only be shared with treatment providers you connect with.
        </p>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-2">
        <Button 
          type="button"
          variant="outline" 
          onClick={onBack} 
          size="lg" 
          className="gap-2"
          disabled={isSubmitting}
        >
          <ArrowLeft className="h-5 w-5" />
          Back
        </Button>
        <Button 
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          size="lg" 
          className="flex-1 gap-2 h-12 text-base"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Get Treatment Help
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
