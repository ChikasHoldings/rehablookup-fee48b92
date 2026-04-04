import type { FacilityShowcaseItem } from "./types";

function toDisplayLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getFacilityInitials(name: string): string {
  const words = name.trim().split(/\s+/);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }

  return name.slice(0, 2).toUpperCase();
}

export function getFacilityDetailUrl(facility: FacilityShowcaseItem): string {
  return facility.isFromDatabase && facility.slug
    ? `/center/${facility.slug}`
    : `/rehab-centers/${facility.id}`;
}

export function getFacilityHeroImage(facility: FacilityShowcaseItem): string | null {
  return facility.gallery_urls?.[0] || facility.image || null;
}

export function getFacilityLocationLabel(facility: FacilityShowcaseItem): string {
  return `${facility.city}, ${facility.state}`;
}

export function formatFacilityType(type?: string | null): string | null {
  if (!type) return null;
  return toDisplayLabel(type);
}

export function getFacilityYearsInBusiness(yearEstablished?: number | null): number | null {
  if (!yearEstablished) return null;

  const years = new Date().getFullYear() - yearEstablished;
  return years > 0 ? years : null;
}

export function getFacilityTags(facility: FacilityShowcaseItem): string[] {
  if (facility.treatmentTypes?.length) {
    return facility.treatmentTypes
      .map((tag) => toDisplayLabel(tag))
      .filter(Boolean)
      .slice(0, 4);
  }

  const facilityType = formatFacilityType(facility.facility_type);
  return facilityType ? [facilityType] : [];
}

export function getFacilityDescription(facility: FacilityShowcaseItem): string {
  const description = facility.description?.replace(/\s+/g, " ").trim();

  if (description) {
    return description;
  }

  const facilityType = formatFacilityType(facility.facility_type);

  if (facilityType) {
    return `${facility.name} provides ${facilityType.toLowerCase()} support in ${facility.city}, ${facility.state}.`;
  }

  return `Explore programs, admissions details, and treatment support at ${facility.name}.`;
}

export function hasFacilityInsurance(facility: FacilityShowcaseItem): boolean {
  return Boolean(facility.insuranceAccepted?.length);
}

export function isFacilityFeatured(facility: FacilityShowcaseItem): boolean {
  return Boolean(facility.hasFeaturedSubscription || facility.featured);
}