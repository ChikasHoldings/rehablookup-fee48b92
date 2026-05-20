import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRightLeft, Search } from "lucide-react";
import { toast } from "sonner";

interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
}

interface BulkReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedIds: Set<string>;
  facilities: Facility[];
  onSuccess: () => void;
}

/**
 * Bulk-reassign multiple leads to a single target facility in one
 * action. Calls the `admin-bulk-reassign-leads` edge function which
 * (a) verifies admin role, (b) validates the target facility is
 * approved, (c) updates each lead's facility_id + stamps
 * original_facility_id on first reassign, (d) writes one
 * admin_audit_log row per reassigned lead.
 *
 * The search input filters the facility list client-side so admins
 * with many facilities can find the target quickly. The submit
 * button shows partial-success info (e.g. "Reassigned 18 of 20")
 * when some leads couldn't be moved.
 */
export function BulkReassignDialog({
  open,
  onOpenChange,
  selectedIds,
  facilities,
  onSuccess,
}: BulkReassignDialogProps) {
  const [search, setSearch] = useState("");
  const [pickedFacilityId, setPickedFacilityId] = useState<string | null>(null);

  const filtered = facilities.filter((f) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.city.toLowerCase().includes(q) ||
      f.state.toLowerCase().includes(q)
    );
  });

  const mutation = useMutation({
    mutationFn: async (targetFacilityId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");
      const { data, error } = await supabase.functions.invoke("admin-bulk-reassign-leads", {
        body: {
          leadIds: Array.from(selectedIds),
          targetFacilityId,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { reassigned: number; skipped: number; errored: number };
    },
    onSuccess: (res) => {
      if (res.errored === 0 && res.skipped === 0) {
        toast.success(`Reassigned ${res.reassigned} ${res.reassigned === 1 ? "lead" : "leads"}`);
      } else {
        toast.success(
          `Reassigned ${res.reassigned} · ${res.skipped} skipped · ${res.errored} errored`,
        );
      }
      onOpenChange(false);
      setPickedFacilityId(null);
      setSearch("");
      onSuccess();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Bulk reassign failed");
    },
  });

  const handleSubmit = () => {
    if (!pickedFacilityId) return;
    mutation.mutate(pickedFacilityId);
  };

  const handleOpenChange = (next: boolean) => {
    if (mutation.isPending) return;
    if (!next) {
      setPickedFacilityId(null);
      setSearch("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4" />
            Reassign {selectedIds.size} {selectedIds.size === 1 ? "lead" : "leads"}
          </DialogTitle>
          <DialogDescription>
            Move every selected lead to a single target facility. Each lead
            keeps its <code className="text-[11px]">original_facility_id</code>
            for the audit trail; one <code className="text-[11px]">admin_audit_log</code>
            row is written per reassigned lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search facilities by name, city, state…"
              className="pl-8"
              disabled={mutation.isPending}
            />
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border border-slate-200">
            {filtered.length === 0 ? (
              <p className="text-sm text-muted-foreground p-4 text-center">
                {facilities.length === 0
                  ? "No facilities available."
                  : "No facilities match that search."}
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filtered.slice(0, 200).map((f) => {
                  const picked = pickedFacilityId === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setPickedFacilityId(f.id)}
                        disabled={mutation.isPending}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors ${
                          picked ? "bg-primary/5 ring-1 ring-inset ring-primary/30" : ""
                        }`}
                      >
                        <p className="font-medium text-slate-900">{f.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {f.city}, {f.state}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {filtered.length > 200 && (
              <p className="text-[11px] text-muted-foreground px-3 py-2 border-t border-slate-100">
                Showing first 200 matches — refine the search to see more.
              </p>
            )}
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
            onClick={handleSubmit}
            disabled={!pickedFacilityId || mutation.isPending}
            className="gap-2"
          >
            {mutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowRightLeft className="h-4 w-4" />
            )}
            Reassign {selectedIds.size}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
