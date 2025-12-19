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

// City images mapping - using Unsplash images of major cities
const cityImages: Record<string, Record<string, string>> = {
  'alabama': {
    'birmingham': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80',
    'huntsville': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
    'mobile': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80',
    'montgomery': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  },
  'alaska': {
    'anchorage': 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=1920&q=80',
    'fairbanks': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80',
    'juneau': 'https://images.unsplash.com/photo-1473448912268-2022ce9509d8?w=1920&q=80',
  },
  'arizona': {
    'phoenix': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'tucson': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
    'scottsdale': 'https://images.unsplash.com/photo-1512295767273-ac109ac3acfa?w=1920&q=80',
    'mesa': 'https://images.unsplash.com/photo-1494587416117-f102a2ac0a8d?w=1920&q=80',
  },
  'california': {
    'los-angeles': 'https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=1920&q=80',
    'san-francisco': 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1920&q=80',
    'san-diego': 'https://images.unsplash.com/photo-1538964173425-93640b087f84?w=1920&q=80',
    'sacramento': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80',
    'oakland': 'https://images.unsplash.com/photo-1515896769750-31548aa180ed?w=1920&q=80',
    'malibu': 'https://images.unsplash.com/photo-1506953823976-52e1fdc0149a?w=1920&q=80',
  },
  'colorado': {
    'denver': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80',
    'colorado-springs': 'https://images.unsplash.com/photo-1508193638397-1c4234db14d8?w=1920&q=80',
    'boulder': 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1920&q=80',
    'aspen': 'https://images.unsplash.com/photo-1551524559-8af4e6624178?w=1920&q=80',
  },
  'florida': {
    'miami': 'https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=1920&q=80',
    'orlando': 'https://images.unsplash.com/photo-1575089976121-8ed7b2a54265?w=1920&q=80',
    'tampa': 'https://images.unsplash.com/photo-1564507592333-c60657eea523?w=1920&q=80',
    'jacksonville': 'https://images.unsplash.com/photo-1599558859083-ab8b92c27c3a?w=1920&q=80',
    'fort-lauderdale': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1920&q=80',
    'west-palm-beach': 'https://images.unsplash.com/photo-1548438294-1ad5d5f4f063?w=1920&q=80',
  },
  'georgia': {
    'atlanta': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
    'savannah': 'https://images.unsplash.com/photo-1587578931330-f0bcdb9ace11?w=1920&q=80',
    'augusta': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  },
  'illinois': {
    'chicago': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80',
    'springfield': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  },
  'massachusetts': {
    'boston': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
    'cambridge': 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1920&q=80',
    'worcester': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'michigan': {
    'detroit': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
    'grand-rapids': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'ann-arbor': 'https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=1920&q=80',
  },
  'nevada': {
    'las-vegas': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80',
    'reno': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
  'new-jersey': {
    'newark': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'jersey-city': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
    'atlantic-city': 'https://images.unsplash.com/photo-1533106497176-45ae19e68ba2?w=1920&q=80',
  },
  'new-york': {
    'new-york-city': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=1920&q=80',
    'manhattan': 'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=1920&q=80',
    'brooklyn': 'https://images.unsplash.com/photo-1555529771-835f59fc5efe?w=1920&q=80',
    'long-island': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'buffalo': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'rochester': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'albany': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
  },
  'ohio': {
    'columbus': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
    'cleveland': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'cincinnati': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  },
  'pennsylvania': {
    'philadelphia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
    'pittsburgh': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'tennessee': {
    'nashville': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
    'memphis': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'knoxville': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
  'texas': {
    'houston': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'austin': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'dallas': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'san-antonio': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
    'fort-worth': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  },
  'washington': {
    'seattle': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80',
    'tacoma': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
    'spokane': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  },
};

// Default fallback image for cities without specific images
const defaultCityImage = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80';

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

  // Get city image
  const cityImage = useMemo(() => {
    if (!stateSlug || !citySlug) return defaultCityImage;
    return cityImages[stateSlug]?.[citySlug] || defaultCityImage;
  }, [stateSlug, citySlug]);

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

      {/* Hero Section with City Background */}
      <section className="relative overflow-hidden py-10 md:py-14">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${cityImage})` }}
        />
        
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/40" />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative z-10">
          {/* Breadcrumb */}
          <nav className="mb-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/rehab-centers" className="hover:text-white transition-colors">Find Rehab</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to={`/rehab-centers/${stateData.slug}`} className="hover:text-white transition-colors">{stateData.name}</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">{cityData.name}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium text-white backdrop-blur-sm border border-white/10">
              <MapPin className="h-4 w-4" />
              {fullLocation}
            </div>
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
              Drug & Alcohol Rehab Centers in {cityData.name}, {stateData.abbreviation}
            </h1>
            
            <p className="mt-4 text-base md:text-lg text-white/85 leading-relaxed max-w-2xl">
              {cityData.description}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4 md:gap-6">
              <div className="flex items-center gap-2 text-white text-sm md:text-base">
                <Building2 className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                <span className="font-semibold">{cityCenters.length}</span>
                <span className="text-white/80">Verified Facilities</span>
              </div>
              <div className="flex items-center gap-2 text-white text-sm md:text-base">
                <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                <span className="text-white/80">Insurance Verified</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto shadow-lg">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to={`/rehab-centers?location=${encodeURIComponent(fullLocation)}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                  <Search className="h-4 w-4" />
                  Search {cityData.name}
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
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Need Help Finding Treatment in {cityData.name}?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our team can help you find the right treatment center based on your specific needs, 
              insurance coverage, and preferences.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/request-help">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Get Free Assistance
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateData.slug}`}>
                <Button variant="outline" size="lg" className="gap-2">
                  View All {stateData.name} Centers
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

export default CityPage;
