import { useState, forwardRef } from "react";
import { Link, useLocation } from "react-router-dom";
import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { 
  MapPin, 
  Shield, 
  Building2, 
  Heart, 
  ArrowRight, 
  Clock,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingBadge } from "@/components/ui/RatingBadge";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";
import { PlanTier } from "@/lib/facilityPlanSort";
import { useFacilityRating } from "@/hooks/useFacilityRating";

export interface FacilityCardData {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string | null;
  slug: string | null;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  verified: boolean | null;
  year_established: number | null;
  // Plan tier for display
  planTier?: PlanTier;
  featured?: boolean;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

interface FacilityCardProps {
  facility: FacilityCardData;
  onRemove?: (id: string) => void;
  showRemoveButton?: boolean;
}

export const FacilityCard = forwardRef<HTMLElement, FacilityCardProps>(
  function FacilityCard({ facility, onRemove, showRemoveButton = false }, ref) {
    const { toggleFavorite, isFavorite } = useFavorites();
    const location = useLocation();
    const [logoError, setLogoError] = useState(false);
    const [heroError, setHeroError] = useState(false);
    const { averageRating, reviewCount } = useFacilityRating(facility.id);

    const initials = getInitials(facility.name);
    const hasLogo = facility.logo_url && !logoError;
    const heroImage = facility.gallery_urls?.[0];
    const hasHeroImage = heroImage && !heroError;
    const yearsInBusiness = facility.year_established 
      ? new Date().getFullYear() - facility.year_established 
      : null;
    
    // Determine plan tier for badge display (supports both new and legacy values)
    // Pro check - simplified to Pro/Free model
    const isPro = facility.planTier === 'pro' || facility.featured;

    // Determine if we're in the seeker account area
    const isInSeekerAccount = location.pathname.startsWith('/account');
    const facilityLink = isInSeekerAccount 
      ? `/account/facility/${facility.slug || facility.id}`
      : facility.slug ? `/center/${facility.slug}` : `/center/${facility.id}`;

    const handleFavoriteClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (showRemoveButton && onRemove) {
        onRemove(facility.id);
      } else {
        toggleFavorite(facility.id);
      }
    };

    return (
      <article ref={ref} className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:min-h-[140px]">
          {/* Image Section - Compact on mobile */}
          <div className="relative w-full sm:w-36 lg:w-44 shrink-0 overflow-hidden bg-muted">
            <div className="h-28 sm:h-full w-full relative">
              {hasHeroImage ? (
                <>
                  <img 
                    src={heroImage}
                    alt={`${facility.name} facility`}
                    className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    loading="lazy"
                    onError={() => setHeroError(true)}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10">
                  <div className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 border border-primary/20 shadow-sm">
                    <span className="font-display text-lg sm:text-xl font-bold text-primary/70">
                      {initials}
                    </span>
                  </div>
                </div>
              )}
              
              {/* Top-right icons: Favorite + Years */}
              <div className="absolute top-1.5 right-1.5 z-10 flex flex-col items-end gap-1">
                {/* Favorite button */}
                <button
                  onClick={handleFavoriteClick}
                  className={cn(
                    "transition-all duration-200 p-1",
                    showRemoveButton
                      ? "text-rose-500 hover:text-rose-600"
                      : isFavorite(facility.id)
                        ? "text-rose-500"
                        : "text-white/80 hover:text-rose-500 drop-shadow-md"
                  )}
                  aria-label={showRemoveButton ? "Remove from saved" : isFavorite(facility.id) ? "Remove from favorites" : "Add to favorites"}
                >
                  <Heart className={cn("h-5 w-5", (showRemoveButton || isFavorite(facility.id)) && "fill-current")} />
                </button>

                {/* Years badge */}
                {yearsInBusiness && yearsInBusiness > 0 && (
                  <div className="flex items-center gap-0.5 bg-white/95 backdrop-blur-sm rounded px-1 py-0.5 shadow-sm">
                    <Clock className="h-2 w-2 text-blue-600" />
                    <span className="text-[8px] font-semibold text-blue-700">{yearsInBusiness}+ yrs</span>
                  </div>
                )}
              </div>

              {/* Logo overlay */}
              <div className="absolute bottom-1.5 left-1.5 z-10">
                <div className="h-7 w-7 sm:h-8 sm:w-8 shrink-0 overflow-hidden rounded-md border-2 border-white bg-card shadow-md">
                  {hasLogo ? (
                    <img 
                      src={facility.logo_url!}
                      alt={`${facility.name} logo`}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                      onError={() => setLogoError(true)}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <span className="font-display text-[10px] font-bold text-primary">
                        {initials}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex flex-1 flex-col p-2.5 sm:p-3 min-w-0">
            {/* Header row */}
            <div className="flex items-start gap-2 mb-1.5">
              <div className="flex-1 min-w-0">
                <Link to={facilityLink}>
                  <h3 className="font-display text-[13px] sm:text-sm font-bold leading-tight truncate mb-0.5 group-hover:text-primary transition-colors">
                    {facility.name}
                  </h3>
                </Link>
                <div className="flex items-center gap-1 text-[11px] sm:text-xs text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-primary" />
                  <span className="font-medium truncate">{facility.city}, {facility.state}</span>
                </div>
              </div>
            </div>

            {/* Badges */}
            <div className="flex items-center gap-1 flex-wrap mb-1.5">
              {/* Rating badge - prominent position */}
              <RatingBadge rating={averageRating} reviewCount={reviewCount} size="sm" />
              
              {/* Pro badge (replaces old Featured/Professional badges) */}
              {isPro && (
                <Badge className="gap-0.5 px-1 py-0 text-[9px] font-bold bg-gradient-to-r from-amber-100 to-amber-50 text-amber-700 border border-amber-200/60 shadow-sm">
                  <Sparkles className="h-2 w-2" />
                  Pro
                </Badge>
              )}
              {facility.verified && (
                <Badge className="gap-0.5 px-1 py-0 text-[9px] font-bold bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-sm">
                  <Shield className="h-2 w-2" />
                  Verified
                </Badge>
              )}
              {facility.facility_type && (
                <Badge variant="secondary" className="gap-0.5 px-1 py-0 text-[9px] font-semibold border border-border/60 hidden sm:flex">
                  <Building2 className="h-2 w-2" />
                  <span className="truncate max-w-[80px]">{facility.facility_type}</span>
                </Badge>
              )}
            </div>

            {/* Description */}
            {facility.description && (
              <p className="text-[11px] sm:text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-2 flex-1">
                {facility.description}
              </p>
            )}

            {/* Action */}
            <div className="mt-auto">
              <Link to={facilityLink}>
                <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1 text-[11px] sm:text-xs h-7 sm:h-8 group/btn">
                  View Details
                  <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 transition-transform group-hover/btn:translate-x-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </article>
    );
  }
);

export const FacilityCardSkeleton = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  function FacilityCardSkeleton(props, ref) {
    return (
      <div ref={ref} {...props} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:min-h-[140px]">
          <div className="h-28 sm:h-full w-full sm:w-36 lg:w-44 bg-muted animate-pulse shrink-0" />
          <div className="p-2.5 sm:p-3 flex-1 space-y-2 min-w-0">
            <div className="h-3.5 w-3/4 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
            <div className="h-3 w-full bg-muted rounded animate-pulse" />
            <div className="h-7 w-20 bg-muted rounded animate-pulse mt-auto" />
          </div>
        </div>
      </div>
    );
  }
);
