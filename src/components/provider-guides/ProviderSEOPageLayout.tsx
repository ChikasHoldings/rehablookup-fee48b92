import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, CheckCircle, TrendingUp, Users, Shield, Zap, Building2 } from "lucide-react";

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
  { href: "/provider-seo/get-more-rehab-patients", label: "Get More Patients" },
  { href: "/provider-seo/rehab-admissions-growth", label: "Grow Admissions" },
  { href: "/provider-seo/rehab-marketing-strategies", label: "Marketing Strategies" },
  { href: "/provider-seo/addiction-treatment-lead-generation", label: "Lead Generation" },
  { href: "/provider-seo/increase-rehab-admissions", label: "Increase Admissions" },
  { href: "/provider-seo/rehab-center-marketing-ideas", label: "Marketing Ideas" },
  { href: "/provider-seo/treatment-center-patient-acquisition", label: "Patient Acquisition" },
  { href: "/provider-seo/behavioral-health-lead-generation", label: "Behavioral Health Leads" },
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
        <section className="relative bg-primary py-16 md:py-24">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-4xl mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-6">
              <Building2 className="h-4 w-4 text-primary-foreground/80" />
              <span className="text-sm font-medium text-primary-foreground/90">For Treatment Providers</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-primary-foreground leading-tight mb-6">
              {heroHeadline}
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
              {heroSubheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-12">
                  List Your Facility Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/for-providers">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12">
                  Learn More
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Trust Bar */}
        <section className="border-b border-border bg-muted/30 py-6">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {[
                { icon: Users, stat: "50,000+", label: "Monthly Seekers" },
                { icon: TrendingUp, stat: "Free", label: "Basic Listing" },
                { icon: Shield, stat: "Verified", label: "Quality Leads" },
                { icon: Zap, stat: "24hr", label: "Lead Delivery" },
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

        {/* Content Sections */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="space-y-12">
              {sections.map((section, idx) => (
                <article key={idx} className="prose prose-slate dark:prose-invert max-w-none">
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
              ))}
            </div>
          </div>
        </section>

        {/* How RehabLookup Helps */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-8">
              How RehabLookup Helps You Grow
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "High-Intent Patient Leads",
                  desc: "We connect you with families and individuals actively searching for treatment — not cold leads, not purchased lists.",
                },
                {
                  icon: Shield,
                  title: "Verified & Qualified",
                  desc: "Every inquiry comes from a real person seeking care. Our platform verifies contact info and captures detailed intake data.",
                },
                {
                  icon: TrendingUp,
                  title: "Grow Your Census",
                  desc: "Facilities on RehabLookup see measurable increases in admissions. Our SEO-optimized profiles rank where families search.",
                },
              ].map((card) => (
                <div key={card.title} className="bg-background rounded-xl border border-border p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 md:py-20 bg-primary">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
              {ctaHeadline}
            </h2>
            <p className="text-lg text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              {ctaSubheadline}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 text-base font-semibold px-8 h-12">
                  List Your Facility — It's Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/concierge">
                <Button size="lg" variant="outline" className="gap-2 text-base border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-12">
                  Start Receiving Inquiries
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-10 border-t border-border bg-muted/20">
          <div className="container max-w-4xl mx-auto px-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Related Provider Resources
            </h3>
            <div className="flex flex-wrap gap-2">
              {relatedPages
                .filter((p) => p.href !== canonical)
                .map((page) => (
                  <Link
                    key={page.href}
                    to={page.href}
                    className="text-sm px-3 py-1.5 rounded-full border border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
                  >
                    {page.label}
                  </Link>
                ))}
              <Link
                to="/provider-resources"
                className="text-sm px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors"
              >
                All Resources →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
