/**
 * Shape of a row in the public facility snapshot returned by the
 * `get-public-facilities` edge function. The function selects from the
 * `public_facilities` view so Pro-gated columns (phone/email/website) are
 * already masked to null for non-Pro facilities — the client treats them
 * as nullable and shows a "Get more info" CTA when absent.
 *
 * Keep this type in sync with the SELECT list inside
 * `supabase/functions/get-public-facilities/index.ts`. Adding a column to the
 * view alone is not enough; the edge function has to project it AND this
 * type has to declare it, otherwise downstream sorts/filters silently
 * receive `undefined`.
 */
export interface PublicFacilitySnapshot {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  description: string;
  featured: boolean;
  featuredPinned: boolean;
  verified: boolean;
  facilityType: string | null;
  bedCount: string | null;
  genderServed: string | null;
  logoUrl: string | null;
  galleryUrls: string[];
  yearEstablished: number | null;
  calculatedRankingScore: number;
  listingCompletenessScore: number;
  responseRateScore: number;
  acceptsInternationalPatients: boolean;
  hoursOfOperation: string | null;
  languagesSpoken: string[];
  accessibilityFeatures: string[];
  acceptingAdmissions: boolean | null;
  isClaimed: boolean;
  isPro: boolean;
  dataSource: string | null;
  treatmentTypes: string[];
  insuranceAccepted: string[];

  /**
   * Google Reviews-derived rating + count, sourced from
   * `facility_reviews_config`. Currently UNPOPULATED for ~all facilities
   * (1 of 3,803 rows as of 2026-05-21) so the "Sort by reviews" UI is
   * effectively inert. The fields remain on the snapshot for shape
   * compatibility with existing callers; backfilling via the Google Places
   * API is tracked as a deferred item in
   * `docs/search-fixes-2026-05-21.md` §3.
   */
  googleRating: number | null;
  googleReviewCount: number | null;
}

interface StaticFacilitiesResponse {
  facilities: PublicFacilitySnapshot[];
  generatedAt: string;
  count: number;
}

const STATIC_FACILITIES_CACHE_KEY = "static-facilities-cache";
const STATIC_FACILITIES_TTL_MS = 1000 * 60 * 10;

/**
 * Bump this when the snapshot schema changes in a backwards-incompatible
 * way. The cached version is stored alongside the data; mismatches mean
 * the user is reading a stale cache from a prior deploy and we transparently
 * refetch instead of serving stale shapes to new code paths.
 *
 * Bumped 2026-05-21 to invalidate caches that don't carry the expanded
 * field set (calculated_ranking_score, hours_of_operation, languages_spoken,
 * accessibility_features, accepting_admissions, is_pro, is_claimed, etc.).
 * Without the bump, returning users would see "Sort by ranking" silently
 * no-op until their 10-min localStorage TTL expired.
 */
const SNAPSHOT_SCHEMA_VERSION = 2;

export const getCachedPublicFacilitiesSnapshot = (): PublicFacilitySnapshot[] | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    const cached = window.localStorage.getItem(STATIC_FACILITIES_CACHE_KEY);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached) as {
      data?: PublicFacilitySnapshot[];
      timestamp?: number;
      version?: number;
    };

    if (!Array.isArray(parsed.data) || typeof parsed.timestamp !== "number") {
      return undefined;
    }

    if (parsed.version !== SNAPSHOT_SCHEMA_VERSION) {
      return undefined;
    }

    if (Date.now() - parsed.timestamp >= STATIC_FACILITIES_TTL_MS) {
      return undefined;
    }

    return parsed.data;
  } catch {
    return undefined;
  }
};

export const setCachedPublicFacilitiesSnapshot = (data: PublicFacilitySnapshot[]) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STATIC_FACILITIES_CACHE_KEY,
      JSON.stringify({ data, timestamp: Date.now(), version: SNAPSHOT_SCHEMA_VERSION }),
    );
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
};

export const fetchPublicFacilitiesSnapshot = async (): Promise<PublicFacilitySnapshot[]> => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/get-public-facilities`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${anonKey}`,
      apikey: anonKey,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Edge function error: ${res.status}`);
  }

  const payload: StaticFacilitiesResponse = await res.json();
  const facilities = payload?.facilities || [];
  setCachedPublicFacilitiesSnapshot(facilities);
  return facilities;
};

export const findPublicFacilityBySlug = (
  facilities: PublicFacilitySnapshot[] | undefined,
  slug: string | undefined,
) => {
  if (!facilities?.length || !slug) return null;
  return facilities.find((facility) => facility.slug === slug) ?? null;
};
