import { Link } from "react-router-dom";
import { MapPin, Clock, Shield, Heart, Building2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LocalSignalsSectionProps {
  location: {
    city?: string;
    state: string;
    stateAbbr: string;
  };
  nearbyAreas?: { name: string; slug: string; facilityCount?: number }[];
  localStats?: {
    avgResponseTime?: string;
    insuranceAcceptance?: number;
    availableBeds?: string;
  };
  treatmentType?: string;
}

export function LocalSignalsSection({
  location,
  nearbyAreas = [],
  localStats,
  treatmentType,
}: LocalSignalsSectionProps) {
  const locationName = location.city 
    ? `${location.city}, ${location.stateAbbr}`
    : location.state;

  return (
    <section className="py-12 md:py-16 bg-gradient-to-b from-muted/40 to-background">
      <div className="container">
        {/* Stats Bar */}
        {localStats && (
          <div className="grid gap-4 sm:grid-cols-3 mb-10 md:mb-12">
            {localStats.avgResponseTime && (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-background border shadow-sm">
                <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{localStats.avgResponseTime}</div>
                  <div className="text-sm text-muted-foreground">Avg. Response Time</div>
                </div>
              </div>
            )}
            {localStats.insuranceAcceptance && (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-background border shadow-sm">
                <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{localStats.insuranceAcceptance}%</div>
                  <div className="text-sm text-muted-foreground">Accept Insurance</div>
                </div>
              </div>
            )}
            {localStats.availableBeds && (
              <div className="flex items-center gap-4 p-5 rounded-xl bg-background border shadow-sm">
                <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-primary/10 shrink-0">
                  <Building2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-lg font-bold text-foreground tabular-nums">{localStats.availableBeds}</div>
                  <div className="text-sm text-muted-foreground">Beds Available</div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid gap-10 lg:grid-cols-5">
          {/* Local Availability - takes more space */}
          <div className="lg:col-span-3">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">
              Treatment Availability in {locationName}
            </h2>
            <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl">
              Get connected with verified {treatmentType?.toLowerCase() || "addiction treatment"} centers 
              near you. Our network includes facilities with immediate availability.
            </p>

            <Link to="/concierge">
              <Button size="lg" className="gap-2">
                <Heart className="h-4 w-4" />
                Find Treatment Now
              </Button>
            </Link>
          </div>

          {/* Nearby Areas */}
          {nearbyAreas.length > 0 && (
            <div className="lg:col-span-2">
              <h3 className="text-lg font-bold text-foreground mb-3">
                {treatmentType || "Treatment"} in Nearby Areas
              </h3>
              
              <div className="grid gap-2.5">
                {nearbyAreas.slice(0, 8).map((area) => (
                  <Link
                    key={area.slug}
                    to={area.slug}
                    className="group flex items-center justify-between p-3.5 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-2.5">
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                        {area.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {area.facilityCount !== undefined && (
                        <span className="text-xs text-muted-foreground">
                          {area.facilityCount} centers
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
