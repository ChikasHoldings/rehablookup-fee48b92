import { useMemo } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { getStateBySlug, getCityBySlug } from "@/data/locationSeoData";
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
  Star,
  Heart
} from "lucide-react";

const CityPage = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const cityData = stateSlug && citySlug ? getCityBySlug(stateSlug, citySlug) : undefined;
  
  const { data: approvedFacilities = [], isLoading } = useApprovedFacilities();

  // Combine all centers
  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

  // Filter by city
  const cityCenters = useMemo(() => {
    if (!stateData || !cityData) return [];
    const cityNameLower = cityData.name.toLowerCase();
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();
    
    return allCenters.filter(center => {
      const centerCity = center.city.toLowerCase();
      const centerState = center.state.toLowerCase();
      
      // Match city and state
      const cityMatch = centerCity === cityNameLower || centerCity.includes(cityNameLower);
      const stateMatch = centerState === stateNameLower || centerState === stateAbbrevLower;
      
      return cityMatch && stateMatch;
    }).sort((a, b) => {
      // Featured first
      const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
      const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      return b.rating - a.rating;
    });
  }, [allCenters, stateData, cityData]);

  // Get other cities in the state for internal linking
  const otherCities = stateData?.cities.filter(c => c.slug !== citySlug).slice(0, 6) || [];

  // If state or city not found, redirect
  if (!stateData || !cityData) {
    return <Navigate to="/rehab-centers" replace />;
  }

  const fullLocation = `${cityData.name}, ${stateData.abbreviation}`;

  // Structured data for SEO
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Drug & Alcohol Rehab Centers in ${fullLocation}`,
    "description": cityData.metaDescription,
    "url": `https://rehablookup.com/rehab-centers/${stateData.slug}/${cityData.slug}`,
    "mainEntity": {
      "@type": "ItemList",
      "numberOfItems": cityCenters.length,
      "itemListElement": cityCenters.slice(0, 10).map((center, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "item": {
          "@type": "MedicalBusiness",
          "name": center.name,
          "address": {
            "@type": "PostalAddress",
            "streetAddress": center.address,
            "addressLocality": center.city,
            "addressRegion": stateData.abbreviation,
            "postalCode": center.zipCode
          },
          "telephone": center.phone
        }
      }))
    }
  };

  return (
    <Layout>
      <SEO
        title={`Drug & Alcohol Rehab Centers in ${fullLocation} | Find Treatment`}
        description={cityData.metaDescription}
        canonical={`/rehab-centers/${stateData.slug}/${cityData.slug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Find Rehab", url: "/rehab-centers" },
          { name: stateData.name, url: `/rehab-centers/${stateData.slug}` },
          { name: cityData.name, url: `/rehab-centers/${stateData.slug}/${cityData.slug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative">
          {/* Breadcrumb */}
          <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/rehab-centers" className="hover:text-white transition-colors">Find Rehab</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/rehab-centers/${stateData.slug}`} className="hover:text-white transition-colors">{stateData.name}</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white">{cityData.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm">
              <MapPin className="h-4 w-4" />
              {fullLocation}
            </div>
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Drug & Alcohol Rehab Centers in {cityData.name}, {stateData.abbreviation}
            </h1>
            
            <p className="mt-4 text-lg text-white/80 leading-relaxed max-w-2xl">
              {cityData.description}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-white/90">
                <Building2 className="h-5 w-5" />
                <span className="font-semibold">{cityCenters.length}</span> Verified Facilities
              </div>
              <div className="flex items-center gap-2 text-white/90">
                <CheckCircle className="h-5 w-5" />
                <span>Insurance Verification Available</span>
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-4">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Get Help in {cityData.name}
                </Button>
              </Link>
              <Link to={`/rehab-centers?location=${encodeURIComponent(fullLocation)}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  <Search className="h-4 w-4" />
                  Search More Options
                </Button>
              </Link>
            </div>
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
                <p className="text-sm text-muted-foreground">Credentials checked</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Same-Day Admissions</p>
                <p className="text-sm text-muted-foreground">Many facilities available</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Heart className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">Compassionate Care</p>
                <p className="text-sm text-muted-foreground">Recovery-focused</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Star className="h-5 w-5 text-primary" />
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
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Treatment Centers in {cityData.name}
            </h2>
            <p className="mt-1 text-muted-foreground">
              {cityCenters.length} verified facilities in {fullLocation}
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading count={6} />
          ) : cityCenters.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cityCenters.map(center => (
                <TreatmentCenterCard key={center.id} center={center} />
              ))}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Facilities Listed Yet in {cityData.name}</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                We're actively adding verified treatment centers. In the meantime, 
                explore treatment options across {stateData.name} or get personalized help.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={`/rehab-centers/${stateData.slug}`}>
                  <Button variant="outline">View All {stateData.name} Centers</Button>
                </Link>
                <Link to="/request-help">
                  <Button>Get Personalized Help</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* SEO Content */}
      <section className="border-t bg-secondary/30 py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <h2 className="text-2xl font-bold text-foreground">
              About Addiction Treatment in {cityData.name}, {stateData.abbreviation}
            </h2>
            <div className="mt-4 space-y-4 text-muted-foreground leading-relaxed">
              <p>
                {cityData.name} offers various addiction treatment programs to meet diverse recovery needs. 
                Local treatment centers provide medical detoxification, residential inpatient care, 
                intensive outpatient programs (IOP), and continuing care services to support long-term recovery.
              </p>
              <p>
                Treatment facilities in {cityData.name}, {stateData.abbreviation} utilize proven approaches 
                including individual counseling, group therapy, family therapy, and evidence-based treatments 
                like cognitive behavioral therapy (CBT) and medication-assisted treatment (MAT). Many centers 
                also offer specialized programs for co-occurring mental health disorders.
              </p>
              <p>
                If you or a loved one is struggling with addiction in {cityData.name}, help is available. 
                Our verified treatment centers are ready to provide the compassionate care needed to 
                begin the journey to recovery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Other Cities */}
      {otherCities.length > 0 && (
        <section className="border-t bg-card py-10">
          <div className="container">
            <h2 className="mb-6 text-xl font-semibold text-foreground">
              More Cities in {stateData.name}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
              {otherCities.map(city => (
                <Link
                  key={city.slug}
                  to={`/rehab-centers/${stateData.slug}/${city.slug}`}
                  className="group flex items-center gap-2 rounded-lg border bg-background px-4 py-3 transition-all hover:border-primary hover:shadow-sm"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-foreground group-hover:text-primary">{city.name}</span>
                </Link>
              ))}
            </div>
            <div className="mt-6">
              <Link 
                to={`/rehab-centers/${stateData.slug}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View all cities in {stateData.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-primary py-12">
        <div className="container text-center">
          <h2 className="text-2xl font-bold text-white md:text-3xl">
            Need Help Finding Treatment in {cityData.name}?
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Our team can help you find the right treatment center based on your specific needs, 
            insurance coverage, and preferences.
          </p>
          <Link to="/request-help" className="mt-6 inline-block">
            <Button size="lg" variant="secondary" className="gap-2">
              <Phone className="h-4 w-4" />
              Get Free Assistance
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default CityPage;
