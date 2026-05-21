/**
 * Shared loader for the joined facility-detail tables.
 *
 * Both /center/[slug] (CenterProfile) and /account/facility/[id]
 * (SeekerFacilityProfile) previously ran the EXACT same Promise.all
 * against five anon-readable detail tables, then merged the results
 * into their respective query payloads. The duplication was harmless
 * but fragile — any new joined table needed two coordinated edits
 * and the column lists could drift.
 *
 * This module exposes:
 *   - `loadFacilityDetails(facilityId)` — the bare async loader
 *   - `FacilityDetailJoins` — typed shape of the joined rows
 *
 * The CALLER still owns the React Query call (so each page can
 * combine these joins with its own page-specific extras like
 * concierge flags or seeker prefill data inside a single queryFn).
 */
import { supabase } from "@/integrations/supabase/client";

export interface FacilityDetailJoins {
  facility_services: { service_name: string }[];
  facility_insurance: { insurance_name: string }[];
  facility_age_groups: { age_group: string }[];
  facility_credentials: { accreditations: string | null; licensing_info: string | null }[];
  facility_accreditations: { accreditation_type: string; verified: boolean | null }[];
}

/**
 * Fetch the five anon-readable join tables for one facility id in
 * parallel. Returns empty arrays for any failed query so the caller
 * can render cleanly without per-table error branches.
 *
 * The individual queries are tolerant: if any single fetch errors,
 * its array is empty in the returned object but the others still
 * resolve. This matches the existing pre-extraction behaviour where
 * `services.data ?? []` was used at each call site.
 */
export async function loadFacilityDetails(facilityId: string): Promise<FacilityDetailJoins> {
  const [services, insurance, ageGroups, credentials, accreditations] = await Promise.all([
    supabase.from("facility_services").select("service_name").eq("facility_id", facilityId),
    supabase.from("facility_insurance").select("insurance_name").eq("facility_id", facilityId),
    supabase.from("facility_age_groups").select("age_group").eq("facility_id", facilityId),
    supabase.from("facility_credentials").select("accreditations, licensing_info").eq("facility_id", facilityId),
    supabase.from("facility_accreditations").select("accreditation_type, verified").eq("facility_id", facilityId),
  ]);

  return {
    facility_services: (services.data as { service_name: string }[] | null) ?? [],
    facility_insurance: (insurance.data as { insurance_name: string }[] | null) ?? [],
    facility_age_groups: (ageGroups.data as { age_group: string }[] | null) ?? [],
    facility_credentials:
      (credentials.data as { accreditations: string | null; licensing_info: string | null }[] | null) ?? [],
    facility_accreditations:
      (accreditations.data as { accreditation_type: string; verified: boolean | null }[] | null) ?? [],
  };
}
