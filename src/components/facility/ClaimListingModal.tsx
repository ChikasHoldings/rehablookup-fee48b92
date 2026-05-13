/**
 * ClaimListingModal
 * ─────────────────
 * Renders the "Claim this listing" submission flow as a modal dialog.
 * Triggered from a facility detail page when the facility is unclaimed
 * (i.e. `public_facilities.is_claimed === false`).
 *
 * Behavior:
 *   • If the user is NOT signed in → shows a "sign in to continue" CTA.
 *   • If signed in → shows the claim form. Fields mirror the
 *     `submit-facility-claim` edge function's validation.
 *   • On submit → POSTs to /functions/v1/submit-facility-claim. The
 *     function handles dedup (409 if claim already pending), facility
 *     existence checks, and admin notifications.
 *   • On success → shows the confirmation state with the claim ID.
 */

import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ClaimListingModalProps {
  /** The facility being claimed. */
  facilityId: string;
  facilityName: string;
  /** Controlled-open state — pass from the parent. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Whether the current visitor is signed in. If undefined, we'll check supabase auth. */
  currentUserId?: string | null;
}

interface ClaimResponse {
  success?: boolean;
  claimRequestId?: string;
  status?: string;
  createdAt?: string;
  message?: string;
  error?: string;
  code?: string;
}

const NAME_MIN = 2;
const NAME_MAX = 120;
const ROLE_MIN = 2;
const ROLE_MAX = 100;
const PHONE_MIN = 7;
const PHONE_MAX = 30;
const EVIDENCE_URL_MAX = 500;
const EVIDENCE_NOTES_MAX = 2000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ClaimListingModal({
  facilityId,
  facilityName,
  open,
  onOpenChange,
  currentUserId,
}: ClaimListingModalProps) {
  const navigate = useNavigate();

  // Form state
  const [claimantName, setClaimantName] = useState("");
  const [claimantEmail, setClaimantEmail] = useState("");
  const [claimantRole, setClaimantRole] = useState("");
  const [claimantPhone, setClaimantPhone] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceNotes, setEvidenceNotes] = useState("");

  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedClaim, setSubmittedClaim] = useState<{
    id: string;
    status: string;
  } | null>(null);

  function resetForm() {
    setClaimantName("");
    setClaimantEmail("");
    setClaimantRole("");
    setClaimantPhone("");
    setEvidenceUrl("");
    setEvidenceNotes("");
    setSubmitError(null);
    setSubmittedClaim(null);
  }

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) resetForm();
    onOpenChange(nextOpen);
  }

  function validateClientSide(): string | null {
    if (claimantName.trim().length < NAME_MIN || claimantName.trim().length > NAME_MAX) {
      return `Name must be ${NAME_MIN}–${NAME_MAX} characters.`;
    }
    if (!EMAIL_REGEX.test(claimantEmail.trim())) {
      return "Please enter a valid email address.";
    }
    if (claimantRole.trim().length < ROLE_MIN || claimantRole.trim().length > ROLE_MAX) {
      return `Role must be ${ROLE_MIN}–${ROLE_MAX} characters.`;
    }
    if (claimantPhone.trim().length > 0) {
      const p = claimantPhone.trim();
      if (p.length < PHONE_MIN || p.length > PHONE_MAX) {
        return `Phone must be ${PHONE_MIN}–${PHONE_MAX} characters.`;
      }
    }
    if (evidenceUrl.trim().length > EVIDENCE_URL_MAX) {
      return `Evidence URL must be ${EVIDENCE_URL_MAX} characters or less.`;
    }
    if (evidenceNotes.trim().length > EVIDENCE_NOTES_MAX) {
      return `Evidence notes must be ${EVIDENCE_NOTES_MAX} characters or less.`;
    }
    return null;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitError(null);

    const validationError = validateClientSide();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<ClaimResponse>(
        "submit-facility-claim",
        {
          body: {
            facilityId,
            claimantName: claimantName.trim(),
            claimantEmail: claimantEmail.trim().toLowerCase(),
            claimantRole: claimantRole.trim(),
            claimantPhone: claimantPhone.trim() || undefined,
            evidenceUrl: evidenceUrl.trim() || undefined,
            evidenceNotes: evidenceNotes.trim() || undefined,
          },
        }
      );

      // The Supabase client returns a FunctionsHttpError for 4xx/5xx that
      // still has a parsed body on `error.context`. We surface that detail
      // when present so users see the real reason (e.g. CLAIM_ALREADY_PENDING).
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } }).context;
        const code = ctx?.code;
        const friendly =
          code === "CLAIM_ALREADY_PENDING"
            ? "You already have a pending claim for this facility. Our team will review it shortly."
            : code === "FACILITY_ALREADY_CLAIMED"
            ? "This facility has already been claimed by another owner."
            : code === "FACILITY_NOT_FOUND"
            ? "We couldn't find this facility. It may have been removed."
            : ctx?.error ?? error.message ?? "Submission failed. Please try again.";
        setSubmitError(friendly);
        setSubmitting(false);
        return;
      }

      if (!data?.success || !data.claimRequestId) {
        setSubmitError("Unexpected response from server. Please try again.");
        setSubmitting(false);
        return;
      }

      setSubmittedClaim({ id: data.claimRequestId, status: data.status ?? "pending" });
      toast.success("Claim submitted", {
        description: "We'll review your claim within 1–2 business days.",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error.";
      setSubmitError(`Submission failed: ${message}`);
    } finally {
      setSubmitting(false);
    }
  }

  // Not signed in → show sign-in CTA instead of the form
  if (open && !currentUserId) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign in to claim this listing</DialogTitle>
            <DialogDescription>
              To claim <span className="font-medium">{facilityName}</span>, you'll need to
              sign in or create an account. This lets us verify your identity and
              connect the listing to you.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleClose(false);
                navigate(
                  `/login?returnTo=${encodeURIComponent(
                    `/facility/${facilityId}?claim=1`
                  )}`
                );
              }}
            >
              Sign in to continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Submitted → show confirmation
  if (submittedClaim) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" aria-hidden />
              <DialogTitle>Claim submitted</DialogTitle>
            </div>
            <DialogDescription className="pt-2">
              Thanks — we've recorded your claim for{" "}
              <span className="font-medium">{facilityName}</span>. Our team will
              review it within 1–2 business days and contact you at{" "}
              <span className="font-medium">{claimantEmail}</span> with next steps,
              including identity verification.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <div className="text-muted-foreground">Claim reference</div>
            <div className="font-mono text-xs break-all">{submittedClaim.id}</div>
          </div>
          <DialogFooter>
            <Button onClick={() => handleClose(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Default → claim form
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
            <DialogTitle>Claim this listing</DialogTitle>
          </div>
          <DialogDescription>
            You're claiming{" "}
            <span className="font-medium text-foreground">{facilityName}</span>.
            Our team will review your submission and verify your relationship to
            this facility before transferring control.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="claim-name">
                Your full name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="claim-name"
                value={claimantName}
                onChange={(e) => setClaimantName(e.target.value)}
                required
                minLength={NAME_MIN}
                maxLength={NAME_MAX}
                autoComplete="name"
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-role">
                Your role at the facility <span className="text-destructive">*</span>
              </Label>
              <Input
                id="claim-role"
                value={claimantRole}
                onChange={(e) => setClaimantRole(e.target.value)}
                placeholder="e.g. Owner, Admissions Director"
                required
                minLength={ROLE_MIN}
                maxLength={ROLE_MAX}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="claim-email">
                Verification email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="claim-email"
                type="email"
                value={claimantEmail}
                onChange={(e) => setClaimantEmail(e.target.value)}
                placeholder="you@facility.org"
                required
                autoComplete="email"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Prefer a facility-domain email — it speeds up verification.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="claim-phone">
                Phone <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="claim-phone"
                type="tel"
                value={claimantPhone}
                onChange={(e) => setClaimantPhone(e.target.value)}
                placeholder="(555) 555-0100"
                minLength={PHONE_MIN}
                maxLength={PHONE_MAX}
                autoComplete="tel"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-evidence-url">
              Verification link{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input
              id="claim-evidence-url"
              type="url"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
              placeholder="https://your-facility-site.org/staff"
              maxLength={EVIDENCE_URL_MAX}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              A page on your facility's website that confirms your role, a state
              license listing, or a LinkedIn profile.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="claim-evidence-notes">
              Anything else we should know?{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id="claim-evidence-notes"
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="e.g. I'm the new admissions director — previous email contact was…"
              rows={3}
              maxLength={EVIDENCE_NOTES_MAX}
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              {evidenceNotes.length} / {EVIDENCE_NOTES_MAX}
            </p>
          </div>

          {submitError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" aria-hidden />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Submitting…" : "Submit claim"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
