import { Link } from "react-router-dom";
import { Globe, MapPin } from "lucide-react";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";

/**
 * Listings whose owners turned on "Accepts international patients" in the
 * provider portal. Provider-reported; renders nothing until at least one
 * listing has opted in, so the page never shows an empty or padded list.
 */
export function InternationalFacilitiesSection({ limit = 24 }: { limit?: number }) {
  const { data: facilities = [] } = useStaticFacilities();
  const list = facilities
    .filter((f) => f.acceptsInternationalPatients === true && !!f.slug)
    .sort(
      (a, b) =>
        Number(!!b.isPro) - Number(!!a.isPro) ||
        (b.calculatedRankingScore ?? 0) - (a.calculatedRankingScore ?? 0) ||
        a.name.localeCompare(b.name),
    )
    .slice(0, limit);

  if (list.length === 0) return null;

  return (
    <section className="py-10 md:py-12 bg-background" aria-labelledby="intl-facilities-heading">
      <div className="container mx-auto px-4 max-w-6xl">
        <h2 id="intl-facilities-heading" className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" aria-hidden="true" />
          Facilities that accept international patients
        </h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-3xl">
          Each facility below told us it admits patients who travel from outside the US. RehabLookup does not
          arrange admission or travel: contact the facility about its admission letter, payment and arrival
          details.
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <li key={f.id} className="rounded-lg border border-border bg-card p-4">
              <Link to={`/center/${f.slug}`} className="font-semibold text-foreground hover:text-primary">
                {f.name}
              </Link>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                {f.city}, {f.state}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
