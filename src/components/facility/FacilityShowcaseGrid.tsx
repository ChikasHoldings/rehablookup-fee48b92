import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FacilityShowcaseListCard } from "@/components/facility/showcase/FacilityShowcaseListCard";
import type { FacilityShowcaseItem } from "@/components/facility/showcase/types";
import { isFacilityFeatured } from "@/components/facility/showcase/utils";

interface FacilityShowcaseGridProps {
  facilities: FacilityShowcaseItem[];
  title?: string;
  subtitle?: string;
  viewAllHref?: string;
  viewAllLabel?: string;
  className?: string;
  maxItems?: number;
}

export function FacilityShowcaseGrid({
  facilities,
  title,
  subtitle,
  viewAllHref,
  viewAllLabel = "View All",
  className,
  maxItems = 8,
}: FacilityShowcaseGridProps) {
  if (facilities.length === 0) return null;

  const displayFacilities = [...facilities]
    .sort((a, b) => Number(isFacilityFeatured(b)) - Number(isFacilityFeatured(a)))
    .slice(0, maxItems);

  return (
    <section className={cn("space-y-4", className)}>
      {(title || subtitle || viewAllHref) && (
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title && (
              <h2 className="font-display text-xl font-bold tracking-tight text-foreground md:text-2xl">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {viewAllHref && (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-fit gap-1.5 px-0 text-primary hover:bg-transparent hover:text-primary"
            >
              <Link to={viewAllHref}>
                {viewAllLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {displayFacilities.map((facility) => (
          <FacilityShowcaseListCard key={facility.id} facility={facility} />
        ))}
      </div>
    </section>
  );
}
