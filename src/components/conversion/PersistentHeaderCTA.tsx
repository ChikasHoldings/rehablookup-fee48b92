import { Phone } from "lucide-react";
import { CONCIERGE_PHONE_DISPLAY, CONCIERGE_PHONE_TEL } from "@/lib/contactInfo";
import { useNewCtaSystem } from "@/hooks/useNewCtaSystem";
import { analytics } from "@/lib/analytics";

/**
 * Calm desktop header CTA pill. Visible at md+; below md the
 * StickyMobileActionBar handles the bottom-of-screen call slot
 * instead.
 *
 * Behind the NEW_CTA_SYSTEM flag — when the flag is off this
 * component renders nothing so any existing header CTA in the
 * shell stays in charge.
 */
export function PersistentHeaderCTA() {
  if (!useNewCtaSystem()) return null;
  return (
    <a
      href={`tel:${CONCIERGE_PHONE_TEL}`}
      onClick={() => analytics.ctaClick("header_call", "header")}
      className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#1B365D]/10 px-3 py-1.5 text-sm font-semibold text-[#1B365D] transition-colors hover:bg-[#1B365D] hover:text-white"
      aria-label={`Free help — call ${CONCIERGE_PHONE_DISPLAY}`}
    >
      <Phone className="h-3.5 w-3.5" aria-hidden />
      <span className="leading-none">
        Free help — {CONCIERGE_PHONE_DISPLAY}
      </span>
    </a>
  );
}
