import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Version tracking for deployment verification - update on each deployment
const VERSION = "v2.4.0";
const DEPLOYED_AT = new Date().toISOString();

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BASE_URL = "https://rehablookup.com";

// US States for generating state pages
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

// Major cities for location pages
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

// Route registry for static pages
interface RouteEntry {
  path: string;
  priority: number;
  changefreq: string;
}

const STATIC_ROUTES: RouteEntry[] = [
  // ==================== CORE PAGES ====================
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
  
  // ==================== TREATMENT TYPE PAGES ====================
  { path: "/treatment-types/drug-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/alcohol-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/opioid-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/mental-health-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/dual-diagnosis-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/detox-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/outpatient-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/inpatient-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/residential-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/intensive-outpatient", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/partial-hospitalization", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/sober-living", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/medication-assisted-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/holistic-treatment", priority: 0.8, changefreq: "weekly" },
  { path: "/treatment-types/faith-based-treatment", priority: 0.8, changefreq: "weekly" },
  { path: "/treatment-types/luxury-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/treatment-types/executive-rehab", priority: 0.75, changefreq: "weekly" },
  
  // ==================== NEAR-ME PAGES (HIGH-VALUE SEO) ====================
  { path: "/drug-rehab-near-me", priority: 0.95, changefreq: "daily" },
  { path: "/alcohol-rehab-near-me", priority: 0.95, changefreq: "daily" },
  { path: "/detox-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/inpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/outpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/outpatient-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/dual-diagnosis-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/dual-diagnosis-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/luxury-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/free-rehab-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/faith-based-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/holistic-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/womens-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/mens-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/teen-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/veterans-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/lgbtq-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/executive-rehab-near-me", priority: 0.75, changefreq: "weekly" },
  { path: "/couples-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/sober-living-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/fentanyl-rehab-near-me", priority: 0.9, changefreq: "weekly" },
  { path: "/medicaid-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/court-ordered-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/suboxone-clinic-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/methadone-clinic-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/cocaine-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/heroin-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/meth-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/prescription-drug-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/mental-health-treatment-near-me", priority: 0.85, changefreq: "weekly" },
  
  // ==================== INSURANCE PAGES ====================
  { path: "/insurance/aetna-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/bcbs-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/cigna-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/united-healthcare-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/humana-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/kaiser-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/medicare-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/medicaid-rehab", priority: 0.85, changefreq: "weekly" },
  { path: "/insurance/tricare-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/anthem-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/ambetter-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/molina-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/blue-cross-rehab", priority: 0.8, changefreq: "weekly" },
  
  // ==================== INTERNATIONAL SEO PAGES ====================
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
  
  // ==================== RESOURCE ARTICLES ====================
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
  
  // ==================== PROVIDER GUIDES & RESOURCES ====================
  { path: "/providers/resources", priority: 0.8, changefreq: "weekly" },
  { path: "/provider-guides/get-more-rehab-patients", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-admissions-growth", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-marketing-strategies", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/addiction-treatment-lead-generation", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/increase-rehab-admissions", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/rehab-center-marketing-ideas", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/treatment-center-patient-acquisition", priority: 0.8, changefreq: "monthly" },
  { path: "/provider-guides/behavioral-health-lead-generation", priority: 0.8, changefreq: "monthly" },

  // ==================== LEGAL PAGES ====================
  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms-of-service", priority: 0.3, changefreq: "yearly" },
];

// Generate state pages dynamically
function generateStateRoutes(): RouteEntry[] {
  return US_STATES.map(state => ({
    path: `/rehab-centers/${state}`,
    priority: 0.85,
    changefreq: "weekly"
  }));
}

// Generate city pages dynamically
function generateCityRoutes(): RouteEntry[] {
  return MAJOR_CITIES.map(({ city, state }) => ({
    path: `/rehab-centers/${state}/${city}`,
    priority: 0.8,
    changefreq: "weekly"
  }));
}

// Generate state-specific near-me pages
function generateStateNearMeRoutes(): RouteEntry[] {
  const nearMeTypes = [
    "drug-rehab-near-me",
    "alcohol-rehab-near-me",
    "detox-near-me",
  ];
  
  const routes: RouteEntry[] = [];
  
  // Only generate for top states to avoid sitemap bloat
  const topStates = ["california", "florida", "texas", "new-york", "arizona", "colorado", "ohio", "pennsylvania", "illinois", "georgia"];
  
  for (const state of topStates) {
    for (const type of nearMeTypes) {
      routes.push({
        path: `/${type}/${state}`,
        priority: 0.8,
        changefreq: "weekly"
      });
    }
  }
  
  return routes;
}

// Generate XML for a single URL entry with optional image
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

// Escape special XML characters
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Generate the main sitemap XML (static pages)
async function generateMainSitemap(supabase: ReturnType<typeof createClient>): Promise<string> {
  const today = new Date().toISOString().split("T")[0];
  
  // Fetch published articles from database for dynamic routes
  const { data: articles } = await supabase
    .from("blog_articles")
    .select("slug, updated_at")
    .eq("status", "published");
  
  const articleRoutes: RouteEntry[] = (articles || []).map(article => ({
    path: `/resources/${article.slug}`,
    priority: 0.8,
    changefreq: "monthly"
  }));
  
  const allRoutes = [
    ...STATIC_ROUTES, 
    ...generateStateRoutes(),
    ...generateCityRoutes(),
    ...generateStateNearMeRoutes(),
    ...articleRoutes
  ];
  
  // Sort by priority (highest first)
  allRoutes.sort((a, b) => b.priority - a.priority);
  
  const urlEntries = allRoutes
    .map(route => generateUrlEntry(route.path, route.priority, route.changefreq, today))
    .join("\n");

  console.log(`[Sitemap ${VERSION}] Generated main sitemap with ${allRoutes.length} URLs (including ${articleRoutes.length} articles)`);

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries}
</urlset>`;
}

// Generate the sitemap index XML
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

// Generate facilities sitemap from database
async function generateFacilitiesSitemap(): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Fetch all approved facilities with their slugs, logos, and updated_at
  const { data: facilities, error } = await supabase
    .from("facilities")
    .select("slug, updated_at, name, city, state, featured, logo_url, gallery_urls")
    .eq("status", "approved")
    .not("slug", "is", null)
    .order("featured", { ascending: false })
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(`[Sitemap ${VERSION}] Error fetching facilities:`, error);
    throw error;
  }

  const today = new Date().toISOString().split("T")[0];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

  // Add each facility to sitemap
  for (const facility of facilities || []) {
    if (!facility.slug) continue;
    
    const lastmod = facility.updated_at 
      ? new Date(facility.updated_at).toISOString().split("T")[0]
      : today;
    
    // Featured facilities get higher priority
    const priority = facility.featured ? 0.9 : 0.75;
    
    // Collect images for this facility
    const images: { loc: string; title?: string }[] = [];
    
    if (facility.logo_url) {
      images.push({
        loc: facility.logo_url,
        title: `${facility.name} Logo`
      });
    }
    
    // Add first 3 gallery images
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

  console.log(`[Sitemap ${VERSION}] Generated facilities sitemap with ${facilities?.length || 0} URLs`);

  return sitemap;
}

Deno.serve(async (req) => {
  // Log version on every request for deployment verification
  console.log(`[Sitemap ${VERSION}] Request received - deployed: ${DEPLOYED_AT}`);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "facilities";

    console.log(`[Sitemap ${VERSION}] Request for type: ${type}, URL: ${req.url}`);

    // Initialize Supabase client for database queries
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

    // Add XML comment with version for verification
    xmlContent = xmlContent.replace(
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<?xml version="1.0" encoding="UTF-8"?>\n<!-- Generated by RehabLookup Sitemap ${VERSION} on ${new Date().toISOString()} -->`
    );

    return new Response(xmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=7200", // 1hr browser, 2hr CDN
        "X-Sitemap-Version": VERSION, // Custom header for version verification
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
