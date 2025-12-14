import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, CheckCircle, ArrowRight } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";

interface TreatmentCenterCardProps {
  center: TreatmentCenter & { slug?: string | null; isFromDatabase?: boolean };
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
        "group relative overflow-hidden rounded-2xl border bg-card transition-all duration-300 hover:shadow-xl hover:-translate-y-1",
        featured ? "border-accent/30 shadow-md" : "border-border shadow-card"
      )}
    >
      {featured && (
        <div className="absolute right-4 top-4 z-10">
          <Badge className="gap-1.5 bg-accent text-accent-foreground border-0 shadow-md px-3 py-1">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Image/Header Area */}
      <div className="relative h-40 overflow-hidden bg-gradient-to-br from-primary/10 via-secondary to-accent/10">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-lg">
            <span className="font-display text-2xl font-bold text-primary">
              {center.name.charAt(0)}
            </span>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
        <div className="absolute -bottom-8 -left-8 h-24 w-24 rounded-full bg-accent/10 blur-2xl" />
      </div>

      {/* Content */}
      <div className="p-5">
        {/* Header */}
        <div className="mb-3">
          <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {center.name}
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" />
            {center.city}, {center.state}
          </p>
        </div>

        {/* Rating */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-sm font-semibold text-primary">{center.rating}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {center.reviewCount} reviews
          </span>
        </div>

        {/* Treatment Types */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="secondary" className="text-xs font-normal px-2 py-0.5">
              {type}
            </Badge>
          ))}
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
          {center.description}
        </p>

        {/* Verified Badge */}
        <div className="mb-5 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-accent" />
          <span className="text-xs font-medium text-accent">Verified Facility</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a href={`tel:${center.phone}`} className="flex-1">
            <Button variant="default" className="w-full gap-2">
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
