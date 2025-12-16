import { useState } from "react";
import { Shield, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface TwoFactorVerifyDialogProps {
  open: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TwoFactorVerifyDialog({
  open,
  onSuccess,
  onCancel,
}: TwoFactorVerifyDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerify = async () => {
    if (verificationCode.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      // Get the user's enrolled TOTP factors
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const totpFactor = factorsData.totp.find(
        (factor) => factor.status === "verified"
      );

      if (!totpFactor) {
        throw new Error("No verified TOTP factor found");
      }

      // Create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: totpFactor.id,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) {
        setError("Invalid verification code. Please try again.");
        setVerificationCode("");
        return;
      }

      onSuccess();
    } catch (err) {
      console.error("Error verifying MFA:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Enter the 6-digit code from your authenticator app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="flex justify-center">
            <InputOTP
              maxLength={6}
              value={verificationCode}
              onChange={(value) => {
                setVerificationCode(value);
                setError(null);
              }}
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
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex-1"
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerify}
              className="flex-1"
              disabled={verificationCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
