/**
 * CenterLevelsOfCare
 * ──────────────────
 * Tile grid of clinical levels of care offered by the facility. Pulls
 * from facility_services and filters to known LoC values; shows only
 * levels this facility offers. Each tile pairs the level name with a
 * one-line static blurb so users understand what each level means.
 */
import { Home, Building2, Activity, Clock, Stethoscope, Wifi, Bed } from "lucide-react";
import type { ComponentType } from "react";

interface LevelDef {
  match: RegExp;
  label: string;
  blurb: string;
  icon: ComponentType<{ className?: string }>;
}

// Order matters — first match wins so "Intensive Outpatient (IOP)" hits
// before plain "Outpatient" would.
const LEVELS: LevelDef[] = [
  {
    match: /detox/i,
    label: "Detoxification",
    blurb: "Medically supervised withdrawal, typically 3–10 days.",
    icon: Stethoscope,
  },
  {
    match: /residential/i,
    label: "Residential Treatment",
    blurb: "Live on site with 24/7 clinical support, typically 30–90 days.",
    icon: Home,
  },
  {
    match: /partial hospitalization|php/i,
    label: "Partial Hospitalization (PHP)",
    blurb: "Day program, 5–6 hrs/day, returning home evenings.",
    icon: Building2,
  },
  {
    match: /intensive outpatient|iop/i,
    label: "Intensive Outpatient (IOP)",
    blurb: "9–15 hrs/week of group + individual therapy.",
    icon: Activity,
  },
  {
    match: /^outpatient$/i,
    label: "Outpatient",
    blurb: "Weekly sessions for maintenance and continuing care.",
    icon: Clock,
  },
  {
    match: /sober living/i,
    label: "Sober Living",
    blurb: "Structured drug-free housing supporting long-term recovery.",
    icon: Bed,
  },
  {
    match: /telehealth|virtual/i,
    label: "Telehealth",
    blurb: "Remote sessions for individuals with stable home environments.",
    icon: Wifi,
  },
];

interface CenterLevelsOfCareProps {
  services: string[];
}

export function CenterLevelsOfCare({ services }: CenterLevelsOfCareProps) {
  // Match each service against the LEVELS catalog; collect unique levels
  // offered. A facility with both "IOP" and "Intensive Outpatient (IOP)"
  // strings still only renders one tile.
  const offered: LevelDef[] = [];
  const seen = new Set<string>();
  for (const def of LEVELS) {
    if (services.some((s) => def.match.test(s)) && !seen.has(def.label)) {
      offered.push(def);
      seen.add(def.label);
    }
  }
  if (offered.length === 0) return null;

  return (
    <section id="levels-of-care" className="scroll-mt-24">
      <h2 className="text-xl font-semibold text-slate-900 mb-4">Levels of Care</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {offered.map(({ label, blurb, icon: Icon }) => (
          <div
            key={label}
            className="rounded-lg border border-slate-200 bg-white p-4"
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-semibold text-slate-900">{label}</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">{blurb}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
