import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, ArrowRightLeft, Search } from "lucide-react";
import { toast } from "sonner";

interface Advisor {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface BulkReassignAdvisorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  advisors: Advisor[];
  onSuccess: () => void;
}

function advisorLabel(a: Advisor): string {
  return (
    a.display_name ||
    [a.first_name, a.last_name].filter(Boolean).join(" ") ||
    a.user_id.slice(0, 8)
  );
}

/**
 * Bulk-reassign multiple concierge cases to a single target advisor
 * via `admin-bulk-reassign-concierge-advisor`. The edge fn verifies
 * (a) admin role, (b) target advisor is an active row in
 * admin_user_profiles with admin_role IN ('advisor','manager',
 * 'super_admin'), (c) per-case skip-no-op + audit_log + case_events
 * entries.
 *
 * Search input filters the advisor list client-side so an admin
 * with many advisor users can find the target quickly.
 */
export function BulkReassignAdvisorDialog({
  open, onOpenChange, selectedIds, advisors, onSuccess,
}: BulkReassignAdvisorDialogProps) {
  const [search, setSearch] = useState("");
  const [pickedAdvisorId, setPickedAdvisorId] = useState<string | null>(null);
  const [reason, setReason] = useState<string>("");

  const filtered = advisors.filter((a) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return advisorLabel(a).toLowerCase().includes(q);
  });

  const mutation = useMutation({
    mutationFn: async (targetAdvisorId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-reassign-concierge-advisor", {
        body: {
          inquiryIds: Array.from(selectedIds),
          targetAdvisorId,
          reason: reason.trim() || undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { reassigned: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`Reassigned ${res.reassigned} ${res.reassigned === 1 ? "case" : "cases"}`);
      } else {
        const summary = `Reassigned ${res.reassigned} · ${res.skipped} skipped · ${res.errored} errored`;
        if (res.errored > 0) {
          (res.reassigned > 0 ? toast.warning : toast.error)(summary);
        } else {
          toast.success(summary);
        }
      }
      handleOpenChange(false);
      onSuccess();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Bulk reassign failed"),
  });

  const handleSubmit = () => {
    if (!pickedAdvisorId) return;
    mutation.mutate(pickedAdvisorId);
  };

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setPickedAdvisorId(null);
      setSearch("");
      setReason("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Reassign advisor — {selectedIds.size} {selectedIds.size === 1 ? "case" : "cases"}
          </DialogTitle>
          <DialogDescription>
            Moves every selected case to a single target advisor. The edge
            function validates the target is active + has an advisor role
            (advisor / manager / super_admin). One
            <code className="text-[11px]"> admin_audit_log </code> row +
            one <code className="text-[11px]">concierge_case_events</code> row per case.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search advisors by name…"
              className="pl-8"
              disabled={mutation.isPending}
            />
          </div>

          <div className="max-h-60 overflow-y-auto rounded-md border border-slate-200">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {advisors.length === 0 ? "No advisors available." : "No advisors match that search."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.slice(0, 100).map((a) => {
                  const picked = pickedAdvisorId === a.user_id;
                  return (
                    <li key={a.user_id}>
                      <button
                        type="button"
                        onClick={() => setPickedAdvisorId(a.user_id)}
                        disabled={mutation.isPending}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                          picked ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                        }`}
                      >
                        <p className="font-medium text-slate-900">{advisorLabel(a)}</p>
                        <p className="text-[11px] text-muted-foreground">{a.user_id.slice(0, 8)}…</p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bulk-reassign-reason" className="text-sm">
              Reason <span className="text-muted-foreground font-normal">(optional, audit-logged)</span>
            </Label>
            <Textarea
              id="bulk-reassign-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 500))}
              placeholder="e.g. Rebalancing case load — advisor on PTO"
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
          <Button onClick={handleSubmit} disabled={!pickedAdvisorId || mutation.isPending} className="gap-2">
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
            Reassign {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
