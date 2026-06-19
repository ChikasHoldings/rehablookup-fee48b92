import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface BulkProviderStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const STATUS_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "approved", label: "Approved", description: "Publishes the facility on the public directory. Stamps claimed_at if owner exists." },
  { value: "pending_review", label: "Pending review", description: "Resends to the moderation queue (e.g. for re-review after a fix)." },
  { value: "rejected", label: "Rejected", description: "Hides from directory; provider can resubmit after corrections." },
  { value: "draft", label: "Draft", description: "Owner can still edit; not yet submitted." },
];

/**
 * Bulk-update the `status` column on multiple facilities in one
 * operation. Calls `admin-bulk-update-provider-status` which
 * verifies moderator role, validates the target status, stamps
 * claimed_at when first approving a claimed facility, and writes
 * per-facility audit log rows.
 *
 * Use case: clear out a batch of pending facilities after a vendor
 * data-load, or batch-reject a SAMHSA import that turned out to be
 * stale.
 */
export function BulkProviderStatusDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkProviderStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!newStatus) throw new Error("Pick a target status");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-update-provider-status", {
        body: {
          facilityIds: Array.from(selectedIds),
          newStatus,
          reason: reason.trim() || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { updated: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`Updated ${res.updated} ${res.updated === 1 ? "provider" : "providers"}`);
      } else {
        const summary = `Updated ${res.updated} · ${res.skipped} skipped · ${res.errored} errored`;
        if (res.errored > 0) {
          (res.updated > 0 ? toast.warning : toast.error)(summary);
        } else {
          toast.success(summary);
        }
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Bulk update failed");
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setNewStatus("");
      setReason("");
    }
    onOpenChange(next);
  };

  const selectedOption = STATUS_OPTIONS.find((s) => s.value === newStatus);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Change status — {selectedIds.size} {selectedIds.size === 1 ? "provider" : "providers"}
          </DialogTitle>
          <DialogDescription>
            Sets <code className="text-[11px]">facilities.status</code> for every selected row.
            Already-in-target rows are skipped. When marking <code className="text-[11px]">approved</code>,
            <code className="text-[11px]"> claimed_at</code> is stamped automatically if the facility has
            an owner. One <code className="text-[11px]">admin_audit_log</code> row per updated provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-provider-status-select" className="text-sm">
              New status
            </Label>
            <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
              <SelectTrigger id="bulk-provider-status-select">
                <SelectValue placeholder="Pick a target status…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-provider-status-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-provider-status-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Vendor data refresh — approving Q2 batch"
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
          <Button onClick={() => mutation.mutate()} disabled={!newStatus || mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Update {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
