import facilityPlaceholder from "@/assets/facility-placeholder.webp";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Crown, ShieldCheck, Clock, CreditCard, Heart, Sparkles } from "lucide-react";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";


interface TreatmentCenterCardProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
    gallery_urls?: string[] | null;
    hasFeaturedSubscription?: boolean;
    isPro?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
    facilityType?: string | null;
    insuranceAccepted?: string[];
    googleRating?: number | null;
    googleReviewCount?: number | null;
  };
  featured?: boolean;
  variant?: "default" | "compact";
}

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
    prevCenter.isPro === nextCenter.isPro &&
    prevCenter.year_established === nextCenter.year_established &&
    prevCenter.city === nextCenter.city &&
    prevCenter.state === nextCenter.state &&
    prevCenter.description === nextCenter.description &&
    prevCenter.treatmentTypes?.length === nextCenter.treatmentTypes?.length &&
    prevCenter.gallery_urls?.length === nextCenter.gallery_urls?.length &&
    prevCenter.insuranceAccepted?.length === nextCenter.insuranceAccepted?.length &&
    prevCenter.googleRating === nextCenter.googleRating &&
    prevCenter.googleReviewCount === nextCenter.googleReviewCount
  );
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const TreatmentCenterCard = memo(forwardRef<HTMLElement, TreatmentCenterCardProps>(
  function TreatmentCenterCard({ center, featured, variant = "default" }, forwardedRef) {
  const navigate = useNavigate();
  const [logoError, setLogoError] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const internalRef = useRef<HTMLElement>(null);
  // Use forwarded ref if provided, otherwise use internal ref
  const cardRef = (forwardedRef as React.RefObject<HTMLElement>) || internalRef;
  const hasTrackedImpression = useRef(false);
  const { trackImpression } = useProviderEventTracking();
  
  // Always prefer slug → /center/{slug}. Fall back to safe directory listing
  // instead of a UUID-based dead-end (legacy /rehab-centers/{uuid}).
  const detailsUrl = center.slug
    ? `/center/${center.slug}`
    : `/rehab-centers`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  const showProBadge = center.isPro && !showFeaturedBadge; // Show Pro badge only if not already showing Featured
  
  const heroImage = center.gallery_urls?.[0] || center.image;
  const hasValidHeroImage = heroImage && !heroImageError;
  
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

  const hasInsurance = center.insuranceAccepted && center.insuranceAccepted.length > 0;

  // Format phone number for display and tel link
  const formattedPhone = center.phone ? formatPhoneNumber(center.phone) : null;
  const phoneDigits = center.phone ? getPhoneDigits(center.phone) : null;
  const telLink = phoneDigits ? `tel:+1${phoneDigits}` : null;

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

  const handleCardClick = useCallback(() => {
    handleFeaturedClick();
    navigate(detailsUrl, { state: { fromSearch: true } });
  }, [handleFeaturedClick, navigate, detailsUrl]);

  const handleGetHelpClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    handleFeaturedClick();
    navigate(detailsUrl, { state: { fromSearch: true, openContactForm: true } });
  }, [handleFeaturedClick, navigate, detailsUrl]);

  // Compact horizontal layout for mobile/list view
  if (variant === "compact") {
    return (
      <article
        ref={cardRef}
        onClick={handleCardClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
        tabIndex={0}
        role="button"
        aria-label={`View details for ${center.name} treatment center in ${center.city}, ${center.state}${center.verified ? ', verified provider' : ''}${showFeaturedBadge ? ', featured' : ''}`}
        className={cn(
          "group relative flex overflow-hidden rounded-xl border bg-card transition-all duration-300 cursor-pointer",
          "hover:shadow-lg active:scale-[0.995]",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
          showFeaturedBadge 
            ? "border-amber-200/80 bg-gradient-to-r from-amber-50/30 to-card ring-1 ring-amber-100" 
            : "border-border/60 shadow-sm hover:border-primary/20"
        )}
      >
        {/* Image thumbnail */}
        <div className="relative h-32 w-32 shrink-0 overflow-hidden sm:h-36 sm:w-40">
          {hasValidHeroImage ? (
            <img 
              src={heroImage!} 
              alt={`${center.name} treatment facility in ${center.city}, ${center.state}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setHeroImageError(true)}
            />
          ) : (
            <div className={cn(
              "flex h-full w-full items-center justify-center",
              showFeaturedBadge 
                ? "bg-gradient-to-br from-amber-100 to-amber-50"
                : "bg-gradient-to-br from-muted to-background"
            )}>
              <div className={cn(
                "flex h-12 w-12 items-center justify-center rounded-xl",
                showFeaturedBadge ? "bg-amber-200/60" : "bg-muted-foreground/10"
              )}>
                <span className={cn(
                  "font-display text-base font-bold",
                  showFeaturedBadge ? "text-amber-600" : "text-muted-foreground"
                )}>
                  {initials}
                </span>
              </div>
            </div>
          )}
          
          {/* Featured badge overlay */}
          {showFeaturedBadge && (
            <div className="absolute right-2 top-2">
              <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" aria-label="Featured treatment center">
                <Crown className="h-2.5 w-2.5" aria-hidden="true" />
                Featured
              </Badge>
            </div>
          )}
          {/* Pro badge overlay */}
          {showProBadge && (
            <div className="absolute right-2 top-2">
              <Badge className="gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide" aria-label="Pro treatment center">
                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                Pro
              </Badge>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between min-w-0 p-3 sm:p-4">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <h3 className={cn(
                "font-display text-sm font-bold leading-tight line-clamp-2 flex-1 sm:text-base",
                "transition-colors duration-200",
                showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
              )}>
                {center.name}
              </h3>
            </div>
            
            {/* Location */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className={cn(
                "h-3.5 w-3.5 shrink-0",
                showFeaturedBadge ? "text-amber-500" : "text-primary"
              )} aria-hidden="true" />
              <span className="truncate font-medium" aria-label={`Location: ${center.city}, ${center.state}`}>{center.city}, {center.state}</span>
            </div>

            {/* Badge row */}
            <div className="flex items-center gap-1.5 flex-wrap" role="list" aria-label="Provider credentials">
              {center.verified && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 border-0" role="listitem">
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  <span>Verified</span>
                </Badge>
              )}
              {yearsInBusiness && yearsInBusiness > 0 && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 border-0" role="listitem">
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  <span>{yearsInBusiness}+ Years in business</span>
                </Badge>
              )}
              {hasInsurance && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 border-0" role="listitem">
                  <CreditCard className="h-3 w-3" aria-hidden="true" />
                  <span>Accepts Insurance</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-3">
            <Button 
              variant="default" 
              size="sm"
              onClick={handleGetHelpClick}
              aria-label={`Check availability at ${center.name}`}
              className={cn(
                "w-full h-8 text-xs font-semibold gap-1.5",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                  : "shadow-sm"
              )}
            >
              <Heart className="h-3.5 w-3.5" aria-hidden="true" />
              Check Availability
            </Button>
          </div>
        </div>
      </article>
    );
  }

  // Default vertical card layout - Premium directory style
  return (
    <article
      ref={cardRef}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`View details for ${center.name} treatment center in ${center.city}, ${center.state}${center.verified ? ', verified provider' : ''}${showFeaturedBadge ? ', featured' : ''}`}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 cursor-pointer",
        "hover:shadow-xl hover:-translate-y-1",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        showFeaturedBadge 
          ? "border-amber-200/80 shadow-lg ring-1 ring-amber-200/50" 
          : "border-border/60 shadow-md hover:border-primary/20"
      )}
    >
      {/* Hero Image Section */}
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {hasValidHeroImage ? (
          <>
            <img 
              src={heroImage!} 
              alt={`${center.name} treatment facility exterior in ${center.city}, ${center.state}`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setHeroImageError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        ) : (
          <>
            <img
              src={facilityPlaceholder}
              alt={`${center.name} treatment facility placeholder image`}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          </>
        )}
        
        {/* Top badge */}
        {showFeaturedBadge && (
          <div className="absolute right-3 top-3">
            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider" aria-label="Featured treatment center">
              <Crown className="h-3 w-3" aria-hidden="true" />
              Featured
            </Badge>
          </div>
        )}
        {showProBadge && (
          <div className="absolute right-3 top-3">
            <Badge className="gap-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 shadow-lg px-2.5 py-1 text-xs font-bold uppercase tracking-wider" aria-label="Pro treatment center">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              Pro
            </Badge>
          </div>
        )}
        
        {/* Bottom overlay with logo, name, and location stacked */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <div 
              className={cn(
                "h-12 w-12 shrink-0 overflow-hidden rounded-lg border-2 border-white/90 bg-card shadow-lg",
                showFeaturedBadge && "ring-2 ring-amber-400/50"
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
                    ? "bg-gradient-to-br from-amber-100 to-amber-50"
                    : "bg-gradient-to-br from-primary/10 to-primary/5"
                )}>
                  <span className={cn(
                    "font-display text-sm font-bold",
                    showFeaturedBadge ? "text-amber-600" : "text-primary"
                  )}>
                    {initials}
                  </span>
                </div>
              )}
            </div>
            
            {/* Name and Location stacked */}
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-sm font-bold text-white leading-tight line-clamp-1 drop-shadow-md">
                {center.name}
              </h3>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3 text-white/80 shrink-0" aria-hidden="true" />
                <span className="text-xs text-white/90 font-medium truncate">{center.city}, {center.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-3">

        {/* Badge row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap" role="list" aria-label="Provider credentials">
          {center.verified && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-700 border-0 rounded-full" role="listitem">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              <span>Verified</span>
            </Badge>
          )}
          {yearsInBusiness && yearsInBusiness > 0 && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 border-0 rounded-full" role="listitem">
              <Clock className="h-3 w-3" aria-hidden="true" />
              <span>{yearsInBusiness}+ Years in business</span>
            </Badge>
          )}
          {hasInsurance && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-xs font-semibold bg-purple-100 text-purple-700 border-0 rounded-full" role="listitem">
              <CreditCard className="h-3 w-3" aria-hidden="true" />
              <span>Accepts Insurance</span>
            </Badge>
          )}
        </div>

        {/* Treatment Tags - max 2 lines */}
        <div className="flex flex-wrap gap-1 mb-2 max-h-[44px] overflow-hidden">
          {center.treatmentTypes.slice(0, 4).map((type) => (
            <Badge 
              key={type} 
              variant="outline" 
              className={cn(
                "text-xs font-medium px-2 py-0.5 rounded-full",
                showFeaturedBadge 
                  ? "border-amber-200 text-amber-700"
                  : "border-border text-muted-foreground"
              )}
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 4 && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 text-muted-foreground/70 border-dashed rounded-full"
            >
              +{center.treatmentTypes.length - 4}
            </Badge>
          )}
        </div>

        {/* Description - 2 lines */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {center.description}
        </p>

        {/* Single CTA Button */}
        <div className="mt-3 pt-2 border-t border-border/40">
          <Button 
            variant="default" 
            size="sm"
            onClick={handleGetHelpClick}
            aria-label={`Check availability at ${center.name}`}
            className={cn(
              "w-full gap-1.5 h-9 text-xs font-semibold",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              showFeaturedBadge 
                ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                : "shadow-sm"
            )}
          >
            <Heart className="h-3.5 w-3.5" aria-hidden="true" />
            Check Availability
          </Button>
        </div>
      </div>
    </article>
  );
}), arePropsEqual);
