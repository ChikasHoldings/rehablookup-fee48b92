import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Badge dimensions - refined proportions
const SIZES = {
  small: { width: 140, height: 44, fontSize: 9, iconSize: 16, padding: 10 },
  medium: { width: 200, height: 56, fontSize: 11, iconSize: 20, padding: 14 },
  large: { width: 260, height: 72, fontSize: 13, iconSize: 26, padding: 18 },
};

// Badge colors - refined palette
const STYLES = {
  light: { 
    bg: "#ffffff", 
    text: "#0f172a", 
    textSecondary: "#64748b",
    accent: "#0d9488", 
    accentLight: "#14b8a6",
    border: "#e2e8f0",
    shadow: "rgba(15, 23, 42, 0.08)"
  },
  dark: { 
    bg: "#1e293b", 
    text: "#f8fafc", 
    textSecondary: "#94a3b8",
    accent: "#2dd4bf", 
    accentLight: "#5eead4",
    border: "#334155",
    shadow: "rgba(0, 0, 0, 0.3)"
  },
  transparent: { 
    bg: "transparent", 
    text: "#0f172a", 
    textSecondary: "#64748b",
    accent: "#0d9488", 
    accentLight: "#14b8a6",
    border: "#cbd5e1",
    shadow: "transparent"
  },
};

function generateVerifiedBadgeSVG(
  facilityName: string,
  size: keyof typeof SIZES,
  style: keyof typeof STYLES
): string {
  const dim = SIZES[size];
  const colors = STYLES[style];
  const bgOpacity = style === "transparent" ? "0" : "1";
  const iconX = dim.padding;
  const iconY = (dim.height - dim.iconSize) / 2;
  const textX = dim.padding + dim.iconSize + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="verifiedGradient${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accent};stop-opacity:0.08"/>
      <stop offset="100%" style="stop-color:${colors.accentLight};stop-opacity:0.02"/>
    </linearGradient>
    <linearGradient id="shieldGradient${size}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.accentLight}"/>
      <stop offset="100%" style="stop-color:${colors.accent}"/>
    </linearGradient>
    <filter id="shadow${size}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${colors.shadow}" flood-opacity="1"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${dim.width}" height="${dim.height}" rx="10" fill="${colors.bg}" fill-opacity="${bgOpacity}" filter="url(#shadow${size})"/>
  <rect x="0.5" y="0.5" width="${dim.width - 1}" height="${dim.height - 1}" rx="9.5" fill="url(#verifiedGradient${size})" stroke="${colors.border}" stroke-width="1"/>
  
  <!-- Shield Icon with Checkmark -->
  <g transform="translate(${iconX}, ${iconY})">
    <path d="M${dim.iconSize / 2} 1 L${dim.iconSize - 2} ${dim.iconSize * 0.28} L${dim.iconSize - 2} ${dim.iconSize * 0.58} C${dim.iconSize - 2} ${dim.iconSize * 0.82} ${dim.iconSize / 2} ${dim.iconSize - 1} ${dim.iconSize / 2} ${dim.iconSize - 1} C${dim.iconSize / 2} ${dim.iconSize - 1} 2 ${dim.iconSize * 0.82} 2 ${dim.iconSize * 0.58} L2 ${dim.iconSize * 0.28} Z" fill="url(#shieldGradient${size})"/>
    <path d="M${dim.iconSize * 0.32} ${dim.iconSize * 0.5} L${dim.iconSize * 0.45} ${dim.iconSize * 0.64} L${dim.iconSize * 0.68} ${dim.iconSize * 0.38}" stroke="white" stroke-width="${Math.max(1.5, dim.iconSize * 0.1)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
  
  <!-- Text Content -->
  <text x="${textX}" y="${dim.height * 0.44}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize}" font-weight="600" fill="${colors.text}" letter-spacing="-0.01em">Verified on RehabLookup</text>
  <text x="${textX}" y="${dim.height * 0.7}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize * 0.85}" font-weight="500" fill="${colors.accent}">rehablookup.com</text>
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
  const starColor = "#f59e0b";
  const starColorLight = "#fbbf24";
  const iconX = dim.padding;
  const iconY = (dim.height - dim.iconSize) / 2;
  const textX = dim.padding + dim.iconSize + 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="featuredBg${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${starColor};stop-opacity:0.1"/>
      <stop offset="100%" style="stop-color:${starColorLight};stop-opacity:0.03"/>
    </linearGradient>
    <linearGradient id="starGradient${size}" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${starColorLight}"/>
      <stop offset="100%" style="stop-color:${starColor}"/>
    </linearGradient>
    <filter id="featuredShadow${size}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${colors.shadow}" flood-opacity="1"/>
    </filter>
    <filter id="starGlow${size}" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="1" result="glow"/>
      <feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${dim.width}" height="${dim.height}" rx="10" fill="${colors.bg}" fill-opacity="${bgOpacity}" filter="url(#featuredShadow${size})"/>
  <rect x="0.5" y="0.5" width="${dim.width - 1}" height="${dim.height - 1}" rx="9.5" fill="url(#featuredBg${size})" stroke="${starColor}" stroke-width="1.5" stroke-opacity="0.5"/>
  
  <!-- Star Icon -->
  <g transform="translate(${iconX}, ${iconY})" filter="url(#starGlow${size})">
    <polygon points="${dim.iconSize / 2},1 ${dim.iconSize * 0.62},${dim.iconSize * 0.38} ${dim.iconSize - 1},${dim.iconSize * 0.38} ${dim.iconSize * 0.69},${dim.iconSize * 0.6} ${dim.iconSize * 0.8},${dim.iconSize - 1} ${dim.iconSize / 2},${dim.iconSize * 0.75} ${dim.iconSize * 0.2},${dim.iconSize - 1} ${dim.iconSize * 0.31},${dim.iconSize * 0.6} 1,${dim.iconSize * 0.38} ${dim.iconSize * 0.38},${dim.iconSize * 0.38}" fill="url(#starGradient${size})"/>
  </g>
  
  <!-- Text Content -->
  <text x="${textX}" y="${dim.height * 0.44}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize}" font-weight="600" fill="${colors.text}" letter-spacing="-0.01em">Featured Center</text>
  <text x="${textX}" y="${dim.height * 0.7}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize * 0.85}" font-weight="500" fill="${starColor}">rehablookup.com</text>
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
  const starSize = dim.iconSize * 0.7;
  const starX = dim.padding;
  const starY = (dim.height - starSize) / 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="ratingBg${size}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${starColor};stop-opacity:0.06"/>
      <stop offset="100%" style="stop-color:${starColor};stop-opacity:0.01"/>
    </linearGradient>
    <filter id="ratingShadow${size}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="${colors.shadow}" flood-opacity="1"/>
    </filter>
  </defs>
  
  <!-- Background -->
  <rect width="${dim.width}" height="${dim.height}" rx="10" fill="${colors.bg}" fill-opacity="${bgOpacity}" filter="url(#ratingShadow${size})"/>
  <rect x="0.5" y="0.5" width="${dim.width - 1}" height="${dim.height - 1}" rx="9.5" fill="url(#ratingBg${size})" stroke="${colors.border}" stroke-width="1"/>
  
  <!-- Star Icon -->
  <g transform="translate(${starX}, ${starY})">
    <polygon points="${starSize / 2},0 ${starSize * 0.62},${starSize * 0.38} ${starSize},${starSize * 0.38} ${starSize * 0.69},${starSize * 0.6} ${starSize * 0.8},${starSize} ${starSize / 2},${starSize * 0.75} ${starSize * 0.2},${starSize} ${starSize * 0.31},${starSize * 0.6} 0,${starSize * 0.38} ${starSize * 0.38},${starSize * 0.38}" fill="${starColor}"/>
  </g>
  
  <!-- Rating Number -->
  <text x="${starX + starSize + 6}" y="${dim.height * 0.58}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize * 1.5}" font-weight="700" fill="${colors.text}">${displayRating}</text>
  
  <!-- Review Info -->
  <text x="${starX + starSize + 6 + dim.fontSize * 2.2}" y="${dim.height * 0.45}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize * 0.8}" font-weight="500" fill="${colors.textSecondary}">(${reviewCount} reviews)</text>
  <text x="${starX + starSize + 6 + dim.fontSize * 2.2}" y="${dim.height * 0.7}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${dim.fontSize * 0.75}" font-weight="500" fill="${colors.accent}">on RehabLookup</text>
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
