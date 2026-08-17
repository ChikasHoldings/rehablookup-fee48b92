import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Megaphone, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import {
  FEATURED_DIRECTORY_NOTE,
  PRO_DIRECTORY_BENEFITS,
  PRO_DIRECTORY_TRUST_NOTE,
} from "@/lib/proDirectoryBenefits";

interface ProUpgradeChoicesProps {
  onChoose: (interval: "monthly" | "annual") => void;
  /** Which interval is currently launching checkout, if any. Disables both
   *  buttons to prevent a double-click opening two checkout sessions. */
  busy?: "monthly" | "annual" | null;
}

function ProFeatureList() {
  return (
    <ul className="space-y-2 text-sm text-slate-700">
      {PRO_DIRECTORY_BENEFITS.map((feature) => (
        <li key={feature.key} className="flex items-start gap-2">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
          <span>
            <strong className="font-medium text-slate-900">{feature.title}</strong>
            <span className="block text-xs leading-relaxed text-slate-500">
              {feature.description}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Two side-by-side Pro upgrade cards: Pro Monthly + Pro Annual.
 *
 * Directory-model contract:
 * - Pro sells richer presentation, direct contact, media, and multi-location tools.
 * - Verification and organic directory position are never Pro entitlements.
 * - Featured is a separate advertising product and has no Pro precondition.
 */
export function ProUpgradeChoices({ onChoose, busy = null }: ProUpgradeChoicesProps) {
  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
            Make your listing easier to choose and contact
          </h2>
          <Badge variant="secondary" className="text-[11px] font-medium">
            Pro listing features
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Upgrade the public profile families and professionals see. Monthly and annual include the same Pro features.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="transition-shadow hover:shadow-md">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-base font-semibold text-slate-900">Pro — Monthly</p>
              <p className="text-xs text-slate-500">Most flexible. Cancel anytime.</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoneyWhole(TIER_PRICING.pro.monthlyCents)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-500">billed monthly</p>
            </div>
            <ProFeatureList />
            <Button
              onClick={() => onChoose("monthly")}
              disabled={busy !== null}
              className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
            >
              {busy === "monthly" ? "Redirecting…" : "Choose Pro Monthly"}
            </Button>
          </CardContent>
        </Card>

        <Card className="relative ring-1 ring-[#1B365D]/20 transition-shadow hover:shadow-md">
          <Badge className="absolute -top-2 right-4 bg-[#CDA223] text-[#1B365D] hover:bg-[#CDA223]">
            Save 15%
          </Badge>
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-base font-semibold text-slate-900">Pro — Annual</p>
              <p className="text-xs text-slate-500">
                Commit to the year, save{" "}
                {fmtMoney(TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents)}.
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold text-[#1B365D]">
                {fmtMoney(TIER_PRICING.pro.annualCents)}
                <span className="text-sm font-normal text-slate-500">/yr</span>
              </p>
              <p className="mt-0.5 text-xs text-emerald-700">
                {fmtMoney(TIER_PRICING.pro.monthlyEquivOfAnnualCents)}/mo equivalent
              </p>
            </div>
            <ProFeatureList />
            <Button
              onClick={() => onChoose("annual")}
              disabled={busy !== null}
              className="w-full bg-[#1B365D] hover:bg-[#142a4a]"
            >
              {busy === "annual" ? "Redirecting…" : "Choose Pro Annual"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-3 rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-600 sm:grid-cols-2">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <p className="leading-relaxed">{PRO_DIRECTORY_TRUST_NOTE}</p>
        </div>
        <div className="flex items-start gap-2">
          <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-[#1B365D]" aria-hidden />
          <p className="leading-relaxed">
            {FEATURED_DIRECTORY_NOTE}{" "}
            <Link
              to="/provider/marketing"
              className="font-semibold text-[#1B365D] underline underline-offset-2"
            >
              View Featured
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
