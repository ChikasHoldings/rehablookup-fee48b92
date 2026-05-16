import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Sparkles, Settings2, ArrowRight, CreditCard } from "lucide-react";
import { Link } from "react-router-dom";
import {
  fmtMoney,
  tierComboLabel,
  TIER_PRICING,
} from "@/lib/billingPricing";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface CurrentPlanCardProps {
  subscription: FacilitySubscriptionRow | null;
  /** Open the multi-step upgrade modal. */
  onUpgradeClick: () => void;
  /** Open the Stripe billing portal (payment method, invoices). */
  onManageBillingClick: () => void;
  managingPortal?: boolean;
}

/**
 * Top-of-page summary card for /provider/billing.
 *
 * Free state: shows "you're on Free" + bulleted benefits + Upgrade CTA.
 * Pro state:  shows tier combo, interval pill, add-on chips, next-charge
 *             line, savings line (annual only), Upgrade / Manage buttons.
 */
export function CurrentPlanCard({
  subscription,
  onUpgradeClick,
  onManageBillingClick,
  managingPortal,
}: CurrentPlanCardProps) {
  const isPro = subscription?.tier === "pro" && subscription?.status === "active";

  if (!isPro) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            You're on the Free plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-2 text-sm text-slate-700">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              Listing visible in the directory
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              Edit description, treatments, hours, logo, up to 5 photos
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              SAMHSA-listed contact shown publicly (unverified label)
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
              Inquiries route to RehabLookup's concierge first
            </li>
          </ul>
          <Button onClick={onUpgradeClick} className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]">
            <Sparkles className="h-4 w-4" />
            Upgrade to Pro
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  const interval = subscription.billing_period;
  const intervalLabel = interval === "annual" ? "Annual — saving 15%" : "Monthly";
  const nextChargeDateStr = subscription.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString("en-US", {
        month: "long", day: "numeric", year: "numeric",
      })
    : "—";
  const nextChargeAmount = fmtMoney(subscription.paid_amount_cents);
  const nextChargeLine = interval === "annual"
    ? `Renews ${nextChargeDateStr} — ${nextChargeAmount}`
    : `Next charge: ${nextChargeDateStr} — ${nextChargeAmount}`;

  // For annual: compute "You saved $X" from the discount_applied column,
  // falling back to a derived value when the column is null (legacy rows).
  let savingsLine: string | null = null;
  if (interval === "annual") {
    const savedCents = subscription.discount_applied_cents ?? (
      (subscription.has_featured ? TIER_PRICING.featured.fullAnnualCents - TIER_PRICING.featured.annualCents : 0) +
      (subscription.has_concierge_partner ? TIER_PRICING.concierge.fullAnnualCents - TIER_PRICING.concierge.annualCents : 0) +
      (TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents)
    );
    savingsLine = `You saved ${fmtMoney(savedCents)} with annual billing.`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-[#1B365D]" />
          Current plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge className="bg-[#1B365D] hover:bg-[#1B365D] text-base px-3 py-1">
            {tierComboLabel(subscription)}
          </Badge>
          <Badge variant="secondary" className="font-medium">
            {intervalLabel}
          </Badge>
          {subscription.has_featured && (
            <Badge variant="outline" className="border-amber-400 text-amber-800 bg-amber-50">
              Featured add-on
            </Badge>
          )}
          {subscription.has_concierge_partner && (
            <Badge variant="outline" className="border-violet-400 text-violet-800 bg-violet-50">
              Concierge Partner
            </Badge>
          )}
          {subscription.cancel_at_period_end && (
            <Badge variant="destructive">Cancels at period end</Badge>
          )}
        </div>

        <div className="space-y-1 text-sm">
          <p className="text-slate-700">{nextChargeLine}</p>
          {savingsLine && <p className="text-emerald-700 font-medium">{savingsLine}</p>}
        </div>

        <div className="flex flex-wrap gap-3 pt-2 border-t">
          <Button onClick={onUpgradeClick} className="gap-2 bg-[#1B365D] hover:bg-[#142a4a]">
            <Sparkles className="h-4 w-4" />
            Upgrade plan
          </Button>
          <Button
            onClick={onManageBillingClick}
            disabled={managingPortal || !subscription.stripe_customer_id}
            variant="outline"
            className="gap-2"
          >
            <Settings2 className="h-4 w-4" />
            {managingPortal ? "Opening…" : "Payment method & invoices"}
          </Button>
          <Button asChild variant="ghost" className="gap-2">
            <Link to="/provider/billing/cancel">
              Cancel
            </Link>
          </Button>
        </div>

        {subscription.has_featured && (
          <p className="text-xs text-slate-500">
            <Link to="/provider/billing/placements" className="underline">
              Manage your Featured placements →
            </Link>
          </p>
        )}
        {subscription.has_concierge_partner && (
          <p className="text-xs text-slate-500">
            <Link to="/provider/billing/concierge" className="underline">
              Manage your Concierge Partner geos →
            </Link>
          </p>
        )}
      </CardContent>
    </Card>
  );
}
