import { useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import { buildCityOverview } from "@/lib/locationDescriptions";
import {
  generateCityContentSections,
  generateCityWhatToExpect,
  generateCityBenefits,
} from "@/utils/cityContentGenerator";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { FeaturedRail } from "@/components/featured/FeaturedRail";
import { LandingFeaturedSection } from "@/components/featured/LandingFeaturedSection";
import { useFacilityChildData } from "@/hooks/useFacilityChildData";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { citiesMatch } from "@/lib/cityNameMatch";

import { getStateBySlug, getCityBySlug } from "@/data/locationSeoData";
import { getStateArticles } from "@/data/stateArticlesData";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
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
  ChevronDown,
  HelpCircle,
  Home,
  Pill,
  Brain,
  Activity,
  Stethoscope,
  Sparkles
} from "lucide-react";

// Treatment types for internal linking
const treatmentTypesData = [
  // Use canonical /treatment-types/<slug> paths so internal links concentrate
  // PageRank on the indexable SEO targets (the query-string variant is not).
  { icon: Pill, title: "Drug Addiction", link: "/treatment-types/drug-addiction-treatment", param: "" },
  { icon: Activity, title: "Alcohol Rehab", link: "/treatment-types/alcohol-rehabilitation", param: "" },
  { icon: Brain, title: "Dual Diagnosis", link: "/treatment-types/dual-diagnosis-treatment", param: "" },
  { icon: Home, title: "Residential Inpatient", link: "/treatment-types/residential-inpatient", param: "" },
  { icon: Stethoscope, title: "Outpatient Programs", link: "/treatment-types/outpatient-programs", param: "" },
  { icon: Sparkles, title: "Holistic Therapy", link: "/treatment-types/holistic-therapy", param: "" },
];
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

// City images mapping
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

const defaultCityImage = 'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1920&q=80';

// City FAQ generator
const getCityFAQs = (cityName: string, stateName: string, stateAbbrev: string, facilityCount: number) => [
  {
    question: `What is the best rehab center in ${cityName}, ${stateAbbrev}?`,
    answer: `The best rehab center in ${cityName} depends on your specific needs, including the type of addiction, preferred treatment approach, insurance coverage, and budget. We recommend comparing ${facilityCount > 0 ? facilityCount : 'multiple'} verified facilities in ${cityName}, checking their accreditations (Joint Commission, CARF), reading reviews, and scheduling consultations to find the best fit for your recovery journey.`
  },
  {
    question: `How much does rehab cost in ${cityName}?`,
    answer: `Rehab costs in ${cityName}, ${stateAbbrev} vary by program type. Outpatient programs typically cost $1,000-$10,000 for 3 months, while intensive outpatient (IOP) runs $3,000-$15,000. Residential inpatient treatment ranges from $6,000-$60,000+ for 30 days depending on amenities. Most facilities accept insurance, which can significantly reduce out-of-pocket costs.`
  },
  {
    question: `Does insurance cover rehab in ${cityName}, ${stateAbbrev}?`,
    answer: `Yes, most health insurance plans are required to cover addiction treatment in ${cityName} under federal parity laws. This includes private insurance, employer plans, ${stateAbbrev} Medicaid, and Medicare. Coverage typically includes detox, inpatient, outpatient, and medication-assisted treatment. Contact your insurance provider or the treatment center to verify your specific benefits.`
  },
  {
    question: `What types of addiction treatment are available in ${cityName}?`,
    answer: `${cityName} offers comprehensive addiction treatment options including: medical detoxification for safe withdrawal, residential/inpatient programs (30-90 days), partial hospitalization programs (PHP), intensive outpatient programs (IOP), standard outpatient therapy, medication-assisted treatment (MAT) for opioid and alcohol addiction, and dual diagnosis programs for co-occurring mental health conditions.`
  },
  {
    question: `How long is rehab in ${cityName}?`,
    answer: `Treatment duration in ${cityName} varies by program and individual needs. Detox typically lasts 3-10 days. Short-term residential programs run 28-30 days, while long-term programs last 60-90+ days. Outpatient programs usually span 8-16 weeks. Research shows longer treatment (90+ days) significantly improves outcomes, though the right duration depends on your specific situation.`
  },
  {
    question: `Are there free rehab centers in ${cityName}, ${stateAbbrev}?`,
    answer: `Yes, ${cityName} has free and low-cost treatment options. These include state-funded treatment programs, non-profit rehab centers, Salvation Army programs, faith-based facilities, and centers accepting ${stateAbbrev} Medicaid. SAMHSA's National Helpline (1-800-662-4357) can help locate free treatment options near you.`
  }
];

const CityPage = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const cityData = stateSlug && citySlug ? getCityBySlug(stateSlug, citySlug) : undefined;
  const [showAllCities, setShowAllCities] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const cityCenters = useMemo(() => {
    if (!stateData || !cityData) return [];
    const stateNameLower = stateData.name.toLowerCase();
    const stateAbbrevLower = stateData.abbreviation.toLowerCase();

    return approvedFacilities.filter(center => {
      const centerState = center.state.toLowerCase();
      const stateMatch = centerState === stateNameLower || centerState === stateAbbrevLower;
      if (!stateMatch) return false;
      // citiesMatch normalizes both sides for Saint/Fort/Mount/Point
      // abbreviation differences + punctuation. Without this, SAMHSA
      // facilities with city="St. Louis" never appeared on the
      // "Saint Louis" city page (and vice versa).
      return citiesMatch(center.city, cityData.name);
    }).sort((a, b) => {
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
  }, [approvedFacilities, stateData, cityData]);

  const otherCities = stateData?.cities.filter(c => c.slug !== citySlug) || [];
  const displayedCities = showAllCities ? otherCities : otherCities.slice(0, 8);

  const cityImage = useMemo(() => {
    if (!stateSlug || !citySlug) return defaultCityImage;
    return cityImages[stateSlug]?.[citySlug] || defaultCityImage;
  }, [stateSlug, citySlug]);

  // Batched lookup of services/insurance/age_groups/accreditations for
  // every facility on this page — 4 IN-list queries instead of 4×N.
  const cardIds = useMemo(() => cityCenters.slice(0, 12).map((c) => c.id), [cityCenters]);
  const { data: childData } = useFacilityChildData(cardIds);

  if (!stateData || !cityData) {
    // Render NotFound in place instead of soft-redirecting to /rehab-centers
    // (which Google interpreted as a soft-404 + wasted crawl budget).
    return <NotFound />;
  }

  const fullLocation = `${cityData.name}, ${stateData.abbreviation}`;
  const cityFAQs = getCityFAQs(cityData.name, stateData.name, stateData.abbreviation, cityCenters.length);

  // FAQ Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": cityFAQs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // Combined structured data
  const structuredData = [
    {
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
    },
    faqSchema
  ];

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

      {/* Hero — directory-style, image-driven, low text.
          Mirrors StatePage hero: bold H1, one-line subtitle,
          breadcrumb, primary CTA, and a care-level chip rail. The
          per-city de-templated prose moves into the "About" card
          below the directory results so SEO depth survives without
          turning the hero into a blog opener. */}
      <section className="relative overflow-hidden border-b border-white/5">
        {cityImage && (
          <img
            src={cityImage}
            alt=""
            aria-hidden="true"
            width={1600}
            height={520}
            fetchPriority="high"
            loading="eager"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/85 via-slate-900/80 to-primary/70" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(255,255,255,0.06),_transparent_60%)]" />

        <div className="container relative z-10 py-8 md:py-12">
          <BreadcrumbNav
            className="mb-5 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[
              { label: "Find Rehab", href: "/rehab-centers" },
              { label: stateData.name, href: `/rehab-centers/${stateData.slug}` },
              { label: cityData.name },
            ]}
          />
          <div className="grid items-end gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white/90 backdrop-blur-sm ring-1 ring-white/15">
                <MapPin className="h-3.5 w-3.5" />
                {fullLocation} · City Directory
              </div>
              <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                Rehab Centers in {cityData.name}
              </h1>
              <p className="mt-3 text-base text-white/80 md:text-lg max-w-xl">
                Compare verified addiction treatment programs in {cityData.name}, {stateData.abbreviation}. Filter by care level, insurance, and admit speed.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link to="/concierge">
                  <Button size="lg" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                    <Heart className="h-4 w-4" />
                    Get Personalized Help
                  </Button>
                </Link>
                <Link to={`/search-results?location=${encodeURIComponent(fullLocation)}`}>
                  <Button
                    size="lg"
                    variant="outline"
                    className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
                  >
                    <Search className="h-4 w-4" />
                    Browse {cityData.name}
                  </Button>
                </Link>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-2 gap-3">
              <LocationStatTile
                label={cityCenters.length === 1 ? "Verified Facility" : "Verified Facilities"}
                value={isLoading ? "—" : cityCenters.length.toLocaleString()}
                icon={Building2}
              />
              {cityData.population > 0 && (
                <LocationStatTile
                  label="Population"
                  value={cityData.population >= 1_000_000
                    ? `${(cityData.population / 1_000_000).toFixed(1)}M`
                    : cityData.population >= 1_000
                      ? `${Math.round(cityData.population / 1_000)}K`
                      : cityData.population.toLocaleString()}
                  icon={Home}
                />
              )}
              <LocationStatTile
                label="State"
                value={stateData.abbreviation}
                icon={MapPin}
              />
              <LocationStatTile
                label="Insurance"
                value="Most plans"
                icon={Shield}
              />
            </div>
          </div>
        </div>

        {/* Care-level chip rail — directory hallmark. Links into the
            state-scoped /treatment-types/.../<state> pages so seekers
            jump straight to the right level of care for this region. */}
        <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="container py-3">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-white/60 mr-1">
                Care:
              </span>
              {[
                { label: "Detox", href: `/treatment-types/detox-programs/${stateData.slug}` },
                { label: "Inpatient", href: `/treatment-types/residential-inpatient/${stateData.slug}` },
                { label: "Outpatient", href: `/treatment-types/outpatient-programs/${stateData.slug}` },
                { label: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}` },
                { label: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateData.slug}` },
                { label: "Drug Rehab", href: `/treatment-types/drug-addiction/${stateData.slug}` },
              ].map((chip) => (
                <Link
                  key={chip.label}
                  to={chip.href}
                  className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                >
                  {chip.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-only stat band — keeps key metrics visible on small
          screens where the hero's stat column is hidden. */}
      <section className="md:hidden border-b bg-secondary/40">
        <div className="container py-4">
          <div className="grid grid-cols-2 gap-2">
            <LocationStatTile
              label="Verified"
              value={isLoading ? "—" : cityCenters.length.toLocaleString()}
              icon={Building2}
              compact
            />
            <LocationStatTile
              label="State"
              value={stateData.abbreviation}
              icon={MapPin}
              compact
            />
          </div>
        </div>
      </section>

      {/* Featured rotation — paid Featured pool for this city, mounted
          directly under the hero. Visual matches the homepage Featured
          section for cross-site consistency. Silent absence when no
          Featured subscribers serve this city. */}
      <LandingFeaturedSection
        placement_type="city"
        placement_value={cityData.slug}
        title={`Featured Treatment Facilities in ${cityData.name}`}
        view_all_href={`/search-results?location=${encodeURIComponent(fullLocation)}`}
      />

      {/* Directory results — the page's centerpiece. Directory-style
          header with H2 + result-count chip on the left, "Full search
          filters" affordance on the right (desktop). */}
      <section className="bg-background py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  All Centers in {cityData.name}
                </h2>
                {!isLoading && cityCenters.length > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
                    {cityCenters.length}
                  </span>
                )}
              </div>
              {!isLoading && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {cityCenters.length > 0
                    ? `Showing top ${Math.min(cityCenters.length, 12)} of ${cityCenters.length} verified ${cityCenters.length === 1 ? "facility" : "facilities"} in ${fullLocation} · sorted by ranking`
                    : `No facilities listed yet in ${cityData.name}.`}
                </p>
              )}
            </div>
            {!isLoading && cityCenters.length > 0 && (
              <Link
                to={`/search-results?location=${encodeURIComponent(fullLocation)}`}
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
              >
                Full search filters <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          {isLoading ? (
            <SearchResultsLoading count={6} />
          ) : cityCenters.length > 0 ? (
            <>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {cityCenters.slice(0, 12).map((center) => (
                  <TreatmentCenterCard
                    key={center.id}
                    center={center as unknown as Parameters<typeof TreatmentCenterCard>[0]["center"]}
                    featured={Boolean(
                      (center as unknown as Record<string, unknown>).hasFeaturedSubscription ??
                        (center as unknown as Record<string, unknown>).featured,
                    )}
                  />
                ))}
              </div>
              <div className="mt-8 text-center">
                <Link to={`/search-results?location=${encodeURIComponent(fullLocation)}`}>
                  <Button variant="outline" size="lg" className="gap-2">
                    View All {cityData.name} Facilities
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border bg-card p-12 text-center">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold">No Facilities Listed Yet in {cityData.name}</h3>
              <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                We're actively adding verified treatment centers. In the meantime, explore treatment options across {stateData.name} or get personalized help.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to={`/rehab-centers/${stateData.slug}`}>
                  <Button variant="outline">View All {stateData.name} Centers</Button>
                </Link>
                <Link to="/concierge">
                  <Button>Get Personalized Help</Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Trust signals — compact dense row (matches StatePage) */}
      <section className="border-b bg-secondary/30 py-6">
        <div className="container">
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {[
              { icon: Shield, title: "Verified Facilities", sub: "Credentials checked" },
              { icon: Clock, title: "Same-Day Admit", sub: "Many programs" },
              { icon: Heart, title: "Compassionate Care", sub: "Recovery-focused" },
              { icon: CheckCircle, title: "Insurance Accepted", sub: "Most major plans" },
            ].map((item) => (
              <div
                key={item.title}
                className="flex items-center gap-3 rounded-lg border bg-card/60 px-3 py-2.5"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
                  <item.icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground leading-tight">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Browse by Care Level — visual tiles, state-scoped links so
          each tile lands the seeker on the right /treatment-types/<x>/
          <state> page (not the national hub). Replaces the previous
          generic 6-icon "Types of Treatment" section. */}
      <section className="border-t bg-secondary/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
                Browse by Care Level
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Filter {stateData.abbreviation} programs by the level of care you need
              </p>
            </div>
            <Link
              to="/treatment-types"
              className="hidden md:inline-flex text-sm font-medium text-primary hover:underline gap-1 items-center"
            >
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {[
              {
                icon: Sparkles,
                title: "Detox",
                desc: "Medical detox under 24/7 supervision",
                href: `/treatment-types/detox-programs/${stateData.slug}`,
              },
              {
                icon: Home,
                title: "Inpatient",
                desc: "30–90 day residential programs",
                href: `/treatment-types/residential-inpatient/${stateData.slug}`,
              },
              {
                icon: Stethoscope,
                title: "Outpatient",
                desc: "PHP, IOP, and standard outpatient",
                href: `/treatment-types/outpatient-programs/${stateData.slug}`,
              },
              {
                icon: Brain,
                title: "Dual Diagnosis",
                desc: "Mental health + addiction integrated",
                href: `/treatment-types/dual-diagnosis-treatment/${stateData.slug}`,
              },
              {
                icon: Activity,
                title: "Alcohol Rehab",
                desc: "Alcohol-use-disorder programs",
                href: `/treatment-types/alcohol-rehabilitation/${stateData.slug}`,
              },
              {
                icon: Pill,
                title: "Drug Rehab",
                desc: "Opioid, stimulant, polysubstance",
                href: `/treatment-types/drug-addiction/${stateData.slug}`,
              },
            ].map((c) => (
              <Link
                key={c.title}
                to={c.href}
                className="group relative overflow-hidden rounded-xl border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                    <c.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-foreground leading-tight group-hover:text-primary transition-colors">
                      {c.title}
                    </h3>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{c.desc}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t bg-secondary/30 py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Rehab FAQs for {cityData.name}, {stateData.abbreviation}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Common questions about addiction treatment in {cityData.name}
              </p>
            </div>

            <div className="space-y-3">
              {cityFAQs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-card overflow-hidden transition-shadow hover:shadow-md"
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

      {/* About + Insurance — consolidated premium section.
          Replaces the previous prose-heavy "Unique City Content
          Sections" (a stack of multi-paragraph article blocks) plus
          the "What to Expect" / "Key Benefits" pair. The same content
          generators still feed the page (so per-city body copy stays
          substantively distinct for SEO), but the layout is now a
          single polished split-pane card instead of long-form prose. */}
      {(() => {
        const contentSections = generateCityContentSections({
          cityName: cityData.name,
          stateName: stateData.name,
          stateAbbr: stateData.abbreviation,
          population: cityData.population,
        });
        const whatToExpect = generateCityWhatToExpect(cityData.name, stateData.abbreviation);
        const benefits = generateCityBenefits(cityData.name, stateData.name, stateData.abbreviation);
        // Use the first generated section as the "About" body. The
        // remaining sections roll up into a compact bulleted summary
        // so we don't lose the de-templated keywords / state stats but
        // also don't dump three paragraphs of prose on the page.
        const aboutHeading = contentSections[0]?.heading ?? `Addiction Treatment in ${cityData.name}`;
        const aboutBody = contentSections[0]?.content
          ?? buildCityOverview(stateData.slug, stateData.name, cityData.name, cityCenters.length, cityData.population);

        return (
          <section className="border-t bg-secondary/30 py-12 md:py-16">
            <div className="container">
              <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                      {aboutHeading}
                    </h2>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed md:text-base">
                    {aboutBody}
                  </p>

                  {/* What to expect — compact bulleted summary,
                      replaces the previous full-card section. */}
                  {whatToExpect.length > 0 && (
                    <div className="mt-6 border-t pt-6">
                      <div className="flex items-center gap-2 mb-3">
                        <Clock className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                          What to Expect
                        </h3>
                      </div>
                      <ul className="grid gap-2 sm:grid-cols-2">
                        {whatToExpect.slice(0, 6).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Key benefits — sidebar card */}
                <div className="rounded-2xl border bg-card p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-accent/10">
                      <Heart className="h-4 w-4 text-accent" />
                    </div>
                    <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                      Why {cityData.name}
                    </h2>
                  </div>
                  <ul className="space-y-2.5">
                    {benefits.slice(0, 5).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <Star className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                        <span className="text-sm text-muted-foreground leading-snug">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/insurance"
                    className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                  >
                    Verify insurance coverage <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </section>
        );
      })()}

      {/* Other Cities */}
      {otherCities.length > 0 && (
        <section className="border-t bg-secondary/30 py-10">
          <div className="container">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-foreground">
                  More Cities in {stateData.name}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Explore {otherCities.length} other cities with treatment centers
                </p>
              </div>
              <Link 
                to={`/rehab-centers/${stateData.slug}`}
                className="hidden sm:inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                View all {stateData.name}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {displayedCities.map((city) => {
                // Live facility-count chip per city — mirrors the
                // StatePage Cities section. Uses the same approved
                // facilities query already loaded for cityCenters.
                const cityFacilityCount = approvedFacilities.filter((f) =>
                  citiesMatch(f.city, city.name),
                ).length;
                return (
                  <Link
                    key={city.slug}
                    to={`/rehab-centers/${stateData.slug}/${city.slug}`}
                    className="group flex items-center gap-3 rounded-xl border bg-background p-3.5 transition-all hover:border-primary/40 hover:bg-primary/5 hover:shadow-md"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/15">
                      <MapPin className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                        {city.name}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {cityFacilityCount > 0
                          ? `${cityFacilityCount} ${cityFacilityCount === 1 ? "center" : "centers"}`
                          : "View centers"}
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-primary" />
                  </Link>
                );
              })}
            </div>

            {otherCities.length > 8 && (
              <div className="mt-6 text-center">
                <Button
                  variant="outline"
                  onClick={() => setShowAllCities(!showAllCities)}
                  className="gap-2"
                >
                  {showAllCities ? 'Show Less' : `Show All ${otherCities.length} Cities`}
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showAllCities && "rotate-180")} />
                </Button>
              </div>
            )}

            <div className="mt-6 sm:hidden">
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

      {/* Parent State Link */}
      <section className="border-t bg-card py-8">
        <div className="container">
          <Link
            to={`/rehab-centers/${stateData.slug}`}
            className="group flex items-center justify-between rounded-xl border bg-background p-5 transition-all hover:border-primary hover:shadow-md"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                {stateData.abbreviation}
              </div>
              <div>
                <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                  View All {stateData.name} Treatment Centers
                </p>
                <p className="text-sm text-muted-foreground">
                  Browse {stateData.cities.length} cities across the state
                </p>
              </div>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </div>
      </section>

      {/* State Treatment Guides */}
      {(() => {
        const articles = getStateArticles(stateData.slug);
        if (articles.length === 0) return null;
        return (
          <section className="py-10 border-t border-border/40">
            <div className="container">
              <h2 className="mb-4 text-lg font-bold text-foreground">{stateData.name} Treatment Guides</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {articles.map(a => (
                  <Link
                    key={a.slug}
                    to={`/rehab-centers/${stateData.slug}/articles/${a.slug}`}
                    className="group rounded-lg border border-border/60 bg-card p-4 hover:border-primary/40 transition-all"
                  >
                    <span className="text-xs font-semibold text-primary uppercase tracking-wider">
                      {a.type === "how-to-find" ? "Guide" : a.type === "cost-of-rehab" ? "Cost" : "Cities"}
                    </span>
                    <p className="mt-1 text-sm font-medium text-foreground group-hover:text-primary transition-colors leading-snug">{a.title}</p>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })()}

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
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
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
