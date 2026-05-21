import { useState, useEffect } from "react";
import { Phone, CheckCircle, Loader2, AlertCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatPhoneE164 } from "@/lib/phoneUtils";

interface PhoneVerificationStepProps {
  phone: string;
  onPhoneChange: (phone: string) => void;
  userId?: string;
  userType: "provider" | "seeker";
  isVerified?: boolean;
  onVerified?: () => void;
  className?: string;
  /**
   * Optional label override. Defaults to "Phone Number". Pass e.g.
   * "Facility Phone *" when the same number doubles as the public
   * callback line for a listing.
   */
  label?: string;
  /**
   * Optional helper line shown beneath the input on the verified state.
   * Defaults to "Your phone is verified. You'll receive SMS alerts for
   * new leads."
   */
  verifiedHelper?: string;
}

export function PhoneVerificationStep({
  phone,
  onPhoneChange,
  userId,
  userType,
  isVerified = false,
  onVerified,
  className = "",
  label = "Phone Number",
  verifiedHelper = "Your phone is verified. You'll receive SMS alerts for new leads.",
}: PhoneVerificationStepProps) {
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [localVerified, setLocalVerified] = useState(isVerified);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Sync with parent's isVerified prop
  useEffect(() => {
    setLocalVerified(isVerified);
  }, [isVerified]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // E.164 formatting now lives in src/lib/phoneUtils so the signup
  // upsert + the settings save + this verification flow all produce
  // the same canonical form. The previous inline implementation here
  // diverged from what SeekerSignup persisted (which was none), which
  // caused phone-verification lookups against a stored non-normalized
  // phone to fail. See docs/seeker-sms-system-hardening-2026-05-21.md.

  const isValidPhoneForVerification = (): boolean => {
    const cleaned = phone.replace(/\D/g, "");
    return cleaned.length >= 10;
  };

  const handleSendCode = async () => {
    if (!isValidPhoneForVerification()) {
      setError("Please enter a valid 10-digit phone number");
      return;
    }

    setIsSendingCode(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneE164(phone);
      
      const { data, error: funcError } = await supabase.functions.invoke(
        "send-sms-verification-code",
        {
          body: { phone: formattedPhone, userType },
        }
      );

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setCodeSent(true);
      setShowVerification(true);
      setResendCooldown(60);
      toast({
        title: "Code sent",
        description: "Please check your phone for the verification code.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send verification code";
      setError(message);
      toast({
        title: "Error sending code",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const formattedPhone = formatPhoneE164(phone);
      
      const { data, error: funcError } = await supabase.functions.invoke(
        "verify-sms-code",
        {
          body: {
            phone: formattedPhone,
            code: verificationCode,
            userId,
            userType,
          },
        }
      );

      if (funcError) throw funcError;
      if (data?.error) throw new Error(data.error);

      setLocalVerified(true);
      setShowVerification(false);
      setVerificationCode("");
      toast({
        title: "Phone verified",
        description: "Your phone number has been verified successfully.",
      });
      onVerified?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to verify code";
      setError(message);
      toast({
        title: "Verification failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = () => {
    if (resendCooldown > 0) return;
    setVerificationCode("");
    handleSendCode();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            {label}
          </Label>
          {localVerified && (
            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
        
        <div className="flex gap-2">
          <div className="flex-1">
            <PhoneInput
              id="phone"
              value={phone}
              onChange={onPhoneChange}
              placeholder="(555) 123-4567"
              disabled={localVerified}
            />
          </div>
          
          {!localVerified && isValidPhoneForVerification() && !showVerification && (
            <Button
              type="button"
              variant="outline"
              onClick={handleSendCode}
              disabled={isSendingCode}
              className="shrink-0"
            >
              {isSendingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Verify
                </>
              )}
            </Button>
          )}
        </div>
        
        {localVerified && (
          <p className="text-xs text-muted-foreground">{verifiedHelper}</p>
        )}
      </div>

      {/* Verification Code Input */}
      {showVerification && !localVerified && (
        <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Phone className="h-4 w-4" />
            <span>Enter the 6-digit code sent to your phone</span>
          </div>

          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
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
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleResend}
              disabled={resendCooldown > 0 || isSendingCode}
            >
              {resendCooldown > 0 ? (
                `Resend in ${resendCooldown}s`
              ) : isSendingCode ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Resend code"
              )}
            </Button>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowVerification(false);
                  setVerificationCode("");
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Verify"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
