import { useState } from "react";
import { ShieldOff, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface DisableTwoFactorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function DisableTwoFactorDialog({
  open,
  onOpenChange,
  onSuccess,
}: DisableTwoFactorDialogProps) {
  const [verificationCode, setVerificationCode] = useState("");
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDisable = async () => {
    if (verificationCode.length !== 6) return;

    setIsDisabling(true);
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

      // Create a challenge to verify before disabling
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId: totpFactor.id });

      if (challengeError) throw challengeError;

      // Verify the code first
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

      // Unenroll the factor
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({
        factorId: totpFactor.id,
      });

      if (unenrollError) throw unenrollError;

      // Update admin_user_profiles to mark MFA as disabled and log audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: mfaFlagErr } = await supabase
          .from("admin_user_profiles")
          .update({ mfa_enabled: false })
          .eq("user_id", user.id);
        if (mfaFlagErr) console.warn("[DisableTwoFactor] mfa_enabled flag write failed (factor already unenrolled)", mfaFlagErr);
        
        await logAdminAction({
          actionType: AdminAuditActions.MFA_DISABLED,
          targetType: "admin_profile",
          targetId: user.id,
          details: { disabledAt: new Date().toISOString() },
        });
      }

      toast.success("Two-factor authentication has been disabled");
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error("Error disabling MFA:", err);
      setError("Failed to disable 2FA. Please try again.");
    } finally {
      setIsDisabling(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <ShieldOff className="h-5 w-5" />
            Disable Two-Factor Authentication
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will make your account less secure. Enter your verification code to confirm.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Warning</p>
              <p className="text-muted-foreground">
                Disabling 2FA will remove an important layer of security from your admin account.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground text-center">
              Enter your 6-digit authenticator code to disable 2FA
            </p>
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
          </div>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isDisabling}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisable}
              className="flex-1"
              disabled={verificationCode.length !== 6 || isDisabling}
            >
              {isDisabling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Disabling...
                </>
              ) : (
                "Disable 2FA"
              )}
            </Button>
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
