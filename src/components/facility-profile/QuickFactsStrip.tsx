import { Building2, Users, CreditCard, UserCircle2, CalendarDays } from "lucide-react";
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

function joinWithOverflow(values: string[], max = 3): string {
  if (values.length === 0) return "";
  const shown = values.slice(0, max);
  const extra = values.length - shown.length;
  return extra > 0 ? `${shown.join(", ")} +${extra}` : shown.join(", ");
}

export interface QuickFactsStripProps {
  services: string[];
  ageGroups: string[];
  insurance: string[];
  gender: string | null | undefined;
  yearEstablished: number | null | undefined;
  className?: string;
}

interface Fact {
  Icon: typeof Building2;
  label: string;
  value: string;
}

export function QuickFactsStrip({
  services,
  ageGroups,
  insurance,
  gender,
  yearEstablished,
  className,
}: QuickFactsStripProps) {
  const levels = services.filter((s) => LEVELS_OF_CARE.has(s));
  const gen = genderLabel(gender);

  const facts: Fact[] = [];
  if (levels.length > 0) {
    facts.push({ Icon: Building2, label: "Level of Care", value: joinWithOverflow(levels, 3) });
  }
  if (ageGroups.length > 0) {
    facts.push({ Icon: Users, label: "Ages Served", value: joinWithOverflow(ageGroups, 3) });
  }
  if (insurance.length > 0) {
    facts.push({ Icon: CreditCard, label: "Insurance Accepted", value: joinWithOverflow(insurance, 3) });
  }
  if (gen) {
    facts.push({ Icon: UserCircle2, label: "Gender Served", value: gen });
  }
  if (yearEstablished && yearEstablished > 1800) {
    facts.push({ Icon: CalendarDays, label: "Established", value: String(yearEstablished) });
  }

  if (facts.length === 0) return null;

  return (
    <section
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className,
      )}
      aria-label="Facility quick facts"
    >
      <div className="grid grid-cols-1 divide-y divide-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:grid-cols-3 lg:grid-cols-5">
        {facts.map(({ Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3 p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#1B365D]/10">
              <Icon className="h-4 w-4 text-[#1B365D]" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {label}
              </p>
              <p className="mt-0.5 text-sm font-semibold text-slate-900 break-words">{value}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
