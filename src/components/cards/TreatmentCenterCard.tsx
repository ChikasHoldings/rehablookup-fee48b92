import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, ArrowRight, Shield } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface TreatmentCenterCardProps {
  center: TreatmentCenter & { 
    slug?: string | null; 
    isFromDatabase?: boolean; 
    logo_url?: string | null;
  };
  featured?: boolean;
}

// Generate initials from facility name (first letters of first 2 words)
function getInitials(name: string): string {
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function TreatmentCenterCard({ center, featured }: TreatmentCenterCardProps) {
  const [logoError, setLogoError] = useState(false);
  
  // Use slug-based URL for database facilities, id-based for static data
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  const initials = getInitials(center.name);
  const hasValidLogo = center.logo_url && !logoError;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-xl hover:-translate-y-0.5",
        featured 
          ? "border-accent/40 shadow-lg" 
          : "border-border shadow-sm"
      )}
    >
      {/* Featured Badge */}
      {featured && (
        <div className="absolute right-3 top-3 z-20">
          <Badge className="gap-1 bg-accent text-accent-foreground border-0 shadow-md px-2 py-1 text-xs font-medium">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Header with Logo */}
      <div className="flex items-start gap-4 p-4">
        {/* Logo Container - Fixed size with reserved space */}
        <div 
          className={cn(
            "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg",
            featured ? "ring-2 ring-accent/30" : "ring-1 ring-border"
          )}
        >
          {hasValidLogo ? (
            <img 
              src={center.logo_url!} 
              alt={`${center.name} logo`}
              className="h-full w-full object-contain bg-card"
              loading="lazy"
              onError={() => setLogoError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <span className="font-display text-base font-semibold text-primary">
                {initials}
              </span>
            </div>
          )}
        </div>

        {/* Name and Location */}
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="font-display text-base font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {center.name}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col px-4 pb-4">
        {/* Rating Row */}
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-accent text-accent" />
            <span className="text-sm font-semibold text-foreground">{center.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {center.reviewCount} reviews
          </span>
          <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
            <Shield className="h-3.5 w-3.5 text-accent" />
            Verified
          </div>
        </div>

        {/* Treatment Type Tags */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className="text-xs font-medium px-2 py-0.5 bg-secondary/60"
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-xs px-2 py-0.5 text-muted-foreground"
            >
              +{center.treatmentTypes.length - 3}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground leading-relaxed">
          {center.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
          >
            <Button 
              variant="default" 
              size="sm"
              className="w-full gap-1 text-sm font-medium"
            >
              View Profile
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
          <a href={`tel:${center.phone}`}>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1.5 text-sm font-medium"
            >
              <Phone className="h-3.5 w-3.5" />
              Call
            </Button>
          </a>
        </div>
      </div>
    </article>
  );
}