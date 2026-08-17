import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Megaphone,
  ShieldCheck,
  Phone,
  PanelsTopLeft,
  Camera,
  Building2,
  BarChart3,
} from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import {
  FEATURED_DIRECTORY_NOTE,
  PRO_BENEFIT_GROUPS,
  PRO_DIRECTORY_TRUST_NOTE,
  PRO_UPGRADE_HEADLINE,
  proBenefitsForGroup,
  type ProBenefitGroupKey,
} from "@/lib/proDirectoryBenefits";

interface ProUpgradeChoicesProps {
  onChoose: (interval: "monthly" | "annual") => void;
  /** Which interval is currently launching checkout, if any. Disables both
   *  buttons to prevent a double-click opening two checkout sessions. */
  busy?: "monthly" | "annual" | null;
}

const GROUP_ICONS: Record<ProBenefitGroupKey, React.ElementType> = {
  "direct-contact": Phone,
  "enhanced-presentation": PanelsTopLeft,
  "rich-media": Camera,
  "multi-location": Building2,
  performance: BarChart3,
};

/**
 * The outcome grid. Monthly and annual are IDENTICAL in capability, so the
 * benefits are stated once here rather than duplicated inside each price card —
 * which is also what stops the two lists from drifting apart.
 */
function ProOutcomeGrid() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {PRO_BENEFIT_GROUPS.map((group) => {
        const Icon = GROUP_ICONS[group.key];
        const items = proBenefitsForGroup(group.key).flatMap((benefit) => benefit.items);
        return (
          <div
            key={group.key}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#1B365D]/8">
                <Icon className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
              </div>
              <p className="text-[13px] font-semibold text-slate-900">{group.label}</p>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-500">{group.summary}</p>
            <ul className="mt-2.5 space-y-1">
              {items.map((item) => (
                <li key={item} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-600" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Pro upgrade surface: outcome grid + two price cards (monthly / annual).
 *
 * Directory-model contract (src/lib/proDirectoryBenefits.ts):
 * - Pro sells richer presentation, direct contact, media, multi-location tools,
 *   and performance reporting.
 * - Verification and organic directory position are never Pro entitlements.
 * - Featured is a separate advertising product, explained separately below.
 * - Monthly and annual carry the SAME capabilities; annual changes only price,
 *   billing interval, and savings.
 */
export function ProUpgradeChoices({ onChoose, busy = null }: ProUpgradeChoicesProps) {
  const annualSavings = TIER_PRICING.pro.fullAnnualCents - TIER_PRICING.pro.annualCents;

  return (
    <div className="space-y-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-900 md:text-xl">
            {PRO_UPGRADE_HEADLINE}
          </h2>
          <Badge variant="secondary" className="text-[11px] font-medium">
            Pro listing subscription
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">
          Pro upgrades the public profile families and referrers see, and gives you the
          reporting to measure it. Monthly and annual include exactly the same features.
        </p>
      </div>

      <ProOutcomeGrid />

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
            <p className="text-xs text-slate-500">
              Every feature above, billed month to month.
            </p>
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
                Commit to the year, save {fmtMoney(annualSavings)}.
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
            <p className="text-xs text-slate-500">
              The same features as monthly — only the price and billing interval change.
            </p>
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
