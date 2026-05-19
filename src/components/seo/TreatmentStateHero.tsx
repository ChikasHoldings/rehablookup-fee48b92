import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import { ArrowRight, Heart, MapPin, Search, Activity, Building2 } from "lucide-react";

/**
 * Topic colour palette → hero gradient tokens. Each treatment
 * modality gets its own colour so the network of treatment-state
 * pages doesn't feel templated. The directory shell stays consistent
 * (eyebrow + stat strip + city chip rail at the bottom); only the
 * gradient tail and accent ring shift per modality.
 *
 * Keep these palettes Tailwind-arbitrary so we don't need to extend
 * the theme — the colour values are stable across versions.
 */
const TREATMENT_THEMES: Record<
  string,
  { gradient: string; accent: string; iconBg: string }
> = {
  alcohol: {
    gradient: "from-teal-950 via-teal-900/85 to-cyan-700/60",
    accent: "from-teal-500 to-cyan-500",
    iconBg: "bg-teal-500/20 ring-teal-300/25",
  },
  drug: {
    gradient: "from-slate-950 via-primary/85 to-primary/60",
    accent: "from-primary to-primary",
    iconBg: "bg-primary/20 ring-primary/25",
  },
  dual: {
    gradient: "from-slate-950 via-violet-900/80 to-fuchsia-700/55",
    accent: "from-violet-500 to-fuchsia-500",
    iconBg: "bg-violet-500/20 ring-violet-300/25",
  },
  inpatient: {
    gradient: "from-slate-950 via-indigo-900/80 to-indigo-600/55",
    accent: "from-indigo-500 to-indigo-400",
    iconBg: "bg-indigo-500/20 ring-indigo-300/25",
  },
  outpatient: {
    gradient: "from-slate-950 via-emerald-900/80 to-emerald-600/55",
    accent: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-500/20 ring-emerald-300/25",
  },
  detox: {
    gradient: "from-slate-950 via-sky-900/85 to-sky-600/55",
    accent: "from-sky-500 to-cyan-500",
    iconBg: "bg-sky-500/20 ring-sky-300/25",
  },
  holistic: {
    gradient: "from-slate-950 via-emerald-900/75 to-lime-700/50",
    accent: "from-emerald-500 to-lime-500",
    iconBg: "bg-emerald-500/20 ring-emerald-300/25",
  },
};

export type TreatmentThemeKey = keyof typeof TREATMENT_THEMES;

interface TreatmentStateHeroProps {
  /** Topic key — drives the colour theme. */
  treatmentKey: TreatmentThemeKey;
  /** Display name of the treatment modality (e.g. "Alcohol Rehab"). */
  treatmentName: string;
  /** Topic-themed icon — rendered in the eyebrow. */
  treatmentIcon: ComponentType<{ className?: string }>;
  /** Full state name. */
  stateName: string;
  /** Two-letter abbreviation. */
  abbreviation: string;
  /** Slug used for inbound link building. */
  stateSlug: string;
  /** Hub link (e.g., /treatment-types/alcohol-rehabilitation). */
  treatmentHubHref: string;
  /** Breadcrumb label for the treatment hub. */
  treatmentHubLabel: string;
  /** Cities to render in the bottom rail. */
  cities: Array<{ slug: string; name: string }>;
  /** Optional facility count to show in the stat strip. */
  facilityCount?: number;
}

/**
 * TreatmentStateHero — topic-led directory hero used by every
 * /treatment-types/<modality>/<state> page (StateAlcoholRehab,
 * StateDrugAddiction, StateDualDiagnosis, StateInpatientRehab,
 * StateOutpatientPrograms, StateDetoxPrograms, …).
 *
 * Differentiation from State / City / County heroes:
 *   - NO photo (modality is the protagonist, not the place)
 *   - Per-modality colour gradient (alcohol = teal, dual = violet, …)
 *   - Eyebrow lists the modality, H1 the modality + state
 *   - Stats focus on the topic (Programs, Cities, Levels of care)
 *   - Bottom rail offers CITIES in the state (not care levels) so the
 *     seeker drills into a specific city for the same modality
 */
export function TreatmentStateHero({
  treatmentKey,
  treatmentName,
  treatmentIcon: Icon,
  stateName,
  abbreviation,
  stateSlug,
  treatmentHubHref,
  treatmentHubLabel,
  cities,
  facilityCount,
}: TreatmentStateHeroProps) {
  const theme = TREATMENT_THEMES[treatmentKey] ?? TREATMENT_THEMES.drug;
  return (
    <>
      <section
        className={`relative overflow-hidden border-b border-white/5 bg-gradient-to-br ${theme.gradient}`}
      >
        {/* Subtle grid texture — keeps the topic-led hero visually
            different from the city/state photo hero without
            introducing a real image. */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_55%)]" />

        <div className="container relative z-10 py-6 md:py-9">
          <BreadcrumbNav
            className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: treatmentHubLabel, href: treatmentHubHref },
              { label: stateName },
            ]}
          />

          <div className="max-w-3xl">
            <div
              className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ${theme.iconBg}`}
            >
              <Icon className="h-3 w-3" />
              {treatmentName} · {abbreviation}
            </div>
            <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white">
              {treatmentName} in {stateName}
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">
              Verified {treatmentName.toLowerCase()} programs across {stateName} · {cities.length}+ cities
            </p>
            <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
              <Link to="/concierge">
                <Button size="default" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                  <Heart className="h-4 w-4" />
                  Get Personalized Help
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}`}>
                <Button
                  size="default"
                  variant="outline"
                  className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
                >
                  <Search className="h-4 w-4" />
                  Browse {abbreviation}
                </Button>
              </Link>
            </div>
          </div>

          {/* Stat strip — topic-focused metrics. Smaller `size="sm"`
              variant so the strip stays within the tight hero
              footprint that's distinct from the State page hero. */}
          <div className="mt-5 hidden md:grid grid-cols-3 gap-2 max-w-3xl">
            <LocationStatTile
              size="sm"
              label={facilityCount === 1 ? "Verified Program" : "Verified Programs"}
              value={facilityCount === undefined ? "—" : facilityCount.toLocaleString()}
              icon={Building2}
            />
            <LocationStatTile
              size="sm"
              label="Cities Covered"
              value={cities.length.toLocaleString()}
              icon={MapPin}
            />
            <LocationStatTile
              size="sm"
              label="Care Levels"
              value="Detox → Aftercare"
              icon={Activity}
            />
          </div>
        </div>

        {/* City rail at the bottom — directory hallmark for treatment
            pages. Differentiates from the care-level rail used on
            state/city/county pages: those drill the care level, this
            drills the city for the same modality. */}
        {cities.length > 0 && (
          <div className="relative z-10 border-t border-white/10 bg-black/30 backdrop-blur-sm">
            <div className="container py-3">
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
                <span className="shrink-0 text-xs font-medium uppercase tracking-wider text-white/60 mr-1">
                  By city:
                </span>
                {cities.slice(0, 12).map((city) => (
                  <Link
                    key={city.slug}
                    to={`${treatmentHubHref}/${stateSlug}/${city.slug}`}
                    className="shrink-0 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white/90 ring-1 ring-white/15 transition hover:bg-white/20 hover:text-white"
                  >
                    {city.name}
                  </Link>
                ))}
                {cities.length > 12 && (
                  <Link
                    to={`/rehab-centers/${stateSlug}`}
                    className="shrink-0 rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/70 ring-1 ring-white/10 transition hover:bg-white/15 hover:text-white inline-flex items-center gap-1"
                  >
                    +{cities.length - 12} more <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Mobile-only compact stat band */}
      <section className="md:hidden border-b bg-secondary/40">
        <div className="container py-4">
          <div className="grid grid-cols-3 gap-2">
            <LocationStatTile
              label="Programs"
              value={facilityCount === undefined ? "—" : facilityCount.toLocaleString()}
              icon={Building2}
              compact
            />
            <LocationStatTile
              label="Cities"
              value={cities.length.toLocaleString()}
              icon={MapPin}
              compact
            />
            <LocationStatTile
              label="State"
              value={abbreviation}
              icon={Activity}
              compact
            />
          </div>
        </div>
      </section>
    </>
  );
}
