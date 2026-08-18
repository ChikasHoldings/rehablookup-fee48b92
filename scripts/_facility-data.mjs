// Build-time facility-data fetcher. Called once per generator run to pull the
// current `facilities` set from Supabase, grouped by state / city / county /
// service-type. The aggregate-page generators (generate-seo-html.mjs,
// generate-county-pages.mjs, etc.) inject these into their static HTML so
// Googlebot sees real listings on first crawl — without it, those pages would
// remain templated thin content even after the SAMHSA import populates the DB.
//
// Idempotent + cache-friendly: each generator invocation calls fetchAllFacilities()
// once, then queries the in-memory groups. No per-page DB roundtrips.
//
// ─────────────────────────────────────────────────────────────────────────────
// FAIL-LOUD CONTRACT (SEO Phase 1)
//
// This module used to be fail-soft: a network error or a non-2xx response
// returned [] and the build carried on, overwriting rich pages with
// inventory-free boilerplate and still exiting 0. Every generator downstream
// treated "the directory is empty" and "we could not reach the directory" as
// the same thing. That is the failure mode this phase exists to remove.
//
// Now: any fetch problem throws. A production build cannot ship a corpus that
// silently lost its facility inventory. Local/offline development opts out
// explicitly with ALLOW_EMPTY_FACILITY_DATA=1 (see below) — never set that on
// Vercel or in CI.
// ─────────────────────────────────────────────────────────────────────────────

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Canonical location layer — the SAME module the browser search uses.
// Node 22 strips the TypeScript types on import, so the generators run
// the real rules instead of a re-implementation that can drift.
import { cityMatchKey, cityMatchKeyFromSlug } from "../src/lib/location/normalizeCity.ts";
import { stateSlugFor } from "../src/lib/location/normalizeState.ts";

// ---------------------------------------------------------------------------
// Environment contract
// ---------------------------------------------------------------------------
//
// No hardcoded project URL or key. A missing env var previously fell through
// to a baked-in project reference, so a misconfigured Vercel environment
// quietly built against whatever project those literals pointed at instead of
// failing. The build now stops and says which variable to set.

export const ALLOW_EMPTY_FACILITY_DATA =
  process.env.ALLOW_EMPTY_FACILITY_DATA === "1";

let warnedEscapeHatch = false;
function warnEscapeHatch(reason) {
  if (warnedEscapeHatch) return;
  warnedEscapeHatch = true;
  console.warn(
    "\n" +
      "!!  ============================================================\n" +
      "!!  ALLOW_EMPTY_FACILITY_DATA=1 — FACILITY INVENTORY IS DISABLED\n" +
      "!!  ============================================================\n" +
      `!!  ${reason}\n` +
      "!!  Every aggregate page in this build will be generated WITHOUT\n" +
      "!!  facility listings, and facility profiles will not be written.\n" +
      "!!  This output is for local development only. It must never be\n" +
      "!!  deployed: Vercel and CI must leave this variable unset.\n" +
      "!!  ============================================================\n",
  );
}

/**
 * Resolve the Supabase project URL + anon key from the environment.
 *
 * Throws when either is absent, unless the caller has opted into the
 * offline escape hatch. Returns the sanitized host alongside the credentials
 * so error messages can name the project without ever printing the key.
 */
export function resolveSupabaseConfig() {
  const rawUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "";
  const key =
    process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";

  const missing = [];
  if (!rawUrl) missing.push("SUPABASE_URL (or VITE_SUPABASE_URL)");
  if (!key) missing.push("SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY)");

  if (missing.length) {
    const detail = `Missing required facility-data credentials: ${missing.join(", ")}.`;
    if (ALLOW_EMPTY_FACILITY_DATA) {
      warnEscapeHatch(detail);
      return null;
    }
    throw new Error(
      `[facility-data] ${detail}\n` +
        `  Set them in the Vercel project's Environment Variables for this\n` +
        `  environment, or export them locally. For offline development only,\n` +
        `  re-run with ALLOW_EMPTY_FACILITY_DATA=1 to build without inventory.`,
    );
  }

  const url = rawUrl.replace(/\/$/, "");
  let host;
  try {
    host = new URL(url).host;
  } catch {
    throw new Error(
      `[facility-data] SUPABASE_URL is not a valid URL: ${JSON.stringify(rawUrl)}`,
    );
  }
  // `host` is safe to log — it is the public project reference, not a secret.
  return { url, key, host };
}

// Render at most this many facility cards per aggregate page. SEO-tuned:
// enough unique content to push the page past the ~300-word thin-content
// threshold, not so many that the static HTML balloons and slows TTFB.
export const FACILITIES_PER_PAGE = 12;

let cachedFacilities = null;
let cachedServices = null;

// ---------------------------------------------------------------------------
// Stable pagination
// ---------------------------------------------------------------------------
//
// ROOT CAUSE OF THE INVENTORY COLLAPSE (SEO Phase 1).
//
// These fetches page through PostgREST with offset/limit. The order was
// `calculated_ranking_score.desc.nullslast` — a column with TEN distinct
// values across 3,794 rows. `generate-facility-profiles-html.mjs` ordered by
// `updated_at.desc`, where 2,787 rows share one identical timestamp from the
// SAMHSA bulk import. The child-table fetches had no ORDER BY at all.
//
// Each page is a separate HTTP request, so each is a separate query with its
// own plan. Postgres gives no ordering guarantee among rows that tie on the
// sort key, so a row on a page boundary can be returned twice, or never.
// The generator counted write() calls, not distinct files, so a run that
// fetched 3,794 rows containing 762 duplicates wrote only 3,032 distinct
// profiles and reported success.
//
// The fix is a unique tiebreaker on every paginated order. `id` is the primary
// key of every table read here, so appending it makes the total order strict
// and the page boundaries deterministic. The duplicate check below is defence
// in depth: if a fetch ever loses stability again, the build stops instead of
// shipping a short corpus.

const PAGE_SIZE = 1000;

function describeFailure({ table, host, status, offset, rowsSoFar, cause }) {
  const lines = [
    `[facility-data] Failed to fetch "${table}" from ${host}.`,
    `  page offset      : ${offset}`,
    `  rows before fail : ${rowsSoFar}`,
  ];
  if (status != null) lines.push(`  HTTP status      : ${status}`);
  if (cause) lines.push(`  cause            : ${cause}`);
  lines.push(
    `  A production build must not continue without facility inventory.`,
    `  For offline development only: ALLOW_EMPTY_FACILITY_DATA=1`,
  );
  return lines.join("\n");
}

/**
 * Page through a PostgREST table/view and return every row.
 *
 * Strict by contract: network failure, non-2xx, or a malformed body throws.
 * `order` is always suffixed with a unique tiebreaker so page boundaries are
 * deterministic — see the note above.
 *
 * @param {string} table    table or view name
 * @param {string} cols     comma-separated projection
 * @param {object} [opts]
 * @param {string} [opts.filter]    extra PostgREST filter, e.g. "slug=not.is.null"
 * @param {string} [opts.order]     ordering WITHOUT the tiebreaker
 * @param {string} [opts.tiebreak]  unique column appended to `order` (default "id")
 */
export async function fetchPaginated(table, cols, opts = {}) {
  const { filter = "", order = "", tiebreak = "id" } = opts;

  const config = resolveSupabaseConfig();
  if (!config) return [];
  const { url: projectUrl, key, host } = config;

  const orderParam = [order, `${tiebreak}.asc`].filter(Boolean).join(",");

  const all = [];
  const seenIds = new Set();
  let from = 0;

  while (true) {
    const requestUrl =
      `${projectUrl}/rest/v1/${table}` +
      `?select=${encodeURIComponent(cols)}` +
      `${filter ? "&" + filter : ""}` +
      `&order=${encodeURIComponent(orderParam)}` +
      `&offset=${from}&limit=${PAGE_SIZE}`;

    let res;
    try {
      res = await fetch(requestUrl, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          Accept: "application/json",
          "Range-Unit": "items",
        },
      });
    } catch (err) {
      throw new Error(
        describeFailure({
          table,
          host,
          offset: from,
          rowsSoFar: all.length,
          cause: err instanceof Error ? err.message : String(err),
        }),
        { cause: err },
      );
    }

    if (!res.ok) {
      // Body may carry a PostgREST error object. It never carries the key.
      const body = await res.text().catch(() => "");
      throw new Error(
        describeFailure({
          table,
          host,
          status: res.status,
          offset: from,
          rowsSoFar: all.length,
          cause: body.slice(0, 200) || res.statusText,
        }),
      );
    }

    let rows;
    try {
      rows = await res.json();
    } catch (err) {
      throw new Error(
        describeFailure({
          table,
          host,
          status: res.status,
          offset: from,
          rowsSoFar: all.length,
          cause: `response was not valid JSON (${err instanceof Error ? err.message : String(err)})`,
        }),
      );
    }

    if (!Array.isArray(rows)) {
      throw new Error(
        describeFailure({
          table,
          host,
          status: res.status,
          offset: from,
          rowsSoFar: all.length,
          cause: `expected a JSON array, received ${typeof rows}`,
        }),
      );
    }

    // Defence in depth against a regression in ordering stability: a row
    // appearing on two pages means the total order was not strict, which
    // means other rows were skipped. Fail rather than ship a short corpus.
    for (const row of rows) {
      const rowId = row?.[tiebreak];
      if (rowId != null) {
        if (seenIds.has(rowId)) {
          throw new Error(
            `[facility-data] Unstable pagination detected fetching "${table}" from ${host}.\n` +
              `  Row ${tiebreak}=${rowId} was returned on more than one page (offset ${from}).\n` +
              `  The ORDER BY is not a strict total order, so rows are being\n` +
              `  duplicated across page boundaries and others dropped.\n` +
              `  Ordering used: ${orderParam}`,
          );
        }
        seenIds.add(rowId);
      }
      all.push(row);
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
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
 * Throws when the directory comes back empty — a real production catalogue is
 * never zero rows, so an empty result means a broken fetch, not an empty
 * directory. Cached after the first call within a build run.
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

  const rows = await fetchPaginated("public_facilities", cols, {
    filter: "slug=not.is.null",
    order: "calculated_ranking_score.desc.nullslast",
  });

  if (rows.length === 0 && !ALLOW_EMPTY_FACILITY_DATA) {
    const { host } = resolveSupabaseConfig() ?? { host: "unknown" };
    throw new Error(
      `[facility-data] public_facilities returned 0 rows from ${host}.\n` +
        `  The live directory is never empty, so this is a broken read — an\n` +
        `  RLS/grant change, a wrong project, or a filter mismatch — not an\n` +
        `  empty catalogue. Refusing to generate an inventory-free corpus.\n` +
        `  For offline development only: ALLOW_EMPTY_FACILITY_DATA=1`,
    );
  }

  cachedFacilities = rows;
  return rows;
}

/**
 * Pull facility_services rows, returns Map<facility_id, string[]>. Used by
 * county/treatment generator which filters facilities by service type.
 */
export async function fetchAllServices() {
  if (cachedServices) return cachedServices;
  const rows = await fetchPaginated("facility_services", "id,facility_id,service_name");
  const map = new Map();
  for (const row of rows) {
    if (!map.has(row.facility_id)) map.set(row.facility_id, []);
    map.get(row.facility_id).push(row.service_name);
  }
  cachedServices = map;
  return map;
}

// ---------------------------------------------------------------------------
// Build manifest
// ---------------------------------------------------------------------------

export const MANIFEST_PATH = ".tmp/facility-build-manifest.json";

/**
 * Record the facility set this build actually fetched, so every downstream
 * guard validates against the same snapshot rather than re-querying and
 * disagreeing because the data moved mid-build.
 *
 * Written to .tmp/ — a build artifact, not committed. Carries identity only
 * (id / slug / city / state); no contact details, no credentials.
 */
export async function writeFacilityManifest(facilities, rootDir) {
  const target = path.resolve(rootDir, MANIFEST_PATH);
  await mkdir(path.dirname(target), { recursive: true });
  const payload = {
    generatedAt: new Date().toISOString(),
    count: facilities.length,
    facilities: facilities
      .map((f) => ({
        id: f.id,
        slug: f.slug,
        city: f.city ?? null,
        state: f.state ?? null,
      }))
      .sort((a, b) => String(a.slug).localeCompare(String(b.slug))),
  };
  await writeFile(target, JSON.stringify(payload, null, 2), "utf8");
  return target;
}

/**
 * Read the manifest written by generate-facility-profiles-html.mjs.
 *
 * Returns null when it does not exist, which is the legitimate state for a
 * checkout with no credentials or an ALLOW_EMPTY_FACILITY_DATA run — callers
 * fall back to on-disk behaviour rather than failing.
 */
export async function readFacilityManifest(rootDir) {
  const target = path.resolve(rootDir, MANIFEST_PATH);
  let raw;
  try {
    raw = await readFile(target, "utf8");
  } catch {
    return null;
  }
  const parsed = JSON.parse(raw);
  if (!parsed || !Array.isArray(parsed.facilities)) {
    throw new Error(`[facility-data] Malformed facility manifest at ${target}`);
  }
  return parsed;
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
 * Canonical grouping keys.
 *
 * `citySlug`/`stateSlug` above are URL-shaped helpers and are left
 * untouched — published page paths do not change in this phase. What
 * changed is the key used to ASSOCIATE a facility with a page: it now
 * runs through the shared canonical location layer in `src/lib/location`
 * (Node 22 strips the types on import), so the generators group
 * facilities by exactly the same rules the browser uses.
 *
 * Concretely, the old raw-lowercase key filed "Saint Charles" and
 * "St Charles" as two different cities. Five prerendered city pages —
 * st-paul, st-louis, st-charles, st-george and st-clair-shores —
 * therefore shipped with ZERO crawler-visible facility inventory while
 * real approved facilities existed in those cities. Canonical keys
 * recover 16 facility links across those five pages and lose none.
 */
function cityKey(cityName) {
  return cityMatchKey(cityName);
}

function stateKey(stateName) {
  return stateSlugFor(stateName) ?? stateSlug(stateName);
}

/** Canonical `state/city` association key from raw facility values. */
export function stateCityKey(stateName, cityName) {
  return `${stateKey(stateName)}/${cityKey(cityName)}`;
}

/**
 * Canonical association key built from URL slugs, e.g.
 * ("missouri", "st-charles") → "missouri/saint-charles". Use this on the
 * PAGE side so both sides of the lookup fold identically.
 */
export function stateCityKeyFromSlugs(stateSlugValue, citySlugValue) {
  return `${stateKey(String(stateSlugValue).replace(/-+/g, " "))}/${cityMatchKeyFromSlug(citySlugValue)}`;
}

/**
 * Build Map<state-slug, facility[]>. Used by state-page generators.
 */
export function groupByState(facilities) {
  const map = new Map();
  for (const f of facilities) {
    const k = stateKey(f.state);
    if (!k) continue;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(f);
  }
  return map;
}

/**
 * Build Map<`${state-key}/${city-key}`, facility[]>. Used by city-page
 * generators. Keys are canonical — look them up with `stateCityKey` or
 * `stateCityKeyFromSlugs`, never by hand-building a raw slug pair.
 */
export function groupByStateCity(facilities) {
  const map = new Map();
  for (const f of facilities) {
    const k = stateCityKey(f.state, f.city);
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
 *
 * HEADING WORDING (SEO Phase 1): this block renders ordinary organic
 * directory inventory — 2 of 3,794 live facilities carry `featured`. Calling
 * the list "Featured Facilities" told readers the whole list was paid
 * placement. The per-facility Featured badge below still marks the genuinely
 * sponsored rows; the heading no longer mislabels the rest.
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
        ? ` <span style="display:inline-block;padding:1px 6px;font-size:.75rem;background:#fef3c7;color:#92400e;border-radius:.25rem;margin-left:.25rem;">Sponsored</span>`
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
  return `<h2>Treatment Facilities in ${escapeHtml(locationLabel)}</h2>
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
