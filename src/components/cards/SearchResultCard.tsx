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
        "group relative overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-lg",
        showFeaturedBadge 
          ? "border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-card to-card ring-1 ring-amber-200/50 shadow-md" 
          : "border-border/60 shadow-sm hover:border-primary/30"
      )}
    >
      <div className="flex flex-col md:flex-row">
        {/* Image Section - Compact */}
        <div className="relative md:w-56 lg:w-64 shrink-0 overflow-hidden">
          <div className="aspect-[16/10] md:aspect-auto md:h-full md:min-h-[200px]">
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
                "flex h-full w-full items-center justify-center min-h-[160px] md:min-h-[200px]",
                showFeaturedBadge 
                  ? "bg-gradient-to-br from-amber-100 via-amber-50 to-white"
                  : "bg-gradient-to-br from-muted via-background to-muted"
              )}>
                <div className="text-center">
                  <div className={cn(
                    "mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl",
                    showFeaturedBadge ? "bg-amber-200/60" : "bg-muted-foreground/10"
                  )}>
                    <span className={cn(
                      "font-display text-lg font-bold",
                      showFeaturedBadge ? "text-amber-600" : "text-muted-foreground/60"
                    )}>
                      {initials}
                    </span>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium",
                    showFeaturedBadge ? "text-amber-500/80" : "text-muted-foreground/50"
                  )}>
                    Photo coming soon
                  </span>
                </div>
              </div>
            )}
            
            {/* Featured badge */}
            {showFeaturedBadge && (
              <div className="absolute left-2 top-2 z-10">
                <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-md px-2 py-1 text-[10px] font-bold uppercase tracking-wider">
                  <Crown className="h-3 w-3" />
                  Featured
                </Badge>
              </div>
            )}

            {/* Logo overlay */}
            <div className="absolute bottom-2 left-2 z-10">
              <div 
                className={cn(
                  "h-10 w-10 shrink-0 overflow-hidden rounded-lg border-2 border-white/90 bg-card shadow-md",
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
                      "font-display text-xs font-bold",
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

        {/* Content Section - Compact */}
        <div className="flex flex-1 flex-col p-4">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className={cn(
                "font-display text-base lg:text-lg font-bold leading-tight line-clamp-1 mb-1",
                "transition-colors duration-200",
                showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
              )}>
                {center.name}
              </h3>
              
              {/* Location & Contact */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MapPin className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  showFeaturedBadge ? "text-amber-500" : "text-primary"
                )} />
                <span className="font-medium">{center.city}, {center.state}</span>
                {center.phone && (
                  <>
                    <span className="text-border">•</span>
                    <span className="text-muted-foreground">{center.phone}</span>
                  </>
                )}
              </div>
            </div>

            {/* Compact Rating */}
            {center.rating && (
              <div className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg shrink-0",
                showFeaturedBadge 
                  ? "bg-amber-100 text-amber-700" 
                  : "bg-primary/10 text-primary"
              )}>
                <Star className="h-3.5 w-3.5 fill-current" />
                <span className="font-bold text-sm">{center.rating.toFixed(1)}</span>
                <span className="text-[10px] opacity-70">({center.reviewCount})</span>
              </div>
            )}
          </div>

          {/* Compact Stats Row */}
          <div className="flex items-center gap-3 mb-2 text-xs">
            {center.verified && (
              <div className="flex items-center gap-1 text-emerald-600">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span className="font-medium">Verified</span>
              </div>
            )}
            {yearsInBusiness && yearsInBusiness > 0 && (
              <div className="flex items-center gap-1 text-blue-600">
                <Clock className="h-3.5 w-3.5" />
                <span className="font-medium">{yearsInBusiness}+ yrs</span>
              </div>
            )}
            {hasInsurance && (
              <div className="flex items-center gap-1 text-purple-600">
                <CreditCard className="h-3.5 w-3.5" />
                <span className="font-medium">{insuranceCount} plans</span>
              </div>
            )}
            {center.facilityType && (
              <div className="flex items-center gap-1 text-slate-600">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium line-clamp-1">{center.facilityType}</span>
              </div>
            )}
          </div>

          {/* Description - Single line */}
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mb-2">
            {center.description}
          </p>

          {/* Treatment Types & Insurance - Compact inline */}
          <div className="flex items-center gap-2 flex-wrap mb-3">
            {center.treatmentTypes.slice(0, 3).map((type) => (
              <Badge 
                key={type} 
                variant="outline" 
                className={cn(
                  "text-[10px] font-medium px-2 py-0 h-5 rounded-full",
                  showFeaturedBadge 
                    ? "border-amber-200 text-amber-700 bg-amber-50/50"
                    : "border-border text-muted-foreground"
                )}
              >
                {type}
              </Badge>
            ))}
            {center.treatmentTypes.length > 3 && (
              <span className="text-[10px] text-muted-foreground">
                +{center.treatmentTypes.length - 3} more
              </span>
            )}
            {hasInsurance && center.insuranceAccepted.length > 0 && (
              <>
                <span className="text-border">|</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-emerald-500" />
                  {center.insuranceAccepted[0]}
                  {center.insuranceAccepted.length > 1 && ` +${center.insuranceAccepted.length - 1}`}
                </span>
              </>
            )}
          </div>

          {/* Actions Footer - Compact */}
          <div className="flex items-center gap-2 mt-auto">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setQuickViewOpen(true)}
              className={cn(
                "h-9 px-3 gap-1.5 text-xs font-medium rounded-lg",
                showFeaturedBadge 
                  ? "border-amber-200 text-amber-700 hover:bg-amber-50 hover:border-amber-300"
                  : "hover:bg-secondary"
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
                size="sm"
                className={cn(
                  "w-full h-9 text-xs font-semibold gap-1.5 rounded-lg group/btn",
                  showFeaturedBadge 
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-md shadow-amber-500/20"
                    : "shadow-sm hover:shadow-md"
                )}
              >
                <Heart className="h-3.5 w-3.5" />
                Request Info
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
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
