import { useEffect, useState, lazy, Suspense } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { SearchForm } from "@/components/search/SearchForm";
import { Button } from "@/components/ui/button";
import { HomepageFeaturedSection } from "@/components/home/HomepageFeaturedSection";
import { FindByStateSection } from "@/components/home/FindByStateSection";
import { FeaturedRail } from "@/components/featured/FeaturedRail";
import { TrustRibbon } from "@/components/conversion/TrustRibbon";
import { useNewCtaSystem } from "@/hooks/useNewCtaSystem";
// TrustStrip moved to /concierge
import { LazySection } from "@/components/ui/lazy-section";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";
import { analytics } from "@/lib/analytics";
// Hero image moved to public folder for FCP optimization - preloaded in index.html
// Using WebP for ~70% smaller file size
const heroImage = "/hero-recovery.webp";

// Lazy-load below-fold sections to reduce initial JS bundle
const InternalLinkBlock = lazy(() => import("@/components/seo/InternalLinkBlock").then(m => ({ default: m.InternalLinkBlock })));
const ProvidersCTA = lazy(() => import("@/components/home/ProvidersCTA").then(m => ({ default: m.ProvidersCTA })));
const RecoveryJourneyCTA = lazy(() => import("@/components/home/RecoveryJourneyCTA").then(m => ({ default: m.RecoveryJourneyCTA })));
const TestimonialsSection = lazy(() => import("@/components/testimonials/TestimonialsSection").then(m => ({ default: m.TestimonialsSection })));
const PageFAQ = lazy(() => import("@/components/seo/PageFAQ").then(m => ({ default: m.PageFAQ })));
const seekerTestimonialsPromise = import("@/data/testimonials").then(m => m.seekerTestimonials);
const homeFaqsPromise = import("@/data/pageFaqs").then(m => m.homeFaqs);
import {
  ArrowRight,
  Pill,
  Brain,
  Home,
  Activity,
  Stethoscope,
  Sparkles,
  CheckCircle,
  Clock,
  MapPin,
  Navigation,
  ShieldCheck,
} from "lucide-react";

// Insurance carrier strip shown under the "Are You Covered?" heading.
// The four SVG assets all carry their own tightened viewBox (in
// public/insurance-logos/*.svg) so `object-contain` renders each one
// at its true bounds — no per-logo `transform: scale` workaround
// needed. Optum has no SVG asset in the repo and renders as styled
// brand-orange text instead.
type InsuranceLogo =
  | { kind: "svg"; src: string; alt: string }
  | { kind: "text"; alt: string; label: string; color: string };

const INSURANCE_LOGOS: InsuranceLogo[] = [
  { kind: "svg", src: "/insurance-logos/aetna.svg", alt: "Aetna" },
  { kind: "text", alt: "Optum", label: "Optum", color: "#FF6200" },
  { kind: "svg", src: "/insurance-logos/medicaid.svg", alt: "Medicaid" },
  { kind: "svg", src: "/insurance-logos/cigna.svg", alt: "Cigna" },
  { kind: "svg", src: "/insurance-logos/humana.svg", alt: "Humana" },
];


const treatmentOptions = [
  {
    icon: Pill,
    title: "Drug Addiction",
    description: "Evidence-based programs for substance abuse including opioids, stimulants, and more.",
    // Align with Footer + canonical SEO target slug (`drug-addiction-treatment`).
    // Previously this tile pointed at `/treatment-types/drug-addiction` which
    // was a dead route on its own and only resolved if a redirect was set.
    link: "/treatment-types/drug-addiction-treatment",
  },
  {
    icon: Activity,
    title: "Alcohol Treatment",
    description: "Medically supervised detox and long-term recovery programs for alcohol dependence.",
    link: "/treatment-types/alcohol-rehabilitation",
  },
  {
    icon: Brain,
    title: "Mental Health",
    description: "Dual diagnosis treatment addressing addiction alongside anxiety, depression, and PTSD.",
    link: "/treatment-types/dual-diagnosis",
  },
  {
    icon: Home,
    title: "Residential Rehab",
    description: "24/7 inpatient care in a structured, supportive environment for focused recovery.",
    link: "/treatment-types/residential-inpatient",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment options that allow you to maintain work and family commitments.",
    link: "/treatment-types/outpatient-programs",
  },
  {
    icon: Sparkles,
    title: "Holistic Therapy",
    description: "Complementary approaches including yoga, meditation, art therapy, and nutrition.",
    link: "/treatment-types/holistic-therapy",
  },
];


const Index = () => {
  // NEW_CTA_SYSTEM gate — gates the TrustRibbon (and any future
  // homepage-only conversion components). Other components self-gate.
  const newCtaEnabled = useNewCtaSystem();

  // Lazy-loaded data for below-fold sections
  const [seekerTestimonials, setSeekerTestimonials] = useState<any[]>([]);
  const [homeFaqs, setHomeFaqs] = useState<any[]>([]);

  // Trust-bar count-up animations. Animate once when the bar enters
  // the viewport. The hooks honor prefers-reduced-motion (set to the
  // final value immediately when the user prefers less motion).
  // Target = live approved-facility count in `public_facilities`
  // (~3,804 as of last SAMHSA ingest).
  const facilitiesCount = useCountUp({ to: 3800 });
  const statesCount = useCountUp({ to: 50 });
  // Geo-derived location string (e.g. "Boise, ID") forwarded to /concierge
  // so the intake form can prefill the visitor's preferred location without
  // asking them to retype it. Falls back gracefully when geo isn't ready.
  const homepageGeo = useGeoLocation();
  const homepageConciergeLocation =
    homepageGeo.city && homepageGeo.regionCode
      ? `${homepageGeo.city}, ${homepageGeo.regionCode}`
      : homepageGeo.regionCode || "";

  useEffect(() => {
    seekerTestimonialsPromise.then(setSeekerTestimonials);
    homeFaqsPromise.then(setHomeFaqs);
  }, []);

  return (
    <Layout>
      <SEO
        title="Find Drug & Alcohol Rehab Centers Near You"
        description="Search 3,800+ verified addiction treatment centers. Compare drug rehab, alcohol treatment, detox programs. Free insurance verification. 24/7 confidential help."
        canonical="/"
        keywords={[
          "drug rehab near me",
          "alcohol treatment centers",
          "addiction treatment directory",
          "rehab centers near me",
          "substance abuse treatment",
          "detox centers",
          "inpatient rehab",
          "outpatient treatment",
          "dual diagnosis treatment",
          "addiction help",
          "find rehab",
          "alcohol rehab",
        ]}
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "@id": "https://rehablookup.com/#webpage",
            name: "Find Addiction Treatment Centers Near You",
            description: "Search 3,800+ verified drug and alcohol rehab centers. Compare treatment options and find the right recovery program.",
            isPartOf: { "@id": "https://rehablookup.com/#website" },
            primaryImageOfPage: {
              "@type": "ImageObject",
              url: "https://rehablookup.com/og-image.jpg"
            },
            specialty: "Addiction Medicine",
          },
          {
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Treatment Options",
            description: "Types of addiction treatment programs available",
            numberOfItems: treatmentOptions.length,
            itemListElement: treatmentOptions.map((option, index) => ({
              "@type": "ListItem",
              position: index + 1,
              name: option.title,
              description: option.description,
              url: `https://rehablookup.com${option.link}`,
            })),
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Addiction Treatment Center Directory",
            serviceType: "Treatment Center Placement",
            provider: {
              "@type": "Organization",
              name: "RehabLookup",
            },
            areaServed: {
              "@type": "Country",
              name: "United States",
            },
            description: "Free service connecting individuals with verified addiction treatment centers",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
              description: "Free treatment center placement service",
            },
          },
        ]}
      />
      
      {/* Hero Section */}
      <section className="relative z-10 bg-primary">
        {/* Background Image - using img for better LCP */}
        <img 
          src={heroImage}
          alt=""
          role="presentation"
          className="absolute inset-0 w-full h-full object-cover object-center"
          width={1920}
          height={1080}
          fetchPriority="high"
          loading="eager"
          decoding="sync"
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-black/55 to-black/70" />

        {/* Content */}
        <div className="container relative py-10 md:py-12 lg:py-14 px-4 md:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Headline — outcome-led, conversion-tuned */}
            <h1 className="speakable-headline mb-3 font-display text-[1.875rem] font-bold leading-tight tracking-tight text-white sm:text-3xl md:text-4xl lg:text-[2.75rem] animate-fade-in">
              Find the Right Treatment & Rehab
            </h1>

            {/* Subheadline */}
            <p className="speakable-summary mb-4 md:mb-5 text-[15px] md:text-base text-white/90 animate-fade-in max-w-xl mx-auto leading-relaxed" style={{ animationDelay: "50ms" }}>
              Compare verified treatment centers and check your insurance coverage.
            </p>

            {/* Search Form - Directory Style */}
            <div className="animate-fade-in relative z-20" style={{ animationDelay: "100ms" }}>
              <SearchForm variant="directory" />
            </div>

            {/* Risk-reversal chip row — surfaces the strongest selling
                points right under the search. */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 animate-fade-in" style={{ animationDelay: "120ms" }}>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/15 ring-1 ring-emerald-400/25 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-100">
                100% free
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 ring-1 ring-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/85">
                Confidential
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/10 ring-1 ring-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white/85">
                24/7 help
              </span>
            </div>

            {/* Quick Links */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 animate-fade-in relative z-0" style={{ animationDelay: "150ms" }}>
              <Link
                to="/concierge"
                onClick={() => analytics.ctaClick("Get Free Help", "homepage_hero_quicklink")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-white hover:text-white underline underline-offset-4 transition-colors"
              >
                Talk to a placement specialist
              </Link>
              <span className="text-white/40">•</span>
              <Link
                to="/for-providers"
                className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white underline underline-offset-4 transition-colors"
              >
                List Your Treatment Center
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar — single source of truth for top-of-page trust signals.
          The light-background SocialProofBar that used to sit below this
          was stacking the same claims twice; merged its strongest two
          signals (geographic reach, HIPAA compliance) into this dark bar
          and dropped the duplicate. Same vertical padding as before —
          height is unchanged, only the content is denser. */}
      <section className="relative bg-primary border-y border-primary-foreground/10">
        <div className="container py-2 md:py-2.5 px-4 md:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 md:flex md:items-center md:justify-center md:gap-x-8 lg:gap-x-14">
            <div ref={facilitiesCount.ref as React.RefObject<HTMLDivElement>} className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent shrink-0" aria-hidden />
              <span className="text-sm md:text-base text-primary-foreground/90">
                {/* inline-block + min-w keeps the row from jittering while
                    the digit count grows from 1 → 5 during the count-up. */}
                <strong className="inline-block min-w-[3.5em] text-right font-semibold text-white tabular-nums">
                  {facilitiesCount.value.toLocaleString()}+
                </strong>{" "}
                Verified Facilities
              </span>
            </div>
            <div ref={statesCount.ref as React.RefObject<HTMLDivElement>} className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent shrink-0" aria-hidden />
              <span className="text-sm md:text-base text-primary-foreground/90">
                <strong className="inline-block min-w-[2.5em] text-right font-semibold text-white tabular-nums">
                  {statesCount.value === 50 ? "All 50" : statesCount.value}
                </strong>{" "}
                States Covered
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-accent shrink-0" aria-hidden />
              <span className="text-sm md:text-base font-medium text-primary-foreground/90">HIPAA Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent shrink-0" aria-hidden />
              <span className="text-sm md:text-base text-primary-foreground/90">
                <strong className="font-semibold text-white">Free</strong> 24/7 Help
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* TrustStrip moved to /concierge — see ConciergeLanding.tsx */}

      {/* Calm reassurance ribbon — only renders when the
          NEW_CTA_SYSTEM flag is on. Sits directly below the navy
          trust bar so the seeker sees one quiet block of facts
          before the directory content. */}
      {newCtaEnabled && <TrustRibbon />}

      {/* Featured rail — bucket (homepage, 'national'). 6 slots. Silent
          absence when no Featured subscribers nationwide. Distinct from
          HomepageFeaturedSection (legacy editorial Featured strip). */}
      <section className="pt-1 pb-10 md:pt-2 md:pb-12 bg-background">
        <div className="container px-4 md:px-6 lg:px-8">
          <FeaturedRail
            placement_type="homepage"
            placement_value="national"
          />
        </div>
      </section>

      {/* Featured Centers — primary directory focal point (2-col desktop,
          1-col mobile, 10–12 verified facilities, single CTA). */}
      <HomepageFeaturedSection />

      {/* Browse by Category — directly under Featured per the directory
          re-focus. The taxonomy entry point lives here so the homepage
          flows Featured → categories → why-us → near-you. */}
      <section className="py-10 md:py-12 lg:py-20 bg-muted/40 border-y border-border/50">
        <div className="container px-4 md:px-6 lg:px-8">
          {/* Section Header */}
          <div className="mb-6 md:mb-8 lg:mb-10 text-center">
            <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-muted-foreground">Browse by Category</span>
            <h2 className="mt-1.5 md:mt-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
              Treatment Programs
            </h2>
          </div>

          {/* Options Grid - Optimized for tablet with 2 columns */}
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentOptions.map((option, index) => (
              <Link
                key={option.title}
                to={option.link}
                className="group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="relative flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:-translate-y-1 overflow-hidden">
                  {/* Subtle background gradient on hover */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  
                  {/* Icon with scale and rotate */}
                  <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all duration-300 group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-md">
                    <option.icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                  </div>
                  
                  <div className="relative flex-1 min-w-0">
                    <h3 className="font-semibold text-[15px] md:text-base text-foreground transition-colors duration-200 group-hover:text-primary">
                      {option.title}
                    </h3>
                    <p className="mt-0.5 text-sm md:text-base text-muted-foreground line-clamp-2 transition-colors duration-200 group-hover:text-muted-foreground/80">
                      {option.description}
                    </p>
                  </div>
                  
                  {/* Arrow with enhanced animation */}
                  <div className="relative mt-1 flex items-center">
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-300 group-hover:text-primary group-hover:translate-x-1" />
                  </div>
                  
                  {/* Bottom accent line */}
                  <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-primary to-accent transition-all duration-300 group-hover:w-full" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Find Treatment Center by State — replaces the prior "Trusted
          by Families" block. The 4-tile stats strip lives on inside
          FindByStateSection (Centers / States / Families / Support). */}
      <FindByStateSection />

      {/* Insurance Coverage Section — moved here from above per the
          directory-refocus pass so seekers see the verification ramp
          right before reading testimonials. */}
      <section className="py-10 md:py-12 lg:py-16 bg-gradient-to-b from-muted/20 to-muted/30">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 lg:p-10 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-6 lg:gap-12">
              {/* Left Content */}
              <div className="md:max-w-xs lg:max-w-sm text-center md:text-left shrink-0">
                <div className="mb-2 md:mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
                  <CheckCircle className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-primary">
                    Insurance Verification
                  </span>
                </div>
                <h2 className="mb-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-[1.75rem]">
                  Are You Covered?
                </h2>
                <p className="mb-4 md:mb-5 text-[15px] md:text-base text-muted-foreground leading-relaxed">
                  Most insurance plans cover addiction treatment. Check your benefits in minutes.
                </p>
                <Link to="/insurance">
                  <Button size="default" className="gap-2 font-semibold shadow-md hover:shadow-lg transition-shadow md:size-lg">
                    Check Your Coverage
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              {/* Insurance Logos — 5 named carriers, container-less.
                  The five logos don't share a normalized artwork bounding
                  box: Aetna's SVG fills its viewBox densely, while
                  Cigna / Humana / Medicaid use a 200×50 viewBox whose
                  content occupies only the left ~50–70%. Plain
                  `object-contain` would render those visually ~half the
                  size of Aetna. Per-logo `transform: scale()` brings
                  their rendered widths roughly to Aetna's. Optum has no
                  SVG asset in the repo, so it renders as styled
                  brand-color text. */}
              <div className="flex-1">
                <div
                  className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4"
                  aria-label="Insurance carriers accepted"
                >
                  {INSURANCE_LOGOS.map((logo, i) => (
                    <div
                      key={logo.alt}
                      className={cn(
                        "group flex h-20 md:h-24 items-center justify-center transition-transform duration-200 hover:scale-[1.04]",
                        i === 4 && "col-span-2 md:col-span-1",
                      )}
                    >
                      {logo.kind === "text" ? (
                        <span
                          className="text-3xl md:text-4xl font-bold tracking-tight"
                          style={{ color: logo.color }}
                        >
                          {logo.label}
                        </span>
                      ) : (
                        <img
                          src={logo.src}
                          alt={logo.alt}
                          className="h-14 md:h-16 w-auto max-w-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                    </div>
                  ))}
                </div>

                {/* + more carriers link — routes to the full carrier list. */}
                <div className="mt-4 text-center md:text-right">
                  <Link
                    to="/insurance"
                    className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                  >
                    + more carriers accepted
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <LazySection fallbackHeight="400px">
        <Suspense fallback={<div style={{ minHeight: "400px" }} aria-hidden="true" />}>
          <TestimonialsSection
            testimonials={seekerTestimonials}
            title="Real Stories from Families We've Helped"
            subtitle="Hear from people who found the right treatment through RehabLookup"
          />
        </Suspense>
      </LazySection>

      {/* For Treatment Providers CTA — repurposed from the previous
          International Patients block on the homepage. The dedicated
          /us-rehab/international-patients page remains untouched and
          is still reached via the international banner + footer. */}
      <LazySection fallbackHeight="380px">
        <Suspense fallback={<div style={{ minHeight: "380px" }} aria-hidden="true" />}>
          <ProvidersCTA />
        </Suspense>
      </LazySection>

      {/* Find Treatment Near You - SEO Section */}
      <section className="py-10 md:py-12 lg:py-20 border-t border-border/50">
        <div className="container px-4 md:px-6 lg:px-8">
          <div className="mb-6 md:mb-8 lg:mb-10 text-center">
            <div className="mb-1.5 md:mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1">
              <Navigation className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs md:text-xs font-semibold uppercase tracking-wider text-primary">
                Near You
              </span>
            </div>
            <h2 className="mt-1.5 md:mt-2 font-display text-xl md:text-2xl font-bold text-foreground lg:text-3xl">
              Find Treatment Near You
            </h2>
            <p className="mt-1.5 md:mt-2 text-[15px] md:text-base text-muted-foreground max-w-lg mx-auto">
              Get location-based treatment options with real-time availability
            </p>
          </div>

          {/* Near me grid - 2 columns on mobile, 3 on tablet, 3 on desktop */}
          <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-3 max-w-4xl mx-auto">
            <Link
              to="/drug-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Pill className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Drug Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Addiction treatment centers
                </p>
              </div>
            </Link>

            <Link
              to="/alcohol-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Activity className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Alcohol Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Alcohol treatment programs
                </p>
              </div>
            </Link>

            <Link
              to="/detox-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Detox Centers Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Medical detox facilities
                </p>
              </div>
            </Link>

            <Link
              to="/dual-diagnosis-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Brain className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Dual Diagnosis Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Mental health + addiction
                </p>
              </div>
            </Link>

            <Link
              to="/inpatient-rehab-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Home className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Inpatient Rehab Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  Residential treatment
                </p>
              </div>
            </Link>

            <Link
              to="/outpatient-near-me"
              className="group relative flex flex-col items-center gap-2 md:gap-3 rounded-xl border border-border bg-card p-4 md:p-5 text-center transition-all hover:border-primary/50 hover:shadow-lg hover:-translate-y-1"
            >
              <div className="flex h-10 w-10 md:h-11 md:w-11 items-center justify-center rounded-full bg-primary/10 text-primary transition-all group-hover:bg-primary group-hover:text-primary-foreground group-hover:scale-110">
                <Stethoscope className="h-4 w-4 md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors text-sm md:text-base">
                  Outpatient Near Me
                </h3>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  IOP & PHP programs
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* SEO Internal Links Section */}
      <LazySection fallbackHeight="600px">
        <section className="py-10 md:py-12 lg:py-16 bg-muted/30 border-t">
          <div className="container px-4 md:px-6 lg:px-8 space-y-8 md:space-y-10">
            {/* Quick Links to Key Pages */}
            <div>
              <h3 className="text-lg md:text-xl font-semibold text-foreground mb-4">
                Explore RehabLookup
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {[
                  { name: "How It Works", href: "/how-it-works" },
                  { name: "About Us", href: "/about" },
                  { name: "Insurance Guide", href: "/insurance" },
                  { name: "FAQs", href: "/faq" },
                  { name: "Contact Us", href: "/contact" },
                  { name: "For Providers", href: "/for-providers" },
                  { name: "Treatment Types", href: "/treatment-types" },
                  { name: "All Locations", href: "/locations" },
                  { name: "Cost Estimator", href: "/cost-estimator" },
                  { name: "Provider Resources", href: "/provider-resources" },
                  { name: "Concierge Service", href: "/concierge" },
                  { name: "Search Centers", href: "/search-results" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-sm md:text-base text-muted-foreground hover:text-primary transition-colors py-1"
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <Suspense fallback={<div style={{ minHeight: "600px" }} aria-hidden="true" />}>
              <InternalLinkBlock
                title="Find Treatment by State"
                variant="states"
              />
              <InternalLinkBlock
                title="Treatment Programs"
                variant="treatments"
              />
              <InternalLinkBlock
                title="Insurance Coverage Guides"
                variant="insurance"
              />
              <InternalLinkBlock
                title="Find Treatment Near You"
                variant="nearme"
              />
            </Suspense>
          </div>
        </section>
      </LazySection>

      {/* End-of-page recovery-journey CTA — two-column band with a
          sunrise illustration on the right and a tel-first dual CTA
          on the left. Replaced the previous lightweight rounded-card
          to give the scroll-end more visual weight. */}
      <Suspense fallback={<div style={{ minHeight: "440px" }} aria-hidden="true" />}>
        <RecoveryJourneyCTA conciergeLocation={homepageConciergeLocation} />
      </Suspense>

      <LazySection fallbackHeight="300px">
        <Suspense fallback={<div style={{ minHeight: "300px" }} aria-hidden="true" />}>
          {homeFaqs.length > 0 && <PageFAQ faqs={homeFaqs} className="border-t border-border bg-muted/30" />}
        </Suspense>
      </LazySection>
    </Layout>
  );
};

export default Index;
