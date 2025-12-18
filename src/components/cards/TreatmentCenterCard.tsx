import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Crown, Calendar, ShieldCheck } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo } from "react";
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

// Comparison function for memo - only re-render if relevant props changed
function arePropsEqual(
  prevProps: TreatmentCenterCardProps,
  nextProps: TreatmentCenterCardProps
): boolean {
  const prevCenter = prevProps.center;
  const nextCenter = nextProps.center;
  
  return (
    prevProps.featured === nextProps.featured &&
    prevCenter.id === nextCenter.id &&
    prevCenter.name === nextCenter.name &&
    prevCenter.slug === nextCenter.slug &&
    prevCenter.logo_url === nextCenter.logo_url &&
    prevCenter.verified === nextCenter.verified &&
    prevCenter.hasFeaturedSubscription === nextCenter.hasFeaturedSubscription &&
    prevCenter.year_established === nextCenter.year_established &&
    prevCenter.city === nextCenter.city &&
    prevCenter.state === nextCenter.state &&
    prevCenter.description === nextCenter.description &&
    prevCenter.treatmentTypes?.length === nextCenter.treatmentTypes?.length
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TreatmentCenterCard = memo(function TreatmentCenterCard({ center, featured }: TreatmentCenterCardProps) {
  const [logoError, setLogoError] = useState(false);
  
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

  const handleFeaturedClick = useCallback(async () => {
    if (showFeaturedBadge && center.isFromDatabase && center.id) {
      try {
        await supabase.functions.invoke("track-featured-analytics", {
          body: { facility_id: center.id, event_type: "click" }
        });
      } catch (error) {
        console.error("Failed to track featured click:", error);
      }
    }
  }, [showFeaturedBadge, center.isFromDatabase, center.id]);

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        showFeaturedBadge 
          ? "border-amber-200/70 shadow-lg ring-1 ring-amber-300/40 hover:ring-amber-400/60 hover:border-amber-300" 
          : "border-border/50 shadow-md hover:border-primary/30 hover:shadow-primary/10"
      )}
    >
      {/* Top accent line */}
      <div className={cn(
        "h-1 w-full",
        showFeaturedBadge 
          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
          : "bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20"
      )} />

      {/* Featured Badge */}
      {showFeaturedBadge && (
        <div className="absolute right-3 top-4 z-20">
          <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
            <Crown className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Header: Logo + Info */}
        <div className="flex gap-3.5 mb-4">
          {/* Logo */}
          <div className="relative shrink-0">
            <div 
              className={cn(
                "h-14 w-14 overflow-hidden rounded-full transition-all duration-300",
                showFeaturedBadge 
                  ? "ring-2 ring-amber-300/60 shadow-md" 
                  : "ring-1 ring-border shadow-sm group-hover:ring-primary/40"
              )}
            >
              {hasValidLogo ? (
                <img 
                  src={center.logo_url!} 
                  alt={`${center.name} logo`}
                  className="h-full w-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className={cn(
                  "flex h-full w-full items-center justify-center",
                  showFeaturedBadge 
                    ? "bg-gradient-to-br from-amber-50 to-amber-100"
                    : "bg-gradient-to-br from-muted to-muted/80"
                )}>
                  <span className={cn(
                    "font-display text-base font-bold",
                    showFeaturedBadge ? "text-amber-600" : "text-primary"
                  )}>
                    {initials}
                  </span>
                </div>
              )}
            </div>
            {/* Verified Badge on Logo */}
            {center.verified && (
              <div className="absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md ring-2 ring-card">
                <ShieldCheck className="h-3 w-3 text-white" />
              </div>
            )}
          </div>

          {/* Name & Location */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className={cn(
              "font-display text-base font-semibold leading-snug line-clamp-2 transition-colors",
              showFeaturedBadge 
                ? "text-foreground group-hover:text-amber-700" 
                : "text-foreground group-hover:text-primary"
            )}>
              {center.name}
            </h3>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className={cn(
                "h-3.5 w-3.5 shrink-0",
                showFeaturedBadge ? "text-amber-500" : "text-primary/70"
              )} />
              <span className="truncate">{center.city}, {center.state}</span>
            </p>
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {yearsInBusiness && yearsInBusiness > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
              showFeaturedBadge 
                ? "bg-amber-100/80 text-amber-700"
                : "bg-primary/10 text-primary"
            )}>
              <Calendar className="h-3 w-3" />
              {yearsInBusiness}+ yrs
            </span>
          )}
          {center.verified && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-700">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        {/* Treatment Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-md",
                showFeaturedBadge 
                  ? "bg-amber-50 text-amber-800 border border-amber-200/50"
                  : "bg-secondary/70 text-secondary-foreground border-0"
              )}
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-[11px] px-2 py-0.5 text-muted-foreground border-dashed rounded-md"
            >
              +{center.treatmentTypes.length - 3}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
          {center.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-1">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
            onClick={handleFeaturedClick}
          >
            <Button 
              variant="default" 
              size="sm"
              className={cn(
                "w-full gap-1.5 h-9 text-sm font-medium",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                  : "shadow-sm"
              )}
            >
              View Profile
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`}>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "h-9 w-9 shrink-0",
                showFeaturedBadge 
                  ? "border-amber-300 text-amber-600 hover:bg-amber-50 hover:border-amber-400"
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
}, arePropsEqual);
