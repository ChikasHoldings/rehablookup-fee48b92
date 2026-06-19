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
import { Loader2, Ban } from "lucide-react";
import { toast } from "sonner";

interface BulkBanSeekersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  onSuccess: () => void;
}

const ACTION_OPTIONS: Array<{ value: "ban" | "unban"; label: string; description: string }> = [
  {
    value: "ban",
    label: "Ban",
    description:
      "Revokes login + blocks re-registration with the same email. Audit-logged per seeker.",
  },
  {
    value: "unban",
    label: "Unban",
    description:
      "Restores login + deactivates blocked_identifiers rows for the user_id/email.",
  },
];

/**
 * Bulk-ban or bulk-unban up to 50 seekers in one operation.
 *
 * Backed by `admin-bulk-ban-seekers` which gates on can_moderate_users
 * (super_admin + manager only — reps don't get bulk-ban power), syncs
 * both `auth.users.banned_until` and `blocked_identifiers`, and writes
 * one `admin_audit_log` row per seeker.
 *
 * 50-row cap is intentionally smaller than the 100-row cap on other
 * bulk surfaces because banning revokes sessions downstream — we
 * don't want a fat-fingered 100-seeker mistake to lock out a quarter
 * of the active user base.
 */
export function BulkBanSeekersDialog({
  open,
  onOpenChange,
  selectedIds,
  onSuccess,
}: BulkBanSeekersDialogProps) {
  const [action, setAction] = useState<"ban" | "unban" | "">("");
  const [reason, setReason] = useState<string>("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!action) throw new Error("Pick ban or unban");
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-ban-seekers", {
        body: {
          userIds: Array.from(selectedIds),
          action,
          reason: reason.trim() || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { updated: number; skipped: number; errored: number; action: "ban" | "unban" };
    },
    onSuccess: (res) => {
      const verb = res.action === "ban" ? "Banned" : "Unbanned";
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`${verb} ${res.updated} ${res.updated === 1 ? "seeker" : "seekers"}`);
      } else {
        const summary = `${verb} ${res.updated} · ${res.skipped} skipped · ${res.errored} errored`;
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
      toast.error(err instanceof Error ? err.message : "Bulk action failed");
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setAction("");
      setReason("");
    }
    onOpenChange(next);
  };

  const selected = ACTION_OPTIONS.find((o) => o.value === action);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-4 w-4" />
            Bulk ban — {selectedIds.size} {selectedIds.size === 1 ? "seeker" : "seekers"}
          </DialogTitle>
          <DialogDescription>
            Capped at 50 seekers per call. Banning revokes login on the
            target's next request and inserts <code className="text-[11px]">blocked_identifiers</code>
            rows for the user_id + email so they can't re-register. Already-in-target
            rows (banned for ban, not-banned for unban) are skipped, not errored.
            One <code className="text-[11px]">admin_audit_log</code> row per seeker.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bulk-ban-action" className="text-sm">
              Action
            </Label>
            <Select
              value={action}
              onValueChange={(v) => setAction(v as "ban" | "unban")}
              disabled={mutation.isPending}
            >
              <SelectTrigger id="bulk-ban-action">
                <SelectValue placeholder="Pick ban or unban…" />
              </SelectTrigger>
              <SelectContent>
                {ACTION_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected && <p className="text-xs text-muted-foreground">{selected.description}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-ban-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-ban-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Spam signups from same IP range — bulk action 2026-05-20"
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
            disabled={!action || mutation.isPending}
            className="gap-2"
            variant={action === "ban" ? "destructive" : "default"}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
            {action === "unban" ? "Unban" : "Apply to"} {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
