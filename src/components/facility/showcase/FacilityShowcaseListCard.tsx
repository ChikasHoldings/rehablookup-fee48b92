import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Crown, MapPin, ShieldCheck, CreditCard, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FacilityShowcaseItem } from "./types";
import {
  getFacilityDetailUrl,
  getFacilityHeroImage,
  getFacilityInitials,
  getFacilityLocationLabel,
  hasFacilityInsurance,
  isFacilityFeatured,
} from "./utils";

interface Props {
  facility: FacilityShowcaseItem;
}

export function FacilityShowcaseListCard({ facility }: Props) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  const detailUrl = getFacilityDetailUrl(facility);
  const heroImage = getFacilityHeroImage(facility);
  const isFeatured = isFacilityFeatured(facility);
  const acceptsInsurance = hasFacilityInsurance(facility);

  const handleClick = () => navigate(detailUrl, { state: { fromSearch: true } });

  return (
    <article
      tabIndex={0}
      role="link"
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleClick(); }
      }}
      aria-label={`View ${facility.name} in ${getFacilityLocationLabel(facility)}`}
      className={cn(
        "group flex cursor-pointer gap-0 overflow-hidden rounded-2xl border bg-card transition-all duration-200",
        "hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isFeatured ? "border-accent/25 ring-1 ring-accent/10" : "border-border/60",
      )}
    >
      {/* Thumbnail */}
      <div className="relative h-auto w-[7.5rem] shrink-0 overflow-hidden bg-muted sm:w-[10rem] md:w-[13rem]">
        {heroImage && !imageError ? (
          <img
            src={heroImage}
            alt={`${facility.name} facility`}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-muted to-background">
            <Building2 className="h-8 w-8 text-muted-foreground/30" />
          </div>
        )}

        {isFeatured && (
          <div className="absolute right-2 top-2">
            <Badge className="border-0 bg-accent px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent-foreground shadow-sm">
              <Crown className="h-2.5 w-2.5" />
              Featured
            </Badge>
          </div>
        )}
      </div>

      {/* Details */}
      <div className="flex min-w-0 flex-1 flex-col justify-center px-4 py-3 sm:py-4">
        <h3 className="font-display text-sm font-bold leading-snug text-foreground line-clamp-1 sm:text-base md:text-lg">
          {facility.name}
        </h3>

        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground sm:text-sm">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
          <span className="truncate">{getFacilityLocationLabel(facility)}</span>
        </div>

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs sm:mt-2.5">
          {facility.googleRating ? (
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center rounded-md bg-primary px-1.5 py-0.5 text-[11px] font-bold text-primary-foreground">
                {facility.googleRating.toFixed(1)}
              </span>
              {facility.googleReviewCount ? (
                <span className="text-muted-foreground">({facility.googleReviewCount} Reviews)</span>
              ) : null}
            </div>
          ) : null}

          {facility.verified && (
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified
            </span>
          )}

          {acceptsInsurance && (
            <span className="inline-flex items-center gap-1 font-medium text-accent">
              <CreditCard className="h-3.5 w-3.5" />
              Accepts Insurance
            </span>
          )}
        </div>

        {/* View link */}
        <div className="mt-2 hidden items-center gap-1 text-xs font-semibold text-primary opacity-0 transition-opacity group-hover:opacity-100 sm:flex">
          View Details <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </div>
    </article>
  );
}