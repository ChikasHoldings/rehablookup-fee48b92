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
 *   • (Pre-2026-05-17 the trigger also seeded a provider_credits row;
 *     that table + the entire unlock-credit model are retired — no
 *     credit-side initialization happens any more.)
 *
 * Routes: mount this at /admin/claims (or wherever your admin routes live).
 * Access control: gate the parent route on `is_admin(auth.uid())` so non-
 * admins never reach this component.
 */

import { Fragment, useEffect, useMemo, useState } from "react";
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
import { useAdminAuth } from "@/hooks/useAdminAuth";

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
  const { adminRole } = useAdminAuth();
  // Approve transfers facility ownership — restrict to super_admin/manager.
  const canApproveClaims = adminRole === "super_admin" || adminRole === "manager";
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
  const [approvalNotes, setApprovalNotes] = useState("");
  // Claim IDs where the side-effect notification email failed. The DB write
  // already committed, so we surface a per-row "Resend notification" button
  // and let the admin retry. Cleared when fetchClaims() refreshes.
  const [emailFailedForClaimId, setEmailFailedForClaimId] = useState<string | null>(null);
  const [resendPending, setResendPending] = useState<string | null>(null);

  /**
   * Atomic state transition for a facility_claim_request.
   *
   * Hardened against four production failure modes:
   *   1. Lost admin identity — fetches the acting admin BEFORE the update so
   *      reviewed_by is always populated and the audit log records who acted.
   *   2. Race conditions — uses an optimistic-concurrency `.in('status',
   *      validFromStatuses)` predicate so the update only takes effect when
   *      the row is still in an expected state. If a second admin got there
   *      first, the update affects 0 rows and we throw a clear error
   *      ("already actioned").
   *   3. Missing audit trail — writes an admin_audit_log row for every
   *      transition so we can reconstruct who approved/rejected which
   *      claim for compliance + dispute resolution.
   *   4. Email failure isolation — if the post-write email side-effect
   *      fails, the DB transition is already committed; we return
   *      `{ emailSent: false, mailErr }` and let the caller surface a
   *      retry UI instead of failing the whole approval.
   */
  async function transitionClaim(opts: {
    claim: ClaimRow;
    toStatus: "under_review" | "approved" | "rejected" | "withdrawn";
    validFromStatuses: string[];
    extraFields?: Record<string, unknown>;
    actionLabel: string;
    sendEmailFn?: string;
  }): Promise<{ emailSent?: boolean; mailErr?: unknown }> {
    const { claim, toStatus, validFromStatuses, extraFields, actionLabel, sendEmailFn } = opts;

    // 1. Capture acting admin BEFORE the mutation.
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) throw new Error(`Could not verify admin session: ${userErr.message}`);
    const adminUserId = userData.user?.id;
    if (!adminUserId) throw new Error("Sign-in expired — please log back in.");

    // 2. Conditional update with optimistic-concurrency guard. The `.in(...)`
    //    predicate ensures we never blindly overwrite a row a second admin
    //    already actioned. `.select('id')` lets us tell whether 0 rows
    //    matched (which means: someone got here first or the claim was
    //    withdrawn).
    const { data: updated, error: updErr } = await supabase
      .from("facility_claim_requests")
      .update({
        status: toStatus,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminUserId,
        ...(extraFields ?? {}),
      })
      .eq("id", claim.id)
      .in("status", validFromStatuses)
      .select("id");
    if (updErr) throw updErr;
    if (!updated || updated.length === 0) {
      throw new Error(
        "This claim was already actioned by another admin or is no longer in a reviewable state. Refresh to see the current status.",
      );
    }

    // 3. Audit log — non-fatal on failure but logged because compliance
    //    requires the trail. We DON'T await blockingly with a hard throw;
    //    a failed audit-log insert shouldn't block the legitimate DB state.
    try {
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUserId,
        action_type: actionLabel,
        target_type: "facility_claim_request",
        target_id: claim.id,
        details: {
          facility_id: claim.facility_id,
          claimant_user_id: claim.claimant_user_id,
          to_status: toStatus,
          from_status: claim.status,
          ...(extraFields ?? {}),
        },
      });
    } catch (auditErr) {
      console.warn("[AdminClaims] audit log write failed", auditErr);
    }

    // 3b. In-app provider notification mirroring the decision into the
    //     provider's bell (they also get an email via the side-effect below).
    //     Best-effort: the claim decision is already committed, so a
    //     notification failure must never surface as a decision failure.
    //     Only the terminal approve/reject decisions are mirrored.
    if (toStatus === "approved" || toStatus === "rejected") {
      try {
        const approved = toStatus === "approved";
        const facilityName = claim.facilities?.name ?? "your facility";
        await supabase.rpc("create_provider_notification", {
          p_user_id: claim.claimant_user_id,
          p_facility_id: claim.facility_id,
          p_type: approved ? "claim_approved" : "claim_rejected",
          p_title: approved ? "Facility claim approved" : "Facility claim not approved",
          p_message: approved
            ? `Your claim for ${facilityName} has been approved — you now manage this listing.`
            : `Your claim for ${facilityName} was not approved. Open your claim to see the reason and next steps.`,
          p_metadata: { link: "/provider/claims", claim_id: claim.id },
        });
      } catch (notifyErr) {
        console.warn("[AdminClaims] in-app notification failed", notifyErr);
      }
    }

    // 4. Side-effect email. Caller chooses whether to surface a banner
    //    when emailSent === false so the admin can manually resend.
    if (sendEmailFn) {
      try {
        const { error: mailErr } = await supabase.functions.invoke(sendEmailFn, {
          body: { claimRequestId: claim.id },
        });
        if (mailErr) return { emailSent: false, mailErr };
        return { emailSent: true };
      } catch (mailErr) {
        return { emailSent: false, mailErr };
      }
    }
    return {};
  }

  // Manually re-trigger the approval email for a claim where the side-effect
  // failed during the original transition. Used by the "Resend" banner button.
  async function resendApprovalEmail(claim: ClaimRow) {
    setResendPending(claim.id);
    try {
      const fn = claim.status === "approved" ? "send-claim-approval-email" : "send-claim-rejection-email";
      const { error } = await supabase.functions.invoke(fn, {
        body: { claimRequestId: claim.id },
      });
      if (error) throw error;
      toast.success("Notification email resent.");
      setEmailFailedForClaimId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resend failed");
    } finally {
      setResendPending(null);
    }
  }

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
      const { data: updated, error: updErr } = await supabase
        .from("facility_claim_requests")
        .update({
          verification_status: "verified",
          verified_at: new Date().toISOString(),
        })
        .eq("id", claim.id)
        .select("id");
      if (updErr) throw updErr;
      if (!updated || updated.length === 0) {
        throw new Error("Update was blocked — the claim may have been actioned by another admin. Refresh to see current status.");
      }
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
      await transitionClaim({
        claim,
        toStatus: "under_review",
        validFromStatuses: ["pending"],
        actionLabel: "claim_under_review",
      });
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
      const result = await transitionClaim({
        claim,
        toStatus: "approved",
        validFromStatuses: ["pending", "under_review"],
        extraFields: { decision_notes: approvalNotes.trim() || null },
        actionLabel: "claim_approved",
        // After the DB write, fire the approval email. The DB trigger has
        // already transferred ownership by the time we get here.
        sendEmailFn: "send-claim-approval-email",
      });
      if (result.emailSent === false) {
        // Email failed but DB write committed — surface a persistent banner
        // with a manual resend button instead of a transient warning toast.
        setEmailFailedForClaimId(claim.id);
        toast.warning(
          "Approval saved. The notification email could not be sent — use the Resend button on the claim row to retry.",
          { duration: 8000 },
        );
      } else {
        toast.success(
          `Claim approved — ${claim.facilities?.name ?? "facility"} transferred to ${claim.claimant_name}`,
        );
      }
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
      const result = await transitionClaim({
        claim,
        toStatus: "rejected",
        validFromStatuses: ["pending", "under_review"],
        extraFields: { rejection_reason: reason },
        actionLabel: "claim_rejected",
        sendEmailFn: "send-claim-rejection-email",
      });
      if (result.emailSent === false) {
        toast.warning(
          "Rejection saved but the notification email failed to send.",
          { duration: 8000 },
        );
      } else {
        toast.success("Claim rejected");
      }
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
                <Fragment key={claim.id}>
                  <TableRow
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
                      {emailFailedForClaimId === claim.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="ml-2 h-7 text-xs gap-1 border-amber-300 text-amber-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            resendApprovalEmail(claim);
                          }}
                          disabled={resendPending === claim.id}
                          aria-label={`Resend notification email to ${claim.claimant_name}`}
                        >
                          {resendPending === claim.id ? "Sending…" : "Resend email"}
                        </Button>
                      )}
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

                          {claim.decision_notes && (
                            <div>
                              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                                Internal decision notes
                              </Label>
                              <div className="text-sm mt-1 whitespace-pre-wrap rounded-md bg-background p-3 border">
                                {claim.decision_notes}
                              </div>
                            </div>
                          )}

                          {claim.reviewed_at && (
                            <div className="text-xs text-muted-foreground">
                              Reviewed {formatTimestamp(claim.reviewed_at)}
                            </div>
                          )}

                          <VerificationPanel claim={claim} signedUrls={signedUrls} />

                          <VerificationEnginePanel claimId={claim.id} />

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
                              {canApproveClaims && (
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
                              )}
                              {canApproveClaims && (
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
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Approve confirmation */}
      <AlertDialog open={!!approveTarget} onOpenChange={(open) => { if (!open) { setApproveTarget(null); setApprovalNotes(""); } }}>
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
          <div className="space-y-2">
            <Label htmlFor="approve-notes">Internal notes (optional)</Label>
            <Textarea
              id="approve-notes"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Verified license with the state board on 5/25. Internal only — not shown to the claimant."
              rows={3}
              maxLength={500}
            />
          </div>
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

/**
 * VerificationEnginePanel
 * ──────────────────────
 * Surfaces the two-axis verification engine (verification_attempts +
 * verification_signals) state for a single claim. Pulls the latest
 * attempt and the per-signal audit log so reviewers see WHY a claim
 * routed to manual review (which axis fell short, which rungs the
 * claimant cleared).
 */
type EngineAttempt = {
  id: string;
  status: string;
  legitimacy_score: number | null;
  ownership_score: number | null;
  confidence_score: number | null;
  final_decision: string | null;
  routed_to_review: boolean;
  review_reasons: Array<{ rule: string; detail: string }> | null;
  trigger_reason: string;
  started_at: string;
  completed_at: string | null;
};

type EngineSignal = {
  id: string;
  axis: "legitimacy" | "ownership";
  signal_type: string;
  score: number | null;
  passed: boolean | null;
  reasons: Array<{ rule: string; detail: string }> | null;
  is_hard_fraud_signal: boolean;
  created_at: string;
};

type EngineConfig = {
  auto_approve_threshold: number;
  legitimacy_min_threshold: number;
  ownership_min_threshold: number;
};

function VerificationEnginePanel({ claimId }: { claimId: string }) {
  const [attempt, setAttempt] = useState<EngineAttempt | null>(null);
  const [signals, setSignals] = useState<EngineSignal[]>([]);
  const [config, setConfig] = useState<EngineConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const [{ data: aRows }, { data: cfgRows }] = await Promise.all([
        supabase
          .from("verification_attempts")
          .select(
            "id,status,legitimacy_score,ownership_score,confidence_score,final_decision,routed_to_review,review_reasons,trigger_reason,started_at,completed_at",
          )
          .eq("claim_id", claimId)
          .order("started_at", { ascending: false })
          .limit(1),
        supabase
          .from("verification_config")
          .select(
            "auto_approve_threshold,legitimacy_min_threshold,ownership_min_threshold",
          )
          .eq("id", 1)
          .maybeSingle(),
      ]);
      if (!mounted) return;
      const a = (aRows?.[0] ?? null) as EngineAttempt | null;
      setAttempt(a);
      setConfig((cfgRows as EngineConfig | null) ?? null);
      if (a?.id) {
        const { data: sRows } = await supabase
          .from("verification_signals")
          .select(
            "id,axis,signal_type,score,passed,reasons,is_hard_fraud_signal,created_at",
          )
          .eq("attempt_id", a.id)
          .order("created_at", { ascending: true });
        if (mounted) setSignals((sRows ?? []) as EngineSignal[]);
      } else {
        setSignals([]);
      }
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, [claimId]);

  if (loading) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        Loading verification engine…
      </div>
    );
  }
  if (!attempt) {
    return (
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        No verification engine attempt for this claim yet.
      </div>
    );
  }

  const legitOK =
    config != null &&
    attempt.legitimacy_score != null &&
    Number(attempt.legitimacy_score) >= Number(config.legitimacy_min_threshold);
  const ownerOK =
    config != null &&
    attempt.ownership_score != null &&
    Number(attempt.ownership_score) >= Number(config.ownership_min_threshold);
  const combinedOK =
    config != null &&
    attempt.confidence_score != null &&
    Number(attempt.confidence_score) >= Number(config.auto_approve_threshold);

  const decisionBadge: {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  } = (() => {
    if (attempt.final_decision === "auto_approved")
      return { label: "Auto-approved", variant: "outline" };
    if (attempt.final_decision === "manual_review")
      return { label: "Manual review", variant: "secondary" };
    if (attempt.final_decision === "rejected")
      return { label: "Rejected", variant: "destructive" };
    return { label: `In progress (${attempt.status})`, variant: "default" };
  })();

  return (
    <div className="rounded-md border bg-muted/30 p-3 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Verification engine
        </Label>
        <Badge variant={decisionBadge.variant}>{decisionBadge.label}</Badge>
        <Badge variant="outline" className="text-xs">
          trigger: {attempt.trigger_reason}
        </Badge>
      </div>

      <div className="grid gap-2 md:grid-cols-3 text-xs">
        <div className="rounded border p-2 bg-background">
          <div className="text-muted-foreground">Legitimacy</div>
          <div className="text-lg font-medium">
            {attempt.legitimacy_score != null
              ? Number(attempt.legitimacy_score).toFixed(1)
              : "—"}
            <span className="text-muted-foreground text-sm">
              {" "}
              / {config?.legitimacy_min_threshold ?? "—"}
            </span>
          </div>
          <Badge
            variant={legitOK ? "outline" : "destructive"}
            className="mt-1 text-[10px]"
          >
            {legitOK ? "above threshold" : "below threshold"}
          </Badge>
        </div>
        <div className="rounded border p-2 bg-background">
          <div className="text-muted-foreground">Ownership</div>
          <div className="text-lg font-medium">
            {attempt.ownership_score != null
              ? Number(attempt.ownership_score).toFixed(1)
              : "—"}
            <span className="text-muted-foreground text-sm">
              {" "}
              / {config?.ownership_min_threshold ?? "—"}
            </span>
          </div>
          <Badge
            variant={ownerOK ? "outline" : "destructive"}
            className="mt-1 text-[10px]"
          >
            {ownerOK ? "above threshold" : "below threshold"}
          </Badge>
        </div>
        <div className="rounded border p-2 bg-background">
          <div className="text-muted-foreground">Combined</div>
          <div className="text-lg font-medium">
            {attempt.confidence_score != null
              ? Number(attempt.confidence_score).toFixed(1)
              : "—"}
            <span className="text-muted-foreground text-sm">
              {" "}
              / {config?.auto_approve_threshold ?? "—"}
            </span>
          </div>
          <Badge
            variant={combinedOK ? "outline" : "destructive"}
            className="mt-1 text-[10px]"
          >
            {combinedOK ? "auto-approve cleared" : "below auto-approve"}
          </Badge>
        </div>
      </div>

      {attempt.review_reasons && attempt.review_reasons.length > 0 && (
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Review reasons
          </Label>
          <ul className="mt-1 text-xs space-y-1 list-disc pl-4">
            {attempt.review_reasons.map((r, i) => (
              <li key={i}>
                <span className="font-medium">{r.rule}</span>: {r.detail}
              </li>
            ))}
          </ul>
        </div>
      )}

      {signals.length > 0 && (
        <div>
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">
            Signal audit ({signals.length})
          </Label>
          <div className="mt-1 border rounded overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-background">
                <tr>
                  <th className="px-2 py-1 text-left">Axis</th>
                  <th className="px-2 py-1 text-left">Signal</th>
                  <th className="px-2 py-1 text-right">Score</th>
                  <th className="px-2 py-1">Pass</th>
                  <th className="px-2 py-1 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {signals.map((s) => (
                  <tr key={s.id} className="border-t">
                    <td className="px-2 py-1">{s.axis}</td>
                    <td className="px-2 py-1">
                      {s.signal_type}
                      {s.is_hard_fraud_signal && (
                        <Badge
                          variant="destructive"
                          className="ml-1 text-[10px]"
                        >
                          hard fraud
                        </Badge>
                      )}
                    </td>
                    <td className="px-2 py-1 text-right">
                      {s.score != null ? Number(s.score).toFixed(1) : "—"}
                    </td>
                    <td className="px-2 py-1 text-center">
                      {s.passed === true ? "✓" : s.passed === false ? "✗" : "—"}
                    </td>
                    <td className="px-2 py-1 text-muted-foreground">
                      {s.reasons && s.reasons.length > 0
                        ? s.reasons[0].detail
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
