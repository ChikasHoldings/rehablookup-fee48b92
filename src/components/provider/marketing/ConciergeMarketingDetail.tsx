import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserCheck, ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { readFunctionError } from "@/lib/functionError";
import { toast } from "sonner";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import { useActivePromotion } from "@/hooks/useActivePromotion";
import { PromoCountdownBanner } from "@/components/provider/promo/PromoCountdownBanner";

interface ConciergeMarketingDetailProps {
  facilityId: string;
}

/**
 * Marketing copy + purchase CTAs for /provider/marketing/concierge
 * when the facility doesn't yet have Concierge Partner active.
 *
 * Geo / LoC / compliance-checkbox configuration happens AFTER Stripe
 * Checkout in `ConciergeManagementPanel` via `AddConciergeGeoForm`.
 * This split is intentional: geo caps (3-5 per major city) can fill
 * while the user is mid-checkout, so picking from currently-available
 * inventory post-payment is the correct order — and the EKRA-compliance
 * acknowledgement lives alongside the geo picker where it's contextual.
 */
export function ConciergeMarketingDetail({ facilityId }: ConciergeMarketingDetailProps) {
  const [submittingInterval, setSubmittingInterval] = useState<"monthly" | "annual" | null>(null);
  const { promo } = useActivePromotion(facilityId);
  const conciergePromoId = promo?.target_product === "concierge" ? promo.id : null;

  const handlePurchase = async (interval: "monthly" | "annual") => {
    setSubmittingInterval(interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          facility_id: facilityId,
          intent: "add_addon",
          billing_period: interval,
          items: [{ product: "concierge" }],
          ...(conciergePromoId ? { promo_id: conciergePromoId } : {}),
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
      console.error("[ConciergeMarketingDetail] checkout failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to start checkout");
      setSubmittingInterval(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 md:p-8 space-y-6">
        <PromoCountdownBanner facilityId={facilityId} targets={["concierge"]} />
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
            <UserCheck className="h-6 w-6 text-violet-700" aria-hidden />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-900">
              Concierge Partner — the upgrade: national + international exposure, plus advisor surfacing
            </h2>
          </div>
        </div>

        <div className="space-y-4 text-sm md:text-base text-slate-700 leading-relaxed">
          <p>
            Concierge Partner is the <strong>upgrade to Featured</strong>. You
            get everything Featured does — rotation on your own state and city
            pages — <strong>plus</strong> national reach the local tier doesn't
            include. It replaces an active Featured add-on, so you're never
            charged for both.
          </p>

          <div className="rounded-lg bg-violet-50/60 border border-violet-200/60 p-4">
            <p className="font-semibold text-slate-900 mb-2">
              Everything Featured, plus national reach
            </p>
            <ul className="space-y-1.5 text-sm text-slate-700 list-disc list-inside marker:text-violet-700">
              <li>Rotation on our <strong>national homepage</strong></li>
              <li>Exposure on our <strong>international pages</strong> (seekers from the UK, Canada, UAE, Europe, and Australia)</li>
              <li>Your home state &amp; city, <strong>plus any extra states or cities you pick</strong></li>
              <li>A verified-partner badge in our advisors' tool when seekers match your geography and level of care</li>
            </ul>
          </div>

          <p>
            When clients call our concierge, our advisors match them by clinical
            criteria — insurance, level of care, geography, gender, language —
            <strong> never by who paid us</strong>. Among matched facilities,
            Concierge Partners get a visual badge in our advisors' tool so the
            advisor naturally mentions you:{" "}
            <em className="text-slate-900">
              "X is one of our Placement Partners — they've been verified and
              have committed to 24-hour response times."
            </em>
          </p>

          <div className="rounded-lg bg-violet-50/60 border border-violet-200/60 p-4">
            <p className="font-semibold text-slate-900 flex items-center gap-2 mb-2">
              <ShieldCheck className="h-4 w-4 text-violet-700" aria-hidden />
              Two rules we hold to
            </p>
            <ol className="space-y-2 text-sm text-slate-700 list-decimal list-inside marker:font-semibold marker:text-violet-700">
              <li>
                We always present <strong>at least 2 non-partner alternatives</strong>{" "}
                alongside any partner facilities. Clients always choose which
                facility to call.
              </li>
              <li>
                Calls go directly to your admissions line. We never intermediate
                or charge per call.
              </li>
            </ol>
          </div>

          <p>
            Concierge Partner is capped at <strong>3-5 facilities per major city</strong>{" "}
            and 1-3 per smaller cities. When your city fills, we open a waitlist.
            We pay our advisors on salary, <strong>not commission</strong>.
          </p>

          <p className="text-xs text-slate-500 italic">
            Flat monthly or annual subscription. No per-call, per-lead, or
            per-admission charges — ever.
          </p>
        </div>

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
              <div className="font-semibold">Become a Partner — Monthly</div>
              <div className="text-xs opacity-80 font-normal">
                {fmtMoneyWhole(TIER_PRICING.concierge.monthlyCents)}/mo · cancel anytime
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
              <div className="font-semibold">Become a Partner — Annual</div>
              <div className="text-xs opacity-80 font-normal">
                {fmtMoney(TIER_PRICING.concierge.annualCents)}/yr ({fmtMoney(TIER_PRICING.concierge.monthlyEquivOfAnnualCents)}/mo equivalent)
              </div>
            </div>
            <ArrowRight className="h-4 w-4 ml-auto" />
          </Button>
        </div>

        <p className="text-xs text-slate-500 leading-relaxed pt-2">
          <strong>Billed per location</strong>, separately from Pro — if you
          operate multiple facilities, add Concierge to each one individually.
          Buying Concierge for a facility that already has Featured
          automatically retires that Featured add-on, so you're never charged
          for both. You'll pick your advisor geographies and Featured
          placements after checkout; if a city's partner slots are full, you'll
          join a waitlist and we'll activate you as soon as one opens.
        </p>
      </CardContent>
    </Card>
  );
}
