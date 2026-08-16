import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import { getCityImage } from "@/data/locationImages";
import {
  TREATMENT_THEMES,
  type TreatmentThemeKey,
} from "@/components/seo/treatmentThemes";
import { ArrowRight, Scale, MapPin, Search, Building2 } from "lucide-react";

interface TreatmentCityHeroProps {
  treatmentKey: TreatmentThemeKey;
  treatmentName: string;
  treatmentIcon: ComponentType<{ className?: string }>;
  cityName: string;
  stateName: string;
  abbreviation: string;
  stateSlug: string;
  citySlug: string;
  treatmentHubHref: string;
  treatmentHubLabel: string;
  facilityCount?: number;
}

/**
 * TreatmentCityHero — city-scoped directory hero for the 6
 * /treatment-types/<modality>/<state>/<city> pages. Pairs the
 * per-modality colour palette from TREATMENT_THEMES with a
 * city photo (when one is on file in locationImages.ts) so the
 * page reads as both topic-led AND location-grounded.
 *
 * Smaller than the State hero per the brief (py-6 md:py-9).
 * Bottom rail offers SIBLING city links via the parent state's
 * directory.
 */
export function TreatmentCityHero({
  treatmentKey,
  treatmentName,
  treatmentIcon: Icon,
  cityName,
  stateName,
  abbreviation,
  stateSlug,
  citySlug,
  treatmentHubHref,
  treatmentHubLabel,
  facilityCount,
}: TreatmentCityHeroProps) {
  const theme = TREATMENT_THEMES[treatmentKey] ?? TREATMENT_THEMES.drug;
  const heroImage = getCityImage(stateSlug, citySlug);

  return (
    <section
      className={`relative overflow-hidden border-b border-white/5 bg-gradient-to-br ${theme.gradient}`}
    >
      {heroImage && (
        <img
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover opacity-25"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
      )}
      <div className="absolute inset-0 bg-slate-950/40" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <div className="container relative z-10 py-6 md:py-9">
        <BreadcrumbNav
          className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
          items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: treatmentHubLabel, href: treatmentHubHref },
            { label: stateName, href: `${treatmentHubHref}/${stateSlug}` },
            { label: cityName },
          ]}
        />

        <div className="max-w-3xl">
          <div
            className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ${theme.iconBg}`}
          >
            <Icon className="h-3 w-3" />
            {treatmentName} · {cityName}, {abbreviation}
          </div>
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white">
            {treatmentName} in {cityName}
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">
            Verified {treatmentName.toLowerCase()} programs in {cityName}, {abbreviation}. Compare facilities, insurance, and admission times.
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
              <Button size="default" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                <Search className="h-4 w-4" />
                Browse {cityName}
              </Button>
            </Link>
            <Link to="/compare">
              <Button
                size="default"
                variant="outline"
                className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
              >
                <Scale className="h-4 w-4" />
                Compare Facilities
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 hidden md:grid grid-cols-3 gap-2 max-w-3xl">
          <LocationStatTile
            size="sm"
            label={facilityCount === 1 ? "Verified Program" : "Verified Programs"}
            value={facilityCount === undefined ? "—" : facilityCount.toLocaleString()}
            icon={Building2}
          />
          <LocationStatTile
            size="sm"
            label="Location"
            value={`${cityName}, ${abbreviation}`}
            icon={MapPin}
          />
          <LocationStatTile
            size="sm"
            label="More from State"
            value={`${abbreviation} Directory`}
            icon={ArrowRight}
          />
        </div>
      </div>
    </section>
  );
}
