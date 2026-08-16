import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Scale, Search, ArrowRight, CheckCircle, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileDirectoryCTACardProps {
  className?: string;
  compact?: boolean;
  /** Facility's city, used to seed the "similar centers nearby" search. */
  city?: string | null;
  /** Facility's state, used to seed the "similar centers nearby" search. */
  state?: string | null;
}

/**
 * Sidebar card on the public facility profile pointing at the two things a
 * directory can actually do next: keep looking nearby, or line this facility
 * up against others.
 *
 * Replaces ConciergeCTACard (directory cutover stage 1), which sold a
 * RehabLookup placement service — personalized recommendations, insurance
 * verification, tour coordination — that the platform no longer operates.
 */
export function ProfileDirectoryCTACard({
  className,
  compact = false,
  city,
  state,
}: ProfileDirectoryCTACardProps) {
  const locationLabel = [city, state].filter(Boolean).join(", ");
  const nearbyHref = locationLabel
    ? `/search-results?location=${encodeURIComponent(locationLabel)}`
    : "/search-results";

  return (
    <div
      className={cn(
        "rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5 p-5 shadow-sm overflow-hidden relative",
        className
      )}
    >
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10" />

      <div className="relative">
        <div className={cn("flex items-start gap-3", compact ? "mb-3" : "mb-4")}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 shadow-md shrink-0">
            <Scale className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className={cn("font-display font-bold text-foreground", compact ? "text-sm" : "text-base")}>
              Weighing your options?
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {locationLabel ? `See other centers near ${locationLabel}` : "See other centers in the directory"}
            </p>
          </div>
        </div>

        {!compact && (
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Filter by level of care and insurance</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Compare facilities side by side</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span>Save listings to revisit later</span>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Link to={nearbyHref}>
            <Button
              size={compact ? "sm" : "default"}
              className={cn("w-full gap-2 font-semibold shadow-md group", compact ? "h-9" : "h-11")}
            >
              <Search className="h-4 w-4" />
              Search nearby centers
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
          </Link>
          <Link to="/compare">
            <Button
              size={compact ? "sm" : "default"}
              variant="outline"
              className={cn("w-full gap-2 font-semibold", compact ? "h-9" : "h-11")}
            >
              <MapPin className="h-4 w-4" />
              Compare facilities
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground mt-3">
          Free to browse — contact any facility directly.
        </p>
      </div>
    </div>
  );
}
