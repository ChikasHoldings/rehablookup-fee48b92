import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  MapPin, 
  Phone, 
  Globe, 
  Mail, 
  Calendar, 
  ShieldCheck, 
  Crown, 
  Star, 
  ArrowRight,
  CheckCircle,
  Clock,
  Users,
  Building2,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { useState } from "react";

interface FacilityQuickViewModalProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
    gallery_urls?: string[] | null;
    hasFeaturedSubscription?: boolean;
    verified?: boolean | null;
    year_established?: number | null;
    facilityType?: string | null;
    website?: string | null;
    email?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  featured?: boolean;
}

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function FacilityQuickViewModal({ 
  center, 
  open, 
  onOpenChange,
  featured 
}: FacilityQuickViewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [logoError, setLogoError] = useState(false);
  
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;
    
  const showFeaturedBadge = center.hasFeaturedSubscription || featured;
  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;
  
  const images = center.gallery_urls?.length ? center.gallery_urls : (center.image ? [center.image] : []);
  const hasImages = images.length > 0;
  
  const yearsInBusiness = center.year_established 
    ? new Date().getFullYear() - center.year_established 
    : null;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[90vh]">
        {/* Hero Image Section */}
        <div className="relative h-56 sm:h-64 overflow-hidden bg-muted">
          {hasImages ? (
            <>
              <img 
                src={images[currentImageIndex]} 
                alt={center.name}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              
              {/* Image navigation */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  {/* Dots indicator */}
                  <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentImageIndex(idx)}
                        className={cn(
                          "h-1.5 rounded-full transition-all",
                          idx === currentImageIndex 
                            ? "w-4 bg-white" 
                            : "w-1.5 bg-white/50 hover:bg-white/70"
                        )}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className={cn(
              "flex h-full w-full items-center justify-center",
              showFeaturedBadge 
                ? "bg-gradient-to-br from-amber-50 via-amber-100/50 to-amber-50"
                : "bg-gradient-to-br from-muted via-background to-muted"
            )}>
              <div className={cn(
                "flex h-20 w-20 items-center justify-center rounded-2xl",
                showFeaturedBadge ? "bg-amber-200/50" : "bg-muted-foreground/10"
              )}>
                <span className={cn(
                  "font-display text-2xl font-bold",
                  showFeaturedBadge ? "text-amber-600" : "text-muted-foreground/50"
                )}>
                  {initials}
                </span>
              </div>
            </div>
          )}
          
          {/* Top badges and close button */}
          <div className="absolute left-0 right-0 top-0 flex items-start justify-between p-4">
            <div className="flex items-center gap-2">
              {showFeaturedBadge && (
                <Badge className="gap-1 bg-gradient-to-r from-amber-500 to-amber-600 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider">
                  <Crown className="h-3.5 w-3.5" />
                  Featured
                </Badge>
              )}
              {center.verified && (
                <Badge className="gap-1 bg-emerald-500/90 text-white border-0 shadow-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Verified
                </Badge>
              )}
            </div>
            
            {/* Close button */}
            <button
              onClick={() => onOpenChange(false)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-all hover:bg-black/70 focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label="Close preview"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          {/* Logo and basic info at bottom */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-end gap-4">
              {/* Logo */}
              <div className={cn(
                "h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 border-card bg-card shadow-lg",
                showFeaturedBadge && "ring-2 ring-amber-400/50"
              )}>
                {hasValidLogo ? (
                  <img 
                    src={center.logo_url!} 
                    alt={`${center.name} logo`}
                    className="h-full w-full object-cover"
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
                      "font-display text-lg font-bold",
                      showFeaturedBadge ? "text-amber-600" : "text-primary"
                    )}>
                      {initials}
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0 pb-1">
                <h2 className="font-display text-xl font-bold text-white line-clamp-1 drop-shadow-md">
                  {center.name}
                </h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="flex items-center gap-1 text-sm text-white/90">
                    <MapPin className="h-3.5 w-3.5" />
                    {center.city}, {center.state}
                  </span>
                  {center.rating > 0 && (
                    <span className="flex items-center gap-1 text-sm text-white/90">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {center.rating.toFixed(1)}
                      {center.reviewCount > 0 && (
                        <span className="text-white/70">({center.reviewCount})</span>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <ScrollArea className="max-h-[calc(90vh-16rem)]">
          <div className="p-5 space-y-5">
            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {yearsInBusiness && yearsInBusiness > 0 && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                  )}>
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Established</p>
                    <p className="text-sm font-semibold">{center.year_established}</p>
                  </div>
                </div>
              )}
              {center.facilityType && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg",
                    showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                  )}>
                    <Building2 className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Type</p>
                    <p className="text-sm font-semibold line-clamp-1">{center.facilityType}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  <Clock className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Availability</p>
                  <p className="text-sm font-semibold">24/7</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50">
                <div className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg",
                  showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Treatment</p>
                  <p className="text-sm font-semibold">{center.treatmentTypes.length} Types</p>
                </div>
              </div>
            </div>
            
            {/* Description */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">About</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {center.description || center.programOverview}
              </p>
            </div>
            
            {/* Treatment Types */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Treatment Programs</h3>
              <div className="flex flex-wrap gap-2">
                {center.treatmentTypes.map((type) => (
                  <Badge 
                    key={type} 
                    variant="secondary" 
                    className={cn(
                      "text-xs font-medium px-3 py-1 rounded-full",
                      showFeaturedBadge 
                        ? "bg-amber-100 text-amber-700"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    <CheckCircle className="h-3 w-3 mr-1.5" />
                    {type}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Insurance */}
            {center.insuranceAccepted && center.insuranceAccepted.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Insurance Accepted</h3>
                <div className="flex flex-wrap gap-2">
                  {center.insuranceAccepted.slice(0, 6).map((insurance) => (
                    <Badge 
                      key={insurance} 
                      variant="outline" 
                      className="text-xs font-medium px-2.5 py-1 rounded-full"
                    >
                      {insurance}
                    </Badge>
                  ))}
                  {center.insuranceAccepted.length > 6 && (
                    <Badge 
                      variant="outline" 
                      className="text-xs px-2.5 py-1 rounded-full text-muted-foreground border-dashed"
                    >
                      +{center.insuranceAccepted.length - 6} more
                    </Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a 
                href={`tel:${center.phone}`}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                  showFeaturedBadge 
                    ? "border-amber-200 hover:bg-amber-50" 
                    : "border-border hover:bg-muted/50"
                )}
              >
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                )}>
                  <Phone className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-semibold">{center.phone}</p>
                </div>
              </a>
              
              {center.website && (
                <a 
                  href={center.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-colors",
                    showFeaturedBadge 
                      ? "border-amber-200 hover:bg-amber-50" 
                      : "border-border hover:bg-muted/50"
                  )}
                >
                  <div className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    showFeaturedBadge ? "bg-amber-100 text-amber-600" : "bg-primary/10 text-primary"
                  )}>
                    <Globe className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Website</p>
                    <p className="text-sm font-semibold truncate">Visit Website</p>
                  </div>
                </a>
              )}
            </div>
            
            {/* Address */}
            <div className={cn(
              "p-4 rounded-xl border",
              showFeaturedBadge ? "border-amber-200 bg-amber-50/50" : "border-border bg-muted/30"
            )}>
              <div className="flex items-start gap-3">
                <MapPin className={cn(
                  "h-5 w-5 shrink-0 mt-0.5",
                  showFeaturedBadge ? "text-amber-600" : "text-primary"
                )} />
                <div>
                  <p className="text-sm font-medium text-foreground">{center.address}</p>
                  <p className="text-sm text-muted-foreground">{center.city}, {center.state} {center.zipCode}</p>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>
        
        {/* Footer Actions */}
        <div className="border-t border-border p-4 flex gap-3">
          <a href={`tel:${center.phone}`} className="flex-1">
            <Button 
              variant="outline" 
              size="lg"
              className={cn(
                "w-full gap-2 font-semibold",
                showFeaturedBadge 
                  ? "border-amber-300 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500"
                  : "hover:bg-primary hover:text-primary-foreground hover:border-primary"
              )}
            >
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Link to={detailsUrl} className="flex-1" onClick={() => onOpenChange(false)}>
            <Button 
              size="lg"
              className={cn(
                "w-full gap-2 font-semibold",
                showFeaturedBadge 
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 shadow-lg"
                  : "shadow-md"
              )}
            >
              View Full Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
