import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, CheckCircle, TrendingUp, Users, Shield, Zap, Building2, Phone, Star, Clock, ChevronRight } from "lucide-react";

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
}

const relatedPages = [
  { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients", desc: "Fill beds faster with proven strategies" },
  { href: "/provider-guides/rehab-admissions-growth", label: "Grow Admissions", desc: "Build a sustainable admissions pipeline" },
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "What actually works in 2026" },
  { href: "/provider-guides/addiction-treatment-lead-generation", label: "Lead Generation", desc: "Quality leads that convert" },
  { href: "/provider-guides/increase-rehab-admissions", label: "Increase Admissions", desc: "Data-driven census growth" },
  { href: "/provider-guides/rehab-center-marketing-ideas", label: "Marketing Ideas", desc: "15 actionable ideas" },
  { href: "/provider-guides/treatment-center-patient-acquisition", label: "Patient Acquisition", desc: "Build channels that compound" },
  { href: "/provider-guides/behavioral-health-lead-generation", label: "Behavioral Health Leads", desc: "Ethical lead gen for BH" },
];

const platformLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resource Hub" },
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
}: ProviderSEOPageProps) {
  // Insert a mid-article CTA after the 2nd section
  const midCTAIndex = Math.min(2, sections.length);

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
          <div className="container relative z-10 max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
              <Building2 className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/90">Provider Growth Guide</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
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
        </section>

        {/* Trust Bar */}
        <section className="border-b border-border bg-muted/30 py-6">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: Users, stat: "50,000+", label: "Monthly Seekers" },
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

                  {/* Image card after first section */}
                  {idx === 0 && (
                    <div className="my-10 rounded-2xl overflow-hidden border border-border bg-muted/20">
                      <div className="grid md:grid-cols-5 gap-0">
                        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Data-Driven Growth</p>
                          <h3 className="text-lg font-display font-bold text-foreground mb-2">
                            Track What Matters
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Top-performing facilities monitor admissions KPIs in real time — conversion rates, speed-to-lead, and cost per admission — to make decisions that drive census growth.
                          </p>
                        </div>
                        <div className="md:col-span-2 hidden md:block">
                          <img
                            src={admissionsDashboard}
                            alt="Treatment center admissions analytics dashboard"
                            width={640}
                            height={360}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Mid-article CTA with image - after 2nd section */}
                  {idx === midCTAIndex - 1 && (
                    <div className="my-10 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent overflow-hidden">
                      <div className="grid md:grid-cols-5 gap-0">
                        <div className="md:col-span-2 hidden md:block">
                          <img
                            src={admissionsTeam}
                            alt="Admissions team collaborating on patient intake"
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

                  {/* Image card before last section */}
                  {idx === sections.length - 2 && sections.length > 3 && (
                    <div className="my-10 rounded-2xl overflow-hidden border border-border bg-muted/20">
                      <div className="grid md:grid-cols-5 gap-0">
                        <div className="md:col-span-2 hidden md:block">
                          <img
                            src={treatmentFacility}
                            alt="Modern treatment center facility exterior"
                            width={640}
                            height={360}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="md:col-span-3 p-6 md:p-8 flex flex-col justify-center">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">Stand Out Online</p>
                          <h3 className="text-lg font-display font-bold text-foreground mb-2">
                            Your Facility Deserves to Be Found
                          </h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            Families searching for treatment choose the facilities they can find. A strong directory presence ensures your center is visible to the people who need you most.
                          </p>
                        </div>
                      </div>
                    </div>
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
              <span className="text-sm font-medium text-primary-foreground/80">Join 500+ Treatment Facilities</span>
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

        {/* Rich Internal Linking Section */}
        <section className="py-12 border-t border-border bg-muted/20">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-10">
              {/* Related Guides */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  More Provider Guides
                </h3>
                <div className="space-y-1.5">
                  {relatedPages
                    .filter((p) => p.href !== canonical)
                    .map((page) => (
                      <Link
                        key={page.href}
                        to={page.href}
                        className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{page.label}</p>
                          <p className="text-xs text-muted-foreground">{page.desc}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                      </Link>
                    ))}
                </div>
              </div>

              {/* Platform Links */}
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
                  Explore RehabLookup
                </h3>
                <div className="space-y-1.5 mb-6">
                  {platformLinks.map((link) => (
                    <Link
                      key={link.href}
                      to={link.href}
                      className="group flex items-center justify-between rounded-lg px-3 py-2.5 hover:bg-muted/60 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{link.label}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary shrink-0 transition-colors" />
                    </Link>
                  ))}
                </div>

                {/* Mini CTA card */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="font-semibold text-foreground text-sm mb-1">Ready to get started?</p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Create your free listing and start connecting with families seeking treatment.
                  </p>
                  <Link to="/provider-signup">
                    <Button size="sm" className="gap-1.5 h-9 w-full font-semibold">
                      List Your Facility
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
