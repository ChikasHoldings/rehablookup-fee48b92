import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics";
import { buildConciergeHref } from "@/lib/conciergeHref";

interface ProfileConciergeRescueProps {
  facility: {
    id?: string | null;
    name: string;
    city: string;
    state: string;
  };
  /** Delay before showing (ms). Default 30s. */
  delayMs?: number;
}

/**
 * Passive (non-modal) concierge rescue strip surfaced inline at the bottom of
 * a facility profile after the visitor has lingered without converting.
 *
 * Honors the platform's discovery-first / no-popup policy:
 *   - Renders inline in the page flow (never as an overlay).
 *   - Only appears once a soft idle threshold elapses on the page.
 *   - Dismissible per session; never re-shown on the same profile in the
 *     same tab.
 *
 * Captures users who clearly need help but didn't engage with the primary
 * "Request Info" CTA — the largest leak in the current funnel.
 */
export function ProfileConciergeRescue({
  facility,
  delayMs = 30_000,
}: ProfileConciergeRescueProps) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Per-tab, per-facility suppression so we never nag the same visitor twice.
  const dismissKey = facility.id
    ? `rl_rescue_dismissed_${facility.id}`
    : null;

  useEffect(() => {
    if (dismissKey) {
      try {
        if (sessionStorage.getItem(dismissKey) === "1") {
          setDismissed(true);
          return;
        }
      } catch {
        // sessionStorage may be unavailable (privacy mode) — fail open.
      }
    }
    const t = window.setTimeout(() => {
      setVisible(true);
      trackEvent("profile_rescue_view", {
        event_category: "Conversion",
        event_label: facility.id ?? facility.name,
        surface: "profile_rescue",
      });
    }, delayMs);
    return () => window.clearTimeout(t);
  }, [delayMs, dismissKey, facility.id, facility.name]);

  if (!visible || dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (dismissKey) {
      try {
        sessionStorage.setItem(dismissKey, "1");
      } catch {
        // best-effort
      }
    }
    trackEvent("profile_rescue_dismiss", {
      event_category: "Conversion",
      event_label: facility.id ?? facility.name,
    });
  };

  const handleClick = () => {
    trackEvent("profile_rescue_click", {
      event_category: "Conversion",
      event_label: facility.id ?? facility.name,
      surface: "profile_rescue",
    });
  };

  return (
    <section
      aria-label="Free placement help"
      className="container my-10"
    >
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-7 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Heart className="h-5 w-5 text-primary" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-foreground leading-tight">
                Still comparing options? Let our team help — free.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                We&apos;ll match you with vetted treatment centers in {facility.city}, {facility.state} and beyond — typically within an hour.
              </p>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
                  100% confidential
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" aria-hidden />
                  Match in ~60 minutes
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button asChild size="lg" variant="success" className="gap-2" onClick={handleClick}>
              <Link
                to={buildConciergeHref({
                  location: `${facility.city}, ${facility.state}`,
                  source: "profile_rescue",
                })}
              >
                Match Me Free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <button
              onClick={handleDismiss}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 px-2 py-1"
              aria-label="Dismiss this offer"
            >
              No thanks
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
