import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { LocationStatTile } from "@/components/seo/LocationStatTile";
import {
  TREATMENT_THEMES,
  type TreatmentThemeKey,
} from "@/components/seo/treatmentThemes";
import { ArrowRight, Heart, Search, Building2, MapPin, Activity } from "lucide-react";

interface TreatmentHubHeroProps {
  treatmentKey: TreatmentThemeKey;
  treatmentName: string;
  treatmentIcon: ComponentType<{ className?: string }>;
  breadcrumbLabel: string;
  subtitle: string;
  facilityCount?: number;
  statesCovered?: number;
}

/**
 * TreatmentHubHero — national directory hero for the top-level
 * /treatment-types/<modality> hubs (DrugAddictionTreatment,
 * AlcoholRehabilitation, DualDiagnosisTreatment, ResidentialInpatient,
 * OutpatientPrograms, HolisticTherapy, LuxuryRehab, DetoxPrograms).
 *
 * Differentiation from the 6 archetypes already shipped:
 *   - Shares the per-modality colour palette with TreatmentStateHero
 *     so the national hub and the state-scoped variants for the same
 *     modality read as visually connected.
 *   - Eyebrow says "NATIONAL DIRECTORY" — distinguishes it from the
 *     state-level "<modality> · <state-abbr>" eyebrow.
 *   - Stat strip carries platform-wide metrics (Verified Programs,
 *     States Covered, Care Levels) — no city rail at the bottom
 *     since the national hub doesn't drill into a single state.
 *   - Hero footprint stays smaller than the State hero (py-6 md:py-8)
 *     so the State page remains the visual centerpiece.
 */
export function TreatmentHubHero({
  treatmentKey,
  treatmentName,
  treatmentIcon: Icon,
  breadcrumbLabel,
  subtitle,
  facilityCount,
  statesCovered = 50,
}: TreatmentHubHeroProps) {
  const theme = TREATMENT_THEMES[treatmentKey] ?? TREATMENT_THEMES.drug;
  return (
    <section
      className={`relative overflow-hidden border-b border-white/5 bg-gradient-to-br ${theme.gradient}`}
    >
      {/* Same subtle grid texture as TreatmentStateHero. */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA0KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-100" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,255,255,0.08),_transparent_55%)]" />

      <div className="container relative z-10 py-6 md:py-8">
        <BreadcrumbNav
          className="mb-3 [&_*]:!text-white/70 [&_a:hover]:!text-white"
          items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: breadcrumbLabel },
          ]}
        />

        <div className="max-w-3xl">
          <div
            className={`mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm ring-1 ${theme.iconBg}`}
          >
            <Icon className="h-3 w-3" />
            {treatmentName} · National Directory
          </div>
          <h1 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-white speakable-headline">
            {treatmentName} Programs
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/85 max-w-2xl">
            {subtitle}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <Link to="/concierge">
              <Button size="default" className="gap-2 w-full sm:w-auto shadow-lg shadow-black/20">
                <Heart className="h-4 w-4" />
                Get Personalized Help
              </Button>
            </Link>
            <Link to="/rehab-centers">
              <Button
                size="default"
                variant="outline"
                className="gap-2 w-full sm:w-auto border-white/30 bg-white/5 text-white hover:bg-white/15 backdrop-blur-sm"
              >
                <Search className="h-4 w-4" />
                Browse All Centers
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
            label="States Covered"
            value={statesCovered.toLocaleString()}
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
    </section>
  );
}
