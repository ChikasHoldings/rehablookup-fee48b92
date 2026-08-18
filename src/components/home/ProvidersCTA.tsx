import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Target, BarChart3, ArrowRight } from "lucide-react";
import providerHero from "@/assets/provider-hero.jpg";

/**
 * Homepage CTA targeted at treatment-center providers. Replaces the
 * previous "International Patients" section in the homepage flow.
 *
 * Two-column layout: image anchors the band on the left, content
 * (eyebrow + tight headline + subhead + 3 compact features + dual
 * CTA) sits on the right. Stacks vertically on mobile.
 *
 * Visual identity is deliberately distinct from the seeker-facing
 * sections above and below: a navy-on-navy gradient background with
 * white text signals to providers (skimming the homepage) that this
 * isn't for them-as-seekers — without breaking the seeker funnel.
 *
 * The dedicated /us-rehab/international-patients page is untouched
 * (it's reached from the international banner + footer); only the
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
      title: "Independent Verification",
      // "A verified badge" read as something a plan includes. Verification is
      // earned and is not bundled with, or purchasable through, any plan.
      body: "Verification is earned independently of payment.",
    },
    {
      Icon: Target,
      // Was "Qualified Leads" — RehabLookup does not sell or qualify leads.
      title: "Direct Inquiries",
      body: "Families filtering by insurance and level of care contact you directly.",
    },
    {
      Icon: BarChart3,
      title: "Simple Tools",
      body: "Dashboard, analytics, and inquiry management in one place.",
    },
  ];

  return (
    <section
      className="relative overflow-hidden py-12 md:py-16 lg:py-20 text-white"
      // Navy → darker-navy gradient. Base matches the brand primary
      // token (#1B365D); darker end (#0E1F3A) gives the band depth
      // without leaving the palette.
      style={{
        background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)",
      }}
      aria-labelledby="providers-cta-heading"
    >
      {/* Decorative gold glow — low opacity, reads as texture. */}
      <div
        className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-[#CDA223]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#CDA223]/5 blur-3xl"
        aria-hidden
      />

      <div className="container relative px-4 md:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          {/* ── Image column ────────────────────────────────────────── */}
          <div className="relative order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10">
              <img
                src={providerHero}
                alt="A treatment center director reviewing the RehabLookup provider dashboard"
                width={1200}
                height={900}
                className="aspect-[4/3] w-full object-cover"
                loading="lazy"
                decoding="async"
              />
              {/* Faint navy overlay so the image reads as part of the
                  band rather than a foreign element. */}
              <div
                className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[#1B365D]/30 via-transparent to-transparent"
                aria-hidden
              />
            </div>

            {/* Floating stat tile, bottom-right of the image — adds a
                concrete proof point without crowding the text column. */}
            <div className="absolute -bottom-5 right-4 md:right-6 hidden sm:flex items-center gap-3 rounded-xl bg-white/95 px-4 py-3 shadow-lg ring-1 ring-black/5 backdrop-blur">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1B365D]/10">
                <ShieldCheck className="h-5 w-5 text-[#1B365D]" aria-hidden />
              </div>
              <div className="leading-tight">
                <p className="font-display text-base font-bold text-[#1B365D]">3,800+</p>
                <p className="text-[11px] uppercase tracking-wide text-slate-500">Centers listed</p>
              </div>
            </div>
          </div>

          {/* ── Content column ──────────────────────────────────────── */}
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CDA223]">
                For Treatment Providers
              </span>
            </div>

            <h2
              id="providers-cta-heading"
              className="mt-4 font-display text-3xl md:text-4xl lg:text-[2.5rem] font-bold tracking-tight text-white leading-[1.1]"
            >
              Grow your treatment center.
            </h2>

            <p className="mt-3 md:mt-4 text-base md:text-lg text-white/80 leading-relaxed max-w-xl">
              Thousands of families search RehabLookup each month. List your facility
              and start receiving qualified inquiries — your free listing goes live in
              under 10 minutes.
            </p>

            {/* Compact 3-feature list. On mobile each item is a single
                row — icon on the left, title + body stacked on the right —
                so the eye can scan three short stories straight down the
                column. At sm+ the parent grid splits into 3 columns and
                each item reverts to a vertical icon → title → body stack. */}
            <ul className="mt-7 grid gap-4 sm:grid-cols-3 sm:gap-5">
              {features.map(({ Icon, title, body }) => (
                <li
                  key={title}
                  className="flex flex-row items-start gap-3 sm:flex-col sm:gap-0"
                >
                  <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
                    <Icon className="h-4.5 w-4.5 text-[#CDA223]" aria-hidden />
                  </div>
                  <div className="min-w-0 sm:mt-2.5">
                    <p className="text-sm font-semibold text-white">{title}</p>
                    {/* white/80 on #1B365D/#0E1F3A clears WCAG AA easily. */}
                    <p className="mt-0.5 text-[13px] leading-snug text-white/80">{body}</p>
                  </div>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5">
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
                to="/provider/onboarding"
                className="text-sm font-medium text-white/90 hover:text-white underline underline-offset-4 decoration-white/40 hover:decoration-white transition-colors"
              >
                Already listed? Claim your profile →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
