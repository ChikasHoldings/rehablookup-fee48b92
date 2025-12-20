import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, ArrowRight, Crown, Calendar, ShieldCheck, Star, Image as ImageIcon } from "lucide-react";
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
    gallery_urls?: string[] | null;
    hasFeaturedSubscription?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
    facilityType?: string | null;
  };
  featured?: boolean;
  variant?: "default" | "compact";
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
    prevProps.variant === nextProps.variant &&
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
    prevCenter.treatmentTypes?.length === nextCenter.treatmentTypes?.length &&
    prevCenter.gallery_urls?.length === nextCenter.gallery_urls?.length
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TreatmentCenterCard = memo(function TreatmentCenterCard({ center, featured, variant = "default" }: TreatmentCenterCardProps) {
  const [logoError, setLogoError] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);
  const { trackImpression, trackClickToCall } = useProviderEventTracking();
  
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  
  // Get hero image from gallery or fallback to image field
  const heroImage = center.gallery_urls?.[0] || center.image;
  const hasValidHeroImage = heroImage && !heroImageError;
  
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

  // Compact horizontal layout for mobile
  if (variant === "compact") {
    return (
      <article
        ref={cardRef}
        className={cn(
          "group relative flex overflow-hidden rounded-xl border bg-card transition-all duration-200",
          "active:scale-[0.98]",
          showFeaturedBadge 
            ? "border-amber-200/70 shadow-md ring-1 ring-amber-300/30" 
            : "border-border/60 shadow-sm"
        )}
      >
        {/* Image thumbnail */}
        <div className="relative h-24 w-24 shrink-0 overflow-hidden">
          {hasValidHeroImage ? (
            <img 
              src={heroImage!} 
              alt={center.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setHeroImageError(true)}
            />
          ) : (
            <div className={cn(
              "flex h-full w-full items-center justify-center",
              showFeaturedBadge 
                ? "bg-gradient-to-br from-amber-100 to-amber-200"
                : "bg-gradient-to-br from-muted to-muted/70"
            )}>
              <ImageIcon className={cn(
                "h-8 w-8",
                showFeaturedBadge ? "text-amber-400" : "text-muted-foreground/40"
              )} />
            </div>
          )}
          {/* Featured overlay */}
          {showFeaturedBadge && (
            <div className="absolute left-0 top-0 bg-gradient-to-r from-amber-500 to-amber-600 px-2 py-0.5">
              <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wide text-white">
                <Crown className="h-2.5 w-2.5" />
                Featured
              </span>
            </div>
          )}
          {/* Verified badge */}
          {center.verified && (
            <div className="absolute bottom-1.5 right-1.5 h-5 w-5 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow ring-2 ring-card">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-center gap-1.5 min-w-0 p-3">
          <h3 className={cn(
            "font-display text-sm font-semibold leading-tight line-clamp-1",
            showFeaturedBadge ? "text-foreground" : "text-foreground"
          )}>
            {center.name}
          </h3>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className={cn(
              "h-3 w-3 shrink-0",
              showFeaturedBadge ? "text-amber-500" : "text-primary/60"
            )} />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>

          {/* Tags row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {yearsInBusiness && yearsInBusiness > 0 && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                showFeaturedBadge 
                  ? "bg-amber-100/80 text-amber-700"
                  : "bg-primary/10 text-primary"
              )}>
                <Calendar className="h-2.5 w-2.5" />
                {yearsInBusiness}+ yrs
              </span>
            )}
            {center.treatmentTypes.slice(0, 2).map((type) => (
              <Badge 
                key={type} 
                variant="secondary" 
                className={cn(
                  "text-[10px] font-medium px-1.5 py-0.5 rounded-md",
                  showFeaturedBadge 
                    ? "bg-amber-50/80 text-amber-800 border border-amber-200/60"
                    : "bg-secondary/80 text-secondary-foreground border-0"
                )}
              >
                {type}
              </Badge>
            ))}
            {center.treatmentTypes.length > 2 && (
              <Badge 
                variant="outline" 
                className="text-[10px] px-1.5 py-0.5 text-muted-foreground border-dashed rounded-md"
              >
                +{center.treatmentTypes.length - 2}
              </Badge>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col justify-center gap-1.5 p-2 shrink-0">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            onClick={handleFeaturedClick}
          >
            <Button 
              variant="default" 
              size="sm"
              className={cn(
                "h-8 px-3 text-xs font-semibold",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
                  : ""
              )}
            >
              View
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`} onClick={handleCallClick}>
            <Button 
              variant="outline" 
              size="sm"
              className={cn(
                "h-8 w-full text-xs",
                showFeaturedBadge 
                  ? "border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
              )}
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          </a>
        </div>
      </article>
    );
  }

  // Default vertical card layout with hero image
  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 ease-out",
        "hover:shadow-2xl hover:-translate-y-1",
        showFeaturedBadge 
          ? "border-amber-200/70 shadow-lg ring-1 ring-amber-300/30 hover:ring-amber-400/50 hover:border-amber-300" 
          : "border-border/60 shadow-md hover:border-primary/40"
      )}
    >
      {/* Hero Image Section */}
      <div className="relative h-40 overflow-hidden">
        {hasValidHeroImage ? (
          <img 
            src={heroImage!} 
            alt={center.name}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
            decoding="async"
            onError={() => setHeroImageError(true)}
          />
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center",
            showFeaturedBadge 
              ? "bg-gradient-to-br from-amber-100 via-amber-50 to-amber-100"
              : "bg-gradient-to-br from-muted via-background to-muted"
          )}>
            <div className="text-center">
              <ImageIcon className={cn(
                "h-10 w-10 mx-auto mb-2",
                showFeaturedBadge ? "text-amber-300" : "text-muted-foreground/30"
              )} />
              <span className={cn(
                "text-xs font-medium",
                showFeaturedBadge ? "text-amber-400" : "text-muted-foreground/40"
              )}>
                No image available
              </span>
            </div>
          </div>
        )}
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Featured Badge */}
        {showFeaturedBadge && (
          <div className="absolute left-3 top-3">
            <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              <Crown className="h-3 w-3" />
              Featured
            </Badge>
          </div>
        )}
        
        {/* Verified Badge */}
        {center.verified && (
          <div className="absolute right-3 top-3">
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm px-2.5 py-1 shadow-lg">
              <ShieldCheck className="h-3.5 w-3.5 text-white" />
              <span className="text-[10px] font-bold uppercase tracking-wide text-white">Verified</span>
            </div>
          </div>
        )}
        
        {/* Logo overlay at bottom */}
        <div className="absolute -bottom-6 left-4">
          <div 
            className={cn(
              "h-14 w-14 overflow-hidden rounded-xl border-4 border-card shadow-lg transition-transform duration-300 group-hover:scale-105",
              showFeaturedBadge ? "ring-2 ring-amber-300/60" : ""
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
                  ? "bg-gradient-to-br from-amber-100 to-amber-200"
                  : "bg-gradient-to-br from-primary/10 to-primary/20"
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
        </div>
        
        {/* Location pill at bottom right */}
        <div className="absolute bottom-3 right-3">
          <div className="flex items-center gap-1.5 rounded-full bg-background/90 backdrop-blur-sm px-2.5 py-1 shadow-md">
            <MapPin className={cn(
              "h-3 w-3",
              showFeaturedBadge ? "text-amber-500" : "text-primary"
            )} />
            <span className="text-xs font-medium text-foreground">{center.city}, {center.state}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="relative flex flex-1 flex-col p-4 pt-8">
        {/* Name */}
        <h3 className={cn(
          "font-display text-base font-bold leading-snug line-clamp-2 mb-2 transition-colors duration-300",
          showFeaturedBadge 
            ? "text-foreground group-hover:text-amber-700" 
            : "text-foreground group-hover:text-primary"
        )}>
          {center.name}
        </h3>

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
              Est. {center.year_established}
            </span>
          )}
          {center.rating > 0 && (
            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-yellow-100/80 text-yellow-700">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              {center.rating.toFixed(1)}
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
                  ? "bg-amber-50/80 text-amber-800 border border-amber-200/60"
                  : "bg-secondary/80 text-secondary-foreground border-0"
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
        <div className="flex gap-2 mt-auto">
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
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg"
                  : "shadow-md"
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
                  ? "border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500"
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
