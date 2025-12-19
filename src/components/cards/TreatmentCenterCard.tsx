import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Crown, Calendar, ShieldCheck } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";

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
  const cardRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);
  const { trackImpression, trackClickToCall } = useProviderEventTracking();
  
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

  // Track impression when card is visible
  useEffect(() => {
    if (!center.isFromDatabase || !center.id || hasTrackedImpression.current) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedImpression.current) {
            hasTrackedImpression.current = true;
            trackImpression(center.id, "search");
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, [center.isFromDatabase, center.id, trackImpression]);

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

  const handleCallClick = useCallback(() => {
    if (center.isFromDatabase && center.id) {
      trackClickToCall(center.id, "search");
    }
  }, [center.isFromDatabase, center.id, trackClickToCall]);

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:-translate-y-1.5",
        showFeaturedBadge 
          ? "border-amber-200/70 shadow-lg ring-1 ring-amber-300/30 hover:ring-amber-400/50 hover:border-amber-300 hover:shadow-amber-200/30" 
          : "border-border/60 shadow-md hover:border-primary/40 hover:shadow-primary/15"
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div className={cn(
        "absolute inset-0 opacity-0 transition-opacity duration-300 pointer-events-none",
        showFeaturedBadge 
          ? "bg-gradient-to-br from-amber-50/50 via-transparent to-amber-100/30 group-hover:opacity-100"
          : "bg-gradient-to-br from-primary/3 via-transparent to-primary/5 group-hover:opacity-100"
      )} />

      {/* Top accent line with animation */}
      <div className={cn(
        "h-1 w-full relative overflow-hidden",
        showFeaturedBadge 
          ? "bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400"
          : "bg-gradient-to-r from-primary/30 via-primary/50 to-primary/30"
      )}>
        <div className={cn(
          "absolute inset-0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-out",
          showFeaturedBadge 
            ? "bg-gradient-to-r from-transparent via-white/40 to-transparent"
            : "bg-gradient-to-r from-transparent via-white/30 to-transparent"
        )} />
      </div>

      {/* Featured Badge */}
      {showFeaturedBadge && (
        <div className="absolute right-3 top-4 z-20">
          <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider animate-pulse-slow">
            <Crown className="h-3 w-3" />
            Featured
          </Badge>
        </div>
      )}

      {/* Card Content */}
      <div className="relative flex flex-1 flex-col p-5">
        {/* Header: Logo + Info */}
        <div className="flex gap-4 mb-4">
          {/* Logo */}
          <div className="relative shrink-0">
            <div 
              className={cn(
                "h-16 w-16 overflow-hidden rounded-xl transition-all duration-300 ease-out",
                showFeaturedBadge 
                  ? "ring-2 ring-amber-300/60 shadow-lg group-hover:ring-amber-400 group-hover:shadow-amber-200/50 group-hover:scale-105" 
                  : "ring-1 ring-border/80 shadow-md group-hover:ring-primary/50 group-hover:shadow-lg group-hover:scale-105"
              )}
            >
              {hasValidLogo ? (
                <img 
                  src={center.logo_url!} 
                  alt={`${center.name} logo`}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-110"
                  loading="lazy"
                  decoding="async"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <div className={cn(
                  "flex h-full w-full items-center justify-center transition-all duration-300",
                  showFeaturedBadge 
                    ? "bg-gradient-to-br from-amber-50 to-amber-100 group-hover:from-amber-100 group-hover:to-amber-200"
                    : "bg-gradient-to-br from-secondary to-secondary/70 group-hover:from-primary/10 group-hover:to-primary/20"
                )}>
                  <span className={cn(
                    "font-display text-lg font-bold transition-colors duration-300",
                    showFeaturedBadge ? "text-amber-600" : "text-primary"
                  )}>
                    {initials}
                  </span>
                </div>
              )}
            </div>
            {/* Verified Badge on Logo */}
            {center.verified && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg ring-2 ring-card transition-transform duration-300 group-hover:scale-110">
                <ShieldCheck className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>

          {/* Name & Location */}
          <div className="flex-1 min-w-0 pt-1">
            <h3 className={cn(
              "font-display text-base font-semibold leading-snug line-clamp-2 transition-colors duration-300",
              showFeaturedBadge 
                ? "text-foreground group-hover:text-amber-700" 
                : "text-foreground group-hover:text-primary"
            )}>
              {center.name}
            </h3>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className={cn(
                "h-3.5 w-3.5 shrink-0 transition-colors duration-300",
                showFeaturedBadge ? "text-amber-500 group-hover:text-amber-600" : "text-primary/60 group-hover:text-primary"
              )} />
              <span className="truncate">{center.city}, {center.state}</span>
            </p>
          </div>
        </div>

        {/* Meta Info Row */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {yearsInBusiness && yearsInBusiness > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-300",
              showFeaturedBadge 
                ? "bg-amber-100/80 text-amber-700 group-hover:bg-amber-200/80"
                : "bg-primary/10 text-primary group-hover:bg-primary/20"
            )}>
              <Calendar className="h-3 w-3" />
              {yearsInBusiness}+ yrs
            </span>
          )}
          {center.verified && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100/80 text-emerald-700 transition-all duration-300 group-hover:bg-emerald-200/80">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </span>
          )}
        </div>

        {/* Treatment Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {center.treatmentTypes.slice(0, 3).map((type, index) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className={cn(
                "text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-300",
                showFeaturedBadge 
                  ? "bg-amber-50/80 text-amber-800 border border-amber-200/60 group-hover:bg-amber-100 group-hover:border-amber-300"
                  : "bg-secondary/80 text-secondary-foreground border-0 group-hover:bg-secondary"
              )}
              style={{ transitionDelay: `${index * 50}ms` }}
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-[11px] px-2.5 py-1 text-muted-foreground border-dashed rounded-lg transition-colors duration-300 group-hover:border-primary/40 group-hover:text-primary"
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
        <div className="flex gap-2.5 mt-auto pt-2">
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
                "w-full gap-2 h-10 text-sm font-semibold transition-all duration-300",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg hover:shadow-xl hover:shadow-amber-300/30"
                  : "shadow-md hover:shadow-lg hover:shadow-primary/20"
              )}
            >
              View Profile
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`} onClick={handleCallClick}>
            <Button 
              variant="outline" 
              size="icon"
              className={cn(
                "h-10 w-10 shrink-0 transition-all duration-300",
                showFeaturedBadge 
                  ? "border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 hover:shadow-lg hover:shadow-amber-300/30 hover:scale-105"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-lg hover:shadow-primary/20 hover:scale-105"
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
