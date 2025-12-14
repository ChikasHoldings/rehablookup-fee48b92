import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, CheckCircle, ArrowRight, Building2, Shield } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";

interface TreatmentCenterCardProps {
  center: TreatmentCenter & { slug?: string | null; isFromDatabase?: boolean; logo_url?: string | null };
  featured?: boolean;
}

export function TreatmentCenterCard({ center, featured }: TreatmentCenterCardProps) {
  // Use slug-based URL for database facilities, id-based for static data
  const detailsUrl = center.isFromDatabase && center.slug 
    ? `/center/${center.slug}` 
    : `/rehab-centers/${center.id}`;

  return (
    <article
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-all duration-300",
        "hover:shadow-2xl hover:shadow-primary/5 hover:-translate-y-1",
        featured 
          ? "border-accent/50 ring-2 ring-accent/20 shadow-xl shadow-accent/10" 
          : "border-border/60 shadow-lg shadow-black/5"
      )}
    >
      {/* Featured Badge - Positioned outside content flow */}
      {featured && (
        <div className="absolute right-3 top-3 z-20">
          <Badge className="gap-1.5 bg-accent text-accent-foreground border-0 shadow-lg px-3 py-1.5 font-semibold text-xs uppercase tracking-wide">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Header with Logo */}
      <div className={cn(
        "relative flex items-center gap-4 p-5 pb-4",
        featured 
          ? "bg-gradient-to-br from-accent/5 via-transparent to-primary/5" 
          : "bg-gradient-to-br from-muted/30 via-transparent to-muted/10"
      )}>
        {/* Logo Container */}
        <div className={cn(
          "relative shrink-0 overflow-hidden rounded-xl transition-transform duration-300 group-hover:scale-105",
          featured ? "ring-2 ring-accent/30" : "ring-1 ring-border"
        )}>
          {center.logo_url ? (
            <img 
              src={center.logo_url} 
              alt={`${center.name} logo`}
              className="h-16 w-16 object-cover bg-card"
              loading="lazy"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
              <Building2 className="h-7 w-7 text-primary/50" />
            </div>
          )}
        </div>

        {/* Name and Location */}
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-semibold text-foreground leading-tight group-hover:text-primary transition-colors line-clamp-2">
            {center.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0 text-primary/60" />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="mx-5 border-t border-border/50" />

      {/* Content */}
      <div className="flex flex-1 flex-col p-5 pt-4">
        {/* Rating and Reviews */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
              <Star className="h-3.5 w-3.5 fill-primary text-primary" />
              <span className="text-sm font-bold text-primary">{center.rating}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              ({center.reviewCount} reviews)
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-accent">
            <Shield className="h-3.5 w-3.5" />
            <span className="text-xs font-medium">Verified</span>
          </div>
        </div>

        {/* Treatment Types */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge 
              key={type} 
              variant="secondary" 
              className="text-xs font-medium px-2.5 py-1 bg-secondary/50 hover:bg-secondary/70 transition-colors"
            >
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge 
              variant="outline" 
              className="text-xs font-medium px-2.5 py-1 text-muted-foreground"
            >
              +{center.treatmentTypes.length - 3}
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="mb-5 line-clamp-2 flex-1 text-sm text-muted-foreground leading-relaxed">
          {center.description}
        </p>

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2">
          <a href={`tel:${center.phone}`} className="flex-1">
            <Button 
              variant="default" 
              className={cn(
                "w-full gap-2 font-medium shadow-md transition-all",
                "hover:shadow-lg hover:shadow-primary/20"
              )}
            >
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
          >
            <Button 
              variant="outline" 
              className="w-full gap-1 font-medium group/btn hover:bg-primary/5 hover:border-primary/30"
            >
              View Details
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
