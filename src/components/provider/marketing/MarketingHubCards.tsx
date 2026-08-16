import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { Rotate3D, ArrowRight, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface MarketingHubCardsProps {
  subscription: FacilitySubscriptionRow;
}

/**
 * The add-on product card shown on /provider/marketing for Pro users.
 * Featured is the only visibility add-on RehabLookup sells. The card
 * surfaces:
 *   • ACTIVE state: live count of active placements + Manage CTA
 *   • NOT ACTIVE state: pricing + Get CTA
 *
 * The Concierge Partner card was removed in the Stage-3 directory cutover —
 * RehabLookup is a directory, not a placement or advisor service, so there is
 * no advisor-matching product to sell. See
 * docs/directory-cutover-stage-03-provider-admin.md.
 */
export function MarketingHubCards({ subscription }: MarketingHubCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5">
      <FeaturedCard active={!!subscription.has_featured} subscriptionId={subscription.id} />
    </div>
  );
}

function useActivePlacementCount(subscriptionId: string, active: boolean) {
  return useQuery({
    queryKey: ["marketing-hub-featured-count", subscriptionId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("featured_placements")
        .select("id", { count: "exact", head: true })
        .eq("subscription_id", subscriptionId)
        .eq("active", true);
      // Surface the failure (caller renders "—") rather than a false "0",
      // which would tell a paying provider their placements vanished.
      if (error) throw error;
      return count ?? 0;
    },
    enabled: active,
    staleTime: 1000 * 30,
  });
}

function FeaturedCard({ active, subscriptionId }: { active: boolean; subscriptionId: string }) {
  const { data: count, isLoading: countLoading } = useActivePlacementCount(subscriptionId, active);
  const countLabel = countLoading || count === undefined ? "—" : count.toLocaleString();
  const pluralSuffix = count === 1 ? "" : "s";

  return (
    <Card className="border-amber-200/60 bg-gradient-to-br from-white to-amber-50/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
              <Rotate3D className="h-5 w-5 text-amber-700" aria-hidden />
            </div>
            <p className="font-semibold text-slate-900 text-base">
              Featured Placements
            </p>
          </div>
          {active && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
          )}
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">
          Phone-rotation slots on the <strong>state, city, near-me,
          treatment-type, and insurance pages for your area</strong>.{" "}
          <InfoTooltip label="How Featured rotation works">
            Every paying facility in a geo takes equal turns in the visible
            Featured spots — no bidding, no per-click charges. Slot caps per
            geography keep each facility's share meaningful. Calls go straight
            to your line; we never intermediate.
          </InfoTooltip>
        </p>

        <p className="inline-flex items-start gap-1.5 text-xs text-slate-500">
          <Building2 className="h-3.5 w-3.5 shrink-0 mt-0.5 text-slate-400" aria-hidden />
          <span>
            Billed per location, separately from Pro — each facility you operate
            needs its own Featured add-on.
          </span>
        </p>

        {active ? (
          <>
            <div className="rounded-md bg-white border border-amber-200/60 p-3 text-xs space-y-0.5">
              <p className="font-medium text-slate-900 tabular-nums">
                {countLabel} active placement{pluralSuffix}
              </p>
              <p className="text-slate-500">
                Analytics, slot picker, and tagline editor inside.
              </p>
            </div>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/provider/marketing/featured">
                Manage Featured
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-md bg-white border border-amber-200/60 p-3 text-xs space-y-1">
              <p className="font-medium text-slate-900">
                {fmtMoneyWhole(TIER_PRICING.featured.monthlyCents)}/mo · {fmtMoney(TIER_PRICING.featured.annualCents)}/yr (save 15%)
              </p>
              <p className="text-slate-500">
                Live slot availability shown in the picker.
              </p>
            </div>
            <Button asChild className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-2">
              <Link to="/provider/marketing/featured">
                Get Featured
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
