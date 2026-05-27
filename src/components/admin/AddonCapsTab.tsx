import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface PlacementCapRow {
  placement_type: string;
  placement_value: string;
  max_slots: number;
  notes: string | null;
}

interface ConciergeCapRow {
  geo_state: string;
  geo_city: string;
  max_slots: number;
  notes: string | null;
}

interface PlacementUsageRow {
  placement_type: string;
  placement_value: string;
  used: number;
}

interface ConciergeUsageRow {
  geo_state: string;
  geo_city: string | null;
  used: number;
}

const PLACEMENT_TYPES = [
  "homepage",
  "state",
  "city",
  "search",
  "near_me",
  "treatment",
  "insurance",
  "international",
  "article",
] as const;

/**
 * /admin/subscriptions → Caps tab. Lets an admin tune the per-scope
 * slot caps that gate Featured + Concierge purchases. Writes go
 * directly to placement_caps / concierge_geo_caps under the admin's
 * JWT (RLS enforces the admin gate; migration 20260603000000).
 */
export function AddonCapsTab() {
  return (
    <div className="space-y-8">
      <WaitlistDemandCard />
      <FeaturedCapsCard />
      <ConciergeCapsCard />
      <WaitlistCard />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Waitlist demand — top-N scopes by queue depth
// ─────────────────────────────────────────────────────────────────────────

interface DemandRow {
  addon_type: "featured" | "concierge";
  scope_label: string;
  scope_key: string;
  scope_type: string | null;
  scope_value: string | null;
  geo_state: string | null;
  geo_city: string | null;
  cap: number;
  used: number;
  waiting_count: number;
  invited_count: number;
  oldest_request: string | null;
}

function WaitlistDemandCard() {
  // Permission errors (42501 / "Admin only") legitimately resolve to
  // an empty list — a non-admin path simply has nothing to show. All
  // other errors (network, RLS, RPC failure) re-throw so the admin
  // sees a real error state instead of a silent empty card.
  const { data: rows, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-waitlist-demand"],
    queryFn: async (): Promise<DemandRow[]> => {
      const { data, error } = await supabase.rpc("get_waitlist_demand_summary", {
        p_limit: 20,
      });
      if (error) {
        if (error.code === "42501" || error.message?.includes("Admin only")) {
          return [];
        }
        throw error;
      }
      return (data ?? []) as unknown as DemandRow[];
    },
    staleTime: 1000 * 30,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Where demand is hottest</CardTitle>
        <CardDescription className="text-xs">
          Top scopes by waitlist depth. Use this to decide which caps to
          raise. Each row shows current cap, in-use, and how many providers
          are queued behind.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : isError ? (
          <div className="flex items-center justify-between gap-3 p-3 rounded-md border border-destructive/30 bg-destructive/5" role="alert">
            <p className="text-sm text-destructive">
              Failed to load waitlist demand. Retry, or check the database logs.
            </p>
            <Button size="sm" variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No active waitlist entries. Caps are sized comfortably for current demand.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium text-slate-700">Add-on</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Scope</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Cap</th>
                  <th className="px-3 py-2 font-medium text-slate-700">In use</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Waiting</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Invited</th>
                  <th className="px-3 py-2 font-medium text-slate-700">
                    Oldest waiter
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => {
                  const heat =
                    r.waiting_count + r.invited_count >= Math.max(1, r.cap)
                      ? "text-red-700 font-medium"
                      : r.waiting_count + r.invited_count > 0
                        ? "text-amber-700 font-medium"
                        : "text-slate-700";
                  return (
                    <tr key={r.scope_key}>
                      <td className="px-3 py-2">
                        <Badge variant="outline" className="font-normal capitalize">
                          {r.addon_type}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{r.scope_label}</td>
                      <td className="px-3 py-2">{r.cap}</td>
                      <td className="px-3 py-2">{r.used}</td>
                      <td className={"px-3 py-2 " + heat}>{r.waiting_count}</td>
                      <td className="px-3 py-2 text-slate-600">{r.invited_count}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {r.oldest_request
                          ? new Date(r.oldest_request).toLocaleDateString()
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Waitlist queue
// ─────────────────────────────────────────────────────────────────────────

interface WaitlistRow {
  id: string;
  addon_type: "featured" | "concierge";
  facility_id: string;
  requested_by: string;
  scope_type: string | null;
  scope_value: string | null;
  geo_state: string | null;
  geo_city: string | null;
  level_of_care: string[] | null;
  status: string;
  requested_at: string;
  invited_at: string | null;
  notes: string | null;
}

function WaitlistCard() {
  const queryClient = useQueryClient();
  const { adminRole } = useAdminAuth();
  const canManage = adminRole === "super_admin" || adminRole === "manager";
  const [addonFilter, setAddonFilter] = useState<string>("__all__");
  const [confirmExpireId, setConfirmExpireId] = useState<string | null>(null);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["admin-waitlist", addonFilter],
    queryFn: async (): Promise<WaitlistRow[]> => {
      let q = supabase
        .from("addon_waitlist")
        .select(
          "id, addon_type, facility_id, requested_by, scope_type, scope_value, geo_state, geo_city, level_of_care, status, requested_at, invited_at, notes",
        )
        .in("status", ["waiting", "invited"])
        .order("requested_at", { ascending: true });
      if (addonFilter !== "__all__") q = q.eq("addon_type", addonFilter);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as WaitlistRow[];
    },
    staleTime: 1000 * 30,
  });

  async function markInvited(id: string) {
    const { error } = await supabase
      .from("addon_waitlist")
      .update({ status: "invited", invited_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as invited");
    queryClient.invalidateQueries({ queryKey: ["admin-waitlist", addonFilter] });
  }

  async function markFulfilled(id: string) {
    const { error } = await supabase
      .from("addon_waitlist")
      .update({ status: "fulfilled", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked as fulfilled");
    queryClient.invalidateQueries({ queryKey: ["admin-waitlist", addonFilter] });
  }

  async function doExpire(id: string) {
    const { error } = await supabase
      .from("addon_waitlist")
      .update({ status: "expired", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Marked expired");
    queryClient.invalidateQueries({ queryKey: ["admin-waitlist", addonFilter] });
  }

  function scopeLabel(r: WaitlistRow): string {
    if (r.addon_type === "featured") {
      return `${r.scope_type ?? "?"}=${r.scope_value ?? "?"}`;
    }
    return `${r.geo_state ?? "?"}${r.geo_city ? "/" + r.geo_city : " (statewide)"}`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Open waitlist queue</CardTitle>
        <CardDescription className="text-xs">
          Providers who opted in when a scope was full. The system already wrote
          an admin_notification when each entry's slot freed up — use this view
          to track follow-through.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Filter by add-on</Label>
          <Select value={addonFilter} onValueChange={setAddonFilter}>
            <SelectTrigger className="mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All add-ons</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="concierge">Concierge</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <Skeleton className="h-32 w-full" />
        ) : !rows || rows.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No open waitlist entries. Nice — no one is waiting.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium text-slate-700">Add-on</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Scope</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Facility</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Requested</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Status</th>
                  <th className="px-3 py-2 font-medium text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className="font-normal capitalize">
                        {r.addon_type}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{scopeLabel(r)}</td>
                    <td className="px-3 py-2 font-mono text-xs">{r.facility_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 text-slate-600">
                      {new Date(r.requested_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2">
                      <Badge
                        variant="outline"
                        className={
                          r.status === "invited"
                            ? "border-blue-300 bg-blue-50 text-blue-800"
                            : "border-amber-300 bg-amber-50 text-amber-800"
                        }
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      {canManage && r.status === "waiting" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => markInvited(r.id)}
                        >
                          Mark invited
                        </Button>
                      )}
                      {canManage && r.status === "invited" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          onClick={() => markFulfilled(r.id)}
                        >
                          Mark fulfilled
                        </Button>
                      )}
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmExpireId(r.id)}
                        >
                          Expire
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>

    <AlertDialog open={!!confirmExpireId} onOpenChange={(open) => { if (!open) setConfirmExpireId(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Expire waitlist entry?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the entry as expired. The provider will see their entry close.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => { if (confirmExpireId) doExpire(confirmExpireId); setConfirmExpireId(null); }}
          >
            Expire
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Featured caps
// ─────────────────────────────────────────────────────────────────────────

function FeaturedCapsCard() {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<string>("__all__");
  const [filterText, setFilterText] = useState("");

  const { data: caps, isLoading } = useQuery({
    queryKey: ["admin-placement-caps"],
    queryFn: async (): Promise<PlacementCapRow[]> => {
      const { data, error } = await supabase
        .from("placement_caps")
        .select("placement_type, placement_value, max_slots, notes")
        .order("placement_type", { ascending: true })
        .order("placement_value", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlacementCapRow[];
    },
    staleTime: 1000 * 30,
  });

  const { data: usageMap } = useQuery({
    queryKey: ["admin-placement-usage"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("featured_placements")
        .select("placement_type, placement_value")
        .eq("active", true);
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const row = r as PlacementUsageRow;
        const key = `${row.placement_type}|${row.placement_value}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
      return map;
    },
    staleTime: 1000 * 30,
  });

  const filtered = useMemo(() => {
    if (!caps) return [];
    const ft = filterText.trim().toLowerCase();
    return caps.filter((c) => {
      if (filterType !== "__all__" && c.placement_type !== filterType) return false;
      if (ft && !c.placement_value.toLowerCase().includes(ft)) return false;
      return true;
    });
  }, [caps, filterType, filterText]);

  const onChanged = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-placement-caps"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Featured placement caps</CardTitle>
        <CardDescription className="text-xs">
          One row per (page type, value). Tuning <code>max_slots</code> takes
          effect immediately for future purchases. Reducing below the current
          usage doesn't deactivate existing slots.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <Label className="text-xs">Filter by type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All types</SelectItem>
                {PLACEMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">Filter by value</Label>
            <Input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="e.g. austin, TX, medication-assisted"
              className="mt-1"
            />
          </div>
        </div>

        <AddPlacementCapForm onAdded={onChanged} />

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 italic">
            No caps match this filter.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium text-slate-700">Type</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Value</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Used</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Cap</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Notes</th>
                  <th className="px-3 py-2 font-medium text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => (
                  <PlacementCapEditableRow
                    key={`${row.placement_type}|${row.placement_value}`}
                    row={row}
                    used={usageMap?.get(`${row.placement_type}|${row.placement_value}`) ?? 0}
                    onChanged={onChanged}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PlacementCapEditableRow({
  row,
  used,
  onChanged,
}: {
  row: PlacementCapRow;
  used: number;
  onChanged: () => void;
}) {
  const { adminRole } = useAdminAuth();
  const canManage = adminRole === "super_admin" || adminRole === "manager";
  const [maxSlots, setMaxSlots] = useState(String(row.max_slots));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const dirty =
    Number(maxSlots) !== row.max_slots || (notes ?? "") !== (row.notes ?? "");
  const parsedMax = Number(maxSlots);
  const valid = Number.isFinite(parsedMax) && parsedMax >= 0 && parsedMax <= 9999;

  const overCap = used > row.max_slots;

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("placement_caps")
        .update({
          max_slots: parsedMax,
          notes: notes.trim().length > 0 ? notes.trim() : null,
        })
        .eq("placement_type", row.placement_type)
        .eq("placement_value", row.placement_value);
      if (error) throw error;
      toast.success(`Cap saved for ${row.placement_type}=${row.placement_value}`);
      onChanged();
    } catch (err) {
      console.error("[FeaturedCaps] save failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to save cap");
    } finally {
      setSaving(false);
    }
  }

  async function doDel() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("placement_caps")
        .delete()
        .eq("placement_type", row.placement_type)
        .eq("placement_value", row.placement_value);
      if (error) throw error;
      toast.success("Cap deleted");
      onChanged();
    } catch (err) {
      console.error("[FeaturedCaps] delete failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete cap");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <tr>
      <td className="px-3 py-2">
        <Badge variant="outline" className="font-normal">
          {row.placement_type}
        </Badge>
      </td>
      <td className="px-3 py-2 font-mono text-xs">{row.placement_value}</td>
      <td className="px-3 py-2">
        <span className={overCap ? "text-red-600 font-medium" : ""}>{used}</span>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          max={9999}
          value={maxSlots}
          onChange={(e) => setMaxSlots(e.target.value)}
          className="h-8 w-20"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="optional"
          className="h-8"
        />
      </td>
      <td className="px-3 py-2 text-right">
        {canManage && (
          <div className="inline-flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!dirty || !valid || saving}
              onClick={save}
              className="h-8 gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={deleting}
              onClick={() => setConfirmDel(true)}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </td>
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete placement cap?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete cap for {row.placement_type}={row.placement_value}? Future inserts will fall back to the type-level average.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmDel(false); doDel(); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </tr>
  );
}

function AddPlacementCapForm({ onAdded }: { onAdded: () => void }) {
  const { adminRole } = useAdminAuth();
  const canManage = adminRole === "super_admin" || adminRole === "manager";
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("");
  const [value, setValue] = useState("");
  const [maxSlots, setMaxSlots] = useState("10");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedMax = Number(maxSlots);
  const canSubmit =
    type !== "" &&
    value.trim().length > 0 &&
    Number.isFinite(parsedMax) &&
    parsedMax >= 0 &&
    parsedMax <= 9999 &&
    !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("placement_caps").insert({
        placement_type: type,
        placement_value: value.trim(),
        max_slots: parsedMax,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error(
            "A cap for this (type, value) already exists — edit it in the table below instead.",
          );
          return;
        }
        throw error;
      }
      toast.success("Cap added");
      setType("");
      setValue("");
      setMaxSlots("10");
      setNotes("");
      setOpen(false);
      onAdded();
    } catch (err) {
      console.error("[FeaturedCaps] add failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to add cap");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canManage) return null;

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add a Featured cap
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Add a Featured placement cap</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType} disabled={submitting}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="Pick" />
            </SelectTrigger>
            <SelectContent>
              {PLACEMENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Value</Label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. austin"
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Max slots</Label>
          <Input
            type="number"
            min={0}
            max={9999}
            value={maxSlots}
            onChange={(e) => setMaxSlots(e.target.value)}
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit} className="gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add cap
        </Button>
      </div>
    </form>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Concierge caps
// ─────────────────────────────────────────────────────────────────────────

function ConciergeCapsCard() {
  const queryClient = useQueryClient();
  const [filterText, setFilterText] = useState("");

  const { data: caps, isLoading } = useQuery({
    queryKey: ["admin-concierge-caps"],
    queryFn: async (): Promise<ConciergeCapRow[]> => {
      const { data, error } = await supabase
        .from("concierge_geo_caps")
        .select("geo_state, geo_city, max_slots, notes")
        .order("geo_state", { ascending: true })
        .order("geo_city", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ConciergeCapRow[];
    },
    staleTime: 1000 * 30,
  });

  const { data: usageMap } = useQuery({
    queryKey: ["admin-concierge-usage"],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from("concierge_partner_facilities")
        .select("geo_state, geo_city")
        .eq("active", true);
      if (error) throw error;
      const map = new Map<string, number>();
      (data ?? []).forEach((r) => {
        const row = r as ConciergeUsageRow;
        const cityKey = row.geo_city ? row.geo_city.toLowerCase() : "*";
        const key = `${row.geo_state.toUpperCase()}|${cityKey}`;
        map.set(key, (map.get(key) ?? 0) + 1);
      });
      return map;
    },
    staleTime: 1000 * 30,
  });

  const filtered = useMemo(() => {
    if (!caps) return [];
    const ft = filterText.trim().toLowerCase();
    if (!ft) return caps;
    return caps.filter(
      (c) =>
        c.geo_state.toLowerCase().includes(ft) ||
        c.geo_city.toLowerCase().includes(ft),
    );
  }, [caps, filterText]);

  const onChanged = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-concierge-caps"] });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Concierge geo caps</CardTitle>
        <CardDescription className="text-xs">
          One row per (state, city). <code>geo_city='*'</code> is the
          statewide-default cap. Specific cities override the default; admin
          can set Austin to 6 while the rest of Texas stays at the default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs">Filter (matches state or city)</Label>
          <Input
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            placeholder="e.g. TX, austin"
            className="mt-1"
          />
        </div>

        <AddConciergeCapForm onAdded={onChanged} />

        {isLoading ? (
          <Skeleton className="h-48 w-full" />
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-500 italic">No caps match this filter.</p>
        ) : (
          <div className="overflow-x-auto -mx-4 md:mx-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-slate-200">
                  <th className="px-3 py-2 font-medium text-slate-700">State</th>
                  <th className="px-3 py-2 font-medium text-slate-700">City</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Used</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Cap</th>
                  <th className="px-3 py-2 font-medium text-slate-700">Notes</th>
                  <th className="px-3 py-2 font-medium text-slate-700 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row) => {
                  const cityKey = row.geo_city === "*" ? "*" : row.geo_city.toLowerCase();
                  const used = usageMap?.get(`${row.geo_state}|${cityKey}`) ?? 0;
                  return (
                    <ConciergeCapEditableRow
                      key={`${row.geo_state}|${row.geo_city}`}
                      row={row}
                      used={used}
                      onChanged={onChanged}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConciergeCapEditableRow({
  row,
  used,
  onChanged,
}: {
  row: ConciergeCapRow;
  used: number;
  onChanged: () => void;
}) {
  const { adminRole } = useAdminAuth();
  const canManage = adminRole === "super_admin" || adminRole === "manager";
  const [maxSlots, setMaxSlots] = useState(String(row.max_slots));
  const [notes, setNotes] = useState(row.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const dirty =
    Number(maxSlots) !== row.max_slots || (notes ?? "") !== (row.notes ?? "");
  const parsedMax = Number(maxSlots);
  const valid = Number.isFinite(parsedMax) && parsedMax >= 0 && parsedMax <= 9999;
  const overCap = used > row.max_slots;

  async function save() {
    if (!dirty || !valid || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("concierge_geo_caps")
        .update({
          max_slots: parsedMax,
          notes: notes.trim().length > 0 ? notes.trim() : null,
        })
        .eq("geo_state", row.geo_state)
        .eq("geo_city", row.geo_city);
      if (error) throw error;
      toast.success(
        `Cap saved for ${row.geo_state}${row.geo_city === "*" ? " (statewide)" : "/" + row.geo_city}`,
      );
      onChanged();
    } catch (err) {
      console.error("[ConciergeCaps] save failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to save cap");
    } finally {
      setSaving(false);
    }
  }

  async function doDel() {
    if (deleting) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from("concierge_geo_caps")
        .delete()
        .eq("geo_state", row.geo_state)
        .eq("geo_city", row.geo_city);
      if (error) throw error;
      toast.success("Cap deleted");
      onChanged();
    } catch (err) {
      console.error("[ConciergeCaps] delete failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to delete cap");
    } finally {
      setDeleting(false);
    }
  }

  const cityLabel = row.geo_city === "*" ? "(statewide)" : row.geo_city;

  return (
    <tr>
      <td className="px-3 py-2 font-mono text-xs">{row.geo_state}</td>
      <td className="px-3 py-2">
        <span className={row.geo_city === "*" ? "italic text-slate-500" : ""}>
          {cityLabel}
        </span>
      </td>
      <td className="px-3 py-2">
        <span className={overCap ? "text-red-600 font-medium" : ""}>{used}</span>
      </td>
      <td className="px-3 py-2">
        <Input
          type="number"
          min={0}
          max={9999}
          value={maxSlots}
          onChange={(e) => setMaxSlots(e.target.value)}
          className="h-8 w-20"
        />
      </td>
      <td className="px-3 py-2">
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="optional"
          className="h-8"
        />
      </td>
      <td className="px-3 py-2 text-right">
        {canManage && (
          <div className="inline-flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={!dirty || !valid || saving}
              onClick={save}
              className="h-8 gap-1.5"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={deleting}
              onClick={() => setConfirmDel(true)}
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
            </Button>
          </div>
        )}
      </td>
      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete concierge geo cap?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete cap for {row.geo_state}/{row.geo_city === "*" ? "(statewide)" : row.geo_city}? Future inserts will fall back to the statewide default.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { setConfirmDel(false); doDel(); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </tr>
  );
}

function AddConciergeCapForm({ onAdded }: { onAdded: () => void }) {
  const { adminRole } = useAdminAuth();
  const canManage = adminRole === "super_admin" || adminRole === "manager";
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [maxSlots, setMaxSlots] = useState("3");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const parsedMax = Number(maxSlots);
  const canSubmit =
    state.trim().length === 2 &&
    Number.isFinite(parsedMax) &&
    parsedMax >= 0 &&
    parsedMax <= 9999 &&
    !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const geoState = state.trim().toUpperCase();
      const geoCity = city.trim().length > 0 ? city.trim() : "*";
      const { error } = await supabase.from("concierge_geo_caps").insert({
        geo_state: geoState,
        geo_city: geoCity,
        max_slots: parsedMax,
        notes: notes.trim().length > 0 ? notes.trim() : null,
      });
      if (error) {
        if (error.code === "23505") {
          toast.error(
            "A cap for this (state, city) already exists — edit it in the table below.",
          );
          return;
        }
        throw error;
      }
      toast.success("Cap added");
      setState("");
      setCity("");
      setMaxSlots("3");
      setNotes("");
      setOpen(false);
      onAdded();
    } catch (err) {
      console.error("[ConciergeCaps] add failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to add cap");
    } finally {
      setSubmitting(false);
    }
  }

  if (!canManage) return null;

  if (!open) {
    return (
      <Button type="button" variant="outline" onClick={() => setOpen(true)} className="gap-1.5">
        <Plus className="h-4 w-4" />
        Add a Concierge cap
      </Button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="space-y-3 rounded-lg border border-slate-200 bg-white p-4"
    >
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Add a Concierge geo cap</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          disabled={submitting}
        >
          Cancel
        </Button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">State (2-letter)</Label>
          <Input
            value={state}
            onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
            placeholder="TX"
            maxLength={2}
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">
            City <span className="text-slate-400 font-normal">(blank = *)</span>
          </Label>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Austin"
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Max slots</Label>
          <Input
            type="number"
            min={0}
            max={9999}
            value={maxSlots}
            onChange={(e) => setMaxSlots(e.target.value)}
            disabled={submitting}
            className="mt-1"
          />
        </div>
        <div>
          <Label className="text-xs">Notes (optional)</Label>
          <Input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={submitting}
            className="mt-1"
          />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit} className="gap-1.5">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add cap
        </Button>
      </div>
    </form>
  );
}
