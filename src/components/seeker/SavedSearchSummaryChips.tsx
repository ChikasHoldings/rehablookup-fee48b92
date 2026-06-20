import { Badge } from "@/components/ui/badge";

/**
 * Renders a saved search's filter criteria as chips.
 *
 * Two producers persist saved-search criteria with DIFFERENT key shapes:
 *  - public SearchResults: { location, state, treatmentTypes, treatment,
 *      insuranceTypes, insurance, amenities, distance, verified, featuredOnly, q }
 *  - in-panel SeekerSearch: { q, loc, t, ft, ins, g, v, sort }
 *
 * This component understands BOTH so a search saved from inside the account
 * panel renders its real filters instead of falsely showing "no filters".
 */
export function SummaryChips({ criteria }: { criteria: Record<string, unknown> }) {
  const chips: { label: string; value: string }[] = [];
  const asArray = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && !!x) : [];
  const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

  // Free-text query (shared key `q`)
  if (str(criteria.q)) chips.push({ label: "Search", value: str(criteria.q)! });

  // Location
  const loc = str(criteria.location) ?? str(criteria.loc);
  if (loc) chips.push({ label: "Where", value: loc });
  if (str(criteria.state)) chips.push({ label: "State", value: str(criteria.state)! });

  // Treatment types
  const treatment = [...asArray(criteria.treatmentTypes), ...asArray(criteria.t)];
  if (str(criteria.treatment)) treatment.push(str(criteria.treatment)!);
  if (treatment.length) chips.push({ label: "Treatment", value: treatment.join(", ") });

  // Facility type (in-panel only)
  const facilityTypes = asArray(criteria.ft);
  if (facilityTypes.length) chips.push({ label: "Facility type", value: facilityTypes.join(", ") });

  // Insurance
  const insurance = [...asArray(criteria.insuranceTypes), ...asArray(criteria.ins)];
  if (str(criteria.insurance)) insurance.push(str(criteria.insurance)!);
  if (insurance.length) chips.push({ label: "Insurance", value: insurance.join(", ") });

  // Gender (in-panel only)
  const genders = asArray(criteria.g);
  if (genders.length) chips.push({ label: "Gender", value: genders.join(", ") });

  // Amenities (public only)
  const amenities = asArray(criteria.amenities);
  if (amenities.length) chips.push({ label: "Amenities", value: amenities.join(", ") });

  // Distance (public only)
  if (str(criteria.distance)) chips.push({ label: "Distance", value: `${str(criteria.distance)} mi` });

  // Verified-only (`verified` public / `v` in-panel)
  if (criteria.verified || criteria.v) chips.push({ label: "Verified only", value: "Yes" });

  // Featured-only (public only)
  if (criteria.featuredOnly) chips.push({ label: "Featured", value: "Yes" });

  if (chips.length === 0) {
    return <p className="text-xs text-muted-foreground italic">All facilities (no filters)</p>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <Badge key={`${c.label}:${c.value}`} variant="secondary" className="text-[11px] font-medium">
          <span className="text-muted-foreground mr-1">{c.label}:</span>
          {c.value}
        </Badge>
      ))}
    </div>
  );
}
