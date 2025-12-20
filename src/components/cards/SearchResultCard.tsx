import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MapPin, 
  ArrowRight, 
  Crown, 
  ShieldCheck, 
  Eye, 
  Clock, 
  CreditCard,
  Phone,
  Globe,
  Star,
  Building2,
  Users,
  CheckCircle,
  Heart,
  MessageCircle
} from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState, useCallback, memo, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useProviderEventTracking } from "@/hooks/useProviderEventTracking";
import { FacilityQuickViewModal } from "./FacilityQuickViewModal";

interface SearchResultCardProps {
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
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export const SearchResultCard = memo(function SearchResultCard({ center, featured }: SearchResultCardProps) {
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
  const insuranceCount = center.insuranceAccepted?.length || 0;

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

  return (
    <article
      ref={cardRef}
      className={cn(
        "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        "hover:shadow-xl",
        showFeaturedBadge 
          ? "border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-card to-card ring-1 ring-amber-200/50 shadow-lg" 
          : "border-border/60 shadow-md hover:border-primary/30"
      )}
    >
      <div className="flex flex-col lg:flex-row">
        {/* Image Section */}
        <div className="relative lg:w-72 xl:w-80 shrink-0 overflow-hidden">
          <div className="aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[280px]">
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
                "flex h-full w-full items-center justify-center min-h-[180px] lg:min-h-[280px]",
                showFeaturedBadge 
                  ? "bg-gradient-to-br from-amber-100 via-amber-50 to-white"
                  : "bg-gradient-to-br from-muted via-background to-muted"
              )}>
                <div className="text-center">
                  <div className={cn(
                    "mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl",
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
            
            {/* Featured badge */}
            {showFeaturedBadge && (
              <div className="absolute left-3 top-3 z-10">
                <Badge className="gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                  <Crown className="h-3.5 w-3.5" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Logo overlay */}
            <div className="absolute bottom-3 left-3 z-10">
              <div 
                className={cn(
                  "h-12 w-12 shrink-0 overflow-hidden rounded-xl border-2 border-white/90 bg-card shadow-lg",
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
            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col p-5 lg:p-6">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-display text-lg lg:text-xl font-bold leading-tight line-clamp-2 mb-1.5",
                "transition-colors duration-200",
                showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
              )}>
                {center.name}
              </h3>
              
              {/* Location */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <MapPin className={cn(
                  "h-4 w-4 shrink-0",
                  showFeaturedBadge ? "text-amber-500" : "text-primary"
                )} />
                <span className="font-medium">{center.city}, {center.state}</span>
                {center.phone && (
                  <>
                    <span className="mx-2 text-border">•</span>
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                    <span className="text-muted-foreground">{center.phone}</span>
                  </>
                )}
              </div>
            </div>

            {/* Rating Box */}
            {center.rating && (
              <div className={cn(
                "flex flex-col items-center justify-center px-4 py-2.5 rounded-xl shrink-0",
                showFeaturedBadge 
                  ? "bg-amber-100 text-amber-700" 
                  : "bg-primary/10 text-primary"
              )}>
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-current" />
                  <span className="font-bold text-xl">{center.rating.toFixed(1)}</span>
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
                  {center.reviewCount} reviews
                </span>
              </div>
            )}
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 py-3 border-y border-border/50">
            {center.verified && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">Verified</p>
                  <p className="text-[10px] text-muted-foreground">Provider</p>
                </div>
              </div>
            )}
            {yearsInBusiness && yearsInBusiness > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{yearsInBusiness}+ Years</p>
                  <p className="text-[10px] text-muted-foreground">Experience</p>
                </div>
              </div>
            )}
            {hasInsurance && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <CreditCard className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{insuranceCount}+ Plans</p>
                  <p className="text-[10px] text-muted-foreground">Accepted</p>
                </div>
              </div>
            )}
            {center.facilityType && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                  <Building2 className="h-4 w-4 text-slate-600" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground line-clamp-1">{center.facilityType}</p>
                  <p className="text-[10px] text-muted-foreground">Facility</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4">
            {center.description}
          </p>

          {/* Treatment Types */}
          <div className="flex flex-wrap gap-1.5 mb-5">
            {center.treatmentTypes.slice(0, 4).map((type) => (
              <Badge 
                key={type} 
                variant="outline" 
                className={cn(
                  "text-xs font-medium px-2.5 py-0.5 rounded-full",
                  showFeaturedBadge 
                    ? "border-amber-200 text-amber-700 bg-amber-50/50"
                    : "border-border text-muted-foreground"
                )}
              >
                {type}
              </Badge>
            ))}
            {center.treatmentTypes.length > 4 && (
              <Badge 
                variant="outline" 
                className="text-xs px-2.5 py-0.5 text-muted-foreground/70 border-dashed rounded-full"
              >
                +{center.treatmentTypes.length - 4} more
              </Badge>
            )}
          </div>

          {/* Insurance Accepted Preview */}
          {hasInsurance && (
            <div className="mb-5">
              <p className="text-xs text-muted-foreground mb-2">Insurance Accepted:</p>
              <div className="flex flex-wrap gap-1.5">
                {center.insuranceAccepted.slice(0, 3).map((ins) => (
                  <span 
                    key={ins}
                    className="inline-flex items-center gap-1 text-xs text-foreground bg-secondary/50 px-2 py-1 rounded-md"
                  >
                    <CheckCircle className="h-3 w-3 text-emerald-500" />
                    {ins}
                  </span>
                ))}
                {center.insuranceAccepted.length > 3 && (
                  <span className="text-xs text-muted-foreground bg-secondary/50 px-2 py-1 rounded-md">
                    +{center.insuranceAccepted.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-4 border-t border-border/50 mt-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setQuickViewOpen(true)}
              className={cn(
                "h-11 px-5 gap-2 text-sm font-medium rounded-xl flex-1 sm:flex-none",
                showFeaturedBadge 
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                  : "hover:bg-secondary"
              )}
            >
              <Eye className="h-4 w-4" />
              Quick View
            </Button>
            <Link 
              to={detailsUrl} 
              state={{ fromSearch: true }}
              onClick={handleFeaturedClick}
              className="flex-1"
            >
              <Button 
                size="lg"
                className={cn(
                  "w-full h-12 text-base font-semibold gap-2 rounded-xl group/btn",
                  showFeaturedBadge 
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                    : "shadow-md hover:shadow-lg"
                )}
              >
                <Heart className="h-5 w-5" />
                Request Information
                <ArrowRight className="h-5 w-5 transition-transform group-hover/btn:translate-x-0.5" />
              </Button>
            </Link>
          </div>
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
});
