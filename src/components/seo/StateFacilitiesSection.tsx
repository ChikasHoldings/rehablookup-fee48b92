import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Skeleton } from "@/components/ui/skeleton";

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

    // Optional treatment type filter
    if (treatmentFilter?.length) {
      const filterLower = treatmentFilter.map((t) => t.toLowerCase());
      const withMatch = filtered.filter((f) =>
        f.treatmentTypes?.some((t) =>
          filterLower.some((ft) => t.toLowerCase().includes(ft))
        )
      );
      // If filter yields results, use them; otherwise show all state facilities
      if (withMatch.length > 0) filtered = withMatch;
    }

    return filtered
      .sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return 0;
      })
      .slice(0, 12);
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {[1,2,3].map(i => <Skeleton key={i} className="h-64 rounded-xl" />)}
          </div>
        ) : facilities.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
            {facilities.map((facility) => (
              <TreatmentCenterCard
                key={facility.id}
                center={facility}
                featured={facility.featured}
                variant="compact"
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border bg-card max-w-2xl mx-auto">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Treatment Centers Coming Soon
            </h3>
            <p className="text-muted-foreground mb-2">
              We're actively partnering with accredited facilities in {stateName}. Our concierge team can match you with nearby verified programs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
              <Button asChild variant="default">
                <Link to="/concierge">Get Matched Now</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/rehab-centers">Browse Nationwide</Link>
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
