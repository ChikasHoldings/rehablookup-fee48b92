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
    <section className="py-10 bg-muted/30 border-y">
      <div className="container">
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Local Availability */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-4">
              Treatment Availability in {locationName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Get connected with verified {treatmentType?.toLowerCase() || "addiction treatment"} centers 
              near you. Our network includes facilities with immediate availability.
            </p>
            
            {localStats && (
              <div className="grid gap-4 sm:grid-cols-3">
                {localStats.avgResponseTime && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <Clock className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">{localStats.avgResponseTime}</div>
                      <div className="text-sm text-muted-foreground">Avg. Response Time</div>
                    </div>
                  </div>
                )}
                {localStats.insuranceAcceptance && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <Shield className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">{localStats.insuranceAcceptance}%</div>
                      <div className="text-sm text-muted-foreground">Accept Insurance</div>
                    </div>
                  </div>
                )}
                {localStats.availableBeds && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                    <Building2 className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <div className="font-semibold text-foreground">{localStats.availableBeds}</div>
                      <div className="text-sm text-muted-foreground">Beds Available</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6">
              <Link to="/concierge">
                <Button className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
            </div>
          </div>

          {/* Nearby Areas */}
          {nearbyAreas.length > 0 && (
            <div>
              <h2 className="text-xl font-bold text-foreground mb-4">
                {treatmentType || "Treatment"} in Nearby Areas
              </h2>
              <p className="text-muted-foreground mb-4">
                Explore treatment options in surrounding areas for more choices.
              </p>
              
              <div className="grid gap-2 sm:grid-cols-2">
                {nearbyAreas.slice(0, 8).map((area) => (
                  <Link
                    key={area.slug}
                    to={area.slug}
                    className="group flex items-center justify-between p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium text-foreground group-hover:text-primary">
                        {area.name}
                      </span>
                    </div>
                    {area.facilityCount !== undefined && (
                      <span className="text-xs text-muted-foreground">
                        {area.facilityCount} centers
                      </span>
                    )}
                    <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:text-primary transition-all" />
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
