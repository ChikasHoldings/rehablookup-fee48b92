import { Link } from "react-router-dom";
import { ShieldCheck, ArrowRight, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  carrier: string;
  description?: string;
}

/**
 * Insurance carrier verification CTA — mounted on each /insurance/<carrier>
 * landing page (Aetna, BCBS, Cigna, etc.).
 *
 * Layout:
 *   - Mobile (default): stacked. Trust pill → carrier-specific headline →
 *     description → 4-item benefit grid → "Ready to check?" action card.
 *   - Desktop (≥ md): two-column inner layout. LEFT carries the pitch
 *     (pill, headline, description, benefits) at 60%; RIGHT is a tinted
 *     action panel at 40% with the CTA button, supporting copy, and a
 *     final HIPAA reassurance line. The two columns share equal height
 *     and the action panel's tinted background separates it visually
 *     from the pitch without needing a hard border on mobile.
 *
 * The /insurance-verification page consumes the `?carrier=` query
 * param to pre-select the carrier in the verification form.
 */
export function InsuranceVerifyCarrierCTA({ carrier, description }: Props) {
  const href = `/insurance-verification?carrier=${encodeURIComponent(carrier)}`;
  const benefits = [
    "No cost, no obligation",
    "HIPAA-aware handling",
    "Plain-English coverage summary",
    "Same or next business day",
  ];

  return (
    <section
      className="relative overflow-hidden border-y border-primary/15 bg-gradient-to-br from-primary/[0.04] via-background to-primary/[0.07] py-10 md:py-14 lg:py-16"
      aria-labelledby="verify-carrier-cta-heading"
    >
      {/* Decorative ShieldCheck watermark — desktop only, very low
          opacity so it reads as texture rather than imagery. */}
      <ShieldCheck
        className="pointer-events-none absolute -right-12 top-1/2 hidden h-72 w-72 -translate-y-1/2 text-primary/[0.05] md:block lg:-right-8 lg:h-80 lg:w-80"
        aria-hidden
      />

      <div className="container relative px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-primary/20 bg-card shadow-md">
          <div className="flex flex-col md:flex-row md:items-stretch">
            {/* ─── LEFT: pitch ─────────────────────────────────────────── */}
            <div className="flex-1 p-6 sm:p-7 md:p-8 lg:p-10">
              {/* Trust pill — keeps the page consistent with other
                  conversion surfaces (homepage hero, providers CTA). */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primary ring-1 ring-primary/20">
                <ShieldCheck className="h-3 w-3" aria-hidden />
                Free Insurance Check
              </span>

              <h2
                id="verify-carrier-cta-heading"
                className="mt-3 font-display text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-[1.625rem] lg:text-3xl"
              >
                Verify your {carrier} coverage —{" "}
                <span className="text-primary">free &amp; confidential</span>
              </h2>

              <p className="mt-3 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px] md:text-base">
                {description ||
                  `Submit your ${carrier} member ID and our care team will confirm what your plan covers for rehab, medications, and out-of-pocket cost — usually within one business day.`}
              </p>

              {/* Benefits — 1 col on mobile, 2 col on sm+. Each row uses
                  a CheckCircle2 icon (success-coded green) + concise
                  copy. Spacing is comfortable; bullets feel like
                  reassurance points, not boxed list items. */}
              <ul className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2 sm:gap-x-4 sm:gap-y-2.5">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-foreground/85">
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden
                    />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* ─── RIGHT: action panel ─────────────────────────────────── */}
            <div className="relative border-t border-primary/15 bg-primary/[0.04] p-6 sm:p-7 md:w-[44%] md:max-w-sm md:border-l md:border-t-0 md:p-8 lg:p-10">
              <div className="flex h-full flex-col justify-center text-center md:text-left">
                <p className="text-sm font-bold text-foreground sm:text-base">
                  Ready to check your benefits?
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
                  Takes about a minute. Our care team confirms coverage by
                  the next business day.
                </p>
                <Button
                  asChild
                  size="lg"
                  className="mt-4 w-full gap-2 shadow-md hover:shadow-lg transition-shadow"
                >
                  <Link to={href} aria-label={`Verify my ${carrier} insurance coverage`}>
                    Verify my {carrier} coverage
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <p className="mt-3 inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted-foreground md:justify-start">
                  <Lock className="h-3 w-3" aria-hidden />
                  HIPAA-aware · No commitment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
