import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2?target=denonext";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

// Badge sizes for square badges
const SIZES = {
  small: { width: 160, height: 160, fontSize: 11, iconSize: 40 },
  medium: { width: 200, height: 200, fontSize: 14, iconSize: 50 },
  large: { width: 260, height: 260, fontSize: 18, iconSize: 65 },
};

// Tier colors for progressive unlocks
const TIER_COLORS = {
  locked: { primary: "#6b7280", secondary: "#9ca3af", glow: "#374151" },
  bronze: { primary: "#cd7f32", secondary: "#daa06d", glow: "#b87333" },
  silver: { primary: "#c0c0c0", secondary: "#e8e8e8", glow: "#a8a8a8" },
  gold: { primary: "#ffd700", secondary: "#ffec8b", glow: "#daa520" },
  platinum: { primary: "#e5e4e2", secondary: "#ffffff", glow: "#b8b8b8" },
};

// Badge type configurations
const BADGE_CONFIGS: Record<string, { title: string; subtitle: string }> = {
  "verified": { title: "VERIFIED", subtitle: "RehabLookup" },
  "highly-rated": { title: "HIGHLY RATED", subtitle: "Top Provider" },
  "top-reviewed": { title: "TOP REVIEWED", subtitle: "Community Choice" },
  "best-rehab-2026": { title: "BEST REHAB", subtitle: "2026" },
  "excellence-award": { title: "EXCELLENCE", subtitle: "Award" },
  "premium-partner": { title: "PRO MEMBER", subtitle: "Premium Partner" },
  "trusted-choice": { title: "TRUSTED", subtitle: "Choice" },
  "rising-star": { title: "RISING STAR", subtitle: "New Excellence" },
};

// ============================================
// CLASSIC SEAL STYLE
// ============================================
function generateSealBadge(
  title: string,
  subtitle: string,
  tier: string,
  size: keyof typeof SIZES
): string {
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.gold;
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const outerRadius = dim.width * 0.45;
  const innerRadius = dim.width * 0.35;
  const ribbonWidth = dim.width * 0.22;

  const sealPoints = generateSealEdge(cx, cy, outerRadius, innerRadius, 24);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="sealGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary}"/>
      <stop offset="50%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.glow}"/>
    </linearGradient>
    <linearGradient id="ribbonGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.glow}"/>
    </linearGradient>
    <filter id="sealShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="#000" flood-opacity="0.25"/>
    </filter>
    <filter id="innerGlow" x="-10%" y="-10%" width="120%" height="120%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Ribbons -->
  <path d="M${cx - ribbonWidth / 2} ${cy + innerRadius * 0.7} L${cx - ribbonWidth * 0.8} ${dim.height} L${cx - ribbonWidth * 0.3} ${dim.height - 15} L${cx} ${dim.height} L${cx + ribbonWidth * 0.3} ${dim.height - 15} L${cx + ribbonWidth * 0.8} ${dim.height} L${cx + ribbonWidth / 2} ${cy + innerRadius * 0.7} Z" fill="url(#ribbonGrad)" filter="url(#sealShadow)"/>
  
  <!-- Main Seal -->
  <polygon points="${sealPoints}" fill="url(#sealGrad)" filter="url(#sealShadow)"/>
  
  <!-- Inner Circle -->
  <circle cx="${cx}" cy="${cy}" r="${innerRadius * 0.85}" fill="none" stroke="${colors.secondary}" stroke-width="3" opacity="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${innerRadius * 0.75}" fill="${tier === 'platinum' ? '#1a1a2e' : '#1e293b'}"/>
  
  <!-- Star Icon -->
  <g transform="translate(${cx - dim.iconSize / 2}, ${cy - dim.iconSize * 0.7})" filter="url(#innerGlow)">
    ${generateStarPath(dim.iconSize, colors.primary)}
  </g>
  
  <!-- Text -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.15}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="700" fill="white" letter-spacing="0.5">${title}</text>
  <text x="${cx}" y="${cy + dim.iconSize * 0.15 + dim.fontSize * 1.3}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.75}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
</svg>`;
}

// ============================================
// METALLIC STYLE
// ============================================
function generateMetallicBadge(
  title: string,
  subtitle: string,
  tier: string,
  size: keyof typeof SIZES
): string {
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.gold;
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const radius = dim.width * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="metallicMain" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary};stop-opacity:1"/>
      <stop offset="25%" style="stop-color:${colors.primary};stop-opacity:1"/>
      <stop offset="50%" style="stop-color:${colors.secondary};stop-opacity:1"/>
      <stop offset="75%" style="stop-color:${colors.glow};stop-opacity:1"/>
      <stop offset="100%" style="stop-color:${colors.primary};stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="metallicShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.4"/>
      <stop offset="50%" style="stop-color:white;stop-opacity:0"/>
      <stop offset="100%" style="stop-color:white;stop-opacity:0.2"/>
    </linearGradient>
    <linearGradient id="innerRing" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.glow}"/>
      <stop offset="100%" style="stop-color:${colors.primary}"/>
    </linearGradient>
    <filter id="metallicShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${colors.glow}" flood-opacity="0.5"/>
    </filter>
  </defs>
  
  <!-- Outer Metallic Ring -->
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#metallicMain)" filter="url(#metallicShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#metallicShine)"/>
  
  <!-- Decorative Border -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.92}" fill="none" stroke="${colors.glow}" stroke-width="2" opacity="0.7"/>
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.88}" fill="none" stroke="${colors.primary}" stroke-width="1"/>
  
  <!-- Inner Circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.82}" fill="#0f172a"/>
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.78}" fill="none" stroke="url(#innerRing)" stroke-width="2"/>
  
  <!-- Award Icon -->
  <g transform="translate(${cx - dim.iconSize / 2}, ${cy - dim.iconSize * 0.8})">
    ${generateTrophyPath(dim.iconSize, colors.primary, colors.secondary)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.1}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="800" fill="white" letter-spacing="1">${title}</text>
  
  <!-- Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.1 + dim.fontSize * 1.4}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.8}" font-weight="600" fill="${colors.primary}">${subtitle}</text>
  
  <!-- Bottom Text -->
  <text x="${cx}" y="${cy + radius * 0.6}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.65}" font-weight="500" fill="${colors.secondary}">REHABLOOKUP.COM</text>
</svg>`;
}

// ============================================
// GRADIENT SHIELD STYLE
// ============================================
function generateGradientBadge(
  title: string,
  subtitle: string,
  tier: string,
  size: keyof typeof SIZES
): string {
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.gold;
  const cx = dim.width / 2;
  const shieldHeight = dim.height * 0.75;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary};stop-opacity:0.9"/>
      <stop offset="50%" style="stop-color:${colors.primary};stop-opacity:0.95"/>
      <stop offset="100%" style="stop-color:${colors.glow};stop-opacity:1"/>
    </linearGradient>
    <linearGradient id="glassOverlay" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.3"/>
      <stop offset="40%" style="stop-color:white;stop-opacity:0.05"/>
      <stop offset="100%" style="stop-color:white;stop-opacity:0"/>
    </linearGradient>
    <linearGradient id="innerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <filter id="shieldGlow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feFlood flood-color="${colors.primary}" flood-opacity="0.4"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Glow Effect -->
  <ellipse cx="${cx}" cy="${dim.height * 0.5}" rx="${dim.width * 0.35}" ry="${dim.height * 0.3}" fill="${colors.primary}" opacity="0.15" filter="blur(20px)"/>
  
  <!-- Shield Shape -->
  <path d="${generateShieldPath(cx, 15, dim.width * 0.85, shieldHeight)}" fill="url(#shieldGrad)" filter="url(#shieldGlow)"/>
  
  <!-- Glass Overlay -->
  <path d="${generateShieldPath(cx, 15, dim.width * 0.85, shieldHeight)}" fill="url(#glassOverlay)"/>
  
  <!-- Inner Shield -->
  <path d="${generateShieldPath(cx, 25, dim.width * 0.7, shieldHeight * 0.85)}" fill="url(#innerGrad)"/>
  
  <!-- Border Accent -->
  <path d="${generateShieldPath(cx, 25, dim.width * 0.7, shieldHeight * 0.85)}" fill="none" stroke="${colors.primary}" stroke-width="1.5" opacity="0.5"/>
  
  <!-- Icon -->
  <g transform="translate(${cx - dim.iconSize / 2}, ${dim.height * 0.15})">
    ${generateShieldIconPath(dim.iconSize, colors.primary)}
  </g>
  
  <!-- Text Content -->
  <text x="${cx}" y="${dim.height * 0.52}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="700" fill="white" letter-spacing="0.5">${title}</text>
  <text x="${cx}" y="${dim.height * 0.52 + dim.fontSize * 1.3}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.75}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
  
  <!-- Bottom Branding -->
  <text x="${cx}" y="${dim.height * 0.82}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.6}" font-weight="600" fill="${colors.primary}" letter-spacing="1">REHABLOOKUP</text>
</svg>`;
}

// ============================================
// FLAT MINIMALIST STYLE
// ============================================
function generateFlatBadge(
  title: string,
  subtitle: string,
  tier: string,
  size: keyof typeof SIZES
): string {
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier as keyof typeof TIER_COLORS] || TIER_COLORS.gold;
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const radius = dim.width * 0.42;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <filter id="flatShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.15"/>
    </filter>
  </defs>
  
  <!-- Background Circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${colors.primary}" filter="url(#flatShadow)"/>
  
  <!-- Inner Circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.85}" fill="#0f172a"/>
  
  <!-- Accent Ring -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.75}" fill="none" stroke="${colors.primary}" stroke-width="2" stroke-dasharray="4 2"/>
  
  <!-- Icon -->
  <g transform="translate(${cx - dim.iconSize * 0.4}, ${cy - dim.iconSize * 0.7})">
    ${generateCheckBadgePath(dim.iconSize * 0.8, colors.primary)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.15}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.9}" font-weight="700" fill="white">${title}</text>
  
  <!-- Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.15 + dim.fontSize * 1.2}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.65}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
  
  <!-- Bottom Label -->
  <text x="${cx}" y="${cy + radius * 0.55}" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.5}" font-weight="600" fill="${colors.primary}" letter-spacing="0.5">REHABLOOKUP.COM</text>
</svg>`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateSealEdge(cx: number, cy: number, outerR: number, innerR: number, points: number): string {
  const coords: string[] = [];
  for (let i = 0; i < points; i++) {
    const angle = (i * 2 * Math.PI) / points - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    coords.push(`${x},${y}`);
  }
  return coords.join(" ");
}

function generateShieldPath(cx: number, top: number, width: number, height: number): string {
  const left = cx - width / 2;
  const right = cx + width / 2;
  const bottom = top + height;
  const curveY = top + height * 0.6;
  
  return `M${left} ${top + 10} Q${left} ${top} ${left + 10} ${top} L${right - 10} ${top} Q${right} ${top} ${right} ${top + 10} L${right} ${curveY} Q${right} ${bottom - 30} ${cx} ${bottom} Q${left} ${bottom - 30} ${left} ${curveY} Z`;
}

function generateStarPath(size: number, color: string): string {
  const points = 5;
  const outerR = size / 2;
  const innerR = size / 4;
  const cx = size / 2;
  const cy = size / 2;
  
  let path = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    path += (i === 0 ? "M" : "L") + `${x},${y}`;
  }
  path += "Z";
  
  return `<path d="${path}" fill="${color}"/>`;
}

function generateTrophyPath(size: number, primary: string, secondary: string): string {
  const w = size;
  const h = size;
  
  return `
    <path d="M${w * 0.25} ${h * 0.1} L${w * 0.75} ${h * 0.1} L${w * 0.75} ${h * 0.25} Q${w * 0.9} ${h * 0.25} ${w * 0.9} ${h * 0.35} Q${w * 0.9} ${h * 0.45} ${w * 0.75} ${h * 0.45} L${w * 0.75} ${h * 0.5} Q${w * 0.7} ${h * 0.65} ${w * 0.55} ${h * 0.7} L${w * 0.55} ${h * 0.8} L${w * 0.7} ${h * 0.8} L${w * 0.7} ${h * 0.9} L${w * 0.3} ${h * 0.9} L${w * 0.3} ${h * 0.8} L${w * 0.45} ${h * 0.8} L${w * 0.45} ${h * 0.7} Q${w * 0.3} ${h * 0.65} ${w * 0.25} ${h * 0.5} L${w * 0.25} ${h * 0.45} Q${w * 0.1} ${h * 0.45} ${w * 0.1} ${h * 0.35} Q${w * 0.1} ${h * 0.25} ${w * 0.25} ${h * 0.25} Z" fill="${primary}"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.3}" rx="${w * 0.15}" ry="${h * 0.08}" fill="${secondary}" opacity="0.5"/>
  `;
}

function generateShieldIconPath(size: number, color: string): string {
  const w = size;
  const h = size;
  
  return `
    <path d="M${w * 0.5} ${h * 0.05} L${w * 0.9} ${h * 0.2} L${w * 0.9} ${h * 0.5} Q${w * 0.9} ${h * 0.8} ${w * 0.5} ${h * 0.95} Q${w * 0.1} ${h * 0.8} ${w * 0.1} ${h * 0.5} L${w * 0.1} ${h * 0.2} Z" fill="${color}"/>
    <path d="M${w * 0.3} ${h * 0.5} L${w * 0.45} ${h * 0.65} L${w * 0.7} ${h * 0.35}" stroke="white" stroke-width="${w * 0.08}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function generateCheckBadgePath(size: number, color: string): string {
  const w = size;
  const h = size;
  
  return `
    <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${w * 0.45}" fill="${color}"/>
    <path d="M${w * 0.28} ${h * 0.5} L${w * 0.42} ${h * 0.65} L${w * 0.72} ${h * 0.35}" stroke="white" stroke-width="${w * 0.1}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

// Main badge generator
function generateBadgeSVG(
  badgeType: string,
  style: string,
  tier: string,
  size: keyof typeof SIZES
): string {
  const config = BADGE_CONFIGS[badgeType] || BADGE_CONFIGS["verified"];
  
  switch (style) {
    case "seal":
      return generateSealBadge(config.title, config.subtitle, tier, size);
    case "metallic":
      return generateMetallicBadge(config.title, config.subtitle, tier, size);
    case "gradient":
      return generateGradientBadge(config.title, config.subtitle, tier, size);
    case "flat":
      return generateFlatBadge(config.title, config.subtitle, tier, size);
    default:
      return generateGradientBadge(config.title, config.subtitle, tier, size);
  }
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
    const style = url.searchParams.get("style") || "gradient";
    const size = (url.searchParams.get("size") || "medium") as keyof typeof SIZES;
    const type = url.searchParams.get("type") || "verified";
    const tier = url.searchParams.get("tier") || "gold";

    // Validate params
    if (!SIZES[size]) {
      return new Response("Invalid size", { status: 400, headers: corsHeaders });
    }
    if (!facilityId || facilityId === "serve-badge") {
      return new Response("Facility ID required", { status: 400, headers: corsHeaders });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch facility data to verify it exists and is approved
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
        console.log("Impression tracked for badge:", type, "tier:", tier);
      } catch (err) {
        console.error("Failed to track impression:", err);
      }
    })();

    // Generate SVG based on type, style, and tier
    const svg = generateBadgeSVG(type, style, tier, size);

    // Return SVG with proper headers for caching
    return new Response(svg, {
      headers: {
        ...corsHeaders,
        "Content-Type": "image/svg+xml",
        "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        "X-Badge-Version": "2.0.0",
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
