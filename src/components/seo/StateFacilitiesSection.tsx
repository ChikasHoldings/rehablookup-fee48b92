import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
// Use the same SearchResultCard as /search-results so the listing
// design on the state/city SEO pages matches the canonical card
// design seekers see everywhere else. Previously this section used
// `TreatmentCenterCard variant="compact"` in a 3-column grid — a
// different visual treatment that broke cross-page consistency.
import { SearchResultCard } from "@/components/cards/SearchResultCard";
import { SearchResultCardSkeleton } from "@/components/skeletons/SearchResultSkeleton";
import {
  TREATMENT_FILTERS,
  matchesTreatmentFilter,
  asSearchableFacility,
} from "@/lib/searchFilters";

interface StateFacilitiesSectionProps {
  stateName: string;
  stateSlug: string;
  abbreviation: string;
  /** Optional filter — only show facilities matching these treatment types */
  treatmentFilter?: string[];
  /** Section heading override */
  heading?: string;
  /** Subheading override */
  subheading?: string;
}

export function StateFacilitiesSection({
  stateName,
  stateSlug,
  abbreviation,
  treatmentFilter,
  heading,
  subheading,
}: StateFacilitiesSectionProps) {
  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const facilities = useMemo(() => {
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    const stateLower = stateName.toLowerCase();

    let filtered = allFacilities.filter(
      (f) => f.state.toLowerCase() === stateLower
    );

    // Optional treatment type filter. Callers pass a mix of canonical filter
    // values ("detox", "inpatient") and raw substring keywords ("IOP",
    // "withdrawal", "opioid"). Test each entry against the canonical matcher
    // first — that captures the services → facility_type → description
    // fallback chain, so "inpatient" surfaces the 44 facility_type=
    // 'Residential Treatment Center' rows that the old substring match
    // missed. Unknown entries fall back to a normalized substring search
    // across services + facility_type + description so condition/substance
    // keywords (drug, opioid, etc.) keep working.
    if (treatmentFilter?.length) {
      const canonicalValues = new Set(TREATMENT_FILTERS.map((o) => o.value));
      const matchEntry = (entry: string, f: typeof allFacilities[number]): boolean => {
        const key = entry.toLowerCase().trim();
        if (canonicalValues.has(key)) {
          return matchesTreatmentFilter(asSearchableFacility(f), key);
        }
        const needle = key.replace(/\s+/g, "");
        const haystack = [
          ...(f.treatmentTypes ?? []),
          f.facilityType ?? "",
          f.description ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .replace(/\s+/g, "");
        return needle.length > 0 && haystack.includes(needle);
      };
      const withMatch = filtered.filter((f) =>
        treatmentFilter.some((entry) => matchEntry(entry, f)),
      );
      // If filter yields results, use them; otherwise show all state facilities
      // (preserves the existing "graceful degradation" UX so a niche
      // city/treatment combo doesn't render an empty state).
      if (withMatch.length > 0) filtered = withMatch;
    }

    return filtered
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
      // 8 cards in a list view is a comfortable above-the-fold-ish
      // length; was 12 in a 3-col grid (4 rows). The 33% reduction
      // keeps the section from becoming a long scroll while still
      // showing meaningful selection. CTA to /rehab-centers/<state>
      // below the list opens the full directory.
      .slice(0, 8);
  }, [approvedFacilities, stateName, treatmentFilter]);

  return (
    <section className="py-12 bg-muted/30">
      <div className="container">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-3">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              {isLoading ? "Loading..." : `${facilities.length} Treatment Centers`}
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            {heading || `Treatment Centers in ${stateName}`}
          </h2>
          <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
            {subheading ||
              `Browse verified rehab facilities in ${stateName}. Each center is checked for licensing, accreditation, and quality of care.`}
          </p>
        </div>

        {isLoading ? (
          // Vertical list of full-width SearchResultCard skeletons
          // matches the live list below, no layout shift on hydration.
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {[1, 2, 3].map((i) => <SearchResultCardSkeleton key={i} />)}
          </div>
        ) : facilities.length > 0 ? (
          // Vertical list layout (matches /search-results) — each
          // SearchResultCard is horizontal on desktop (image left,
          // content right) and stacks vertically internally on mobile.
          // max-w-5xl gives the cards room to breathe without going
          // edge-to-edge on large displays.
          <div className="flex flex-col gap-4 max-w-5xl mx-auto">
            {facilities.map((facility) => (
              <SearchResultCard
                key={facility.id}
                center={facility}
                featured={facility.featured}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border bg-card max-w-2xl mx-auto">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Talk to a Placement Advisor in {stateName}
            </h3>
            <p className="text-muted-foreground mb-2">
              Our licensed placement advisors will personally match you with verified centers in {stateName} or nearby states — typically within 24 hours.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Button asChild variant="default">
                <Link to="/concierge/intake">Get Matched Now</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/search-results">Browse Nationwide</Link>
              </Button>
            </div>
          </div>
        )}

        {facilities.length > 0 && (
          <div className="text-center mt-8">
            <Button asChild variant="outline" size="lg">
              <Link to={`/rehab-centers/${stateSlug}`}>
                View All {stateName} Centers
                <ArrowRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
