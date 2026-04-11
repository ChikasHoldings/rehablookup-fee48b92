import { useState } from "react";
import { Shield, Loader2, Key, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

interface TwoFactorVerifyDialogProps {
  open: boolean;
  onSuccess: (trustDevice: boolean) => void;
  onCancel: () => void;
  /** Optional risk-based message explaining why 2FA was triggered */
  riskMessage?: string | null;
  /** Whether to show the "Trust this device" checkbox */
  showTrustDevice?: boolean;
}

type VerifyMode = "totp" | "recovery";

export function TwoFactorVerifyDialog({
  open,
  onSuccess,
  onCancel,
  riskMessage,
  showTrustDevice = false,
}: TwoFactorVerifyDialogProps) {
  const [mode, setMode] = useState<VerifyMode>("totp");
  const [verificationCode, setVerificationCode] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trustDevice, setTrustDevice] = useState(true);

  const handleVerifyTotp = async () => {
    if (verificationCode.length !== 6) return;

    setIsVerifying(true);
    setError(null);

    try {
      const { data: factorsData, error: factorsError } =
        await supabase.auth.mfa.listFactors();

      if (factorsError) throw factorsError;

      const totpFactor = factorsData.totp.find(
        (factor) => factor.status === "verified"
      );

      if (!totpFactor) {
        throw new Error("No verified TOTP factor found");
      }

      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError) throw challengeError;

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

      onSuccess(showTrustDevice ? trustDevice : false);
    } catch (err) {
      console.error("Error verifying MFA:", err);
      setError("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleVerifyRecovery = async () => {
    if (!recoveryCode.trim()) return;

    setIsVerifying(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("manage-mfa-recovery", {
        body: { action: "verify", code: recoveryCode.trim() },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        throw response.error;
      }

      if (!response.data.valid) {
        setError("Invalid or already used recovery code.");
        setRecoveryCode("");
        return;
      }

      toast.success("Recovery code accepted");
      onSuccess(showTrustDevice ? trustDevice : false);
    } catch (err) {
      console.error("Error verifying recovery code:", err);
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
            {mode === "totp"
              ? "Enter the 6-digit code from your authenticator app"
              : "Enter one of your recovery codes"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Risk-based context message */}
          {riskMessage && (
            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 flex gap-2.5">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-warning">{riskMessage}</p>
            </div>
          )}

          {mode === "totp" ? (
            <>
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

              {/* Trust device checkbox */}
              {showTrustDevice && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="trust-device"
                    checked={trustDevice}
                    onCheckedChange={(checked) => setTrustDevice(checked === true)}
                  />
                  <label
                    htmlFor="trust-device"
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    Trust this device for 30 days
                  </label>
                </div>
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
                  onClick={handleVerifyTotp}
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("recovery");
                    setError(null);
                    setVerificationCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  <Key className="h-3 w-3 inline mr-1" />
                  Use a recovery code instead
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="recovery-code">Recovery Code</Label>
                <Input
                  id="recovery-code"
                  value={recoveryCode}
                  onChange={(e) => {
                    setRecoveryCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  placeholder="XXXXX-XXXXX"
                  className="font-mono text-center"
                />
              </div>

              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}

              {/* Trust device checkbox */}
              {showTrustDevice && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="trust-device-recovery"
                    checked={trustDevice}
                    onCheckedChange={(checked) => setTrustDevice(checked === true)}
                  />
                  <label
                    htmlFor="trust-device-recovery"
                    className="text-sm text-muted-foreground cursor-pointer select-none"
                  >
                    Trust this device for 30 days
                  </label>
                </div>
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
                  onClick={handleVerifyRecovery}
                  className="flex-1"
                  disabled={!recoveryCode.trim() || isVerifying}
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode("totp");
                    setError(null);
                    setRecoveryCode("");
                  }}
                  className="text-sm text-muted-foreground hover:text-primary underline"
                >
                  Use authenticator app instead
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
