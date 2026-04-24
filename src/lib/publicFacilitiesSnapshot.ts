export interface PublicFacilitySnapshot {
  id: string;
  name: string;
  slug: string | null;
  city: string;
  state: string;
  zipCode: string;
  address: string;
  phone: string;
  description: string;
  featured: boolean;
  verified: boolean;
  facilityType: string | null;
  logoUrl: string | null;
  galleryUrls: string[];
  yearEstablished: number | null;
  treatmentTypes: string[];
  insuranceAccepted: string[];
  googleRating: number | null;
  googleReviewCount: number | null;
  website: string | null;
  genderServed: string | null;
  bedCount: string | null;
  status: string;
  updatedAt: string | null;
  acceptsInternationalPatients: boolean | null;
}

interface StaticFacilitiesResponse {
  facilities: PublicFacilitySnapshot[];
  generatedAt: string;
  count: number;
}

const STATIC_FACILITIES_CACHE_KEY = "static-facilities-cache";
const STATIC_FACILITIES_TTL_MS = 1000 * 60 * 10;

export const getCachedPublicFacilitiesSnapshot = (): PublicFacilitySnapshot[] | undefined => {
  if (typeof window === "undefined") return undefined;

  try {
    const cached = window.localStorage.getItem(STATIC_FACILITIES_CACHE_KEY);
    if (!cached) return undefined;

    const parsed = JSON.parse(cached) as {
      data?: PublicFacilitySnapshot[];
      timestamp?: number;
    };

    if (!Array.isArray(parsed.data) || typeof parsed.timestamp !== "number") {
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
      JSON.stringify({ data, timestamp: Date.now() }),
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