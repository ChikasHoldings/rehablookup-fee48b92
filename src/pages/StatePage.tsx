import { lazy, Suspense, useMemo, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { Loader2 } from "lucide-react";

// Detect when a slug is actually a facility UUID that landed here via a stale
// `/rehab-centers/{id}` link (legacy fallback). Matches v4 UUID format.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Lazy-load the legacy resolver only when a UUID is detected in the path.
// It handles DB lookup (by id or slug) and redirects to /center/{slug}, keeping
// behavior consistent with the dedicated /treatment-centers/{slug} entry point.
const TreatmentCenterProfile = lazy(() => import("./TreatmentCenterProfile"));

import { getStateBySlug, getNearbyStates } from "@/data/locationSeoData";
import { getCountiesForState } from "@/data/countySeoData";
import { getStateArticles } from "@/data/stateArticlesData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { Button } from "@/components/ui/button";
import { NearbyStatesLinks } from "@/components/seo/CityLinkGrid";
import { RelatedLinksSection, defaultInsuranceLinks } from "@/components/seo/RelatedLinksSection";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
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
  ChevronDown,
  HelpCircle,
  Pill,
  Brain,
  Activity,
  Home,
  Stethoscope,
  Sparkles
} from "lucide-react";

// Treatment types for internal linking
const treatmentTypesData = [
  { icon: Pill, title: "Drug Addiction", link: "/treatment-types", param: "?type=drug" },
  { icon: Activity, title: "Alcohol Rehab", link: "/treatment-types", param: "?type=alcohol" },
  { icon: Brain, title: "Dual Diagnosis", link: "/treatment-types", param: "?type=dual-diagnosis" },
  { icon: Home, title: "Residential Inpatient", link: "/treatment-types", param: "?type=inpatient" },
  { icon: Stethoscope, title: "Outpatient Programs", link: "/treatment-types", param: "?type=outpatient" },
  { icon: Sparkles, title: "Holistic Therapy", link: "/treatment-types", param: "?type=holistic" },
];
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

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

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Recover gracefully from stale `/rehab-centers/{uuid}` links: if the slug
  // is a UUID matching a known facility, redirect to its canonical profile.
  const uuidMatch = useMemo(() => {
    if (!stateSlug || !UUID_RE.test(stateSlug)) return null;
    return approvedFacilities.find((f: any) => f.id === stateSlug) || null;
  }, [stateSlug, approvedFacilities]);

  const stateCenters = useMemo(() => {
    if (!stateData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();
    
    return approvedFacilities.filter(center => 
      center.state.toLowerCase() === stateNameLower ||
      center.state.toLowerCase() === stateAbbrevLower
    ).sort((a, b) => {
      // Pro subscriptions first
      const aPro = (a as any).isPro ? 1 : 0;
      const bPro = (b as any).isPro ? 1 : 0;
      if (bPro !== aPro) return bPro - aPro;
      
      // Then by calculated ranking score
      const aScore = (a as any).calculatedRankingScore || 0;
      const bScore = (b as any).calculatedRankingScore || 0;
      if (bScore !== aScore) return bScore - aScore;
      
      // Fallback to name
      return a.name.localeCompare(b.name);
    });
  }, [approvedFacilities, stateData]);

  const nearbyStates = stateData ? getNearbyStates(stateData.slug, 4) : [];
  const counties = stateData ? getCountiesForState(stateData.slug) : [];
  const capitalImage = stateSlug ? stateCapitalImages[stateSlug] : undefined;
  const stateFAQs = stateData ? getStateFAQs(stateData.name, stateData.abbreviation, stateData.cities.length, stateCenters.length) : [];
  const displayedCities = showAllCities ? stateData?.cities : stateData?.cities.slice(0, 12);

  // Redirect stale `/rehab-centers/{uuid}` links to canonical /center/{slug}
  if (uuidMatch?.slug) {
    return <Navigate to={`/center/${uuidMatch.slug}`} replace />;
  }

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
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Find Rehab", href: "/rehab-centers" },
              { label: stateData.name },
            ]}
          /><div className="max-w-3xl">
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
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto shadow-lg">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to={`/search-results?location=${encodeURIComponent(stateData.name)}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10 backdrop-blur-sm">
                  <Search className="h-4 w-4" />
                  Search {stateData.name}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Results - Always at the top under hero */}
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
            <>
              <ResponsiveListingGrid facilities={stateCenters} maxItems={12} />
              <div className="mt-8 text-center">
                <Link to={`/search-results?location=${encodeURIComponent(stateData.name)}`}>
                  <Button variant="outline" size="lg" className="gap-2">
                    View All Facilities
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-xl border bg-card p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">No Facilities Listed Yet</h3>
              <p className="mt-2 text-muted-foreground">
                We're actively adding verified treatment centers in {stateData.name}.
              </p>
              <Link to="/concierge" className="mt-6 inline-block">
                <Button>Find Treatment</Button>
              </Link>
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

      {/* Treatment Types Section */}
      <section className="border-t bg-secondary/30 py-10">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-foreground md:text-2xl">
              Types of Treatment in {stateData.name}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Explore different addiction treatment approaches available across {stateData.abbreviation}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
            {treatmentTypesData.map((type) => (
              <Link
                key={type.title}
                to={type.link}
                className="group flex flex-col items-center rounded-xl border bg-card p-4 text-center transition-all hover:border-primary/30 hover:shadow-md"
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <type.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-sm font-medium text-foreground">{type.title}</span>
                <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
          <div className="mt-6 text-center">
            <Link to="/treatment-types">
              <Button variant="outline" className="gap-2">
                View All Treatment Types
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
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

      {/* SEO Content - Types of Treatment */}
      <section className="border-t bg-secondary/30 section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Types of Addiction Treatment in {stateData.name}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {stateData.name} offers comprehensive addiction treatment services including medical detoxification, 
                  residential inpatient programs, partial hospitalization (PHP), intensive outpatient (IOP), 
                  and standard outpatient therapy. Each level of care addresses different stages of recovery.
                </p>
                <p>
                  <strong className="text-foreground">Drug Rehab in {stateData.name}</strong> — Specialized programs 
                  treating opioid addiction, stimulant abuse, benzodiazepine dependency, and polysubstance use 
                  with medication-assisted treatment (MAT) and evidence-based therapies.
                </p>
              </div>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  <strong className="text-foreground">Alcohol Rehab in {stateData.name}</strong> — Medically supervised 
                  detox, 12-step programs, cognitive behavioral therapy, and relapse prevention strategies 
                  designed specifically for alcohol use disorder recovery.
                </p>
                <p>
                  <strong className="text-foreground">Dual Diagnosis Treatment</strong> — Many {stateData.abbreviation} facilities 
                  provide integrated care for co-occurring mental health conditions like depression, anxiety, 
                  PTSD, and bipolar disorder alongside addiction treatment.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content - Inpatient vs Outpatient */}
      <section className="border-t bg-card section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Inpatient vs Outpatient Rehab in {stateData.name}
            </h2>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-background p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Home className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Inpatient Rehab in {stateData.abbreviation}</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    24/7 medical supervision and support
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Structured environment free from triggers
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Intensive therapy (30-90 day programs)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Best for severe addiction or co-occurring disorders
                  </li>
                </ul>
              </div>
              <div className="rounded-xl border bg-background p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Stethoscope className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">Outpatient Rehab in {stateData.abbreviation}</h3>
                </div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Maintain work, school, or family obligations
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Flexible scheduling (evenings/weekends)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Lower cost than residential programs
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    Ideal for mild-to-moderate addiction or step-down care
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content - How to Choose */}
      <section className="border-t bg-secondary/30 section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              How to Choose a Rehab Center in {stateData.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { title: "Verify Accreditation", desc: "Look for Joint Commission or CARF accreditation ensuring quality standards" },
                { title: "Check Treatment Approaches", desc: "Ensure they offer evidence-based therapies like CBT, DBT, or MAT" },
                { title: "Review Staff Credentials", desc: "Licensed counselors, physicians, and addiction specialists on staff" },
                { title: "Confirm Insurance Coverage", desc: `Verify your plan is accepted by ${stateData.abbreviation} facilities` },
                { title: "Consider Location", desc: "Close to home for family involvement or away for focused recovery" },
                { title: "Evaluate Aftercare Support", desc: "Strong alumni programs and ongoing support improve long-term success" },
              ].map((item, idx) => (
                <div key={idx} className="rounded-lg border bg-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                      {idx + 1}
                    </div>
                    <h3 className="font-semibold text-foreground text-sm">{item.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEO Content - Insurance & Payment */}
      <section className="border-t bg-card section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Insurance & Payment Options in {stateData.name}
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed mb-6">
              <p>
                Most rehab centers in {stateData.name} accept major health insurance plans under the 
                Affordable Care Act (ACA) and Mental Health Parity laws. This includes private insurance, 
                employer-sponsored plans, {stateData.abbreviation} Medicaid, and Medicare coverage for addiction treatment.
              </p>
              <p>
                For those without insurance, many {stateData.abbreviation} facilities offer sliding-scale fees based on income, 
                payment plans, and some provide state-funded or free treatment options through SAMHSA grants.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
              {["Medicaid", "Medicare", "Private Insurance", "Self-Pay Options"].map((option) => (
                <div key={option} className="flex items-center gap-2 rounded-lg border bg-background p-3">
                  <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                  <span className="text-sm font-medium text-foreground">{option}</span>
                </div>
              ))}
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

      {/* County Links */}
      {counties.length > 0 && (
        <section className="py-12 md:py-16 border-t border-border/40">
          <div className="container">
            <h2 className="mb-6 font-display text-xl font-bold text-foreground md:text-2xl">
              Counties in {stateData.name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {counties.map((county) => (
                <Link
                  key={county.slug}
                  to={`/rehab-centers/${stateData.slug}/county/${county.slug}`}
                  className="rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm font-medium text-foreground hover:border-primary/40 hover:bg-accent/5 transition-colors"
                >
                  {county.name} County
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* State Articles */}
      {(() => {
        const articles = getStateArticles(stateData.slug);
        if (articles.length === 0) return null;
        return (
          <section className="py-12 md:py-16 border-t border-border/40">
            <div className="container">
              <h2 className="mb-2 font-display text-xl font-bold text-foreground md:text-2xl">
                {stateData.name} Treatment Guides
              </h2>
              <p className="mb-6 text-muted-foreground">In-depth articles about finding and affording treatment in {stateData.name}</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {articles.map(a => (
                  <Link
                    key={a.slug}
                    to={`/rehab-centers/${stateData.slug}/articles/${a.slug}`}
                    className="group rounded-xl border border-border/60 bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all"
                  >
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {a.type === "how-to-find" ? "Treatment Guide" : a.type === "cost-of-rehab" ? "Financial Guide" : "City Guide"}
                    </span>
                    <h3 className="mt-2 text-base font-bold text-foreground group-hover:text-primary transition-colors leading-snug">{a.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{a.metaDescription}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      Read article <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

      {/* Related Links for SEO */}
      <RelatedLinksSection
        title={`Related Resources for ${stateData.name}`}
        treatmentLinks={[
          { title: `Detox in ${stateData.name}`, href: `/treatment-types/detox-programs/${stateData.slug}` },
          { title: `Inpatient Rehab in ${stateData.name}`, href: `/treatment-types/residential-inpatient/${stateData.slug}` },
          { title: `Outpatient Programs in ${stateData.name}`, href: `/treatment-types/outpatient-programs/${stateData.slug}` },
          { title: `Dual Diagnosis in ${stateData.name}`, href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}` },
        ]}
        locationLinks={[
          ...counties.slice(0, 4).map(county => ({
            title: `${county.name} County`,
            href: `/rehab-centers/${stateData.slug}/county/${county.slug}`,
          })),
          ...nearbyStates.map(state => ({
            title: `Rehab in ${state.name}`,
            href: `/rehab-centers/${state.slug}`,
          })),
        ]}
        insuranceLinks={defaultInsuranceLinks.slice(0, 5)}
      />

      {/* Smart Internal Links */}
      <SmartInternalLinks
        pageType="state"
        stateSlug={stateData.slug}
        stateName={stateData.name}
      />

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
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
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
