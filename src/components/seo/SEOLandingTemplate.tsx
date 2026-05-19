import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TrustBar } from "@/components/seo/TrustBar";
import { ConversionSection } from "@/components/seo/ConversionSection";
import { ComparisonSection } from "@/components/seo/ComparisonSection";
import { AreaWaitlistCapture } from "@/components/seo/AreaWaitlistCapture";
import { InlineMiniIntake } from "@/components/seo/InlineMiniIntake";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  nearMeLinks,
  topStateLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";
import {
  MapPin,
  ArrowRight,
  Phone,
  Shield,
  CheckCircle,
  Building2,
  Star,
  Clock,
  Heart,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TreatmentCenter } from "@/data/treatmentCenters";

interface SEOLandingTemplateProps {
  // SEO
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical?: string;
  noindex?: boolean;
  structuredData?: object;
  breadcrumbs?: { name: string; url: string }[];

  // Hero
  heroTitle: string;
  heroSubtitle: string;
  heroLocation?: string;
  heroBadge?: string;

  // Content
  introContent?: string;
  sections?: { heading: string; content: string }[];
  whatToExpect?: string[];
  benefits?: string[];

  // Facilities
  facilities: (TreatmentCenter & {
    slug?: string | null;
    isFromDatabase?: boolean;
    logo_url?: string | null;
    gallery_urls?: string[] | null;
    isPro?: boolean;
    verified?: boolean | null;
  })[];
  isLoading: boolean;
  facilityCount?: number;
  showMoreLink?: string;

  // FAQs
  faqs: { question: string; answer: string }[];
  faqTreatmentType: string;
  faqLocation?: { city?: string; state?: string };

  // Internal links
  relatedCityLinks?: { title: string; href: string }[];
  relatedStateLinks?: { title: string; href: string }[];
  showTreatmentLinks?: boolean;
  showInsuranceLinks?: boolean;
  showNearMeLinks?: boolean;

  // CTA
  ctaTitle?: string;
  ctaSubtitle?: string;
  ctaButtonText?: string;
  ctaButtonLink?: string;

  // Waitlist (shown only when there are zero facilities)
  waitlistAreaSlug?: string;
  waitlistAreaLabel?: string;
  waitlistCity?: string;
  waitlistState?: string;
  waitlistTreatmentType?: string;

  // Extra content (e.g. SmartInternalLinks) rendered before internal linking
  children?: React.ReactNode;
}

export function SEOLandingTemplate({
  title,
  metaTitle,
  metaDescription,
  canonical,
  noindex = false,
  structuredData,
  breadcrumbs,
  heroTitle,
  heroSubtitle,
  heroLocation,
  heroBadge,
  introContent,
  sections,
  whatToExpect,
  benefits,
  facilities,
  isLoading,
  facilityCount,
  showMoreLink,
  faqs,
  faqTreatmentType,
  faqLocation,
  relatedCityLinks,
  relatedStateLinks,
  showTreatmentLinks = true,
  showInsuranceLinks = true,
  showNearMeLinks = false,
  ctaTitle = "Ready to Start Your Recovery?",
  ctaSubtitle = "Connect with accredited treatment facilities that match your needs. Our team is available 24/7.",
  ctaButtonText = "Get Help Now",
  ctaButtonLink = "/concierge",
  waitlistAreaSlug,
  waitlistAreaLabel,
  waitlistCity,
  waitlistState,
  waitlistTreatmentType,
  children,
}: SEOLandingTemplateProps) {
  const displayFacilities = facilities.slice(0, 12);
  // Batch fetch side-table data (services, insurance, age groups,
  // accreditations) for every visible card — 4 IN-list queries instead
  // of 4×N per card, so the new FacilityCard renders with rich data
  // without a per-row round-trip.
  const cardIds = displayFacilities.map((f) => f.id);
  const { data: cardChildData } = useFacilityChildData(cardIds);

  return (
    <Layout>
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        noindex={noindex}
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />

      {/* Hero — EDITORIAL treatment, distinct from State / City /
          County / Treatment-State directory heroes. SEO landing pages
          (BestInStatePage, TreatmentHubPage, InsuranceStatePage,
          CategoryHub, …) act as curated "best of" indexes rather than
          raw browse pages, so the hero leans premium / magazine:

            1. Darker slate base + AMBER eyebrow accent (instead of
               white-on-primary). Reads as editorial / ranked rather
               than utility directory.
            2. Display-font H1 with generous leading; larger than the
               other directory heroes (text-4xl → 5xl on lg).
            3. Trust signals collapse into a compact AMBER-accented
               row pinned right under the title (was a horizontal
               6-icon wall taking 80px).
            4. Bottom strip carries LocationStatTile metrics for
               visual consistency with the rest of the directory
               network. */}
      <section className="relative overflow-hidden border-b border-white/5 bg-gradient-to-br from-slate-950 via-slate-900 to-primary/70">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(245,158,11,0.08),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImRvdHMiIHdpZHRoPSIzMCIgaGVpZ2h0PSIzMCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9InJnYmEoMjU1LDI1NSwyNTUsMC4wMykiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZG90cykiLz48L3N2Zz4=')] opacity-100" />

        <div className="container relative z-10 py-10 md:py-14 lg:py-16">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-5" aria-label="Breadcrumb">
              <ol className="flex flex-wrap items-center gap-1.5 text-sm">
                {breadcrumbs.map((crumb, idx) => (
                  <li key={crumb.url} className="flex items-center gap-1.5">
                    {idx > 0 && <span className="text-white/40">/</span>}
                    {idx === breadcrumbs.length - 1 ? (
                      <span className="text-white font-medium">{crumb.name}</span>
                    ) : (
                      <Link to={crumb.url} className="text-white/70 hover:text-white transition-colors">
                        {crumb.name}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-100 backdrop-blur-sm ring-1 ring-amber-400/30">
              <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" />
              {heroBadge ?? "Curated & Verified"}
            </div>

            <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.1] speakable-headline">
              {heroTitle}
            </h1>

            <p className="mt-4 text-base md:text-lg text-white/80 max-w-2xl leading-relaxed">
              {heroSubtitle}
            </p>

            {heroLocation && (
              <div className="mt-3 inline-flex items-center gap-2 text-white/65">
                <MapPin className="h-3.5 w-3.5" />
                <span className="text-sm">{heroLocation}</span>
              </div>
            )}

            {/* Compact trust row — amber accent matches the editorial
                eyebrow. Tighter visual rhythm than the previous
                6-icon wall. */}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-white/75">
              {[
                { icon: CheckCircle, text: "Verified" },
                { icon: Shield, text: "Insurance" },
                { icon: Phone, text: "24/7" },
                { icon: Star, text: "Accredited" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon className="h-3.5 w-3.5 text-amber-400" />
                  <span className="text-xs font-medium uppercase tracking-wider">{text}</span>
                </div>
              ))}
            </div>

            <div className="mt-7 flex flex-col sm:flex-row gap-3">
              <Button asChild variant="hero" size="lg" className="gap-2 shadow-lg shadow-black/30">
                <Link to={ctaButtonLink || "/concierge"}>
                  {ctaButtonText}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="hero-secondary"
                size="lg"
                className="gap-2 border-white/25 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
              >
                <Link to="/rehab-centers">
                  <Search className="h-4 w-4" />
                  Browse All Centers
                </Link>
              </Button>
            </div>
          </div>

          {/* Stat strip — LocationStatTile glass-effect, matches the
              State / City / County / Treatment heroes' visual
              vocabulary. Only renders when the page passes counts
              worth showing. */}
          {(facilityCount !== undefined || facilities.length > 0) && (
            <div className="mt-9 grid grid-cols-2 md:grid-cols-3 gap-3 max-w-3xl">
              <LocationStatTile
                label="Verified Centers"
                value={isLoading ? "—" : (facilityCount ?? facilities.length).toLocaleString()}
                icon={Building2}
              />
              <LocationStatTile
                label="24/7 Concierge"
                value="Live"
                icon={Phone}
              />
              <div className="hidden md:block">
                <LocationStatTile
                  label="Insurance"
                  value="Most plans"
                  icon={Shield}
                />
              </div>
            </div>
          )}

          {/* Inline mini-intake — moved DOWN out of the hero proper so
              the hero stays tight + editorial. Lives in its own band
              with a thin top border to delineate the conversion
              surface. Same component, same conversion source. */}
        </div>

        <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="container py-5">
            <div className="max-w-2xl">
              <InlineMiniIntake source="seo_landing_hero" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <TrustBar />

      {/* Facility Listings — directory-style, immediately below the hero/trust bar.
          Previously these sat at position 6 (below ~3 blog-style prose sections),
          which made the page read like an article with listings buried. Moving
          them up here makes the page read like a directory — Yelp/HealthGrades
          pattern, not Medium. */}
      <section className="py-10 md:py-12 bg-muted/30">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-6 max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-2">
                <Building2 className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-primary">
                  {facilityCount ?? facilities.length} Treatment Centers
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Verified {title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Each facility verified for licensing, accreditation, and quality of care.
              </p>
            </div>
            {showMoreLink && displayFacilities.length > 0 && (
              <Button asChild variant="outline" size="sm">
                <Link to={showMoreLink}>
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            )}
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : displayFacilities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {displayFacilities.map((facility) => {
                // Unified facility card visual — matches /rehab-centers.
                const f = facility as unknown as Record<string, unknown>;
                const center = {
                  id: String(f.id),
                  name: String(f.name ?? ""),
                  slug: (f.slug as string | null) ?? null,
                  city: String(f.city ?? ""),
                  state: String(f.state ?? ""),
                  zipCode: "",
                  address: "",
                  phone: String(f.phone ?? ""),
                  description: String(f.description ?? ""),
                  programOverview: "",
                  featured: Boolean(f.hasFeaturedSubscription ?? f.featured),
                  rating: null,
                  reviewCount: 0,
                  amenities: [],
                  image: null,
                  isFromDatabase: true,
                  logo_url:
                    (f.logo_url as string | null) ??
                    (f.logoUrl as string | null) ??
                    null,
                  verified: (f.verified as boolean | null) ?? null,
                  facilityType:
                    (f.facility_type as string | null) ??
                    (f.facilityType as string | null) ??
                    null,
                  treatmentTypes: cardChildData?.services.get(facility.id) ?? [],
                  insuranceAccepted: cardChildData?.insurance.get(facility.id) ?? [],
                } as Parameters<typeof TreatmentCenterCard>[0]["center"];
                return (
                  <TreatmentCenterCard
                    key={facility.id}
                    center={center}
                    featured={Boolean(f.hasFeaturedSubscription ?? f.featured)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              <div className="text-center py-12 rounded-2xl border bg-card">
                <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Talk to a Placement Advisor
                </h3>
                <p className="text-muted-foreground mb-2">
                  Our licensed placement advisors will personally match you with verified treatment centers — typically within 24 hours.
                </p>
                <p className="text-sm text-muted-foreground mb-6">
                  Over 16,000 treatment centers are available nationwide through our network.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button asChild variant="default">
                    <Link to="/concierge">Get Matched Now</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/rehab-centers">Browse Nationwide</Link>
                  </Button>
                </div>
              </div>

              {waitlistAreaSlug && (
                <AreaWaitlistCapture
                  areaSlug={waitlistAreaSlug}
                  areaLabel={waitlistAreaLabel}
                  city={waitlistCity}
                  state={waitlistState}
                  treatmentType={waitlistTreatmentType}
                />
              )}
            </div>
          )}
        </div>
      </section>

      {/* Comparison — sits with the facility listings as part of the directory view. */}
      <ComparisonSection facilities={facilities} location={heroLocation} />

      {/* About / Quick Facts panel — replaces the previous blog-prose Intro Content
          section. Same data (introContent + the three quick-action cards), but laid
          out as a compact fact-panel beside action cards so it reads like a
          directory's "About this location" pane, not an editorial lede. */}
      {introContent && (
        <section className="py-10 bg-background">
          <div className="container max-w-6xl">
            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border bg-card p-6 md:p-7">
                <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  About This Directory
                </h2>
                <p className="text-sm md:text-base text-muted-foreground leading-relaxed">{introContent}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <Link to="/concierge" className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Free Consultation</p>
                    <p className="text-xs text-muted-foreground truncate">Speak with an advisor</p>
                  </div>
                </Link>
                <Link to="/insurance" className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <Shield className="h-4 w-4 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Verify Insurance</p>
                    <p className="text-xs text-muted-foreground truncate">Check your coverage</p>
                  </div>
                </Link>
                <Link to="/rehab-centers" className="flex items-center gap-3 rounded-xl border bg-card p-3 hover:border-primary/40 hover:shadow-sm transition-all group">
                  <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Search className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Search Directory</p>
                    <p className="text-xs text-muted-foreground truncate">Browse all centers</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Topic info cards — previous "Content Sections" rendered as long-form
          essay (h2 + paragraph repeated). Re-rendered as a directory-style
          grid of compact info cards so each section reads as a sidebar fact,
          not a chapter. */}
      {sections && sections.length > 0 && (
        <section className="py-10 bg-muted/30">
          <div className="container max-w-6xl">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {sections.map((section, idx) => (
                <div key={idx} className="rounded-xl border bg-card p-5">
                  <h3 className="text-sm font-bold text-foreground mb-2">{section.heading}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What to Expect + Benefits — kept as cards but now below the facility
          listings, framed as supporting fact panels rather than competing for
          above-the-fold attention. */}
      {(whatToExpect || benefits) && (
        <section className="py-10 bg-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
              {whatToExpect && (
                <div className="rounded-2xl border bg-card p-6 md:p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">What to Expect</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {whatToExpect.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {benefits && (
                <div className="rounded-2xl border bg-card p-6 md:p-7">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Heart className="h-4 w-4 text-accent" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">Key Benefits</h2>
                  </div>
                  <ul className="space-y-2.5">
                    {benefits.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <Star className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Mid-page inline intake — catches visitors who scrolled past the hero */}
      <section className="py-10 bg-muted/30">
        <div className="container max-w-2xl">
          <p className="text-center text-sm font-semibold text-muted-foreground mb-4 uppercase tracking-wide">Get Personalized Help — Free &amp; Confidential</p>
          <InlineMiniIntake source="seo_landing_mid" defaultTreatment="" />
        </div>
      </section>

      {/* Conversion Section */}
      <ConversionSection location={heroLocation} />

      {/* CTA Section */}
      <section className="py-12 bg-background">
        <div className="container max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{ctaTitle}</h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">{ctaSubtitle}</p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="hero-light" size="lg">
                <Link to={ctaButtonLink || "/concierge"}>
                  <Phone className="h-4 w-4 mr-1" />
                  {ctaButtonText}
                </Link>
              </Button>
              <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/insurance">Check Insurance Coverage</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      {faqs.length > 0 && (
        <TreatmentFAQSection
          faqs={faqs}
          treatmentType={faqTreatmentType}
          location={faqLocation}
        />
      )}

      {/* Related City Links */}
      {relatedCityLinks && relatedCityLinks.length > 0 && (
        <section className="py-10 bg-muted/30">
          <div className="container max-w-5xl">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Explore Nearby Cities
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {relatedCityLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related State Links */}
      {relatedStateLinks && relatedStateLinks.length > 0 && (
        <section className="py-10 bg-background">
          <div className="container max-w-5xl">
            <h2 className="text-xl font-bold text-foreground mb-6">
              Explore by State
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {relatedStateLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Extra content (SmartInternalLinks etc.) */}
      {children}

      {/* Internal Linking */}
      <InternalLinkingSection
        groups={[
          ...(showTreatmentLinks ? [{ title: "Treatment Types", links: treatmentTypeLinks }] : []),
          ...(showNearMeLinks ? [{ title: "Treatment Near You", links: nearMeLinks }] : []),
          ...(showInsuranceLinks ? [{ title: "Insurance Coverage", links: insuranceLinks }] : []),
          { title: "Browse by State", links: topStateLinks },
          { title: "Recovery Resources", links: resourceLinks },
        ]}
      />
    </Layout>
  );
}
