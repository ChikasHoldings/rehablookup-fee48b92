import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { RequestHelpFormData } from "@/pages/RequestHelp";
import { ArrowLeft, Loader2, Mail, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface StepContactVerificationProps {
  formData: RequestHelpFormData;
  updateFormData: (updates: Partial<RequestHelpFormData>) => void;
  facilityId: string | null;
  onBack: () => void;
  onSuccess: () => void;
}

export function StepContactVerification({
  formData,
  updateFormData,
  facilityId,
  onBack,
  onSuccess,
}: StepContactVerificationProps) {
  const { toast } = useToast();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      cooldownRef.current = setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (cooldownRef.current) clearTimeout(cooldownRef.current);
    };
  }, [resendCooldown]);

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

    // Check resend limit
    if (resendCount >= 3) {
      toast({
        title: "Too many attempts",
        description: "Maximum verification attempts reached. Please wait 10 minutes.",
        variant: "destructive",
      });
      return;
    }

    // Check cooldown
    if (resendCooldown > 0) {
      toast({
        title: "Please wait",
        description: `You can resend in ${resendCooldown} seconds`,
        variant: "destructive",
      });
      return;
    }

    setIsSendingCode(true);
    setErrors(prev => ({ ...prev, code: "" }));

    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { email: formData.email.toLowerCase().trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCodeSent(true);
      setResendCount(prev => prev + 1);
      setResendCooldown(60); // 60 second cooldown between resends
      setVerificationCode(""); // Clear any previous code

      toast({
        title: "Verification code sent",
        description: "Check your email for the 6-digit code",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Please try again";
      
      if (errorMessage.includes("Too many")) {
        setResendCount(3); // Max out resends
      }
      
      toast({
        title: "Failed to send code",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setErrors(prev => ({ ...prev, code: "Please enter the 6-digit code" }));
      return;
    }

    setIsVerifying(true);
    setErrors(prev => ({ ...prev, code: "" }));

    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { 
          email: formData.email.toLowerCase().trim(),
          code: verificationCode 
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setIsEmailVerified(true);
      toast({
        title: "Email verified",
        description: "You can now submit your request",
      });
    } catch (error: any) {
      const errorMessage = error.message || "Invalid code";
      setErrors(prev => ({ ...prev, code: errorMessage }));
      
      // Don't clear the code on error so user can see what they entered
      toast({
        title: "Verification failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!isEmailVerified) {
      toast({
        title: "Email not verified",
        description: "Please verify your email before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      
      // Get source from URL for analytics
      const urlParams = new URLSearchParams(window.location.search);
      const source = urlParams.get("source") || "direct";
      
      const { data, error } = await supabase.functions.invoke("submit-qualified-lead", {
        body: {
          facilityId: facilityId || undefined,
          whoSeekingHelp: formData.whoSeekingHelp,
          locationZip: formData.locationZip,
          locationCityState: formData.locationCityState || undefined,
          urgency: formData.urgency,
          primarySubstance: formData.primarySubstance,
          levelOfCare: formData.levelOfCare,
          dualDiagnosis: formData.dualDiagnosis || undefined,
          insuranceType: formData.insuranceType,
          insuranceProvider: formData.insuranceProvider || undefined,
          budgetPreference: formData.budgetPreference || undefined,
          name: fullName,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: formData.phone.trim(),
          email: formData.email.toLowerCase().trim(),
          preferredContact: formData.preferredContact,
          message: formData.message || undefined,
          source: source,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Track successful form submission
      try {
        await supabase.functions.invoke("track-request-help", {
          body: {
            eventType: "form_submit",
            source: source,
            facilityId: facilityId || null,
            metadata: { qualified: true },
          },
        });
      } catch (trackError) {
        console.error("Failed to track form submit:", trackError);
      }

      onSuccess();
    } catch (error: any) {
      const errorMessage = error.message || "Please try again";
      toast({
        title: "Submission failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateFormData({ email: e.target.value });
    setErrors(prev => ({ ...prev, email: "" }));
    // Reset verification state when email changes
    setCodeSent(false);
    setIsEmailVerified(false);
    setVerificationCode("");
    setResendCount(0);
    setResendCooldown(0);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">Contact & Verification</h2>
        <p className="text-sm text-muted-foreground">We'll need to verify your email before submitting.</p>
      </div>

      {/* First Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-base font-medium">
            First Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="firstName"
            placeholder="John"
            value={formData.firstName}
            onChange={(e) => {
              updateFormData({ firstName: e.target.value });
              setErrors(prev => ({ ...prev, firstName: "" }));
            }}
            className={errors.firstName ? "border-destructive" : ""}
            disabled={codeSent}
          />
          {errors.firstName && <p className="text-sm text-destructive">{errors.firstName}</p>}
        </div>

        {/* Last Name */}
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-base font-medium">
            Last Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="lastName"
            placeholder="Doe"
            value={formData.lastName}
            onChange={(e) => {
              updateFormData({ lastName: e.target.value });
              setErrors(prev => ({ ...prev, lastName: "" }));
            }}
            className={errors.lastName ? "border-destructive" : ""}
            disabled={codeSent}
          />
          {errors.lastName && <p className="text-sm text-destructive">{errors.lastName}</p>}
        </div>
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-base font-medium">
          Phone Number <span className="text-destructive">*</span>
        </Label>
        <Input
          id="phone"
          type="tel"
          placeholder="(555) 123-4567"
          value={formData.phone}
          onChange={(e) => {
            updateFormData({ phone: formatPhone(e.target.value) });
            setErrors(prev => ({ ...prev, phone: "" }));
          }}
          className={errors.phone ? "border-destructive" : ""}
          disabled={codeSent}
        />
        {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-base font-medium">
          Email Address <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleEmailChange}
            className={`flex-1 ${errors.email ? "border-destructive" : ""}`}
            disabled={isEmailVerified}
          />
          {!isEmailVerified && (
            <Button
              type="button"
              variant={codeSent ? "outline" : "secondary"}
              onClick={handleSendCode}
              disabled={isSendingCode || !formData.email || resendCooldown > 0 || resendCount >= 3}
              className="shrink-0 min-w-[100px]"
            >
              {isSendingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : resendCooldown > 0 ? (
                <span className="text-sm">{resendCooldown}s</span>
              ) : codeSent ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Resend
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          )}
          {isEmailVerified && (
            <div className="flex items-center text-green-600 shrink-0 px-3">
              <CheckCircle2 className="h-5 w-5 mr-1" />
              <span className="text-sm font-medium">Verified</span>
            </div>
          )}
        </div>
        {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        {resendCount >= 3 && !isEmailVerified && (
          <p className="text-sm text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            Maximum attempts reached. Please wait 10 minutes.
          </p>
        )}
      </div>

      {/* Verification Code Input */}
      {codeSent && !isEmailVerified && (
        <div className="space-y-3 p-4 bg-muted/50 rounded-lg border">
          <Label className="text-base font-medium">Enter Verification Code</Label>
          <p className="text-sm text-muted-foreground">We sent a 6-digit code to {formData.email}</p>
          <div className="flex flex-col items-center gap-4">
            <InputOTP
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                setErrors(prev => ({ ...prev, code: "" }));
              }}
              maxLength={6}
            >
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {errors.code && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertCircle className="h-4 w-4" />
                {errors.code}
              </p>
            )}
            <Button
              type="button"
              onClick={handleVerifyCode}
              disabled={isVerifying || verificationCode.length !== 6}
              className="w-full max-w-[200px]"
            >
              {isVerifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Verify Code
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              Code expires in 10 minutes. {resendCount < 3 && `Resends remaining: ${3 - resendCount}`}
            </p>
          </div>
        </div>
      )}

      {/* Preferred Contact */}
      <div className="space-y-3">
        <Label className="text-base font-medium">Preferred contact method</Label>
        <RadioGroup
          value={formData.preferredContact}
          onValueChange={(value) => updateFormData({ preferredContact: value })}
          className="grid grid-cols-2 gap-3"
        >
          <label
            className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              formData.preferredContact === "call"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="call" className="sr-only" />
            <span className="font-medium">Phone Call</span>
          </label>
          <label
            className={`flex items-center justify-center px-4 py-3 border rounded-lg cursor-pointer transition-colors ${
              formData.preferredContact === "email"
                ? "border-primary bg-primary/5 text-primary"
                : "border-border hover:border-primary/50"
            }`}
          >
            <RadioGroupItem value="email" className="sr-only" />
            <span className="font-medium">Email</span>
          </label>
        </RadioGroup>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message" className="text-base font-medium">
          Additional message <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <Textarea
          id="message"
          placeholder="Is there anything else you'd like us to know?"
          value={formData.message}
          onChange={(e) => updateFormData({ message: e.target.value })}
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1" size="lg" disabled={isSubmitting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={handleSubmit}
          className="flex-1"
          size="lg"
          disabled={!isEmailVerified || isSubmitting}
        >
          {isSubmitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : null}
          Submit Request
        </Button>
      </div>
    </div>
  );
}
