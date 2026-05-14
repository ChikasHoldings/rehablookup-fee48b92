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
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ClaimStatus = "pending" | "under_review" | "approved" | "rejected" | "withdrawn";
type StatusFilter = "pending" | "under_review" | "resolved" | "all";
type VerificationMethod = "email_domain" | "sms_phone" | "document_upload";
type VerificationStatus =
  | "not_started"
  | "pending"
  | "verified"
  | "failed"
  | "expired";

interface FacilityRef {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  slug: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

interface AccreditationEntry {
  type?: string;
  number?: string;
  issuing_authority?: string;
  document_path?: string;
  document_name?: string;
  verification_url?: string;
  notes?: string;
}

interface PendingEnrichments {
  description?: string;
  corrected_contact?: { phone?: string; email?: string; website?: string };
  logo_path?: string;
  photo_paths?: string[];
  services?: string[];
  insurances?: string[];
  accreditations?: AccreditationEntry[];
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
  verification_method: VerificationMethod | null;
  verification_status: VerificationStatus;
  verified_at: string | null;
  verification_email: string | null;
  verification_phone: string | null;
  pending_enrichments: PendingEnrichments | null;
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

const VERIFICATION_METHOD_LABELS: Record<VerificationMethod, string> = {
  email_domain: "Email",
  sms_phone: "SMS",
  document_upload: "Document",
};

const VERIFICATION_METHOD_ICONS: Record<
  VerificationMethod,
  typeof Mail
> = {
  email_domain: Mail,
  sms_phone: MessageSquare,
  document_upload: FileText,
};

const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  not_started: "Not started",
  pending: "Pending",
  verified: "Verified",
  failed: "Failed",
  expired: "Expired",
};

const SERVICE_LABELS: Record<string, string> = {
  detox: "Detox",
  residential: "Residential",
  php: "PHP",
  iop: "IOP",
  outpatient: "Outpatient",
  mat_moud: "MAT / MOUD",
  individual_therapy: "Individual Therapy",
  group_therapy: "Group Therapy",
  family_therapy: "Family Therapy",
  dual_diagnosis: "Dual Diagnosis",
  trauma_informed: "Trauma-Informed",
};

const INSURANCE_LABELS: Record<string, string> = {
  aetna: "Aetna",
  anthem: "Anthem",
  bcbs: "BCBS",
  cigna: "Cigna",
  humana: "Humana",
  kaiser: "Kaiser",
  medicare: "Medicare",
  medicaid: "Medicaid",
  optum: "Optum",
  unitedhealthcare: "UHC",
  tricare: "TRICARE",
  self_pay: "Self-pay",
};

function maskEmail(email: string | null | undefined): string {
  if (!email) return "—";
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const head = local.slice(0, 2);
  return `${head}${"*".repeat(Math.max(3, local.length - 2))}@${domain}`;
}

function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return phone;
  const local = digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
  return `(${local.slice(0, 3)}) •••-${local.slice(-4)}`;
}

function publicClaimPhotoUrl(path: string): string {
  return supabase.storage.from("claim-photos").getPublicUrl(path).data.publicUrl;
}

function isImageDoc(name: string | undefined): boolean {
  if (!name) return false;
  return /\.(jpe?g|png|webp|heic|heif|gif|svg)$/i.test(name);
}

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

  // Cache of signed URLs for claim-evidence documents, keyed by storage path.
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  async function ensureSignedUrlsFor(claim: ClaimRow) {
    const paths = new Set<string>();
    (claim.pending_enrichments?.accreditations ?? []).forEach((a) => {
      if (a.document_path) paths.add(a.document_path);
    });
    const toFetch = Array.from(paths).filter((p) => !(p in signedUrls));
    if (toFetch.length === 0) return;
    const results = await Promise.all(
      toFetch.map((path) =>
        supabase.storage
          .from("claim-evidence")
          .createSignedUrl(path, 3600)
          .then(({ data, error }) => ({ path, url: data?.signedUrl, error })),
      ),
    );
    setSignedUrls((prev) => {
      const next = { ...prev };
      for (const r of results) {
        if (r.url) next[r.path] = r.url;
      }
      return next;
    });
  }

  function toggleExpand(claim: ClaimRow) {
    const next = expandedId === claim.id ? null : claim.id;
    setExpandedId(next);
    if (next) {
      ensureSignedUrlsFor(claim).catch(() => {
        // Signed-URL failures are non-fatal — the doc link button will fall
        // back to a fresh fetch on click.
      });
    }
  }

  async function markVerificationComplete(claim: ClaimRow) {
    setActionPending(claim.id);
    try {
      const { error: updErr } = await supabase
        .from("facility_claim_requests")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("id", claim.id);
      if (updErr) throw updErr;
      toast.success("Verification marked complete");
      await fetchClaims();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      toast.error(msg);
    } finally {
      setActionPending(null);
    }
  }

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
        verification_method, verification_status, verified_at,
        verification_email, verification_phone, pending_enrichments,
        facilities ( id, name, city, state, slug, phone, email, website )
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

      // Side-effect: send approval email to the claimant. The DB trigger
      // already handled ownership transfer + enrichment materialization
      // by the time this resolves. If the email send fails (network, Resend
      // hiccup, etc.) we surface a warning toast but don't unwind the
      // approval — the DB state is the source of truth.
      try {
        const { error: mailErr } = await supabase.functions.invoke(
          "send-claim-approval-email",
          { body: { claimRequestId: claim.id } },
        );
        if (mailErr) {
          console.warn("[AdminClaims] approval email failed", mailErr);
          toast.warning(
            "Approval saved but the notification email failed to send. You may want to message the claimant directly.",
          );
        }
      } catch (mailErr) {
        console.warn("[AdminClaims] approval email exception", mailErr);
        toast.warning(
          "Approval saved but the notification email failed to send. You may want to message the claimant directly.",
        );
      }

      toast.success(
        `Claim approved — ${claim.facilities?.name ?? "facility"} transferred to ${claim.claimant_name}`,
      );
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

      // Side-effect: send rejection email so the claimant understands why
      // and can decide whether to retry. Non-fatal on failure.
      try {
        const { error: mailErr } = await supabase.functions.invoke(
          "send-claim-rejection-email",
          { body: { claimRequestId: claim.id } },
        );
        if (mailErr) {
          console.warn("[AdminClaims] rejection email failed", mailErr);
          toast.warning(
            "Rejection saved but the notification email failed to send.",
          );
        }
      } catch (mailErr) {
        console.warn("[AdminClaims] rejection email exception", mailErr);
        toast.warning(
          "Rejection saved but the notification email failed to send.",
        );
      }

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
                    onClick={() => toggleExpand(claim)}
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

                          <VerificationPanel claim={claim} signedUrls={signedUrls} />

                          <EnrichmentPreview claim={claim} />

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
                              {claim.verification_method === "document_upload" &&
                                claim.verification_status !== "verified" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={actionPending === claim.id}
                                    onClick={() => markVerificationComplete(claim)}
                                  >
                                    <ShieldCheck className="h-4 w-4 mr-1.5" aria-hidden />
                                    Mark verification complete
                                  </Button>
                                )}
                              <Button
                                size="sm"
                                disabled={
                                  actionPending === claim.id ||
                                  claim.verification_status !== "verified"
                                }
                                onClick={() => setApproveTarget(claim)}
                                title={
                                  claim.verification_status === "verified"
                                    ? undefined
                                    : "Verification must be complete before approving."
                                }
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

function VerificationPanel({
  claim,
  signedUrls,
}: {
  claim: ClaimRow;
  signedUrls: Record<string, string>;
}) {
  const method = claim.verification_method;
  const status = claim.verification_status;
  if (!method && status === "not_started") {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-sm">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Verification
        </Label>
        <p className="text-muted-foreground mt-1 text-xs">
          Claimant hasn't picked a verification method yet.
        </p>
      </div>
    );
  }

  const MethodIcon = method ? VERIFICATION_METHOD_ICONS[method] : ShieldCheck;
  const accreditationDocs =
    method === "document_upload"
      ? (claim.pending_enrichments?.accreditations ?? []).filter(
          (a) => !!a.document_path,
        )
      : [];

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Verification
        </Label>
        <Badge variant="outline" className="gap-1">
          <MethodIcon className="h-3 w-3" aria-hidden />
          {method ? VERIFICATION_METHOD_LABELS[method] : "Not set"}
        </Badge>
        <Badge
          variant={
            status === "verified"
              ? "outline"
              : status === "failed" || status === "expired"
              ? "destructive"
              : "secondary"
          }
          className={
            status === "verified"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : undefined
          }
        >
          {VERIFICATION_STATUS_LABELS[status]}
        </Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 text-sm">
        {method === "email_domain" && claim.verification_email && (
          <div>
            <div className="text-xs text-muted-foreground">Verified email</div>
            <div className="font-mono text-xs break-all">
              {maskEmail(claim.verification_email)}
            </div>
          </div>
        )}
        {method === "sms_phone" && claim.verification_phone && (
          <div>
            <div className="text-xs text-muted-foreground">Verified phone</div>
            <div className="font-mono text-xs tabular-nums">
              {maskPhone(claim.verification_phone)}
            </div>
          </div>
        )}
        {status === "verified" && claim.verified_at && (
          <div>
            <div className="text-xs text-muted-foreground">Verified at</div>
            <div className="text-xs">{formatTimestamp(claim.verified_at)}</div>
          </div>
        )}
      </div>

      {accreditationDocs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Submitted documents
          </Label>
          <ul className="space-y-1.5">
            {accreditationDocs.map((doc, idx) => {
              const url = doc.document_path
                ? signedUrls[doc.document_path]
                : undefined;
              return (
                <li
                  key={`${doc.document_path}-${idx}`}
                  className="flex items-center gap-2 rounded-md border bg-background p-2 text-sm"
                >
                  <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                  <span className="truncate flex-1">
                    {doc.document_name ?? "Document"}
                  </span>
                  {url ? (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                    >
                      View
                      <ExternalLink className="h-3 w-3" aria-hidden />
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Loading…
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function EnrichmentPreview({ claim }: { claim: ClaimRow }) {
  const enrich = claim.pending_enrichments;
  if (!enrich) return null;

  const hasAny =
    enrich.logo_path ||
    (enrich.photo_paths?.length ?? 0) > 0 ||
    (enrich.services?.length ?? 0) > 0 ||
    (enrich.insurances?.length ?? 0) > 0 ||
    (enrich.accreditations?.length ?? 0) > 0 ||
    enrich.corrected_contact ||
    enrich.description;
  if (!hasAny) return null;

  const facility = claim.facilities;
  const contactDiff: Array<{ label: string; current: string; proposed: string }> = [];
  if (enrich.corrected_contact) {
    const cc = enrich.corrected_contact;
    if (cc.phone && cc.phone !== (facility?.phone ?? "")) {
      contactDiff.push({
        label: "Phone",
        current: facility?.phone ?? "—",
        proposed: cc.phone,
      });
    }
    if (cc.email && cc.email !== (facility?.email ?? "")) {
      contactDiff.push({
        label: "Email",
        current: facility?.email ?? "—",
        proposed: cc.email,
      });
    }
    if (cc.website && cc.website !== (facility?.website ?? "")) {
      contactDiff.push({
        label: "Website",
        current: facility?.website ?? "—",
        proposed: cc.website,
      });
    }
  }

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Enrichment preview
      </Label>

      {enrich.logo_path && (
        <div className="flex items-center gap-3">
          <img
            src={publicClaimPhotoUrl(enrich.logo_path)}
            alt="Proposed logo"
            className="h-14 w-14 object-contain rounded bg-background border"
            loading="lazy"
          />
          <div>
            <div className="text-xs text-muted-foreground">Logo</div>
            <div className="text-xs font-mono break-all">{enrich.logo_path}</div>
          </div>
        </div>
      )}

      {enrich.photo_paths && enrich.photo_paths.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            Photos ({enrich.photo_paths.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {enrich.photo_paths.slice(0, 12).map((path) => (
              <img
                key={path}
                src={publicClaimPhotoUrl(path)}
                alt={path}
                className="h-14 w-14 object-cover rounded bg-background border"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      )}

      {enrich.services && enrich.services.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Services</div>
          <div className="flex flex-wrap gap-1">
            {enrich.services.map((slug) => (
              <Badge key={slug} variant="secondary" className="text-xs">
                {SERVICE_LABELS[slug] ?? slug}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {enrich.insurances && enrich.insurances.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Insurance</div>
          <div className="flex flex-wrap gap-1">
            {enrich.insurances.map((slug) => (
              <Badge key={slug} variant="secondary" className="text-xs">
                {INSURANCE_LABELS[slug] ?? slug}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {enrich.accreditations && enrich.accreditations.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">
            Accreditations ({enrich.accreditations.length})
          </div>
          <ul className="space-y-1.5">
            {enrich.accreditations.map((a, idx) => (
              <li
                key={`${a.type}-${idx}`}
                className="rounded-md border bg-background p-2 text-xs space-y-0.5"
              >
                <div className="font-medium">{a.type || "Untyped"}</div>
                {a.number && (
                  <div className="text-muted-foreground">
                    Number: <span className="font-mono">{a.number}</span>
                  </div>
                )}
                {a.issuing_authority && (
                  <div className="text-muted-foreground">
                    Issued by: {a.issuing_authority}
                  </div>
                )}
                {a.document_name && (
                  <div className="text-muted-foreground inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" aria-hidden />
                    {a.document_name}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {contactDiff.length > 0 && (
        <div>
          <div className="text-xs text-muted-foreground mb-1.5">Contact changes</div>
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left p-2 font-medium">Field</th>
                  <th className="text-left p-2 font-medium">Current</th>
                  <th className="text-left p-2 font-medium">Proposed</th>
                </tr>
              </thead>
              <tbody>
                {contactDiff.map((row) => (
                  <tr key={row.label} className="border-t">
                    <td className="p-2">{row.label}</td>
                    <td className="p-2 text-muted-foreground line-through">
                      {row.current}
                    </td>
                    <td className="p-2 font-medium">{row.proposed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {enrich.description && (
        <div>
          <div className="text-xs text-muted-foreground mb-1">Description</div>
          <p className="text-sm whitespace-pre-wrap rounded-md bg-background p-2 border max-h-40 overflow-y-auto">
            {enrich.description}
          </p>
        </div>
      )}
    </div>
  );
}

export default AdminClaimsReviewPanel;
