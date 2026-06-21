import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Rotate3D, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import { toast } from "sonner";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import { useActivePromotion } from "@/hooks/useActivePromotion";
import { PromoCountdownBanner } from "@/components/provider/promo/PromoCountdownBanner";
import { useFacilityRole } from "@/hooks/useFacilityRole";

interface FeaturedMarketingDetailProps {
  facilityId: string;
}

/**
 * Marketing copy + purchase CTAs for /provider/marketing/featured when
 * the facility doesn't yet have Featured active.
 *
 * The CTAs route through create-checkout-session in 'add_addon' intent.
 * Stripe Checkout is intentionally slot-agnostic: we send the user to
 * Stripe with no specific slots, the webhook activates the subscription
 * on payment, and slot selection happens in `FeaturedManagementPanel`
 * via `AddFeaturedPlacementForm` (live availability + waitlist). This
 * split keeps slot inventory honest — slots can fill while the user is
 * mid-checkout, so picking them post-payment from currently-available
 * inventory is the correct order.
 */
export function FeaturedMarketingDetail({ facilityId }: FeaturedMarketingDetailProps) {
  const [submittingInterval, setSubmittingInterval] = useState<"monthly" | "annual" | null>(null);
  const { promo } = useActivePromotion(facilityId);
  const featuredPromoId = promo?.target_product === "featured" ? promo.id : null;
  // Add-on purchases are owner-only (create-checkout-session returns NOT_OWNER
  // for anyone else). Hide the CTAs for a resolved non-owner team member so
  // they don't hit a 403; gating on the resolved role (not !isOwner) avoids
  // hiding the CTAs from the real owner while the role RPC is in flight.
  const { role } = useFacilityRole(facilityId);
  const isNonOwnerMember = role === "manager" || role === "viewer";

  const handlePurchase = async (interval: "monthly" | "annual") => {
    setSubmittingInterval(interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          facility_id: facilityId,
          intent: "add_addon",
          billing_period: interval,
          items: [{ product: "featured" }],
          ...(featuredPromoId ? { promo_id: featuredPromoId } : {}),
        },
      });
      if (error) throw new Error((await readFunctionError(error)) ?? "Couldn't start checkout. Please check your connection and try again.");
      if (data?.error || !data?.url) {
        throw new Error(data?.error ?? "Checkout URL missing");
      }
      const url = new URL(data.url);
      if (!url.hostname.endsWith("stripe.com")) {
        throw new Error("Invalid checkout URL");
      }
      window.location.assign(data.url);
    } catch (err) {
      console.error("[FeaturedMarketingDetail] checkout failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setSubmittingInterval(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8 space-y-6">
        <PromoCountdownBanner facilityId={facilityId} targets={["featured"]} />
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <Rotate3D className="h-6 w-6 text-amber-700" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Featured Placements — phone-rotation on the local pages for your area
            </h2>
          </div>
        </div>

        <div className="space-y-4 text-sm md:text-base text-slate-700 leading-relaxed">
          <p>
            Featured gets your facility into a fair rotation pool on the pages
            for <strong>your own area</strong> — your state, city, and near-me
            pages, plus the treatment-type and insurance pages you match — so
            nearby seekers see you first. Every paying facility in a geo rotates
            through the visible slots — no bidding wars, no per-click charges.
            <em> For national + homepage exposure, upgrade to Concierge Partner.</em>
          </p>
          <p>
            You pick which placements you want from a live availability list.
            Slot caps per geo keep rotation share meaningful — 30 per state,
            15 per major metro, 8 per smaller city, 25 per treatment-type, 5
            per insurance. When a geo fills, we open a waitlist — never
            increase prices for existing subscribers.
          </p>
          <p>
            Calls and phone clicks go directly to your facility — we never
            intermediate. This is <strong>flat-fee ad inventory</strong>, not
            pay-per-call or per-lead.
          </p>
        </div>

        {isNonOwnerMember ? (
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
            Adding Featured is limited to the facility owner. Ask your account
            owner to enable it for this location.
          </div>
        ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 pt-2 border-t border-slate-100">
          <Button
            onClick={() => handlePurchase("monthly")}
            disabled={!!submittingInterval}
            size="lg"
            className="bg-[#1B365D] hover:bg-[#142a4a] gap-2 h-auto py-4"
          >
            {submittingInterval === "monthly" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <div className="text-left">
              <div className="font-semibold">Get Featured — Monthly</div>
              <div className="text-xs opacity-80 font-normal">
                {fmtMoneyWhole(TIER_PRICING.featured.monthlyCents)}/mo · cancel anytime
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>

          <Button
            onClick={() => handlePurchase("annual")}
            disabled={!!submittingInterval}
            size="lg"
            variant="outline"
            className="border-[#1B365D] text-[#1B365D] hover:bg-[#1B365D]/5 gap-2 h-auto py-4 relative"
          >
            <span className="absolute -top-2.5 right-3 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
              Save 15%
            </span>
            {submittingInterval === "annual" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            <div className="text-left">
              <div className="font-semibold">Get Featured — Annual</div>
              <div className="text-xs opacity-80 font-normal">
                {fmtMoney(TIER_PRICING.featured.annualCents)}/yr ({fmtMoney(TIER_PRICING.featured.monthlyEquivOfAnnualCents)}/mo equivalent)
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>
        )}

        <p className="text-xs text-slate-500 leading-relaxed pt-2">
          <strong>Billed per location</strong>, separately from Pro — if you
          operate multiple facilities, add Featured to each one individually
          (each gets its own local rotation). Featured can be billed monthly OR
          annually regardless of your Pro interval; the two subscriptions renew
          independently. You'll pick specific placement slots after checkout,
          with live availability shown for each geo.
        </p>
      </CardContent>
    </Card>
  );
}
