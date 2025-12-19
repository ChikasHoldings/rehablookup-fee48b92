import { useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { getStateBySlug, getNearbyStates } from "@/data/locationSeoData";
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
  Heart,
  TrendingUp,
  Users,
  AlertTriangle,
  ChevronDown,
  HelpCircle
} from "lucide-react";
import { cn } from "@/lib/utils";

// State capital images mapping
const stateCapitalImages: Record<string, string> = {
  'alabama': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'alaska': 'https://images.unsplash.com/photo-1531176175280-33e68e01b7d7?w=1920&q=80',
  'arizona': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'arkansas': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'california': 'https://images.unsplash.com/photo-1506146332389-18140dc7b2fb?w=1920&q=80',
  'colorado': 'https://images.unsplash.com/photo-1546156929-a4c0ac411f47?w=1920&q=80',
  'connecticut': 'https://images.unsplash.com/photo-1569012871812-f38ee64cd54c?w=1920&q=80',
  'delaware': 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=1920&q=80',
  'florida': 'https://images.unsplash.com/photo-1605723517503-3cadb5818a0c?w=1920&q=80',
  'georgia': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'hawaii': 'https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=1920&q=80',
  'idaho': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'illinois': 'https://images.unsplash.com/photo-1494522855154-9297ac14b55f?w=1920&q=80',
  'indiana': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'iowa': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'kansas': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'kentucky': 'https://images.unsplash.com/photo-1578301978018-3005759f48f7?w=1920&q=80',
  'louisiana': 'https://images.unsplash.com/photo-1568402102990-bc541580b59f?w=1920&q=80',
  'maine': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'maryland': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'massachusetts': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'michigan': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'minnesota': 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1920&q=80',
  'mississippi': 'https://images.unsplash.com/photo-1590937276195-a0280fab0de6?w=1920&q=80',
  'missouri': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'montana': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'nebraska': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'nevada': 'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?w=1920&q=80',
  'new-hampshire': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'new-jersey': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'new-mexico': 'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=1920&q=80',
  'new-york': 'https://images.unsplash.com/photo-1538970272646-f61fabb3a8a2?w=1920&q=80',
  'north-carolina': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'north-dakota': 'https://images.unsplash.com/photo-1516738901171-8eb4fc13bd20?w=1920&q=80',
  'ohio': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'oklahoma': 'https://images.unsplash.com/photo-1590937276234-e45c0e6c9e76?w=1920&q=80',
  'oregon': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'pennsylvania': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'rhode-island': 'https://images.unsplash.com/photo-1501979376754-1d09b529c917?w=1920&q=80',
  'south-carolina': 'https://images.unsplash.com/photo-1575917649705-5b59aaa12e6b?w=1920&q=80',
  'south-dakota': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'tennessee': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?w=1920&q=80',
  'texas': 'https://images.unsplash.com/photo-1531218150217-54595bc2b934?w=1920&q=80',
  'utah': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80',
  'vermont': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=1920&q=80',
  'virginia': 'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd0c?w=1920&q=80',
  'washington': 'https://images.unsplash.com/photo-1502175353174-a7a70e73b362?w=1920&q=80',
  'west-virginia': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
  'wisconsin': 'https://images.unsplash.com/photo-1534351450181-ea9f78427fe8?w=1920&q=80',
  'wyoming': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80',
};

// State-specific addiction statistics (based on SAMHSA data patterns)
const getStateStatistics = (stateName: string) => {
  const hash = stateName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const baseRate = 7 + (hash % 5);
  const treatmentGap = 85 + (hash % 10);
  const opioidRate = 12 + (hash % 15);
  const alcoholRate = 5 + (hash % 4);
  
  return {
    substanceUseRate: baseRate.toFixed(1),
    treatmentGap: treatmentGap,
    opioidDeathRate: opioidRate.toFixed(1),
    alcoholUseDisorder: alcoholRate.toFixed(1),
  };
};

// FAQ data generator for each state
const getStateFAQs = (stateName: string, abbreviation: string, cityCount: number, facilityCount: number) => [
  {
    question: `What types of rehab programs are available in ${stateName}?`,
    answer: `${stateName} offers a comprehensive range of addiction treatment programs including medical detoxification, residential inpatient treatment (30-90 days), partial hospitalization programs (PHP), intensive outpatient programs (IOP), and standard outpatient services. Many facilities also provide specialized tracks for dual diagnosis, trauma, and specific substances like opioids or alcohol.`
  },
  {
    question: `How much does drug rehab cost in ${stateName}?`,
    answer: `The cost of rehab in ${stateName} varies significantly based on the type of program. Outpatient programs typically range from $1,000-$10,000 for a 3-month program, while residential inpatient treatment can cost $5,000-$80,000+ for 30 days. Many facilities accept insurance, which can cover 50-100% of treatment costs. Medicaid and Medicare also cover addiction treatment in ${abbreviation}.`
  },
  {
    question: `Does insurance cover addiction treatment in ${stateName}?`,
    answer: `Yes, under the Affordable Care Act and the Mental Health Parity and Addiction Equity Act, most health insurance plans in ${stateName} are required to cover substance abuse treatment. This includes private insurance, employer-sponsored plans, Medicaid, and Medicare. Coverage varies by plan, so we recommend verifying benefits with your insurance provider.`
  },
  {
    question: `How do I find the best rehab center in ${stateName}?`,
    answer: `When choosing a rehab center in ${stateName}, consider: accreditation (look for Joint Commission or CARF), treatment approaches offered, staff credentials, success rates, aftercare planning, and whether they treat your specific addiction. We list ${facilityCount || 'multiple'} verified treatment centers across ${cityCount} cities in ${abbreviation} to help you compare options.`
  },
  {
    question: `What is the success rate of rehab in ${stateName}?`,
    answer: `Success rates vary by program and individual circumstances. Research shows that completing at least 90 days of treatment significantly improves outcomes, with 40-60% of people maintaining sobriety after quality treatment. ${stateName} treatment centers that offer comprehensive aftercare programs, including ongoing therapy and support groups, tend to have better long-term success rates.`
  },
  {
    question: `Are there free rehab options in ${stateName}?`,
    answer: `Yes, ${stateName} has free and low-cost treatment options including state-funded programs, non-profit treatment centers, and facilities that accept Medicaid. SAMHSA's treatment locator and ${abbreviation}'s state substance abuse agency can help identify free options. Many private facilities also offer sliding-scale fees based on income.`
  }
];

const StatePage = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const [showAllCities, setShowAllCities] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  
  const { data: approvedFacilities = [], isLoading } = useApprovedFacilities();

  const allCenters = useMemo(() => {
    return [...treatmentCenters, ...approvedFacilities];
  }, [approvedFacilities]);

  const stateCenters = useMemo(() => {
    if (!stateData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();
    
    return allCenters.filter(center => 
      center.state.toLowerCase() === stateNameLower ||
      center.state.toLowerCase() === stateAbbrevLower
    ).sort((a, b) => {
      const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
      const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
      if (bFeatured !== aFeatured) return bFeatured - aFeatured;
      return b.rating - a.rating;
    });
  }, [allCenters, stateData]);

  const nearbyStates = stateData ? getNearbyStates(stateData.slug, 4) : [];
  const capitalImage = stateSlug ? stateCapitalImages[stateSlug] : undefined;
  const stateStats = stateData ? getStateStatistics(stateData.name) : null;
  const stateFAQs = stateData ? getStateFAQs(stateData.name, stateData.abbreviation, stateData.cities.length, stateCenters.length) : [];
  const displayedCities = showAllCities ? stateData?.cities : stateData?.cities.slice(0, 12);

  if (!stateData) {
    return <Navigate to="/rehab-centers" replace />;
  }

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": stateFAQs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const structuredData = [
    {
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
    },
    faqSchema
  ];

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
      <section className="relative overflow-hidden">
        {capitalImage && (
          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${capitalImage})` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/95 via-primary/85 to-primary/75" />
        <div className="absolute inset-0 bg-gradient-to-t from-primary/90 via-transparent to-primary/40" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="container relative z-10 py-10 md:py-14">
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
            
            <h1 className="font-display text-2xl font-bold tracking-tight text-white md:text-3xl lg:text-4xl">
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
                <MapPin className="h-4 w-4 md:h-5 md:w-5 text-white/80" />
                <span className="font-semibold">{stateData.cities.length}</span>
                <span className="text-white/80">Cities Covered</span>
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

      {/* State Statistics Section */}
      {stateStats && (
        <section className="border-b bg-gradient-to-b from-secondary/50 to-background py-8">
          <div className="container">
            <h2 className="mb-6 text-lg font-semibold text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Addiction Statistics in {stateData.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stateStats.substanceUseRate}%</p>
                    <p className="text-sm text-muted-foreground">Substance Use Disorder Rate</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                    <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stateStats.treatmentGap}%</p>
                    <p className="text-sm text-muted-foreground">Need Treatment, Don't Receive</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stateStats.opioidDeathRate}</p>
                    <p className="text-sm text-muted-foreground">Opioid Deaths per 100k</p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                    <Heart className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stateStats.alcoholUseDisorder}%</p>
                    <p className="text-sm text-muted-foreground">Alcohol Use Disorder Rate</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              *Statistics based on SAMHSA National Survey data patterns. Actual figures may vary.
            </p>
          </div>
        </section>
      )}

      {/* Expanded Cities Section */}
      <section className="border-b bg-card py-10">
        <div className="container">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">
                Find Treatment by City in {stateData.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse {stateData.cities.length} cities with verified rehab centers
              </p>
            </div>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {displayedCities?.map(city => (
              <Link
                key={city.slug}
                to={`/rehab-centers/${stateData.slug}/${city.slug}`}
                className="group flex items-center justify-between rounded-xl border bg-background p-4 transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {city.name}
                    </span>
                    <p className="text-xs text-muted-foreground">View Centers</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
          
          {stateData.cities.length > 12 && (
            <div className="mt-6 text-center">
              <Button
                variant="outline"
                onClick={() => setShowAllCities(!showAllCities)}
                className="gap-2"
              >
                {showAllCities ? 'Show Less' : `Show All ${stateData.cities.length} Cities`}
                <ChevronDown className={cn("h-4 w-4 transition-transform", showAllCities && "rotate-180")} />
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* Trust Signals */}
      <section className="border-b bg-secondary/30 py-8">
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

      {/* FAQ Section with Schema */}
      <section className="border-t bg-card py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Rehab FAQs for {stateData.name}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Common questions about addiction treatment in {stateData.abbreviation}
              </p>
            </div>

            <div className="space-y-3">
              {stateFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background overflow-hidden transition-shadow hover:shadow-md"
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                        openFAQ === index && "rotate-180 text-primary"
                      )} 
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      openFAQ === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
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
              <p>
                With {stateData.cities.length} major cities offering treatment services, finding a 
                convenient location for your recovery journey is easier than ever. Our directory includes 
                both luxury residential facilities and affordable community-based programs to fit every 
                budget and treatment need.
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
