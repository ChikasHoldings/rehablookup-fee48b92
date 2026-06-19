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
import { Loader2, RefreshCw, ArrowRightLeft, Flag, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type BulkSupportAction = "update_status" | "update_priority" | "assign" | "delete";

interface AdminStaffOption {
  user_id: string;
  display_name: string | null;
}

interface BulkSupportTicketActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkSupportAction;
  selectedIds: Set<string>;
  adminStaff: AdminStaffOption[];
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const ACTION_LABELS: Record<BulkSupportAction, { title: string; verb: string; icon: React.ElementType; danger?: boolean }> = {
  update_status: { title: "Change status", verb: "Update", icon: RefreshCw },
  update_priority: { title: "Change priority", verb: "Update", icon: Flag },
  assign: { title: "Reassign", verb: "Reassign", icon: ArrowRightLeft },
  delete: { title: "Delete tickets", verb: "Delete", icon: Trash2, danger: true },
};

/**
 * Single dialog for all 4 bulk operations on support tickets. Wraps
 * `admin-bulk-update-support-tickets` (deployed v1) — admin-gated,
 * partial-success summary, per-row audit-log entries.
 */
export function BulkSupportTicketActionDialog({
  open, onOpenChange, action, selectedIds, adminStaff, onSuccess,
}: BulkSupportTicketActionDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const config = ACTION_LABELS[action];
  const Icon = config.icon;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {
        ticketIds: Array.from(selectedIds),
        action,
        reason: reason.trim() || undefined,
      };
      if (action === "update_status") {
        if (!newStatus) throw new Error("Pick a target status");
        body.newStatus = newStatus;
      }
      if (action === "update_priority") {
        if (!newPriority) throw new Error("Pick a priority");
        body.newPriority = newPriority;
      }
      if (action === "assign") {
        body.assigneeId = assigneeId === "unassigned" || !assigneeId ? null : assigneeId;
      }

      const { data, error } = await supabase.functions.invoke("admin-bulk-update-support-tickets", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "ticket" : "tickets";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${config.verb}d ${res.succeeded} ${noun}`);
      } else {
        const summary = `${config.verb}d ${res.succeeded} · ${res.skipped} skipped · ${res.errored} errored`;
        if (res.errored > 0) {
          (res.succeeded > 0 ? toast.warning : toast.error)(summary);
        } else {
          toast.success(summary);
        }
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk action failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setNewStatus("");
      setNewPriority("");
      setAssigneeId("");
      setReason("");
    }
    onOpenChange(next);
  };

  const canSubmit = (() => {
    if (mutation.isPending) return false;
    if (action === "update_status") return !!newStatus;
    if (action === "update_priority") return !!newPriority;
    if (action === "assign") return assigneeId !== "";
    return true; // delete: always submittable once confirmed
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size} {selectedIds.size === 1 ? "ticket" : "tickets"}
          </DialogTitle>
          <DialogDescription>
            {action === "delete" ? (
              <span className="text-destructive">
                Permanently deletes the selected tickets and their internal notes. This cannot be undone.
              </span>
            ) : action === "assign" ? (
              "Reassigns selected tickets to a single staff member. Tickets in 'new' status will auto-advance to 'open' on assignment."
            ) : action === "update_status" ? (
              "Updates the status on every selected ticket. Already-in-target tickets are skipped. Resolving stamps resolved_at + resolved_by."
            ) : (
              "Updates the priority on every selected ticket. Already-in-target tickets are skipped."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {action === "update_status" && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-support-status" className="text-sm">New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-support-status">
                  <SelectValue placeholder="Pick a target status…" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "update_priority" && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-support-priority" className="text-sm">New priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-support-priority">
                  <SelectValue placeholder="Pick a priority…" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "assign" && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-support-assignee" className="text-sm">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-support-assignee">
                  <SelectValue placeholder="Pick a staff member…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">— Unassign —</SelectItem>
                  {adminStaff.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.display_name || a.user_id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bulk-support-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-support-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={action === "delete" ? "e.g. Spam cleanup" : "e.g. Rebalancing assignments"}
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
