import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";

interface ProUpgradeChoicesProps {
  onChoose: (interval: "monthly" | "annual") => void;
}

const PRO_FEATURES = [
  "Verified badge",
  "Direct contact info shown publicly",
  "10 photos + 1 video",
  "Inquiries delivered to your inbox",
  "Respond to reviews",
  "Priority search ranking",
];

/**
 * Two side-by-side Pro upgrade cards: Pro Monthly + Pro Annual.
 *
 * STRUCTURAL RULE: this component renders ONLY the two Pro options.
 * Featured and Concierge are NEVER mentioned here — those are a
 * separate product category. The only allowed reference to them is
 * the helper-text link below the cards pointing to /provider/marketing.
 */
export function ProUpgradeChoices({ onChoose }: ProUpgradeChoicesProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-900">
          Choose your Pro plan
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Same features. Pick monthly for flexibility or annual to save 15%.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Pro Monthly */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="font-semibold text-slate-900 text-base">
                Pro — Monthly
              </p>
              <p className="text-xs text-slate-500">Most flexible. Cancel anytime.</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <p className="text-xs text-slate-500 mt-0.5">billed monthly</p>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onChoose("monthly")}
              className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
            >
              Choose Pro Monthly
            </Button>
          </CardContent>
        </Card>

        {/* Pro Annual */}
        <Card className="hover:shadow-md transition-shadow ring-1 ring-[#1B365D]/20 relative">
          <Badge className="absolute -top-2 right-4 bg-[#CDA223] hover:bg-[#CDA223] text-[#1B365D]">
            Save 15%
          </Badge>
          <CardContent className="p-5 space-y-3">
            <div>
              <p className="font-semibold text-slate-900 text-base">
                Pro — Annual
              </p>
              <p className="text-xs text-slate-500">Commit to the year, save $178.20.</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoney(TIER_PRICING.pro.annualCents)}
                <span className="text-sm font-normal text-slate-500">/yr</span>
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                {fmtMoney(TIER_PRICING.pro.monthlyEquivOfAnnualCents)}/mo equivalent
              </p>
            </div>
            <ul className="space-y-1.5 text-sm text-slate-700">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Button
              onClick={() => onChoose("annual")}
              className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
            >
              Choose Pro Annual
            </Button>
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-slate-500 leading-relaxed pt-2 border-t border-slate-100">
        Looking for marketing options like Featured placements or Concierge
        Partner? Those are available after upgrading to Pro, under{" "}
        <Link to="/provider/marketing" className="font-medium text-[#1B365D] underline underline-offset-2">
          Marketing
        </Link>{" "}
        in your dashboard.
      </p>
    </div>
  );
}
