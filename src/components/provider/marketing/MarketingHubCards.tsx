import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Rotate3D, UserCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { fmtMoney, fmtMoneyWhole, TIER_PRICING } from "@/lib/billingPricing";
import type { FacilitySubscriptionRow } from "@/hooks/useFacilitySubscription";

interface MarketingHubCardsProps {
  subscription: FacilitySubscriptionRow;
}

/**
 * The two add-on product cards shown on /provider/marketing for Pro
 * users. Each card surfaces:
 *   • ACTIVE state: usage metrics + Manage CTA
 *   • NOT ACTIVE state: pricing + live availability + Get/Become CTA
 *
 * Featured and Concierge are intentionally INDEPENDENT — buying or
 * managing one never affects the other. Each card routes to its own
 * detail page where the purchase flow / management UI lives.
 */
export function MarketingHubCards({ subscription }: MarketingHubCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FeaturedCard active={!!subscription.has_featured} />
      <ConciergeCard active={!!subscription.has_concierge_partner} />
    </div>
  );
}

function FeaturedCard({ active }: { active: boolean }) {
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
          Phone-rotation slots on homepage, state, city, search, treatment,
          insurance, and article pages. Slot caps per geography keep your
          rotation share meaningful.
        </p>

        {active ? (
          <>
            <p className="text-xs text-slate-600">
              Performance metrics, slot count, and remove-slot actions in the
              manager.
            </p>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/provider/marketing/featured">
                Manage placements
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

function ConciergeCard({ active }: { active: boolean }) {
  return (
    <Card className="border-violet-200/60 bg-gradient-to-br from-white to-violet-50/30">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-violet-100 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-violet-700" aria-hidden />
            </div>
            <p className="font-semibold text-slate-900 text-base">
              Concierge Partner
            </p>
          </div>
          {active && (
            <Badge className="bg-emerald-600 hover:bg-emerald-600">Active</Badge>
          )}
        </div>

        <p className="text-sm text-slate-700 leading-relaxed">
          Prominent surfacing when our human advisors match seekers with
          treatment. Non-partner alternatives always presented; seekers always
          pick. Calls go direct to your admissions line — never per-call,
          per-lead, or per-admission.
        </p>

        {active ? (
          <>
            <p className="text-xs text-slate-600">
              Performance metrics, active geos, and management actions in the
              partner manager.
            </p>
            <Button asChild variant="outline" className="w-full gap-2">
              <Link to="/provider/marketing/concierge">
                Manage geos
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        ) : (
          <>
            <div className="rounded-md bg-white border border-violet-200/60 p-3 text-xs space-y-1">
              <p className="font-medium text-slate-900">
                {fmtMoneyWhole(TIER_PRICING.concierge.monthlyCents)}/mo · {fmtMoney(TIER_PRICING.concierge.annualCents)}/yr (save 15%)
              </p>
              <p className="text-slate-500">
                Capped 3-5 per major city — partner slots fill quickly.
              </p>
            </div>
            <Button asChild className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-2">
              <Link to="/provider/marketing/concierge">
                Become a Concierge Partner
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
