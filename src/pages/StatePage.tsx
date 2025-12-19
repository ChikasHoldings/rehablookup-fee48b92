import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateLocalBusinessSchema } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { getStateBySlug, getNearbyStates, statesData } from "@/data/locationSeoData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Building2, 
  ChevronRight, 
  Search, 
  Phone, 
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Star
} from "lucide-react";

const StatePage = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  
  const { data: approvedFacilities = [], isLoading } = useApprovedFacilities();

  // Combine all centers
  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

  // Filter by state
  const stateCenters = useMemo(() => {
    if (!stateData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();
    
    return allCenters.filter(center => 
      center.state.toLowerCase() === stateNameLower ||
      center.state.toLowerCase() === stateAbbrevLower
    ).sort((a, b) => {
      // Featured first
      const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
      const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      return b.rating - a.rating;
    });
  }, [allCenters, stateData]);

  // Get nearby states for internal linking
  const nearbyStates = stateData ? getNearbyStates(stateData.slug, 4) : [];

  // If state not found, redirect to 404
  if (!stateData) {
    return <Navigate to="/rehab-centers" replace />;
  }

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Drug & Alcohol Rehab Centers in ${stateData.name}`,
    "description": stateData.metaDescription,
    "url": `https://rehablookup.com/rehab-centers/${stateData.slug}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": stateCenters.length,
      "itemListElement": stateCenters.slice(0, 10).map((center, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "MedicalBusiness",
          "name": center.name,
          "address": {
            "@type": "PostalAddress",
            "addressLocality": center.city,
            "addressRegion": stateData.abbreviation
          }
        }
      }))
    }
  };

  return (
    <Layout>
      <SEO
        title={`Drug & Alcohol Rehab Centers in ${stateData.name} | Find Treatment`}
        description={stateData.metaDescription}
        canonical={`/rehab-centers/${stateData.slug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: stateData.name, url: `/rehab-centers/${stateData.slug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
          {/* Breadcrumb */}
          <nav className="mb-6 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/rehab-centers" className="hover:text-white transition-colors">Find Rehab</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{stateData.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <MapPin className="h-4 w-4" />
              {stateData.abbreviation} Treatment Centers
            </div>
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Drug & Alcohol Rehab Centers in {stateData.name}
            </h1>
            
            <p className="mt-4 text-lg text-white/80 leading-relaxed max-w-2xl">
              {stateData.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-white/90">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">{stateCenters.length}</span> Verified Facilities
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <CheckCircle className="h-5 w-5" />
                <span>All Credentials Verified</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to={`/rehab-centers?location=${encodeURIComponent(stateData.name)}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  <Search className="h-4 w-4" />
                  Search {stateData.name}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Cities Section */}
      <section className="border-b bg-secondary/30 py-8">
        <div className="container">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Browse by City in {stateData.name}
          </h2>
          <div className="flex flex-wrap gap-2">
            {stateData.cities.map(city => (
              <Link
                key={city.slug}
                to={`/rehab-centers/${stateData.slug}/${city.slug}`}
                className="inline-flex items-center gap-1.5 rounded-full border bg-card px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <MapPin className="h-3.5 w-3.5" />
                {city.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-b bg-card py-8">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Verified Facilities</p>
                <p className="text-sm text-muted-foreground">All centers credential-checked</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">24/7 Support</p>
                <p className="text-sm text-muted-foreground">Help available anytime</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Quality Care</p>
                <p className="text-sm text-muted-foreground">Top-rated programs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <CheckCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Insurance Accepted</p>
                <p className="text-sm text-muted-foreground">Most plans covered</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Results */}
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Treatment Centers in {stateData.name}
              </h2>
              <p className="mt-1 text-muted-foreground">
                {stateCenters.length} verified facilities available
              </p>
            </div>
          </div>

          {isLoading ? (
            <SearchResultsLoading count={6} />
          ) : stateCenters.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {stateCenters.map(center => (
                <TreatmentCenterCard key={center.id} center={center} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Facilities Listed Yet</h3>
              <p className="mt-2 text-muted-foreground">
                We're actively adding verified treatment centers in {stateData.name}.
              </p>
              <Link to="/request-help" className="mt-6 inline-block">
                <Button>Get Personalized Help</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* SEO Content */}
      <section className="border-t bg-secondary/30 py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">
              About Addiction Treatment in {stateData.name}
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {stateData.name} offers a range of addiction treatment options including medical detox, 
                residential inpatient programs, outpatient services, and specialized therapy programs. 
                Whether you're seeking help for drug addiction, alcohol dependency, or co-occurring 
                mental health conditions, {stateData.name} has qualified treatment providers ready to help.
              </p>
              <p>
                Treatment centers in {stateData.name} utilize evidence-based approaches including 
                cognitive behavioral therapy (CBT), dialectical behavior therapy (DBT), medication-assisted 
                treatment (MAT), and holistic therapies. Many facilities accept major insurance plans 
                and offer financing options to make recovery accessible.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby States Internal Linking */}
      <section className="border-t bg-card py-10">
        <div className="container">
          <h2 className="mb-6 text-xl font-semibold text-foreground">
            Explore Treatment in Nearby States
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {nearbyStates.map(state => (
              <Link
                key={state.slug}
                to={`/rehab-centers/${state.slug}`}
                className="group flex items-center justify-between rounded-xl border bg-background p-4 transition-all hover:border-primary hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {state.abbreviation}
                  </div>
                  <span className="font-medium text-foreground">{state.name}</span>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-12">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Ready to Start Your Recovery Journey?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Our team can help you find the right treatment center in {stateData.name}. 
            Get personalized recommendations based on your needs.
          </p>
          <Link to="/request-help" className="mt-6 inline-block">
            <Button size="lg" variant="secondary" className="gap-2">
              <Phone className="h-4 w-4" />
              Get Help Today
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default StatePage;
