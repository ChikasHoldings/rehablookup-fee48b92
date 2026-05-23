import residence from "@/assets/facility-placeholders/01-residence.svg";
import clinic from "@/assets/facility-placeholders/02-clinic.svg";
import hospital from "@/assets/facility-placeholders/03-hospital.svg";
import retreat from "@/assets/facility-placeholders/04-retreat.svg";
import brownstone from "@/assets/facility-placeholders/05-brownstone.svg";
import campus from "@/assets/facility-placeholders/06-campus.svg";
import bungalow from "@/assets/facility-placeholders/07-bungalow.svg";
import midcentury from "@/assets/facility-placeholders/08-midcentury.svg";
import colonial from "@/assets/facility-placeholders/09-colonial.svg";
import villa from "@/assets/facility-placeholders/10-villa.svg";
import lakeside from "@/assets/facility-placeholders/11-lakeside.svg";
import mountain from "@/assets/facility-placeholders/12-mountain.svg";
import victorian from "@/assets/facility-placeholders/13-victorian.svg";
import glass from "@/assets/facility-placeholders/14-glass.svg";
import ranch from "@/assets/facility-placeholders/15-ranch.svg";
import adobe from "@/assets/facility-placeholders/16-adobe.svg";
import loft from "@/assets/facility-placeholders/17-loft.svg";
import coastal from "@/assets/facility-placeholders/18-coastal.svg";

/**
 * Facility placeholder illustrations.
 *
 * 18 hand-drawn SVG building variants generated alongside the brand
 * (see docs/uploads — preview HTML preserved with the original
 * generation prompt). Each illustration uses
 * `preserveAspectRatio="xMidYMid slice"` on a 1600×1200 viewBox so the
 * same SVG crops center cleanly at 4:3 (directory cards), 16:9
 * (detail-page hero), 1:1 (OG / social square) without distortion.
 *
 * Replaced the single `facility-placeholder.webp` that all directory
 * cards used to share — the visual repetition on /search-results
 * (every facility without a photo looked identical) made the
 * directory feel thin. With 18 variants the gallery now reads as a
 * diverse network even before any provider uploads photos.
 *
 * Assignment is DETERMINISTIC per facility ID — same facility always
 * gets the same illustration so the seeker doesn't see the building
 * change between page loads, but different facilities are spread
 * across all 18 variants via a stable hash.
 */

const VARIANTS = [
  residence,    // 01 — two-story residential
  clinic,       // 02 — single-story outpatient clinic
  hospital,     // 03 — multi-wing hospital campus
  retreat,      // 04 — wellness retreat in nature
  brownstone,   // 05 — urban brownstone row
  campus,       // 06 — multi-building campus
  bungalow,     // 07 — single-story bungalow
  midcentury,   // 08 — mid-century modern
  colonial,     // 09 — colonial-style with columns
  villa,        // 10 — Mediterranean villa
  lakeside,     // 11 — lakeside retreat
  mountain,     // 12 — mountain lodge
  victorian,    // 13 — Victorian-era home
  glass,        // 14 — modern glass facade
  ranch,        // 15 — ranch-style spread
  adobe,        // 16 — Southwestern adobe
  loft,         // 17 — industrial loft conversion
  coastal,      // 18 — coastal beach house
] as const;

const VARIANT_NAMES = [
  "residence","clinic","hospital","retreat","brownstone","campus",
  "bungalow","midcentury","colonial","villa","lakeside","mountain",
  "victorian","glass","ranch","adobe","loft","coastal",
] as const;

export type FacilityPlaceholderVariantName = (typeof VARIANT_NAMES)[number];

/**
 * 32-bit FNV-1a hash. Tiny, zero-dep, distributes UUID-shaped strings
 * uniformly across small modulus values (much better than a naive
 * sum-of-char-codes which collides badly across UUIDs that differ
 * only in the trailing hex segment).
 */
function stableHash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/**
 * Loose facility shape — anything with an `id` works. We accept
 * a wide union because the placeholder is used from cards in many
 * contexts (TreatmentCenter, public_facilities row, FacilityCardData,
 * etc.). Only `id` is load-bearing; `facility_type` is optional and
 * not currently consumed (kept on the signature for future
 * type-aware overrides).
 */
export interface FacilityForPlaceholder {
  id?: string | number | null;
  facility_type?: string | null;
}

/**
 * Deterministic placeholder URL for a facility. Same `id` always
 * resolves to the same illustration; different IDs are spread
 * across the 18 variants by FNV-1a.
 *
 * Returns the first variant ("residence") when no usable id is
 * present so the call site never gets `undefined`.
 */
export function getFacilityPlaceholder(facility: FacilityForPlaceholder | null | undefined): string {
  if (!facility) return VARIANTS[0];
  const idStr = facility.id == null ? "" : String(facility.id);
  if (!idStr) return VARIANTS[0];
  return VARIANTS[stableHash(idStr) % VARIANTS.length];
}

/**
 * Surface the resolved variant NAME for callers that want to emit
 * it in alt-text or analytics. Not currently used in production but
 * exposed so debugging/QA can sanity-check distribution.
 */
export function getFacilityPlaceholderVariant(facility: FacilityForPlaceholder | null | undefined): FacilityPlaceholderVariantName {
  if (!facility) return VARIANT_NAMES[0];
  const idStr = facility.id == null ? "" : String(facility.id);
  if (!idStr) return VARIANT_NAMES[0];
  return VARIANT_NAMES[stableHash(idStr) % VARIANT_NAMES.length];
}

export { VARIANTS as FACILITY_PLACEHOLDER_VARIANTS };
