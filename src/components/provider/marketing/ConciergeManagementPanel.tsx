import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Loader2, X, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddConciergeGeoForm } from "@/components/provider/concierge/AddConciergeGeoForm";
import { ConciergePlacementHistory } from "@/components/provider/concierge/ConciergePlacementHistory";
import { MyWaitlistEntries } from "@/components/provider/MyWaitlistEntries";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface ConciergeGeoRow {
  id: string;
  geo_state: string;
  geo_city: string | null;
  level_of_care: string[];
  active: boolean;
  activated_at: string;
}

interface ConciergeManagementPanelProps {
  facilityId: string;
  subscription: FacilitySubscriptionRow;
}

/**
 * The Concierge-add-on management surface inside the Marketing Hub.
 * Renders only for facilities with an active Concierge subscription —
 * upstream `MarketingConcierge` is responsible for gating + showing
 * the purchase pitch when the add-on is not yet active.
 *
 * Contents:
 *   • EKRA-compliance reminder card (flat-fee, never per-admission)
 *   • Active geo table with per-row remove confirmation
 *   • Add-geography form (live cap check + LoC picker)
 *   • Waitlist entries (geos the provider is queued for)
 */
export function ConciergeManagementPanel({ facilityId, subscription }: ConciergeManagementPanelProps) {
  const queryClient = useQueryClient();

  const [confirmRemove, setConfirmRemove] = useState<ConciergeGeoRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data: geos, isLoading: geosLoading } = useQuery({
    queryKey: ["concierge-geos", subscription.id],
    queryFn: async (): Promise<ConciergeGeoRow[]> => {
      const { data, error } = await supabase
        .from("concierge_partner_facilities")
        .select("id, geo_state, geo_city, level_of_care, active, activated_at")
        .eq("subscription_id", subscription.id)
        .eq("active", true)
        .order("activated_at", { ascending: false });
      if (error) {
        console.error("[ConciergeManagement] fetch failed", error);
        return [];
      }
      return (data as ConciergeGeoRow[]) ?? [];
    },
    staleTime: 1000 * 30,
  });

  const periodEndStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "your period end";

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      const { error } = await supabase
        .from("concierge_partner_facilities")
        .update({ active: false, deactivated_at: new Date().toISOString() })
        .eq("id", confirmRemove.id);
      if (error) throw error;
      toast.success(`Geo removed. Re-claim before ${periodEndStr} at no additional charge.`);
      setConfirmRemove(null);
      queryClient.invalidateQueries({ queryKey: ["concierge-geos", subscription.id] });
    } catch (err) {
      console.error("[ConciergeManagement] remove failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove geo");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-violet-200 bg-violet-50/40">
        <CardContent className="p-5 flex gap-3">
          <ShieldCheck className="h-5 w-5 mt-0.5 shrink-0 text-violet-700" aria-hidden />
          <div className="text-sm leading-relaxed text-slate-800">
            <p className="font-semibold text-slate-900 mb-1">EKRA-compliant by design</p>
            <p>
              Concierge Partner is a flat subscription fee for prominent surfacing
              by our human advisors — never per-call, per-lead, or per-admission.
              Our advisors always present at least two non-partner alternatives
              alongside any partner facilities. Calls go direct to your admissions
              line.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Active geographies</CardTitle>
          <AddConciergeGeoForm
            facilityId={facilityId}
            subscriptionId={subscription.id}
            onAdded={() =>
              queryClient.invalidateQueries({
                queryKey: ["concierge-geos", subscription.id],
              })
            }
          />
        </CardHeader>
        <CardContent>
          {geosLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !geos || geos.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-medium text-slate-900">
                You have no active Concierge Partner geos yet.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Use "Add a geography" above to pick a state, city, and the
                levels of care you want advisors to surface you for.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="px-4 py-2 font-medium text-slate-700">Geography</th>
                    <th className="px-4 py-2 font-medium text-slate-700">Levels of care</th>
                    <th className="px-4 py-2 font-medium text-slate-700">Activated</th>
                    <th className="px-4 py-2 font-medium text-slate-700 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {geos.map((g) => (
                    <tr key={g.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">
                          {g.geo_city ? `${g.geo_city}, ${g.geo_state}` : g.geo_state}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {g.level_of_care.map((loc) => (
                            <Badge key={loc} variant="outline" className="font-normal text-xs">
                              {loc}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(g.activated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmRemove(g)}
                          aria-label={`Remove ${g.geo_city ? g.geo_city + ", " : ""}${g.geo_state}`}
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500 leading-relaxed">
        <strong>Removing a geo does not refund.</strong> The geo is paid through{" "}
        {periodEndStr}; removing opens the slot for another facility immediately.
        You can re-claim before {periodEndStr} at no additional charge.
      </p>

      <ConciergePlacementHistory facilityId={facilityId} />

      <MyWaitlistEntries facilityId={facilityId} addonType="concierge" />

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this Concierge Partner geo?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm">
              Removing{" "}
              <strong>
                {confirmRemove?.geo_city
                  ? `${confirmRemove.geo_city}, ${confirmRemove.geo_state}`
                  : confirmRemove?.geo_state}
              </strong>
              {" "}opens this slot for another facility immediately. No refund — the
              geo is paid through {periodEndStr}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep geo</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Remove geo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
