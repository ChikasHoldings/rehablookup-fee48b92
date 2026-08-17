import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BreadcrumbNav, BreadcrumbItem } from "@/components/seo/BreadcrumbNav";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  AlertTriangle,
  BarChart3,
  CheckCircle,
  ChevronRight,
  Eye,
  Globe,
  LineChart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export interface ProviderConversionProps {
  metaTitle: string;
  metaDescription: string;
  canonical: string;
  keywords: string[];
  breadcrumbs: BreadcrumbItem[];
  heroHeadline: string;
  heroSubheadline: string;
  problemHeadline: string;
  problemPoints: string[];
  insightHeadline: string;
  insightContent: string;
  insightStats?: { label: string; value: string }[];
  relatedLinks?: { href: string; label: string }[];
}

const STALE_PROVIDER_PROMISE = /\b(?:qualified leads?|lead delivery|pay[- ](?:per|for)[- ]?(?:lead|call)|get more (?:rehab |detox |residential |iop |php |mat |luxury |dual diagnosis )?patients?|fill (?:your )?(?:beds?|slots?)|connects? (?:your )?facility with patients?|census improvements? within|attract patients?)\b/i;

export function ProviderConversionPage({
  metaTitle,
  metaDescription,
  canonical,
  keywords,
  breadcrumbs,
  heroHeadline,
  heroSubheadline,
  problemHeadline,
  problemPoints,
  insightHeadline,
  insightContent,
  insightStats,
  relatedLinks = [],
}: ProviderConversionProps) {
  const searchableCopy = [
    metaTitle,
    metaDescription,
    heroHeadline,
    heroSubheadline,
    problemHeadline,
    ...problemPoints,
    insightHeadline,
    insightContent,
  ].join(" ");
  const noindexLegacyPromise = STALE_PROVIDER_PROMISE.test(searchableCopy);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: metaTitle,
    description: metaDescription,
    url: `https://rehablookup.com${canonical}`,
    publisher: {
      "@type": "Organization",
      name: "RehabLookup",
      url: "https://rehablookup.com",
    },
  };

  return (
    <>
      <Helmet>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={keywords.join(", ")} />
        {noindexLegacyPromise && <meta name="robots" content="noindex, follow" />}
        <link rel="canonical" href={`https://rehablookup.com${canonical}`} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`https://rehablookup.com${canonical}`} />
        <meta property="og:type" content="website" />
        {!noindexLegacyPromise && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      </Helmet>

      <Header />

      <main className="min-h-screen">
        <section className="border-b bg-background py-14 md:py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <BreadcrumbNav items={breadcrumbs} className="mb-8" />
            <h1 className="max-w-4xl text-3xl font-bold leading-tight text-foreground md:text-5xl">{heroHeadline}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">{heroSubheadline}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/provider/onboarding">Claim or List Your Facility <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/for-providers">See Provider Options</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Basic directory presence is free. Organic ranking is never sold.</p>
          </div>
        </section>

        <section className="bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-6 flex items-center gap-3">
              <AlertTriangle className="h-7 w-7 text-amber-600" />
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">{problemHeadline}</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {problemPoints.map((point, i) => (
                <Card key={i} className="shadow-none">
                  <CardContent className="flex items-start gap-3 p-5">
                    <span className="mt-0.5 font-bold text-muted-foreground">•</span>
                    <p className="text-foreground/80">{point}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="mb-6 flex items-center gap-3">
              <BarChart3 className="h-7 w-7 text-primary" />
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">{insightHeadline}</h2>
            </div>
            <p className="mb-8 max-w-3xl text-lg text-muted-foreground">{insightContent}</p>
            {insightStats && insightStats.length > 0 && (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {insightStats.map((stat, i) => (
                  <Card key={i} className="text-center shadow-none">
                    <CardContent className="p-5">
                      <div className="mb-1 text-2xl font-bold text-primary md:text-3xl">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-y bg-muted/20 py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">How RehabLookup supports providers</h2>
            <p className="mt-3 max-w-3xl text-muted-foreground">
              RehabLookup is a directory. Providers manage their facility information directly, while paid products enhance presentation or purchase clearly labeled advertising exposure.
            </p>
            <div className="mt-8 grid gap-5 md:grid-cols-2">
              {[
                {
                  icon: Globe,
                  title: "Free directory presence",
                  desc: "Claim and maintain core facility information, services, insurance, accreditation data, and your direct website without paying for organic rank.",
                },
                {
                  icon: Sparkles,
                  title: "Pro enhances presentation",
                  desc: "Pro adds richer profile modules, media, direct public phone visibility, multi-location tools, and eligible performance reporting. It does not buy organic position.",
                },
                {
                  icon: Eye,
                  title: "Featured buys sponsored exposure",
                  desc: "Featured is a separate advertising product. Sponsored placements are clearly labeled and remain independent from organic directory ordering.",
                },
                {
                  icon: ShieldCheck,
                  title: "Verification remains independent",
                  desc: "Verification is earned through the applicable review process and cannot be purchased with Pro or Featured advertising.",
                },
              ].map((item) => (
                <Card key={item.title} className="shadow-none">
                  <CardContent className="flex items-start gap-4 p-6">
                    <item.icon className="mt-1 h-6 w-6 shrink-0 text-primary" />
                    <div>
                      <h3 className="font-semibold text-foreground">{item.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">How it works</h2>
            <div className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                { step: "1", title: "Find your facility", desc: "Search the directory for the existing facility record or start a new facility submission." },
                { step: "2", title: "Claim and correct", desc: "Confirm your affiliation and keep public facility information accurate." },
                { step: "3", title: "Enhance if useful", desc: "Choose Pro for richer presentation and provider tools; free listings remain eligible for organic discovery." },
                { step: "4", title: "Advertise separately", desc: "Use Featured when you want clearly labeled additional exposure without changing organic rank." },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full border bg-background text-lg font-bold text-primary">{item.step}</div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <h2 className="text-center text-2xl font-bold text-foreground md:text-3xl">Directory principles</h2>
            <div className="mx-auto mt-8 grid max-w-4xl gap-4 md:grid-cols-2">
              {[
                "Patients never pay to search RehabLookup",
                "Organic directory ranking is never sold",
                "Pro enhances a facility's presentation and provider tools",
                "Featured placements are clearly labeled sponsored advertising",
                "Verification is independent from payment",
                "Providers manage information from their own facility account",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border bg-background p-4">
                  <CheckCircle className="h-5 w-5 shrink-0 text-primary" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <LineChart className="mx-auto h-8 w-8 text-primary" />
            <h2 className="mt-4 text-2xl font-bold text-foreground md:text-3xl">Keep your facility information accurate</h2>
            <p className="mt-3 text-lg text-muted-foreground">
              Claiming is free. Review the information people see, maintain your record, and decide separately whether enhanced presentation or sponsored exposure fits your goals.
            </p>
            <Button asChild size="lg" className="mt-7">
              <Link to="/provider/onboarding">Claim or List Your Facility <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </section>

        {relatedLinks.length > 0 && (
          <section className="border-t bg-muted/20 py-12">
            <div className="container mx-auto max-w-5xl px-4">
              <h2 className="mb-6 text-xl font-semibold text-foreground">Related provider resources</h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {relatedLinks.map((link) => (
                  <Link key={link.href} to={link.href} className="flex items-center gap-2 rounded-lg border bg-background p-3 text-sm text-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      <Footer />
    </>
  );
}
