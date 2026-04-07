import { useLocation, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle, Shield, Users, Building2, TrendingUp, ChevronRight } from "lucide-react";
import { ProviderStickyCTA } from "@/components/provider-guides/ProviderStickyCTA";

const STATE_DATA: Record<string, { name: string; abbr: string; facilities: number; searches: string }> = {
  "alabama": { name: "Alabama", abbr: "AL", facilities: 45, searches: "2,400" },
  "alaska": { name: "Alaska", abbr: "AK", facilities: 12, searches: "800" },
  "arizona": { name: "Arizona", abbr: "AZ", facilities: 120, searches: "8,100" },
  "arkansas": { name: "Arkansas", abbr: "AR", facilities: 35, searches: "1,900" },
  "california": { name: "California", abbr: "CA", facilities: 450, searches: "33,000" },
  "colorado": { name: "Colorado", abbr: "CO", facilities: 95, searches: "6,200" },
  "connecticut": { name: "Connecticut", abbr: "CT", facilities: 55, searches: "3,800" },
  "delaware": { name: "Delaware", abbr: "DE", facilities: 18, searches: "1,200" },
  "florida": { name: "Florida", abbr: "FL", facilities: 380, searches: "27,000" },
  "georgia": { name: "Georgia", abbr: "GA", facilities: 85, searches: "6,800" },
  "hawaii": { name: "Hawaii", abbr: "HI", facilities: 15, searches: "1,100" },
  "idaho": { name: "Idaho", abbr: "ID", facilities: 22, searches: "1,400" },
  "illinois": { name: "Illinois", abbr: "IL", facilities: 130, searches: "9,200" },
  "indiana": { name: "Indiana", abbr: "IN", facilities: 65, searches: "4,500" },
  "iowa": { name: "Iowa", abbr: "IA", facilities: 35, searches: "2,100" },
  "kansas": { name: "Kansas", abbr: "KS", facilities: 30, searches: "1,800" },
  "kentucky": { name: "Kentucky", abbr: "KY", facilities: 55, searches: "3,600" },
  "louisiana": { name: "Louisiana", abbr: "LA", facilities: 50, searches: "3,200" },
  "maine": { name: "Maine", abbr: "ME", facilities: 25, searches: "1,600" },
  "maryland": { name: "Maryland", abbr: "MD", facilities: 75, searches: "5,400" },
  "massachusetts": { name: "Massachusetts", abbr: "MA", facilities: 110, searches: "8,500" },
  "michigan": { name: "Michigan", abbr: "MI", facilities: 95, searches: "6,800" },
  "minnesota": { name: "Minnesota", abbr: "MN", facilities: 60, searches: "3,900" },
  "mississippi": { name: "Mississippi", abbr: "MS", facilities: 28, searches: "1,500" },
  "missouri": { name: "Missouri", abbr: "MO", facilities: 65, searches: "4,200" },
  "montana": { name: "Montana", abbr: "MT", facilities: 18, searches: "1,000" },
  "nebraska": { name: "Nebraska", abbr: "NE", facilities: 25, searches: "1,400" },
  "nevada": { name: "Nevada", abbr: "NV", facilities: 55, searches: "4,100" },
  "new-hampshire": { name: "New Hampshire", abbr: "NH", facilities: 22, searches: "1,500" },
  "new-jersey": { name: "New Jersey", abbr: "NJ", facilities: 95, searches: "7,200" },
  "new-mexico": { name: "New Mexico", abbr: "NM", facilities: 30, searches: "1,800" },
  "new-york": { name: "New York", abbr: "NY", facilities: 180, searches: "14,000" },
  "north-carolina": { name: "North Carolina", abbr: "NC", facilities: 90, searches: "6,500" },
  "north-dakota": { name: "North Dakota", abbr: "ND", facilities: 12, searches: "700" },
  "ohio": { name: "Ohio", abbr: "OH", facilities: 120, searches: "8,800" },
  "oklahoma": { name: "Oklahoma", abbr: "OK", facilities: 45, searches: "2,800" },
  "oregon": { name: "Oregon", abbr: "OR", facilities: 65, searches: "4,500" },
  "pennsylvania": { name: "Pennsylvania", abbr: "PA", facilities: 140, searches: "10,200" },
  "rhode-island": { name: "Rhode Island", abbr: "RI", facilities: 18, searches: "1,300" },
  "south-carolina": { name: "South Carolina", abbr: "SC", facilities: 50, searches: "3,400" },
  "south-dakota": { name: "South Dakota", abbr: "SD", facilities: 14, searches: "800" },
  "tennessee": { name: "Tennessee", abbr: "TN", facilities: 75, searches: "5,200" },
  "texas": { name: "Texas", abbr: "TX", facilities: 250, searches: "18,000" },
  "utah": { name: "Utah", abbr: "UT", facilities: 55, searches: "3,800" },
  "vermont": { name: "Vermont", abbr: "VT", facilities: 15, searches: "900" },
  "virginia": { name: "Virginia", abbr: "VA", facilities: 80, searches: "5,800" },
  "washington": { name: "Washington", abbr: "WA", facilities: 85, searches: "6,200" },
  "west-virginia": { name: "West Virginia", abbr: "WV", facilities: 30, searches: "2,000" },
  "wisconsin": { name: "Wisconsin", abbr: "WI", facilities: 55, searches: "3,600" },
  "wyoming": { name: "Wyoming", abbr: "WY", facilities: 10, searches: "600" },
};

export default function ForProvidersState() {
  const { pathname } = useLocation();
  const stateSlug = pathname.replace("/for-providers-in-", "");
  const state = STATE_DATA[stateSlug];

  if (!state) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">State not found.</p>
        </main>
        <Footer />
      </div>
    );
  }

  const stateSlugLower = state.name.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <SEO
        title={`List Your Treatment Center in ${state.name} | RehabLookup`}
        description={`List your ${state.name} rehab center on RehabLookup for free. Connect with ${state.searches}+ monthly families searching for treatment in ${state.abbr}.`}
        canonical={`/for-providers-in-${stateSlug}`}
        keywords={[
          `list rehab ${state.name}`,
          `${state.name} treatment center directory`,
          `rehab marketing ${state.abbr}`,
          `addiction treatment leads ${state.name}`,
        ]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: `List Your Treatment Center in ${state.name}`,
          description: `List your ${state.name} rehab on RehabLookup for free.`,
          url: `https://rehablookup.com/for-providers-in-${stateSlug}`,
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
          { name: state.name, url: `/for-providers-in-${stateSlug}` },
        ]}
      />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-primary py-12 md:py-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-4xl mx-auto px-4">
            <BreadcrumbNav
              className="mb-5"
              variant="dark"
              items={[
                { label: "For Providers", href: "/for-providers" },
                { label: state.name },
              ]}
            />
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1.5 mb-5">
                <Building2 className="h-4 w-4 text-primary-foreground/80" />
                <span className="text-sm font-medium text-primary-foreground/90">{state.name} Provider Opportunities</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-primary-foreground leading-tight mb-4 [text-wrap:balance]">
                List Your Treatment Center in {state.name}
              </h1>
              <p className="text-base md:text-lg text-primary-foreground/80 max-w-2xl mx-auto mb-8">
                {state.searches}+ families search for addiction treatment in {state.name} every month. Get your facility in front of them — for free.
              </p>
              <Link to="/provider-signup">
                <Button size="lg" variant="secondary" className="gap-2 h-13 px-8 text-base font-semibold shadow-lg">
                  List Your Facility Free
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-border bg-card py-6">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <div className="text-xl font-bold text-foreground">{state.searches}+</div>
                <p className="text-xs text-muted-foreground">Monthly Searches</p>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">{state.facilities}+</div>
                <p className="text-xs text-muted-foreground">Facilities in {state.abbr}</p>
              </div>
              <div>
                <div className="text-xl font-bold text-foreground">Free</div>
                <p className="text-xs text-muted-foreground">To List</p>
              </div>
            </div>
          </div>
        </section>

        {/* Why List in State */}
        <section className="py-12 md:py-20">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-foreground text-center mb-4">
              Why List Your {state.name} Facility on RehabLookup
            </h2>
            <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
              {state.name} families are actively searching for treatment options online. Position your facility where they're already looking.
            </p>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Users,
                  title: "Reach Local Families",
                  desc: `Connect with the ${state.searches}+ people searching for rehab in ${state.name} every month through our optimized directory.`,
                },
                {
                  icon: Shield,
                  title: "Exclusive Leads",
                  desc: "Every inquiry goes to your facility alone for 24 hours. No competing with 8 other centers for the same family.",
                },
                {
                  icon: TrendingUp,
                  title: "Grow Your Census",
                  desc: "Facilities on RehabLookup report 40% average increases in admissions within the first 90 days.",
                },
              ].map((card) => (
                <div key={card.title} className="bg-card border border-border rounded-xl p-6 text-center">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <card.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{card.title}</h3>
                  <p className="text-sm text-muted-foreground">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-12 md:py-16 bg-muted/30 border-y border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <h2 className="text-xl md:text-2xl font-display font-bold text-foreground text-center mb-8">
              Get Started in 3 Simple Steps
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Sign Up Free", desc: "Create your account and add your facility details, photos, and programs." },
                { step: "2", title: "Get Verified", desc: "Our team reviews your listing for licensing and quality standards." },
                { step: "3", title: "Start Connecting", desc: `Receive exclusive inquiries from ${state.name} families seeking care.` },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-3">
                    {item.step}
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Internal Links */}
        <section className="py-10 bg-background">
          <div className="container max-w-4xl mx-auto px-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">
              Related {state.name} Resources
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <Link
                to={`/best-rehab-centers-in-${stateSlugLower}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-all"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Best Rehab Centers in {state.name}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
              </Link>
              <Link
                to={`/list-your-facility-in-${stateSlugLower}`}
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-all"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  List Your Facility in {state.name}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
              </Link>
              <Link
                to="/for-providers"
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-all"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  Why List With RehabLookup
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
              </Link>
              <Link
                to="/provider-roi-calculator"
                className="group flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/30 transition-all"
              >
                <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  ROI Calculator for Providers
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary" />
              </Link>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-16 bg-primary relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,_var(--tw-gradient-stops))] from-primary-foreground/5 via-transparent to-transparent" />
          <div className="container relative z-10 max-w-3xl mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-primary-foreground mb-4">
              Ready to Grow Your {state.name} Facility?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
              Join hundreds of treatment centers already receiving qualified family inquiries through RehabLookup.
            </p>
            <Link to="/provider-signup">
              <Button size="lg" variant="secondary" className="gap-2 h-14 px-10 text-base font-semibold shadow-lg">
                List Your Facility — It's Free
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-primary-foreground/60 mt-6">
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> No credit card</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> 5-minute setup</span>
              <span className="flex items-center gap-1.5"><CheckCircle className="h-3.5 w-3.5" /> Cancel anytime</span>
            </div>
          </div>
        </section>
      </main>

      <ProviderStickyCTA />
      <Footer />
    </div>
  );
}
