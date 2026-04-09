import { Link } from "react-router-dom";
import { statesData } from "@/data/locationSeoData";
import { ArrowRight } from "lucide-react";

interface CityLinkGridProps {
  stateSlug: string;
  treatmentType?: "detox" | "inpatient" | "outpatient" | "dual-diagnosis" | "general";
  title?: string;
  className?: string;
}

export function CityLinkGrid({
  stateSlug,
  treatmentType = "general",
  title,
  className = "",
}: CityLinkGridProps) {
  const state = statesData.find((s) => s.slug === stateSlug);
  
  if (!state || !state.cities.length) return null;

  const getHref = (citySlug: string) => {
    switch (treatmentType) {
      case "detox":
        return `/treatment-types/detox-programs/${stateSlug}/${citySlug}`;
      case "inpatient":
        return `/treatment-types/residential-inpatient/${stateSlug}/${citySlug}`;
      case "outpatient":
        return `/treatment-types/outpatient-programs/${stateSlug}/${citySlug}`;
      case "dual-diagnosis":
        return `/treatment-types/dual-diagnosis-treatment/${stateSlug}/${citySlug}`;
      default:
        return `/rehab-centers/${stateSlug}/${citySlug}`;
    }
  };

  const getTreatmentLabel = () => {
    switch (treatmentType) {
      case "detox":
        return "Detox Centers";
      case "inpatient":
        return "Inpatient Rehab";
      case "outpatient":
        return "Outpatient Programs";
      case "dual-diagnosis":
        return "Dual Diagnosis Treatment";
      default:
        return "Rehab Centers";
    }
  };

  return (
    <section className={`py-8 ${className}`}>
      <h3 className="text-xl font-semibold text-foreground mb-6">
        {title || `${getTreatmentLabel()} in ${state.name} Cities`}
      </h3>
      <div className="flex flex-wrap gap-2">
        {state.cities.map((city) => (
          <Link
            key={city.slug}
            to={getHref(city.slug)}
            className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3.5 py-1.5 text-sm font-medium text-foreground transition-all hover:border-primary hover:bg-primary/10 hover:text-primary hover:shadow-sm"
          >
            <ArrowRight className="h-3 w-3 text-primary/70" />
            {city.name}
          </Link>
        ))}
      </div>
    </section>
  );
}

// Cross-linking component for other states
interface NearbyStatesProps {
  currentStateSlug: string;
  treatmentType?: string;
  className?: string;
}

export function NearbyStatesLinks({
  currentStateSlug,
  treatmentType,
  className = "",
}: NearbyStatesProps) {
  // Map of neighboring states
  const neighboringStates: Record<string, string[]> = {
    california: ["arizona", "nevada", "oregon"],
    texas: ["louisiana", "new-mexico", "oklahoma", "arkansas"],
    florida: ["georgia", "alabama"],
    "new-york": ["new-jersey", "connecticut", "pennsylvania", "massachusetts"],
    arizona: ["california", "nevada", "new-mexico", "colorado"],
    colorado: ["arizona", "new-mexico", "utah", "wyoming", "kansas", "nebraska"],
    illinois: ["indiana", "wisconsin", "iowa", "missouri"],
    pennsylvania: ["new-york", "new-jersey", "ohio", "maryland"],
    ohio: ["pennsylvania", "michigan", "indiana", "kentucky"],
    georgia: ["florida", "alabama", "tennessee", "south-carolina"],
    "new-jersey": ["new-york", "pennsylvania", "delaware"],
    massachusetts: ["new-york", "connecticut", "rhode-island", "new-hampshire"],
    washington: ["oregon", "idaho"],
    michigan: ["ohio", "indiana", "wisconsin"],
    virginia: ["maryland", "north-carolina", "west-virginia", "kentucky"],
  };

  const neighbors = neighboringStates[currentStateSlug] || [];
  const nearbyStates = statesData.filter((s) => neighbors.includes(s.slug)).slice(0, 5);

  if (nearbyStates.length === 0) return null;

  const getHref = (stateSlug: string) => {
    if (treatmentType) {
      return `/treatment-types/${treatmentType}/${stateSlug}`;
    }
    return `/rehab-centers/${stateSlug}`;
  };

  return (
    <div className={`${className}`}>
      <h4 className="text-sm font-semibold text-foreground mb-3">
        Treatment in Nearby States
      </h4>
      <ul className="space-y-2">
        {nearbyStates.map((state) => (
          <li key={state.slug}>
            <Link
              to={getHref(state.slug)}
              className="text-sm text-muted-foreground hover:text-primary transition-colors"
            >
              {state.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
