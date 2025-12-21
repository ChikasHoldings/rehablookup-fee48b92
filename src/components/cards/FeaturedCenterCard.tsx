import { Link } from "react-router-dom";
import { MapPin, Star, Shield, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FeaturedCenterCardProps {
  center: {
    id: string;
    name: string;
    city: string;
    state: string;
    logo_url?: string | null;
    facility_type?: string;
    verified?: boolean;
    featured?: boolean;
    slug?: string | null;
    insurance?: string[];
  };
}

export function FeaturedCenterCard({ center }: FeaturedCenterCardProps) {
  const hasInsurance = center.insurance && center.insurance.length > 0;
  const profileUrl = center.slug ? `/treatment/${center.slug}` : `/center/${center.id}`;

  return (
    <Link to={profileUrl} className="group block">
      <div className="relative flex items-center gap-4 rounded-xl border border-border/60 bg-card p-4 transition-all duration-300 hover:border-primary/40 hover:shadow-md hover:bg-accent/5 min-w-[320px] max-w-[360px]">
        {/* Logo/Avatar */}
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
          {center.logo_url ? (
            <img
              src={center.logo_url}
              alt={center.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
              <span className="text-lg font-bold text-primary">
                {center.name.charAt(0)}
              </span>
            </div>
          )}
          {center.verified && (
            <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Shield className="h-3 w-3" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-semibold text-foreground text-sm leading-tight truncate group-hover:text-primary transition-colors">
              {center.name}
            </h3>
            {center.featured && (
              <Star className="h-3.5 w-3.5 shrink-0 text-accent fill-accent" />
            )}
          </div>
          
          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{center.city}, {center.state}</span>
          </div>

          <div className="mt-2 flex items-center gap-1.5 flex-wrap">
            {center.facility_type && (
              <Badge variant="outline" className="px-2 py-0 text-[10px] font-medium border-border/60 text-muted-foreground">
                {center.facility_type}
              </Badge>
            )}
            {hasInsurance && (
              <Badge variant="secondary" className="gap-1 px-2 py-0 text-[10px] font-medium bg-purple-100 text-purple-700 border-0">
                <CreditCard className="h-2.5 w-2.5" />
                Insurance
              </Badge>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
