import { Link } from "react-router-dom";
import { Scale, Info, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  computeRehabScore,
  type RehabScoreInput,
  type RehabScoreResult,
} from "@/lib/computeRehabScore";

interface RehabScorePanelProps {
  /** Facility data used to compute the score (see computeRehabScore). */
  input: RehabScoreInput;
  className?: string;
}

const TIER_LABEL: Record<RehabScoreResult["tier"], string> = {
  excellent: "Excellent",
  strong: "Strong",
  fair: "Fair",
  developing: "Developing",
};

/**
 * Maps tier → semantic token classes. Uses tokens defined in index.css /
 * tailwind.config so the panel respects light + dark themes.
 */
const TIER_COLORS: Record<
  RehabScoreResult["tier"],
  { ring: string; text: string; chip: string }
> = {
  excellent: {
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-400",
    chip: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  strong: {
    ring: "ring-primary/30",
    text: "text-primary",
    chip: "bg-primary/10 text-primary",
  },
  fair: {
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-400",
    chip: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  developing: {
    ring: "ring-muted-foreground/20",
    text: "text-muted-foreground",
    chip: "bg-muted text-muted-foreground",
  },
};

/**
 * Inline transparency panel surfacing the public Rehab Score for one
 * facility, plus per-factor breakdown and a link to the full methodology.
 *
 * Designed to be placed inside a <ProfileSection> (no card wrapper of its own).
 */
export function RehabScorePanel({ input, className }: RehabScorePanelProps) {
  const result = computeRehabScore(input);
  const colors = TIER_COLORS[result.tier];

  return (
    <div className={cn("space-y-5", className)}>
      {/* Headline: big number + tier + explainer link */}
      <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:gap-6">
        <div
          className={cn(
            "flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-background ring-4",
            colors.ring,
          )}
          aria-hidden="true"
        >
          <span className={cn("font-display text-3xl font-bold", colors.text)}>
            {result.total}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-display text-base font-bold tracking-tight text-foreground">
              Rehab Score
            </h3>
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
                colors.chip,
              )}
            >
              {TIER_LABEL[result.tier]}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            A transparent, weighted summary of this facility's verification,
            clinical depth, verified outcomes, and profile completeness.
          </p>
          <Link
            to="/rehab-score"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80"
          >
            <Info className="h-3.5 w-3.5" aria-hidden="true" />
            How the Rehab Score is calculated
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* Per-factor breakdown */}
      <ul className="space-y-3" aria-label="Rehab Score factor breakdown">
        {result.factors.map((factor) => (
          <li key={factor.key} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {factor.label}
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    {factor.weight}%
                  </span>
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                {factor.score}
                <span className="text-xs font-normal text-muted-foreground">/100</span>
              </p>
            </div>
            <div
              className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuenow={factor.score}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${factor.label}: ${factor.score} out of 100`}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-500"
                style={{ width: `${factor.score}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{factor.evidence}</p>
          </li>
        ))}
      </ul>

      {/* Footer disclosure — reinforces transparency */}
      <p className="flex items-start gap-1.5 rounded-lg bg-muted/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
        <Scale className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Paid placement, ad spend, and Pro membership <strong>never</strong>{" "}
          influence this score.{" "}
          <Link to="/rehab-score" className="text-primary hover:underline">
            Read the full methodology →
          </Link>
        </span>
      </p>
    </div>
  );
}
