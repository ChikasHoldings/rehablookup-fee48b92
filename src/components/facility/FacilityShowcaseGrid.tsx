import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { FacilityShowcaseCompactCard } from "@/components/facility/showcase/FacilityShowcaseCompactCard";
import { FacilityShowcaseHeroCard } from "@/components/facility/showcase/FacilityShowcaseHeroCard";
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

  const heroFacility = displayFacilities[0];
  const supportingFacilities = displayFacilities.slice(1, 3);
  const remainingFacilities = displayFacilities.slice(3);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-b from-card to-background/80 p-4 shadow-card sm:p-5 lg:p-6",
        className,
      )}
    >
      {(title || subtitle || viewAllHref) && (
        <div className="mb-5 flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-display text-2xl font-bold tracking-tight text-foreground md:text-[2rem]">
                {title}
              </h2>
            ) : null}
            {subtitle ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground md:text-base">{subtitle}</p>
            ) : null}
          </div>

          {viewAllHref ? (
            <Button asChild variant="ghost" size="sm" className="w-fit gap-1.5 px-0 text-primary hover:bg-transparent hover:text-primary">
              <Link to={viewAllHref}>
                {viewAllLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(19rem,0.95fr)] xl:items-stretch">
        <div className="min-w-0">
          <FacilityShowcaseHeroCard facility={heroFacility} />
        </div>

        {supportingFacilities.length > 0 ? (
          <div className="grid gap-4 auto-rows-fr">
            {supportingFacilities.map((facility) => (
              <FacilityShowcaseCompactCard key={facility.id} facility={facility} />
            ))}
          </div>
        ) : null}
      </div>

      {remainingFacilities.length > 0 ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {remainingFacilities.map((facility) => (
            <FacilityShowcaseCompactCard key={facility.id} facility={facility} />
          ))}
        </div>
      ) : null}
    </section>
  );
}
