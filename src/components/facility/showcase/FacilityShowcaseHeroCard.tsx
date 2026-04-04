import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Building2, Clock3, CreditCard, Crown, Heart, MapPin, ShieldCheck } from "lucide-react";
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
  getFacilityTags,
  getFacilityYearsInBusiness,
  hasFacilityInsurance,
  isFacilityFeatured,
} from "./utils";

interface FacilityShowcaseHeroCardProps {
  facility: FacilityShowcaseItem;
}

export function FacilityShowcaseHeroCard({ facility }: FacilityShowcaseHeroCardProps) {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const detailUrl = getFacilityDetailUrl(facility);
  const heroImage = getFacilityHeroImage(facility);
  const tags = getFacilityTags(facility);
  const description = getFacilityDescription(facility);
  const yearsInBusiness = getFacilityYearsInBusiness(facility.year_established);
  const acceptsInsurance = hasFacilityInsurance(facility);
  const isFeatured = isFacilityFeatured(facility);
  const facilityType = formatFacilityType(facility.facility_type);

  const handleCardClick = () => {
    navigate(detailUrl, { state: { fromSearch: true } });
  };

  const handlePrimaryAction = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    navigate(detailUrl, { state: { fromSearch: true, openContactForm: true } });
  };

  const handleSecondaryAction = (event: React.MouseEvent<HTMLButtonElement>) => {
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
        "group flex h-full cursor-pointer flex-col overflow-hidden rounded-[1.75rem] border bg-card shadow-card transition-all duration-300",
        "hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        isFeatured ? "border-accent/30 ring-1 ring-accent/10" : "border-border/70 hover:border-primary/20",
      )}
    >
      <div className="relative h-56 overflow-hidden bg-muted sm:h-64 xl:h-[18rem]">
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
            <div className="flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-secondary text-muted-foreground">
              <Building2 className="h-8 w-8" aria-hidden="true" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-foreground/20 to-transparent" />

        <div className="absolute left-4 top-4 flex flex-wrap items-center gap-2">
          {isFeatured && (
            <Badge className="border-0 bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-accent-foreground shadow-sm">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Featured
            </Badge>
          )}
          {facility.verified && (
            <Badge className="border-0 bg-success/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-success-foreground shadow-sm">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Verified
            </Badge>
          )}
        </div>

        <div className="absolute bottom-0 left-5 flex h-14 w-14 translate-y-1/2 items-center justify-center overflow-hidden rounded-[1.15rem] border border-border/70 bg-card shadow-md">
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
            <span className="font-display text-sm font-bold text-primary">{getFacilityInitials(facility.name)}</span>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col px-5 pb-5 pt-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h3 className="font-display text-xl font-bold leading-tight text-foreground line-clamp-2 md:text-[1.625rem]">
              {facility.name}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <span className="truncate">{getFacilityLocationLabel(facility)}</span>
            </div>
          </div>

          {facilityType && (
            <Badge
              variant="outline"
              className="w-fit rounded-full border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary"
            >
              {facilityType}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {facility.verified && (
            <Badge className="border border-success/15 bg-success/10 px-3 py-1 text-[11px] font-semibold text-success">
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Verified
            </Badge>
          )}
          {yearsInBusiness && (
            <Badge className="border border-primary/10 bg-primary/5 px-3 py-1 text-[11px] font-semibold text-primary">
              <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
              {yearsInBusiness}+ Years in business
            </Badge>
          )}
          {acceptsInsurance && (
            <Badge className="border border-accent/15 bg-accent/10 px-3 py-1 text-[11px] font-semibold text-accent">
              <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />
              Accepts Insurance
            </Badge>
          )}
        </div>

        {tags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="rounded-full border-border/70 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground"
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <p className="mt-4 text-sm leading-6 text-muted-foreground line-clamp-4">
          {description}
        </p>

        <div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
          <Button type="button" size="lg" onClick={handlePrimaryAction} className="w-full sm:flex-1">
            <Heart className="h-4 w-4" aria-hidden="true" />
            Check Availability
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleSecondaryAction}
            className="w-full sm:w-auto sm:px-5"
          >
            View Details
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </article>
  );
}