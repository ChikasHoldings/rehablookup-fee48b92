import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Crown, Calendar } from "lucide-react";
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
        "hover:shadow-2xl hover:-translate-y-1 active:scale-[0.98]",
        showFeaturedBadge 
          ? "border-accent/50 shadow-lg shadow-accent/10 ring-1 ring-accent/20 hover:ring-accent/40 hover:border-accent/60" 
          : "border-border shadow-sm hover:border-primary/30 hover:shadow-primary/5"
      )}
    >
      {/* Hover gradient overlay for depth */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
        showFeaturedBadge 
          ? "bg-gradient-to-br from-accent/5 via-transparent to-primary/5 group-hover:opacity-100"
          : "bg-gradient-to-br from-primary/3 via-transparent to-transparent group-hover:opacity-100"
      )} />

      {/* Featured Badge - Gold for subscription-based featured */}
      {showFeaturedBadge && (
        <div className="absolute right-3 top-3 z-20 md:right-3 md:top-3">
          <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg shadow-amber-500/30 px-2.5 py-1 text-xs font-semibold animate-fade-in">
            <Crown className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      {/* Header with Logo - Larger on mobile */}
      <div className="relative flex items-start gap-4 p-5 md:p-4">
        {/* Logo Container - Enhanced hover effect */}
        <div 
          className={cn(
            "relative h-16 w-16 shrink-0 overflow-hidden rounded-xl md:h-14 md:w-14 md:rounded-lg transition-all duration-300",
            showFeaturedBadge 
              ? "ring-2 ring-accent/30 group-hover:ring-accent/50 group-hover:shadow-md" 
              : "ring-1 ring-border group-hover:ring-primary/40 group-hover:shadow-sm"
          )}
        >
          {hasValidLogo ? (
            <img 
              src={center.logo_url!} 
              alt={`${center.name} logo`}
              className="h-full w-full object-contain bg-card transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted transition-colors duration-300 group-hover:bg-primary/10">
              <span className="font-display text-lg font-semibold text-primary md:text-base">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Name and Location - Enhanced typography */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-display text-lg font-semibold text-foreground leading-tight transition-colors duration-300 group-hover:text-primary line-clamp-2 md:text-base">
            {center.name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-base text-muted-foreground md:mt-1 md:gap-1 md:text-sm">
            <MapPin className="h-4 w-4 shrink-0 text-primary/60 md:h-3.5 md:w-3.5" />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>
        </div>
      </div>

      {/* Content - Better spacing on mobile */}
      <div className="relative flex flex-1 flex-col px-5 pb-5 md:px-4 md:pb-4">
        {/* Years in Business & Verified Badge */}
        <div className="mb-4 flex items-center gap-3 md:mb-3">
          {center.year_established && (
            <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 md:gap-1 md:px-2.5 md:py-1">
              <Calendar className="h-4 w-4 text-primary md:h-3.5 md:w-3.5" />
              <span className="text-sm font-semibold text-primary md:text-xs">
                {new Date().getFullYear() - center.year_established}+ years
              </span>
            </div>
          )}
          {center.verified && (
            <div className={cn(!center.year_established && "ml-0", center.year_established && "ml-auto")}>
              <TrustBadge type="verified" size="sm" />
            </div>
          )}
        </div>

        {/* Treatment Type Tags - Better visual hierarchy */}
        <div className="mb-4 flex flex-wrap gap-2 md:mb-3 md:gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className="text-sm font-medium px-3 py-1 bg-secondary/70 hover:bg-secondary transition-colors md:text-xs md:px-2 md:py-0.5"
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

        {/* Actions - Enhanced button states */}
        <div className="flex gap-3 mt-auto md:gap-2">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
            onClick={handleFeaturedClick}
          >
            <Button 
              variant="default" 
              className={cn(
                "w-full gap-2 h-12 text-base font-medium transition-all duration-300 md:h-9 md:text-sm md:gap-1",
                "group-hover:shadow-md",
                showFeaturedBadge && "group-hover:shadow-primary/20"
              )}
            >
              View Profile
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 md:h-3.5 md:w-3.5" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`}>
            <Button 
              variant="outline" 
              className="gap-2 h-12 px-5 text-base font-medium transition-all duration-300 hover:bg-primary hover:text-primary-foreground hover:border-primary md:h-9 md:px-3 md:text-sm md:gap-1.5"
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
