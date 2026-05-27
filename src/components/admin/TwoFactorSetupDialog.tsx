import { useState, useEffect } from "react";
import { Shield, Copy, Check, Loader2, Smartphone, QrCode, Download, Key } from "lucide-react";
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
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type SetupStep = "intro" | "qr" | "verify" | "recovery" | "success";

export function TwoFactorSetupDialog({
  open,
  onOpenChange,
  onSuccess,
}: TwoFactorSetupDialogProps) {
  const [step, setStep] = useState<SetupStep>("intro");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("intro");
      setQrCodeUrl(null);
      setSecret(null);
      setFactorId(null);
      setVerificationCode("");
      setCopied(false);
      setRecoveryCodes([]);
      setRecoveryCodesCopied(false);
    }
  }, [open]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      // Enroll in TOTP MFA with custom issuer for proper branding
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "RehabLookup Admin",
        issuer: "rehablookup.com",
      });

      if (error) throw error;

      if (data.type === "totp") {
        setQrCodeUrl(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep("qr");
      }
    } catch (err) {
      console.error("Error enrolling MFA:", err);
      toast.error("Failed to start 2FA setup. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (verificationCode.length !== 6 || !factorId) return;

    setIsVerifying(true);
    try {
      // Create a challenge
      const { data: challengeData, error: challengeError } =
        await supabase.auth.mfa.challenge({ factorId });

      if (challengeError) throw challengeError;

      // Verify the code
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verificationCode,
      });

      if (verifyError) {
        toast.error("Invalid verification code. Please try again.");
        setVerificationCode("");
        return;
      }

      // Generate recovery codes
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("manage-mfa-recovery", {
        body: { action: "generate" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        console.error("Error generating recovery codes:", response.error);
        toast.error("Failed to generate recovery codes. Please try again.");
        // Don't set mfa_enabled or advance to recovery — the user has no codes.
        // They can retry: the TOTP factor is already enrolled so the next
        // "Verify & Enable" click will re-challenge and retry code generation.
        return;
      }

      setRecoveryCodes(response.data.codes || []);

      // Update admin_user_profiles to mark MFA as enabled and log audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("admin_user_profiles")
          .update({ mfa_enabled: true })
          .eq("user_id", user.id);

        await logAdminAction({
          actionType: AdminAuditActions.MFA_ENABLED,
          targetType: "admin_profile",
          targetId: user.id,
          details: { enabledAt: new Date().toISOString() },
        });
      }

      setStep("recovery");
    } catch (err) {
      console.error("Error verifying MFA:", err);
      toast.error("Verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopySecret = () => {
    if (secret) {
      navigator.clipboard.writeText(secret);
      setCopied(true);
      toast.success("Secret copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyRecoveryCodes = () => {
    const codesText = recoveryCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setRecoveryCodesCopied(true);
    toast.success("Recovery codes copied to clipboard");
    setTimeout(() => setRecoveryCodesCopied(false), 2000);
  };

  const handleDownloadRecoveryCodes = () => {
    const codesText = `RehabLookup Admin Recovery Codes\n================================\n\nSave these codes in a secure place. Each code can only be used once.\n\n${recoveryCodes.join("\n")}\n\nGenerated: ${new Date().toISOString()}`;
    const blob = new Blob([codesText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rehablookup-recovery-codes.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Recovery codes downloaded");
  };

  const handleComplete = () => {
    setStep("success");
    toast.success("Two-factor authentication enabled successfully!");
    setTimeout(() => {
      onOpenChange(false);
      onSuccess?.();
    }, 2000);
  };

  const renderStep = () => {
    switch (step) {
      case "intro":
        return (
          <div className="space-y-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Shield className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Secure Your Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Add an extra layer of security with two-factor authentication
                </p>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <div className="flex gap-3">
                <Smartphone className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Authenticator App Required</p>
                  <p className="text-xs text-muted-foreground">
                    You'll need an authenticator app like Google Authenticator, Authy, or 1Password
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <QrCode className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Scan QR Code</p>
                  <p className="text-xs text-muted-foreground">
                    Scan a QR code with your app to link your account
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <Key className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Recovery Codes</p>
                  <p className="text-xs text-muted-foreground">
                    You'll receive backup codes in case you lose your device
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={handleStartSetup}
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Get Started"
              )}
            </Button>
          </div>
        );

      case "qr":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Scan QR Code</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Open your authenticator app and scan this code
              </p>
            </div>

            {qrCodeUrl && (
              <div className="flex justify-center">
                <div className="bg-white p-4 rounded-lg">
                  <img
                    src={qrCodeUrl}
                    alt="QR Code for 2FA setup"
                    className="w-48 h-48"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Or enter this code manually:
              </Label>
              <div className="flex gap-2">
                <Input
                  value={secret || ""}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopySecret}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Button onClick={() => setStep("verify")} className="w-full">
              Continue
            </Button>
          </div>
        );

      case "verify":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Enter Verification Code</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verificationCode}
                onChange={(value) => setVerificationCode(value)}
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

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep("qr")}
                className="flex-1"
                disabled={isVerifying}
              >
                Back
              </Button>
              <Button
                onClick={handleVerifyCode}
                className="flex-1"
                disabled={verificationCode.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  "Verify & Enable"
                )}
              </Button>
            </div>
          </div>
        );

      case "recovery":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold">Save Your Recovery Codes</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Store these codes securely. Each can only be used once.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} className="bg-background px-2 py-1 rounded text-center">
                    {code}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCopyRecoveryCodes}
                className="flex-1"
              >
                {recoveryCodesCopied ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-green-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Copy
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleDownloadRecoveryCodes}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> If you lose access to your authenticator app and don't have these codes, you won't be able to access your account.
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              I've Saved My Codes
            </Button>
          </div>
        );

      case "success":
        return (
          <div className="space-y-6 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-600">
                  2FA Enabled Successfully!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your account is now protected with two-factor authentication
                </p>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            Protect your admin account with 2FA
          </DialogDescription>
        </DialogHeader>
        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
