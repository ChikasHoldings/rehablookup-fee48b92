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
  Star,
  Heart
} from "lucide-react";

// State capital images mapping - using Unsplash images of state capitals
const stateCapitalImages: Record<string, string> = {
  'alabama': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80', // Montgomery
  'alaska': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80', // Juneau
  'arizona': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80', // Phoenix
  'arkansas': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80', // Little Rock
  'california': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80', // Sacramento
  'colorado': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80', // Denver
  'connecticut': 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=1920&q=80', // Hartford
  'delaware': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80', // Dover
  'florida': 'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1920&q=80', // Tallahassee
  'georgia': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80', // Atlanta
  'hawaii': 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=1920&q=80', // Honolulu
  'idaho': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // Boise
  'illinois': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80', // Springfield
  'indiana': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80', // Indianapolis
  'iowa': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80', // Des Moines
  'kansas': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80', // Topeka
  'kentucky': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80', // Frankfort
  'louisiana': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80', // Baton Rouge
  'maine': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80', // Augusta
  'maryland': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Annapolis
  'massachusetts': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80', // Boston
  'michigan': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80', // Lansing
  'minnesota': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80', // St. Paul
  'mississippi': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80', // Jackson
  'missouri': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Jefferson City
  'montana': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // Helena
  'nebraska': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80', // Lincoln
  'nevada': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80', // Carson City
  'new-hampshire': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80', // Concord
  'new-jersey': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Trenton
  'new-mexico': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80', // Santa Fe
  'new-york': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80', // Albany
  'north-carolina': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Raleigh
  'north-dakota': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80', // Bismarck
  'ohio': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80', // Columbus
  'oklahoma': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80', // Oklahoma City
  'oregon': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80', // Salem
  'pennsylvania': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Harrisburg
  'rhode-island': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80', // Providence
  'south-carolina': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80', // Columbia
  'south-dakota': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // Pierre
  'tennessee': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80', // Nashville
  'texas': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80', // Austin
  'utah': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80', // Salt Lake City
  'vermont': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80', // Montpelier
  'virginia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80', // Richmond
  'washington': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80', // Olympia
  'west-virginia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // Charleston
  'wisconsin': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80', // Madison
  'wyoming': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80', // Cheyenne
};

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

  // Get state capital image
  const capitalImage = stateSlug ? stateCapitalImages[stateSlug] : undefined;

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

      {/* Hero Section with State Capital Background */}
      <section className="relative overflow-hidden">
        {/* Background Image */}
        {capitalImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${capitalImage})` }}
          />
        )}
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/40" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative z-10 py-10 md:py-14">
          {/* Breadcrumb */}
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/rehab-centers" className="hover:text-white transition-colors">Find Rehab</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{stateData.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm border border-white/10">
              <MapPin className="h-4 w-4" />
              {stateData.abbreviation} Treatment Centers
            </div>
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-[2.5rem] lg:text-5xl">
              Drug & Alcohol Rehab Centers in {stateData.name}
            </h1>
            
            <p className="mt-4 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl">
              {stateData.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 text-white text-sm md:text-base">
                <Building2 className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                <span className="font-semibold">{stateCenters.length}</span>
                <span className="text-white/80">Verified Facilities</span>
              </div>
              <div className="flex items-center gap-2 text-white text-sm md:text-base">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                <span className="text-white/80">Credentials Verified</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto shadow-lg">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to={`/rehab-centers?location=${encodeURIComponent(stateData.name)}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
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
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Ready to Start Your Recovery Journey?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our team can help you find the right treatment center in {stateData.name}. 
              Get personalized recommendations based on your needs.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/request-help">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Get Help Today
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button variant="outline" size="lg" className="gap-2">
                  Browse All Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StatePage;
