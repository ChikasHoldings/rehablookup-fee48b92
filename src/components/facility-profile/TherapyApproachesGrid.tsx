import { cn } from "@/lib/utils";

const LEVELS_OF_CARE = new Set([
  "Outpatient",
  "Intensive Outpatient (IOP)",
  "Partial Hospitalization (PHP)",
  "Detoxification",
  "Sober Living",
  "Telehealth/Virtual",
  "Residential",
]);

const EVIDENCE_BASED = new Set([
  "Cognitive Behavioral Therapy (CBT)",
  "Trauma Therapy",
  "Medication-Assisted Treatment (MAT)",
  "Dual Diagnosis",
  "Family Therapy",
  "Group Therapy",
]);

function genderLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  switch (value.toLowerCase()) {
    case "male":
    case "men":
    case "men only":
      return "Men Only";
    case "female":
    case "women":
    case "women only":
      return "Women Only";
    case "all":
    case "all genders":
    case "coed":
      return "All Genders";
    default:
      return value;
  }
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm text-slate-700">
      {children}
    </span>
  );
}

function Column({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h3>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Chip key={s}>{s}</Chip>
        ))}
      </div>
    </div>
  );
}

export interface TherapyApproachesGridProps {
  services: string[];
  ageGroups: string[];
  gender: string | null | undefined;
  className?: string;
}

export function TherapyApproachesGrid({
  services,
  ageGroups,
  gender,
  className,
}: TherapyApproachesGridProps) {
  // Drop levels-of-care (rendered separately by LevelsOfCareTiles). What's
  // left is therapy approaches, modalities, and recovery supports.
  const remaining = services.filter((s) => !LEVELS_OF_CARE.has(s));
  const evidenceBased = remaining.filter((s) => EVIDENCE_BASED.has(s));
  const recoverySupports = remaining.filter((s) => !EVIDENCE_BASED.has(s));

  const gen = genderLabel(gender);
  const showDemographics = ageGroups.length > 0 || !!gen;

  if (evidenceBased.length === 0 && recoverySupports.length === 0 && !showDemographics) {
    return null;
  }

  return (
    <section className={cn("", className)} aria-labelledby="therapy-approaches-heading">
      <h2
        id="therapy-approaches-heading"
        className="mb-4 font-display text-lg font-bold tracking-tight text-slate-900"
      >
        Therapy Approaches & Programs
      </h2>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Column title="Evidence-Based Therapies" items={evidenceBased} />
          <Column title="Recovery Supports" items={recoverySupports} />
        </div>
        {showDemographics && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Who's Served
            </h3>
            <div className="flex flex-wrap gap-2">
              {ageGroups.map((a) => (
                <Chip key={`age-${a}`}>{a}</Chip>
              ))}
              {gen && <Chip>{gen}</Chip>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
