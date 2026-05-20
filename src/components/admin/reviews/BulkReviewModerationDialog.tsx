import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2, XCircle, EyeOff, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type BulkReviewAction = "approve" | "reject" | "hide" | "delete";

interface BulkReviewModerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkReviewAction;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const ACTION_CONFIG: Record<BulkReviewAction, {
  title: string;
  verb: string;
  icon: React.ElementType;
  danger?: boolean;
  needsNotes?: boolean;
  notesLabel?: string;
  notesRequired?: boolean;
  description: string;
}> = {
  approve: {
    title: "Approve reviews",
    verb: "Approve",
    icon: CheckCircle2,
    needsNotes: true,
    notesLabel: "Admin notes",
    notesRequired: false,
    description: "Approves every selected review. Each seeker receives an email notification (review_approved). Already-approved reviews are skipped.",
  },
  reject: {
    title: "Reject reviews",
    verb: "Reject",
    icon: XCircle,
    danger: true,
    needsNotes: true,
    notesLabel: "Rejection reason (required)",
    notesRequired: true,
    description: "Rejects every selected review with the same reason. Each seeker receives an email with the rejection reason. Already-rejected reviews are skipped.",
  },
  hide: {
    title: "Hide reviews",
    verb: "Hide",
    icon: EyeOff,
    danger: true,
    needsNotes: true,
    notesLabel: "Admin notes",
    notesRequired: false,
    description: "Hides every selected review from public view and clears the disputed flag. Typically used during dispute resolution.",
  },
  delete: {
    title: "Delete reviews",
    verb: "Delete",
    icon: Trash2,
    danger: true,
    description: "Permanently deletes the selected reviews and any related dispute rows. Cannot be undone.",
  },
};

/**
 * Wraps admin-bulk-moderate-reviews (deployed v1). Admin-gated to
 * super_admin + manager, partial-success summary, per-row audit.
 */
export function BulkReviewModerationDialog({
  open, onOpenChange, action, selectedIds, onSuccess,
}: BulkReviewModerationDialogProps) {
  const [adminNotes, setAdminNotes] = useState("");
  const [reason, setReason] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const mutation = useMutation({
    mutationFn: async () => {
      if (config.notesRequired && !adminNotes.trim()) {
        throw new Error(`${config.notesLabel} is required`);
      }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("admin-bulk-moderate-reviews", {
        body: {
          reviewIds: Array.from(selectedIds),
          action,
          adminNotes: config.needsNotes ? adminNotes.trim() : undefined,
          reason: reason.trim() || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "review" : "reviews";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${config.verb}d ${res.succeeded} ${noun}`);
      } else {
        toast.success(`${config.verb}d ${res.succeeded} · ${res.skipped} skipped · ${res.errored} errored`);
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk moderation failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setAdminNotes("");
      setReason("");
    }
    onOpenChange(next);
  };

  const canSubmit = !mutation.isPending &&
    (!config.notesRequired || adminNotes.trim().length > 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size} {selectedIds.size === 1 ? "review" : "reviews"}
          </DialogTitle>
          <DialogDescription className={config.danger ? "text-destructive" : undefined}>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {config.needsNotes && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-review-notes" className="text-sm">
                {config.notesLabel}
                {!config.notesRequired && (
                  <span className="text-muted-foreground font-normal"> (optional)</span>
                )}
              </Label>
              <Textarea
                id="bulk-review-notes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value.slice(0, 2000))}
                placeholder={
                  action === "reject"
                    ? "e.g. Contains profanity / off-topic / promotional content"
                    : "Internal notes shown alongside the moderation decision"
                }
                rows={3}
                disabled={mutation.isPending}
                className="resize-none"
              />
              <p className="text-[11px] text-muted-foreground tabular-nums">{adminNotes.length}/2000</p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bulk-review-reason" className="text-sm">
              Audit reason <span className="text-muted-foreground font-normal">(optional, not shown to seeker)</span>
            </Label>
            <Textarea
              id="bulk-review-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Bulk action — spam cleanup"
              rows={2}
              disabled={mutation.isPending}
              className="resize-none"
            />
            <p className="text-[11px] text-muted-foreground tabular-nums">{reason.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!canSubmit}
            variant={config.danger ? "destructive" : "default"}
            className="gap-2"
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Icon className="h-4 w-4" />}
            {config.verb} {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
