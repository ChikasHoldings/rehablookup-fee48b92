import { Link } from "react-router-dom";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, CheckCircle, TrendingUp, Users, Shield, Zap, Building2, Phone, Star, Clock, ChevronRight } from "lucide-react";
import { ProviderStickyCTA } from "@/components/provider-guides/ProviderStickyCTA";

interface PageImage {
  src: string;
  alt: string;
  caption?: string;
}

interface SEOSection {
  heading: string;
  content: string;
  bullets?: string[];
}

interface ProviderSEOPageProps {
  title: string;
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  keywords: string[];
  heroHeadline: string;
  heroSubheadline: string;
  sections: SEOSection[];
  ctaHeadline?: string;
  ctaSubheadline?: string;
  images?: [PageImage, PageImage];
}

const relatedPages = [
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", desc: "Fill beds faster with proven strategies", tags: ["admissions", "growth", "patients"] },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", desc: "Build a sustainable admissions pipeline", tags: ["admissions", "growth", "pipeline"] },
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "What actually works in 2026", tags: ["marketing", "strategy", "growth"] },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", desc: "Quality leads that convert", tags: ["leads", "admissions", "growth"] },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", desc: "Data-driven census growth", tags: ["admissions", "census", "growth"] },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", desc: "15 actionable ideas", tags: ["marketing", "ideas", "strategy"] },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", desc: "Build channels that compound", tags: ["patients", "admissions", "channels"] },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads", desc: "Ethical lead gen for BH", tags: ["leads", "behavioral", "ethics"] },
  { href: "/provider-guides/rehab-center-seo", label: "Rehab SEO", desc: "Rank higher on Google organically", tags: ["seo", "marketing", "digital"] },
  { href: "/provider-guides/drug-rehab-advertising", label: "Rehab Advertising", desc: "Ethical advertising strategies", tags: ["advertising", "marketing", "ethics"] },
  { href: "/provider-guides/rehab-census-management", label: "Census Management", desc: "Maintain 90%+ occupancy", tags: ["census", "operations", "admissions"] },
  { href: "/provider-guides/treatment-center-referral-sources", label: "Referral Sources", desc: "Top 10 referral channels", tags: ["referrals", "channels", "growth"] },
  { href: "/provider-guides/how-to-open-a-rehab-center", label: "Open a Rehab Center", desc: "Complete startup guide", tags: ["startup", "operations", "compliance"] },
  { href: "/provider-guides/rehab-insurance-verification", label: "Insurance Verification", desc: "Master the VOB process", tags: ["insurance", "admissions", "operations"] },
  { href: "/provider-guides/iop-marketing-strategies", label: "IOP Marketing", desc: "Fill your outpatient groups", tags: ["iop", "marketing", "outpatient"] },
  { href: "/provider-guides/detox-center-marketing", label: "Detox Marketing", desc: "Crisis-point patient acquisition", tags: ["detox", "marketing", "patients"] },
  { href: "/provider-guides/sober-living-marketing", label: "Sober Living Marketing", desc: "Maintain full occupancy", tags: ["sober-living", "marketing", "census"] },
  { href: "/provider-guides/rehab-reputation-management", label: "Reputation Management", desc: "Build trust with reviews", tags: ["reputation", "reviews", "trust"] },
  { href: "/provider-guides/treatment-center-staffing-guide", label: "Staffing Guide", desc: "Build a winning clinical team", tags: ["staffing", "operations", "clinical"] },
  { href: "/provider-guides/rehab-accreditation-guide", label: "Accreditation Guide", desc: "CARF & Joint Commission", tags: ["accreditation", "compliance", "operations"] },
  { href: "/provider-guides/substance-abuse-treatment-marketing", label: "SUD Marketing", desc: "Complete growth playbook", tags: ["marketing", "strategy", "growth"] },
  { href: "/provider-guides/mat-clinic-marketing", label: "MAT Marketing", desc: "Grow your MAT program", tags: ["mat", "marketing", "clinical"] },
  { href: "/provider-guides/treatment-center-website-design", label: "Website Design", desc: "Convert visitors to admissions", tags: ["website", "digital", "marketing"] },
  { href: "/provider-guides/rehab-compliance-guide", label: "Compliance Guide", desc: "HIPAA & 42 CFR Part 2", tags: ["compliance", "operations", "legal"] },
  { href: "/provider-guides/rehab-google-business-profile", label: "Google Business Profile", desc: "Dominate local search", tags: ["seo", "digital", "marketing"] },
  { href: "/provider-guides/rehab-patient-retention", label: "Patient Retention", desc: "Reduce AMA rates", tags: ["retention", "clinical", "operations"] },
  { href: "/provider-guides/rehab-email-marketing", label: "Email Marketing", desc: "Nurture leads to admissions", tags: ["email", "marketing", "leads"] },
  { href: "/provider-guides/telehealth-addiction-treatment", label: "Telehealth Programs", desc: "Launch virtual IOP & MAT", tags: ["telehealth", "clinical", "iop"] },
  { href: "/provider-guides/rehab-social-media-marketing", label: "Social Media Marketing", desc: "Build trust on social", tags: ["social", "marketing", "digital"] },
  { href: "/provider-guides/dual-diagnosis-treatment-marketing", label: "Dual Diagnosis Marketing", desc: "Co-occurring disorder growth", tags: ["dual-diagnosis", "marketing", "clinical"] },
  { href: "/provider-guides/rehab-admissions-team-training", label: "Admissions Training", desc: "Convert more calls", tags: ["admissions", "training", "operations"] },
  { href: "/provider-guides/rehab-pay-per-click-advertising", label: "PPC Advertising", desc: "Reduce cost per admission", tags: ["ppc", "advertising", "digital"] },
  { href: "/provider-guides/rehab-content-marketing", label: "Content Marketing", desc: "Drive organic admissions", tags: ["content", "marketing", "seo"] },
  { href: "/provider-guides/rehab-interventionist-partnerships", label: "Interventionist Partnerships", desc: "High-value referral network", tags: ["referrals", "partnerships", "growth"] },
  { href: "/provider-guides/best-rehab-listing-platforms", label: "Listing Platforms 2026", desc: "Compare top directories", tags: ["directories", "leads", "strategy"] },
  { href: "/provider-guides/exclusive-vs-shared-leads", label: "Exclusive vs Shared Leads", desc: "Lead model comparison", tags: ["leads", "strategy", "admissions"] },
  { href: "/provider-guides/how-to-choose-a-rehab-directory", label: "Choose a Directory", desc: "Evaluation framework", tags: ["directories", "strategy", "leads"] },
];

/**
 * Returns the most relevant related guides for a given page,
 * scored by shared tags. Avoids showing every single guide.
 */
function getRelatedGuides(currentCanonical: string, keywords: string[], maxResults = 5) {
  const currentPage = relatedPages.find(p => p.href === currentCanonical);
  const currentTags = currentPage?.tags || [];
  
  // Build a set of relevance tags from the page's own tags + keyword hints
  const relevanceTerms = new Set([
    ...currentTags,
    ...keywords.flatMap(k => k.toLowerCase().split(/[\s-]+/)),
  ]);

  return relatedPages
    .filter(p => p.href !== currentCanonical)
    .map(page => {
      const score = page.tags.reduce((acc, tag) => acc + (relevanceTerms.has(tag) ? 1 : 0), 0);
      return { ...page, score };
    })
    .sort((a, b) => b.score - a.score || Math.random() - 0.5)
    .slice(0, maxResults);
}

const platformLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/providers/resources", label: "Resource Hub" },
  { href: "/provider-faq", label: "Provider FAQ" },
  { href: "/how-it-works", label: "How It Works" },
  { href: "/concierge", label: "Concierge Placement" },
  { href: "/provider-support", label: "Get Support" },
];

export function ProviderSEOPageLayout({
  title,
  metaTitle,
  metaDescription,
  canonical,
  keywords,
  heroHeadline,
  heroSubheadline,
  sections,
  ctaHeadline = "Ready to Grow Your Admissions?",
  ctaSubheadline = "Join hundreds of treatment centers already receiving high-intent patient inquiries through RehabLookup.",
  images,
}: ProviderSEOPageProps) {
  // Insert a mid-article CTA after the 2nd section
  const midCTAIndex = Math.min(2, sections.length);

  // Contextually relevant guides (not all 30+)
  const relatedGuides = getRelatedGuides(canonical, keywords);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        keywords={keywords}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: heroHeadline,
          description: metaDescription,
          publisher: {
            "@type": "Organization",
            name: "RehabLookup",
            url: "https://rehablookup.com",
          },
          mainEntityOfPage: {
            "@type": "WebPage",
            "@id": `https://rehablookup.com${canonical}`,
          },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: title, url: canonical },
        ]}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative bg-primary py-16 md:py-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent" />
          <div className="container relative z-10 max-w-4xl mx-auto px-4">
            <BreadcrumbNav
              className="mb-6 text-left"
              variant="dark"
              items={[
                { label: "For Providers", href: "/for-providers" },
                { label: title },
              ]}
            />
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
                <Building2 className="h-4 w-4 text-primary-foreground/80" />
                <span className="text-sm font-medium text-primary-foreground/90">Provider Growth Guide</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground leading-tight mb-6 [text-wrap:balance] max-w-3xl mx-auto">
                {heroHeadline}
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-10">
                {heroSubheadline}
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link to="/provider-signup">
                  <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-13 shadow-lg hover:shadow-xl transition-all">
                    List Your Facility — It's Free
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <Link to="/for-providers">
                  <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-13">
                    See How It Works
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-primary-foreground/50 mt-4">No credit card required • Setup in under 5 minutes</p>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="border-b border-border bg-muted/30 py-6">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: Users, stat: "50,000+", label: "Monthly Clients" },
                { icon: Star, stat: "Free", label: "Basic Listing" },
                { icon: Shield, stat: "Verified", label: "Quality Leads" },
                { icon: Clock, stat: "< 24hr", label: "Lead Delivery" },
              ].map((item) => (
                <div key={item.label} className="flex flex-col items-center gap-1">
                  <item.icon className="h-5 w-5 text-primary mb-1" />
                  <span className="text-lg font-bold text-foreground">{item.stat}</span>
                  <span className="text-xs text-muted-foreground">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Content Sections with mid-article CTA */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="space-y-12">
              {sections.map((section, idx) => (
                <div key={idx}>
                  <article className="prose prose-slate dark:prose-invert max-w-none">
                    <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground mb-4">
                      {section.heading}
                    </h2>
                    <p className="text-muted-foreground leading-relaxed text-base md:text-lg mb-4">
                      {section.content}
                    </p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="space-y-3 mt-4">
                        {section.bullets.map((bullet, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-3">
                            <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-foreground/90">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  {/* Standalone image after first section */}
                  {idx === 0 && images?.[0] && (
                    <figure className="my-8">
                      <div className="rounded-xl overflow-hidden border border-border max-h-[280px]">
                        <img
                          src={images[0].src}
                          alt={images[0].alt}
                          width={1280}
                          height={560}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {images[0].caption && (
                        <figcaption className="text-xs text-muted-foreground mt-2 text-center italic">
                          {images[0].caption}
                        </figcaption>
                      )}
                    </figure>
                  )}

                  {/* Mid-article CTA with image - after 2nd section */}
                  {idx === midCTAIndex - 1 && (
                    <div className="my-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent overflow-hidden">
                      <div className="grid md:grid-cols-5 gap-0">
                        <div className="md:col-span-2 hidden md:block">
                          <img
                            src={images?.[1]?.src || ""}
                            alt={images?.[1]?.alt || "Treatment admissions team"}
                            width={640}
                            height={720}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                          <h3 className="text-lg font-display font-bold text-foreground mb-1.5">
                            Want to put these strategies into action?
                          </h3>
                          <p className="text-muted-foreground text-sm leading-relaxed mb-5">
                            List your facility on RehabLookup for free and start receiving verified patient inquiries from families actively seeking treatment.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Link to="/provider-signup">
                              <Button className="gap-2 h-11 px-6 font-semibold shadow-md hover:shadow-lg transition-all whitespace-nowrap">
                                Get Listed Free
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to="/for-providers">
                              <Button variant="outline" className="h-11 px-5 whitespace-nowrap">
                                Learn More
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Standalone image before last section */}
                  {idx === sections.length - 2 && sections.length > 3 && images?.[1] && (
                    <figure className="my-8">
                      <div className="rounded-xl overflow-hidden border border-border max-h-[280px]">
                        <img
                          src={images[1].src}
                          alt={images[1].alt}
                          width={1280}
                          height={560}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {images[1].caption && (
                        <figcaption className="text-xs text-muted-foreground mt-2 text-center italic">
                          {images[1].caption}
                        </figcaption>
                      )}
                    </figure>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How RehabLookup Helps */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-3">
              How RehabLookup Helps You Grow
            </h2>
            <p className="text-center text-muted-foreground mb-8 max-w-xl mx-auto">
              We handle the marketing. You focus on patient care.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "High-Intent Patient Leads",
                  desc: "Families and individuals actively searching for treatment — not cold leads, not purchased lists.",
                },
                {
                  icon: Shield,
                  title: "Verified & Qualified",
                  desc: "Every inquiry comes from a real person seeking care with verified contact info and detailed intake data.",
                },
                {
                  icon: TrendingUp,
                  title: "Grow Your Census",
                  desc: "SEO-optimized profiles that rank where families search. Measurable increases in admissions.",
                },
              ].map((card) => (
                <div key={card.title} className="bg-background rounded-xl border border-border p-6 text-center hover:border-primary/30 hover:shadow-md transition-all">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link to="/for-providers" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                See all platform features
                <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA - polished with social proof */}
        <section className="py-16 md:py-24 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
              <Zap className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/80">Join 1,000+ Treatment Facilities</span>
            </div>
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              {ctaHeadline}
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-10 max-w-xl mx-auto">
              {ctaSubheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-10 h-14 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all">
                  List Your Facility — It's Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/provider-support">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-14">
                  <Phone className="h-4 w-4" />
                  Talk to Our Team
                </Button>
              </Link>
            </div>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/60">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Setup in 5 minutes</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Cancel anytime</span>
            </div>
          </div>
        </section>

        {/* Related Guides — Curated, Not Spammy */}
        <section className="py-12 border-t border-border bg-muted/20">
          <div className="container max-w-4xl mx-auto px-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-6">
              Related Guides
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              {relatedGuides.map((page) => (
                <Link
                  key={page.href}
                  to={page.href}
                  className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3.5 hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{page.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{page.desc}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary shrink-0 ml-3 transition-colors" />
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
              <Link to="/providers/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Browse all provider guides
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <div className="flex gap-3">
                {platformLinks.slice(0, 3).map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <ProviderStickyCTA />
      <Footer />
    </div>
  );
}
