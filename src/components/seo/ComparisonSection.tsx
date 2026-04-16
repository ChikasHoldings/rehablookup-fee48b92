import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Minus, ArrowRight } from "lucide-react";
import type { TreatmentCenter } from "@/data/treatmentCenters";

interface ComparisonSectionProps {
  facilities: (TreatmentCenter & { slug?: string | null; isPro?: boolean; verified?: boolean | null })[];
  location?: string;
}

const featureLabels = [
  "Detox Available",
  "Inpatient",
  "Outpatient",
  "Insurance Accepted",
  "Verified Credentials",
];

function hasFeature(f: any, feature: string): boolean {
  const types = (f.treatmentTypes || []).map((t: string) => t.toLowerCase());
  const insurance = (f.insuranceAccepted || []);
  switch (feature) {
    case "Detox Available": return types.some((t: string) => t.includes("detox"));
    case "Inpatient": return types.some((t: string) => t.includes("inpatient") || t.includes("residential"));
    case "Outpatient": return types.some((t: string) => t.includes("outpatient"));
    case "Insurance Accepted": return insurance.length > 0;
    case "Verified Credentials": return f.verified || f.featured || false;
    default: return false;
  }
}

export function ComparisonSection({ facilities, location }: ComparisonSectionProps) {
  const topFacilities = facilities.slice(0, 3);
  if (topFacilities.length < 2) return null;

  return (
    <section className="py-12 bg-muted/30">
      <div className="container max-w-5xl">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-foreground">
            Compare Top Centers{location ? ` in ${location}` : ""}
          </h2>
          <p className="mt-2 text-muted-foreground">
            See how leading treatment programs compare side-by-side.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-card rounded-xl border overflow-hidden">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left text-sm font-semibold text-foreground p-4 w-1/4">Feature</th>
                {topFacilities.map((f) => (
                  <th key={f.id} className="text-center text-sm font-semibold text-foreground p-4">
                    <div className="truncate max-w-[140px] mx-auto">{f.name}</div>
                    <div className="text-xs font-normal text-muted-foreground mt-0.5">{f.city}, {f.state}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureLabels.map((feature) => (
                <tr key={feature} className="border-b last:border-0">
                  <td className="text-sm text-foreground p-4 font-medium">{feature}</td>
                  {topFacilities.map((f) => (
                    <td key={f.id} className="text-center p-4">
                      {hasFeature(f, feature) ? (
                        <CheckCircle className="h-5 w-5 text-accent mx-auto" />
                      ) : (
                        <Minus className="h-5 w-5 text-muted-foreground/40 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <td className="p-4" />
                {topFacilities.map((f) => (
                  <td key={f.id} className="text-center p-4">
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to={f.slug ? `/center/${f.slug}` : `/rehab-centers`}>
                        View Details <ArrowRight className="h-3 w-3" />
                      </Link>
                    </Button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
