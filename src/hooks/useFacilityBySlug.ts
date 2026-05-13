/**
 * useFacilityBySlug
 * ─────────────────
 * Shared loader for the public/anon view of a facility, keyed by slug.
 *
 * Logic:
 *   1. Try the build-time static snapshot (cache, then network fetch).
 *   2. If the snapshot misses (e.g. SAMHSA-imported listing not yet in the
 *      regenerated snapshot), fall back to a direct `public_facilities`
 *      query by slug. The view enforces the same masking rules and
 *      carries `is_claimed` / `is_pro` / `is_premium_visible` inline.
 *   3. When the snapshot path returned the row, supplement with a
 *      one-shot `public_facilities` fetch by id to pick up the claim
 *      flags (the snapshot doesn't carry them).
 *
 * Callers that need additional data (owner-scoped PII, Pro-gated contact
 * RPC, joined detail tables) layer those on top — this hook only owns
 * the shared "anon-visible base + claim flags" load.
 *
 * Used by: CenterProfile, SeekerFacilityProfile, and the Phase 2+ claim
 * wizard. Three call sites, one source of truth.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchPublicFacilitiesSnapshot,
  findPublicFacilityBySlug,
  getCachedPublicFacilitiesSnapshot,
  type PublicFacilitySnapshot,
} from "@/lib/publicFacilitiesSnapshot";

export interface FacilityBaseData {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  zip_code: string;
  address: string;
  phone: string | null;
  website: string | null;
  description: string | null;
  facility_type: string;
  gender_served: string | null;
  bed_count: string | null;
  featured: boolean;
  verified: boolean | null;
  year_established: number | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  status: string;
  updated_at: string;
  accepts_international_patients: boolean | null;
  /** Provenance tag from the `public_facilities` view (e.g. 'samhsa_import',
   *  'manual'). Populated when the row was loaded via the fallback path;
   *  undefined when sourced from the static snapshot, which doesn't carry it. */
  data_source?: string | null;
}

export interface ClaimFlags {
  is_claimed: boolean;
  is_pro: boolean;
  is_premium_visible: boolean;
}

export interface FacilityLoadResult {
  facility: FacilityBaseData | null;
  flags: ClaimFlags | null;
}

export interface UseFacilityBySlugResult {
  facility: FacilityBaseData | null;
  claimFlags: ClaimFlags | null;
  loading: boolean;
  notFound: boolean;
  error: Error | null;
}

function snapshotToBase(snapshot: PublicFacilitySnapshot): FacilityBaseData {
  return {
    id: snapshot.id,
    name: snapshot.name,
    slug: snapshot.slug ?? "",
    city: snapshot.city,
    state: snapshot.state,
    zip_code: snapshot.zipCode,
    address: snapshot.address,
    phone: snapshot.phone || null,
    website: snapshot.website,
    description: snapshot.description || null,
    facility_type: snapshot.facilityType ?? "",
    gender_served: snapshot.genderServed,
    bed_count: snapshot.bedCount,
    featured: snapshot.featured,
    verified: snapshot.verified,
    year_established: snapshot.yearEstablished,
    logo_url: snapshot.logoUrl,
    gallery_urls: snapshot.galleryUrls,
    status: snapshot.status,
    updated_at: snapshot.updatedAt ?? new Date().toISOString(),
    accepts_international_patients: snapshot.acceptsInternationalPatients,
  };
}

function viewRowToBase(row: Record<string, unknown>): FacilityBaseData {
  return {
    id: row.id as string,
    name: (row.name as string) ?? "",
    slug: (row.slug as string) ?? "",
    city: (row.city as string) ?? "",
    state: (row.state as string) ?? "",
    zip_code: (row.zip_code as string) ?? "",
    address: (row.address as string) ?? "",
    phone: (row.phone as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    facility_type: (row.facility_type as string) ?? "",
    gender_served: (row.gender_served as string | null) ?? null,
    bed_count: (row.bed_count as string | null) ?? null,
    featured: !!row.featured,
    verified: row.verified == null ? null : !!row.verified,
    year_established: (row.year_established as number | null) ?? null,
    logo_url: (row.logo_url as string | null) ?? null,
    gallery_urls: (row.gallery_urls as string[] | null) ?? null,
    status: (row.status as string) ?? "",
    updated_at: (row.updated_at as string | null) ?? new Date().toISOString(),
    accepts_international_patients:
      row.accepts_international_patients == null
        ? null
        : !!row.accepts_international_patients,
    data_source: (row.data_source as string | null) ?? null,
  };
}

/**
 * Plain async loader exposed for callers that can't use a hook (e.g.
 * inside a useQuery in another component that needs to combine this data
 * with their own queries in a single fetch). Most callers should use the
 * `useFacilityBySlug` hook instead.
 */
export async function loadFacilityBySlug(
  slug: string,
): Promise<FacilityLoadResult> {
  // 1) Snapshot — cache first, then network.
  let snapshotRow = findPublicFacilityBySlug(
    getCachedPublicFacilitiesSnapshot(),
    slug,
  );
  if (!snapshotRow) {
    try {
      const fetched = await fetchPublicFacilitiesSnapshot();
      snapshotRow = findPublicFacilityBySlug(fetched, slug);
    } catch {
      // Snapshot fetch failure isn't fatal — fall through to the view.
    }
  }

  if (snapshotRow) {
    const base = snapshotToBase(snapshotRow);
    // Snapshot doesn't carry claim flags; pick them up by id.
    const { data: flagsRow } = await supabase
      .from("public_facilities")
      .select("is_claimed, is_pro, is_premium_visible")
      .eq("id", base.id)
      .maybeSingle();
    const flags: ClaimFlags | null = flagsRow
      ? {
          is_claimed: !!(flagsRow as Record<string, unknown>).is_claimed,
          is_pro: !!(flagsRow as Record<string, unknown>).is_pro,
          is_premium_visible: !!(flagsRow as Record<string, unknown>)
            .is_premium_visible,
        }
      : null;
    return { facility: base, flags };
  }

  // 2) Fallback — public_facilities by slug. The view row carries flags inline.
  const { data: viewRow } = await supabase
    .from("public_facilities")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();

  if (!viewRow) return { facility: null, flags: null };

  const row = viewRow as unknown as Record<string, unknown>;
  return {
    facility: viewRowToBase(row),
    flags: {
      is_claimed: !!row.is_claimed,
      is_pro: !!row.is_pro,
      is_premium_visible: !!row.is_premium_visible,
    },
  };
}

export function useFacilityBySlug(
  slug: string | undefined,
): UseFacilityBySlugResult {
  const enabled = !!slug;
  const { data, isLoading, isFetched, error } = useQuery({
    queryKey: ["facility-by-slug", slug ?? null],
    queryFn: () => loadFacilityBySlug(slug!),
    enabled,
    staleTime: 1000 * 60 * 10,
    gcTime: 1000 * 60 * 30,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  return {
    facility: data?.facility ?? null,
    claimFlags: data?.flags ?? null,
    loading: enabled && isLoading,
    notFound: enabled && isFetched && !error && !data?.facility,
    error: error instanceof Error ? error : null,
  };
}
