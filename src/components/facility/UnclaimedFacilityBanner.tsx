/**
 * UnclaimedFacilityBanner
 * ───────────────────────
 * Banner shown on facility detail pages when the listing is unclaimed AND
 * not yet on Pro. Implements the YMYL safety mitigation we agreed on:
 * even when phone/email/website are hidden behind the monetization gate,
 * a person in crisis can ALWAYS see a way to get help — either the
 * facility's physical address or RehabLookup's 24/7 concierge line.
 *
 * Show this when `public_facilities.is_premium_visible === false`.
 *
 * Two CTAs:
 *   1. For the facility owner → "Claim this listing" (opens the claim modal)
 *   2. For someone seeking help → "Call our 24/7 helpline" + lead form
 */

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Phone, ShieldCheck, MapPin } from "lucide-react";

interface UnclaimedFacilityBannerProps {
  facilityName: string;
  facilityAddress: string;
  facilityCity: string;
  facilityState: string;
  /** Opens the ClaimListingModal — parent component owns the modal state. */
  onClaimClick: () => void;
  /** Opens your lead-capture flow / concierge form. */
  onConciergeClick: () => void;
  /** Your platform's 24/7 helpline. Defaults to the rehablookup.com number. */
  conciergePhone?: string;
  conciergePhoneFormatted?: string;
}

export function UnclaimedFacilityBanner({
  facilityName,
  facilityAddress,
  facilityCity,
  facilityState,
  onClaimClick,
  onConciergeClick,
  conciergePhone = "+12146396420",
  conciergePhoneFormatted = "(214) 639-6420",
}: UnclaimedFacilityBannerProps) {
  return (
    <Card className="border-l-4 border-l-primary/70 p-5 sm:p-6 my-6 shadow-sm">
      <div className="grid gap-6 md:grid-cols-2 md:items-start">
        {/* Seeker path — always visible, no friction */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" aria-hidden />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Need help right now?
            </h3>
          </div>
          <p className="text-base">
            This listing's direct contact info isn't currently available, but
            our 24/7 concierge team can connect you with{" "}
            <span className="font-medium">{facilityName}</span> or a similar
            program nearby.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild size="lg">
              <a href={`tel:${conciergePhone}`} aria-label="Call concierge helpline">
                <Phone className="mr-2 h-4 w-4" aria-hidden />
                {conciergePhoneFormatted}
              </a>
            </Button>
            <Button variant="outline" size="lg" onClick={onConciergeClick}>
              Request a callback
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Free, confidential, 24/7. Talking to a person takes about 2 minutes.
          </p>

          {/* Address — always shown for walk-ins / mapping */}
          <div className="flex items-start gap-2 pt-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden />
            <div>
              {facilityAddress}
              <br />
              {facilityCity}, {facilityState}
            </div>
          </div>
        </div>

        {/* Owner path — visually distinct, less prominent than the seeker CTA */}
        <div className="space-y-3 md:border-l md:border-border md:pl-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" aria-hidden />
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Are you the owner?
            </h3>
          </div>
          <p className="text-base">
            Take control of this listing to display your phone number,
            website, and contact email — and start receiving inquiries directly.
          </p>
          <Button variant="secondary" size="lg" onClick={onClaimClick}>
            Claim this listing
          </Button>
          <p className="text-xs text-muted-foreground">
            Verification typically takes 1–2 business days.
          </p>
        </div>
      </div>
    </Card>
  );
}
