import { useState, forwardRef } from "react";
import { Key, Copy, Check, Download, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
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
import { logAdminAction, AdminAuditActions } from "@/hooks/useAdminAuditLog";

interface RegenerateRecoveryCodesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type DialogStep = "confirm" | "codes";

export const RegenerateRecoveryCodesDialog = forwardRef<
  HTMLDivElement,
  RegenerateRecoveryCodesDialogProps
>(function RegenerateRecoveryCodesDialog({ open, onOpenChange, onSuccess }, _ref) {
  const [step, setStep] = useState<DialogStep>("confirm");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = async () => {
    setIsGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke("manage-mfa-recovery", {
        body: { action: "generate" },
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (response.error) {
        throw response.error;
      }

      setRecoveryCodes(response.data.codes || []);
      setStep("codes");
      toast.success("New recovery codes generated");
      
      // Log audit action
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await logAdminAction({
          actionType: AdminAuditActions.MFA_RECOVERY_CODES_REGENERATED,
          targetType: "admin_profile",
          targetId: user.id,
          details: { regeneratedAt: new Date().toISOString() },
        });
      }
      
      onSuccess?.();
    } catch (err) {
      console.error("Error regenerating recovery codes:", err);
      toast.error("Failed to generate recovery codes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const codesText = recoveryCodes.join("\n");
    navigator.clipboard.writeText(codesText);
    setCopied(true);
    toast.success("Recovery codes copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
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

  const handleClose = () => {
    setStep("confirm");
    setRecoveryCodes([]);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Recovery Codes
          </DialogTitle>
          <DialogDescription>
            {step === "confirm"
              ? "Generate new recovery codes for your account"
              : "Save these codes in a secure place"
            }
          </DialogDescription>
        </DialogHeader>

        {step === "confirm" ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-medium text-amber-800">This will invalidate old codes</p>
                  <p className="text-sm text-amber-700">
                    Generating new recovery codes will make all your previous codes unusable. Make sure to save the new codes.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
                disabled={isGenerating}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRegenerate}
                className="flex-1"
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Generate New Codes
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
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
                onClick={handleCopy}
                className="flex-1"
              >
                {copied ? (
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
                onClick={handleDownload}
                className="flex-1"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs text-amber-800">
                <strong>Important:</strong> These codes will only be shown once. Store them securely before closing this dialog.
              </p>
            </div>

            <Button onClick={handleClose} className="w-full">
              I've Saved My Codes
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
});

RegenerateRecoveryCodesDialog.displayName = "RegenerateRecoveryCodesDialog";
