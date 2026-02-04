import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BASE_URL = "https://rehablookup.com";
const TODAY = new Date().toISOString().split("T")[0];

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

// Route registry for static pages
interface RouteEntry {
  path: string;
  priority: number;
  changefreq: string;
}

const STATIC_ROUTES: RouteEntry[] = [
  // Core pages
  { path: "/", priority: 1.0, changefreq: "daily" },
  { path: "/rehab-centers", priority: 0.95, changefreq: "daily" },
  { path: "/locations", priority: 0.9, changefreq: "weekly" },
  { path: "/treatment-types", priority: 0.9, changefreq: "weekly" },
  { path: "/insurance", priority: 0.85, changefreq: "weekly" },
  { path: "/resources", priority: 0.8, changefreq: "weekly" },
  { path: "/about", priority: 0.7, changefreq: "monthly" },
  { path: "/contact", priority: 0.7, changefreq: "monthly" },
  { path: "/how-it-works", priority: 0.75, changefreq: "monthly" },
  { path: "/for-providers", priority: 0.75, changefreq: "monthly" },
  { path: "/concierge", priority: 0.8, changefreq: "weekly" },
  { path: "/international", priority: 0.7, changefreq: "monthly" },
  { path: "/cost-estimator", priority: 0.75, changefreq: "monthly" },
  
  // Treatment type pages
  { path: "/treatment-types/drug-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/alcohol-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/opioid-addiction-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/mental-health-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/dual-diagnosis-treatment", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/detox-programs", priority: 0.85, changefreq: "weekly" },
  { path: "/treatment-types/outpatient-programs", priority: 0.85, changefreq: "weekly" },
  
  // Near-me pages (high-value SEO pages)
  { path: "/near-me/drug-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/near-me/alcohol-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/near-me/detox-centers-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/near-me/inpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/near-me/outpatient-rehab-near-me", priority: 0.9, changefreq: "daily" },
  { path: "/near-me/mental-health-treatment-near-me", priority: 0.85, changefreq: "daily" },
  { path: "/near-me/dual-diagnosis-treatment-near-me", priority: 0.85, changefreq: "daily" },
  { path: "/near-me/luxury-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/free-rehab-near-me", priority: 0.85, changefreq: "weekly" },
  { path: "/near-me/faith-based-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/holistic-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/womens-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/mens-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/teen-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/veterans-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/lgbtq-rehab-near-me", priority: 0.8, changefreq: "weekly" },
  { path: "/near-me/executive-rehab-near-me", priority: 0.75, changefreq: "weekly" },
  { path: "/near-me/couples-rehab-near-me", priority: 0.75, changefreq: "weekly" },
  
  // Insurance pages
  { path: "/insurance/aetna-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/bcbs-treatment", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/cigna-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/united-healthcare-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/humana-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/kaiser-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/medicare-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/medicaid-rehab", priority: 0.8, changefreq: "weekly" },
  { path: "/insurance/tricare-rehab", priority: 0.75, changefreq: "weekly" },
  { path: "/insurance/anthem-rehab", priority: 0.75, changefreq: "weekly" },
  
  // Legal pages
  { path: "/privacy-policy", priority: 0.3, changefreq: "yearly" },
  { path: "/terms-of-service", priority: 0.3, changefreq: "yearly" },
];

// Generate state pages dynamically
function generateStateRoutes(): RouteEntry[] {
  return US_STATES.map(state => ({
    path: `/rehab-centers/${state}`,
    priority: 0.8,
    changefreq: "weekly"
  }));
}

// Generate XML for a single URL entry
function generateUrlEntry(path: string, priority: number, changefreq: string, lastmod: string): string {
  return `  <url>
    <loc>${BASE_URL}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority.toFixed(1)}</priority>
  </url>`;
}

// Generate the main sitemap XML
function generateMainSitemap(): string {
  const allRoutes = [...STATIC_ROUTES, ...generateStateRoutes()];
  
  const urlEntries = allRoutes
    .map(route => generateUrlEntry(route.path, route.priority, route.changefreq, TODAY))
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>`;
}

// Generate the sitemap index XML
function generateSitemapIndex(): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap>
    <loc>${BASE_URL}/sitemap.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
  <sitemap>
    <loc>${BASE_URL}/sitemap-facilities.xml</loc>
    <lastmod>${TODAY}</lastmod>
  </sitemap>
</sitemapindex>`;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get("type") || "main";

    let xmlContent: string;

    switch (type) {
      case "index":
        xmlContent = generateSitemapIndex();
        console.log("Generated sitemap index with 2 child sitemaps");
        break;
      case "main":
      default:
        xmlContent = generateMainSitemap();
        const allRoutes = [...STATIC_ROUTES, ...generateStateRoutes()];
        console.log(`Generated main sitemap with ${allRoutes.length} URLs`);
        break;
    }

    return new Response(xmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<error>Failed to generate sitemap: ${errorMessage}</error>`,
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/xml; charset=utf-8" },
      }
    );
  }
});
