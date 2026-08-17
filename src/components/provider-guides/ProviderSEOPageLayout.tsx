import { Link } from "react-router-dom";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/SEO";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import {
  ArrowRight,
  Building2,
  CheckCircle,
  ChevronRight,
  Eye,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

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
  { href: "/provider-guides/rehab-marketing-strategies", label: "Marketing Strategies", desc: "Build an ethical, measurable marketing mix" },
  { href: "/provider-guides/rehab-center-seo", label: "Rehab SEO", desc: "Improve organic search visibility" },
  { href: "/provider-guides/rehab-reputation-management", label: "Reputation Management", desc: "Build trust through accurate information and reviews" },
  { href: "/provider-guides/best-rehab-listing-platforms", label: "Listing Platforms", desc: "Evaluate treatment directories and discovery platforms" },
  { href: "/provider-guides/rehab-accreditation-guide", label: "Accreditation Guide", desc: "Understand common accreditation frameworks" },
  { href: "/provider-guides/rehab-compliance-guide", label: "Compliance Guide", desc: "HIPAA, 42 CFR Part 2, and marketing considerations" },
];

const LEGACY_REHABLOOKUP_MONETIZATION =
  /(?:rehablookup[^.]{0,180}(?:lead system|qualified leads?|patient inquiries?|verified inquiries?|pay[- ](?:for|per)[- ]?(?:lead|call))|(?:lead system|qualified leads?|verified patient inquiries?)[^.]{0,180}rehablookup)/i;

function hasLegacyPlatformClaim(sections: SEOSection[], ctaSubheadline: string) {
  const editorialText = sections
    .map((section) => `${section.heading} ${section.content} ${(section.bullets || []).join(" ")}`)
    .join(" ");
  return LEGACY_REHABLOOKUP_MONETIZATION.test(`${editorialText} ${ctaSubheadline}`);
}

export function ProviderSEOPageLayout({
  title,
  metaTitle,
  metaDescription,
  canonical,
  keywords,
  heroHeadline,
  heroSubheadline,
  sections,
  ctaHeadline = "Keep Your Facility Information Accurate",
  ctaSubheadline = "Claim your facility for free, maintain your directory information, and choose optional Pro or Featured products only when they fit your goals.",
  images,
}: ProviderSEOPageProps) {
  // Provider-guide copy predates the directory-only cutover in several legacy
  // articles. If a page still makes an obsolete RehabLookup lead-broker claim,
  // keep it useful to humans but remove it from the index until that article's
  // editorial copy is rewritten. This prevents stale business-model claims
  // from becoming search snippets while preserving educational lead-generation
  // discussion that is not describing RehabLookup itself.
  const noindexLegacyClaim = hasLegacyPlatformClaim(sections, ctaSubheadline);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title={metaTitle}
        description={metaDescription}
        canonical={canonical}
        keywords={keywords}
        noindex={noindexLegacyClaim}
        type="article"
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
        <section className="border-b bg-background py-10 md:py-14">
          <div className="container mx-auto max-w-4xl px-4">
            <BreadcrumbNav
              className="mb-5 text-left"
              items={[
                { label: "For Providers", href: "/for-providers" },
                { label: title },
              ]}
            />
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                Provider resource
              </div>
              <h1 className="text-3xl font-bold leading-tight text-foreground md:text-4xl">{heroHeadline}</h1>
              <p className="mt-4 text-base leading-7 text-muted-foreground md:text-lg">{heroSubheadline}</p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link to="/provider/onboarding">
                  <Button size="lg" className="gap-2">
                    Claim or List Your Facility
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/for-providers">
                  <Button size="lg" variant="outline">Provider Options</Button>
                </Link>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Basic directory presence is free. Organic ranking is never sold.</p>
            </div>
          </div>
        </section>

        <section className="border-b bg-muted/20 py-5">
          <div className="container mx-auto grid max-w-4xl gap-4 px-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: CheckCircle, label: "Free basic presence" },
              { icon: Sparkles, label: "Pro enhances profiles" },
              { icon: Eye, label: "Featured is sponsored" },
              { icon: ShieldCheck, label: "Verification is independent" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-foreground">
                <item.icon className="h-4 w-4 shrink-0 text-primary" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="space-y-12">
              {sections.map((section, idx) => (
                <div key={`${section.heading}-${idx}`}>
                  <article className="max-w-none">
                    <h2 className="mb-4 text-2xl font-bold text-foreground md:text-3xl">{section.heading}</h2>
                    <p className="text-base leading-8 text-muted-foreground md:text-lg">{section.content}</p>
                    {section.bullets && section.bullets.length > 0 && (
                      <ul className="mt-5 space-y-3">
                        {section.bullets.map((bullet) => (
                          <li key={bullet} className="flex items-start gap-3">
                            <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-primary" />
                            <span className="leading-7 text-foreground/90">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </article>

                  {idx === 0 && images?.[0] && (
                    <figure className="my-8">
                      <div className="max-h-[320px] overflow-hidden rounded-xl border border-border">
                        <img
                          src={images[0].src}
                          alt={images[0].alt}
                          width={1280}
                          height={560}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      {images[0].caption && (
                        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{images[0].caption}</figcaption>
                      )}
                    </figure>
                  )}

                  {idx === 1 && (
                    <div className="my-10 rounded-xl border bg-muted/20 p-6 md:p-8">
                      <h3 className="text-lg font-semibold text-foreground">Keep your directory presence current</h3>
                      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
                        Claiming a facility is free. Update core information, insurance, services, and accreditation details from the provider portal. Pro and Featured remain optional and never purchase organic rank.
                      </p>
                      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                        <Link to="/provider/onboarding">
                          <Button className="gap-2">
                            Claim or List Your Facility
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to="/for-providers">
                          <Button variant="outline">Learn More</Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/20 py-12 md:py-14">
          <div className="container mx-auto max-w-4xl px-4">
            <div className="text-center">
              <LineChart className="mx-auto h-7 w-7 text-primary" />
              <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">How RehabLookup fits into a provider's marketing mix</h2>
              <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                RehabLookup provides a public directory presence and direct discovery surface. Providers can maintain a free record, use Pro for richer presentation and reporting, or purchase separately labeled Featured advertising.
              </p>
            </div>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                { title: "Be present", desc: "Maintain accurate core facility information and direct website access with a free basic listing." },
                { title: "Enhance", desc: "Use Pro for richer profile modules, media, direct public phone visibility, multi-location tools, and eligible reporting." },
                { title: "Promote", desc: "Use Featured for clearly labeled sponsored exposure that remains separate from organic directory ordering." },
              ].map((card) => (
                <div key={card.title} className="rounded-xl border bg-background p-6">
                  <h3 className="font-semibold text-foreground">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-18">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">{ctaHeadline}</h2>
            <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">{ctaSubheadline}</p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/provider/onboarding">
                <Button size="lg" className="gap-2">
                  Claim or List Your Facility
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/provider-support">
                <Button size="lg" variant="outline">Provider Support</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/20 py-10">
          <div className="container mx-auto max-w-4xl px-4">
            <h3 className="mb-5 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Related guides</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {relatedPages
                .filter((page) => page.href !== canonical)
                .slice(0, 4)
                .map((page) => (
                  <Link key={page.href} to={page.href} className="group flex items-center justify-between rounded-lg border bg-card px-4 py-3.5 transition-colors hover:border-primary/30">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary">{page.label}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{page.desc}</p>
                    </div>
                    <ChevronRight className="ml-3 h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                ))}
            </div>
            <div className="mt-6 border-t pt-5">
              <Link to="/providers/resources" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                Browse provider resources
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
