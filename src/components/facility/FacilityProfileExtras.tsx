/**
 * Shared profile-content blocks for hours, languages, accessibility,
 * and admissions status. Rendered by both /center/[slug] (CenterProfile)
 * and /account/facility/[id] (SeekerFacilityProfile). Each sub-block
 * renders ONLY when its field is populated — empty states are silent.
 *
 * This is also the seed of the larger CenterProfile / SeekerFacilityProfile
 * de-duplication: the audit (docs/facility-profile-audit-2026-05-21.md)
 * called out that both pages re-implement the same sections. Adding new
 * content via a shared component avoids growing the duplication.
 *
 * Backed by columns added in migration 20260709000000:
 *   facilities.hours_of_operation       text
 *   facilities.languages_spoken         text[]
 *   facilities.accessibility_features   text[]
 *   facilities.accepting_admissions     boolean
 *
 * Exposed through public_facilities view (migration 20260709010000) so
 * both pages read them via the same useFacilityBySlug hook.
 */
import { Clock, Languages, Accessibility, CheckCircle2, CircleSlash } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FacilityProfileExtrasProps {
  hours: string | null;
  languages: string[] | null;
  accessibility: string[] | null;
  acceptingAdmissions: boolean | null;
  /** Render style — full sections (used in the main column on
   *  /center/[slug]) or compact stacked rows (used in the sidebar
   *  on /account/facility/[id]). */
  variant?: "full" | "compact";
  className?: string;
}

export function FacilityProfileExtras({
  hours,
  languages,
  accessibility,
  acceptingAdmissions,
  variant = "full",
  className,
}: FacilityProfileExtrasProps) {
  const filteredLanguages = languages?.filter(Boolean) ?? [];
  const filteredAccessibility = accessibility?.filter(Boolean) ?? [];

  // If every field is empty, render nothing — avoid an empty section
  // that adds visual noise.
  const hasAny =
    !!hours ||
    filteredLanguages.length > 0 ||
    filteredAccessibility.length > 0 ||
    acceptingAdmissions !== null;
  if (!hasAny) return null;

  if (variant === "compact") {
    return (
      <div className={className}>
        <div className="space-y-2.5">
          {acceptingAdmissions !== null && (
            <AdmissionsBadge accepting={acceptingAdmissions} compact />
          )}
          {hours && (
            <div className="flex items-start gap-2.5 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Hours</p>
                <p className="text-foreground">{hours}</p>
              </div>
            </div>
          )}
          {filteredLanguages.length > 0 && (
            <div className="flex items-start gap-2.5 text-sm">
              <Languages className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Languages</p>
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {filteredLanguages.map((lang) => (
                    <Badge key={lang} variant="secondary" className="text-[11px] px-1.5 py-0">
                      {lang}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
          {filteredAccessibility.length > 0 && (
            <div className="flex items-start gap-2.5 text-sm">
              <Accessibility className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Accessibility</p>
                <ul className="mt-0.5 space-y-0.5">
                  {filteredAccessibility.map((feat) => (
                    <li key={feat} className="text-foreground text-[13px]">{feat}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full variant — used in the main content column with section headers.
  return (
    <div className={className}>
      {acceptingAdmissions !== null && (
        <div className="mb-4">
          <AdmissionsBadge accepting={acceptingAdmissions} />
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {hours && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
            <Clock className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Hours</p>
              <p className="text-sm text-foreground whitespace-pre-line">{hours}</p>
            </div>
          </div>
        )}
        {filteredLanguages.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40">
            <Languages className="h-4 w-4 text-purple-600 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Languages</p>
              <div className="flex flex-wrap gap-1">
                {filteredLanguages.map((lang) => (
                  <Badge key={lang} variant="secondary" className="text-xs">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )}
        {filteredAccessibility.length > 0 && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/40 sm:col-span-2">
            <Accessibility className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5">Accessibility</p>
              <ul className="grid gap-0.5 sm:grid-cols-2">
                {filteredAccessibility.map((feat) => (
                  <li key={feat} className="text-sm text-foreground flex items-start gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdmissionsBadge({ accepting, compact }: { accepting: boolean; compact?: boolean }) {
  if (accepting) {
    return (
      <Badge
        className={
          compact
            ? "gap-1.5 px-2 py-0.5 text-xs bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
            : "gap-1.5 px-3 py-1 text-sm bg-emerald-500/10 text-emerald-700 border-emerald-500/30"
        }
      >
        <CheckCircle2 className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        Currently accepting admissions
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className={
        compact
          ? "gap-1.5 px-2 py-0.5 text-xs"
          : "gap-1.5 px-3 py-1 text-sm"
      }
    >
      <CircleSlash className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Not currently accepting admissions
    </Badge>
  );
}
