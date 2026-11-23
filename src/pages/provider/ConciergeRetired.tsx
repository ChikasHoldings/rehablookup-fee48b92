import { Link } from "react-router-dom";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * /provider/marketing/concierge — the Concierge Partner add-on was retired
 * with the concierge/placement service (directory cutover). No facility ever
 * held it and no introductions were ever made. This page replaces the former
 * purchase/management surface so existing links (navigation, notifications,
 * promo emails) land on an accurate explanation instead of a checkout.
 */
export default function ConciergeRetired() {
  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-[#1B365D]" aria-hidden />
            <h1 className="text-lg font-semibold text-slate-900">Concierge Partner has been retired</h1>
          </div>
          <p className="text-sm leading-relaxed text-slate-700">
            RehabLookup no longer runs a concierge or placement service, so the Concierge
            Partner add-on is not available. Families find your facility through the
            directory and contact you directly from your listing.
          </p>
          <p className="text-sm leading-relaxed text-slate-700">
            Featured placements remain available on Pro. If you have a billing question
            about a past add-on, contact support from the Help page.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild className="bg-[#1B365D] hover:bg-[#142a4a]">
              <Link to="/provider/marketing">Back to Marketing</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/provider/help">Help &amp; support</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
