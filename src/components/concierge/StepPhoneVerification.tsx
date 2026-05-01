import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Phone, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface StepPhoneVerificationProps {
  /** Phone in display format like "(555) 123-4567" */
  phone: string;
  firstName: string;
  onVerified: (verifiedAt: string) => void;
  onEditPhone: () => void;
  isVerified: boolean;
  verifiedAt: string | null;
}

/** Convert "(555) 123-4567" or any US phone format to E.164: "+15551234567" */
function toE164(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function StepPhoneVerification({
  phone,
  firstName,
  onVerified,
  onEditPhone,
  isVerified,
  verifiedAt,
}: StepPhoneVerificationProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const e164 = toE164(phone);

  const handleSendCode = async () => {
    if (cooldown > 0) return;
    if (!e164) {
      toast.error("Please enter a valid 10-digit US phone number.");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-sms-verification-code", {
        body: { phone: e164, userType: "seeker" },
      });

      if (error) throw error;

      if (data?.success) {
        setCodeSent(true);
        setCooldown(60);
        toast.success("Verification code sent via SMS");
      } else {
        throw new Error(extractErrorMessage(data, "Failed to send code"));
      }
    } catch (err) {
      console.error("Send SMS code error:", err);
      toast.error(extractErrorMessage(err, "Failed to send verification code. Please try again."));
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6 || !e164) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-sms-code", {
        body: { phone: e164, code, userType: "seeker" },
      });

      if (error) throw error;

      if (data?.verified) {
        const verifiedAtTime = new Date().toISOString();
        onVerified(verifiedAtTime);
        toast.success("Phone verified successfully!");
      } else {
        toast.error(extractErrorMessage(data, "Invalid code. Please try again."));
        setOtpValue("");
      }
    } catch (err) {
      console.error("Verify SMS code error:", err);
      toast.error(extractErrorMessage(err, "Verification failed. Please try again."));
      setOtpValue("");
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify when OTP is complete
  useEffect(() => {
    if (otpValue.length === 6 && !isVerifying && !isVerified) {
      handleVerifyCode(otpValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otpValue]);

  if (isVerified && verifiedAt) {
    return (
      <div className="space-y-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-2">
            Phone Verified
          </h3>
          <p className="text-green-700 dark:text-green-300 mb-1">{phone}</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You're all set to review and submit your request.
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Phone display */}
      <div className="bg-muted/50 rounded-xl p-5 border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Verifying phone for</p>
            <p className="font-semibold text-foreground">{phone || "(no phone provided)"}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditPhone}
          className="text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Change phone number
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!codeSent ? (
          <motion.div
            key="send-sms"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-6">
                {firstName ? `${firstName}, we` : "We"} need to verify your phone number so a
                placement specialist can reach you. Click below to receive a 6-digit code via SMS.
              </p>

              <Button
                onClick={handleSendCode}
                disabled={isSending || cooldown > 0 || !e164}
                className="h-12 px-8 bg-primary hover:bg-primary/90"
                size="lg"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : cooldown > 0 ? (
                  `Resend in ${cooldown}s`
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Send SMS Code
                  </>
                )}
              </Button>

              {!e164 && (
                <p className="text-xs text-destructive mt-3">
                  Please go back and enter a valid 10-digit US phone number.
                </p>
              )}
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Standard message rates may apply
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    We'll only use your number to coordinate your placement. We never sell or share it.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="enter-sms-code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center">
              <p className="text-muted-foreground mb-2">Enter the 6-digit code sent to</p>
              <p className="font-semibold text-foreground mb-6">{phone}</p>

              <div className="flex justify-center mb-6">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={setOtpValue}
                  disabled={isVerifying}
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

              {isVerifying && (
                <div className="flex items-center justify-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Button
                variant="ghost"
                onClick={handleSendCode}
                disabled={isSending || cooldown > 0}
                className="text-muted-foreground"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
              </Button>

              <span className="hidden sm:block text-muted-foreground">•</span>

              <Button
                variant="ghost"
                onClick={onEditPhone}
                className="text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use different number
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Didn't get the code? Check your signal or try resending.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
