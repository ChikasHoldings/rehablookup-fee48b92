import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

export interface RejectedNonPartner {
  facility_id: string;
  facility_name: string;
  facility_summary?: string;
  reason: string;
}

interface NonPartnerConsiderationBlockProps {
  /** Whether any selected facility is currently a Placement Partner. */
  anyPartnerSelected: boolean;
  /** Surfaced non-partner candidates the algorithm returned that the
   *  advisor didn't select. The advisor must explain each. */
  rejectedNonPartners: RejectedNonPartner[];
  onRejectedNonPartnersChange: (next: RejectedNonPartner[]) => void;
  /** Advisor's primary consideration confirmation. */
  considerationConfirmed: boolean;
  onConsiderationConfirmedChange: (next: boolean) => void;
  /** When all selected are partners AND no non-partners surfaced, the
   *  advisor must confirm this with a second checkbox. */
  noNonPartnersConfirmed: boolean;
  onNoNonPartnersConfirmedChange: (next: boolean) => void;
  /** Whether the 100%-partner-no-non-partners scenario applies. */
  isAllPartnersNoCandidatesScenario: boolean;
}

/**
 * EKRA-critical confirmation block. Renders nothing when no Placement
 * Partner is in the selection (the rule doesn't trigger).
 *
 * When any Partner IS selected:
 *   1. Primary checkbox: "I considered non-partner alternatives"
 *   2. Per-row reason inputs for non-partner candidates the algorithm
 *      surfaced but the advisor didn't pick
 *   3. Second checkbox when 100% of the selection is partners AND no
 *      non-partners were surfaced at all (admin reviews this case)
 */
export function NonPartnerConsiderationBlock({
  anyPartnerSelected,
  rejectedNonPartners,
  onRejectedNonPartnersChange,
  considerationConfirmed,
  onConsiderationConfirmedChange,
  noNonPartnersConfirmed,
  onNoNonPartnersConfirmedChange,
  isAllPartnersNoCandidatesScenario,
}: NonPartnerConsiderationBlockProps) {
  if (!anyPartnerSelected) return null;

  const updateReason = (facility_id: string, reason: string) => {
    onRejectedNonPartnersChange(
      rejectedNonPartners.map((r) => (r.facility_id === facility_id ? { ...r, reason } : r)),
    );
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" aria-hidden />
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">
              Non-partner consideration required
            </p>
            <p className="mt-0.5 text-xs text-slate-700 leading-relaxed">
              You selected at least one Placement Partner. Per the EKRA rule,
              confirm you considered non-partner alternatives — either by
              including them in the introductions or documenting why they
              weren't a clinical fit.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2 rounded-md bg-white border border-amber-200 p-3">
          <Checkbox
            id="consider-non-partners"
            checked={considerationConfirmed}
            onCheckedChange={(v) => onConsiderationConfirmedChange(v === true)}
            className="mt-0.5"
          />
          <Label htmlFor="consider-non-partners" className="text-sm leading-relaxed font-normal cursor-pointer">
            I considered at least 2 non-Placement-Partner alternatives for this
            seeker. I either selected them as introductions or documented why
            a non-partner option wasn't a clinical fit.
          </Label>
        </div>

        {rejectedNonPartners.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              Non-partner candidates you didn't pick — explain why
            </p>
            {rejectedNonPartners.map((r) => (
              <div key={r.facility_id} className="rounded-md bg-white border border-amber-200 p-3 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-slate-900">
                    {r.facility_name}
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Non-partner
                  </Badge>
                  {r.facility_summary && (
                    <span className="text-xs text-slate-500">{r.facility_summary}</span>
                  )}
                </div>
                <Textarea
                  value={r.reason}
                  onChange={(e) => updateReason(r.facility_id, e.target.value.slice(0, 2000))}
                  placeholder="Why didn't this option work for the seeker? (required)"
                  rows={2}
                  className="text-sm resize-none"
                />
                {!r.reason.trim() && (
                  <p className="text-[11px] text-amber-800">Reason is required.</p>
                )}
              </div>
            ))}
          </div>
        )}

        {isAllPartnersNoCandidatesScenario && (
          <div className="flex items-start gap-2 rounded-md bg-amber-100 border border-amber-300 p-3">
            <Checkbox
              id="no-non-partners-matched"
              checked={noNonPartnersConfirmed}
              onCheckedChange={(v) => onNoNonPartnersConfirmedChange(v === true)}
              className="mt-0.5"
            />
            <Label htmlFor="no-non-partners-matched" className="text-sm leading-relaxed font-normal cursor-pointer">
              <span className="font-semibold text-amber-900">All 3 selected are Placement Partners.</span>{" "}
              No non-partner facilities matched this seeker's clinical
              criteria (insurance, level of care, geography). I confirm this
              is a genuine clinical-matching outcome, not a payment-tier
              filter. This audit row will be flagged for admin review.
            </Label>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
