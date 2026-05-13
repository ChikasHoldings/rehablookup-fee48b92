/**
 * AdminClaimsReviewPanel
 * ──────────────────────
 * Admin dashboard component for reviewing pending facility claim requests.
 *
 * Behavior:
 *   • Lists all rows from `facility_claim_requests` (admins see all via RLS).
 *   • Filterable by status (pending / under_review / resolved / all).
 *   • Each row is expandable to show claimant details, evidence, and the
 *     associated facility.
 *   • Three actions:
 *       1. Mark Under Review — non-destructive status change
 *       2. Approve — DESTRUCTIVE: transfers facility ownership to the
 *          claimant (via trigger) and auto-rejects competing claims.
 *          Requires confirmation.
 *       3. Reject — requires a rejection reason.
 *
 * Trigger side effects (handled in DB, not here):
 *   • On approve: facilities.user_id = claimant_user_id, claimed_at = now()
 *   • On approve: competing pending claims for the same facility → rejected
 *   • On approve: provider_credits row initialized for the claimant
 *
 * Routes: mount this at /admin/claims (or wherever your admin routes live).
 * Access control: gate the parent route on `is_admin(auth.uid())` so non-
 * admins never reach this component.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ClaimStatus = "pending" | "under_review" | "approved" | "rejected" | "withdrawn";
type StatusFilter = "pending" | "under_review" | "resolved" | "all";

interface FacilityRef {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  slug: string | null;
}

interface ClaimRow {
  id: string;
  facility_id: string;
  claimant_user_id: string;
  claimant_email: string;
  claimant_phone: string | null;
  claimant_name: string;
  claimant_role: string | null;
  evidence_url: string | null;
  evidence_notes: string | null;
  status: ClaimStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  facilities: FacilityRef | null;
}

const STATUS_LABELS: Record<ClaimStatus, string> = {
  pending: "Pending",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const STATUS_VARIANTS: Record<ClaimStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "default",
  under_review: "secondary",
  approved: "outline",
  rejected: "destructive",
  withdrawn: "outline",
};

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function AdminClaimsReviewPanel() {
  const [claims, setClaims] = useState<ClaimRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionPending, setActionPending] = useState<string | null>(null);

  // Approve confirmation
  const [approveTarget, setApproveTarget] = useState<ClaimRow | null>(null);

  // Reject modal
  const [rejectTarget, setRejectTarget] = useState<ClaimRow | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function fetchClaims() {
    setLoading(true);
    setError(null);

    let query = supabase
      .from("facility_claim_requests")
      .select(
        `
        id, facility_id, claimant_user_id, claimant_email, claimant_phone,
        claimant_name, claimant_role, evidence_url, evidence_notes,
        status, reviewed_by, reviewed_at, decision_notes, rejection_reason,
        created_at, updated_at,
        facilities ( id, name, city, state, slug )
      `
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (statusFilter === "pending") {
      query = query.eq("status", "pending");
    } else if (statusFilter === "under_review") {
      query = query.eq("status", "under_review");
    } else if (statusFilter === "resolved") {
      query = query.in("status", ["approved", "rejected", "withdrawn"]);
    }
    // 'all' = no status filter

    const { data, error: fetchError } = await query;
    if (fetchError) {
      setError(fetchError.message);
      setClaims([]);
    } else {
      setClaims((data ?? []) as unknown as ClaimRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchClaims();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Client-side search across visible rows
  const visibleClaims = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return claims;
    return claims.filter((c) => {
      const hay = [
        c.claimant_name,
        c.claimant_email,
        c.claimant_role ?? "",
        c.facilities?.name ?? "",
        c.facilities?.city ?? "",
        c.facilities?.state ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(term);
    });
  }, [claims, searchTerm]);

  async function markUnderReview(claim: ClaimRow) {
    setActionPending(claim.id);
    try {
      const { error: updErr } = await supabase
        .from("facility_claim_requests")
        .update({
          status: "under_review",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
      if (updErr) throw updErr;
      toast.success("Marked under review");
      await fetchClaims();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setActionPending(null);
    }
  }

  async function confirmApprove() {
    if (!approveTarget) return;
    const claim = approveTarget;
    setActionPending(claim.id);
    try {
      const { error: updErr } = await supabase
        .from("facility_claim_requests")
        .update({
          status: "approved",
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
      if (updErr) throw updErr;
      toast.success(`Claim approved — ${claim.facilities?.name ?? "facility"} transferred to ${claim.claimant_name}`);
      setApproveTarget(null);
      await fetchClaims();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      toast.error(msg);
    } finally {
      setActionPending(null);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    const claim = rejectTarget;
    const reason = rejectionReason.trim();
    if (reason.length < 5) {
      toast.error("Please provide a rejection reason (at least 5 characters)");
      return;
    }
    setActionPending(claim.id);
    try {
      const { error: updErr } = await supabase
        .from("facility_claim_requests")
        .update({
          status: "rejected",
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
      if (updErr) throw updErr;
      toast.success("Claim rejected");
      setRejectTarget(null);
      setRejectionReason("");
      await fetchClaims();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Rejection failed";
      toast.error(msg);
    } finally {
      setActionPending(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Facility Claims</h1>
          <p className="text-sm text-muted-foreground">
            Review and verify provider claims on unverified listings.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={fetchClaims}
          disabled={loading}
          aria-label="Refresh claims"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} aria-hidden />
          Refresh
        </Button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="under_review">Under review</SelectItem>
            <SelectItem value="resolved">Resolved (approved / rejected / withdrawn)</SelectItem>
            <SelectItem value="all">All</SelectItem>
          </SelectContent>
        </Select>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by facility, claimant name, email, role…"
            className="pl-9"
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          Failed to load claims: {error}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Facility</TableHead>
              <TableHead>Claimant</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && claims.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            )}
            {!loading && visibleClaims.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No claims match the current filter.
                </TableCell>
              </TableRow>
            )}
            {visibleClaims.map((claim) => {
              const isExpanded = expandedId === claim.id;
              const isResolved = ["approved", "rejected", "withdrawn"].includes(claim.status);

              return (
                <>
                  <TableRow
                    key={claim.id}
                    className="cursor-pointer hover:bg-muted/40"
                    onClick={() => setExpandedId(isExpanded ? null : claim.id)}
                  >
                    <TableCell>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" aria-hidden />
                      ) : (
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {claim.facilities?.name ?? "(unknown facility)"}
                      {claim.facilities?.city && (
                        <div className="text-xs text-muted-foreground">
                          {claim.facilities.city}, {claim.facilities.state}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div>{claim.claimant_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {claim.claimant_email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{claim.claimant_role ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[claim.status]}>
                        {STATUS_LABELS[claim.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTimestamp(claim.created_at)}
                    </TableCell>
                  </TableRow>

                  {isExpanded && (
                    <TableRow key={`${claim.id}-detail`} className="bg-muted/20">
                      <TableCell colSpan={6} className="p-0">
                        <div className="p-6 space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Claimant contact
                              </Label>
                              <div className="text-sm mt-1">
                                <div>{claim.claimant_name}</div>
                                <div>{claim.claimant_email}</div>
                                {claim.claimant_phone && <div>{claim.claimant_phone}</div>}
                                {claim.claimant_role && (
                                  <div className="text-muted-foreground">
                                    {claim.claimant_role}
                                  </div>
                                )}
                              </div>
                            </div>
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Facility
                              </Label>
                              <div className="text-sm mt-1">
                                <div className="font-medium">
                                  {claim.facilities?.name ?? "(unknown)"}
                                </div>
                                {claim.facilities?.slug && (
                                  <a
                                    href={`/facility/${claim.facilities.slug}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    View public page
                                    <ExternalLink className="h-3 w-3" aria-hidden />
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>

                          {claim.evidence_url && (
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Evidence link
                              </Label>
                              <a
                                href={claim.evidence_url}
                                target="_blank"
                                rel="noreferrer"
                                className="block text-sm text-primary hover:underline mt-1 break-all"
                              >
                                {claim.evidence_url}
                              </a>
                            </div>
                          )}

                          {claim.evidence_notes && (
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Claimant notes
                              </Label>
                              <div className="text-sm mt-1 whitespace-pre-wrap rounded-md bg-background p-3 border">
                                {claim.evidence_notes}
                              </div>
                            </div>
                          )}

                          {claim.rejection_reason && (
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Rejection reason
                              </Label>
                              <div className="text-sm mt-1 text-destructive">
                                {claim.rejection_reason}
                              </div>
                            </div>
                          )}

                          {claim.reviewed_at && (
                            <div className="text-xs text-muted-foreground">
                              Reviewed {formatTimestamp(claim.reviewed_at)}
                            </div>
                          )}

                          {!isResolved && (
                            <div className="flex flex-wrap gap-2 pt-2 border-t">
                              {claim.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={actionPending === claim.id}
                                  onClick={() => markUnderReview(claim)}
                                >
                                  Mark under review
                                </Button>
                              )}
                              <Button
                                size="sm"
                                disabled={actionPending === claim.id}
                                onClick={() => setApproveTarget(claim)}
                              >
                                Approve
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={actionPending === claim.id}
                                onClick={() => {
                                  setRejectTarget(claim);
                                  setRejectionReason("");
                                }}
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Approve confirmation */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve this claim?</AlertDialogTitle>
            <AlertDialogDescription>
              This will transfer ownership of{" "}
              <span className="font-medium">
                {approveTarget?.facilities?.name ?? "this facility"}
              </span>{" "}
              to <span className="font-medium">{approveTarget?.claimant_name}</span> (
              {approveTarget?.claimant_email}). Any other pending claims for this
              facility will be auto-rejected. This action is not easily reversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmApprove}>
              Approve & transfer ownership
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject modal */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(open) => {
          if (!open) {
            setRejectTarget(null);
            setRejectionReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject claim</DialogTitle>
            <DialogDescription>
              Provide a reason — this will be visible to the claimant.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Rejection reason</Label>
            <Textarea
              id="reject-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Could not verify your role at this facility. Please reach out to support@…"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">{rejectionReason.length} / 500</p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectTarget(null);
                setRejectionReason("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={actionPending === rejectTarget?.id}
            >
              Reject claim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default AdminClaimsReviewPanel;
