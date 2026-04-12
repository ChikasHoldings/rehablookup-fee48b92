/**
 * Reusable confirmation dialog for destructive admin actions.
 * Replaces window.confirm with a proper AlertDialog for better UX and security.
 */
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConfirmActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "destructive" | "warning" | "default";
  requireConfirmText?: string; // If set, user must type this to confirm
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "default",
  requireConfirmText,
  isLoading = false,
  onConfirm,
}: ConfirmActionDialogProps) {
  const [confirmInput, setConfirmInput] = useState("");

  const canConfirm = !requireConfirmText || confirmInput === requireConfirmText;

  const handleConfirm = async () => {
    if (!canConfirm) return;
    await onConfirm();
    setConfirmInput("");
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) setConfirmInput("");
    onOpenChange(newOpen);
  };

  const variantStyles = {
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
    warning: "bg-amber-600 text-white hover:bg-amber-700",
    default: "",
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <span>{description}</span>
            {requireConfirmText && (
              <div className="pt-2">
                <p className="text-sm font-medium text-foreground mb-2">
                  Type <span className="font-mono font-bold text-destructive">{requireConfirmText}</span> to confirm:
                </p>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder={requireConfirmText}
                  className="font-mono"
                  autoFocus
                />
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={!canConfirm || isLoading}
            className={cn(variantStyles[variant])}
          >
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
