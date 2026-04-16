import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
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
  children,
}: SEOLandingTemplateProps) {
  const displayFacilities = facilities.slice(0, 12);

  return (
    <Layout>
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        structuredData={structuredData}
        breadcrumbs={breadcrumbs}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="container relative z-10 py-12 md:py-16 lg:py-20">
          {/* Breadcrumbs */}
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="mb-6" aria-label="Breadcrumb">
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

          {heroBadge && (
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-4">
              <Shield className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-white">{heroBadge}</span>
            </div>
          )}

          <h1 className="text-3xl md:text-4xl font-bold text-white max-w-3xl leading-tight speakable-headline">
            {heroTitle}
          </h1>

          <p className="mt-4 text-lg text-white/80 max-w-2xl">
            {heroSubtitle}
          </p>

          {heroLocation && (
            <div className="mt-4 inline-flex items-center gap-2 text-white/70">
              <MapPin className="h-4 w-4" />
              <span className="text-sm">{heroLocation}</span>
            </div>
          )}

          {/* Trust signals */}
          <div className="mt-8 flex flex-wrap gap-6">
            {[
              { icon: CheckCircle, text: "Verified Facilities" },
              { icon: Shield, text: "Insurance Accepted" },
              { icon: Phone, text: "24/7 Support" },
              { icon: Star, text: "Accredited Programs" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white/80">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">{text}</span>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to={ctaButtonLink || "/concierge"}>
                {ctaButtonText}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/rehab-centers">
                <Search className="h-4 w-4 mr-1" />
                Browse All Centers
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Intro Content */}
      {introContent && (
        <section className="py-10 md:py-12 bg-background">
          <div className="container max-w-4xl">
            <div className="prose prose-lg max-w-none text-muted-foreground">
              <p className="text-base md:text-lg leading-relaxed">{introContent}</p>
            </div>
            {/* Quick action cards for engagement */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
              <Link to="/concierge" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Free Consultation</p>
                  <p className="text-xs text-muted-foreground">Speak with an advisor</p>
                </div>
              </Link>
              <Link to="/insurance" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Verify Insurance</p>
                  <p className="text-xs text-muted-foreground">Check your coverage</p>
                </div>
              </Link>
              <Link to="/rehab-centers" className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:border-primary/40 hover:shadow-sm transition-all group">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Search className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">Search Directory</p>
                  <p className="text-xs text-muted-foreground">Browse all centers</p>
                </div>
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* Content Sections */}
      {sections && sections.length > 0 && (
        <section className="py-12 bg-muted/30">
          <div className="container max-w-4xl">
            <div className="space-y-10">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <h2 className="text-2xl font-bold text-foreground mb-4">{section.heading}</h2>
                  <p className="text-base text-muted-foreground leading-relaxed">{section.content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* What to Expect + Benefits */}
      {(whatToExpect || benefits) && (
        <section className="py-12 bg-background">
          <div className="container">
            <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {whatToExpect && (
                <div className="rounded-2xl border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">What to Expect</h2>
                  </div>
                  <ul className="space-y-3">
                    {whatToExpect.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {benefits && (
                <div className="rounded-2xl border bg-card p-6 md:p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <Heart className="h-5 w-5 text-accent" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground">Key Benefits</h2>
                  </div>
                  <ul className="space-y-3">
                    {benefits.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <Star className="h-5 w-5 text-accent shrink-0 mt-0.5" />
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

      {/* Facility Listings */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
              <Building2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {facilityCount ?? facilities.length} Treatment Centers
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Verified {title}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Each facility is verified for licensing, accreditation, and quality of care.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : displayFacilities.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
              {displayFacilities.map((facility) => (
                <TreatmentCenterCard
                  key={facility.id}
                  center={facility}
                  featured={facility.featured}
                  variant="compact"
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 rounded-2xl border bg-card max-w-2xl mx-auto">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Treatment Centers Coming Soon
              </h3>
              <p className="text-muted-foreground mb-2">
                We're actively partnering with accredited facilities in this area. In the meantime, our concierge team can match you with nearby verified programs.
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
          )}

          {showMoreLink && displayFacilities.length > 0 && (
            <div className="text-center mt-8">
              <Button asChild variant="outline" size="lg">
                <Link to={showMoreLink}>
                  View All Centers
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      </section>

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
