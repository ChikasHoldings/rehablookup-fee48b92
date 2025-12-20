import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, ArrowRight, Crown, ShieldCheck, Eye, Clock, CreditCard, Phone } from "lucide-react";
import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { FacilityQuickViewModal } from "./FacilityQuickViewModal";

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
    prevCenter.gallery_urls?.length === nextCenter.gallery_urls?.length &&
    prevCenter.insuranceAccepted?.length === nextCenter.insuranceAccepted?.length
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
  const { trackImpression } = useProviderEventTracking();
  
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

  // Compact horizontal layout for mobile/list view
  if (variant === "compact") {
    return (
      <article
        ref={cardRef}
        className={cn(
          "group relative flex overflow-hidden rounded-xl border bg-card transition-all duration-300",
          "hover:shadow-lg active:scale-[0.995]",
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
            <div className="absolute left-2 top-2">
              <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide">
                <Crown className="h-2.5 w-2.5" />
                Featured
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
              )} />
              <span className="truncate font-medium">{center.city}, {center.state}</span>
            </div>

            {/* Badge row */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {center.verified && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-0">
                  <ShieldCheck className="h-3 w-3" />
                  Verified
                </Badge>
              )}
              {yearsInBusiness && yearsInBusiness > 0 && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 border-0">
                  <Clock className="h-3 w-3" />
                  {yearsInBusiness}+ Years
                </Badge>
              )}
              {hasInsurance && (
                <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 border-0">
                  <CreditCard className="h-3 w-3" />
                  Accepts Insurance
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-3">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setQuickViewOpen(true)}
              className={cn(
                "h-8 px-2.5 text-xs gap-1.5 font-medium",
                showFeaturedBadge 
                  ? "text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                  : "text-muted-foreground hover:text-primary hover:bg-primary/5"
              )}
            >
              <Eye className="h-3.5 w-3.5" />
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
                  "w-full h-8 text-xs font-semibold gap-1.5",
                  showFeaturedBadge 
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                    : "shadow-sm"
                )}
              >
                View Details
                <ArrowRight className="h-3.5 w-3.5" />
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
              alt={center.name}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
              decoding="async"
              onError={() => setHeroImageError(true)}
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
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
                showFeaturedBadge ? "bg-amber-200/60" : "bg-muted-foreground/10"
              )}>
                <span className={cn(
                  "font-display text-xl font-bold",
                  showFeaturedBadge ? "text-amber-600" : "text-muted-foreground/60"
                )}>
                  {initials}
                </span>
              </div>
              <span className={cn(
                "text-xs font-medium",
                showFeaturedBadge ? "text-amber-500/80" : "text-muted-foreground/50"
              )}>
                Photo coming soon
              </span>
            </div>
          </div>
        )}
        
        {/* Top badge */}
        {showFeaturedBadge && (
          <div className="absolute left-3 top-3">
            <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider">
              <Crown className="h-3 w-3" />
              Featured
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
                <MapPin className="h-3 w-3 text-white/80 shrink-0" />
                <span className="text-xs text-white/90 font-medium truncate">{center.city}, {center.state}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="flex flex-1 flex-col p-3">

        {/* Badge row */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {center.verified && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-0 rounded-full">
              <ShieldCheck className="h-3 w-3" />
              Verified
            </Badge>
          )}
          {yearsInBusiness && yearsInBusiness > 0 && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-blue-100 text-blue-700 border-0 rounded-full">
              <Clock className="h-3 w-3" />
              {yearsInBusiness}+ Years
            </Badge>
          )}
          {hasInsurance && (
            <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 border-0 rounded-full">
              <CreditCard className="h-3 w-3" />
              Insurance
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
                "text-[10px] font-medium px-2 py-0.5 rounded-full",
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
              className="text-[10px] px-2 py-0.5 text-muted-foreground/70 border-dashed rounded-full"
            >
              +{center.treatmentTypes.length - 4}
            </Badge>
          )}
        </div>

        {/* Description - 2 lines */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 flex-1">
          {center.description}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/40">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setQuickViewOpen(true)}
            className={cn(
              "h-8 px-2 gap-1 text-xs font-medium",
              showFeaturedBadge 
                ? "text-amber-600 hover:bg-amber-100 hover:text-amber-700"
                : "text-muted-foreground hover:text-primary hover:bg-primary/5"
            )}
          >
            <Eye className="h-3.5 w-3.5" />
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
                "w-full gap-1.5 h-8 text-xs font-semibold",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md"
                  : "shadow-sm"
              )}
            >
              View Profile
              <ArrowRight className="h-3.5 w-3.5" />
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
