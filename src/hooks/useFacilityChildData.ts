/**
 * useFacilityChildData
 * ────────────────────
 * Batched lookup of facility_services / facility_insurance /
 * facility_age_groups / facility_accreditations for a list of facility IDs.
 *
 * Used by directory pages (State / City / County / Treatment-type /
 * Insurance / Homepage featured) so each page does 4 IN-list queries
 * total instead of 4×N (services + insurance + age + accreditations
 * for each card). For a 25-card page, that's 4 round-trips vs 100.
 *
 * Returns four Maps keyed by facility_id; pass the relevant array
 * down to FacilityCard via `services`, `insurance`, etc. props.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ServiceRow { facility_id: string; service_name: string }
interface InsuranceRow { facility_id: string; insurance_name: string }
interface AgeGroupRow { facility_id: string; age_group: string }
interface AccreditationRow { facility_id: string; accreditation_type: string }

export interface FacilityChildData {
  services: Map<string, string[]>;
  insurance: Map<string, string[]>;
  ageGroups: Map<string, string[]>;
  accreditations: Map<string, string[]>;
}

const EMPTY: FacilityChildData = {
  services: new Map(),
  insurance: new Map(),
  ageGroups: new Map(),
  accreditations: new Map(),
};

function bucket<T extends { facility_id: string }>(rows: T[] | null, fieldName: keyof T): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const row of rows ?? []) {
    const arr = map.get(row.facility_id) ?? [];
    arr.push(String(row[fieldName]));
    map.set(row.facility_id, arr);
  }
  return map;
}

export function useFacilityChildData(facilityIds: string[]) {
  // Stable cache key — sort to avoid spurious refetches when the
  // parent re-renders with a reordered list.
  const sortedKey = [...facilityIds].sort();

  return useQuery({
    queryKey: ["facility-card-children", sortedKey],
    enabled: facilityIds.length > 0,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async (): Promise<FacilityChildData> => {
      if (facilityIds.length === 0) return EMPTY;
      const [svc, ins, age, acc] = await Promise.all([
        supabase.from("facility_services").select("facility_id, service_name").in("facility_id", facilityIds),
        supabase.from("facility_insurance").select("facility_id, insurance_name").in("facility_id", facilityIds),
        supabase.from("facility_age_groups").select("facility_id, age_group").in("facility_id", facilityIds),
        supabase.from("facility_accreditations").select("facility_id, accreditation_type").in("facility_id", facilityIds),
      ]);
      return {
        services: bucket<ServiceRow>(svc.data as ServiceRow[] | null, "service_name"),
        insurance: bucket<InsuranceRow>(ins.data as InsuranceRow[] | null, "insurance_name"),
        ageGroups: bucket<AgeGroupRow>(age.data as AgeGroupRow[] | null, "age_group"),
        accreditations: bucket<AccreditationRow>(acc.data as AccreditationRow[] | null, "accreditation_type"),
      };
    },
  });
}
