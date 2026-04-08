import { useState } from "react";
import { Shield, Loader2, ShieldCheck, Copy, Check, Download, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";

interface TwoFactorEnforcementDialogProps {
  open: boolean;
  onSuccess: () => void;
  onSkip?: () => void;
}

type SetupStep = "intro" | "qr" | "verify" | "recovery";

export function TwoFactorEnforcementDialog({
  open,
  onSuccess,
  onSkip,
}: TwoFactorEnforcementDialogProps) {
  const [step, setStep] = useState<SetupStep>("intro");
  const [isLoading, setIsLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleStartSetup = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "RehabLookup Admin",
        issuer: "rehablookup.com",
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("qr");
    } catch (err) {
      console.error("Error enrolling MFA:", err);
      toast.error("Failed to set up 2FA. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!factorId || verifyCode.length !== 6) return;

    setIsVerifying(true);
    try {
      const challengeResponse = await supabase.auth.mfa.challenge({ factorId });
      if (challengeResponse.error) throw challengeResponse.error;

      const verifyResponse = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeResponse.data.id,
        code: verifyCode,
      });

      if (verifyResponse.error) throw verifyResponse.error;

      // Generate recovery codes
      const { data: { session } } = await supabase.auth.getSession();
      const recoveryResponse = await supabase.functions.invoke("manage-mfa-recovery", {
        body: { action: "generate" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (recoveryResponse.error) {
        console.error("Error generating recovery codes:", recoveryResponse.error);
      } else {
        setRecoveryCodes(recoveryResponse.data.codes || []);
      }

      setStep("recovery");
      toast.success("2FA verified successfully!");
    } catch (err: any) {
      console.error("Error verifying MFA:", err);
      toast.error(err?.message || "Invalid verification code. Please try again.");
      setVerifyCode("");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCopyRecoveryCodes = () => {
    const codesText = recoveryCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    toast.success("Recovery codes copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
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
    onSuccess();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && step === "intro" && onSkip) onSkip(); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (step !== "intro") e.preventDefault(); }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {step === "intro" && "Two-Factor Authentication Required"}
            {step === "qr" && "Scan QR Code"}
            {step === "verify" && "Enter Verification Code"}
            {step === "recovery" && "Save Recovery Codes"}
          </DialogTitle>
          <DialogDescription>
            {step === "intro" && "For security, all admin accounts must have 2FA enabled."}
            {step === "qr" && "Scan this QR code with your authenticator app"}
            {step === "verify" && "Enter the 6-digit code from your authenticator app"}
            {step === "recovery" && "Save these codes in a secure place"}
          </DialogDescription>
        </DialogHeader>

        {step === "intro" && (
          <div className="space-y-6">
            <div className="bg-warning/5 border border-warning/20 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Security Requirement</p>
                  <p className="text-sm text-muted-foreground">
                    Two-factor authentication protects your admin account from unauthorized access. 
                    You'll need an authenticator app like Google Authenticator or Authy.
                  </p>
                </div>
              </div>
            </div>

            <Button
              className="w-full"
              onClick={handleStartSetup}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Set Up 2FA Now
                </>
              )}
            </Button>

            {onSkip && (
              <Button
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={onSkip}
              >
                Remind me later
              </Button>
            )}
          </div>
        )}

        {step === "qr" && qrCode && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
            </div>

            {secret && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground text-center">
                  Can't scan? Enter this code manually:
                </p>
                <code className="block text-center text-sm bg-muted p-2 rounded font-mono break-all">
                  {secret}
                </code>
              </div>
            )}

            <Button className="w-full" onClick={() => setStep("verify")}>
              I've Scanned the Code
            </Button>
          </div>
        )}

        {step === "verify" && (
          <div className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={verifyCode}
                onChange={(value) => setVerifyCode(value)}
              >
                <InputOTPGroup>
                  {[0, 1, 2, 3, 4, 5].map((index) => (
                    <InputOTPSlot key={index} index={index} />
                  ))}
                </InputOTPGroup>
              </InputOTP>
            </div>

            <Button
              className="w-full"
              onClick={handleVerify}
              disabled={verifyCode.length !== 6 || isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                "Verify & Enable 2FA"
              )}
            </Button>
          </div>
        )}

        {step === "recovery" && (
          <div className="space-y-6">
            <div className="bg-success/5 border border-success/20 rounded-lg p-4">
              <div className="flex gap-3">
                <ShieldCheck className="h-5 w-5 text-success shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-foreground">2FA Enabled Successfully!</p>
                  <p className="text-sm text-muted-foreground">
                    Save these recovery codes. They can be used to access your account if you lose your authenticator.
                  </p>
                </div>
              </div>
            </div>

            {recoveryCodes.length > 0 && (
              <>
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
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4 text-success" />
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
              </>
            )}

            <div className="bg-warning/5 border border-warning/20 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">
                <strong>Important:</strong> These codes will only be shown once. Store them securely before continuing.
              </p>
            </div>

            <Button onClick={handleComplete} className="w-full">
              I've Saved My Codes - Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
