// Build-time facility-data fetcher. Called once per generator run to pull the
// current `facilities` set from Supabase, grouped by state / city / county /
// service-type. The aggregate-page generators (generate-seo-html.mjs,
// generate-county-pages.mjs, etc.) inject these into their static HTML so
// Googlebot sees real listings on first crawl — without it, those pages would
// remain templated thin content even after the SAMHSA import populates the DB.
//
// Idempotent + cache-friendly: each generator invocation calls fetchAllFacilities()
// once, then queries the in-memory groups. No per-page DB roundtrips.

const PROJECT_URL = (
  process.env.SUPABASE_URL ??
  process.env.VITE_SUPABASE_URL ??
  "https://mldbxpntzcjalgjmwnqa.supabase.co"
).replace(/\/$/, "");

const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_tHLCRbeUrsu7EmMlCR0n6g_ygNXmMYP";

// Render at most this many facility cards per aggregate page. SEO-tuned:
// enough unique content to push the page past the ~300-word thin-content
// threshold, not so many that the static HTML balloons and slows TTFB.
export const FACILITIES_PER_PAGE = 12;

let cachedFacilities = null;
let cachedServices = null;

// Fail-soft: when the build environment can't reach Supabase (sandbox,
// offline dev, network blip), each generator gets back an empty list and
// emits a text-only page. The build continues — we'd rather ship a slightly
// thinner page than break the deploy. A single warning is logged once per
// run so the gap is visible in Vercel build logs.
let warnedFetchFailure = false;
function warnFetchFailure(table, message) {
  if (warnedFetchFailure) return;
  warnedFetchFailure = true;
  console.warn(
    `[facility-data] WARNING: could not fetch ${table} from ${PROJECT_URL} (${message}). ` +
      `Aggregate pages will be generated WITHOUT facility lists for this build. ` +
      `Verify SUPABASE_URL + SUPABASE_ANON_KEY env vars on Vercel are set to the active project.`,
  );
}

async function fetchPaginated(table, cols, extraQuery = "") {
  const PAGE = 1000;
  let from = 0;
  const all = [];
  while (true) {
    const url =
      `${PROJECT_URL}/rest/v1/${table}` +
      `?select=${encodeURIComponent(cols)}` +
      `${extraQuery ? "&" + extraQuery : ""}` +
      `&offset=${from}&limit=${PAGE}`;
    let res;
    try {
      res = await fetch(url, {
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          Accept: "application/json",
          "Range-Unit": "items",
        },
      });
    } catch (err) {
      warnFetchFailure(table, err instanceof Error ? err.message : String(err));
      return [];
    }
    if (!res.ok) {
      const body = await res.text();
      warnFetchFailure(table, `${res.status}: ${body.slice(0, 120)}`);
      return [];
    }
    const rows = await res.json();
    all.push(...rows);
    if (rows.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

/**
 * Pull every approved facility with the columns we need for aggregate-page
 * rendering. Reads from the `public_facilities` VIEW (anon-readable, with
 * paywall masking) — NOT the `facilities` TABLE, which is auth-only and
 * returns 401 for the build's anon credentials.
 *
 * The view already filters status='approved' AND NOT suspended, so we
 * don't repeat those predicates here. It also exposes computed columns
 * (`is_claimed`, `is_pro`, `is_premium_visible`, `data_source`) that the
 * aggregate-page renderers can use without an extra fetch.
 *
 * Cached after the first call within a build run.
 */
export async function fetchAllFacilities() {
  if (cachedFacilities) return cachedFacilities;
  const cols = [
    "id",
    "slug",
    "name",
    "facility_type",
    "city",
    "state",
    "zip_code",
    "phone",
    "website",
    "verified",
    "featured",
    "calculated_ranking_score",
    "data_source",
    "is_claimed",
    "is_pro",
    "is_premium_visible",
  ].join(",");
  const rows = await fetchPaginated(
    "public_facilities",
    cols,
    "slug=not.is.null&order=calculated_ranking_score.desc.nullslast",
  );
  cachedFacilities = rows;
  return rows;
}

/**
 * Pull facility_services rows, returns Map<facility_id, string[]>. Used by
 * county/treatment generator which filters facilities by service type.
 */
export async function fetchAllServices() {
  if (cachedServices) return cachedServices;
  const rows = await fetchPaginated(
    "facility_services",
    "facility_id,service_name",
  );
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.facility_id)) map.set(row.facility_id, []);
    map.get(row.facility_id).push(row.service_name);
  }
  cachedServices = map;
  return map;
}

// ---------------------------------------------------------------------------
// Group helpers
// ---------------------------------------------------------------------------

function citySlug(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, "-");
}

function stateSlug(s) {
  return String(s ?? "").toLowerCase().replace(/\s+/g, "-");
}

/**
 * Build Map<state-slug, facility[]>. Used by state-page generators.
 */
export function groupByState(facilities) {
  const map = new Map();
  for (const f of facilities) {
    const k = stateSlug(f.state);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(f);
  }
  return map;
}

/**
 * Build Map<`${state-slug}/${city-slug}`, facility[]>. Used by city-page
 * generators.
 */
export function groupByStateCity(facilities) {
  const map = new Map();
  for (const f of facilities) {
    const k = `${stateSlug(f.state)}/${citySlug(f.city)}`;
    if (!k.includes("/") || k.startsWith("/") || k.endsWith("/")) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(f);
  }
  return map;
}

/**
 * Render up to `limit` facilities as a clean HTML list. Each entry has a
 * link to the full /center/<slug> profile page. Designed to be safely
 * inlined into the existing static-page templates: no external CSS, no JS,
 * minimal markup, accessible link text.
 *
 * Returns an empty string when no facilities — caller decides whether to
 * substitute boilerplate text.
 */
export function renderFacilityList(facilities, locationLabel, limit = FACILITIES_PER_PAGE) {
  if (!facilities || facilities.length === 0) return "";
  const top = facilities.slice(0, limit);
  const items = top
    .map((f) => {
      const verifiedBadge = f.verified
        ? ` <span style="display:inline-block;padding:1px 6px;font-size:.75rem;background:#dcfce7;color:#166534;border-radius:.25rem;margin-left:.25rem;">Verified</span>`
        : "";
      const featuredBadge = f.featured
        ? ` <span style="display:inline-block;padding:1px 6px;font-size:.75rem;background:#fef3c7;color:#92400e;border-radius:.25rem;margin-left:.25rem;">Featured</span>`
        : "";
      const phone = f.phone
        ? ` &middot; <a href="tel:${escapeAttr(f.phone)}">${escapeHtml(f.phone)}</a>`
        : "";
      const website = f.website
        ? ` &middot; <a href="${escapeAttr(f.website)}" rel="nofollow noopener">Website</a>`
        : "";
      return `<li style="margin-bottom:14px;padding-bottom:12px;border-bottom:1px solid #e5e7eb;">
        <a href="/center/${escapeAttr(f.slug)}" style="font-weight:600;font-size:1.05rem;color:#1B365D;text-decoration:none;">${escapeHtml(f.name)}</a>${verifiedBadge}${featuredBadge}
        <div style="color:#475569;font-size:.9rem;margin-top:2px;">${escapeHtml(f.facility_type ?? "Treatment Facility")} &middot; ${escapeHtml(f.city)}, ${escapeHtml(f.state)}${phone}${website}</div>
      </li>`;
    })
    .join("");
  const more = facilities.length > limit
    ? `<p style="margin-top:8px;color:#666;font-size:.9rem;"><a href="/rehab-centers/${stateSlug(facilities[0].state)}">View all ${facilities.length} facilities in ${escapeHtml(locationLabel)} &rarr;</a></p>`
    : "";
  return `<h2>Featured Facilities in ${escapeHtml(locationLabel)}</h2>
    <ul style="list-style:none;padding:0;">${items}</ul>${more}`;
}

// ---------------------------------------------------------------------------
// HTML safety
// ---------------------------------------------------------------------------

function escapeHtml(value) {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

export { escapeHtml, escapeAttr, citySlug, stateSlug };
