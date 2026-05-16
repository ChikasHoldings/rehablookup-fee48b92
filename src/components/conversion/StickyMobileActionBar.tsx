import { useEffect, useState } from "react";
import { Phone, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { CONCIERGE_PHONE_DISPLAY, CONCIERGE_PHONE_TEL } from "@/lib/contactInfo";
import { useNewCtaSystem } from "@/hooks/useNewCtaSystem";
import { useScrollDirection } from "@/hooks/useScrollDirection";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Mobile-only sticky bottom bar with two equal-width tap targets:
 * Call (tel: deep-link) and Get help (concierge intake). Hidden
 * entirely above md. Hides on scroll-down + reveals on scroll-up
 * so it never feels intrusive while a seeker is reading.
 *
 * Renders only when the NEW_CTA_SYSTEM flag is on; when off this
 * component is a no-op so the existing popup/exit-intent surfaces
 * continue to own conversion.
 *
 * Includes a 56px spacer at the document end so fixed bar never
 * obscures bottom-of-page content.
 */
export function StickyMobileActionBar() {
  const enabled = useNewCtaSystem();
  const scrollDir = useScrollDirection({ threshold: 12 });
  const [mounted, setMounted] = useState(false);

  // Defer first paint by one tick so the initial slide-in fades in
  // smoothly rather than appearing instantly with the rest of the
  // page chrome.
  useEffect(() => {
    if (!enabled) return;
    const t = window.setTimeout(() => setMounted(true), 50);
    return () => window.clearTimeout(t);
  }, [enabled]);

  if (!enabled) return null;

  // `null` (no scroll yet) and `up` both reveal; only `down` hides.
  const visible = mounted && scrollDir !== "down";

  return (
    <>
      <div
        role="region"
        aria-label="Quick contact"
        className={cn(
          "md:hidden fixed inset-x-0 bottom-0 z-40 h-14 px-2",
          "border-t border-[#1B365D]/15 bg-white/95 backdrop-blur-md",
          "transition-opacity duration-200",
          visible ? "opacity-100" : "opacity-0 pointer-events-none",
        )}
        // Honour iOS safe-area + a hair of padding so the buttons
        // don't sit on the home-bar.
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="grid grid-cols-2 gap-2 h-full items-center">
          <a
            href={`tel:${CONCIERGE_PHONE_TEL}`}
            aria-label={`Call ${CONCIERGE_PHONE_DISPLAY} for free help`}
            onClick={() =>
              analytics.ctaClick("sticky_mobile_call", "sticky_mobile")
            }
            className="flex items-center justify-center gap-2 h-10 rounded-md bg-[#1B365D] text-white text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call now
          </a>
          <Link
            to="/concierge/intake"
            onClick={() =>
              analytics.ctaClick("sticky_mobile_intake", "sticky_mobile")
            }
            className="flex items-center justify-center gap-2 h-10 rounded-md border border-[#1B365D]/30 text-[#1B365D] text-sm font-semibold active:scale-[0.98] transition-transform"
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            Get help
          </Link>
        </div>
      </div>
      {/* Spacer keeps fixed bar from overlapping bottom-of-page
          content. md:hidden so desktop gets nothing. */}
      <div aria-hidden className="md:hidden h-14" />
    </>
  );
}
