import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Crown, Calendar, ShieldCheck, Eye, Building2 } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { FacilityQuickViewModal } from "./FacilityQuickViewModal";

// Insurance logo mapping
const INSURANCE_LOGOS: Record<string, string> = {
  "Aetna": "/insurance-logos/aetna.svg",
  "Blue Cross Blue Shield": "/insurance-logos/bcbs.svg",
  "BCBS": "/insurance-logos/bcbs.svg",
  "Cigna": "/insurance-logos/cigna.svg",
  "United Healthcare": "/insurance-logos/united.svg",
  "UnitedHealthcare": "/insurance-logos/united.svg",
  "Kaiser": "/insurance-logos/kaiser.svg",
  "Kaiser Permanente": "/insurance-logos/kaiser.svg",
};

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
    insuranceAccepted?: string[];
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
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const hasTrackedImpression = useRef(false);
  const { trackImpression, trackClickToCall } = useProviderEventTracking();
  
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  
  const heroImage = center.gallery_urls?.[0] || center.image;
  const hasValidHeroImage = heroImage && !heroImageError;
  
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

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

  // Compact horizontal layout for mobile/list view
  if (variant === "compact") {
    return (
      <article
        ref={cardRef}
        className={cn(
          "group relative flex overflow-hidden rounded-xl border bg-card transition-all duration-300",
          "hover:shadow-lg active:scale-[0.99]",
          showFeaturedBadge 
            ? "border-amber-200 bg-gradient-to-r from-amber-50/50 to-card shadow-md" 
            : "border-border/50 shadow-sm hover:border-primary/30"
        )}
      >
        {/* Image thumbnail */}
        <div className="relative h-28 w-28 shrink-0 overflow-hidden sm:h-32 sm:w-36">
          {hasValidHeroImage ? (
            <img 
              src={heroImage!} 
              alt={center.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
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
              <div className="text-center">
                <div className={cn(
                  "mx-auto mb-1 flex h-10 w-10 items-center justify-center rounded-full",
                  showFeaturedBadge ? "bg-amber-200/50" : "bg-muted-foreground/10"
                )}>
                  <span className={cn(
                    "font-display text-sm font-bold",
                    showFeaturedBadge ? "text-amber-600" : "text-muted-foreground"
                  )}>
                    {initials}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Featured ribbon */}
          {showFeaturedBadge && (
            <div className="absolute -left-8 top-3 rotate-[-45deg] bg-gradient-to-r from-amber-500 to-amber-600 px-8 py-0.5 shadow-md">
              <span className="text-[8px] font-bold uppercase tracking-wider text-white">Featured</span>
            </div>
          )}
          
          {/* Verified badge */}
          {center.verified && (
            <div className="absolute bottom-2 left-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 shadow-md ring-2 ring-card">
              <ShieldCheck className="h-3 w-3 text-white" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col justify-between gap-2 min-w-0 p-3 sm:p-4">
          <div>
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className={cn(
                "font-display text-sm font-bold leading-tight line-clamp-2 sm:text-base",
                "transition-colors duration-300",
                showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
              )}>
                {center.name}
              </h3>
              {yearsInBusiness && yearsInBusiness > 0 && (
                <div className="flex items-center gap-1 shrink-0 rounded-full bg-primary/10 px-2 py-0.5">
                  <Building2 className="h-3 w-3 text-primary" />
                  <span className="text-[10px] font-semibold text-primary">{yearsInBusiness}+ yrs</span>
                </div>
              )}
            </div>
            
            <p className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
              <MapPin className={cn(
                "h-3 w-3 shrink-0",
                showFeaturedBadge ? "text-amber-500" : "text-primary"
              )} />
              <span className="truncate">{center.city}, {center.state}</span>
            </p>
            
            {/* Insurance badges */}
            {center.insuranceAccepted && center.insuranceAccepted.length > 0 && (
              <div className="flex items-center gap-1.5 mb-2">
                {center.insuranceAccepted.slice(0, 3).map((insurance) => {
                  const logoUrl = INSURANCE_LOGOS[insurance];
                  return logoUrl ? (
                    <div 
                      key={insurance}
                      className="h-5 w-8 rounded border border-border/50 bg-white p-0.5 shadow-sm"
                      title={insurance}
                    >
                      <img 
                        src={logoUrl} 
                        alt={insurance} 
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div 
                      key={insurance}
                      className="flex h-5 items-center rounded border border-border/50 bg-muted/50 px-1.5 text-[8px] font-medium text-muted-foreground"
                      title={insurance}
                    >
                      {insurance.slice(0, 4)}
                    </div>
                  );
                })}
                {center.insuranceAccepted.length > 3 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{center.insuranceAccepted.length - 3}
                  </span>
                )}
              </div>
            )}

            {/* Tags */}
            <div className="flex items-center gap-1 flex-wrap">
              {center.treatmentTypes.slice(0, 2).map((type) => (
                <Badge 
                  key={type} 
                  variant="secondary" 
                  className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    showFeaturedBadge 
                      ? "bg-amber-100 text-amber-700 border-amber-200"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {type}
                </Badge>
              ))}
              {center.treatmentTypes.length > 2 && (
                <span className="text-[10px] text-muted-foreground">
                  +{center.treatmentTypes.length - 2} more
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-1">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuickViewOpen(true)}
              className={cn(
                "h-8 px-2 text-xs gap-1",
                showFeaturedBadge 
                  ? "text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <Eye className="h-3 w-3" />
              Quick View
            </Button>
            <Link 
              to={detailsUrl} 
              state={{ fromSearch: true }}
              onClick={handleFeaturedClick}
              className="flex-1"
            >
              <Button 
                variant="default" 
                size="sm"
                className={cn(
                  "w-full h-8 text-xs font-semibold gap-1",
                  showFeaturedBadge 
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                    : "shadow-sm"
                )}
              >
                Details
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>
        
        {/* Quick View Modal */}
        <FacilityQuickViewModal
          center={center}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          featured={featured}
        />
      </article>
    );
  }

  // Default vertical card layout - Premium directory style
  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-1",
        showFeaturedBadge 
          ? "border-amber-200 shadow-lg shadow-amber-100/50 ring-1 ring-amber-200/50" 
          : "border-border/50 shadow-md hover:border-primary/30 hover:shadow-primary/10"
      )}
    >
      {/* Hero Image Section */}
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {hasValidHeroImage ? (
          <>
            <img 
              src={heroImage!} 
              alt={center.name}
              className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setHeroImageError(true)}
            />
            {/* Subtle vignette overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
          </>
        ) : (
          <div className={cn(
            "flex h-full w-full items-center justify-center",
            showFeaturedBadge 
              ? "bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-50"
              : "bg-gradient-to-br from-muted via-background to-muted"
          )}>
            <div className="text-center">
              <div className={cn(
                "mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl",
                showFeaturedBadge ? "bg-amber-200/50" : "bg-muted-foreground/10"
              )}>
                <span className={cn(
                  "font-display text-xl font-bold",
                  showFeaturedBadge ? "text-amber-600" : "text-muted-foreground/50"
                )}>
                  {initials}
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                showFeaturedBadge ? "text-amber-500" : "text-muted-foreground/50"
              )}>
                Photo coming soon
              </span>
            </div>
          </div>
        )}
        
        {/* Top badges row */}
        <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-3">
          {/* Featured Badge */}
          {showFeaturedBadge ? (
            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <Crown className="h-3 w-3" />
              Featured
            </Badge>
          ) : (
            <div />
          )}
          
          {/* Verified Badge */}
          {center.verified && (
            <Badge className="gap-1 bg-emerald-500/90 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>
        
        {/* Bottom info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex items-end justify-between gap-3">
            {/* Logo */}
            <div 
              className={cn(
                "h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-card bg-card shadow-lg transition-transform duration-300 group-hover:scale-105",
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
            
            {/* Location & Years */}
            <div className="flex items-center gap-2">
              {yearsInBusiness && yearsInBusiness > 0 && (
                <div className="flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 shadow-md">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-bold text-foreground">{yearsInBusiness}+ years</span>
                </div>
              )}
              <div className="flex items-center gap-1 rounded-full bg-card/90 backdrop-blur-sm px-2.5 py-1 shadow-md">
                <MapPin className={cn(
                  "h-3 w-3",
                  showFeaturedBadge ? "text-amber-500" : "text-primary"
                )} />
                <span className="text-xs font-medium text-foreground">{center.city}, {center.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Name */}
        <h3 className={cn(
          "font-display text-base font-bold leading-snug line-clamp-2 mb-2 transition-colors duration-300",
          showFeaturedBadge 
            ? "group-hover:text-amber-700" 
            : "group-hover:text-primary"
        )}>
          {center.name}
        </h3>

        {/* Meta badges */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {yearsInBusiness && yearsInBusiness > 0 && (
            <span className={cn(
              "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full",
              showFeaturedBadge 
                ? "bg-amber-100 text-amber-700"
                : "bg-primary/10 text-primary"
            )}>
              <Calendar className="h-3 w-3" />
              Est. {center.year_established}
            </span>
          )}
          {center.facilityType && (
            <span className="inline-flex items-center text-[11px] font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
              {center.facilityType}
            </span>
          )}
        </div>

        {/* Insurance Badges */}
        {center.insuranceAccepted && center.insuranceAccepted.length > 0 && (
          <div className="flex items-center gap-2 mb-3">
            <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Insurance:</span>
            <div className="flex items-center gap-1.5">
              {center.insuranceAccepted.slice(0, 3).map((insurance) => {
                const logoUrl = INSURANCE_LOGOS[insurance];
                return logoUrl ? (
                  <div 
                    key={insurance}
                    className="h-6 w-10 rounded border border-border/50 bg-white p-0.5 shadow-sm"
                    title={insurance}
                  >
                    <img 
                      src={logoUrl} 
                      alt={insurance} 
                      className="h-full w-full object-contain"
                    />
                  </div>
                ) : (
                  <div 
                    key={insurance}
                    className="flex h-6 items-center rounded border border-border/50 bg-muted/50 px-2 text-[10px] font-medium text-muted-foreground"
                    title={insurance}
                  >
                    {insurance.slice(0, 6)}
                  </div>
                );
              })}
              {center.insuranceAccepted.length > 3 && (
                <span className="text-[10px] text-muted-foreground font-medium">
                  +{center.insuranceAccepted.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Treatment Tags */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="outline" 
              className={cn(
                "text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors duration-200",
                showFeaturedBadge 
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50"
                  : "border-border hover:border-primary/50 hover:text-primary"
              )}
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-[11px] px-2 py-0.5 text-muted-foreground border-dashed rounded-full"
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
        <div className="flex gap-2 mt-auto pt-2 border-t border-border/50">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setQuickViewOpen(true)}
            className={cn(
              "h-10 px-3 gap-1.5 text-sm",
              showFeaturedBadge 
                ? "text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <Eye className="h-4 w-4" />
            Quick View
          </Button>
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
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-200/50"
                  : "shadow-md hover:shadow-lg"
              )}
            >
              View Profile
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Button>
          </Link>
        </div>
        
        {/* Quick View Modal */}
        <FacilityQuickViewModal
          center={center}
          open={quickViewOpen}
          onOpenChange={setQuickViewOpen}
          featured={featured}
        />
      </div>
    </article>
  );
}, arePropsEqual);
