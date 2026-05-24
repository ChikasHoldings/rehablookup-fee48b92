import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, X, BellOff, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface WaitlistRow {
  id: string;
  addon_type: "featured" | "concierge";
  facility_id: string;
  scope_type: string | null;
  scope_value: string | null;
  geo_state: string | null;
  geo_city: string | null;
  level_of_care: string[] | null;
  status: string;
  requested_at: string;
  invited_at: string | null;
  auto_invite_opt_out: boolean | null;
  facilities: { name: string } | null;
}

interface Props {
  /** Optional filter — when set, only entries for this facility render. */
  facilityId?: string;
  /** Optional filter on add-on type. */
  addonType?: "featured" | "concierge";
}

/**
 * Lists every open waitlist entry the signed-in provider has. Used as
 * a section on BillingPlacements / BillingConcierge (filtered) and on
 * the provider dashboard (unfiltered, all add-ons across all owned
 * facilities). Each row shows its scope, status, position-in-line,
 * and a "Leave the queue" action.
 */
export function MyWaitlistEntries({ facilityId, addonType }: Props) {
  const queryClient = useQueryClient();
  const [cancelingId, setCancelingId] = useState<string | null>(null);

  const queryKey = ["my-waitlist-entries", facilityId ?? "*", addonType ?? "*"];

  const { data: rows, isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: async (): Promise<WaitlistRow[]> => {
      const { data: sess } = await supabase.auth.getSession();
      const userId = sess.session?.user.id;
      if (!userId) return [];
      let q = supabase
        .from("addon_waitlist")
        .select(
          "id, addon_type, facility_id, scope_type, scope_value, geo_state, geo_city, level_of_care, status, requested_at, invited_at, auto_invite_opt_out, facilities!inner(name)",
        )
        .eq("requested_by", userId)
        .in("status", ["waiting", "invited"])
        .order("requested_at", { ascending: false });
      if (facilityId) q = q.eq("facility_id", facilityId);
      if (addonType) q = q.eq("addon_type", addonType);
      const { data, error } = await q;
      // Surface the failure so an enrolled provider sees a retry rather
      // than a vanished card that implies they're on no waitlists.
      if (error) {
        console.warn("[MyWaitlistEntries] fetch failed", error);
        throw error;
      }
      return (data as unknown as WaitlistRow[]) ?? [];
    },
    staleTime: 1000 * 30,
  });

  async function cancel(id: string) {
    if (cancelingId) return;
    if (!confirm("Leave the waitlist for this scope? You can re-join later.")) return;
    setCancelingId(id);
    try {
      const { error } = await supabase
        .from("addon_waitlist")
        .update({ status: "canceled", closed_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
      toast.success("Removed from the waitlist.");
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to leave the waitlist");
    } finally {
      setCancelingId(null);
    }
  }

  function scopeLabel(r: WaitlistRow): string {
    if (r.addon_type === "featured") {
      return `${r.scope_type ?? "?"} = ${r.scope_value ?? "?"}`;
    }
    return `${r.geo_state ?? "?"}${r.geo_city ? "/" + r.geo_city : " (statewide)"}`;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your waitlist</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your waitlist</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-6 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
          <p className="text-sm text-slate-600">Couldn't load your waitlist entries.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!rows || rows.length === 0) {
    return null; // Hide the card entirely when there's nothing to show.
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Your waitlist</CardTitle>
        <CardDescription className="text-xs">
          Capped scopes you've opted into. We'll email you when a slot opens —
          first come, first served — or leave the queue any time.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-start justify-between gap-3 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className="font-normal capitalize text-xs">
                    {r.addon_type}
                  </Badge>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                    {scopeLabel(r)}
                  </code>
                  <Badge
                    variant="outline"
                    className={
                      r.status === "invited"
                        ? "border-blue-300 bg-blue-50 text-blue-800 text-xs"
                        : "border-amber-300 bg-amber-50 text-amber-800 text-xs"
                    }
                  >
                    {r.status === "invited" ? "Invited" : "Waiting"}
                  </Badge>
                  {r.auto_invite_opt_out && (
                    <Badge
                      variant="outline"
                      className="border-slate-300 bg-slate-50 text-slate-700 text-xs gap-1"
                    >
                      <BellOff className="h-3 w-3" aria-hidden />
                      manual outreach
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-600">
                  {r.facilities?.name ?? "—"} ·{" "}
                  joined {new Date(r.requested_at).toLocaleDateString()}
                  {r.invited_at && (
                    <>
                      {" "}· invited{" "}
                      {new Date(r.invited_at).toLocaleDateString()}
                    </>
                  )}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => cancel(r.id)}
                disabled={cancelingId === r.id}
              >
                {cancelingId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Leave
              </Button>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
