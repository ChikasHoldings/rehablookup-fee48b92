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
  Users
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
        "group relative flex flex-col md:flex-row overflow-hidden rounded-2xl border bg-card transition-all duration-300",
        "hover:shadow-xl",
        showFeaturedBadge 
          ? "border-amber-200/80 bg-gradient-to-r from-amber-50/50 via-card to-card ring-1 ring-amber-200/50 shadow-lg" 
          : "border-border/60 shadow-md hover:border-primary/30"
      )}
    >
      {/* Image Section */}
      <div className="relative w-full md:w-80 lg:w-96 shrink-0 overflow-hidden">
        <div className="aspect-[16/10] md:aspect-auto md:h-full">
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
              "flex h-full w-full items-center justify-center min-h-[200px]",
              showFeaturedBadge 
                ? "bg-gradient-to-br from-amber-100 via-amber-50 to-white"
                : "bg-gradient-to-br from-muted via-background to-muted"
            )}>
              <div className="text-center">
                <div className={cn(
                  "mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-2xl",
                  showFeaturedBadge ? "bg-amber-200/60" : "bg-muted-foreground/10"
                )}>
                  <span className={cn(
                    "font-display text-2xl font-bold",
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
                "h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 border-white/90 bg-card shadow-lg",
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
                    "font-display text-base font-bold",
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
      <div className="flex flex-1 flex-col p-5 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "font-display text-lg md:text-xl font-bold leading-tight line-clamp-2 mb-2",
              "transition-colors duration-200",
              showFeaturedBadge ? "group-hover:text-amber-700" : "group-hover:text-primary"
            )}>
              {center.name}
            </h3>
            
            {/* Location & Contact Row */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <MapPin className={cn(
                  "h-4 w-4 shrink-0",
                  showFeaturedBadge ? "text-amber-500" : "text-primary"
                )} />
                <span className="font-medium">{center.city}, {center.state}</span>
              </div>
              {center.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-4 w-4 shrink-0 text-muted-foreground/70" />
                  <span>{center.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Rating/Score */}
          {center.rating && (
            <div className={cn(
              "flex flex-col items-center justify-center px-4 py-2 rounded-xl shrink-0",
              showFeaturedBadge 
                ? "bg-amber-100 text-amber-700" 
                : "bg-primary/10 text-primary"
            )}>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-current" />
                <span className="font-bold text-lg">{center.rating.toFixed(1)}</span>
              </div>
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">Rating</span>
            </div>
          )}
        </div>

        {/* Badges Row */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          {center.verified && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-emerald-100 text-emerald-700 border-0 rounded-full">
              <ShieldCheck className="h-3.5 w-3.5" />
              Verified Provider
            </Badge>
          )}
          {yearsInBusiness && yearsInBusiness > 0 && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-blue-100 text-blue-700 border-0 rounded-full">
              <Clock className="h-3.5 w-3.5" />
              {yearsInBusiness}+ Years Experience
            </Badge>
          )}
          {hasInsurance && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-purple-100 text-purple-700 border-0 rounded-full">
              <CreditCard className="h-3.5 w-3.5" />
              Accepts Insurance
            </Badge>
          )}
          {center.facilityType && (
            <Badge variant="secondary" className="gap-1.5 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-700 border-0 rounded-full">
              <Building2 className="h-3.5 w-3.5" />
              {center.facilityType}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2 mb-4 flex-1">
          {center.description}
        </p>

        {/* Treatment Types */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {center.treatmentTypes.slice(0, 5).map((type) => (
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
          {center.treatmentTypes.length > 5 && (
            <Badge 
              variant="outline" 
              className="text-xs px-2.5 py-0.5 text-muted-foreground/70 border-dashed rounded-full"
            >
              +{center.treatmentTypes.length - 5} more
            </Badge>
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex items-center gap-3 pt-4 border-t border-border/50 mt-auto">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setQuickViewOpen(true)}
            className={cn(
              "h-10 px-4 gap-2 text-sm font-medium rounded-xl",
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
              size="sm"
              className={cn(
                "w-full h-10 text-sm font-semibold gap-2 rounded-xl group/btn",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg shadow-amber-500/25"
                  : "shadow-md"
              )}
            >
              View Full Profile
              <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
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
});
