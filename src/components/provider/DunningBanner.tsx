import { Link, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

interface PastDueRow {
  facility_id: string;
  tier: string | null;
  status: string;
  current_period_end: string | null;
  has_featured: boolean | null;
  has_concierge_partner: boolean | null;
}

/**
 * Self-gated banner that appears on every provider-panel page when any
 * of the provider's facility_subscriptions row is in past_due. Renders
 * nothing when the provider has no past_due rows or isn't signed in.
 *
 * The CTA routes to /provider/billing where the Stripe customer-portal
 * link lets the provider update their payment method. The webhook will
 * fire customer.subscription.updated when payment recovers and the
 * status flips back to active.
 *
 * On query failure we DO NOT silently fall through to "no banner" —
 * an unreachable DB could hide a real past-due state and the provider
 * would never know their card failed. Instead we render a smaller
 * "couldn't verify subscription status" notice so the provider sees
 * something is off, with a Refresh CTA.
 */
export function DunningBanner() {
  const location = useLocation();
  const { data: pastDue, isError, refetch } = useQuery({
    queryKey: ["provider-dunning-past-due"],
    queryFn: async (): Promise<PastDueRow[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select("facility_id, tier, status, current_period_end, has_featured, has_concierge_partner")
        .eq("provider_id", userId)
        // Include `unpaid` (past_due that exhausted Stripe retries) — it's the
        // most urgent state and was previously missed by the dunning banner.
        .in("status", ["past_due", "unpaid"]);
      if (error) {
        // Log + throw so React Query surfaces isError. Returning [] here
        // would silently hide a real past_due state.
        console.error("[DunningBanner] past-due lookup failed", error);
        throw new Error(error.message || "Past-due lookup failed");
      }
      return (data ?? []) as PastDueRow[];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  // The Billing page renders its own in-page past-due card, so suppress the
  // global banner there to avoid two payment-failed notices stacking.
  if (location.pathname.startsWith("/provider/billing")) return null;

  if (isError) {
    return (
      <div className="border-b border-slate-300 bg-slate-50 px-4 py-2 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-xs text-slate-700">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-500" aria-hidden />
            <span>
              Couldn't verify subscription status. Your account may still be
              past-due — refresh to check again.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs"
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  if (!pastDue || pastDue.length === 0) return null;

  const tierLabels = pastDue
    .map((s) => {
      const parts: string[] = [];
      if (s.tier === "pro") parts.push("Pro");
      if (s.has_featured) parts.push("Featured");
      // has_concierge_partner is deliberately NOT named here: the Concierge
      // product is retired, so a past-due banner must not advertise it back to
      // the provider. Such a row still falls back to "Subscription", and the
      // amount owed is unaffected. The column is Stage-4 debt.
      return parts.length > 0 ? parts.join(" + ") : "Subscription";
    })
    .join(", ");

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2.5">
          <AlertTriangle
            className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-700"
            aria-hidden
          />
          <div>
            <p className="text-sm font-semibold text-amber-900">
              Payment failed on your {tierLabels} subscription
            </p>
            <p className="mt-0.5 text-xs text-amber-800">
              Stripe will retry automatically, but you should update your
              payment method to avoid losing your benefits.
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          className="bg-amber-700 hover:bg-amber-800 gap-1.5"
        >
          <Link to="/provider/billing">
            Update payment method
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
