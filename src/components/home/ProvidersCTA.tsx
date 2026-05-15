import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Target, BarChart3, ArrowRight } from "lucide-react";

/**
 * Homepage CTA targeted at treatment-center providers. Replaces the
 * previous "International Patients" section in the homepage flow.
 *
 * Visual identity is deliberately distinct from the seeker-facing
 * sections above and below: a navy-on-navy gradient background with
 * white text signals to providers (skimming the homepage) that this
 * isn't for them-as-seekers — without breaking the seeker funnel.
 *
 * The dedicated /us-rehab/international-patients page is untouched
 * (it's reached from the international-banner + footer); only the
 * homepage slot is repurposed.
 *
 * CTA routes:
 *   • Primary  "List your facility"      → /for-providers (marketing page)
 *   • Secondary "Already listed? Claim"  → /provider-signup (auth → claim flow)
 */
export function ProvidersCTA() {
  const features = [
    {
      Icon: ShieldCheck,
      title: "Verified Listings",
      body: "Stand out with a verified badge that builds family trust.",
    },
    {
      Icon: Target,
      title: "Qualified Leads",
      body: "Reach families actively searching for treatment in your area, filtered by insurance and level of care.",
    },
    {
      Icon: BarChart3,
      title: "Simple Tools",
      body: "Dashboard, analytics, claim assistance, and concierge handoff in one place.",
    },
  ];

  return (
    <section
      className="relative overflow-hidden py-12 md:py-16 lg:py-20 text-white"
      // Navy → darker-navy gradient. The base shade matches the brand
      // primary token (#1B365D); the darker end (#0E1F3A) gives the
      // band visual depth without leaving the palette.
      style={{
        background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)",
      }}
      aria-labelledby="providers-cta-heading"
    >
      {/* Subtle decorative gold glow — kept low-opacity so it reads as
          texture rather than a feature. */}
      <div
        className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#CDA223]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#CDA223]/5 blur-3xl"
        aria-hidden
      />

      <div className="container relative px-4 md:px-6 lg:px-8">
        {/* Eyebrow + headline + subhead, centered */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#CDA223]">
              For Treatment Providers
            </span>
          </div>

          <h2
            id="providers-cta-heading"
            className="mt-4 font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white"
          >
            Run a treatment center? Get qualified families finding you.
          </h2>

          <p className="mt-3 md:mt-4 text-[15px] md:text-base text-white/80 leading-relaxed">
            RehabLookup connects thousands of verified seekers per month with licensed
            facilities. Your free listing goes live in under 10 minutes.
          </p>
        </div>

        {/* 3-column feature row */}
        <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
          {features.map(({ Icon, title, body }) => (
            <div key={title} className="text-center md:text-left">
              <div className="mx-auto md:mx-0 inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                <Icon className="h-5 w-5 text-[#CDA223]" aria-hidden />
              </div>
              <h3 className="mt-4 font-semibold text-white text-lg">{title}</h3>
              {/* white/85 hits AA (>4.5:1) on the navy gradient. */}
              <p className="mt-1.5 text-sm leading-relaxed text-white/85">{body}</p>
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="mt-10 flex flex-col items-center gap-3 md:flex-row md:justify-center md:gap-5">
          <Button
            asChild
            size="lg"
            className="bg-[#CDA223] text-[#1B365D] hover:bg-[#B38C1C] font-semibold shadow-lg hover:shadow-xl transition-all gap-2"
          >
            <Link to="/for-providers">
              List your facility
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>

          <Link
            to="/provider-signup"
            className="text-sm font-medium text-white/90 hover:text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors"
          >
            Already listed? Claim your profile →
          </Link>
        </div>
      </div>
    </section>
  );
}
