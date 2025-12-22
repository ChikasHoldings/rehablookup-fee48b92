import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  MapPin, 
  Shield, 
  Building2, 
  Heart, 
  ArrowRight, 
  Clock 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useFavorites } from "@/hooks/useFavorites";
import { cn } from "@/lib/utils";

export interface FacilityCardData {
  id: string;
  name: string;
  city: string;
  state: string;
  facility_type: string;
  slug: string;
  phone: string | null;
  description: string | null;
  logo_url: string | null;
  gallery_urls: string[] | null;
  verified: boolean | null;
  year_established: number | null;
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

export function FacilityCard({ facility, onRemove, showRemoveButton = false }: FacilityCardProps) {
  const { toggleFavorite, isFavorite } = useFavorites();
  const [logoError, setLogoError] = useState(false);
  const [heroError, setHeroError] = useState(false);

  const initials = getInitials(facility.name);
  const hasLogo = facility.logo_url && !logoError;
  const heroImage = facility.gallery_urls?.[0];
  const hasHeroImage = heroImage && !heroError;
  const yearsInBusiness = facility.year_established 
    ? new Date().getFullYear() - facility.year_established 
    : null;

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
    <article className="group relative h-full overflow-hidden rounded-xl border border-border bg-card shadow-sm hover:shadow-lg hover:border-primary/40 transition-all duration-300">
      <div className="flex h-full flex-col sm:flex-row">
        {/* Image Section - Fixed dimensions for consistent card sizes */}
        <div className="relative sm:w-48 lg:w-56 shrink-0 overflow-hidden bg-muted">
          <div className="h-[120px] sm:h-full w-full">
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
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary via-background to-secondary">
                <div className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-muted shadow-sm">
                    <span className="font-display text-lg font-bold text-muted-foreground">
                      {initials}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">
                    Photo coming soon
                  </span>
                </div>
              </div>
            )}
            
            {/* Logo overlay */}
            <div className="absolute bottom-2 left-2 z-10">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-card shadow-md">
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
                    <span className="font-display text-xs font-bold text-primary">
                      {initials}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Years badge */}
            {yearsInBusiness && yearsInBusiness > 0 && (
              <div className="absolute bottom-2 right-2 z-10">
                <div className="flex items-center gap-1 bg-white/95 backdrop-blur-sm rounded-md px-2 py-1 shadow-sm">
                  <Clock className="h-3 w-3 text-blue-600" />
                  <span className="text-[10px] font-semibold text-blue-700">{yearsInBusiness}+ yrs</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <Link to={`/center/${facility.slug}`}>
                <h3 className="font-display text-base font-bold leading-tight line-clamp-1 mb-1 group-hover:text-primary transition-colors">
                  {facility.name}
                </h3>
              </Link>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                <span className="font-medium">{facility.city}, {facility.state}</span>
              </div>
            </div>

            <button
              onClick={handleFavoriteClick}
              className={cn(
                "p-2 rounded-lg border transition-all duration-200",
                showRemoveButton
                  ? "bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100"
                  : isFavorite(facility.id)
                    ? "bg-rose-50 border-rose-200 text-rose-500"
                    : "bg-secondary/50 border-border text-muted-foreground hover:text-rose-500 hover:border-rose-200 hover:bg-rose-50"
              )}
              aria-label={showRemoveButton ? "Remove from saved" : isFavorite(facility.id) ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={cn("h-4 w-4", (showRemoveButton || isFavorite(facility.id)) && "fill-current")} />
            </button>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap mb-2">
            {facility.verified && (
              <Badge className="gap-1 px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 border-0">
                <Shield className="h-3 w-3" />
                Verified
              </Badge>
            )}
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold">
              <Building2 className="h-3 w-3" />
              {facility.facility_type}
            </Badge>
          </div>

          {/* Description */}
          {facility.description && (
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-3">
              {facility.description}
            </p>
          )}

          {/* Action */}
          <div className="mt-auto">
            <Link to={`/center/${facility.slug}`}>
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-1.5 group/btn">
                View Details
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function FacilityCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex flex-col sm:flex-row">
        <div className="h-[120px] sm:h-40 sm:w-48 lg:w-56 bg-muted animate-pulse" />
        <div className="p-4 flex-1 space-y-3">
          <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
          <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
          <div className="h-4 w-full bg-muted rounded animate-pulse" />
          <div className="h-8 w-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
