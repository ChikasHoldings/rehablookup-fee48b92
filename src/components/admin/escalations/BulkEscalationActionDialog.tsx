import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fetchAdminDirectory } from "@/lib/adminDirectory";
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

export type BulkEscalationAction = "update_status" | "update_priority" | "assign" | "delete";

interface BulkEscalationActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkEscalationAction;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

const ACTION_CONFIG: Record<BulkEscalationAction, { title: string; verb: string; icon: React.ElementType; danger?: boolean }> = {
  update_status: { title: "Change status", verb: "Update", icon: RefreshCw },
  update_priority: { title: "Change priority", verb: "Update", icon: Flag },
  assign: { title: "Reassign", verb: "Reassign", icon: ArrowRightLeft },
  delete: { title: "Delete escalations", verb: "Delete", icon: Trash2, danger: true },
};

/**
 * Wraps admin-bulk-update-escalations (deployed v1). Defense-in-depth
 * admin-tier gate (super_admin + manager); delete is super_admin only.
 * Server-side validates the same ALLOWED_TRANSITIONS map as the
 * single-row useEscalationTransition hook so behavior stays consistent.
 */
export function BulkEscalationActionDialog({
  open, onOpenChange, action, selectedIds, onSuccess,
}: BulkEscalationActionDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [newPriority, setNewPriority] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [reason, setReason] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  // Eligible assignees (manager + super_admin) — same gate the edge
  // function enforces server-side. Fetched only when the dialog opens
  // and only for the assign action.
  const { data: assignableAdmins = [] } = useQuery({
    queryKey: ["escalation-bulk-assignable-admins"],
    queryFn: async () => {
      // admin_user_profiles SELECT is tier-restricted; resolve eligible
      // assignees through the directory RPC instead.
      const directory = await fetchAdminDirectory();
      return directory
        .filter((a) => (a.admin_role === "super_admin" || a.admin_role === "manager") && a.status === "active")
        .sort((x, y) => (x.display_name || "").localeCompare(y.display_name || ""));
    },
    enabled: open && action === "assign",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {
        escalationIds: Array.from(selectedIds),
        action,
        reason: reason.trim() || undefined,
      };
      if (action === "update_status") {
        if (!newStatus) throw new Error("Pick a target status");
        body.newStatus = newStatus;
        if (newStatus === "resolved" && resolutionNotes.trim()) {
          body.resolutionNotes = resolutionNotes.trim();
        }
      }
      if (action === "update_priority") {
        if (!newPriority) throw new Error("Pick a priority");
        body.newPriority = newPriority;
      }
      if (action === "assign") {
        body.assigneeId = assigneeId === "unassigned" || !assigneeId ? null : assigneeId;
      }

      const { data, error } = await supabase.functions.invoke("admin-bulk-update-escalations", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Coerce a null/absent body to a zeroed summary so onSuccess never
      // dereferences null (the edge function should always return counts, but
      // a 2xx with an empty body must not throw outside the error handler).
      return (data ?? { succeeded: 0, skipped: 0, errored: 0 }) as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "escalation" : "escalations";
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
      setResolutionNotes("");
    }
    onOpenChange(next);
  };

  const canSubmit = (() => {
    if (mutation.isPending) return false;
    if (action === "update_status") return !!newStatus;
    if (action === "update_priority") return !!newPriority;
    if (action === "assign") return assigneeId !== "";
    return true;
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size} {selectedIds.size === 1 ? "escalation" : "escalations"}
          </DialogTitle>
          <DialogDescription>
            {action === "delete" ? (
              <span className="text-destructive">
                Permanently deletes the selected escalations. This cannot be undone and is restricted to super admins.
              </span>
            ) : action === "assign" ? (
              "Reassigns selected escalations to a single manager or super admin. Open escalations auto-advance to In Progress on first assignment."
            ) : action === "update_status" ? (
              "Updates the status on every selected escalation. The server validates the transition graph — invalid hops (e.g. closed → resolved) error per row."
            ) : (
              "Updates the priority on every selected escalation. Already-at-target rows are skipped."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {action === "update_status" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="bulk-esc-status" className="text-sm">New status</Label>
                <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
                  <SelectTrigger id="bulk-esc-status">
                    <SelectValue placeholder="Pick a target status…" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {newStatus === "resolved" && (
                <div className="space-y-1.5">
                  <Label htmlFor="bulk-esc-resnotes" className="text-sm">
                    Resolution notes <span className="text-muted-foreground font-normal">(optional, applied to all)</span>
                  </Label>
                  <Textarea
                    id="bulk-esc-resnotes"
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value.slice(0, 2000))}
                    placeholder="e.g. Bulk resolved — duplicate of #1234"
                    rows={3}
                    disabled={mutation.isPending}
                    className="resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground tabular-nums">{resolutionNotes.length}/2000</p>
                </div>
              )}
            </>
          )}

          {action === "update_priority" && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-esc-priority" className="text-sm">New priority</Label>
              <Select value={newPriority} onValueChange={setNewPriority} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-esc-priority">
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
              <Label htmlFor="bulk-esc-assignee" className="text-sm">Assign to</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-esc-assignee">
                  <SelectValue placeholder="Pick a manager or super admin…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">— Unassign —</SelectItem>
                  {assignableAdmins.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.display_name || [a.first_name, a.last_name].filter(Boolean).join(" ") || a.user_id.slice(0, 8)}{" "}
                      <span className="text-muted-foreground">({a.admin_role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="bulk-esc-reason" className="text-sm">
              Audit reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bulk-esc-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={action === "delete" ? "e.g. Stale test data cleanup" : "e.g. Rebalancing workload"}
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
