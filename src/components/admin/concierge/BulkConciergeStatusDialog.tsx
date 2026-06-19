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

interface BulkConciergeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

// Real DB enum values from validate_concierge_status_transition. The
// dialog only exposes the active workflow targets — legacy
// admission_in_progress / admitted / billed states from the retired
// paid-placement product aren't offered (the trigger still validates
// them for backward-compat, but no new case should land there).
const STATUS_OPTIONS: Array<{ value: string; label: string; description: string }> = [
  { value: "intake_submitted", label: "Intake submitted", description: "Reopen — back to the unassigned pool" },
  { value: "intake_reviewed", label: "Intake reviewed", description: "Reviewed — ready for advisor assignment" },
  { value: "advisor_assigned", label: "Advisor assigned", description: "Advisor on case — ready to start matching" },
  { value: "matching_providers", label: "Matching providers", description: "Match search in progress" },
  { value: "matched", label: "Matched", description: "Stamps matched_at; ready for prequalification" },
  { value: "provider_prequalification", label: "Provider prequal", description: "Verifying facility fit before intro" },
  { value: "providers_accepted", label: "Providers accepted", description: "Facilities confirmed — ready to present to client" },
  { value: "presented_to_seeker", label: "Presented to client", description: "Options sent — awaiting client decision" },
  { value: "seeker_selected", label: "Placed (seeker selected)", description: "Client chose a facility — placement complete" },
  { value: "completed", label: "Completed", description: "Workflow finalized" },
  { value: "closed", label: "Closed", description: "Stamps closed_at; case archived" },
];

/**
 * Bulk-update the `status` column on multiple concierge placement
 * cases. Calls `admin-bulk-update-concierge-status` which verifies
 * admin role, validates target status against the canonical state
 * machine, skips no-ops, stamps the right milestone timestamps
 * (matched_at / placement_confirmed_at / closed_at), and writes
 * per-row admin_audit_log + concierge_case_events rows.
 */
export function BulkConciergeStatusDialog({
  open, onOpenChange, selectedIds, onSuccess,
}: BulkConciergeStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!newStatus) throw new Error("Pick a target status");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-update-concierge-status", {
        body: { inquiryIds: Array.from(selectedIds), newStatus, reason: reason.trim() || undefined },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { updated: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`Updated ${res.updated} ${res.updated === 1 ? "case" : "cases"}`);
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
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk update failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) { setNewStatus(""); setReason(""); }
    onOpenChange(next);
  };

  const selectedOption = STATUS_OPTIONS.find((s) => s.value === newStatus);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Change status — {selectedIds.size} {selectedIds.size === 1 ? "case" : "cases"}
          </DialogTitle>
          <DialogDescription>
            Sets <code className="text-[11px]">concierge_inquiries.status</code> for every selected row.
            Already-in-target rows are skipped. Stamps the matching
            milestone timestamp (matched_at / placement_confirmed_at /
            closed_at) automatically. One <code className="text-[11px]">admin_audit_log</code> row
            and one <code className="text-[11px]">concierge_case_events</code> row per updated case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-concierge-status" className="text-sm">New status</Label>
            <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
              <SelectTrigger id="bulk-concierge-status">
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
            <Label htmlFor="bulk-concierge-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-concierge-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Closing pre-launch test cases — clearing the queue"
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
