import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "v5.0.0";
const DEPLOYED_AT = new Date().toISOString();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://rehablookup.com";

const US_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new-hampshire",
  "new-jersey", "new-mexico", "new-york", "north-carolina", "north-dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode-island", "south-carolina", "south-dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west-virginia",
  "wisconsin", "wyoming"
];

const MAJOR_CITIES = [
  { city: "los-angeles", state: "california" },
  { city: "new-york-city", state: "new-york" },
  { city: "chicago", state: "illinois" },
  { city: "houston", state: "texas" },
  { city: "phoenix", state: "arizona" },
  { city: "philadelphia", state: "pennsylvania" },
  { city: "san-antonio", state: "texas" },
  { city: "san-diego", state: "california" },
  { city: "dallas", state: "texas" },
  { city: "san-jose", state: "california" },
  { city: "austin", state: "texas" },
  { city: "jacksonville", state: "florida" },
  { city: "fort-worth", state: "texas" },
  { city: "columbus", state: "ohio" },
  { city: "charlotte", state: "north-carolina" },
  { city: "san-francisco", state: "california" },
  { city: "indianapolis", state: "indiana" },
  { city: "seattle", state: "washington" },
  { city: "denver", state: "colorado" },
  { city: "boston", state: "massachusetts" },
  { city: "nashville", state: "tennessee" },
  { city: "detroit", state: "michigan" },
  { city: "portland", state: "oregon" },
  { city: "las-vegas", state: "nevada" },
  { city: "miami", state: "florida" },
  { city: "atlanta", state: "georgia" },
  { city: "tampa", state: "florida" },
  { city: "orlando", state: "florida" },
  { city: "scottsdale", state: "arizona" },
  { city: "malibu", state: "california" },
];

interface RouteEntry {
  path: string;
  priority: number;
  changefreq: string;
}

// ==================== ALL STATIC ROUTES ====================
const STATIC_ROUTES: RouteEntry[] = [
  // CORE PAGES
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/rehab-centers", priority: 0.95, changefreq: "daily" },
  { path: "/locations", priority: 0.9, changefreq: "weekly" },
  { path: "/treatment-types", priority: 0.9, changefreq: "weekly" },
  { path: "/insurance", priority: 0.85, changefreq: "weekly" },
  { path: "/resources", priority: 0.85, changefreq: "daily" },
  { path: "/about", priority: 0.7, changefreq: "monthly" },
  { path: "/contact", priority: 0.7, changefreq: "monthly" },
  { path: "/how-it-works", priority: 0.8, changefreq: "monthly" },
  { path: "/for-providers", priority: 0.75, changefreq: "monthly" },
  { path: "/concierge", priority: 0.85, changefreq: "weekly" },
  { path: "/international", priority: 0.75, changefreq: "monthly" },
  { path: "/international/apply", priority: 0.7, changefreq: "monthly" },
  { path: "/cost-estimator", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-resources", priority: 0.7, changefreq: "monthly" },
  { path: "/provider-faq", priority: 0.7, changefreq: "monthly" },
  { path: "/provider-support", priority: 0.6, changefreq: "monthly" },
  { path: "/faq", priority: 0.7, changefreq: "monthly" },

  // TREATMENT TYPE PAGES (only routes that exist in App.tsx)
  { path: "/treatment-types/drug-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/alcohol-rehabilitation", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/dual-diagnosis-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/detox-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/outpatient-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/residential-inpatient", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/holistic-therapy", priority: 0.8, changefreq: "weekly" },
  { path: "/treatment-types/luxury-rehab", priority: 0.8, changefreq: "weekly" },

  // NEAR-ME PAGES (all defined in App.tsx)
  { path: "/drug-rehab-near-me", priority: 0.95, changefreq: "daily" },
  { path: "/alcohol-rehab-near-me", priority: 0.95, changefreq: "daily" },
  { path: "/detox-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/inpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/outpatient-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/outpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/dual-diagnosis-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/dual-diagnosis-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/luxury-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/free-rehab-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/faith-based-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/womens-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/mens-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/teen-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/veterans-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/fentanyl-rehab-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/sober-living-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/medicaid-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/court-ordered-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/suboxone-clinic-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/methadone-clinic-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/holistic-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/christian-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/long-term-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/iop-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/php-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/couples-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/executive-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/rehab-near-me", priority: 0.95, changefreq: "daily" },
  { path: "/mat-clinic-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/affordable-rehab-near-me", priority: 0.9, changefreq: "weekly" },

  // INSURANCE PAGES (only routes that exist in App.tsx)
  { path: "/insurance/aetna-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/bcbs-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/cigna-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/united-healthcare-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/humana-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/kaiser-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/medicare-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/medicaid-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/anthem-rehab", priority: 0.8, changefreq: "weekly" },

  // INTERNATIONAL SEO PAGES
  { path: "/us-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/best-rehab-usa", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/luxury-rehab-america", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/luxury-rehab-california", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/luxury-rehab-florida", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/luxury-rehab-arizona", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/malibu-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/us-rehab/executive-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/us-rehab/private-rehab-america", priority: 0.75, changefreq: "weekly" },
  { path: "/us-rehab/international-patients", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/celebrity-rehab-usa", priority: 0.7, changefreq: "weekly" },
  { path: "/us-rehab/uk-patients", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/uae-middle-east", priority: 0.75, changefreq: "weekly" },
  { path: "/us-rehab/australian-patients", priority: 0.75, changefreq: "weekly" },
  { path: "/us-rehab/canadian-patients", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/european-patients", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/alcohol-rehab-usa", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/drug-rehab-usa", priority: 0.8, changefreq: "weekly" },
  { path: "/us-rehab/dual-diagnosis-usa", priority: 0.75, changefreq: "weekly" },
  // High-intent international
  { path: "/travel-to-usa-for-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/cost-of-rehab-in-usa-for-international-patients", priority: 0.85, changefreq: "weekly" },
  { path: "/can-foreigners-go-to-rehab-in-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/paying-for-rehab-in-usa-without-insurance", priority: 0.85, changefreq: "weekly" },
  { path: "/affordable-rehab-in-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/fast-admission-rehab-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/same-day-detox-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/top-detox-centers-usa", priority: 0.85, changefreq: "weekly" },

  // COMPARISON PAGES
  { path: "/inpatient-vs-outpatient-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/detox-vs-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/private-vs-public-rehab", priority: 0.85, changefreq: "monthly" },

  // TREATMENT HUB PAGES
  { path: "/alcohol-rehab-centers", priority: 0.85, changefreq: "weekly" },
  { path: "/drug-rehab-centers", priority: 0.85, changefreq: "weekly" },
  { path: "/detox-centers", priority: 0.85, changefreq: "weekly" },
  { path: "/inpatient-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/outpatient-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/dual-diagnosis-treatment", priority: 0.85, changefreq: "weekly" },

  // COST & INSURANCE HUB
  { path: "/rehab-cost", priority: 0.85, changefreq: "monthly" },
  { path: "/does-insurance-cover-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/free-rehab-centers", priority: 0.85, changefreq: "monthly" },
  { path: "/medicaid-rehab-centers", priority: 0.85, changefreq: "monthly" },

  // SUBSTANCE-SPECIFIC LANDING PAGES
  { path: "/cocaine-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/opioid-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/heroin-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/meth-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/prescription-drug-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/benzodiazepine-addiction-treatment", priority: 0.85, changefreq: "weekly" },

  // BEST REHAB IN STATE ROUNDUP PAGES
  { path: "/best-rehab-centers-in-california", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-florida", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-texas", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-new-york", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-arizona", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-colorado", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-pennsylvania", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-ohio", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-illinois", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-georgia", priority: 0.85, changefreq: "weekly" },

  // RESOURCE ARTICLES (static slugs)
  { path: "/resources/signs-of-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/how-to-help-loved-one", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/what-to-expect-in-rehab", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/insurance-coverage-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/detox-timeline", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/aftercare-planning", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/family-support-guide", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/relapse-prevention", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/choosing-right-program", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/understanding-levels-of-care", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/fentanyl-crisis-guide", priority: 0.85, changefreq: "monthly" },
  { path: "/resources/opioid-epidemic-facts", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/alcohol-withdrawal-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/dual-diagnosis-explained", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/medication-assisted-treatment-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/intervention-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/paying-for-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/resources/questions-to-ask-rehab", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/outpatient-vs-inpatient", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/recovery-support-groups", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/mental-health-addiction-connection", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/youth-addiction-warning-signs", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/veterans-addiction-resources", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/workplace-addiction-support", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/holistic-recovery-approaches", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/12-step-program-guide", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/non-12-step-alternatives", priority: 0.75, changefreq: "monthly" },
  { path: "/resources/luxury-vs-standard-rehab", priority: 0.7, changefreq: "monthly" },
  { path: "/resources/rebuilding-life-after-rehab", priority: 0.8, changefreq: "monthly" },
  { path: "/resources/sober-living-guide", priority: 0.8, changefreq: "monthly" },

  // PROVIDER GUIDES
  { path: "/providers/resources", priority: 0.8, changefreq: "weekly" },
  { path: "/provider-guides/get-more-rehab-patients", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-admissions-growth", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-marketing-strategies", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/addiction-treatment-lead-generation", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/increase-rehab-admissions", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-center-marketing-ideas", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/treatment-center-patient-acquisition", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/behavioral-health-lead-generation", priority: 0.8, changefreq: "monthly" },

  // LEGAL
  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms-of-service", priority: 0.3, changefreq: "yearly" },
];

// Near-me types that have /:stateSlug routes
const NEAR_ME_TYPES_WITH_STATES = [
  "drug-rehab-near-me",
  "alcohol-rehab-near-me",
  "detox-near-me",
  "inpatient-rehab-near-me",
  "outpatient-near-me",
  "outpatient-rehab-near-me",
  "dual-diagnosis-near-me",
  "dual-diagnosis-rehab-near-me",
  "free-rehab-near-me",
  "luxury-rehab-near-me",
  "womens-rehab-near-me",
  "mens-rehab-near-me",
  "teen-rehab-near-me",
  "veterans-rehab-near-me",
  "fentanyl-rehab-near-me",
  "sober-living-near-me",
  "medicaid-rehab-near-me",
  "court-ordered-rehab-near-me",
  "suboxone-clinic-near-me",
  "methadone-clinic-near-me",
  "faith-based-rehab-near-me",
];

// Treatment types that have state/city sub-routes
const TREATMENT_TYPES_WITH_GEO = [
  "drug-addiction",
  "alcohol-rehabilitation",
  "dual-diagnosis-treatment",
  "residential-inpatient",
  "outpatient-programs",
  "detox-programs",
];

// All 50 states for near-me state pages (full coverage)
const TOP_STATES_FOR_NEAR_ME = [...US_STATES];

// All 50 states for treatment type geo pages
const TOP_STATES_FOR_TREATMENT = [...US_STATES];

// Top cities per state for treatment geo
const TOP_CITIES_FOR_TREATMENT: Record<string, string[]> = {
  "california": ["los-angeles", "san-diego", "san-francisco", "san-jose", "malibu"],
  "florida": ["miami", "tampa", "orlando", "jacksonville"],
  "texas": ["houston", "dallas", "austin", "san-antonio", "fort-worth"],
  "new-york": ["new-york-city"],
  "arizona": ["phoenix", "scottsdale"],
  "colorado": ["denver"],
  "ohio": ["columbus"],
  "pennsylvania": ["philadelphia"],
  "illinois": ["chicago"],
  "georgia": ["atlanta"],
};

// City+Treatment combo pages - all 50 cities × 6 treatment types (generated dynamically)
const ALL_CITY_SLUGS = [
  "new-york", "los-angeles", "chicago", "houston", "phoenix", "dallas", "miami", "atlanta",
  "denver", "seattle", "san-diego", "san-francisco", "boston", "philadelphia", "san-antonio",
  "austin", "jacksonville", "columbus", "charlotte", "indianapolis", "portland", "nashville",
  "las-vegas", "memphis", "louisville", "minneapolis", "detroit", "sacramento", "tampa",
  "salt-lake-city", "baltimore", "milwaukee", "kansas-city", "tucson", "raleigh", "richmond",
  "new-orleans", "pittsburgh", "oklahoma-city", "honolulu", "albuquerque", "omaha",
  "virginia-beach", "boise", "spokane", "orlando", "scottsdale", "st-louis", "cleveland", "cincinnati"
];
const CITY_TREATMENT_PREFIXES = [
  "alcohol-rehab-in", "drug-rehab-in", "detox-centers-in",
  "inpatient-rehab-in", "outpatient-rehab-in", "dual-diagnosis-treatment-in"
];

// Insurance + State cross pages
const INSURANCE_SLUGS = [
  "aetna-rehab", "bcbs-treatment", "cigna-rehab",
  "united-healthcare-rehab", "humana-rehab", "kaiser-rehab",
  "medicare-rehab", "medicaid-rehab", "anthem-rehab"
];
const INSURANCE_STATES = [
  "alabama", "alaska", "arizona", "arkansas", "california", "colorado", "connecticut",
  "delaware", "florida", "georgia", "hawaii", "idaho", "illinois", "indiana", "iowa",
  "kansas", "kentucky", "louisiana", "maine", "maryland", "massachusetts", "michigan",
  "minnesota", "mississippi", "missouri", "montana", "nebraska", "nevada", "new-hampshire",
  "new-jersey", "new-mexico", "new-york", "north-carolina", "north-dakota", "ohio",
  "oklahoma", "oregon", "pennsylvania", "rhode-island", "south-carolina", "south-dakota",
  "tennessee", "texas", "utah", "vermont", "virginia", "washington", "west-virginia",
  "wisconsin", "wyoming"
];

function generateStateRoutes(): RouteEntry[] {
  return US_STATES.map(state => ({
    path: `/rehab-centers/${state}`,
    priority: 0.85,
    changefreq: "weekly"
  }));
}

function generateCityRoutes(): RouteEntry[] {
  return MAJOR_CITIES.map(({ city, state }) => ({
    path: `/rehab-centers/${state}/${city}`,
    priority: 0.8,
    changefreq: "weekly"
  }));
}

function generateStateNearMeRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const state of TOP_STATES_FOR_NEAR_ME) {
    for (const type of NEAR_ME_TYPES_WITH_STATES) {
      routes.push({
        path: `/${type}/${state}`,
        priority: 0.8,
        changefreq: "weekly"
      });
    }
  }
  return routes;
}

function generateTreatmentGeoRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const type of TREATMENT_TYPES_WITH_GEO) {
    for (const state of TOP_STATES_FOR_TREATMENT) {
      routes.push({
        path: `/treatment-types/${type}/${state}`,
        priority: 0.8,
        changefreq: "weekly"
      });
      const cities = TOP_CITIES_FOR_TREATMENT[state] || [];
      for (const city of cities) {
        routes.push({
          path: `/treatment-types/${type}/${state}/${city}`,
          priority: 0.75,
          changefreq: "weekly"
        });
      }
    }
  }
  return routes;
}

function generateCityTreatmentComboRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const prefix of CITY_TREATMENT_PREFIXES) {
    for (const city of ALL_CITY_SLUGS) {
      routes.push({
        path: `/${prefix}-${city}`,
        priority: 0.8,
        changefreq: "weekly"
      });
    }
  }
  // Insurance + State cross pages
  for (const ins of INSURANCE_SLUGS) {
    for (const state of INSURANCE_STATES) {
      routes.push({
        path: `/insurance/${ins}/${state}`,
        priority: 0.8,
        changefreq: "weekly"
      });
    }
  }
  return routes;
}

function generateUrlEntry(
  path: string,
  priority: number,
  changefreq: string,
  lastmod: string,
  images?: { loc: string; title?: string }[]
): string {
  let entry = `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(2)}</priority>`;

  if (images && images.length > 0) {
    for (const img of images) {
      entry += `
    <image:image>
      <image:loc>${img.loc}</image:loc>${img.title ? `
      <image:title>${escapeXml(img.title)}</image:title>` : ''}
    </image:image>`;
    }
  }

  entry += `
  </url>`;
  return entry;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

async function generateMainSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  const today = new Date().toISOString().split("T")[0];

  const { data: articles } = await supabase
    .from("blog_articles")
    .select("slug, updated_at")
    .eq("status", "published");

  const articleRoutes: RouteEntry[] = (articles || []).map(article => ({
    path: `/resources/${article.slug}`,
    priority: 0.8,
    changefreq: "monthly"
  }));

  // Deduplicate: blog articles override static resource entries
  const articleSlugs = new Set(articleRoutes.map(r => r.path));
  const filteredStatic = STATIC_ROUTES.filter(r => !articleSlugs.has(r.path));

  const allRoutes = [
    ...filteredStatic,
    ...generateStateRoutes(),
    ...generateCityRoutes(),
    ...generateStateNearMeRoutes(),
    ...generateTreatmentGeoRoutes(),
    ...generateCityTreatmentComboRoutes(),
    ...articleRoutes
  ];

  // Deduplicate by path
  const seen = new Set<string>();
  const unique = allRoutes.filter(r => {
    if (seen.has(r.path)) return false;
    seen.add(r.path);
    return true;
  });

  unique.sort((a, b) => b.priority - a.priority);

  const urlEntries = unique
    .map(route => generateUrlEntry(route.path, route.priority, route.changefreq, today))
    .join("\n");

  console.log(`[Sitemap ${VERSION}] Generated main sitemap with ${unique.length} URLs (${articleRoutes.length} articles, ${generateStateNearMeRoutes().length} near-me state pages, ${generateTreatmentGeoRoutes().length} treatment geo pages)`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

function generateSitemapIndex(): string {
  const today = new Date().toISOString().split("T")[0];

  console.log(`[Sitemap ${VERSION}] Generated sitemap index with 2 child sitemaps`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-facilities.xml</loc>
    <lastmod>${today}</lastmod>
  </sitemap>
</sitemapindex>`;
}

async function generateFacilitiesSitemap(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch ALL approved facilities (handle >1000 with pagination)
  let allFacilities: any[] = [];
  let from = 0;
  const batchSize = 1000;

  while (true) {
    const { data: batch, error } = await supabase
      .from("facilities")
      .select("slug, updated_at, name, city, state, featured, logo_url, gallery_urls")
      .eq("status", "approved")
      .not("slug", "is", null)
      .order("featured", { ascending: false })
      .order("updated_at", { ascending: false })
      .range(from, from + batchSize - 1);

    if (error) {
      console.error(`[Sitemap ${VERSION}] Error fetching facilities:`, error);
      throw error;
    }

    if (!batch || batch.length === 0) break;
    allFacilities = allFacilities.concat(batch);
    if (batch.length < batchSize) break;
    from += batchSize;
  }

  const today = new Date().toISOString().split("T")[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  for (const facility of allFacilities) {
    if (!facility.slug) continue;

    const lastmod = facility.updated_at
      ? new Date(facility.updated_at).toISOString().split("T")[0]
      : today;

    const priority = facility.featured ? 0.9 : 0.75;

    const images: { loc: string; title?: string }[] = [];

    if (facility.logo_url) {
      images.push({
        loc: facility.logo_url,
        title: `${facility.name} Logo`
      });
    }

    if (facility.gallery_urls && Array.isArray(facility.gallery_urls)) {
      for (let i = 0; i < Math.min(3, facility.gallery_urls.length); i++) {
        images.push({
          loc: facility.gallery_urls[i],
          title: `${facility.name} - ${facility.city}, ${facility.state}`
        });
      }
    }

    sitemap += generateUrlEntry(
      `/center/${facility.slug}`,
      priority,
      "weekly",
      lastmod,
      images.length > 0 ? images : undefined
    );
    sitemap += "\n";
  }

  sitemap += `</urlset>`;

  console.log(`[Sitemap ${VERSION}] Generated facilities sitemap with ${allFacilities.length} URLs`);

  return sitemap;
}

Deno.serve(async (req) => {
  console.log(`[Sitemap ${VERSION}] Request received - deployed: ${DEPLOYED_AT}`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "facilities";

    console.log(`[Sitemap ${VERSION}] Request for type: ${type}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let xmlContent: string;

    switch (type) {
      case "index":
      case "sitemap-index":
        xmlContent = generateSitemapIndex();
        break;
      case "main":
        xmlContent = await generateMainSitemap(supabase);
        break;
      case "facilities":
      default:
        xmlContent = await generateFacilitiesSitemap();
        break;
    }

    xmlContent = xmlContent.replace(
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by RehabLookup Sitemap ${VERSION} on ${new Date().toISOString()} -->`
    );

    return new Response(xmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=7200",
        "X-Sitemap-Version": VERSION,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[Sitemap ${VERSION}] Generation error:`, error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generated by RehabLookup Sitemap ${VERSION} - ERROR -->
<error>Failed to generate sitemap: ${escapeXml(errorMessage)}</error>`,
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
          "X-Sitemap-Version": VERSION,
        },
      }
    );
  }
});
