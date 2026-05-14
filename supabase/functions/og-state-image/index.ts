// Public OG image renderer for /rehab-centers/:slug state pages.
// SVG is built by hand and rasterized to PNG via @resvg/resvg-wasm.
// Verify-JWT is disabled because social-card crawlers (Facebook, Twitter,
// LinkedIn, Slack, etc.) do not send Authorization headers.

import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2?bundle";

const VERSION = "1.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "content-type",
};

// All US states + DC.
const STATES: Record<string, { name: string; abbreviation: string }> = {
  "alabama": { name: "Alabama", abbreviation: "AL" },
  "alaska": { name: "Alaska", abbreviation: "AK" },
  "arizona": { name: "Arizona", abbreviation: "AZ" },
  "arkansas": { name: "Arkansas", abbreviation: "AR" },
  "california": { name: "California", abbreviation: "CA" },
  "colorado": { name: "Colorado", abbreviation: "CO" },
  "connecticut": { name: "Connecticut", abbreviation: "CT" },
  "delaware": { name: "Delaware", abbreviation: "DE" },
  "district-of-columbia": { name: "District of Columbia", abbreviation: "DC" },
  "florida": { name: "Florida", abbreviation: "FL" },
  "georgia": { name: "Georgia", abbreviation: "GA" },
  "hawaii": { name: "Hawaii", abbreviation: "HI" },
  "idaho": { name: "Idaho", abbreviation: "ID" },
  "illinois": { name: "Illinois", abbreviation: "IL" },
  "indiana": { name: "Indiana", abbreviation: "IN" },
  "iowa": { name: "Iowa", abbreviation: "IA" },
  "kansas": { name: "Kansas", abbreviation: "KS" },
  "kentucky": { name: "Kentucky", abbreviation: "KY" },
  "louisiana": { name: "Louisiana", abbreviation: "LA" },
  "maine": { name: "Maine", abbreviation: "ME" },
  "maryland": { name: "Maryland", abbreviation: "MD" },
  "massachusetts": { name: "Massachusetts", abbreviation: "MA" },
  "michigan": { name: "Michigan", abbreviation: "MI" },
  "minnesota": { name: "Minnesota", abbreviation: "MN" },
  "mississippi": { name: "Mississippi", abbreviation: "MS" },
  "missouri": { name: "Missouri", abbreviation: "MO" },
  "montana": { name: "Montana", abbreviation: "MT" },
  "nebraska": { name: "Nebraska", abbreviation: "NE" },
  "nevada": { name: "Nevada", abbreviation: "NV" },
  "new-hampshire": { name: "New Hampshire", abbreviation: "NH" },
  "new-jersey": { name: "New Jersey", abbreviation: "NJ" },
  "new-mexico": { name: "New Mexico", abbreviation: "NM" },
  "new-york": { name: "New York", abbreviation: "NY" },
  "north-carolina": { name: "North Carolina", abbreviation: "NC" },
  "north-dakota": { name: "North Dakota", abbreviation: "ND" },
  "ohio": { name: "Ohio", abbreviation: "OH" },
  "oklahoma": { name: "Oklahoma", abbreviation: "OK" },
  "oregon": { name: "Oregon", abbreviation: "OR" },
  "pennsylvania": { name: "Pennsylvania", abbreviation: "PA" },
  "rhode-island": { name: "Rhode Island", abbreviation: "RI" },
  "south-carolina": { name: "South Carolina", abbreviation: "SC" },
  "south-dakota": { name: "South Dakota", abbreviation: "SD" },
  "tennessee": { name: "Tennessee", abbreviation: "TN" },
  "texas": { name: "Texas", abbreviation: "TX" },
  "utah": { name: "Utah", abbreviation: "UT" },
  "vermont": { name: "Vermont", abbreviation: "VT" },
  "virginia": { name: "Virginia", abbreviation: "VA" },
  "washington": { name: "Washington", abbreviation: "WA" },
  "west-virginia": { name: "West Virginia", abbreviation: "WV" },
  "wisconsin": { name: "Wisconsin", abbreviation: "WI" },
  "wyoming": { name: "Wyoming", abbreviation: "WY" },
};

let wasmReady: Promise<void> | null = null;
async function ensureWasm() {
  if (!wasmReady) {
    wasmReady = (async () => {
      const wasmResp = await fetch("https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm");
      const wasmBuf = await wasmResp.arrayBuffer();
      await initWasm(wasmBuf);
    })();
  }
  return wasmReady;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Choose a hero size that fits the longest state name comfortably at 1200px wide.
function heroFontSize(stateName: string): number {
  const len = stateName.length;
  if (len <= 6) return 168;
  if (len <= 9) return 144;
  if (len <= 12) return 120;
  if (len <= 16) return 104;
  return 88;
}

function buildSvg(stateName: string, abbreviation: string): string {
  const name = escapeXml(stateName);
  const abbr = escapeXml(abbreviation);
  const heroSize = heroFontSize(stateName);

  // Color palette mirrors the site primary indigo + accent amber.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1e1b4b"/>
      <stop offset="0.55" stop-color="#312e81"/>
      <stop offset="1" stop-color="#4338ca"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.85" cy="0.15" r="0.7">
      <stop offset="0" stop-color="#fbbf24" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#fbbf24" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>

  <!-- Subtle diagonal accent line -->
  <line x1="0" y1="610" x2="1200" y2="610" stroke="rgba(251,191,36,0.45)" stroke-width="3"/>

  <!-- Brand wordmark -->
  <g transform="translate(72, 78)">
    <circle cx="22" cy="22" r="22" fill="#fbbf24"/>
    <path d="M14 22 l6 6 l12 -12" stroke="#1e1b4b" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <text x="58" y="32" font-family="Inter, 'Helvetica Neue', Arial, sans-serif" font-size="30" font-weight="700" fill="#ffffff">RehabLookup</text>
  </g>

  <!-- Eyebrow / category tag -->
  <g transform="translate(72, 168)">
    <rect width="290" height="44" rx="22" ry="22" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.18)" stroke-width="1"/>
    <text x="20" y="30" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="600" fill="#fbbf24" letter-spacing="2">${abbr} TREATMENT CENTERS</text>
  </g>

  <!-- Hero label -->
  <text x="72" y="278" font-family="Inter, Arial, sans-serif" font-size="44" font-weight="500" fill="rgba(255,255,255,0.78)">Drug &amp; Alcohol Rehab in</text>

  <!-- Big state name -->
  <text x="72" y="${278 + heroSize + 8}" font-family="Inter, Arial, sans-serif" font-size="${heroSize}" font-weight="800" fill="#ffffff" letter-spacing="-2">${name}</text>

  <!-- Footer strap -->
  <text x="72" y="558" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="500" fill="rgba(255,255,255,0.78)">Compare verified detox, inpatient &amp; outpatient programs</text>

  <!-- Domain -->
  <text x="1128" y="558" font-family="Inter, Arial, sans-serif" font-size="22" font-weight="600" fill="#fbbf24" text-anchor="end">rehablookup.com</text>
</svg>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const slugRaw = (url.searchParams.get("slug") || "").toLowerCase().trim();
    const state = STATES[slugRaw];

    if (!state) {
      return new Response("Unknown state slug", {
        status: 404,
        headers: { ...corsHeaders, "Cache-Control": "public, max-age=60" },
      });
    }

    await ensureWasm();

    const svg = buildSvg(state.name, state.abbreviation);
    const png = new Resvg(svg, {
      fitTo: { mode: "width", value: 1200 },
      font: { loadSystemFonts: false },
    }).render().asPng();

    return new Response(png, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable",
        "x-og-renderer-version": VERSION,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[og-state-image v${VERSION}] error`, msg);
    return new Response(`Render error: ${msg}`, {
      status: 500,
      headers: { ...corsHeaders, "Cache-Control": "no-store" },
    });
  }
});
