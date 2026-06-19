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

interface BulkStatusUpdateIvrDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const STATUS_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "new", label: "New", description: "Reopen — clears assignment + verification timestamps" },
  { value: "in_progress", label: "In progress", description: "Claims ownership; stamps assigned_admin_id" },
  { value: "verified", label: "Verified", description: "Stamps verified_at + verified_by; surfaces in seeker dashboard" },
  { value: "no_coverage", label: "No coverage", description: "Carrier rejected; admin-notes recommended" },
  { value: "unable_to_verify", label: "Unable to verify", description: "Lookup failed — wrong carrier or invalid ID" },
  { value: "closed", label: "Closed", description: "No further action — removes from active queue" },
];

/**
 * Bulk-update the `status` column on multiple insurance verification
 * requests in one operation. Calls the
 * `admin-bulk-update-ivr-status` edge function which (a) verifies
 * admin role, (b) validates target status against allowed enum,
 * (c) skips no-ops as skipped, (d) writes per-request audit log row
 * with before/after status + optional reason.
 */
export function BulkStatusUpdateIvrDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkStatusUpdateIvrDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!newStatus) throw new Error("Pick a target status");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-update-ivr-status", {
        body: {
          requestIds: Array.from(selectedIds),
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
        toast.success(`Updated ${res.updated} ${res.updated === 1 ? "request" : "requests"}`);
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
            Update status — {selectedIds.size} {selectedIds.size === 1 ? "request" : "requests"}
          </DialogTitle>
          <DialogDescription>
            Sets <code className="text-[11px]">insurance_verification_requests.status</code> to the picked value for every
            selected row. Requests already in the target status are skipped (not errored).
            When marking <code className="text-[11px]">verified</code> the
            <code className="text-[11px]">verified_at</code> + <code className="text-[11px]">verified_by</code> columns are stamped automatically.
            One <code className="text-[11px]">admin_audit_log</code> row is written per updated request.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-ivr-status-select" className="text-sm">
              New status
            </Label>
            <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
              <SelectTrigger id="bulk-ivr-status-select">
                <SelectValue placeholder="Pick a target status…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedOption && (
              <p className="text-xs text-muted-foreground">{selectedOption.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-ivr-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-ivr-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Carrier confirmed coverage for this batch"
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
            disabled={!newStatus || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Update {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
