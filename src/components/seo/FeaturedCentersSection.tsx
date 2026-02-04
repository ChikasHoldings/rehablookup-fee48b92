import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin, Star, Shield, ChevronRight } from "lucide-react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  limit = 8,
  stateFilter,
  className,
  showViewAll = true,
}: FeaturedCentersSectionProps) {
  const { data: approvedFacilities = [] } = useStaticFacilities();

  const featuredCenters = useMemo(() => {
    let centers = [...treatmentCenters, ...approvedFacilities];
    
    // Filter by state if provided
    if (stateFilter) {
      centers = centers.filter(c => 
        c.state.toLowerCase() === stateFilter.toLowerCase()
      );
    }
    
    // Sort by featured status and rating
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

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {featuredCenters.map((center) => {
            const slug = (center as any).slug || center.id;
            const linkPath = (center as any).slug ? `/center/${slug}` : `/treatment-center/${center.id}`;
            
            return (
              <Link
                key={center.id}
                to={linkPath}
                className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/50 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground text-sm leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {center.name}
                  </h3>
                  {center.featured && (
                    <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5">
                      Featured
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate">{center.city}, {center.state}</span>
                </div>
                
                <div className="flex items-center gap-3 mt-auto pt-2 border-t border-border/50">
                  <div className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    <span className="text-xs font-medium">{center.rating.toFixed(1)}</span>
                  </div>
                  {(center as any).verified && (
                    <div className="flex items-center gap-1 text-emerald-600">
                      <Shield className="h-3.5 w-3.5" />
                      <span className="text-xs">Verified</span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
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
