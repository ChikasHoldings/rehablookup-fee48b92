import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Mail, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmailVerificationStepProps {
  email: string;
  onVerified: () => void;
  onBack: () => void;
}

export function EmailVerificationStep({ email, onVerified, onBack }: EmailVerificationStepProps) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState("");
  const { toast } = useToast();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Send code on mount
  useEffect(() => {
    if (!codeSent && email) {
      sendVerificationCode();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only re-run when email changes; codeSent/sendVerificationCode are guards
  }, [email]);

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const sendVerificationCode = async () => {
    if (isSending) return;
    setIsSending(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("send-verification-code", {
        body: { email },
      });

      if (fnError) {
        console.error("[EmailVerification] Function invocation error:", fnError);
        throw fnError;
      }

      if (data?.error) {
        const errorCode = data?.errorCode;
        let description = data.error;
        
        // Provide specific guidance based on error type
        if (errorCode === "INVALID_EMAIL") {
          description = "Please go back and check your email address is correct.";
        } else if (errorCode === "EMAIL_BLOCKED") {
          description = "This email cannot receive messages. Please use a different email address.";
        } else if (errorCode === "RATE_LIMITED") {
          description = "Too many attempts. Please wait a few minutes before trying again.";
        }
        
        setError(description);
        toast({
          title: "Unable to send code",
          description,
          variant: "destructive",
        });
        setIsSending(false);
        return;
      }
      
      setCodeSent(true);
      setResendCooldown(60);
      toast({
        title: "Code Sent",
        description: `A 6-digit verification code has been sent to ${email}`,
      });
      setIsSending(false);
    } catch (err: any) {
      console.error("[EmailVerification] Unexpected error sending code:", err);
      setError("Failed to send verification code. Please try again.");
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
      setIsSending(false);
    }
    // NOTE: No finally block - each path explicitly handles setIsSending(false)
  };

  const handleCodeChange = (index: number, value: string) => {
    // Only allow digits
    const digit = value.replace(/\D/g, "").slice(-1);
    
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);
    setError("");

    // Auto-focus next input
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all digits entered
    if (digit && index === 5 && newCode.every(d => d)) {
      verifyCode(newCode.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    
    if (pastedData.length === 6) {
      const newCode = pastedData.split("");
      setCode(newCode);
      inputRefs.current[5]?.focus();
      verifyCode(pastedData);
    }
  };

  const verifyCode = async (codeString: string) => {
    // Prevent double submissions
    if (isVerifying) return;
    
    setIsVerifying(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("verify-code", {
        body: { email, code: codeString },
      });

      if (fnError) {
        console.error("[EmailVerification] Function invocation error:", fnError);
        setError("Unable to verify code. Please check your connection and try again.");
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }

      if (data?.error) {
        setError(data.error);
        setCode(["", "", "", "", "", ""]);
        inputRefs.current[0]?.focus();
        setIsVerifying(false);
        return;
      }
      
      if (data?.verified) {
        // Set verifying to false BEFORE calling onVerified to prevent state race
        setIsVerifying(false);
        toast({
          title: "Email Verified",
          description: "Your email has been verified successfully!",
        });
        // Use setTimeout to ensure state updates flush before parent navigation
        setTimeout(() => {
          onVerified();
        }, 0);
        return;
      }

      // Fallback: if neither error nor verified, treat as unexpected response
      console.error("[EmailVerification] Unexpected response format:", data);
      setError("Unexpected response. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setIsVerifying(false);
    } catch (err: any) {
      console.error("[EmailVerification] Unexpected error:", err);
      setError("Failed to verify code. Please try again.");
      setCode(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      setIsVerifying(false);
    }
    // NOTE: No finally block - each path explicitly handles setIsVerifying(false)
    // This prevents double state updates and potential unmount issues
  };

  return (
    <div className="space-y-6 animate-fade-in rounded-xl border border-border bg-card p-6 md:p-8 shadow-card">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Verify Your Email</h2>
        <p className="text-sm text-muted-foreground">
          We've sent a 6-digit verification code to
        </p>
        <p className="font-medium text-foreground">{email}</p>
      </div>

      <div className="space-y-4">
        <Label className="text-center block">Enter verification code</Label>
        <div className="flex justify-center gap-2 sm:gap-3">
          {code.map((digit, index) => (
            <Input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleCodeChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              disabled={isVerifying}
              className={cn(
                "h-12 w-10 sm:w-12 text-center text-xl font-bold",
                error && "border-destructive focus-visible:ring-destructive"
              )}
            />
          ))}
        </div>

        {error && (
          <p className="text-center text-sm text-destructive">{error}</p>
        )}

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Verifying...</span>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={sendVerificationCode}
          disabled={isSending || resendCooldown > 0}
        >
          {isSending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : resendCooldown > 0 ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend code in {resendCooldown}s
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Resend verification code
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onBack}
          disabled={isVerifying}
        >
          Back to edit email
        </Button>
      </div>

      <div className="text-center text-xs text-muted-foreground">
        <p>Didn't receive the code? Check your spam folder.</p>
        <p className="mt-1">The code expires in 10 minutes.</p>
      </div>
    </div>
  );
}
