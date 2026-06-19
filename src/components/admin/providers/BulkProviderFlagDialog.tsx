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
import { Loader2, ToggleRight } from "lucide-react";
import { toast } from "sonner";

export type BulkFlagField = "suspended" | "verified" | "featured" | "concierge_network_opted_in";

interface BulkProviderFlagDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const FIELD_OPTIONS: Array<{
  field: BulkFlagField;
  trueLabel: string;
  falseLabel: string;
  trueDescription: string;
  falseDescription: string;
}> = [
  {
    field: "suspended",
    trueLabel: "Suspend",
    falseLabel: "Reactivate",
    trueDescription: "Hides facilities from public directory + provider inbox. Audit-logged.",
    falseDescription: "Restores hidden facilities to active status.",
  },
  {
    field: "verified",
    trueLabel: "Mark verified",
    falseLabel: "Mark unverified",
    trueDescription: "Adds the verified-checkmark badge on the public profile.",
    falseDescription: "Removes the verified-checkmark badge.",
  },
  {
    field: "featured",
    trueLabel: "Force-feature",
    falseLabel: "Unfeature",
    trueDescription: "Editorial override — adds to Featured rotation regardless of paid subscription. Use sparingly.",
    falseDescription: "Removes from editorial Featured rotation.",
  },
  {
    field: "concierge_network_opted_in",
    trueLabel: "Add to concierge network",
    falseLabel: "Remove from concierge network",
    trueDescription: "Makes facility eligible for concierge advisor matches.",
    falseDescription: "Removes from advisor match pool (already-active partners stay until end of period).",
  },
];

/**
 * Bulk-toggle a single boolean flag (suspended / verified / featured /
 * concierge_network_opted_in) across multiple facilities. Backed by
 * admin-bulk-update-provider-flags which enforces a field whitelist
 * and writes per-facility audit log rows with before/after value +
 * optional reason.
 */
export function BulkProviderFlagDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkProviderFlagDialogProps) {
  // Composite key encodes both field + target value so a single
  // Select can drive the whole "suspend / reactivate / verify / …"
  // workflow without proliferating dialogs.
  const [actionKey, setActionKey] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!actionKey) throw new Error("Pick an action");
      const [field, valueStr] = actionKey.split(":");
      const value = valueStr === "true";
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-update-provider-flags", {
        body: {
          facilityIds: Array.from(selectedIds),
          field,
          value,
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
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk update failed"),
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setActionKey("");
      setReason("");
    }
    onOpenChange(next);
  };

  const selected = (() => {
    if (!actionKey) return null;
    const [field, valueStr] = actionKey.split(":");
    const opt = FIELD_OPTIONS.find((o) => o.field === field);
    if (!opt) return null;
    const value = valueStr === "true";
    return {
      label: value ? opt.trueLabel : opt.falseLabel,
      description: value ? opt.trueDescription : opt.falseDescription,
    };
  })();

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ToggleRight className="h-4 w-4" />
            Bulk flag — {selectedIds.size} {selectedIds.size === 1 ? "provider" : "providers"}
          </DialogTitle>
          <DialogDescription>
            Toggles a single boolean flag on every selected facility.
            Rows already in the target state are skipped (not errored).
            One <code className="text-[11px]">admin_audit_log</code> row per updated provider.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-provider-flag-select" className="text-sm">
              Action
            </Label>
            <Select value={actionKey} onValueChange={setActionKey} disabled={mutation.isPending}>
              <SelectTrigger id="bulk-provider-flag-select">
                <SelectValue placeholder="Pick an action…" />
              </SelectTrigger>
              <SelectContent>
                {FIELD_OPTIONS.flatMap((opt) => [
                  <SelectItem key={`${opt.field}:true`} value={`${opt.field}:true`}>
                    {opt.trueLabel}
                  </SelectItem>,
                  <SelectItem key={`${opt.field}:false`} value={`${opt.field}:false`}>
                    {opt.falseLabel}
                  </SelectItem>,
                ])}
              </SelectContent>
            </Select>
            {selected && (
              <p className="text-xs text-muted-foreground">{selected.description}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-provider-flag-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-provider-flag-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Suspending facilities reported by user — investigation pending"
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
          <Button onClick={() => mutation.mutate()} disabled={!actionKey || mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ToggleRight className="h-4 w-4" />}
            Apply to {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
