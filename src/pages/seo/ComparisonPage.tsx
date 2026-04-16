import { Navigate, useLocation, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TrustBar } from "@/components/seo/TrustBar";
import { ConversionSection } from "@/components/seo/ConversionSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import {
  InternalLinkingSection,
  treatmentTypeLinks,
  insuranceLinks,
  resourceLinks,
} from "@/components/seo/InternalLinkingSection";
import { Button } from "@/components/ui/button";
import { getComparisonPageBySlug, COMPARISON_SLUGS } from "@/data/seoComparisonConfig";
import {
  ArrowRight,
  Shield,
  CheckCircle,
  Phone,
  Search,
} from "lucide-react";

export default function ComparisonPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace(/^\//, "").replace(/\/$/, "");

  const config = getComparisonPageBySlug(slug);
  if (!config) return <Navigate to="/404" replace />;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: config.title,
      description: config.metaDescription,
      url: `https://rehablookup.com/${config.slug}`,
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

  const relatedLinks = config.relatedSlugs
    .map((s) => {
      if (!COMPARISON_SLUGS.includes(s)) return null;
      return { title: s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()), href: `/${s}` };
    })
    .filter(Boolean) as { title: string; href: string }[];

  return (
    <Layout>
      <SEO
        title={config.metaTitle}
        description={config.metaDescription}
        canonical={`/${config.slug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Guides", url: "/guides" },
          { name: config.title, url: `/${config.slug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/85">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-accent/10 via-transparent to-transparent" />
        <div className="container relative z-10 py-12 md:py-16">
          <nav className="mb-6" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm">
              <li className="flex items-center gap-1.5">
                <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-white/40">/</span>
                <Link to="/resources" className="text-white/70 hover:text-white transition-colors">Guides</Link>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-white/40">/</span>
                <span className="text-white font-medium">{config.title}</span>
              </li>
            </ol>
          </nav>

          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 px-4 py-1.5 mb-4">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-white">Expert Guide</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold text-white max-w-3xl leading-tight">
            {config.heroTitle}
          </h1>
          <p className="mt-4 text-lg text-white/80 max-w-2xl">{config.heroSubtitle}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild variant="hero" size="lg">
              <Link to="/concierge">
                <Phone className="h-4 w-4 mr-1" />
                Get Personalized Help
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
            <Button asChild variant="hero-secondary" size="lg" className="border-white/30 text-white hover:bg-white/10">
              <Link to="/rehab-centers">
                <Search className="h-4 w-4 mr-1" />
                Browse Centers
              </Link>
            </Button>
          </div>
        </div>
      </section>

      <TrustBar />

      <section className="py-12 bg-background">
        <div className="container max-w-4xl">
          <div className="space-y-10">
            {config.sections.map((section, idx) => (
              <div key={idx}>
                <h2 className="text-2xl font-bold text-foreground mb-4">{section.heading}</h2>
                <p className="text-base text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {config.comparisonTable && (
        <section className="py-12 bg-muted/30">
          <div className="container max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-8">
              Side-by-Side Comparison
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse bg-card rounded-xl border overflow-hidden">
                <thead>
                  <tr className="border-b bg-muted/50">
                    {config.comparisonTable.headers.map((h) => (
                      <th key={h} className="text-left text-sm font-semibold text-foreground p-4">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.comparisonTable.rows.map((row) => (
                    <tr key={row.label} className="border-b last:border-0">
                      <td className="text-sm font-medium text-foreground p-4">{row.label}</td>
                      {row.values.map((v, i) => (
                        <td key={i} className="text-sm text-muted-foreground p-4">{v}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      <ConversionSection />

      {config.faqs.length > 0 && (
        <TreatmentFAQSection faqs={config.faqs} treatmentType={config.title} />
      )}

      {relatedLinks.length > 0 && (
        <section className="py-10 bg-muted/30">
          <div className="container max-w-5xl">
            <h2 className="text-xl font-bold text-foreground mb-6">Related Guides</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {relatedLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/50 hover:border-primary/30 transition-colors"
                >
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  {link.title}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <InternalLinkingSection
        groups={[
          { title: "Treatment Types", links: treatmentTypeLinks },
          { title: "Insurance Coverage", links: insuranceLinks },
          { title: "Recovery Resources", links: resourceLinks },
        ]}
      />
    </Layout>
  );
}
