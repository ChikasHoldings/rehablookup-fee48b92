import { Link } from "react-router-dom";
import { Info, ArrowRight, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Two-letter (or short) wordmarks for known plans. Rendered in a colored
// pill so each card has a recognizable visual anchor without depending on
// external logo URLs that change ownership and rot.
interface PlanMonogram {
  short: string;
  bg: string;
  fg: string;
  full: string;
}

const PLAN_MONOGRAMS: Record<string, PlanMonogram> = {
  Medicare: { short: "MC", bg: "bg-blue-100", fg: "text-blue-800", full: "Medicare" },
  Medicaid: { short: "MD", bg: "bg-emerald-100", fg: "text-emerald-800", full: "Medicaid" },
  Tricare: { short: "TC", bg: "bg-indigo-100", fg: "text-indigo-800", full: "Tricare" },
  Aetna: { short: "Ae", bg: "bg-violet-100", fg: "text-violet-800", full: "Aetna" },
  "Blue Cross Blue Shield": {
    short: "BC",
    bg: "bg-sky-100",
    fg: "text-sky-800",
    full: "Blue Cross Blue Shield",
  },
  Cigna: { short: "Ci", bg: "bg-orange-100", fg: "text-orange-800", full: "Cigna" },
  UnitedHealthcare: {
    short: "UH",
    bg: "bg-blue-100",
    fg: "text-blue-700",
    full: "UnitedHealthcare",
  },
  Humana: { short: "Hu", bg: "bg-green-100", fg: "text-green-800", full: "Humana" },
  "Anthem Blue Cross": {
    short: "An",
    bg: "bg-cyan-100",
    fg: "text-cyan-800",
    full: "Anthem Blue Cross",
  },
  Kaiser: { short: "Ka", bg: "bg-teal-100", fg: "text-teal-800", full: "Kaiser" },
  "Self-Pay/Private Pay": {
    short: "$",
    bg: "bg-slate-100",
    fg: "text-slate-800",
    full: "Self-Pay/Private Pay",
  },
};

function shortInitials(name: string): string {
  const letters = name
    .split(/[\s/-]+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return letters.slice(0, 2) || name.slice(0, 2).toUpperCase();
}

function planLink(name: string): string {
  return `/insurance-verification?plan=${encodeURIComponent(name)}`;
}

export interface InsuranceShowcaseProps {
  insurance: string[];
  className?: string;
}

export function InsuranceShowcase({ insurance, className }: InsuranceShowcaseProps) {
  // Sliding-scale is a callout, not a card.
  const SLIDING_SCALE = "Sliding Scale/Financial Assistance";
  const hasSliding = insurance.includes(SLIDING_SCALE);
  const plans = insurance.filter((p) => p !== SLIDING_SCALE);

  return (
    <section className={cn("", className)} aria-labelledby="insurance-heading">
      <h2
        id="insurance-heading"
        className="mb-4 font-display text-lg font-bold tracking-tight text-slate-900"
      >
        Insurance Accepted
      </h2>

      {plans.length === 0 && !hasSliding ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
          Contact the center to verify insurance coverage — major plans are typically
          accepted but verification varies by program.
        </div>
      ) : (
        <>
          {plans.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((name) => {
                const meta = PLAN_MONOGRAMS[name];
                const short = meta?.short ?? shortInitials(name);
                const bg = meta?.bg ?? "bg-slate-100";
                const fg = meta?.fg ?? "text-slate-800";
                return (
                  <div
                    key={name}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
                        bg,
                        fg,
                      )}
                      aria-hidden
                    >
                      {short}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
                      <Link
                        to={planLink(name)}
                        className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#1B365D] hover:underline"
                      >
                        Verify benefits <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {hasSliding && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" aria-hidden />
              <p>
                <span className="font-semibold">Sliding-scale fees and financial assistance</span>{" "}
                may be available. Verify cost and coverage with the center before admission.
              </p>
            </div>
          )}

          {plans.length > 0 && (
            <p className="mt-3 flex items-start gap-1.5 text-xs text-slate-500">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-hidden />
              Coverage and benefits vary by plan. Confirm with the center before admission.
            </p>
          )}
        </>
      )}
    </section>
  );
}
