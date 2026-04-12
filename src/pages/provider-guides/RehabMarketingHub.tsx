import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, MapPin, Stethoscope, Shield, BarChart3, ChevronRight, Users, AlertTriangle, Building2, DollarSign, Wrench, Heart } from "lucide-react";
import { providerCities } from "@/data/providerCityData";
import { treatmentProviderConfigs, insuranceProviderConfigs, comparisonPageConfigs, STATE_TREATMENT_COMBOS } from "@/data/providerPageConfigs";
import { providerPersonaConfigs, providerPainPointConfigs, additionalComparisonConfigs } from "@/data/providerPersonaConfigs";
import { providerBusinessConfigs, providerOperationsConfigs, providerNicheConfigs } from "@/data/providerBusinessConfigs";
import { providerGrowthConfigs, providerIndustryConfigs } from "@/data/providerGrowthConfigs";
import { usStates } from "@/data/usStates";

export default function RehabMarketingHub() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Rehab Marketing Hub: Get More Patients for Your Treatment Center",
    description: "Complete rehab marketing resource center. City-level marketing guides, treatment-specific strategies, insurance patient acquisition, and competitive analysis.",
    url: "https://rehablookup.com/rehab-marketing",
  };

  return (
    <>
      <Helmet>
        <title>Rehab Marketing Hub: Get More Patients for Your Treatment Center | RehabLookup</title>
        <meta name="description" content="Complete rehab marketing resource center. Explore city-level guides, treatment marketing strategies, insurance patient acquisition, and industry comparisons." />
        <link rel="canonical" href="https://rehablookup.com/rehab-marketing" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Header />

      <main className="min-h-screen">
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-white py-16 md:py-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <BreadcrumbNav items={[{ label: "For Providers", href: "/for-providers" }, { label: "Rehab Marketing Hub" }]} variant="dark" className="mb-8" />
            <h1 className="text-3xl md:text-5xl font-bold mb-6">Rehab Marketing Hub</h1>
            <p className="text-lg md:text-xl text-white/85 max-w-3xl mb-8">Everything your treatment center needs to attract more patients, fill more beds, and grow your admissions — organized by location, treatment type, insurance, and marketing strategy.</p>
            <Button asChild variant="hero" size="xl">
              <Link to="/for-providers">List Your Facility Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>

        {/* City Marketing Guides */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <MapPin className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Marketing by City</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">City-specific rehab marketing guides with local competition data, search volume, and patient acquisition strategies.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {providerCities.slice(0, 20).map(city => (
                <Link key={city.citySlug} to={`/get-more-patients-in-${city.citySlug}-${city.stateSlug}`} className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm">
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-foreground hover:text-primary">{city.city}, {city.state.slice(0, 2).toUpperCase()}</span>
                </Link>
              ))}
            </div>
            {providerCities.length > 20 && (
              <p className="mt-4 text-sm text-muted-foreground">{providerCities.length - 20} more cities available — see full directory below.</p>
            )}

            {/* Remaining cities collapsed */}
            <details className="mt-4">
              <summary className="text-sm font-medium text-primary cursor-pointer">View all {providerCities.length} cities</summary>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 mt-4">
                {providerCities.slice(20).map(city => (
                  <Link key={city.citySlug} to={`/get-more-patients-in-${city.citySlug}-${city.stateSlug}`} className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm">
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-foreground hover:text-primary">{city.city}, {city.state.slice(0, 2).toUpperCase()}</span>
                  </Link>
                ))}
              </div>
            </details>

            {/* State provider pages */}
            <h3 className="text-xl font-semibold text-foreground mt-12 mb-4">Provider Pages by State</h3>
            <div className="grid sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {usStates.map(s => (
                <Link key={s.slug} to={`/for-providers-in-${s.slug}`} className="text-sm text-muted-foreground hover:text-primary transition-colors p-1.5">
                  {s.name}
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Treatment-Specific Marketing */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Stethoscope className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Marketing by Treatment Type</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {treatmentProviderConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label} Marketing</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{config.subheadline}</p>
                    <Link to={`/provider-guides/get-more-${config.slug}-patients`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* State + Treatment combos */}
            <h3 className="text-xl font-semibold text-foreground mt-12 mb-4">State + Treatment Guides</h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {STATE_TREATMENT_COMBOS.flatMap(sc =>
                sc.treatments.slice(0, 3).map(t => {
                  const tc = treatmentProviderConfigs.find(c => c.slug === t);
                  return (
                    <Link key={`${sc.stateSlug}-${t}`} to={`/rehab-marketing/${sc.stateSlug}/${t}`} className="flex items-center gap-2 p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors text-sm">
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground hover:text-primary">{tc?.label || t} in {sc.stateName}</span>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </section>

        {/* Insurance Marketing */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Marketing by Insurance</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {insuranceProviderConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-1">Covers {config.memberCount} Americans</p>
                    <Link to={`/provider-guides/get-more-${config.slug}-patients`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1 mt-2">
                      Get {config.label} Patients <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Comparisons */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Marketing Comparisons & Analysis</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {[...comparisonPageConfigs, ...additionalComparisonConfigs].map(config => (
                <Link key={config.slug} to={`/provider-guides/${config.slug}`} className="p-5 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">{config.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{config.subheadline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* By Facility Type */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Building2 className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Marketing by Facility Type</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">Targeted strategies for your specific type of treatment center — because a small faith-based program markets differently than a luxury executive rehab.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerPersonaConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{config.heroSubheadline}</p>
                    <Link to={`/provider-guides/${config.slug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pain Point Pages */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <AlertTriangle className="h-7 w-7 text-destructive" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Common Provider Problems (& Solutions)</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {providerPainPointConfigs.map(config => (
                <Link key={config.slug} to={`/provider-guides/${config.slug}`} className="p-5 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">{config.heroHeadline}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{config.heroSubheadline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Business Strategy Pages */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <DollarSign className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Business Strategy & Growth</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">Revenue diversification, valuation growth, private equity readiness, and multi-location expansion strategies for facility owners and operators.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerBusinessConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{config.heroSubheadline}</p>
                    <Link to={`/provider-guides/${config.slug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Operations Pages */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Wrench className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Operations & Patient Pipeline</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {providerOperationsConfigs.map(config => (
                <Link key={config.slug} to={`/provider-guides/${config.slug}`} className="p-5 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">{config.label}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{config.heroSubheadline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Niche Population Pages */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Heart className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Specialty Population Marketing</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">Reach underserved populations with specialized treatment programs — from Spanish-speaking communities to first responders and healthcare professionals.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerNicheConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{config.heroSubheadline}</p>
                    <Link to={`/provider-guides/${config.slug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Growth & Expansion */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <BarChart3 className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Growth & Expansion Strategies</h2>
            </div>
            <p className="text-muted-foreground mb-8 max-w-2xl">Outpatient expansion, Medicaid strategy, crisis marketing, family programs, and branding differentiation for growing facilities.</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {providerGrowthConfigs.map(config => (
                <Card key={config.slug} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">{config.label}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{config.heroSubheadline}</p>
                    <Link to={`/provider-guides/${config.slug}`} className="text-sm font-medium text-primary hover:underline flex items-center gap-1">
                      Read Guide <ChevronRight className="h-3 w-3" />
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Industry Trends */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="flex items-center gap-3 mb-8">
              <Shield className="h-7 w-7 text-primary" />
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">Industry Trends & Competitive Edge</h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {providerIndustryConfigs.map(config => (
                <Link key={config.slug} to={`/provider-guides/${config.slug}`} className="p-5 rounded-lg border bg-background hover:bg-muted/50 transition-colors">
                  <h3 className="font-semibold text-foreground mb-2">{config.label}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{config.heroSubheadline}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 bg-gradient-to-br from-primary via-primary/95 to-primary/85 text-white">
          <div className="container mx-auto px-4 max-w-3xl text-center">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">Ready to Get More Patients?</h2>
            <p className="text-lg text-white/80 mb-8">Join facilities across the country that use RehabLookup to attract qualified patients. No contracts, no setup fees.</p>
            <Button asChild variant="hero-light" size="xl">
              <Link to="/for-providers">List Your Facility Now <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
