/** Type declarations for facilityTruth.mjs (signatures only; no logic). */

export interface FacilityProvenanceInput {
  is_claimed?: boolean | null;
  data_source?: string | null;
}

export type FacilityProvenance = "provider" | "government_directory" | "staff_entered";

export declare const SAMHSA_SNAPSHOT_LABEL: string;
export declare function facilityProvenance(facility: FacilityProvenanceInput | null | undefined): FacilityProvenance;
export declare function provenanceNotice(facility: FacilityProvenanceInput | null | undefined): string;
export declare function credentialSourceLabel(facility: FacilityProvenanceInput | null | undefined): string;
export declare function presentListingDescription(description: string | null | undefined): string;
export declare function credentialFaqAnswer(
  name: string,
  credentials: string[],
  facility: FacilityProvenanceInput | null | undefined,
): string;

export interface FacilitySchemaFacts {
  hoursOfOperation?: string | null;
  acceptingAdmissions?: boolean | null;
  editorialReview?: boolean;
}
export declare function findFacilitySchemaViolations(
  node: Record<string, unknown> | null | undefined,
  facts?: FacilitySchemaFacts,
): string[];
