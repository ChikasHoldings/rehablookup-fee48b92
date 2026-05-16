import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFacilityPartnerStatus } from "@/hooks/useFacilityPartnerStatus";
import { PlacementPartnerBadge } from "./PlacementPartnerBadge";
import {
  NonPartnerConsiderationBlock,
  type RejectedNonPartner,
} from "./NonPartnerConsiderationBlock";

interface CandidateSummary {
  facility_id: string;
  facility_name: string;
  facility_summary?: string;
}

interface SendIntroductionsBatchActionProps {
  inquiryId: string;
  /** Candidates the advisor selected for introductions. Pass at most 10. */
  selected: CandidateSummary[];
  /** The full pool the algorithm surfaced — anything in `selected` is a
   *  subset of this. Drives the "rejected non-partner candidates" list. */
  surfaced: CandidateSummary[];
  /** Seeker's clinical filters used to determine geo-partner status and
   *  snapshotted into the audit row. */
  clinicalCriteria: {
    geo_state?: string | null;
    geo_city?: string | null;
    level_of_care?: string | null;
    insurance?: string | null;
    [k: string]: unknown;
  };
  onCompleted?: (auditId: string, flagged: boolean) => void;
}

/**
 * Drop-in batch-confirmation surface that gates the existing per-facility
 * concierge_introductions flow with the EKRA audit step. The advisor:
 *   1. Sees which selected facilities are Placement Partners (badge).
 *   2. Sees the NonPartnerConsiderationBlock when any partner is in
 *      the selection — must check the consideration confirmation +
 *      fill reasons for surfaced-but-rejected non-partners.
 *   3. Clicks "Record decision & send introductions" — calls
 *      record-introduction-decision (server-side validation + audit
 *      insert), then on success loops through send-concierge-introduction
 *      for each selected facility.
 *
 * Compatible with the existing per-facility "Send introduction" buttons
 * in the tab. Either path can be used; the batch path captures the
 * full audit context.
 */
export function SendIntroductionsBatchAction({
  inquiryId,
  selected,
  surfaced,
  clinicalCriteria,
  onCompleted,
}: SendIntroductionsBatchActionProps) {
  const selectedIds = selected.map((s) => s.facility_id);

  // Partner status — query against the full surfaced pool so we know
  // which non-partners exist (rejected list) too.
  const allIds = useMemo(
    () => Array.from(new Set([...selectedIds, ...surfaced.map((s) => s.facility_id)])),
    [selectedIds, surfaced],
  );
  const { data: partnerSet, isLoading: partnerLoading } = useFacilityPartnerStatus({
    facilityIds: allIds,
    seekerState: clinicalCriteria.geo_state ?? null,
    seekerCity: clinicalCriteria.geo_city ?? null,
  });
  const partners = useMemo(() => partnerSet ?? new Set<string>(), [partnerSet]);

  const selectedPartners = selected.filter((s) => partners.has(s.facility_id));
  const anyPartnerSelected = selectedPartners.length > 0;
  const allSelectedArePartners = selectedPartners.length === selected.length && selected.length > 0;

  // Rejected non-partner candidates: surfaced, NOT selected, NOT a partner.
  const initialRejected: RejectedNonPartner[] = useMemo(() => {
    return surfaced
      .filter((s) => !selectedIds.includes(s.facility_id) && !partners.has(s.facility_id))
      .map((s) => ({
        facility_id: s.facility_id,
        facility_name: s.facility_name,
        facility_summary: s.facility_summary,
        reason: "",
      }));
  }, [surfaced, selectedIds, partners]);

  const [rejectedNonPartners, setRejectedNonPartners] = useState<RejectedNonPartner[]>(initialRejected);
  // Keep state in sync with surfaced/selected/partners changes.
  useMemo(() => {
    setRejectedNonPartners((prev) => {
      const idsToKeep = new Set(initialRejected.map((r) => r.facility_id));
      const preserved = prev.filter((r) => idsToKeep.has(r.facility_id));
      const newOnes = initialRejected.filter(
        (r) => !preserved.some((p) => p.facility_id === r.facility_id),
      );
      return [...preserved, ...newOnes];
    });
  }, [initialRejected]);

  const [considerationConfirmed, setConsiderationConfirmed] = useState(false);
  const [noNonPartnersConfirmed, setNoNonPartnersConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const isAllPartnersNoCandidatesScenario =
    allSelectedArePartners && rejectedNonPartners.length === 0;

  const canSubmit = useMemo(() => {
    if (selected.length === 0) return false;
    if (anyPartnerSelected && !considerationConfirmed) return false;
    if (rejectedNonPartners.some((r) => !r.reason.trim())) return false;
    if (isAllPartnersNoCandidatesScenario && !noNonPartnersConfirmed) return false;
    return true;
  }, [
    selected.length,
    anyPartnerSelected,
    considerationConfirmed,
    rejectedNonPartners,
    isAllPartnersNoCandidatesScenario,
    noNonPartnersConfirmed,
  ]);

  const handleSend = async () => {
    setSubmitting(true);
    try {
      // 1) Record audit + validate rules server-side.
      const { data: auditData, error: auditErr } = await supabase.functions.invoke(
        "record-introduction-decision",
        {
          body: {
            inquiry_id: inquiryId,
            selected_facility_ids: selectedIds,
            surfaced_candidate_ids: surfaced.map((s) => s.facility_id),
            rejected_non_partner_candidates: rejectedNonPartners.map((r) => ({
              facility_id: r.facility_id,
              reason: r.reason,
            })),
            advisor_confirmed_non_partner_consideration: considerationConfirmed,
            advisor_confirmed_no_non_partner_candidates: noNonPartnersConfirmed,
            clinical_criteria_snapshot: clinicalCriteria,
          },
        },
      );
      if (auditErr) throw auditErr;
      if (auditData?.error) {
        const issues = (auditData as { validation_errors?: string[] }).validation_errors;
        throw new Error(issues?.[0] ?? auditData.error);
      }

      // 2) Fire per-facility introduction sends in parallel. Failures are
      // logged per-facility but don't abort the batch — the audit is
      // already recorded, and individual retries can happen from the
      // existing per-facility "Send introduction" button.
      const results = await Promise.allSettled(
        selectedIds.map(async (facilityId) => {
          const { error } = await supabase.functions.invoke("send-concierge-introduction", {
            body: { inquiryId, facilityId },
          });
          if (error) throw error;
        }),
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed > 0) {
        toast.warning(
          `Sent ${selectedIds.length - failed} of ${selectedIds.length}. Retry individual failures from the per-facility list.`,
        );
      } else {
        toast.success(`Sent ${selectedIds.length} introductions.`);
      }

      onCompleted?.(
        (auditData as { audit_id: string }).audit_id,
        !!(auditData as { flagged_for_admin_review?: boolean }).flagged_for_admin_review,
      );
    } catch (err) {
      console.error("[SendIntroductionsBatchAction] failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to record decision");
    } finally {
      setSubmitting(false);
    }
  };

  if (selected.length === 0) return null;

  return (
    <Card className="border-[#1B365D]/20">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4 text-[#1B365D]" aria-hidden />
          Send introductions ({selected.length} selected)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide font-semibold text-slate-600">
            Selected facilities
          </p>
          <ul className="space-y-1.5">
            {selected.map((s) => {
              const isPartner = partners.has(s.facility_id);
              return (
                <li
                  key={s.facility_id}
                  className="flex items-center justify-between gap-3 rounded-md bg-slate-50 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900 truncate">
                    {s.facility_name}
                    {s.facility_summary && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {s.facility_summary}
                      </span>
                    )}
                  </span>
                  {partnerLoading ? (
                    <Badge variant="outline" className="text-[10px]">…</Badge>
                  ) : isPartner ? (
                    <PlacementPartnerBadge />
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Non-partner</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <NonPartnerConsiderationBlock
          anyPartnerSelected={anyPartnerSelected}
          rejectedNonPartners={rejectedNonPartners}
          onRejectedNonPartnersChange={setRejectedNonPartners}
          considerationConfirmed={considerationConfirmed}
          onConsiderationConfirmedChange={setConsiderationConfirmed}
          noNonPartnersConfirmed={noNonPartnersConfirmed}
          onNoNonPartnersConfirmedChange={setNoNonPartnersConfirmed}
          isAllPartnersNoCandidatesScenario={isAllPartnersNoCandidatesScenario}
        />

        {!canSubmit && anyPartnerSelected && (
          <p className="flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Complete the non-partner consideration checks before sending.
          </p>
        )}

        <Button
          onClick={handleSend}
          disabled={!canSubmit || submitting}
          className="w-full bg-[#1B365D] hover:bg-[#142a4a] gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Recording & sending…
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Record decision &amp; send {selected.length}{" "}
              {selected.length === 1 ? "introduction" : "introductions"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
