import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";

interface StickyMobileCallBarProps {
  facilityName: string;
  phone: string | null | undefined;
  /** Optional click handler — typically the page's existing
   *  trackInteraction("call") so this bar's clicks attribute the same
   *  way as the in-page CTA. */
  onCallClick?: () => void;
}

/**
 * Mobile-only sticky bottom-bar with a single "Call" CTA. Mirrors the
 * Yelp / Healthgrades pattern: directory users scroll long facility
 * profiles, scroll past the in-page CTA, then can't find it — the
 * sticky bar keeps the primary conversion action one tap away through
 * the entire scroll. Hides at md: (>= 768px) where the in-page CTA is
 * always in viewport.
 *
 * Click is wired through the same `trackInteraction("call")` event the
 * in-page Call button uses so analytics still attribute the lead. The
 * native `tel:` link triggers the OS dialer.
 *
 * Layout / safe-area
 * ──────────────────
 * - `fixed bottom-0 inset-x-0 z-40` sits above page content (z-50+ for
 *   modals so this never traps a modal).
 * - `pb-[env(safe-area-inset-bottom)]` pushes the button above iOS home
 *   indicator on notched devices.
 * - Pages that mount this should add `pb-24 md:pb-0` to their main
 *   container so the last in-page row isn't hidden behind the bar.
 *
 * Conditional render
 * ──────────────────
 * If no phone number is available, the component renders nothing — the
 * page should fall back to its in-page CTA (e.g. the request-info form).
 */
export function StickyMobileCallBar({
  facilityName,
  phone,
  onCallClick,
}: StickyMobileCallBarProps) {
  if (!phone) return null;
  const digits = getPhoneDigits(phone);
  if (!digits) return null;

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card shadow-[0_-4px_12px_rgba(0,0,0,0.06)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      role="region"
      aria-label="Contact this facility"
    >
      <div className="container py-2.5 px-4">
        <Button asChild size="lg" className="w-full gap-2 h-12 text-base font-semibold shadow-sm">
          <a
            href={`tel:+1${digits}`}
            onClick={() => onCallClick?.()}
            aria-label={`Call ${facilityName} at ${formatPhoneNumber(phone)}`}
            data-cta-location="sticky_mobile_call"
          >
            <Phone className="h-5 w-5 shrink-0" aria-hidden />
            <span className="truncate">
              Call {formatPhoneNumber(phone)}
            </span>
          </a>
        </Button>
      </div>
    </div>
  );
}
