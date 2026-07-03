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
import { Loader2, RefreshCw, Shield, Mail, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type BulkMarketingAction = "update_status" | "mark_converted" | "send_followup" | "delete";

interface BulkMarketingLeadActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: BulkMarketingAction;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "lost", label: "Lost" },
];

const ACTION_CONFIG: Record<BulkMarketingAction, { title: string; verb: string; pastVerb: string; icon: React.ElementType; danger?: boolean; description: string }> = {
  update_status: {
    title: "Change status",
    verb: "Update",
    pastVerb: "Updated",
    icon: RefreshCw,
    description: "Updates the status on every selected marketing lead. Already-in-target leads are skipped.",
  },
  mark_converted: {
    title: "Mark as converted to concierge",
    verb: "Mark converted",
    pastVerb: "Marked converted",
    icon: Shield,
    description: "Flags every selected lead as converted_to_concierge, stamps converted_at, and sets status=converted. Already-converted leads are skipped.",
  },
  send_followup: {
    title: "Send follow-up email",
    verb: "Send",
    pastVerb: "Sent",
    icon: Mail,
    description: "Fires the send-marketing-followup edge fn for each selected lead. Leads that have already received a follow-up are skipped.",
  },
  delete: {
    title: "Delete marketing leads",
    verb: "Delete",
    pastVerb: "Deleted",
    icon: Trash2,
    danger: true,
    description: "Permanently deletes the selected leads. Super-admin only. Cannot be undone.",
  },
};

/**
 * Wraps admin-bulk-update-marketing-leads (deployed v1). Admin-gated
 * to super_admin + manager; delete restricted to super_admin.
 * Partial-success summary, per-row audit.
 */
export function BulkMarketingLeadActionDialog({
  open, onOpenChange, action, selectedIds, onSuccess,
}: BulkMarketingLeadActionDialogProps) {
  const [newStatus, setNewStatus] = useState<string>("");
  const [reason, setReason] = useState("");

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const body: Record<string, unknown> = {
        leadIds: Array.from(selectedIds),
        action,
        reason: reason.trim() || undefined,
      };
      if (action === "update_status") {
        if (!newStatus) throw new Error("Pick a target status");
        body.newStatus = newStatus;
      }

      const { data, error } = await supabase.functions.invoke("admin-bulk-update-marketing-leads", {
        body,
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { succeeded: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      const noun = res.succeeded === 1 ? "lead" : "leads";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${config.pastVerb} ${res.succeeded} ${noun}`);
      } else {
        const summary = `${config.pastVerb} ${res.succeeded} · ${res.skipped} skipped · ${res.errored} errored`;
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
      setReason("");
    }
    onOpenChange(next);
  };

  const canSubmit = !mutation.isPending && (action !== "update_status" || !!newStatus);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            {config.title} — {selectedIds.size} {selectedIds.size === 1 ? "lead" : "leads"}
          </DialogTitle>
          <DialogDescription className={config.danger ? "text-destructive" : undefined}>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {action === "update_status" && (
            <div className="space-y-1.5">
              <Label htmlFor="bulk-marketing-status" className="text-sm">New status</Label>
              <Select value={newStatus} onValueChange={setNewStatus} disabled={mutation.isPending}>
                <SelectTrigger id="bulk-marketing-status">
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

          <div className="space-y-1.5">
            <Label htmlFor="bulk-marketing-reason" className="text-sm">
              Audit reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="bulk-marketing-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder={action === "delete" ? "e.g. Stale test data cleanup" : "e.g. Quarterly drip campaign"}
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
