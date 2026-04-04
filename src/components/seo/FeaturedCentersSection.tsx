import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, ChevronRight } from "lucide-react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FeaturedCentersSectionProps {
  title?: string;
  description?: string;
  limit?: number;
  stateFilter?: string;
  className?: string;
  showViewAll?: boolean;
}

export function FeaturedCentersSection({
  title = "Featured Treatment Centers",
  description = "Verified facilities with comprehensive addiction treatment programs",
  limit = 6,
  stateFilter,
  className,
  showViewAll = true,
}: FeaturedCentersSectionProps) {
  const { data: approvedFacilities = [] } = useStaticFacilities();

  const featuredCenters = useMemo(() => {
    let centers = [...treatmentCenters, ...approvedFacilities];
    
    if (stateFilter) {
      centers = centers.filter(c => 
        c.state.toLowerCase() === stateFilter.toLowerCase()
      );
    }
    
    return centers
      .sort((a, b) => {
        const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
        const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
        if (bFeatured !== aFeatured) return bFeatured - aFeatured;
        if (b.featured !== a.featured) return b.featured ? 1 : -1;
        return b.rating - a.rating;
      })
      .slice(0, limit);
  }, [approvedFacilities, stateFilter, limit]);

  if (featuredCenters.length === 0) return null;

  return (
    <section className={cn("py-10 md:py-14", className)}>
      <div className="container">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {title}
            </h2>
            {description && (
              <p className="text-sm text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          {showViewAll && (
            <Link 
              to="/rehab-centers" 
              className="hidden sm:flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View All Centers
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {featuredCenters.map((center) => (
            <TreatmentCenterCard
              key={center.id}
              center={center}
              featured={center.featured}
            />
          ))}
        </div>

        {showViewAll && (
          <div className="mt-6 text-center sm:hidden">
            <Link to="/rehab-centers">
              <Button variant="outline" size="sm" className="gap-2">
                View All Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
