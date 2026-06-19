import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Ban, CheckCircle, KeyRound, Send } from "lucide-react";
import { toast } from "sonner";

export type BulkAdminStaffAction =
  | "suspend"
  | "unsuspend"
  | "reset_password"
  | "resend_invitation";

interface BulkAdminStaffActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkAdminStaffAction;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const ACTION_CONFIG: Record<BulkAdminStaffAction, {
  title: string;
  verb: string;
  icon: React.ElementType;
  danger?: boolean;
  description: string;
}> = {
  suspend: {
    title: "Suspend staff members",
    verb: "Suspend",
    icon: Ban,
    danger: true,
    description: "Bans the selected staff in auth and sets status=suspended. Already-suspended staff are skipped. Super-admin targets and your own account are always skipped.",
  },
  unsuspend: {
    title: "Reactivate staff members",
    verb: "Reactivate",
    icon: CheckCircle,
    description: "Removes the auth ban and sets status=active. Already-active staff are skipped. Super-admin targets and your own account are always skipped.",
  },
  reset_password: {
    title: "Reset passwords",
    verb: "Reset",
    icon: KeyRound,
    description: "Generates a new 72-hour temporary password for each selected staff member and emails it. Super-admin targets and your own account are always skipped.",
  },
  resend_invitation: {
    title: "Resend invitations",
    verb: "Resend",
    icon: Send,
    description: "Rotates the temporary password and resends the invitation email — only for staff currently in 'pending setup'. Anyone already active is skipped.",
  },
};

/**
 * Wraps admin-bulk-update-admin-users (deployed v1). Super-admin only;
 * self-targets and super-admin targets are skipped server-side. Partial-
 * success summary, per-row audit.
 */
export function BulkAdminStaffActionDialog({
  open, onOpenChange, action, selectedIds, onSuccess,
}: BulkAdminStaffActionDialogProps) {
  const [reason, setReason] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {
        userIds: Array.from(selectedIds),
        action,
        reason: reason.trim() || undefined,
      };

      const { data, error } = await supabase.functions.invoke(
        "admin-bulk-update-admin-users",
        {
          body,
          headers: { Authorization: `Bearer ${session.access_token}` },
        },
      );
      if (error) throw error;
      if (
        data &&
        typeof data === "object" &&
        "error" in data &&
        (data as { error: unknown }).error
      ) {
        throw new Error(String((data as { error: unknown }).error));
      }
      return data as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "staff member" : "staff members";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${config.verb}ed ${res.succeeded} ${noun}`);
      } else {
        const summary = `${config.verb}ed ${res.succeeded} · ${res.skipped} skipped · ${res.errored} errored`;
        if (res.errored > 0) {
          (res.succeeded > 0 ? toast.warning : toast.error)(summary);
        } else {
          toast.success(summary);
        }
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Bulk action failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) setReason("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size}{" "}
            {selectedIds.size === 1 ? "staff member" : "staff members"}
          </DialogTitle>
          <DialogDescription className={config.danger ? "text-destructive" : undefined}>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-staff-reason" className="text-sm">
              Audit reason{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bulk-staff-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={
                action === "suspend"
                  ? "e.g. Departure offboarding cohort"
                  : action === "reset_password"
                    ? "e.g. Quarterly security rotation"
                    : "Optional context for the audit log"
              }
              rows={2}
              disabled={mutation.isPending}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">
              {reason.length}/500
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            variant={config.danger ? "destructive" : "default"}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Icon className="h-4 w-4" />
            )}
            {config.verb} {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
