import { useMemo } from "react";
import { Navigate, Link, useLocation } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  nearMeLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";
import { comparisonPages } from "@/data/seoPageConfig";
import {
  ArrowRight,
  Phone,
  CheckCircle,
  X,
  Shield,
  Scale,
  Clock,
  DollarSign,
  Users,
  Building2,
} from "lucide-react";

export default function ComparisonPage() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\//, "");
  const config = comparisonPages.find((p) => p.slug === slug);

  if (!config) {
    return <Navigate to="/404" replace />;
  }

  const { optionA, optionB } = config;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
      publisher: {
        "@type": "Organization",
        name: "RehabLookup",
        url: "https://rehablookup.com",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: config.faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={config.metaTitle}
        description={config.metaDescription}
        canonical={`https://rehablookup.com/${config.slug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: config.title, url: `/${config.slug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="container relative z-10 py-12 md:py-16 lg:py-20">
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex items-center gap-1.5 text-sm">
              <li><Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link></li>
              <li className="text-white/40">/</li>
              <li><Link to="/treatment-types" className="text-white/70 hover:text-white transition-colors">Treatment Types</Link></li>
              <li className="text-white/40">/</li>
              <li className="text-white font-medium">{config.title}</li>
            </ol>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-4">
            <Scale className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white">Treatment Comparison</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white max-w-3xl leading-tight speakable-headline">
            {config.title}: Which Is Right for You?
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl">{config.introContent}</p>
        </div>
      </section>

      {/* Side-by-side comparison */}
      <section className="py-12 bg-background">
        <div className="container max-w-5xl">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Option A */}
            <div className="rounded-2xl border-2 border-primary/20 bg-card overflow-hidden">
              <div className="bg-primary/5 p-6 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{optionA.label}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{optionA.description}</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {optionA.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm"><strong>Cost:</strong> {optionA.avgCost}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm"><strong>Duration:</strong> {optionA.duration}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm"><strong>Best For:</strong> {optionA.bestFor}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Option B */}
            <div className="rounded-2xl border-2 border-accent/20 bg-card overflow-hidden">
              <div className="bg-accent/5 p-6 border-b">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-accent" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">{optionB.label}</h2>
                </div>
                <p className="text-sm text-muted-foreground">{optionB.description}</p>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {optionB.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm"><strong>Cost:</strong> {optionB.avgCost}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm"><strong>Duration:</strong> {optionB.duration}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Users className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-sm"><strong>Best For:</strong> {optionB.bestFor}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-muted/30">
        <div className="container max-w-4xl">
          <div className="rounded-2xl bg-gradient-to-br from-primary to-primary/90 p-8 md:p-12 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Not Sure Which Option Is Right?
            </h2>
            <p className="text-white/80 mb-6 max-w-xl mx-auto">
              Our treatment placement team can help you determine the best level of care based on your unique situation. Confidential and no obligation.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button asChild variant="hero-light" size="lg">
                <Link to="/concierge">
                  <Phone className="h-4 w-4 mr-1" />
                  Get Matched Now
                </Link>
              </Button>
              <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/rehab-centers">Browse All Centers</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <TreatmentFAQSection faqs={config.faqs} treatmentType={config.title} />

      {/* Internal Linking */}
      <InternalLinkingSection
        groups={[
          { title: "Treatment Types", links: treatmentTypeLinks },
          { title: "Treatment Near You", links: nearMeLinks },
          { title: "Insurance Coverage", links: insuranceLinks },
          { title: "Recovery Resources", links: resourceLinks },
        ]}
      />
    </Layout>
  );
}
