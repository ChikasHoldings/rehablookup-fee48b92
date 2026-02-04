import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Badge dimensions
const SIZES = {
  small: { width: 120, height: 40, fontSize: 10, iconSize: 14 },
  medium: { width: 180, height: 60, fontSize: 12, iconSize: 18 },
  large: { width: 240, height: 80, fontSize: 14, iconSize: 24 },
};

// Badge colors
const STYLES = {
  light: { bg: "#ffffff", text: "#1a1a1a", accent: "#0d9488", border: "#e5e7eb" },
  dark: { bg: "#1a1a1a", text: "#ffffff", accent: "#14b8a6", border: "#374151" },
  transparent: { bg: "transparent", text: "#1a1a1a", accent: "#0d9488", border: "#d1d5db" },
};

function generateVerifiedBadgeSVG(
  facilityName: string,
  size: keyof typeof SIZES,
  style: keyof typeof STYLES
): string {
  const dim = SIZES[size];
  const colors = STYLES[style];
  const bgOpacity = style === "transparent" ? "0" : "1";
  
  // Truncate facility name if too long
  const maxChars = size === "small" ? 12 : size === "medium" ? 20 : 28;
  const displayName = facilityName.length > maxChars 
    ? facilityName.substring(0, maxChars - 2) + "…" 
    : facilityName;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="badgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:0.1"/>
      <stop offset="100%" style="stop-color:${colors.accent};stop-opacity:0.05"/>
    </linearGradient>
  </defs>
  <rect width="${dim.width}" height="${dim.height}" rx="8" fill="${colors.bg}" fill-opacity="${bgOpacity}" stroke="${colors.border}" stroke-width="1"/>
  <rect x="1" y="1" width="${dim.width - 2}" height="${dim.height - 2}" rx="7" fill="url(#badgeGradient)"/>
  
  <!-- Shield/Check Icon -->
  <g transform="translate(${dim.width * 0.08}, ${(dim.height - dim.iconSize) / 2})">
    <path d="M${dim.iconSize / 2} 0 L${dim.iconSize} ${dim.iconSize * 0.25} L${dim.iconSize} ${dim.iconSize * 0.6} C${dim.iconSize} ${dim.iconSize * 0.85} ${dim.iconSize / 2} ${dim.iconSize} ${dim.iconSize / 2} ${dim.iconSize} C${dim.iconSize / 2} ${dim.iconSize} 0 ${dim.iconSize * 0.85} 0 ${dim.iconSize * 0.6} L0 ${dim.iconSize * 0.25} Z" fill="${colors.accent}"/>
    <path d="M${dim.iconSize * 0.3} ${dim.iconSize * 0.5} L${dim.iconSize * 0.45} ${dim.iconSize * 0.65} L${dim.iconSize * 0.7} ${dim.iconSize * 0.35}" stroke="white" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  
  <!-- Text -->
  <text x="${dim.width * 0.25}" y="${dim.height * 0.42}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize}" font-weight="600" fill="${colors.text}">Verified on RehabLookup</text>
  <text x="${dim.width * 0.25}" y="${dim.height * 0.68}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize * 0.85}" fill="${colors.accent}">rehablookup.com</text>
</svg>`;
}

function generateFeaturedBadgeSVG(
  facilityName: string,
  size: keyof typeof SIZES,
  style: keyof typeof STYLES
): string {
  const dim = SIZES[size];
  const colors = STYLES[style];
  const bgOpacity = style === "transparent" ? "0" : "1";
  
  // Star gradient for featured badge
  const starColor = "#f59e0b";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="featuredGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${starColor};stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:${starColor};stop-opacity:0.05"/>
    </linearGradient>
  </defs>
  <rect width="${dim.width}" height="${dim.height}" rx="8" fill="${colors.bg}" fill-opacity="${bgOpacity}" stroke="${starColor}" stroke-width="1.5"/>
  <rect x="1" y="1" width="${dim.width - 2}" height="${dim.height - 2}" rx="7" fill="url(#featuredGradient)"/>
  
  <!-- Star Icon -->
  <g transform="translate(${dim.width * 0.08}, ${(dim.height - dim.iconSize) / 2})">
    <polygon points="${dim.iconSize / 2},0 ${dim.iconSize * 0.62},${dim.iconSize * 0.38} ${dim.iconSize},${dim.iconSize * 0.38} ${dim.iconSize * 0.69},${dim.iconSize * 0.62} ${dim.iconSize * 0.81},${dim.iconSize} ${dim.iconSize / 2},${dim.iconSize * 0.77} ${dim.iconSize * 0.19},${dim.iconSize} ${dim.iconSize * 0.31},${dim.iconSize * 0.62} 0,${dim.iconSize * 0.38} ${dim.iconSize * 0.38},${dim.iconSize * 0.38}" fill="${starColor}"/>
  </g>
  
  <!-- Text -->
  <text x="${dim.width * 0.25}" y="${dim.height * 0.42}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize}" font-weight="600" fill="${colors.text}">Featured Treatment Center</text>
  <text x="${dim.width * 0.25}" y="${dim.height * 0.68}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize * 0.85}" fill="${starColor}">rehablookup.com</text>
</svg>`;
}

function generateRatingBadgeSVG(
  rating: number,
  reviewCount: number,
  size: keyof typeof SIZES,
  style: keyof typeof STYLES
): string {
  const dim = SIZES[size];
  const colors = STYLES[style];
  const bgOpacity = style === "transparent" ? "0" : "1";
  const starColor = "#f59e0b";
  const displayRating = rating.toFixed(1);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <rect width="${dim.width}" height="${dim.height}" rx="8" fill="${colors.bg}" fill-opacity="${bgOpacity}" stroke="${colors.border}" stroke-width="1"/>
  
  <!-- Star Icon -->
  <g transform="translate(${dim.width * 0.06}, ${(dim.height - dim.iconSize * 0.8) / 2})">
    <polygon points="${dim.iconSize * 0.4},0 ${dim.iconSize * 0.5},${dim.iconSize * 0.3} ${dim.iconSize * 0.8},${dim.iconSize * 0.3} ${dim.iconSize * 0.55},${dim.iconSize * 0.5} ${dim.iconSize * 0.65},${dim.iconSize * 0.8} ${dim.iconSize * 0.4},${dim.iconSize * 0.62} ${dim.iconSize * 0.15},${dim.iconSize * 0.8} ${dim.iconSize * 0.25},${dim.iconSize * 0.5} 0,${dim.iconSize * 0.3} ${dim.iconSize * 0.3},${dim.iconSize * 0.3}" fill="${starColor}"/>
  </g>
  
  <!-- Rating Text -->
  <text x="${dim.width * 0.22}" y="${dim.height * 0.55}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize * 1.4}" font-weight="700" fill="${colors.text}">${displayRating}</text>
  
  <!-- Review Count -->
  <text x="${dim.width * 0.42}" y="${dim.height * 0.45}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize * 0.8}" fill="${colors.text}">(${reviewCount} reviews)</text>
  <text x="${dim.width * 0.42}" y="${dim.height * 0.68}" font-family="system-ui, -apple-system, sans-serif" font-size="${dim.fontSize * 0.75}" fill="${colors.accent}">on RehabLookup</text>
</svg>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const facilityId = url.pathname.split("/").pop();
    
    // Parse query params
    const style = (url.searchParams.get("style") || "light") as keyof typeof STYLES;
    const size = (url.searchParams.get("size") || "medium") as keyof typeof SIZES;
    const type = url.searchParams.get("type") || "verified";

    // Validate params
    if (!SIZES[size]) {
      return new Response("Invalid size", { status: 400, headers: corsHeaders });
    }
    if (!STYLES[style]) {
      return new Response("Invalid style", { status: 400, headers: corsHeaders });
    }
    if (!facilityId || facilityId === "serve-badge") {
      return new Response("Facility ID required", { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch facility data
    const { data: facility, error: facilityError } = await supabase
      .from("facilities")
      .select("id, name, slug, featured, verified, status")
      .eq("id", facilityId)
      .eq("status", "approved")
      .single();

    if (facilityError || !facility) {
      console.error("Facility not found:", facilityError);
      return new Response("Facility not found", { status: 404, headers: corsHeaders });
    }

    // Track impression (non-blocking)
    const referrer = req.headers.get("referer") || req.headers.get("origin");
    let referrerDomain = null;
    if (referrer) {
      try {
        referrerDomain = new URL(referrer).hostname;
      } catch {
        referrerDomain = referrer;
      }
    }

    // Fire and forget - don't await
    (async () => {
      try {
        await supabase
          .from("badge_impressions")
          .insert({
            facility_id: facility.id,
            referrer_domain: referrerDomain,
            badge_type: type,
            badge_size: size,
          });
        console.log("Impression tracked");
      } catch (err) {
        console.error("Failed to track impression:", err);
      }
    })();

    // Generate SVG based on type
    let svg: string;
    
    if (type === "featured" && facility.featured) {
      svg = generateFeaturedBadgeSVG(facility.name, size, style);
    } else if (type === "rating") {
      // Fetch rating data
      const { data: reviews } = await supabase
        .from("facility_reviews")
        .select("rating")
        .eq("facility_id", facilityId)
        .eq("status", "approved");
      
      const reviewCount = reviews?.length || 0;
      const avgRating = reviewCount > 0 
        ? reviews!.reduce((sum, r) => sum + r.rating, 0) / reviewCount 
        : 0;
      
      if (reviewCount > 0) {
        svg = generateRatingBadgeSVG(avgRating, reviewCount, size, style);
      } else {
        // Fallback to verified if no reviews
        svg = generateVerifiedBadgeSVG(facility.name, size, style);
      }
    } else {
      svg = generateVerifiedBadgeSVG(facility.name, size, style);
    }

    // Return SVG with proper headers for caching
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Badge-Version": "1.0.0",
      },
    });
  } catch (error) {
    console.error("Error serving badge:", error);
    return new Response("Internal server error", { 
      status: 500, 
      headers: corsHeaders 
    });
  }
});
