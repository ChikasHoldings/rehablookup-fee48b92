import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Crown, Calendar, Building2, ShieldCheck } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TreatmentCenterCardProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
    hasFeaturedSubscription?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
    facilityType?: string | null;
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
  
  // Calculate years in business
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

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
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-500",
        "hover:shadow-2xl hover:-translate-y-1.5",
        showFeaturedBadge 
          ? "border-amber-200/60 shadow-xl shadow-amber-500/10 ring-1 ring-amber-400/30 hover:ring-amber-400/50 hover:border-amber-300/80 hover:shadow-amber-500/20" 
          : "border-border/60 shadow-lg shadow-black/5 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10"
      )}
    >
      {/* Background gradient overlay */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-500 pointer-events-none",
        showFeaturedBadge 
          ? "bg-gradient-to-br from-amber-50/80 via-transparent to-primary/5 group-hover:opacity-100"
          : "bg-gradient-to-br from-primary/5 via-transparent to-secondary/10 group-hover:opacity-100"
      )} />
      
      {/* Subtle top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1 transition-all duration-300",
        showFeaturedBadge 
          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
          : "bg-gradient-to-r from-transparent via-primary/30 to-transparent opacity-0 group-hover:opacity-100"
      )} />

      {/* Featured Badge - Premium gold styling */}
      {showFeaturedBadge && (
        <div className="absolute right-4 top-4 z-20">
          <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 text-white border-0 shadow-lg shadow-amber-500/40 px-3 py-1.5 text-xs font-bold tracking-wide animate-fade-in">
            <Crown className="h-3.5 w-3.5" />
            FEATURED
          </Badge>
        </div>
      )}

      {/* Header Section */}
      <div className="relative p-5 md:p-5">
        <div className="flex items-start gap-4">
          {/* Logo Container - Round with subtle border glow */}
          <div className="relative">
            <div 
              className={cn(
                "relative h-18 w-18 shrink-0 overflow-hidden rounded-full transition-all duration-300 md:h-16 md:w-16",
                showFeaturedBadge 
                  ? "ring-2 ring-amber-300/50 shadow-lg shadow-amber-500/20 group-hover:ring-amber-400/70 group-hover:shadow-amber-500/30" 
                  : "ring-1 ring-border/80 shadow-md group-hover:ring-primary/50 group-hover:shadow-lg"
              )}
            >
              {hasValidLogo ? (
                <img 
                  src={center.logo_url!} 
                  alt={`${center.name} logo`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                  loading="lazy"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className={cn(
                  "flex h-full w-full items-center justify-center transition-all duration-300",
                  showFeaturedBadge 
                    ? "bg-gradient-to-br from-amber-50 to-amber-100/80"
                    : "bg-gradient-to-br from-primary/5 to-primary/10 group-hover:from-primary/10 group-hover:to-primary/15"
                )}>
                  <span className={cn(
                    "font-display text-xl font-bold md:text-lg",
                    showFeaturedBadge ? "text-amber-600" : "text-primary"
                  )}>
                    {initials}
                  </span>
                </div>
              )}
            </div>
            {/* Verified Trust Badge - Positioned on logo */}
            {center.verified && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg ring-2 ring-background z-10">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          {/* Name and Location */}
          <div className="min-w-0 flex-1 pt-0.5">
            <h3 className={cn(
              "font-display text-lg font-bold leading-tight line-clamp-2 transition-colors duration-300 md:text-base",
              showFeaturedBadge 
                ? "text-foreground group-hover:text-amber-700" 
                : "text-foreground group-hover:text-primary"
            )}>
              {center.name}
            </h3>
            <div className="mt-2 flex items-center gap-1.5 text-muted-foreground">
              <div className={cn(
                "flex items-center justify-center h-5 w-5 rounded-full transition-colors duration-300",
                showFeaturedBadge 
                  ? "bg-amber-100/80 group-hover:bg-amber-200/80"
                  : "bg-primary/10 group-hover:bg-primary/15"
              )}>
                <MapPin className={cn(
                  "h-3 w-3",
                  showFeaturedBadge ? "text-amber-600" : "text-primary"
                )} />
              </div>
              <span className="text-sm font-medium truncate">{center.city}, {center.state}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Bar */}
      <div className={cn(
        "mx-5 mb-4 flex items-center gap-2 flex-wrap md:mx-5 md:mb-3",
      )}>
        {yearsInBusiness && yearsInBusiness > 0 && (
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-300",
            showFeaturedBadge 
              ? "bg-amber-100/80 text-amber-700 group-hover:bg-amber-200/80"
              : "bg-primary/10 text-primary group-hover:bg-primary/15"
          )}>
            <Calendar className="h-3.5 w-3.5" />
            <span>{yearsInBusiness}+ years</span>
          </div>
        )}
        
        {center.verified && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-100/80 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-all duration-300 group-hover:bg-emerald-200/80">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified</span>
          </div>
        )}
        
        {center.facilityType && (
          <div className="flex items-center gap-1.5 rounded-full bg-secondary/80 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all duration-300 group-hover:bg-secondary">
            <Building2 className="h-3.5 w-3.5" />
            <span className="capitalize">{center.facilityType.replace(/_/g, ' ')}</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="relative flex flex-1 flex-col px-5 pb-5 md:px-5 md:pb-5">
        {/* Treatment Type Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5 md:mb-3">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className={cn(
                "text-xs font-medium px-2.5 py-1 transition-all duration-300",
                showFeaturedBadge 
                  ? "bg-amber-50/80 text-amber-800 border border-amber-200/60 hover:bg-amber-100/80"
                  : "bg-secondary/60 text-secondary-foreground border border-border/50 hover:bg-secondary"
              )}
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-xs px-2.5 py-1 text-muted-foreground border-dashed"
            >
              +{center.treatmentTypes.length - 3} more
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="mb-5 line-clamp-2 flex-1 text-sm text-muted-foreground leading-relaxed md:mb-4">
          {center.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2.5 mt-auto">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
            onClick={handleFeaturedClick}
          >
            <Button 
              variant="default" 
              className={cn(
                "w-full gap-2 h-11 text-sm font-semibold transition-all duration-300 md:h-10",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40"
                  : "shadow-md hover:shadow-lg hover:shadow-primary/20"
              )}
            >
              View Profile
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`}>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "h-11 w-11 transition-all duration-300 md:h-10 md:w-10",
                showFeaturedBadge 
                  ? "border-amber-300/60 text-amber-600 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-400"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
              )}
            >
              <Phone className="h-4 w-4" />
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}
