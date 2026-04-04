import facilityPlaceholder from "@/assets/facility-placeholder.jpg";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ArrowRight, 
  Crown, 
  ShieldCheck, 
  Clock, 
  CreditCard,
  Phone,
  Building2,
  CheckCircle,
  Heart,
  ExternalLink,
  Navigation,
  Compass,
  Globe2
} from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect, forwardRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";

import { formatPhoneNumber, getPhoneDigits } from "@/lib/phoneUtils";
import { useFavorites } from "@/hooks/useFavorites";
import type { ProximityTier } from "@/lib/proximitySearch";
import { GoogleReviewsCompactBadge } from "@/components/reviews/GoogleReviewsBadge";

interface SearchResultCardProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
    gallery_urls?: string[] | null;
    hasFeaturedSubscription?: boolean;
    hasPaidPlan?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
    facilityType?: string | null;
    insuranceAccepted?: string[];
    _proximityTier?: ProximityTier;
    _proximityReason?: string;
    googleRating?: number | null;
    googleReviewCount?: number | null;
  };
  featured?: boolean;
}

const proximityBadgeConfig: Record<ProximityTier, { 
  label: string; 
  icon: React.ElementType; 
  className: string;
  bgClassName: string;
}> = {
  exact: { 
    label: "Exact Match", 
    icon: MapPin, 
    className: "text-emerald-700",
    bgClassName: "bg-emerald-100 border-emerald-200"
  },
  city: { 
    label: "In Your City", 
    icon: Building2, 
    className: "text-blue-700",
    bgClassName: "bg-blue-100 border-blue-200"
  },
  state: { 
    label: "In Your State", 
    icon: Navigation, 
    className: "text-purple-700",
    bgClassName: "bg-purple-100 border-purple-200"
  },
  nearby: { 
    label: "Nearby State", 
    icon: Compass, 
    className: "text-amber-700",
    bgClassName: "bg-amber-100 border-amber-200"
  },
  nationwide: { 
    label: "Nationwide", 
    icon: Globe2, 
    className: "text-slate-600",
    bgClassName: "bg-slate-100 border-slate-200"
  },
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const SearchResultCard = memo(forwardRef<HTMLElement, SearchResultCardProps>(function SearchResultCard({ center, featured }, ref) {
  const [logoError, setLogoError] = useState(false);
  const [heroImageError, setHeroImageError] = useState(false);
  const internalRef = useRef<HTMLElement>(null);
  const cardRef = ref || internalRef;
  const hasTrackedImpression = useRef(false);
  const { trackImpression } = useProviderEventTracking();
  const { toggleFavorite, isFavorite } = useFavorites();
  
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
  const insuranceCount = center.insuranceAccepted?.length || 0;
  
  // Proximity badge configuration
  const proximityTier = center._proximityTier;
  const proximityConfig = proximityTier ? proximityBadgeConfig[proximityTier] : null;
  const ProximityIcon = proximityConfig?.icon;
  
  // Check if provider has paid plan - show phone only for paid providers
  const hasPaidPlan = center.hasPaidPlan || center.hasFeaturedSubscription || !center.isFromDatabase;

  // Format phone number for display and tel link (only for paid plans)
  const formattedPhone = hasPaidPlan && center.phone ? formatPhoneNumber(center.phone) : null;
  const phoneDigits = hasPaidPlan && center.phone ? getPhoneDigits(center.phone) : null;
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

    const currentRef = typeof cardRef === 'function' ? null : cardRef?.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => observer.disconnect();
  }, [center.isFromDatabase, center.id, trackImpression, cardRef]);

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
      ref={typeof cardRef === 'function' ? cardRef : cardRef}
      aria-label={`${center.name} treatment center in ${center.city}, ${center.state}${center.verified ? ', verified provider' : ''}${showFeaturedBadge ? ', featured' : ''}`}
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-0.5",
        "focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2",
        showFeaturedBadge 
          ? "border-amber-300/80 bg-gradient-to-r from-amber-50/80 via-card to-card ring-1 ring-amber-200/60 shadow-lg" 
          : "border-border shadow-md hover:border-primary/40"
      )}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image Section */}
        <div className="relative md:w-60 lg:w-64 shrink-0 overflow-hidden">
          <div className="aspect-[16/10] md:aspect-auto md:h-full md:min-h-[180px]">
            {hasValidHeroImage ? (
              <>
                <img 
                  src={heroImage!} 
                  alt={`${center.name} treatment facility exterior in ${center.city}, ${center.state}`}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  fetchPriority="auto"
                  onError={() => setHeroImageError(true)}
                />
                {/* Subtle overlay for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden="true" />
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" aria-hidden="true" />
              </>
            )}
            
            {/* Featured badge */}
            {showFeaturedBadge && (
              <div className="absolute left-3 top-3 z-10">
                <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" aria-label="Featured treatment center">
                  <Crown className="h-3 w-3" aria-hidden="true" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Proximity badge */}
            {proximityConfig && ProximityIcon && proximityTier !== "nationwide" && (
              <div className={cn(
                "absolute z-10",
                showFeaturedBadge ? "left-3 top-11" : "left-3 top-3"
              )}>
                <Badge 
                  variant="outline"
                  className={cn(
                    "gap-1.5 px-2.5 py-1 text-[10px] font-bold shadow-md backdrop-blur-sm border",
                    proximityConfig.bgClassName,
                    proximityConfig.className
                  )}
                >
                  <ProximityIcon className="h-3 w-3" />
                  {proximityConfig.label}
                </Badge>
              </div>
            )}

            {/* Top-right icons: Favorite + Years (horizontal) */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-2">
              {/* Years badge */}
              {yearsInBusiness && yearsInBusiness > 0 && (
                <div className="flex items-center gap-1 bg-amber-500/95 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-md">
                  <Clock className="h-2.5 w-2.5 text-amber-100" aria-hidden="true" />
                  <span className="text-[9px] font-semibold text-white">{yearsInBusiness}+ yrs</span>
                </div>
              )}

              {/* Favorite button */}
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(center.id);
                }}
                className={cn(
                  "transition-all duration-200 drop-shadow-lg",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded",
                  isFavorite(center.id)
                    ? "text-rose-500"
                    : "text-white/90 hover:text-rose-500"
                )}
                aria-label={isFavorite(center.id) ? `Remove ${center.name} from favorites` : `Add ${center.name} to favorites`}
                aria-pressed={isFavorite(center.id)}
              >
                <Heart className={cn("h-6 w-6", isFavorite(center.id) && "fill-current")} aria-hidden="true" />
              </button>
            </div>

            {/* Logo overlay */}
            <div className="absolute bottom-3 left-3 z-10">
              <div 
                className={cn(
                  "h-11 w-11 shrink-0 overflow-hidden rounded-lg border-2 border-white bg-card shadow-lg",
                  showFeaturedBadge && "ring-2 ring-amber-400/60"
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
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-3 md:p-4">
          {/* Header Row */}
          <div className="flex items-start gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-display text-base lg:text-lg font-bold leading-tight line-clamp-1 mb-1.5",
                "transition-colors duration-200",
                showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
              )}>
                {center.name}
              </h3>
              
              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className={cn(
                  "h-4 w-4 shrink-0",
                  showFeaturedBadge ? "text-amber-500" : "text-primary"
                )} aria-hidden="true" />
                <span className="font-medium">{center.city}, {center.state}</span>
              </div>
            </div>
          </div>

          {/* Phone Number - Clickable */}
          {formattedPhone && telLink && (
            <a 
              href={telLink}
              className={cn(
                "inline-flex items-center gap-1.5 text-sm font-medium mb-2 w-fit",
                "hover:underline transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded",
                showFeaturedBadge ? "text-amber-700 hover:text-amber-800" : "text-primary hover:text-primary/80"
              )}
              aria-label={`Call ${center.name} at ${formattedPhone}`}
            >
              <Phone className="h-4 w-4" aria-hidden="true" />
              {formattedPhone}
              <ExternalLink className="h-3 w-3 opacity-50" aria-hidden="true" />
            </a>
          )}

          {/* Stats Badges Row */}
          <div className="flex items-center gap-2 flex-wrap mb-2" role="list" aria-label="Provider credentials">
            {center.googleRating && center.googleReviewCount && (
              <GoogleReviewsCompactBadge 
                rating={center.googleRating} 
                reviewCount={center.googleReviewCount} 
              />
            )}
            {center.verified && (
              <Badge className="gap-1.5 px-2.5 py-1 text-[11px] font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 rounded-md shadow-sm" role="listitem">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                Verified Provider
              </Badge>
            )}
            {hasInsurance && (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-purple-100 text-purple-700 border-0 rounded-md" role="listitem">
                <CreditCard className="h-3 w-3" aria-hidden="true" />
                {insuranceCount} Insurance Plans
              </Badge>
            )}
            {center.facilityType && (
              <Badge variant="secondary" className="gap-1 px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-700 border-0 rounded-md" role="listitem">
                <Building2 className="h-3 w-3" aria-hidden="true" />
                {center.facilityType}
              </Badge>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-2">
            {center.description}
          </p>

          {/* Treatment Types & Insurance - Inline */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {center.treatmentTypes.slice(0, 4).map((type) => (
              <Badge 
                key={type} 
                variant="outline" 
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded-md",
                  showFeaturedBadge 
                    ? "border-amber-200 text-amber-700 bg-amber-50/50"
                    : "border-border text-muted-foreground bg-secondary/30"
                )}
              >
                {type}
              </Badge>
            ))}
            {center.treatmentTypes.length > 4 && (
              <span className="text-[10px] text-muted-foreground">
                +{center.treatmentTypes.length - 4} more
              </span>
            )}
          </div>


          {/* Actions Footer */}
          <div className="flex items-center gap-2 mt-auto">
            <Link 
              to={`${detailsUrl}?inquiry=info`}
              state={{ fromSearch: true, inquiryType: 'request_info' }}
              onClick={handleFeaturedClick}
              className="flex-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              aria-label={`Request information from ${center.name}`}
            >
              <Button 
                size="default"
                tabIndex={-1}
                className={cn(
                  "w-full h-10 text-sm font-semibold gap-2 rounded-lg group/btn",
                  showFeaturedBadge 
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                    : "shadow-md hover:shadow-lg"
                )}
              >
                <span className="md:hidden">Request Info</span>
                <span className="hidden md:inline">Request Information</span>
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </Button>
            </Link>
            <Link 
              to={detailsUrl}
              onClick={handleFeaturedClick}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg"
              aria-label={`View details for ${center.name}`}
            >
              <Button 
                size="default"
                variant="outline"
                tabIndex={-1}
                className="h-10 text-sm font-semibold gap-2 rounded-lg group/btn"
              >
                View Details
                <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" aria-hidden="true" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}));
