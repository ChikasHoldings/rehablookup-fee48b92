import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle, Mail, Shield, ArrowLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

interface StepEmailVerificationProps {
  email: string;
  firstName: string;
  onVerified: (verifiedAt: string) => void;
  onEditEmail: () => void;
  isVerified: boolean;
  verifiedAt: string | null;
}

export function StepEmailVerification({
  email,
  firstName,
  onVerified,
  onEditEmail,
  isVerified,
  verifiedAt,
}: StepEmailVerificationProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Handle cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendCode = async () => {
    if (cooldown > 0) return;
    
    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { email, purpose: "concierge_intake" }
      });

      if (error) throw error;

      if (data?.success) {
        setCodeSent(true);
        setCooldown(60); // 60 second cooldown
        toast.success("Verification code sent to your email");
      } else {
        throw new Error(extractErrorMessage(data, "Failed to send code"));
      }
    } catch (err) {
      console.error("Send code error:", err);
      toast.error("Failed to send verification code. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async (code: string) => {
    if (code.length !== 6) return;
    
    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email, code }
      });

      if (error) throw error;

      if (data?.verified) {
        const verifiedAtTime = new Date().toISOString();
        onVerified(verifiedAtTime);
        toast.success("Email verified successfully!");
      } else {
        toast.error(extractErrorMessage(data, "Invalid code. Please try again."));
        setOtpValue("");
      }
    } catch (err) {
      console.error("Verify code error:", err);
      toast.error("Verification failed. Please try again.");
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
  }, [otpValue]);

  // Already verified state
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
            Email Verified
          </h3>
          <p className="text-green-700 dark:text-green-300 mb-1">
            {email}
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You're all set to proceed to payment
          </p>
        </motion.div>

        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Why we verify your email</p>
              <p>
                This ensures we can send you important updates about your placement request
                and connect you with the right treatment programs.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Email display */}
      <div className="bg-muted/50 rounded-xl p-5 border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Verifying email for</p>
            <p className="font-semibold text-foreground">{email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onEditEmail}
          className="text-primary hover:text-primary/80 -ml-2"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1" />
          Change email
        </Button>
      </div>

      <AnimatePresence mode="wait">
        {!codeSent ? (
          <motion.div
            key="send-code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="text-center py-4">
              <p className="text-muted-foreground mb-6">
                {firstName ? `${firstName}, we` : "We"} need to verify your email before you can complete payment.
                Click below to receive a 6-digit verification code.
              </p>
              
              <Button
                onClick={handleSendCode}
                disabled={isSending || cooldown > 0}
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
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800 dark:text-blue-200 mb-1">
                    Secure & Private
                  </p>
                  <p className="text-blue-700 dark:text-blue-300">
                    We'll never spam you or share your email. This verification is solely
                    to ensure we can send updates about your placement.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="enter-code"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Enter the 6-digit code sent to
              </p>
              <p className="font-semibold text-foreground mb-6">{email}</p>
              
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
                onClick={onEditEmail}
                className="text-muted-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Use different email
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground">
              Didn't receive the code? Check your spam folder or try resending.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
