/**
 * useFacilityBySlug
 * ─────────────────
 * Shared loader for the public/anon view of a facility, keyed by slug.
 *
 * Strict contract: this hook queries the `public_facilities` view only,
 * filtered by `slug`. It never narrows by `user_id`, never appends an
 * owner/admin scope, and never depends on the seeker's session. This is
 * the load that drives the public profile route — every visitor (signed
 * out, signed in as a different user, admin, owner) must see the same
 * row resolved by slug.
 *
 * Previously this loader tried a build-time static snapshot first and
 * fell back to the view. The snapshot drifted as new facilities were
 * approved between deploys (e.g. claimed SAMHSA imports), which surfaced
 * as "Center Not Found" for freshly approved listings whose row existed
 * in `public_facilities` but not yet in the cached snapshot. Querying
 * the view directly removes that drift window and keeps this hook
 * trivially auditable: one query, one slug, one row.
 *
 * Callers that need additional data (owner-scoped PII, joined detail
 * tables) layer those on top via separate queries — this hook only
 * owns the shared "anon-visible base + claim flags" load.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
   *  'self_listed', 'manual'). */
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

const SELECT_LIST = [
  "id",
  "name",
  "slug",
  "city",
  "state",
  "zip_code",
  "address",
  "phone",
  "website",
  "description",
  "facility_type",
  "gender_served",
  "bed_count",
  "featured",
  "verified",
  "year_established",
  "logo_url",
  "gallery_urls",
  "status",
  "updated_at",
  "accepts_international_patients",
  "data_source",
  "is_claimed",
  "is_pro",
  "is_premium_visible",
].join(",");

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
 * inside a useQuery in another component that needs to combine this
 * data with their own queries in a single fetch). Most callers should
 * use the `useFacilityBySlug` hook instead.
 */
export async function loadFacilityBySlug(
  slug: string,
): Promise<FacilityLoadResult> {
  const { data, error } = await supabase
    .from("public_facilities")
    .select(SELECT_LIST)
    .eq("slug", slug)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { facility: null, flags: null };

  const row = data as unknown as Record<string, unknown>;
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
