import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { extractErrorMessage } from "@/lib/extractErrorMessage";
import { Mail, CheckCircle2, Loader2, Shield, RefreshCw, Edit2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StepEmailVerificationProps {
  email: string;
  onVerified: (verifiedAt: string) => void;
  onEditEmail: () => void;
  isVerified: boolean;
  verifiedAt: string | null;
}

export function StepEmailVerification({ 
  email, 
  onVerified, 
  onEditEmail,
  isVerified,
  verifiedAt 
}: StepEmailVerificationProps) {
  const { toast } = useToast();
  const [codeSent, setCodeSent] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  // Check if email was previously verified (within 24 hours)
  useEffect(() => {
    const checkPreviousVerification = async () => {
      if (isVerified && verifiedAt) {
        return; // Already verified in this session
      }
      
      // Check localStorage for recent verification
      const storedVerification = localStorage.getItem(`intl_email_verified_${email}`);
      if (storedVerification) {
        const { verifiedAt: storedTime } = JSON.parse(storedVerification);
        const verifiedDate = new Date(storedTime);
        const now = new Date();
        const hoursDiff = (now.getTime() - verifiedDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff < 24) {
          onVerified(storedTime);
        }
      }
    };
    
    checkPreviousVerification();
  }, [email, isVerified, verifiedAt, onVerified]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSendCode = async () => {
    if (!email) return;
    
    setIsSending(true);
    try {
      const { error } = await supabase.functions.invoke("send-verification-code", {
        body: { email, type: "international_placement" },
      });

      if (error) throw error;

      setCodeSent(true);
      setCooldown(60);
      toast({
        title: "Code Sent",
        description: "Check your email for the 6-digit verification code.",
      });
    } catch (err) {
      console.error("Send code error:", err);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;

    setIsVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { email, code, type: "international_placement" },
      });

      if (error) throw new Error(extractErrorMessage(error, "Verification failed"));
      if (!data?.success) throw new Error(extractErrorMessage(data, "Verification failed"));

      const verifiedTime = new Date().toISOString();
      
      // Store verification in localStorage
      localStorage.setItem(`intl_email_verified_${email}`, JSON.stringify({
        verifiedAt: verifiedTime,
      }));

      onVerified(verifiedTime);
      
      toast({
        title: "Email Verified",
        description: "Your email has been successfully verified.",
      });
    } catch (err: any) {
      console.error("Verify error:", err);
      toast({
        title: "Verification Failed",
        description: err.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Auto-verify when code is complete
  useEffect(() => {
    if (code.length === 6 && !isVerified && !isVerifying) {
      handleVerifyCode();
    }
  }, [code]);

  if (isVerified) {
    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="space-y-5 md:space-y-6"
      >
        <div className="text-center mb-6 md:mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 md:h-10 md:w-10 text-primary" />
          </div>
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
            Email Verified!
          </h2>
          <p className="text-sm md:text-base text-muted-foreground">
            Your email <span className="font-medium text-foreground">{email}</span> has been verified
          </p>
        </div>

        <div className="max-w-sm mx-auto text-center">
          <p className="text-sm text-muted-foreground mb-4">
            Click "Continue" to review your application and complete payment
          </p>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5" />
            Your information is secure
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-5 md:space-y-6"
    >
      <div className="text-center mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground mb-1.5 md:mb-2">
          Verify Your Email
        </h2>
        <p className="text-sm md:text-base text-muted-foreground">
          We'll send a verification code to confirm your email address
        </p>
      </div>

      <div className="max-w-sm mx-auto space-y-5 px-1">
        {/* Email Display */}
        <div className="bg-muted/50 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-foreground">{email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onEditEmail}
            className="text-primary hover:text-primary/80"
          >
            <Edit2 className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </div>

        {!codeSent ? (
          <>
            <Button
              onClick={handleSendCode}
              disabled={isSending}
              className="w-full h-12"
              size="lg"
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sending Code...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-5 w-5" />
                  Send Verification Code
                </>
              )}
            </Button>

            <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg">
              <Shield className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                We'll send a 6-digit code to verify your email. This helps protect your application and ensures we can reach you.
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-3">
              <Label className="text-sm font-medium text-center block">
                Enter the 6-digit code sent to your email
              </Label>
              <div className="flex justify-center">
                <InputOTP
                  value={code}
                  onChange={setCode}
                  maxLength={6}
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
            </div>

            {isVerifying && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verifying...
              </div>
            )}

            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendCode}
                disabled={cooldown > 0 || isSending}
                className="text-muted-foreground"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSending ? 'animate-spin' : ''}`} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Didn't receive the code? Check your spam folder or click resend.
            </p>
          </>
        )}
      </div>
    </motion.div>
  );
}
