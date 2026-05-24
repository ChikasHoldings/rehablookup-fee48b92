import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import { Loader2, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddFeaturedPlacementForm } from "@/components/provider/featured/AddFeaturedPlacementForm";
import { MyWaitlistEntries } from "@/components/provider/MyWaitlistEntries";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

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

interface FeaturedManagementPanelProps {
  facilityId: string;
  subscription: FacilitySubscriptionRow;
}

/**
 * The Featured-add-on management surface inside the Marketing Hub.
 * Renders only for facilities with an active Featured subscription —
 * upstream `MarketingFeatured` is responsible for gating + showing
 * the purchase pitch when Featured is not yet active.
 *
 * Contents:
 *   • Sponsored tagline editor (free text, 120 chars max)
 *   • Active placement table with per-row remove confirmation
 *   • Add-placement form (live availability + slot picker)
 *   • Waitlist entries (geos the provider is queued for)
 */
export function FeaturedManagementPanel({ facilityId, subscription }: FeaturedManagementPanelProps) {
  const queryClient = useQueryClient();

  const [confirmRemove, setConfirmRemove] = useState<FeaturedPlacementRow | null>(null);
  const [removing, setRemoving] = useState(false);

  // Sponsored tagline (Featured Strip cards). Server-side capped at
  // 120 chars by the CHECK constraint; UI enforces the same so the
  // save round-trip can't fail silently.
  const [tagline, setTagline] = useState("");
  const [taglineLoaded, setTaglineLoaded] = useState(false);
  const [taglineError, setTaglineError] = useState(false);
  const [taglineReloadKey, setTaglineReloadKey] = useState(0);
  const [savedTagline, setSavedTagline] = useState("");
  const [savingTagline, setSavingTagline] = useState(false);

  useEffect(() => {
    if (!facilityId) {
      setTaglineLoaded(false);
      return;
    }
    let cancelled = false;
    setTaglineError(false);
    setTaglineLoaded(false);
    (async () => {
      const { data, error } = await supabase
        .from("facilities")
        .select("sponsored_tagline")
        .eq("id", facilityId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        // Don't fall through to an empty editable textarea — saving from
        // it would overwrite the provider's existing paid tagline. Show a
        // retry instead.
        console.error("[FeaturedManagement] tagline load failed", error);
        setTaglineError(true);
        return;
      }
      const initial = ((data as { sponsored_tagline: string | null } | null)?.sponsored_tagline ?? "").trim();
      setTagline(initial);
      setSavedTagline(initial);
      setTaglineLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, taglineReloadKey]);

  const handleSaveTagline = async () => {
    if (!facilityId) return;
    const next = tagline.trim();
    if (next.length > 120) {
      toast.error("Tagline must be 120 characters or fewer.");
      return;
    }
    setSavingTagline(true);
    try {
      const { error } = await supabase
        .from("facilities")
        .update({ sponsored_tagline: next.length === 0 ? null : next })
        .eq("id", facilityId);
      if (error) throw error;
      setSavedTagline(next);
      toast.success(
        next.length === 0
          ? "Tagline cleared — strip cards will use the auto-generated version."
          : "Tagline updated. Featured Strip cards will refresh within 5 minutes.",
      );
    } catch (err) {
      console.error("[FeaturedManagement] tagline save failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to save tagline");
    } finally {
      setSavingTagline(false);
    }
  };

  const taglineDirty = tagline.trim() !== savedTagline.trim();
  const taglineOverLimit = tagline.length > 120;

  const {
    data: placements,
    isLoading: placementsLoading,
    isError: placementsError,
    refetch: refetchPlacements,
  } = useQuery({
    queryKey: ["featured-placements", subscription.id],
    queryFn: async (): Promise<FeaturedPlacementRow[]> => {
      const { data, error } = await supabase
        .from("featured_placements")
        .select("id, placement_type, placement_value, active, activated_at")
        .eq("subscription_id", subscription.id)
        .eq("active", true)
        .order("activated_at", { ascending: false });
      // Surface the failure so a paying provider sees a retry — not a
      // false "no active placements" empty state.
      if (error) {
        console.error("[FeaturedManagement] fetch failed", error);
        throw error;
      }
      return (data as FeaturedPlacementRow[]) ?? [];
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
        .from("featured_placements")
        .update({ active: false, deactivated_at: new Date().toISOString() })
        .eq("id", confirmRemove.id);
      if (error) throw error;
      toast.success(
        `Slot removed. You can re-claim before ${periodEndStr} at no additional charge.`,
      );
      setConfirmRemove(null);
      queryClient.invalidateQueries({ queryKey: ["featured-placements", subscription.id] });
    } catch (err) {
      console.error("[FeaturedManagement] remove failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to remove slot");
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sponsored tagline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-600">
            Shown on your Featured Strip cards. 120 character max. Leave
            blank to use an auto-generated tagline from your services and
            insurance.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="sponsored-tagline" className="sr-only">
              Sponsored tagline
            </Label>
            {taglineError ? (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden />
                  Couldn't load your saved tagline.
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTaglineReloadKey((k) => k + 1)}
                >
                  Retry
                </Button>
              </div>
            ) : !taglineLoaded ? (
              <Skeleton className="h-20 w-full" />
            ) : (
              <Textarea
                id="sponsored-tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                maxLength={140}
                rows={3}
                placeholder="e.g., 24-hour admissions. Detox + IOP. Insurance verified in 30 minutes."
                className="resize-none"
              />
            )}
            {!taglineError && (
              <div className="flex items-center justify-between text-xs">
                <span
                  className={taglineOverLimit ? "text-destructive" : "text-slate-500"}
                >
                  {tagline.length} / 120
                </span>
                <Button
                  size="sm"
                  onClick={handleSaveTagline}
                  disabled={
                    savingTagline ||
                    !taglineLoaded ||
                    !taglineDirty ||
                    taglineOverLimit
                  }
                  className="bg-[#1B365D] hover:bg-[#142a4a] gap-1.5"
                >
                  {savingTagline ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  {savingTagline ? "Saving…" : "Save tagline"}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Active placements</CardTitle>
          <AddFeaturedPlacementForm
            facilityId={facilityId}
            subscriptionId={subscription.id}
            onAdded={() =>
              queryClient.invalidateQueries({
                queryKey: ["featured-placements", subscription.id],
              })
            }
          />
        </CardHeader>
        <CardContent>
          {placementsLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : placementsError ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <AlertCircle className="h-6 w-6 text-destructive" aria-hidden />
              <p className="text-sm text-slate-600">
                Couldn't load your active placements.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetchPlacements()}>
                Retry
              </Button>
            </div>
          ) : !placements || placements.length === 0 ? (
            <div className="text-center py-8">
              <p className="font-medium text-slate-900">
                You have no active Featured placements yet.
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Use "Add a placement" above to pick state, city, treatment, or
                insurance pages to rotate on.
              </p>
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
                          aria-label={`Remove ${p.placement_type} placement on ${p.placement_value}`}
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

      <MyWaitlistEntries facilityId={facilityId} addonType="featured" />

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
