// Premium Badge SVG Generators - Modern Professional Designs
import { BadgeTier, BadgeStyle, TIER_COLORS } from "./badgeTypes";

interface BadgeConfig {
  title: string;
  subtitle: string;
  tier: BadgeTier;
  style: BadgeStyle;
  size: "small" | "medium" | "large";
  year?: number;
}

const SIZES = {
  small: { width: 180, height: 180, fontSize: 12, iconSize: 36 },
  medium: { width: 220, height: 220, fontSize: 14, iconSize: 44 },
  large: { width: 280, height: 280, fontSize: 18, iconSize: 56 },
};

// ============================================
// CLASSIC SEAL STYLE - Elegant Award Seal
// ============================================
export function generateSealBadge(config: BadgeConfig): string {
  const { title, subtitle, tier, size } = config;
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier];
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const outerRadius = dim.width * 0.42;
  const innerRadius = dim.width * 0.32;

  // Generate seal scalloped edge
  const sealPoints = generateScallopedEdge(cx, cy, outerRadius, 16);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="sealOuter" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary}"/>
      <stop offset="35%" style="stop-color:${colors.primary}"/>
      <stop offset="65%" style="stop-color:${colors.glow}"/>
      <stop offset="100%" style="stop-color:${colors.primary}"/>
    </linearGradient>
    <linearGradient id="sealInner" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <linearGradient id="sealRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="50%" style="stop-color:${colors.glow}"/>
      <stop offset="100%" style="stop-color:${colors.secondary}"/>
    </linearGradient>
    <filter id="sealShadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="${colors.primary}" flood-opacity="0.35"/>
    </filter>
    <filter id="innerGlow">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  
  <!-- Ribbon Tails -->
  <path d="M${cx - 25} ${cy + innerRadius * 0.85} 
           Q${cx - 35} ${dim.height * 0.75} ${cx - 40} ${dim.height * 0.92}
           L${cx - 25} ${dim.height * 0.82}
           L${cx - 10} ${dim.height * 0.92}
           Q${cx - 15} ${dim.height * 0.75} ${cx - 10} ${cy + innerRadius * 0.85}" 
        fill="url(#sealRibbon)" opacity="0.9"/>
  <path d="M${cx + 10} ${cy + innerRadius * 0.85} 
           Q${cx + 15} ${dim.height * 0.75} ${cx + 10} ${dim.height * 0.92}
           L${cx + 25} ${dim.height * 0.82}
           L${cx + 40} ${dim.height * 0.92}
           Q${cx + 35} ${dim.height * 0.75} ${cx + 25} ${cy + innerRadius * 0.85}" 
        fill="url(#sealRibbon)" opacity="0.9"/>
  
  <!-- Main Seal Body -->
  <path d="${sealPoints}" fill="url(#sealOuter)" filter="url(#sealShadow)"/>
  
  <!-- Inner Ring -->
  <circle cx="${cx}" cy="${cy}" r="${innerRadius}" fill="url(#sealInner)" stroke="${colors.secondary}" stroke-width="2"/>
  <circle cx="${cx}" cy="${cy}" r="${innerRadius * 0.88}" fill="none" stroke="${colors.primary}" stroke-width="1" opacity="0.5"/>
  
  <!-- Award Star -->
  <g transform="translate(${cx}, ${cy - dim.iconSize * 0.35})" filter="url(#innerGlow)">
    ${generateAwardStar(dim.iconSize * 0.7, colors.primary, colors.glow)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.35}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="700" fill="white" letter-spacing="0.5">${title}</text>
  
  <!-- Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.35 + dim.fontSize * 1.3}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.7}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
</svg>`;
}

// ============================================
// METALLIC STYLE - Premium Embossed Metal
// ============================================
export function generateMetallicBadge(config: BadgeConfig): string {
  const { title, subtitle, tier, size, year } = config;
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier];
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const radius = dim.width * 0.4;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="metalBase" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary}"/>
      <stop offset="20%" style="stop-color:${colors.primary}"/>
      <stop offset="40%" style="stop-color:${colors.glow}"/>
      <stop offset="60%" style="stop-color:${colors.primary}"/>
      <stop offset="80%" style="stop-color:${colors.secondary}"/>
      <stop offset="100%" style="stop-color:${colors.glow}"/>
    </linearGradient>
    <linearGradient id="metalShine" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.5"/>
      <stop offset="30%" style="stop-color:white;stop-opacity:0.1"/>
      <stop offset="70%" style="stop-color:white;stop-opacity:0"/>
      <stop offset="100%" style="stop-color:white;stop-opacity:0.3"/>
    </linearGradient>
    <linearGradient id="metalInner" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1a1f2e"/>
      <stop offset="50%" style="stop-color:#0d1117"/>
      <stop offset="100%" style="stop-color:#1a1f2e"/>
    </linearGradient>
    <filter id="metalShadow" x="-25%" y="-25%" width="150%" height="150%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-color="${colors.glow}" flood-opacity="0.4"/>
    </filter>
    <filter id="emboss">
      <feBevel in="SourceGraphic"/>
    </filter>
  </defs>
  
  <!-- Outer Metallic Ring -->
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#metalBase)" filter="url(#metalShadow)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#metalShine)"/>
  
  <!-- Decorative Rings -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.9}" fill="none" stroke="${colors.glow}" stroke-width="1.5" opacity="0.6"/>
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.85}" fill="none" stroke="${colors.primary}" stroke-width="0.5" opacity="0.4"/>
  
  <!-- Inner Face -->
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.8}" fill="url(#metalInner)"/>
  <circle cx="${cx}" cy="${cy}" r="${radius * 0.75}" fill="none" stroke="${colors.primary}" stroke-width="1.5" opacity="0.3"/>
  
  <!-- Trophy Icon -->
  <g transform="translate(${cx - dim.iconSize * 0.4}, ${cy - dim.iconSize * 0.7})">
    ${generateTrophyIcon(dim.iconSize * 0.8, colors.primary, colors.glow)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.2}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="800" fill="white" letter-spacing="1">${title}</text>
  
  <!-- Year / Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.2 + dim.fontSize * 1.3}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.75}" font-weight="600" fill="${colors.primary}">${year || subtitle}</text>
</svg>`;
}

// ============================================
// GRADIENT STYLE - Modern Glass Shield
// ============================================
export function generateGradientBadge(config: BadgeConfig): string {
  const { title, subtitle, tier, size } = config;
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier];
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const shieldW = dim.width * 0.7;
  const shieldH = dim.height * 0.8;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.secondary};stop-opacity:0.95"/>
      <stop offset="50%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.glow}"/>
    </linearGradient>
    <linearGradient id="glassTop" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.35"/>
      <stop offset="50%" style="stop-color:white;stop-opacity:0.05"/>
      <stop offset="100%" style="stop-color:white;stop-opacity:0"/>
    </linearGradient>
    <linearGradient id="innerShield" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:#1e293b"/>
      <stop offset="100%" style="stop-color:#0f172a"/>
    </linearGradient>
    <filter id="shieldGlow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="12" result="blur"/>
      <feFlood flood-color="${colors.primary}" flood-opacity="0.4"/>
      <feComposite in2="blur" operator="in"/>
      <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <clipPath id="shieldClip">
      <path d="${generateModernShield(cx, 12, shieldW, shieldH)}"/>
    </clipPath>
  </defs>
  
  <!-- Ambient Glow -->
  <ellipse cx="${cx}" cy="${cy}" rx="${dim.width * 0.3}" ry="${dim.height * 0.25}" fill="${colors.primary}" opacity="0.15" filter="blur(25px)"/>
  
  <!-- Main Shield -->
  <path d="${generateModernShield(cx, 12, shieldW, shieldH)}" fill="url(#shieldGrad)" filter="url(#shieldGlow)"/>
  
  <!-- Glass Overlay -->
  <path d="${generateModernShield(cx, 12, shieldW, shieldH)}" fill="url(#glassTop)"/>
  
  <!-- Inner Shield -->
  <path d="${generateModernShield(cx, 24, shieldW * 0.85, shieldH * 0.88)}" fill="url(#innerShield)"/>
  <path d="${generateModernShield(cx, 24, shieldW * 0.85, shieldH * 0.88)}" fill="none" stroke="${colors.primary}" stroke-width="1" opacity="0.4"/>
  
  <!-- Check Shield Icon -->
  <g transform="translate(${cx - dim.iconSize * 0.4}, ${cy - dim.iconSize * 0.55})">
    ${generateShieldCheck(dim.iconSize * 0.8, colors.primary)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.35}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize}" font-weight="700" fill="white" letter-spacing="0.3">${title}</text>
  
  <!-- Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.35 + dim.fontSize * 1.25}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.7}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
</svg>`;
}

// ============================================
// FLAT STYLE - Clean Minimalist Badge
// ============================================
export function generateFlatBadge(config: BadgeConfig): string {
  const { title, subtitle, tier, size } = config;
  const dim = SIZES[size];
  const colors = TIER_COLORS[tier];
  const cx = dim.width / 2;
  const cy = dim.height / 2;
  const radius = dim.width * 0.38;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim.width}" height="${dim.height}" viewBox="0 0 ${dim.width} ${dim.height}">
  <defs>
    <linearGradient id="flatRing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${colors.primary}"/>
      <stop offset="100%" style="stop-color:${colors.glow}"/>
    </linearGradient>
    <filter id="flatShadow" x="-15%" y="-15%" width="130%" height="130%">
      <feDropShadow dx="0" dy="3" stdDeviation="4" flood-color="${colors.primary}" flood-opacity="0.25"/>
    </filter>
  </defs>
  
  <!-- Outer Ring -->
  <circle cx="${cx}" cy="${cy}" r="${radius + 8}" fill="url(#flatRing)" filter="url(#flatShadow)"/>
  
  <!-- Inner Circle -->
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#0f172a"/>
  
  <!-- Accent Ring -->
  <circle cx="${cx}" cy="${cy}" r="${radius - 6}" fill="none" stroke="${colors.primary}" stroke-width="1.5" stroke-dasharray="3 2" opacity="0.5"/>
  
  <!-- Verified Check Icon -->
  <g transform="translate(${cx - dim.iconSize * 0.35}, ${cy - dim.iconSize * 0.55})">
    ${generateVerifiedBadge(dim.iconSize * 0.7, colors.primary)}
  </g>
  
  <!-- Title -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.3}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.95}" font-weight="700" fill="white">${title}</text>
  
  <!-- Subtitle -->
  <text x="${cx}" y="${cy + dim.iconSize * 0.3 + dim.fontSize * 1.15}" text-anchor="middle" font-family="system-ui, -apple-system, 'Segoe UI', sans-serif" font-size="${dim.fontSize * 0.65}" font-weight="500" fill="${colors.secondary}">${subtitle}</text>
</svg>`;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateScallopedEdge(cx: number, cy: number, radius: number, scallops: number): string {
  let path = "";
  const angleStep = (2 * Math.PI) / scallops;
  const controlDist = radius * 0.15;
  
  for (let i = 0; i < scallops; i++) {
    const startAngle = i * angleStep - Math.PI / 2;
    const endAngle = (i + 1) * angleStep - Math.PI / 2;
    const midAngle = (startAngle + endAngle) / 2;
    
    const x1 = cx + radius * Math.cos(startAngle);
    const y1 = cy + radius * Math.sin(startAngle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);
    
    const cpX = cx + (radius + controlDist) * Math.cos(midAngle);
    const cpY = cy + (radius + controlDist) * Math.sin(midAngle);
    
    if (i === 0) {
      path += `M${x1},${y1}`;
    }
    path += ` Q${cpX},${cpY} ${x2},${y2}`;
  }
  path += " Z";
  return path;
}

function generateModernShield(cx: number, top: number, width: number, height: number): string {
  const left = cx - width / 2;
  const right = cx + width / 2;
  const bottom = top + height;
  const curveStart = top + height * 0.55;
  const cornerR = 12;
  
  return `M${left + cornerR} ${top} 
          L${right - cornerR} ${top} 
          Q${right} ${top} ${right} ${top + cornerR} 
          L${right} ${curveStart} 
          Q${right} ${bottom - height * 0.15} ${cx} ${bottom} 
          Q${left} ${bottom - height * 0.15} ${left} ${curveStart} 
          L${left} ${top + cornerR}
          Q${left} ${top} ${left + cornerR} ${top}
          Z`;
}

function generateAwardStar(size: number, primary: string, glow: string): string {
  const points = 5;
  const outerR = size / 2;
  const innerR = size / 4.5;
  
  let starPath = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const x = r * Math.cos(angle);
    const y = r * Math.sin(angle);
    starPath += (i === 0 ? "M" : "L") + `${x},${y}`;
  }
  starPath += "Z";
  
  return `
    <path d="${starPath}" fill="${primary}"/>
    <circle cx="0" cy="0" r="${size * 0.12}" fill="${glow}"/>
  `;
}

function generateTrophyIcon(size: number, primary: string, glow: string): string {
  const w = size;
  const h = size;
  
  return `
    <path d="M${w * 0.2} ${h * 0.15} 
             L${w * 0.8} ${h * 0.15} 
             L${w * 0.8} ${h * 0.3} 
             Q${w * 0.95} ${h * 0.3} ${w * 0.95} ${h * 0.4} 
             Q${w * 0.95} ${h * 0.5} ${w * 0.8} ${h * 0.5} 
             L${w * 0.8} ${h * 0.55}
             Q${w * 0.75} ${h * 0.7} ${w * 0.58} ${h * 0.72}
             L${w * 0.58} ${h * 0.78}
             L${w * 0.72} ${h * 0.78}
             L${w * 0.72} ${h * 0.88}
             L${w * 0.28} ${h * 0.88}
             L${w * 0.28} ${h * 0.78}
             L${w * 0.42} ${h * 0.78}
             L${w * 0.42} ${h * 0.72}
             Q${w * 0.25} ${h * 0.7} ${w * 0.2} ${h * 0.55}
             L${w * 0.2} ${h * 0.5}
             Q${w * 0.05} ${h * 0.5} ${w * 0.05} ${h * 0.4}
             Q${w * 0.05} ${h * 0.3} ${w * 0.2} ${h * 0.3}
             Z" fill="${primary}"/>
    <ellipse cx="${w * 0.5}" cy="${h * 0.32}" rx="${w * 0.18}" ry="${h * 0.07}" fill="${glow}" opacity="0.5"/>
  `;
}

function generateShieldCheck(size: number, color: string): string {
  const w = size;
  const h = size;
  
  return `
    <path d="M${w * 0.5} ${h * 0.05} 
             L${w * 0.92} ${h * 0.2} 
             L${w * 0.92} ${h * 0.5} 
             Q${w * 0.92} ${h * 0.82} ${w * 0.5} ${h * 0.98} 
             Q${w * 0.08} ${h * 0.82} ${w * 0.08} ${h * 0.5} 
             L${w * 0.08} ${h * 0.2} 
             Z" fill="${color}"/>
    <path d="M${w * 0.28} ${h * 0.5} 
             L${w * 0.44} ${h * 0.68} 
             L${w * 0.72} ${h * 0.35}" 
          stroke="white" stroke-width="${w * 0.09}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

function generateVerifiedBadge(size: number, color: string): string {
  const w = size;
  const h = size;
  
  return `
    <circle cx="${w * 0.5}" cy="${h * 0.5}" r="${w * 0.48}" fill="${color}"/>
    <path d="M${w * 0.26} ${h * 0.5} 
             L${w * 0.42} ${h * 0.68} 
             L${w * 0.74} ${h * 0.34}" 
          stroke="white" stroke-width="${w * 0.11}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  `;
}

// Main export function
export function generateBadgeSVG(config: BadgeConfig): string {
  switch (config.style) {
    case "seal":
      return generateSealBadge(config);
    case "metallic":
      return generateMetallicBadge(config);
    case "gradient":
      return generateGradientBadge(config);
    case "flat":
      return generateFlatBadge(config);
    default:
      return generateGradientBadge(config);
  }
}
