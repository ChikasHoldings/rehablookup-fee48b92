import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "v7.0.0";
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
  { path: "/search-results", priority: 0.9, changefreq: "daily" },
  { path: "/provider-signup", priority: 0.7, changefreq: "monthly" },
  { path: "/provider-roi-calculator", priority: 0.7, changefreq: "monthly" },

  // TREATMENT TYPE PAGES (only routes that exist in App.tsx)
  { path: "/treatment-types/drug-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/alcohol-rehabilitation", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/dual-diagnosis-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/detox-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/outpatient-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/residential-inpatient", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/holistic-therapy", priority: 0.8, changefreq: "weekly" },
  { path: "/treatment-types/luxury-rehab", priority: 0.8, changefreq: "weekly" },

  // Expanded Treatment Hub Pages
  { path: "/sober-living-homes", priority: 0.85, changefreq: "weekly" },
  { path: "/faith-based-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/fentanyl-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/veterans-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/womens-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/mens-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/free-rehab-options", priority: 0.85, changefreq: "weekly" },

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
  { path: "/insurance/tricare-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/molina-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/magellan-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/wellcare-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/ambetter-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/oscar-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/highmark-rehab", priority: 0.75, changefreq: "weekly" },

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
  { path: "/rehab-without-insurance", priority: 0.85, changefreq: "monthly" },
  { path: "/free-rehab-programs", priority: 0.85, changefreq: "monthly" },
  { path: "/rehab-financial-assistance", priority: 0.85, changefreq: "monthly" },

  // SUBSTANCE-SPECIFIC LANDING PAGES
  { path: "/cocaine-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/opioid-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/heroin-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/meth-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/prescription-drug-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/benzodiazepine-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/alcohol-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/marijuana-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/fentanyl-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/xanax-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/adderall-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/kratom-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/gabapentin-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/tramadol-addiction-treatment", priority: 0.85, changefreq: "weekly" },

  // COMPARISON PAGES
  { path: "/php-vs-iop", priority: 0.85, changefreq: "monthly" },
  { path: "/30-day-vs-90-day-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/mat-vs-abstinence-based-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/12-step-vs-non-12-step-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/rehab-vs-therapy", priority: 0.85, changefreq: "monthly" },
  { path: "/inpatient-vs-residential-treatment", priority: 0.85, changefreq: "monthly" },
  { path: "/sober-living-vs-halfway-house", priority: 0.85, changefreq: "monthly" },

  // TREATMENT DURATION PAGES
  { path: "/30-day-rehab-programs", priority: 0.85, changefreq: "monthly" },
  { path: "/60-day-rehab-programs", priority: 0.85, changefreq: "monthly" },
  { path: "/90-day-rehab-programs", priority: 0.85, changefreq: "monthly" },
  { path: "/long-term-rehab-programs", priority: 0.85, changefreq: "monthly" },

  // THERAPY MODALITY PAGES
  { path: "/cbt-therapy-for-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/dbt-therapy-for-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/emdr-therapy-for-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/motivational-interviewing-for-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/art-music-therapy-for-addiction", priority: 0.8, changefreq: "monthly" },
  { path: "/adventure-therapy-for-addiction", priority: 0.8, changefreq: "monthly" },

  // CO-OCCURRING DISORDER PAGES
  { path: "/adhd-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/anxiety-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/bipolar-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/depression-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/eating-disorders-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/ptsd-and-addiction-treatment", priority: 0.8, changefreq: "monthly" },

  // TREATMENT SETTING & ENVIRONMENT PAGES
  { path: "/beach-rehab-programs", priority: 0.8, changefreq: "monthly" },
  { path: "/mountain-rehab-programs", priority: 0.8, changefreq: "monthly" },
  { path: "/luxury-rehab-centers-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/private-rehab-usa", priority: 0.8, changefreq: "monthly" },
  { path: "/confidential-rehab-usa", priority: 0.8, changefreq: "monthly" },

  // RECOVERY SUPPORT & GUIDES
  { path: "/aftercare-and-relapse-prevention", priority: 0.85, changefreq: "monthly" },
  { path: "/questions-to-ask-rehab-center", priority: 0.85, changefreq: "monthly" },
  { path: "/what-to-pack-for-rehab", priority: 0.8, changefreq: "monthly" },

  // EXPANDED TREATMENT TYPE ALIASES
  { path: "/treatment-types/drug-addiction", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/dual-diagnosis", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/faith-based-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/fentanyl-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/free-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/holistic-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/mens-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/sober-living", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/veterans-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/womens-rehab", priority: 0.85, changefreq: "weekly" },

  // INTERNATIONAL PAGES (missing)
  { path: "/best-rehab-centers-in-usa", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-usa-for-foreigners", priority: 0.8, changefreq: "monthly" },
  { path: "/rehab-in-usa-for-international-patients", priority: 0.85, changefreq: "monthly" },
  { path: "/rehab-in-usa-for-canadians", priority: 0.85, changefreq: "monthly" },
  { path: "/rehab-in-usa-for-uk-patients", priority: 0.85, changefreq: "monthly" },

  // TREATMENT HUB PAGES (NEW)
  { path: "/php-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/iop-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/mat-programs", priority: 0.85, changefreq: "weekly" },

  // DEMOGRAPHIC/POPULATION PAGES
  { path: "/young-adult-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/teen-rehab-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/senior-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/lgbtq-rehab-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/pregnant-women-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/first-responders-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/healthcare-professionals-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/executive-rehab-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/teachers-rehab-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/college-student-addiction-treatment", priority: 0.85, changefreq: "weekly" },

  // SEEKER INTENT / FAMILY GUIDE PAGES
  { path: "/how-to-stage-an-intervention", priority: 0.85, changefreq: "monthly" },
  { path: "/signs-loved-one-needs-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/how-to-help-alcoholic-family-member", priority: 0.85, changefreq: "monthly" },
  { path: "/what-to-expect-loved-one-in-rehab", priority: 0.85, changefreq: "monthly" },
  { path: "/how-to-find-rehab-for-family-member", priority: 0.85, changefreq: "monthly" },

  // BEST REHAB IN STATE ROUNDUP PAGES (all 50 states)
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
  { path: "/best-rehab-centers-in-alabama", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-alaska", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-arkansas", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-connecticut", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-delaware", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-hawaii", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-idaho", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-indiana", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-iowa", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-kansas", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-kentucky", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-louisiana", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-maine", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-maryland", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-massachusetts", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-michigan", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-minnesota", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-mississippi", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-missouri", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-montana", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-nebraska", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-nevada", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-new-hampshire", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-new-jersey", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-new-mexico", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-north-carolina", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-north-dakota", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-oklahoma", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-oregon", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-rhode-island", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-south-carolina", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-south-dakota", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-tennessee", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-utah", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-vermont", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-virginia", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-washington", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-west-virginia", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-wisconsin", priority: 0.85, changefreq: "weekly" },
  { path: "/best-rehab-centers-in-wyoming", priority: 0.85, changefreq: "weekly" },

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
  { path: "/provider-guides/rehab-center-seo", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/drug-rehab-advertising", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-census-management", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/treatment-center-referral-sources", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/how-to-open-a-rehab-center", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-insurance-verification", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/iop-marketing-strategies", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/detox-center-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/sober-living-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-reputation-management", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/treatment-center-staffing-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-accreditation-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/substance-abuse-treatment-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/mat-clinic-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/treatment-center-website-design", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-compliance-guide", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-google-business-profile", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-patient-retention", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-email-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/telehealth-addiction-treatment", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-social-media-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/dual-diagnosis-treatment-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-admissions-team-training", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-pay-per-click-advertising", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-content-marketing", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-interventionist-partnerships", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/best-rehab-listing-platforms", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/exclusive-vs-shared-leads", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/how-to-choose-a-rehab-directory", priority: 0.8, changefreq: "monthly" },
  ...US_STATES.map(s => ({ path: `/list-your-facility-in-${s}`, priority: 0.7 as number, changefreq: "monthly" })),
  ...US_STATES.map(s => ({ path: `/for-providers-in-${s}`, priority: 0.7 as number, changefreq: "monthly" })),

  // REHAB MARKETING HUB
  { path: "/rehab-marketing", priority: 0.8, changefreq: "weekly" },

  // PROVIDER CONVERSION: Treatment-Specific
  { path: "/provider-guides/get-more-detox-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-residential-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-iop-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-php-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-sober-living-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-mat-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-luxury-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-dual-diagnosis-patients", priority: 0.75, changefreq: "monthly" },

  // PROVIDER CONVERSION: Insurance-Specific
  { path: "/provider-guides/get-more-medicaid-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-medicare-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-blue-cross-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-aetna-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-cigna-patients", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/get-more-united-healthcare-patients", priority: 0.75, changefreq: "monthly" },

  // PROVIDER COMPARISON PAGES
  { path: "/provider-guides/google-ads-vs-rehab-directories", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/best-rehab-marketing-platforms-2026", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/is-psychology-today-worth-it-for-rehab", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/facebook-ads-vs-seo-for-treatment-centers", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/rehab-lead-generation-paid-vs-organic", priority: 0.75, changefreq: "monthly" },

  // PROVIDER COMPARISON PAGES (Additional)
  { path: "/provider-guides/rehabs-com-vs-rehablookup", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/samhsa-vs-private-rehab-directories", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/call-centers-vs-directories-for-rehab-leads", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/rehab-seo-agency-vs-directory-listing", priority: 0.75, changefreq: "monthly" },

  // PROVIDER PERSONA PAGES (By Facility Type)
  { path: "/provider-guides/small-rehab-center-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/new-rehab-facility-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/faith-based-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/veterans-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/womens-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/executive-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/telehealth-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/court-ordered-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/adolescent-rehab-marketing", priority: 0.75, changefreq: "monthly" },
  { path: "/provider-guides/couples-rehab-marketing", priority: 0.75, changefreq: "monthly" },

  // PROVIDER PAIN POINT PAGES
  { path: "/provider-guides/why-your-rehab-center-isnt-getting-patients", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/reduce-empty-beds-rehab", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-google-ads-not-working", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-admissions-dropping", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-referral-sources-drying-up", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/list-your-rehab-center-online-free", priority: 0.85, changefreq: "monthly" },

  // Provider Business Strategy Pages
  { path: "/provider-guides/increase-rehab-facility-valuation", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-private-equity-investment", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/multi-location-rehab-growth", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-cash-pay-patient-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-revenue-diversification", priority: 0.85, changefreq: "monthly" },

  // Provider Operations Pages
  { path: "/provider-guides/rehab-insurance-denial-management", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/reduce-rehab-patient-no-shows", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-alumni-program-referrals", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-hospital-community-partnerships", priority: 0.85, changefreq: "monthly" },

  // Provider Niche Population Pages
  { path: "/provider-guides/spanish-speaking-rehab-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/lgbtq-affirming-rehab-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/first-responder-rehab-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/healthcare-professional-rehab-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/native-american-tribal-rehab-marketing", priority: 0.85, changefreq: "monthly" },

  // Provider Growth & Expansion Pages
  { path: "/provider-guides/rehab-outpatient-program-expansion", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-center-branding-differentiation", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-medicaid-expansion-strategy", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-crisis-stabilization-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-family-program-marketing", priority: 0.85, changefreq: "monthly" },

  // Provider Industry & Trends Pages
  { path: "/provider-guides/rehab-telehealth-competition-strategy", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-workforce-shortage-solutions", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-joint-commission-marketing", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-aftercare-continuum-marketing", priority: 0.85, changefreq: "monthly" },

  // Provider Digital Marketing Pages
  { path: "/provider-guides/rehab-online-reviews-strategy", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-local-seo-domination", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-video-marketing-strategy", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-conversion-rate-optimization", priority: 0.85, changefreq: "monthly" },

  // Provider Finance & Funding Pages
  { path: "/provider-guides/rehab-billing-revenue-cycle", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-grant-funding-opportunities", priority: 0.85, changefreq: "monthly" },
  { path: "/provider-guides/rehab-data-analytics-growth", priority: 0.85, changefreq: "monthly" },

  // Provider High-Keyword Pages (targeting highest-volume search terms)
  { path: "/provider-guides/addiction-treatment-center-marketing", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/drug-rehab-marketing-strategy", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/alcohol-rehab-marketing-guide", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/inpatient-rehab-marketing", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/detox-center-patient-acquisition", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/iop-program-marketing", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/mental-health-rehab-marketing", priority: 0.9, changefreq: "monthly" },
  { path: "/provider-guides/rehab-near-me-ranking-strategy", priority: 0.9, changefreq: "monthly" },

  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms-of-service", priority: 0.3, changefreq: "yearly" },
  { path: "/editorial-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/medical-disclaimer", priority: 0.3, changefreq: "yearly" },
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
  "holistic-rehab-near-me",
  "christian-rehab-near-me",
  "long-term-rehab-near-me",
  "iop-near-me",
  "php-near-me",
  "couples-rehab-near-me",
  "executive-rehab-near-me",
  "rehab-near-me",
  "mat-clinic-near-me",
  "affordable-rehab-near-me",
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

// Expanded treatment types (StateTreatmentExpandedPage routes)
const EXPANDED_TREATMENT_TYPES = [
  "luxury-rehab",
  "sober-living",
  "free-rehab",
  "faith-based-rehab",
  "fentanyl-rehab",
  "veterans-rehab",
  "womens-rehab",
  "mens-rehab",
  "holistic",
];

// County treatment types for Tier 2
const COUNTY_TREATMENT_TYPES = [
  "alcohol-rehab",
  "drug-rehab",
  "detox-centers",
  "inpatient-rehab",
  "outpatient-rehab",
  "dual-diagnosis-treatment",
];

const SUBSTANCE_SLUGS = [
  "cocaine-addiction-treatment", "opioid-addiction-treatment", "heroin-addiction-treatment",
  "meth-addiction-treatment", "prescription-drug-rehab", "benzodiazepine-addiction-treatment",
  "alcohol-addiction-treatment", "marijuana-addiction-treatment", "fentanyl-addiction-treatment",
  "xanax-addiction-treatment", "adderall-addiction-treatment", "kratom-addiction-treatment",
  "gabapentin-addiction-treatment", "tramadol-addiction-treatment",
];

const DEMOGRAPHIC_SLUGS = [
  "young-adult-rehab", "teen-rehab-programs", "senior-addiction-treatment",
  "lgbtq-rehab-programs", "pregnant-women-addiction-treatment", "first-responders-rehab",
  "healthcare-professionals-rehab", "executive-rehab-programs", "teachers-rehab-programs",
  "college-student-addiction-treatment",
];

const THERAPY_MODALITY_SLUGS = [
  "cbt-therapy-for-addiction", "emdr-therapy-for-addiction", "dbt-therapy-for-addiction",
  "motivational-interviewing-for-addiction", "art-music-therapy-for-addiction",
  "adventure-therapy-for-addiction", "aftercare-and-relapse-prevention",
  "what-to-pack-for-rehab", "questions-to-ask-rehab-center",
];

const CO_OCCURRING_SLUGS = [
  "anxiety-and-addiction-treatment", "depression-and-addiction-treatment",
  "ptsd-and-addiction-treatment", "bipolar-and-addiction-treatment",
  "adhd-and-addiction-treatment", "eating-disorders-and-addiction-treatment",
];

const DURATION_SETTING_SLUGS = [
  "30-day-rehab-programs", "60-day-rehab-programs", "90-day-rehab-programs",
  "long-term-rehab-programs", "beach-rehab-programs", "mountain-rehab-programs",
];

const PAYMENT_SLUGS = ["medicaid-rehab", "medicare-rehab"];

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

// City+Treatment combo pages - all 50 cities × 14 treatment types (generated dynamically)
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
  "inpatient-rehab-in", "outpatient-rehab-in", "dual-diagnosis-treatment-in",
  "luxury-rehab-in", "sober-living-in", "free-rehab-in",
  "faith-based-rehab-in", "fentanyl-rehab-in", "veterans-rehab-in",
  "womens-rehab-in", "mens-rehab-in"
];

// Insurance + State cross pages
const INSURANCE_SLUGS = [
  "aetna-rehab", "bcbs-treatment", "cigna-rehab",
  "united-healthcare-rehab", "humana-rehab", "kaiser-rehab",
  "medicare-rehab", "medicaid-rehab", "anthem-rehab",
  "tricare-rehab", "molina-rehab", "magellan-rehab",
  "wellcare-rehab", "ambetter-rehab", "oscar-rehab", "highmark-rehab"
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

// County-level SEO pages — maps stateSlug → array of county slugs
const STATE_COUNTIES: Record<string, string[]> = {
  "alabama": ["jefferson","mobile","madison","montgomery","shelby","tuscaloosa","baldwin","lee","morgan","calhoun"],
  "alaska": ["anchorage","fairbanks-north-star","matanuska-susitna","kenai-peninsula","juneau"],
  "arizona": ["maricopa","pima","pinal","yavapai","mohave","yuma","coconino","cochise"],
  "arkansas": ["pulaski","benton","washington","faulkner","sebastian","saline","craighead","garland"],
  "california": ["los-angeles","san-diego","orange","riverside","san-bernardino","santa-clara","alameda","sacramento","san-francisco","contra-costa","fresno","kern","san-joaquin","ventura","san-mateo"],
  "colorado": ["denver","el-paso","arapahoe","jefferson","adams","douglas","larimer","weld","boulder"],
  "connecticut": ["fairfield","hartford","new-haven","new-london","litchfield","middlesex"],
  "delaware": ["new-castle","kent","sussex"],
  "florida": ["miami-dade","broward","palm-beach","hillsborough","orange","duval","pinellas","lee","polk","brevard","volusia","seminole"],
  "georgia": ["fulton","gwinnett","cobb","dekalb","chatham","richmond","muscogee","bibb","clarke","cherokee"],
  "hawaii": ["honolulu","hawaii","maui","kauai"],
  "idaho": ["ada","canyon","kootenai","bonneville","twin-falls","bannock"],
  "illinois": ["cook","dupage","lake","will","kane","mchenry","winnebago","madison","st-clair","sangamon","peoria","champaign"],
  "indiana": ["marion","lake","allen","hamilton","st-joseph","elkhart","tippecanoe","vanderburgh","monroe","hendricks"],
  "iowa": ["polk","linn","scott","johnson","black-hawk","woodbury","dubuque","pottawattamie"],
  "kansas": ["johnson","sedgwick","shawnee","wyandotte","douglas","leavenworth","riley"],
  "kentucky": ["jefferson","fayette","kenton","boone","warren","hardin","daviess","madison","campbell","bullitt"],
  "louisiana": ["east-baton-rouge","jefferson","orleans","caddo","calcasieu","ouachita","lafayette","st-tammany","rapides","bossier"],
  "maine": ["cumberland","york","penobscot","kennebec","androscoggin"],
  "maryland": ["montgomery","prince-georges","baltimore-county","anne-arundel","howard","harford","frederick","baltimore-city"],
  "massachusetts": ["middlesex","worcester","suffolk","essex","norfolk","bristol","hampden","plymouth"],
  "michigan": ["wayne","oakland","macomb","kent","genesee","washtenaw","ingham","kalamazoo","ottawa","saginaw"],
  "minnesota": ["hennepin","ramsey","dakota","anoka","washington","scott","olmsted","st-louis"],
  "mississippi": ["hinds","harrison","desoto","rankin","jackson","lee","forrest","lauderdale","madison"],
  "missouri": ["st-louis-county","jackson","st-charles","st-louis-city","greene","clay","boone","jefferson","cass","cape-girardeau"],
  "montana": ["yellowstone","missoula","gallatin","flathead","cascade","lewis-and-clark"],
  "nebraska": ["douglas","lancaster","sarpy","hall","buffalo","scotts-bluff"],
  "nevada": ["clark","washoe","carson-city","elko","douglas","lyon"],
  "new-hampshire": ["hillsborough","rockingham","merrimack","strafford","grafton"],
  "new-jersey": ["bergen","middlesex","essex","hudson","monmouth","ocean","union","passaic","camden","morris","burlington"],
  "new-mexico": ["bernalillo","dona-ana","santa-fe","sandoval","san-juan","lea","valencia"],
  "new-york": ["kings","queens","new-york-county","suffolk","nassau","bronx","westchester","erie","monroe","onondaga","albany","richmond"],
  "north-carolina": ["mecklenburg","wake","guilford","forsyth","cumberland","durham","buncombe","new-hanover","gaston","cabarrus"],
  "north-dakota": ["cass","burleigh","grand-forks","ward","williams","stark"],
  "ohio": ["franklin","cuyahoga","hamilton","summit","montgomery","lucas","stark","butler","lorain","mahoning"],
  "oklahoma": ["oklahoma","tulsa","cleveland","comanche","canadian","rogers","payne"],
  "oregon": ["multnomah","washington","clackamas","lane","marion","jackson","deschutes","linn"],
  "pennsylvania": ["philadelphia","allegheny","montgomery","bucks","delaware","lancaster","chester","berks","lehigh","luzerne","york","erie"],
  "rhode-island": ["providence","kent","washington","newport","bristol"],
  "south-carolina": ["greenville","richland","charleston","horry","spartanburg","lexington","york","beaufort","anderson"],
  "south-dakota": ["minnehaha","pennington","lincoln","brown","brookings","codington"],
  "tennessee": ["shelby","davidson","knox","hamilton","rutherford","williamson","sumner","montgomery","blount","sullivan"],
  "texas": ["harris","dallas","tarrant","bexar","travis","collin","denton","hidalgo","el-paso","fort-bend","williamson","montgomery","nueces","lubbock","webb"],
  "utah": ["salt-lake","utah","davis","weber","washington","cache","iron"],
  "vermont": ["chittenden","rutland","washington","windham","windsor","bennington"],
  "virginia": ["fairfax","prince-william","loudoun","chesterfield","henrico","virginia-beach-city","norfolk-city","richmond-city","chesapeake-city","arlington"],
  "washington": ["king","pierce","snohomish","spokane","clark","thurston","kitsap","yakima","whatcom","benton"],
  "west-virginia": ["kanawha","berkeley","cabell","monongalia","wood","raleigh","putnam"],
  "wisconsin": ["milwaukee","dane","waukesha","brown","racine","outagamie","winnebago","kenosha","marathon","rock"],
  "wyoming": ["laramie","natrona","campbell","sweetwater","fremont","albany","sheridan"],
};

function generateCountyRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const [stateSlug, counties] of Object.entries(STATE_COUNTIES)) {
    for (const countySlug of counties) {
      // Base county page
      routes.push({
        path: `/rehab-centers/${stateSlug}/county/${countySlug}`,
        priority: 0.75,
        changefreq: "weekly"
      });
      // County + Treatment combo pages (Tier 2)
      for (const treatmentSlug of COUNTY_TREATMENT_TYPES) {
        routes.push({
          path: `/rehab-centers/${stateSlug}/county/${countySlug}/${treatmentSlug}`,
          priority: 0.7,
          changefreq: "weekly"
        });
      }
    }
  }
  return routes;
}

function generateExpandedTreatmentStateRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const type of EXPANDED_TREATMENT_TYPES) {
    // National hub page
    routes.push({
      path: `/treatment-types/${type === "holistic" ? "holistic-therapy" : type}`,
      priority: 0.80,
      changefreq: "weekly"
    });
    for (const state of US_STATES) {
      // State-level page
      routes.push({
        path: `/treatment-types/${type}/${state}`,
        priority: 0.75,
        changefreq: "weekly"
      });
    }
  }
  return routes;
}

function generateExpandedTreatmentCityRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  const cityTypes = EXPANDED_TREATMENT_TYPES.filter(t => t !== "holistic");
  for (const type of cityTypes) {
    for (const city of MAJOR_CITIES) {
      routes.push({
        path: `/treatment-types/${type}/${city.state}/${city.city}`,
        priority: 0.65,
        changefreq: "weekly"
      });
    }
  }
  return routes;
}

function generateSubstanceStateRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const sub of SUBSTANCE_SLUGS) {
    for (const state of US_STATES) {
      routes.push({ path: `/${sub}/${state}`, priority: 0.70, changefreq: "weekly" });
    }
  }
  return routes;
}

function generateDemographicStateRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const demo of DEMOGRAPHIC_SLUGS) {
    for (const state of US_STATES) {
      routes.push({ path: `/${demo}/${state}`, priority: 0.65, changefreq: "weekly" });
    }
  }
  return routes;
}

function generateTherapyModalityRoutes(): RouteEntry[] {
  return THERAPY_MODALITY_SLUGS.map(slug => ({
    path: `/${slug}`,
    priority: 0.75,
    changefreq: "monthly"
  }));
}

function generateStateArticleRoutes(): RouteEntry[] {
  const articleSlugs = [
    "how-to-find-best-rehab-centers-in",
    "cost-of-rehab-in",
    "best-cities-for-addiction-treatment-in",
  ];
  const routes: RouteEntry[] = [];
  for (const state of US_STATES) {
    for (const base of articleSlugs) {
      routes.push({
        path: `/rehab-centers/${state}/articles/${base}-${state}`,
        priority: 0.7,
        changefreq: "monthly",
      });
    }
  }
  return routes;
}

function generateCoOccurringRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const slug of CO_OCCURRING_SLUGS) {
    routes.push({ path: `/${slug}`, priority: 0.75, changefreq: "monthly" });
    for (const state of US_STATES) {
      routes.push({ path: `/${slug}/${state}`, priority: 0.65, changefreq: "weekly" });
    }
  }
  return routes;
}

function generateDurationSettingRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const slug of DURATION_SETTING_SLUGS) {
    routes.push({ path: `/${slug}`, priority: 0.75, changefreq: "monthly" });
    for (const state of US_STATES) {
      routes.push({ path: `/${slug}/${state}`, priority: 0.65, changefreq: "weekly" });
    }
  }
  return routes;
}

function generatePaymentStateRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const slug of PAYMENT_SLUGS) {
    for (const state of US_STATES) {
      routes.push({ path: `/${slug}/${state}`, priority: 0.70, changefreq: "weekly" });
    }
  }
  return routes;
}

// Provider city conversion pages
const PROVIDER_CITIES = [
  "los-angeles-california","new-york-city-new-york","chicago-illinois","houston-texas","phoenix-arizona",
  "philadelphia-pennsylvania","san-antonio-texas","san-diego-california","dallas-texas","austin-texas",
  "jacksonville-florida","fort-worth-texas","columbus-ohio","charlotte-north-carolina","san-francisco-california",
  "indianapolis-indiana","seattle-washington","denver-colorado","boston-massachusetts","nashville-tennessee",
  "detroit-michigan","portland-oregon","las-vegas-nevada","miami-florida","atlanta-georgia",
  "tampa-florida","orlando-florida","minneapolis-minnesota","sacramento-california","salt-lake-city-utah",
  "baltimore-maryland","st-louis-missouri","pittsburgh-pennsylvania","cleveland-ohio","cincinnati-ohio",
  "kansas-city-missouri","raleigh-north-carolina","new-orleans-louisiana","milwaukee-wisconsin","tucson-arizona",
  "scottsdale-arizona","honolulu-hawaii","boise-idaho","richmond-virginia","memphis-tennessee",
  "louisville-kentucky","oklahoma-city-oklahoma","albuquerque-new-mexico","omaha-nebraska","malibu-california",
];
const PROVIDER_STATE_TREATMENT_COMBOS: {state:string,treatments:string[]}[] = [
  {state:"california",treatments:["detox","residential","iop","luxury","sober-living"]},
  {state:"florida",treatments:["detox","residential","iop","luxury","sober-living"]},
  {state:"texas",treatments:["detox","residential","iop","mat","dual-diagnosis"]},
  {state:"new-york",treatments:["detox","residential","iop","php","dual-diagnosis"]},
  {state:"pennsylvania",treatments:["detox","residential","iop","mat","dual-diagnosis"]},
  {state:"ohio",treatments:["detox","residential","mat","iop","dual-diagnosis"]},
  {state:"illinois",treatments:["detox","residential","iop","php","mat"]},
  {state:"georgia",treatments:["detox","residential","iop","sober-living","dual-diagnosis"]},
];
const PROVIDER_STATE_INSURANCE_COMBOS: {state:string,insurers:string[]}[] = [
  {state:"california",insurers:["medicaid","blue-cross","aetna"]},
  {state:"florida",insurers:["medicaid","blue-cross","united-healthcare"]},
  {state:"texas",insurers:["medicaid","blue-cross","cigna"]},
  {state:"new-york",insurers:["medicaid","blue-cross","aetna"]},
];
function generateProviderConversionRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const cs of PROVIDER_CITIES) { routes.push({ path: `/get-more-patients-in-${cs}`, priority: 0.70, changefreq: "monthly" }); }
  for (const c of PROVIDER_STATE_TREATMENT_COMBOS) { for (const t of c.treatments) { routes.push({ path: `/rehab-marketing/${c.state}/${t}`, priority: 0.70, changefreq: "monthly" }); } }
  for (const c of PROVIDER_STATE_INSURANCE_COMBOS) { for (const i of c.insurers) { routes.push({ path: `/rehab-marketing/${c.state}/insurance/${i}`, priority: 0.70, changefreq: "monthly" }); } }
  return routes;
}


const NEAR_ME_PREFIXES = [
  "drug-rehab-near-me", "alcohol-rehab-near-me", "detox-near-me",
  "dual-diagnosis-near-me", "inpatient-rehab-near-me", "outpatient-near-me",
  "free-rehab-near-me", "luxury-rehab-near-me", "womens-rehab-near-me",
  "mens-rehab-near-me", "fentanyl-rehab-near-me", "sober-living-near-me",
  "teen-rehab-near-me", "veterans-rehab-near-me", "medicaid-rehab-near-me",
  "court-ordered-rehab-near-me", "suboxone-clinic-near-me", "methadone-clinic-near-me",
  "outpatient-rehab-near-me", "dual-diagnosis-rehab-near-me", "faith-based-rehab-near-me",
  "holistic-rehab-near-me", "christian-rehab-near-me", "long-term-rehab-near-me",
  "iop-near-me", "php-near-me", "couples-rehab-near-me", "executive-rehab-near-me",
  "rehab-near-me", "mat-clinic-near-me", "affordable-rehab-near-me",
];

function generateStateNearMeRoutes(): RouteEntry[] {
  const routes: RouteEntry[] = [];
  for (const prefix of NEAR_ME_PREFIXES) {
    routes.push({ path: `/${prefix}`, priority: 0.8, changefreq: "weekly" });
    for (const state of US_STATES) {
      routes.push({ path: `/${prefix}/${state}`, priority: 0.75, changefreq: "weekly" });
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
  const safePriority = typeof priority === "number" && !isNaN(priority) ? priority : 0.5;
  let entry = `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq || "weekly"}</changefreq>
    <priority>${safePriority.toFixed(2)}</priority>`;

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
    ...generateCountyRoutes(),
    ...generateStateNearMeRoutes(),
    ...generateTreatmentGeoRoutes(),
    ...generateCityTreatmentComboRoutes(),
    ...generateStateArticleRoutes(),
    ...generateExpandedTreatmentStateRoutes(),
    ...generateExpandedTreatmentCityRoutes(),
    ...generateSubstanceStateRoutes(),
    ...generateDemographicStateRoutes(),
    ...generateTherapyModalityRoutes(),
    ...generateCoOccurringRoutes(),
    ...generateDurationSettingRoutes(),
    ...generatePaymentStateRoutes(),
    ...generateProviderConversionRoutes(),
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
