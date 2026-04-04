import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, CreditCard, Crown, MapPin, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FacilityShowcaseItem } from "./types";
import {
  formatFacilityType,
  getFacilityDescription,
  getFacilityDetailUrl,
  getFacilityHeroImage,
  getFacilityInitials,
  getFacilityLocationLabel,
  hasFacilityInsurance,
  isFacilityFeatured,
} from "./utils";

interface FacilityShowcaseCompactCardProps {
  facility: FacilityShowcaseItem;
}

export function FacilityShowcaseCompactCard({ facility }: FacilityShowcaseCompactCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const detailUrl = getFacilityDetailUrl(facility);
  const heroImage = getFacilityHeroImage(facility);
  const description = getFacilityDescription(facility);
  const acceptsInsurance = hasFacilityInsurance(facility);
  const isFeatured = isFacilityFeatured(facility);
  const facilityType = formatFacilityType(facility.facility_type);

  const handleCardClick = () => {
    navigate(detailUrl, { state: { fromSearch: true } });
  };

  const handleViewDetails = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(detailUrl, { state: { fromSearch: true } });
  };

  return (
    <article
      tabIndex={0}
      role="button"
      onClick={handleCardClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleCardClick();
        }
      }}
      aria-label={`View details for ${facility.name} in ${getFacilityLocationLabel(facility)}`}
      className={cn(
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.5rem] border bg-card shadow-card transition-all duration-300 sm:flex-row",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isFeatured ? "border-accent/25 ring-1 ring-accent/10" : "border-border/70 hover:border-primary/15",
      )}
    >
      <div className="relative h-40 overflow-hidden bg-muted sm:h-auto sm:w-[10.5rem] sm:shrink-0">
        {heroImage && !imageError ? (
          <img
            src={heroImage}
            alt={`${facility.name} treatment facility in ${getFacilityLocationLabel(facility)}`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <div className="flex h-14 w-14 items-center justify-center rounded-[1rem] bg-secondary text-muted-foreground">
              <Building2 className="h-7 w-7" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-foreground/15 to-transparent" />

        {isFeatured && (
          <div className="absolute left-3 top-3">
            <Badge className="border-0 bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-accent-foreground shadow-sm">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Featured
            </Badge>
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[0.95rem] border border-border/70 bg-card shadow-sm">
            {facility.logo_url && !logoError ? (
              <img
                src={facility.logo_url}
                alt=""
                className="h-full w-full object-cover"
                loading="lazy"
                decoding="async"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="font-display text-xs font-bold text-primary">{getFacilityInitials(facility.name)}</span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="font-display text-base font-bold leading-tight text-foreground line-clamp-2">
              {facility.name}
            </h3>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{getFacilityLocationLabel(facility)}</span>
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          {facility.googleRating ? (
            <>
              <span className="inline-flex items-center rounded-md bg-primary px-2 py-1 font-semibold text-primary-foreground">
                {facility.googleRating.toFixed(1)}
              </span>
              {facility.googleReviewCount ? (
                <span className="text-muted-foreground">({facility.googleReviewCount} Reviews)</span>
              ) : null}
            </>
          ) : null}

          {facility.verified && (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </span>
          )}

          {acceptsInsurance && (
            <span className="inline-flex items-center gap-1 font-medium text-accent">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              Accepts Insurance
            </span>
          )}

          {!facility.googleRating && facilityType && (
            <Badge
              variant="outline"
              className="rounded-full border-primary/10 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary"
            >
              {facilityType}
            </Badge>
          )}
        </div>

        <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-2">
          {description}
        </p>

        <div className="mt-auto pt-4">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleViewDetails}
            className="h-8 px-0 text-primary hover:bg-transparent hover:text-primary"
          >
            View Facility
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}