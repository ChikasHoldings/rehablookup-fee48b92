import {
  Heart,
  Activity,
  Clock,
  Stethoscope,
  Home,
  Video,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LevelMeta {
  Icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  blurb: string;
}

const LEVEL_META: Record<string, LevelMeta> = {
  Residential: {
    Icon: Heart,
    iconColor: "text-rose-600",
    iconBg: "bg-rose-50",
    blurb: "Live on-site with 24/7 clinical support, typically 30-90 days.",
  },
  "Intensive Outpatient (IOP)": {
    Icon: Activity,
    iconColor: "text-emerald-600",
    iconBg: "bg-emerald-50",
    blurb: "9-15 hours per week of structured programming, evenings often available.",
  },
  "Partial Hospitalization (PHP)": {
    Icon: Activity,
    iconColor: "text-amber-600",
    iconBg: "bg-amber-50",
    blurb: "Full-day clinical care with return home each evening.",
  },
  Outpatient: {
    Icon: Clock,
    iconColor: "text-sky-600",
    iconBg: "bg-sky-50",
    blurb: "Flexible scheduling for therapy and counseling while living at home.",
  },
  Detoxification: {
    Icon: Stethoscope,
    iconColor: "text-violet-600",
    iconBg: "bg-violet-50",
    blurb: "Medically supervised withdrawal, typically 5-10 days.",
  },
  "Sober Living": {
    Icon: Home,
    iconColor: "text-teal-600",
    iconBg: "bg-teal-50",
    blurb: "Structured, peer-supported residence after primary treatment.",
  },
  "Telehealth/Virtual": {
    Icon: Video,
    iconColor: "text-indigo-600",
    iconBg: "bg-indigo-50",
    blurb: "Therapy and recovery support delivered remotely.",
  },
};

// Render in a stable, clinically meaningful order rather than the order the
// rows happened to come back from `facility_services`. Detox → Residential →
// PHP → IOP → Outpatient → Sober Living → Telehealth mirrors the typical
// continuum-of-care progression.
const LEVEL_ORDER: string[] = [
  "Detoxification",
  "Residential",
  "Partial Hospitalization (PHP)",
  "Intensive Outpatient (IOP)",
  "Outpatient",
  "Sober Living",
  "Telehealth/Virtual",
];

export interface LevelsOfCareTilesProps {
  services: string[];
  className?: string;
}

export function LevelsOfCareTiles({ services, className }: LevelsOfCareTilesProps) {
  const present = new Set(services);
  const levels = LEVEL_ORDER.filter((l) => present.has(l));
  if (levels.length === 0) return null;

  return (
    <section className={cn("", className)} aria-labelledby="levels-of-care-heading">
      <h2
        id="levels-of-care-heading"
        className="mb-4 font-display text-lg font-bold tracking-tight text-slate-900"
      >
        Levels of Care
      </h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        {levels.map((level) => {
          const meta = LEVEL_META[level];
          if (!meta) return null;
          const { Icon, iconColor, iconBg, blurb } = meta;
          return (
            <div
              key={level}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg",
                  iconBg,
                )}
                aria-hidden
              >
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>
              <p className="mt-3 text-base font-semibold text-slate-900">{level}</p>
              <p className="mt-1 text-sm text-slate-600">{blurb}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
