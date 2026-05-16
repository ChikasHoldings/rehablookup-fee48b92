import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Flag, CheckCircle2, AlertTriangle, GraduationCap } from "lucide-react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AdvisorReminder } from "@/components/admin/concierge/AdvisorReminder";

interface AuditRow {
  id: string;
  inquiry_id: string;
  advisor_id: string;
  sent_at: string;
  introduced_facility_ids: string[];
  partner_facility_ids: string[];
  surfaced_candidate_ids: string[];
  rejected_non_partner_candidates: Array<{ facility_id: string; reason: string }>;
  advisor_confirmed_non_partner_consideration: boolean;
  advisor_confirmed_no_non_partner_candidates: boolean;
  flagged_for_admin_review: boolean;
  flagged_reason: string | null;
  clinical_criteria_snapshot: Record<string, unknown>;
  originating_facility_id: string | null;
  originating_facility_auto_pinned: boolean;
  reviewed_at: string | null;
}

type ReviewOutcome = "acceptable" | "needs_followup" | "coaching_issued";

/**
 * /admin/concierge/audit-review — admin queue of flagged audit rows.
 *
 * Lists every concierge_introduction_audit row with
 * flagged_for_admin_review=true AND reviewed_at IS NULL. Admin opens a
 * row, sees the full clinical criteria + selections + rejected
 * non-partners, and marks it 'acceptable', 'needs_followup', or
 * 'coaching_issued' with a note.
 */
export default function AdminConciergeAuditReview() {
  const queryClient = useQueryClient();
  const [openRow, setOpenRow] = useState<AuditRow | null>(null);
  const [outcome, setOutcome] = useState<ReviewOutcome>("acceptable");
  const [note, setNote] = useState("");
  const [resolving, setResolving] = useState(false);

  const { data: rows, isLoading } = useQuery({
    queryKey: ["concierge-audit-flagged"],
    queryFn: async (): Promise<AuditRow[]> => {
      const { data, error } = await supabase
        .from("concierge_introduction_audit")
        .select("*")
        .eq("flagged_for_admin_review", true)
        .is("reviewed_at", null)
        .order("sent_at", { ascending: false })
        .limit(100);
      if (error) {
        console.error("[AdminConciergeAuditReview] fetch failed", error);
        return [];
      }
      return (data ?? []) as AuditRow[];
    },
    staleTime: 1000 * 30,
  });

  const handleResolve = async () => {
    if (!openRow) return;
    setResolving(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-review-mark-resolved", {
        body: {
          audit_id: openRow.id,
          outcome,
          note: note.trim() || undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Audit row marked as reviewed.");
      setOpenRow(null);
      setNote("");
      setOutcome("acceptable");
      queryClient.invalidateQueries({ queryKey: ["concierge-audit-flagged"] });
    } catch (err) {
      console.error("[AdminConciergeAuditReview] resolve failed", err);
      toast.error(err instanceof Error ? err.message : "Failed to mark as reviewed");
    } finally {
      setResolving(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Concierge audit review | RehabLookup Admin</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="container mx-auto px-4 py-6 max-w-6xl space-y-4">
        <AdvisorReminder />

        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Flag className="h-6 w-6 text-amber-600" aria-hidden />
            Concierge audit review queue
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Flagged introduction decisions awaiting admin sign-off. Each row
            captures the clinical criteria, the surfaced candidate pool, the
            selection, and the advisor's confirmations — the EKRA-defensive
            evidence for that decision.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {isLoading
                ? "Loading…"
                : `${rows?.length ?? 0} flagged ${(rows?.length ?? 0) === 1 ? "row" : "rows"}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-48 w-full" />
            ) : !rows || rows.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
                <p className="mt-3 font-medium text-slate-900">No flagged rows waiting.</p>
                <p className="text-sm text-slate-500">
                  Auto-flag triggers when 100% of an introduction set is
                  Placement Partners, the advisor's recent partner rate
                  exceeds 70%, or the originating-facility auto-pin rule
                  was violated.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-4 md:mx-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-slate-200">
                      <th className="px-4 py-2 font-medium text-slate-700">Sent</th>
                      <th className="px-4 py-2 font-medium text-slate-700">Inquiry</th>
                      <th className="px-4 py-2 font-medium text-slate-700">Selection</th>
                      <th className="px-4 py-2 font-medium text-slate-700">Flag reason</th>
                      <th className="px-4 py-2 font-medium text-slate-700 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td className="px-4 py-3 text-slate-700">
                          {new Date(r.sent_at).toLocaleString("en-US", {
                            month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">
                          {r.inquiry_id.slice(0, 8)}…
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-[#1B365D] hover:bg-[#1B365D] text-[10px]">
                              {r.partner_facility_ids.length} partner
                            </Badge>
                            <Badge variant="outline" className="text-[10px]">
                              {r.introduced_facility_ids.length - r.partner_facility_ids.length} non-partner
                            </Badge>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-amber-900 max-w-md">
                          {r.flagged_reason ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button size="sm" variant="outline" onClick={() => setOpenRow(r)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!openRow} onOpenChange={(open) => !open && setOpenRow(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-700" aria-hidden />
              Review flagged introduction
            </DialogTitle>
          </DialogHeader>

          {openRow && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs">
                <p className="font-semibold text-amber-900 uppercase tracking-wide">Flag reason</p>
                <p className="mt-1 text-amber-900">{openRow.flagged_reason}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="font-semibold text-slate-900">Selection breakdown</p>
                  <ul className="mt-1 text-xs text-slate-700 space-y-0.5">
                    <li>Introductions sent: <strong>{openRow.introduced_facility_ids.length}</strong></li>
                    <li>Placement Partners: <strong>{openRow.partner_facility_ids.length}</strong></li>
                    <li>Surfaced candidates: <strong>{openRow.surfaced_candidate_ids.length}</strong></li>
                    {openRow.originating_facility_auto_pinned && (
                      <li className="text-violet-700">
                        Free-tier redirect — originating facility was auto-pinned.
                      </li>
                    )}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-slate-900">Advisor confirmations</p>
                  <ul className="mt-1 text-xs text-slate-700 space-y-0.5">
                    <li>
                      Non-partner consideration confirmed:{" "}
                      <strong>{openRow.advisor_confirmed_non_partner_consideration ? "yes" : "no"}</strong>
                    </li>
                    <li>
                      "No non-partners qualified" confirmed:{" "}
                      <strong>{openRow.advisor_confirmed_no_non_partner_candidates ? "yes" : "no"}</strong>
                    </li>
                  </ul>
                </div>

                {openRow.rejected_non_partner_candidates.length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-900">Rejected non-partner candidates (with reasons)</p>
                    <ul className="mt-1 text-xs text-slate-700 space-y-1.5">
                      {openRow.rejected_non_partner_candidates.map((rej) => (
                        <li key={rej.facility_id} className="rounded bg-slate-50 p-2">
                          <span className="font-mono text-[11px]">{rej.facility_id.slice(0, 8)}…</span>{" "}
                          — {rej.reason || <em>no reason given</em>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div>
                  <p className="font-semibold text-slate-900">Clinical criteria snapshot</p>
                  <pre className="mt-1 rounded bg-slate-50 border border-slate-200 p-2 text-[11px] overflow-x-auto">
                    {JSON.stringify(openRow.clinical_criteria_snapshot, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="space-y-2 border-t border-slate-200 pt-3">
                <Label htmlFor="outcome" className="text-sm font-medium">Resolution</Label>
                <Select value={outcome} onValueChange={(v) => setOutcome(v as ReviewOutcome)}>
                  <SelectTrigger id="outcome">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acceptable">
                      <span className="flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" /> Acceptable
                      </span>
                    </SelectItem>
                    <SelectItem value="needs_followup">
                      <span className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-700" /> Needs follow-up
                      </span>
                    </SelectItem>
                    <SelectItem value="coaching_issued">
                      <span className="flex items-center gap-2">
                        <GraduationCap className="h-3.5 w-3.5 text-violet-700" /> Coaching issued
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>

                <Label htmlFor="note" className="text-sm font-medium">Note (optional)</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 2000))}
                  placeholder="Document the reasoning for this resolution…"
                  rows={3}
                  className="text-sm"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="ghost" onClick={() => setOpenRow(null)} disabled={resolving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleResolve}
                    disabled={resolving}
                    className="bg-[#1B365D] hover:bg-[#142a4a] gap-2"
                  >
                    {resolving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Mark as reviewed
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
