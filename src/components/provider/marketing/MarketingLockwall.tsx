import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Sparkles, ArrowRight, Rotate3D, UserCheck } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * Gate card + grayed-out previews for Free users on /provider/marketing.
 *
 * Shows them what Marketing offers without enabling purchase. Each
 * preview card carries a "Pro required" badge. Upgrade CTA always
 * points to /provider/subscription (the single Pro upgrade surface).
 */
export function MarketingLockwall() {
  return (
    <div className="space-y-6">
      {/* Gate card */}
      <Card className="border-2 border-dashed border-[#1B365D]/30 bg-[#1B365D]/[0.02]">
        <CardContent className="p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#1B365D]/10">
            <Lock className="h-7 w-7 text-[#1B365D]" aria-hidden />
          </div>
          <h2 className="text-xl md:text-2xl font-bold text-slate-900">
            Marketing tools are available with Pro.
          </h2>
          <p className="text-sm md:text-base text-slate-700 max-w-md mx-auto leading-relaxed">
            Upgrade to Pro to unlock Featured placements and Concierge Partner.
            Pro starts at <strong>$99/mo</strong>.
          </p>
          <Button asChild className="bg-[#1B365D] hover:bg-[#142a4a] gap-2">
            <Link to="/provider/subscription">
              <Sparkles className="h-4 w-4" />
              Upgrade to Pro
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Grayed-out previews */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card className="opacity-60 grayscale">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Rotate3D className="h-5 w-5 text-amber-600" aria-hidden />
                <p className="font-semibold text-slate-900">Featured Placements</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                Pro required
              </Badge>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Phone-rotation slots on homepage, state, city, search, treatment,
              insurance, and article pages. Slot caps per geography — fair
              rotation, no bidding wars.
            </p>
            <p className="text-xs text-slate-500">$599/mo · $6,108.60/yr</p>
          </CardContent>
        </Card>

        <Card className="opacity-60 grayscale">
          <CardContent className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-violet-600" aria-hidden />
                <p className="font-semibold text-slate-900">Concierge Partner</p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">
                Pro required
              </Badge>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              Prominent surfacing when our human advisors match seekers with
              treatment. Capped 3-5 per major city. Non-partner alternatives
              always presented. Calls go direct to your line.
            </p>
            <p className="text-xs text-slate-500">$1,000/mo · $10,200/yr</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
