import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw, Clock, Briefcase } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { LeadIntakeFormData, BEST_TIME_OPTIONS, EMPLOYMENT_OPTIONS } from "./types";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "@/lib/phoneUtils";
import { EmailInput } from "@/components/ui/email-input";
import { isValidEmail } from "@/lib/emailUtils";
import { cn } from "@/lib/utils";

interface StepContactVerifyProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onBack: () => void;
  onSubmit: () => Promise<void>;
  // Email verification props
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
  checkAndAutoVerifyEmail: (email: string) => Promise<boolean>;
  isSubmitting: boolean;
}

export function StepContactVerify({
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
}: StepContactVerifyProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Real-time validation
  const validation = useMemo(() => ({
    firstName: formData.firstName.trim().length >= 1,
    lastName: formData.lastName.trim().length >= 1,
    phone: isValidPhoneNumber(formData.phone),
    email: isValidEmail(formData.email),
  }), [formData]);

  const validateContact = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!phoneDigits || phoneDigits.length < 10) {
      newErrors.phone = "Please enter a valid phone number";
    }

    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendCode = async () => {
    if (!validateContact()) return;
    await sendVerificationCode();
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length === 6) {
      const success = await verifyCode(verificationCode);
      if (!success) {
        setErrors(prev => ({ ...prev, code: "Invalid or expired code" }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!isEmailVerified) {
      setErrors(prev => ({ ...prev, email: "Please verify your email first" }));
      return;
    }
    await onSubmit();
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in">
      <div>
        <h2 className="text-xl md:text-lg font-semibold text-foreground mb-2">
          Almost There!
        </h2>
        <p className="text-base md:text-sm text-muted-foreground">
          We'll verify your email to connect you with the right providers.
        </p>
      </div>

      {/* Honeypot - hidden from users, traps bots */}
      <div className="hidden" aria-hidden="true">
        <Input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => updateFormData({ website: e.target.value })}
        />
      </div>

      {/* First Name & Last Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label htmlFor="firstName" className="text-base font-medium">
            First Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="firstName"
              placeholder="John"
              value={formData.firstName}
              onChange={(e) => {
                updateFormData({ firstName: e.target.value });
                setErrors(prev => ({ ...prev, firstName: "" }));
              }}
              className={cn(
                "h-12 md:h-10 text-base",
                errors.firstName && "border-destructive",
                validation.firstName && formData.firstName && "pr-10"
              )}
              disabled={codeSent}
              autoComplete="given-name"
            />
            {validation.firstName && formData.firstName && !errors.firstName && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
        </div>

        <div className="space-y-3">
          <Label htmlFor="lastName" className="text-base font-medium">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="lastName"
              placeholder="Doe"
              value={formData.lastName}
              onChange={(e) => {
                updateFormData({ lastName: e.target.value });
                setErrors(prev => ({ ...prev, lastName: "" }));
              }}
              className={cn(
                "h-12 md:h-10 text-base",
                errors.lastName && "border-destructive",
                validation.lastName && formData.lastName && "pr-10"
              )}
              disabled={codeSent}
              autoComplete="family-name"
            />
            {validation.lastName && formData.lastName && !errors.lastName && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-3">
        <Label htmlFor="phone" className="text-base font-medium">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <div className="relative">
          <PhoneInput
            id="phone"
            value={formData.phone}
            onChange={(value) => {
              updateFormData({ phone: value });
              setErrors(prev => ({ ...prev, phone: "" }));
            }}
            className={cn(
              "h-12 md:h-10 text-base",
              errors.phone && "border-destructive",
              validation.phone && "pr-10"
            )}
            disabled={codeSent}
          />
          {validation.phone && !errors.phone && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
          )}
        </div>
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>

      {/* Email */}
      <div className="space-y-3">
        <Label htmlFor="email" className="text-base font-medium">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <EmailInput
              id="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(value) => {
                updateFormData({ email: value });
                setErrors(prev => ({ ...prev, email: "" }));
                if (codeSent || isEmailVerified) {
                  resetEmailVerification();
                }
              }}
              className={cn(
                "h-12 md:h-10 text-base w-full",
                errors.email && "border-destructive",
                validation.email && formData.email && !isEmailVerified && "pr-10"
              )}
              disabled={isEmailVerified}
            />
            {validation.email && formData.email && !isEmailVerified && !errors.email && (
              <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
            )}
          </div>
          {!isEmailVerified && (
            <Button
              type="button"
              variant={codeSent ? "outline" : "secondary"}
              onClick={handleSendCode}
              disabled={isSendingCode || !formData.email || resendCooldown > 0 || resendCount >= 3}
              className="shrink-0 h-12 md:h-10 min-w-[120px] text-base"
            >
              {isSendingCode ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : resendCooldown > 0 ? (
                <span className="text-base">{resendCooldown}s</span>
              ) : codeSent ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2" />
                  Resend
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5 mr-2" />
                  Verify
                </>
              )}
            </Button>
          )}
          {isEmailVerified && (
            <div className="flex items-center justify-center text-green-600 shrink-0 px-4 h-12 md:h-10 bg-green-50 rounded-xl border-2 border-green-200">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              <span className="text-base font-medium">Verified</span>
            </div>
          )}
        </div>
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        {resendCount >= 3 && !isEmailVerified && (
          <p className="text-sm text-amber-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Maximum attempts reached. Please wait 10 minutes.
          </p>
        )}
      </div>

      {/* Verification Code Input */}
      {codeSent && !isEmailVerified && (
        <div className="space-y-4 p-5 bg-muted/50 rounded-xl border-2">
          <Label className="text-base font-medium">Enter Verification Code</Label>
          <p className="text-sm text-muted-foreground">We sent a 6-digit code to {formData.email}</p>
          <div className="flex flex-col items-center gap-5">
            <InputOTP
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                setErrors(prev => ({ ...prev, code: "" }));
              }}
              maxLength={6}
              className="gap-2"
            >
              <InputOTPGroup className="gap-2">
                <InputOTPSlot index={0} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
                <InputOTPSlot index={1} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
                <InputOTPSlot index={2} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
                <InputOTPSlot index={3} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
                <InputOTPSlot index={4} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
                <InputOTPSlot index={5} className="h-14 w-12 md:h-12 md:w-10 text-xl rounded-xl" />
              </InputOTPGroup>
            </InputOTP>
            {errors.code && (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {errors.code}
              </p>
            )}
            <Button
              type="button"
              onClick={handleVerifyCode}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full max-w-[240px] h-12 text-base"
            >
              {isVerifying ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Verify Code
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              Code expires in 10 minutes. {resendCount < 3 && `Resends remaining: ${3 - resendCount}`}
            </p>
          </div>
        </div>
      )}

      {/* Best Time to Call & Employment - NEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Best time to reach you
          </Label>
          <Select
            value={formData.bestTimeToCall}
            onValueChange={(value) => updateFormData({ bestTimeToCall: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Select preferred time" />
            </SelectTrigger>
            <SelectContent>
              {BEST_TIME_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            Employment status <span className="text-muted-foreground text-xs">(optional)</span>
          </Label>
          <Select
            value={formData.employmentStatus}
            onValueChange={(value) => updateFormData({ employmentStatus: value })}
          >
            <SelectTrigger className="h-12 text-sm">
              <SelectValue placeholder="Select if applicable" />
            </SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2.5">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Preferred Contact */}
      <div className="space-y-4">
        <Label className="text-base font-medium">Preferred contact method</Label>
        <RadioGroup
          value={formData.preferredContact}
          onValueChange={(value) => updateFormData({ preferredContact: value })}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`flex items-center justify-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
              formData.preferredContact === "call"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="call" className="sr-only" />
            <span className="font-medium text-base">Phone Call</span>
          </label>
          <label
            className={`flex items-center justify-center px-4 py-4 md:py-3 border-2 rounded-xl cursor-pointer transition-all active:scale-[0.98] ${
              formData.preferredContact === "email"
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="email" className="sr-only" />
            <span className="font-medium text-base">Email</span>
          </label>
        </RadioGroup>
      </div>

      {/* Message */}
      <div className="space-y-3">
        <Label htmlFor="message" className="text-base font-medium">
          Anything else you'd like us to know? <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Any details about your situation that might help us find the right fit..."
          value={formData.message}
          onChange={(e) => updateFormData({ message: e.target.value })}
          className="min-h-[100px] text-base resize-none"
          maxLength={1000}
        />
      </div>

      {/* Privacy note */}
      <p className="text-sm text-muted-foreground text-center bg-muted/50 rounded-lg p-3">
        🔒 Your information is confidential and will only be shared with verified treatment providers who can help.
      </p>

      <div className="flex gap-3 pt-4 md:pt-4">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="flex-1 h-14 md:h-12 text-base" 
          size="lg"
          disabled={isSubmitting}
        >
          <ArrowLeft className="mr-2 h-5 w-5" />
          Back
        </Button>
        <Button 
          onClick={handleSubmit} 
          className="flex-1 h-14 md:h-12 text-base" 
          size="lg"
          disabled={isSubmitting || !isEmailVerified}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </div>
    </div>
  );
}