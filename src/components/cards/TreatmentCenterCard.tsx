import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, CheckCircle, ArrowRight, Building2 } from "lucide-react";
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
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        featured ? "border-accent/40 ring-1 ring-accent/20 shadow-lg" : "border-border shadow-card"
      )}
    >
      {featured && (
        <div className="absolute right-4 top-4 z-10">
          <Badge className="gap-1.5 bg-accent text-accent-foreground border-0 shadow-lg px-3 py-1.5 font-semibold">
            <Star className="h-3.5 w-3.5 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Image/Header Area */}
      <div className="relative h-44 overflow-hidden bg-gradient-to-br from-primary/5 via-secondary/50 to-accent/5">
        <div className="absolute inset-0 flex items-center justify-center">
          {center.logo_url ? (
            <img 
              src={center.logo_url} 
              alt={`${center.name} logo`}
              className="h-20 w-20 rounded-2xl object-cover shadow-lg ring-4 ring-card"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-card shadow-lg ring-4 ring-card/50">
              <Building2 className="h-8 w-8 text-primary/60" />
            </div>
          )}
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 rounded-full bg-accent/10 blur-3xl" />
        {featured && (
          <div className="absolute inset-0 bg-gradient-to-t from-accent/5 to-transparent" />
        )}
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {center.name}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{center.city}, {center.state}</span>
          </p>
        </div>

        {/* Rating */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-sm font-bold text-primary">{center.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {center.reviewCount} reviews
          </span>
        </div>

        {/* Treatment Types */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="secondary" className="text-xs font-medium px-2.5 py-0.5">
              {type}
            </Badge>
          ))}
          {center.treatmentTypes.length > 3 && (
            <Badge variant="outline" className="text-xs font-medium px-2.5 py-0.5">
              +{center.treatmentTypes.length - 3} more
            </Badge>
          )}
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 flex-1 text-sm text-muted-foreground leading-relaxed">
          {center.description}
        </p>

        {/* Verified Badge */}
        <div className="mb-5 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-accent">Verified Facility</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-auto">
          <a href={`tel:${center.phone}`} className="flex-1">
            <Button variant="default" className="w-full gap-2 shadow-sm">
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Link 
            to={detailsUrl} 
            state={{ fromSearch: true }}
            className="flex-1"
          >
            <Button variant="outline" className="w-full gap-1 group/btn">
              Details
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
