import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
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
import { ArrowLeft, Loader2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSelectedFacility } from "@/contexts/SelectedFacilityContext";
import { useFacilitySubscription } from "@/hooks/useFacilitySubscription";

interface FeaturedPlacementRow {
  id: string;
  placement_type: string;
  placement_value: string;
  active: boolean;
  activated_at: string;
}

const PLACEMENT_TYPE_LABEL: Record<string, string> = {
  homepage: "Homepage",
  state: "State page",
  city: "City page",
  search: "Search",
  near_me: "Near-me",
  treatment: "Treatment-type page",
  insurance: "Insurance page",
  article: "Article rotation",
};

/**
 * /provider/billing/placements — Featured slot management.
 * Pro + Featured subscribers only.
 *
 * MVP: list active placements + remove-one action. The "Add placement"
 * flow (live slot availability via get_placement_availability,
 * eligibility filtering by facility state/city/treatments) is wired up
 * in a follow-up PR — that needs the placement-availability RPC + slot
 * selector modal. For now, providers see what they have and can free
 * slots; new slots are bought through the upgrade flow.
 */
export default function BillingPlacements() {
  const { selectedFacility } = useSelectedFacility();
  const facilityId = selectedFacility?.id;
  const queryClient = useQueryClient();
  const { data: subscription, isLoading: subLoading } = useFacilitySubscription(facilityId);

  const [confirmRemove, setConfirmRemove] = useState<FeaturedPlacementRow | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data: placements, isLoading: placementsLoading } = useQuery({
    queryKey: ["featured-placements", subscription?.id],
    queryFn: async (): Promise<FeaturedPlacementRow[]> => {
      if (!subscription?.id) return [];
      const { data, error } = await supabase
        .from("featured_placements")
        .select("id, placement_type, placement_value, active, activated_at")
        .eq("subscription_id", subscription.id)
        .eq("active", true)
        .order("activated_at", { ascending: false });
      if (error) {
        console.error("[BillingPlacements] fetch failed", error);
        return [];
      }
      return (data as FeaturedPlacementRow[]) ?? [];
    },
    enabled: !!subscription?.id,
    staleTime: 1000 * 30,
  });

  const periodEndStr = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "your period end";

  const handleRemove = async () => {
    if (!confirmRemove) return;
    setRemoving(true);
    try {
      const { error } = await supabase
        .from("featured_placements")
        .update({ active: false, deactivated_at: new Date().toISOString() })
        .eq("id", confirmRemove.id);
      if (error) throw error;
      toast.success(
        `Slot removed. You can re-claim before ${periodEndStr} at no additional charge.`,
      );
      setConfirmRemove(null);
      queryClient.invalidateQueries({ queryKey: ["featured-placements", subscription?.id] });
    } catch (err) {
      console.error("[BillingPlacements] remove failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove slot");
    } finally {
      setRemoving(false);
    }
  };

  if (subLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Skeleton className="h-12 w-2/3 mb-6" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Gate: must be Pro + Featured.
  if (
    !subscription ||
    subscription.status !== "active" ||
    subscription.tier !== "pro" ||
    !subscription.has_featured
  ) {
    return <Navigate to="/provider/billing" replace />;
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl space-y-6">
      <Helmet>
        <title>Manage Featured placements | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div>
        <Button variant="ghost" size="sm" className="gap-1.5" asChild>
          <Link to="/provider/billing">
            <ArrowLeft className="h-4 w-4" />
            Back to billing
          </Link>
        </Button>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mt-2">
          Your Featured placements
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paid through {periodEndStr}
          {subscription.billing_period === "monthly" ? " (monthly)" : " (annual)"}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active placements</CardTitle>
        </CardHeader>
        <CardContent>
          {placementsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : !placements || placements.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-medium text-slate-900">
                You have no active Featured placements yet.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Pick state, city, treatment, or insurance pages to rotate on.
              </p>
              <Button asChild className="mt-4 bg-[#1B365D] hover:bg-[#142a4a]">
                <Link to="/provider/billing">Choose placements</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-4 md:mx-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-slate-200">
                    <th className="px-4 py-2 font-medium text-slate-700">Type</th>
                    <th className="px-4 py-2 font-medium text-slate-700">Value</th>
                    <th className="px-4 py-2 font-medium text-slate-700">Activated</th>
                    <th className="px-4 py-2 font-medium text-slate-700 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {placements.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="font-normal">
                          {PLACEMENT_TYPE_LABEL[p.placement_type] ?? p.placement_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {p.placement_value}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {new Date(p.activated_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmRemove(p)}
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
        <strong>Removing a slot does not refund.</strong> The slot is paid through{" "}
        {periodEndStr}; removing opens it for another facility immediately. You can
        re-claim before {periodEndStr} at no additional charge. After that date, you
        must re-purchase to claim the slot again.
      </p>

      <AlertDialog open={!!confirmRemove} onOpenChange={(open) => !open && setConfirmRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this Featured slot?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm space-y-2">
              <span className="block">
                Removing the {confirmRemove?.placement_type} placement on{" "}
                <strong>{confirmRemove?.placement_value}</strong> opens this slot
                for another facility immediately.
              </span>
              <span className="block">
                No refund — the slot is paid through {periodEndStr}. You can
                re-claim before that date at no additional charge.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Keep slot</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRemove();
              }}
              disabled={removing}
              className="bg-destructive hover:bg-destructive/90 gap-2"
            >
              {removing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Remove slot
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
