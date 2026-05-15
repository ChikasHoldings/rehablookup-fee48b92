import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Search, ArrowRight, Sparkles, ShieldCheck, MapPin, Building2 } from "lucide-react";
import { buildConciergeHref } from "@/lib/conciergeHref";

interface RecoveryJourneyCTAProps {
  /** Optional location string (e.g. "Boise, ID") forwarded to /concierge
   *  as prefill / attribution; passed in by the homepage. */
  conciergeLocation?: string;
}

/**
 * End-of-page hero CTA that positions RehabLookup as an independent
 * directory — not a treatment provider. Two paths to the same goal
 * (finding the right facility):
 *
 *   • Primary  — search the directory yourself      → /search-results
 *   • Secondary — get a free personalized match     → /concierge
 *
 * Wording intentionally avoids advisor / helpline framing ("call us",
 * "talk to a counselor", "24/7 available") so visitors don't mistake
 * us for the treatment center itself.
 *
 * Layout: two-column band (60/40) on desktop, single column on
 * mobile. Right column is an inline SVG sunrise — brand navy + gold,
 * ~1.5KB markup, no external fetch, no CLS.
 */
export function RecoveryJourneyCTA({ conciergeLocation = "" }: RecoveryJourneyCTAProps) {
  const trustRow = [
    { Icon: Building2, label: "3,800+ verified facilities" },
    { Icon: MapPin, label: "All 50 states covered" },
    { Icon: ShieldCheck, label: "Independent directory" },
    { Icon: Sparkles, label: "Free to use" },
  ];

  return (
    <section
      className="relative overflow-hidden py-14 md:py-20 lg:py-24"
      // Soft brand-navy gradient on a near-white field. Heavier weight
      // than the muted/30 background of surrounding sections without
      // matching the saturated navy of the Providers CTA above.
      style={{
        background:
          "radial-gradient(60% 80% at 0% 0%, rgba(27,54,93,0.06) 0%, transparent 60%), radial-gradient(50% 70% at 100% 100%, rgba(205,162,35,0.06) 0%, transparent 60%), #F7F9FC",
      }}
      aria-labelledby="recovery-journey-heading"
    >
      <div className="container relative px-4 md:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-5 lg:gap-14">
          {/* ── Left content (60% on desktop = lg:col-span-3) ───────── */}
          <div className="lg:col-span-3">
            <span className="inline-flex items-center rounded-full bg-[#1B365D]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#1B365D]">
              Find your match
            </span>

            <h2
              id="recovery-journey-heading"
              className="mt-4 font-display text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-tight text-[#1B365D] leading-[1.1]"
            >
              Find the right treatment center for you.
            </h2>

            <p className="mt-3 md:mt-4 text-base md:text-lg text-slate-600 leading-relaxed max-w-xl">
              RehabLookup is an independent directory of verified addiction-treatment
              facilities across the U.S. Search by location, insurance, and level of
              care — or let our free concierge surface the best matches for you.
            </p>

            {/* CTAs */}
            <div className="mt-7 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                asChild
                size="lg"
                className="bg-[#1B365D] hover:bg-[#142a4a] text-white gap-2 font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <Link to="/search-results">
                  <Search className="h-4 w-4" />
                  Search treatment centers
                </Link>
              </Button>

              <Link
                to={buildConciergeHref({
                  location: conciergeLocation,
                  source: "homepage_recovery_journey_cta",
                })}
                className="inline-flex items-center gap-1 text-sm font-semibold text-[#1B365D] hover:text-[#142a4a] underline underline-offset-4 decoration-[#1B365D]/40 hover:decoration-[#1B365D] transition-colors"
              >
                Get a personalized match
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Trust row — 4 directory-appropriate signals. */}
            <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-3 text-sm text-slate-600 sm:grid-cols-4">
              {trustRow.map(({ Icon, label }) => (
                <li key={label} className="flex items-center gap-2">
                  <Icon className="h-4 w-4 shrink-0 text-[#CDA223]" aria-hidden />
                  <span className="font-medium">{label}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ── Right illustration (40% on desktop = lg:col-span-2) ── */}
          <div className="lg:col-span-2">
            <div className="relative mx-auto max-w-[420px] lg:max-w-none">
              <SunriseIllustration className="h-auto w-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * Inline SVG: sunrise over rolling hills. ~6 paths, no external
 * fetch, scales perfectly at any size, contains no PII or external
 * URLs that could rot. Brand palette: navy #1B365D for the hill line,
 * gold #CDA223 for the sun, warm sand #F0D8A0 for the sky gradient.
 */
function SunriseIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 280"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Sunrise over rolling hills, signaling a new beginning"
      className={className}
    >
      <defs>
        {/* Sky gradient — sand → soft blue */}
        <linearGradient id="rj-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F0D8A0" />
          <stop offset="55%" stopColor="#FFF5DA" />
          <stop offset="100%" stopColor="#E5EEF7" />
        </linearGradient>
        {/* Sun glow */}
        <radialGradient id="rj-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FCE39A" />
          <stop offset="55%" stopColor="#CDA223" />
          <stop offset="100%" stopColor="#CDA223" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Sky */}
      <rect width="400" height="280" rx="20" fill="url(#rj-sky)" />

      {/* Sun glow */}
      <circle cx="200" cy="200" r="120" fill="url(#rj-sun)" opacity="0.7" />

      {/* Sun disc */}
      <circle cx="200" cy="200" r="42" fill="#CDA223" />

      {/* Far hill — soft navy */}
      <path
        d="M0 220 Q 90 180 180 200 T 400 195 L 400 280 L 0 280 Z"
        fill="#1B365D"
        opacity="0.35"
      />

      {/* Mid hill */}
      <path
        d="M0 240 Q 110 210 220 232 T 400 230 L 400 280 L 0 280 Z"
        fill="#1B365D"
        opacity="0.6"
      />

      {/* Front hill — full brand navy */}
      <path
        d="M0 260 Q 120 244 240 258 T 400 254 L 400 280 L 0 280 Z"
        fill="#1B365D"
      />

      {/* Three light rays radiating from the sun */}
      <g stroke="#CDA223" strokeWidth="2" strokeLinecap="round" opacity="0.5">
        <line x1="200" y1="120" x2="200" y2="80" />
        <line x1="135" y1="155" x2="105" y2="135" />
        <line x1="265" y1="155" x2="295" y2="135" />
      </g>
    </svg>
  );
}
