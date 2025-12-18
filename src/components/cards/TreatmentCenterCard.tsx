import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, ArrowRight, Crown } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TrustBadge } from "@/components/trust/TrustBadge";

interface TreatmentCenterCardProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
    hasFeaturedSubscription?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
  };
  featured?: boolean;
}

// Generate initials from facility name (first letters of first 2 words)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TreatmentCenterCard({ center, featured }: TreatmentCenterCardProps) {
  const [logoError, setLogoError] = useState(false);
  
  // Use slug-based URL for database facilities, id-based for static data
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  
  // Show featured badge if they have a Featured subscription
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;

  // Track click for featured facilities
  const handleFeaturedClick = async () => {
    if (showFeaturedBadge && center.isFromDatabase && center.id) {
      try {
        await supabase.functions.invoke("track-featured-analytics", {
          body: { facility_id: center.id, event_type: "click" }
        });
      } catch (error) {
        console.error("Failed to track featured click:", error);
      }
    }
  };

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.99]",
        showFeaturedBadge 
          ? "border-accent/40 shadow-lg ring-1 ring-accent/20" 
          : "border-border shadow-sm"
      )}
    >
      {/* Featured Badge - Gold for subscription-based featured */}
      {showFeaturedBadge && (
        <div className="absolute right-3 top-3 z-20 md:right-3 md:top-3">
          <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md px-2.5 py-1 text-xs font-semibold">
            <Crown className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      {/* Header with Logo - Larger on mobile */}
      <div className="flex items-start gap-4 p-5 md:p-4">
        {/* Logo Container - Larger on mobile for better visibility */}
        <div 
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl md:h-14 md:w-14 md:rounded-lg",
            showFeaturedBadge ? "ring-2 ring-accent/30" : "ring-1 ring-border"
          )}
        >
          {hasValidLogo ? (
            <img 
              src={center.logo_url!} 
              alt={`${center.name} logo`}
              className="h-full w-full object-contain bg-card"
              loading="lazy"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="font-display text-lg font-semibold text-primary md:text-base">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Name and Location - Larger text on mobile */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-display text-lg font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2 md:text-base">
            {center.name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-base text-muted-foreground md:mt-1 md:gap-1 md:text-sm">
            <MapPin className="h-4 w-4 shrink-0 md:h-3.5 md:w-3.5" />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>
        </div>
      </div>

      {/* Content - Better spacing on mobile */}
      <div className="flex flex-1 flex-col px-5 pb-5 md:px-4 md:pb-4">
        {/* Rating Row - Larger touch targets */}
        <div className="mb-4 flex items-center gap-4 md:mb-3 md:gap-3">
          <div className="flex items-center gap-1.5 md:gap-1">
            <Star className="h-5 w-5 fill-accent text-accent md:h-4 md:w-4" />
            <span className="text-base font-semibold text-foreground md:text-sm">{center.rating}</span>
          </div>
          <span className="text-sm text-muted-foreground md:text-xs">
            {center.reviewCount} reviews
          </span>
          {center.verified && (
            <div className="ml-auto">
              <TrustBadge type="verified" size="sm" />
            </div>
          )}
        </div>

        {/* Treatment Type Tags - Larger on mobile */}
        <div className="mb-4 flex flex-wrap gap-2 md:mb-3 md:gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className="text-sm font-medium px-3 py-1 bg-secondary/60 md:text-xs md:px-2 md:py-0.5"
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-sm px-3 py-1 text-muted-foreground md:text-xs md:px-2 md:py-0.5"
            >
              +{center.treatmentTypes.length - 3}
            </Badge>
          )}
        </div>

        {/* Description - Better readability on mobile */}
        <p className="mb-5 line-clamp-2 flex-1 text-base text-muted-foreground leading-relaxed md:mb-4 md:text-sm">
          {center.description}
        </p>

        {/* Actions - Larger touch targets (48px height on mobile) */}
        <div className="flex gap-3 mt-auto md:gap-2">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
            onClick={handleFeaturedClick}
          >
            <Button 
              variant="default" 
              className="w-full gap-2 h-12 text-base font-medium md:h-9 md:text-sm md:gap-1"
            >
              View Profile
              <ArrowRight className="h-4 w-4 md:h-3.5 md:w-3.5" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`}>
            <Button 
              variant="outline" 
              className="gap-2 h-12 px-5 text-base font-medium md:h-9 md:px-3 md:text-sm md:gap-1.5"
            >
              <Phone className="h-4 w-4 md:h-3.5 md:w-3.5" />
              Call
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
