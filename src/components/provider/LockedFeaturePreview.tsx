import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Sparkles, ArrowRight, ShieldCheck, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LockedFeaturePreviewProps {
  /** Short headline shown above the value statement, e.g. "Featured Placements". */
  title: string;
  /** One-line subtitle describing what the feature does. */
  subtitle: string;
  /** A two-to-three sentence pitch: what value the feature delivers. */
  valueStatement: ReactNode;
  /** Bulleted list of concrete benefits the upgrade unlocks. Optional. */
  bullets?: string[];
  /** Where the CTA navigates. Defaults to /provider/billing?upgrade=pro. */
  ctaTo?: string;
  /** Label on the upgrade button. Defaults to "Upgrade to Pro". */
  ctaLabel?: string;
  /** Optional secondary action — e.g. "See pricing", links to /for-providers. */
  secondaryAction?: { label: string; to: string };
  /**
   * Optional small-print line below the pitch. Used to state a factual
   * prerequisite or limitation without turning it into sales copy — e.g. that
   * Featured checkout currently requires Pro because of the billing
   * integration, not because Featured is a Pro benefit.
   */
  footnote?: string;
  /**
   * The preview content (a sample / blurred version of the real feature
   * UI). Will be rendered with `pointer-events: none` so no element
   * inside it is clickable, and labeled with a sticky PREVIEW badge so
   * the provider can never mistake it for real data.
   */
  children: ReactNode;
  /**
   * Plan tier the feature lives on. Drives the badge copy.
   *
   * The retired "concierge" tier was removed — no provider-facing surface may
   * badge a feature as a Concierge add-on.
   */
  tier?: "pro" | "verified" | "featured";
  /**
   * When true, applies a CSS blur to the preview content. Default
   * false — most preview content is realistic enough without blur.
   * Use blur when the preview shows actual sample numbers / data
   * shapes that might look real.
   */
  blur?: boolean;
}

const TIER_COPY: Record<NonNullable<LockedFeaturePreviewProps["tier"]>, { label: string; icon: typeof Lock }> = {
  pro:      { label: "Pro feature",         icon: Sparkles },
  verified: { label: "Verified facilities", icon: ShieldCheck },
  // Featured is advertising sold separately from Pro — "add-on" here means a
  // separately-billed product, never an included Pro entitlement.
  featured: { label: "Featured advertising", icon: Megaphone },
};

/**
 * Canonical "Free provider sees the feature in a locked preview" wrapper.
 *
 * Renders:
 *   • A top banner with the feature title + value statement + Upgrade CTA
 *   • The provided preview children, made inert (pointer-events: none),
 *     overlaid with a clear "PREVIEW" badge
 *   • A sticky-bottom Upgrade CTA so the user never has to scroll to act
 *
 * Server-side enforcement is the source of truth — this component is a
 * UI affordance only. RLS / SECURITY DEFINER RPCs guarantee that even a
 * Free provider hitting the API directly cannot read or mutate Pro data.
 */
export function LockedFeaturePreview({
  title,
  subtitle,
  valueStatement,
  bullets,
  ctaTo = "/provider/billing?upgrade=pro",
  ctaLabel = "Upgrade to Pro",
  secondaryAction,
  footnote,
  children,
  tier = "pro",
  blur = false,
}: LockedFeaturePreviewProps) {
  const tierMeta = TIER_COPY[tier];
  const TierIcon = tierMeta.icon;

  return (
    <div className="space-y-5">
      {/* Pitch card — title + value + CTA */}
      <div className="rounded-lg border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 sm:p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-amber-100 text-amber-900 border-amber-300 gap-1">
                <TierIcon className="h-3 w-3" aria-hidden />
                {tierMeta.label}
              </Badge>
              <Badge variant="outline" className="text-[10px] gap-1">
                <Lock className="h-2.5 w-2.5" aria-hidden />
                Locked
              </Badge>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900">{title}</h2>
              <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>
            </div>
            <div className="text-sm leading-relaxed text-slate-700">
              {valueStatement}
            </div>
            {bullets && bullets.length > 0 && (
              <ul className="space-y-1.5 text-sm text-slate-700">
                {bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" aria-hidden />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {footnote && (
              <p className="text-xs leading-relaxed text-slate-500 border-t border-amber-200/60 pt-2.5">
                {footnote}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 sm:items-end shrink-0">
            <Button asChild className="bg-[#1B365D] hover:bg-[#142a4a] gap-1.5">
              <Link to={ctaTo}>
                {ctaLabel}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            {secondaryAction && (
              <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1">
                <Link to={secondaryAction.to}>{secondaryAction.label}</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Preview content — inert + clearly marked */}
      <div className="relative">
        <div className="absolute right-3 top-3 z-10 pointer-events-none">
          <Badge variant="outline" className="bg-slate-900/85 text-white border-slate-700 text-[10px] gap-1 backdrop-blur-sm">
            <Lock className="h-2.5 w-2.5" aria-hidden />
            Preview
          </Badge>
        </div>
        <div
          className={cn(
            "pointer-events-none select-none",
            blur && "filter blur-[2px] opacity-80",
          )}
          aria-hidden
        >
          {children}
        </div>
      </div>

      {/* Sticky-feel bottom CTA so they don't scroll-search for the upgrade */}
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-700">
          Ready to unlock {title.toLowerCase()}?
        </p>
        <Button asChild className="bg-[#1B365D] hover:bg-[#142a4a] gap-1.5">
          <Link to={ctaTo}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </Button>
      </div>
    </div>
  );
}
