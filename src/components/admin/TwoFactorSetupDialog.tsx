import { useState, useEffect } from "react";
import { Shield, Copy, Check, Loader2, AlertTriangle, Smartphone, QrCode } from "lucide-react";
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

interface TwoFactorSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type SetupStep = "intro" | "qr" | "verify" | "success";

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

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("intro");
      setQrCodeUrl(null);
      setSecret(null);
      setFactorId(null);
      setVerificationCode("");
      setCopied(false);
    }
  }, [open]);

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      // Enroll in TOTP MFA
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
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

      // Update admin_user_profiles to mark MFA as enabled
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("admin_user_profiles")
          .update({ mfa_enabled: true })
          .eq("user_id", user.id);
      }

      setStep("success");
      toast.success("Two-factor authentication enabled successfully!");
      
      // Delay closing to show success state
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
      }, 2000);
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
