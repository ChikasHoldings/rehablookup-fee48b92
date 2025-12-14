import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Star, CheckCircle } from "lucide-react";
import { TreatmentCenter } from "@/data/treatmentCenters";
import { cn } from "@/lib/utils";

interface TreatmentCenterCardProps {
  center: TreatmentCenter;
  featured?: boolean;
}

export function TreatmentCenterCard({ center, featured }: TreatmentCenterCardProps) {
  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border bg-card transition-all duration-300 hover:shadow-lg",
        featured ? "border-accent/40" : "border-border"
      )}
    >
      {featured && (
        <div className="absolute right-3 top-3 z-10">
          <Badge className="gap-1 bg-accent text-accent-foreground border-0">
            <Star className="h-3 w-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="relative h-44 overflow-hidden bg-secondary">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <span className="font-display text-xl font-bold text-primary">
                {center.name.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
              {center.name}
            </h3>
            <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" />
              {center.city}, {center.state}
            </p>
          </div>
          <div className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1">
            <Star className="h-3.5 w-3.5 fill-primary text-primary" />
            <span className="text-sm font-semibold text-primary">{center.rating}</span>
          </div>
        </div>

        {/* Treatment Types */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {center.treatmentTypes.slice(0, 3).map((type) => (
            <Badge key={type} variant="secondary" className="text-xs font-normal">
              {type}
            </Badge>
          ))}
        </div>

        {/* Description */}
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {center.description}
        </p>

        {/* Verified Badge */}
        <div className="mb-4 flex items-center gap-2 text-xs">
          <CheckCircle className="h-4 w-4 text-accent" />
          <span className="font-medium text-accent">Verified Facility</span>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <a href={`tel:${center.phone}`} className="flex-1">
            <Button variant="default" className="w-full gap-2">
              <Phone className="h-4 w-4" />
              Call Now
            </Button>
          </a>
          <Link to={`/rehab-centers/${center.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              View Profile
            </Button>
          </Link>
        </div>
      </div>
    </article>
  );
}
