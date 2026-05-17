import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight } from "lucide-react";
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
 */
export function DunningBanner() {
  const { data: pastDue } = useQuery({
    queryKey: ["provider-dunning-past-due"],
    queryFn: async (): Promise<PastDueRow[]> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) return [];
      const { data, error } = await supabase
        .from("facility_subscriptions")
        .select("facility_id, tier, status, current_period_end, has_featured, has_concierge_partner")
        .eq("provider_id", userId)
        .eq("status", "past_due");
      if (error) {
        console.warn("[DunningBanner] past-due lookup failed", error);
        return [];
      }
      return (data ?? []) as PastDueRow[];
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  if (!pastDue || pastDue.length === 0) return null;

  const tierLabels = pastDue
    .map((s) => {
      const parts: string[] = [];
      if (s.tier === "pro") parts.push("Pro");
      if (s.has_featured) parts.push("Featured");
      if (s.has_concierge_partner) parts.push("Concierge");
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
