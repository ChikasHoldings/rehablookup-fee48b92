import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BreadcrumbNav, BreadcrumbItem } from "@/components/seo/BreadcrumbNav";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, AlertTriangle, BarChart3, CheckCircle, Zap, TrendingUp, DollarSign, Globe, Users, ChevronRight } from "lucide-react";

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
        <link rel="canonical" href={`https://rehablookup.com${canonical}`} />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={`https://rehablookup.com${canonical}`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Header />

      <main className="min-h-screen">
        {/* HERO */}
        <section className="relative bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-white py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <BreadcrumbNav items={breadcrumbs} variant="dark" className="mb-8" />
            <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-6">{heroHeadline}</h1>
            <p className="text-lg md:text-xl text-white/85 max-w-3xl mb-8">{heroSubheadline}</p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild variant="hero" size="xl">
                <Link to="/for-providers">List Your Facility Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button asChild variant="hero-secondary" size="xl" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/provider-roi-calculator">Calculate Your ROI</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* PROBLEM */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <AlertTriangle className="h-8 w-8 text-destructive" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{problemHeadline}</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {problemPoints.map((point, i) => (
                <Card key={i} className="border-destructive/20 bg-destructive/5">
                  <CardContent className="p-5 flex items-start gap-3">
                    <span className="text-destructive font-bold text-lg mt-0.5">✕</span>
                    <p className="text-foreground/80">{point}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* LOCAL/NICHE INSIGHTS */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-8 w-8 text-accent" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">{insightHeadline}</h2>
            </div>
            <p className="text-lg text-muted-foreground mb-8 max-w-3xl">{insightContent}</p>
            {insightStats && insightStats.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {insightStats.map((stat, i) => (
                  <Card key={i} className="text-center">
                    <CardContent className="p-5">
                      <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SOLUTION */}
        <section className="py-16 bg-primary/5">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="h-8 w-8 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">How RehabLookup Solves This</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: TrendingUp, title: "High-Intent SEO Traffic", desc: "We rank for thousands of treatment-related keywords. Every visitor is actively searching for rehab — not browsing social media." },
                { icon: Users, title: "Patients Ready to Act", desc: "Our visitors are patients and families who've already decided they need treatment. They're comparing options and ready to commit." },
                { icon: DollarSign, title: "Pay-for-Performance", desc: "No monthly fees. No long-term contracts. You only pay when you receive a real, qualified lead that matches your services." },
                { icon: Globe, title: "Nationwide Visibility", desc: "Your facility gets seen by patients across the country, with targeted visibility in your specific city, state, and treatment specialty." },
              ].map((item, i) => (
                <Card key={i}>
                  <CardContent className="p-6 flex items-start gap-4">
                    <item.icon className="h-6 w-6 text-primary shrink-0 mt-1" />
                    <div>
                      <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                      <p className="text-muted-foreground text-sm">{item.desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: "1", title: "List Your Facility", desc: "Create your free profile in under 5 minutes. Add your services, insurance, photos, and specialties." },
                { step: "2", title: "Get Matched", desc: "Our SEO engine connects patients searching for treatment to facilities that match their needs." },
                { step: "3", title: "Receive Leads", desc: "Get real inquiries from patients who are ready for treatment. Each lead includes contact info and treatment preferences." },
                { step: "4", title: "Convert to Admissions", desc: "Contact leads directly. Our high-intent traffic means higher conversion rates than any other channel." },
              ].map((item, i) => (
                <div key={i} className="text-center">
                  <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-bold mx-auto mb-4">{item.step}</div>
                  <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUE PROPOSITION */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-12">Why Facilities Choose RehabLookup</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                "Zero wasted ad spend — pay only for real leads",
                "Increase occupancy rates with consistent lead flow",
                "Nationwide visibility for your treatment programs",
                "No contracts, no setup fees, no monthly minimums",
                "Leads include patient contact info and preferences",
                "Dedicated support for facility profile optimization",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-background rounded-lg border">
                  <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROOF/TRUST */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8">Built on Growing Momentum</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {[
                { value: "5,400+", label: "Monthly Visitors" },
                { value: "50", label: "States Covered" },
                { value: "10,000+", label: "SEO Pages" },
                { value: "100%", label: "Organic Traffic" },
              ].map((stat, i) => (
                <div key={i}>
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="py-16 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Start Getting Patients Today</h2>
            <p className="text-lg text-white/80 mb-8">List your facility for free. No contracts, no setup fees. Get matched with patients who are ready for treatment.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="hero-light" size="xl">
                <Link to="/for-providers">List Your Facility Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
          </div>
        </section>

        {/* INTERNAL LINKS */}
        {relatedLinks.length > 0 && (
          <section className="py-12 bg-muted/20">
            <div className="container mx-auto px-4 max-w-5xl">
              <h2 className="text-xl font-semibold text-foreground mb-6">Related Provider Resources</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {relatedLinks.map((link, i) => (
                  <Link key={i} to={link.href} className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm text-foreground hover:text-primary">
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
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
