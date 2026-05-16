import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  BillingIntervalToggle,
  type BillingInterval,
} from "./BillingIntervalToggle";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface PlanComparisonGridProps {
  subscription: FacilitySubscriptionRow | null;
  interval: BillingInterval;
  onIntervalChange: (next: BillingInterval) => void;
  onUpgrade: (target: "pro" | "featured" | "concierge") => void;
}

/**
 * Compact 4-column plan grid with a billing-interval toggle. Re-renders
 * prices when the toggle flips. CTAs adapt to current subscription
 * state — Active chips on the current tier, disabled "Requires Pro"
 * on the add-on cards when not subbed.
 */
export function PlanComparisonGrid({
  subscription,
  interval,
  onIntervalChange,
  onUpgrade,
}: PlanComparisonGridProps) {
  const isPro = subscription?.tier === "pro" && subscription?.status === "active";
  const hasFeatured = !!subscription?.has_featured;
  const hasConcierge = !!subscription?.has_concierge_partner;

  const proPrice = interval === "monthly" ? TIER_PRICING.pro.monthlyCents : TIER_PRICING.pro.annualCents;
  const featuredPrice = interval === "monthly" ? TIER_PRICING.featured.monthlyCents : TIER_PRICING.featured.annualCents;
  const conciergePrice = interval === "monthly" ? TIER_PRICING.concierge.monthlyCents : TIER_PRICING.concierge.annualCents;

  const intervalSuffix = interval === "monthly" ? "/mo" : "/yr";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Plans &amp; add-ons</h2>
          <p className="text-sm text-slate-600">
            Monthly is flexible — cancel anytime. Annual locks in your rate and saves 15%.
          </p>
        </div>
        <BillingIntervalToggle value={interval} onChange={onIntervalChange} />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Pro */}
        <Card className={cn(isPro && "ring-1 ring-[#1B365D]/40")}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">Pro</p>
              {isPro && <Badge variant="secondary">Active</Badge>}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoneyWhole(proPrice)}
                <span className="text-sm font-normal text-slate-500">{intervalSuffix}</span>
              </p>
              {interval === "annual" && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  {fmtMoney(TIER_PRICING.pro.monthlyEquivOfAnnualCents)}/mo equivalent — save 15%
                </p>
              )}
            </div>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>Verified badge</li>
              <li>Direct line shown publicly</li>
              <li>Inquiries deliver to your inbox</li>
              <li>10 photos + 1 video</li>
              <li>Respond to reviews</li>
            </ul>
            {isPro ? (
              <Button variant="outline" className="w-full" disabled>
                Currently on Pro
              </Button>
            ) : (
              <Button
                onClick={() => onUpgrade("pro")}
                className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
              >
                Upgrade to Pro {interval === "monthly" ? "Monthly" : "Annual"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Featured */}
        <Card className={cn(hasFeatured && "ring-1 ring-amber-400/60")}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">+ Featured</p>
              {hasFeatured && <Badge variant="secondary">Active</Badge>}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoneyWhole(featuredPrice)}
                <span className="text-sm font-normal text-slate-500">{intervalSuffix}</span>
              </p>
              {interval === "annual" && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  {fmtMoney(TIER_PRICING.featured.monthlyEquivOfAnnualCents)}/mo equivalent — save 15%
                </p>
              )}
            </div>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>Phone-rotation placements</li>
              <li>State / city / treatment / insurance pages</li>
              <li>Capped per geo for fairness</li>
            </ul>
            {hasFeatured ? (
              <Button variant="outline" className="w-full" disabled>
                Active add-on
              </Button>
            ) : (
              <Button
                onClick={() => onUpgrade("featured")}
                disabled={!isPro}
                className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
                title={!isPro ? "Requires Pro" : undefined}
              >
                {isPro ? "Add Featured" : "Requires Pro"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Concierge */}
        <Card className={cn(hasConcierge && "ring-1 ring-violet-400/60")}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-slate-900">+ Concierge Partner</p>
              {hasConcierge && <Badge variant="secondary">Active</Badge>}
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoneyWhole(conciergePrice)}
                <span className="text-sm font-normal text-slate-500">{intervalSuffix}</span>
              </p>
              {interval === "annual" && (
                <p className="text-xs text-emerald-700 mt-0.5">
                  {fmtMoney(TIER_PRICING.concierge.monthlyEquivOfAnnualCents)}/mo equivalent — save 15%
                </p>
              )}
            </div>
            <ul className="text-sm text-slate-700 space-y-1">
              <li>Surfaced by our human advisors</li>
              <li>Capped 3-5 per major city</li>
              <li>EKRA-defensive — flat fee, no per-call</li>
            </ul>
            {hasConcierge ? (
              <Button variant="outline" className="w-full" disabled>
                Active add-on
              </Button>
            ) : (
              <Button
                onClick={() => onUpgrade("concierge")}
                disabled={!isPro}
                className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
                title={!isPro ? "Requires Pro" : undefined}
              >
                {isPro ? "Add Concierge Partner" : "Requires Pro"}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
