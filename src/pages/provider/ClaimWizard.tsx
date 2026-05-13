/**
 * Claim Wizard — multi-step provider flow
 * ───────────────────────────────────────
 * Reached via /provider/claim/:slug from the "Claim This Listing" entry
 * point on unclaimed facility pages.
 *
 * Phase 2 of the wizard ships steps 1-2:
 *   Step 1 — Confirm facility
 *   Step 2 — Your role (claimant info)
 *   Steps 3-5 — placeholder ("Coming soon"); built out in later phases.
 *
 * Auth gate: anon visitors are bounced to /auth/signup with a returnTo
 * pointing back here (and `claim=1` so the entry point UI can react).
 *
 * Persistence: wizard state lives in sessionStorage keyed by
 * `claim-wizard-${slug}` so a refresh doesn't lose progress. DB-side
 * persistence happens via submit-facility-claim on step 2 submission;
 * subsequent steps will update the same claim row.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { WizardStepper } from "@/components/provider/WizardStepper";
import { useFacilityBySlug, type FacilityBaseData } from "@/hooks/useFacilityBySlug";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";

const WIZARD_STEP_LABELS = [
  "Confirm facility",
  "Your role",
  "Verification",
  "Listing details",
  "Review & submit",
];
const TOTAL_STEPS = WIZARD_STEP_LABELS.length;

const ROLE_OPTIONS = [
  "Owner",
  "Executive Director",
  "Admissions Director",
  "Clinical Director",
  "Operations Manager",
  "Marketing/Outreach",
  "Other",
] as const;
type RoleOption = (typeof ROLE_OPTIONS)[number];

type VerificationMethod = "email_domain" | "sms_phone" | "document_upload";
type VerificationView =
  | "picker"
  | "email-input"
  | "code-entry"
  | "doc-upload";

interface UploadedDoc {
  path: string;
  name: string;
}

interface WizardState {
  currentStep: number;
  claimRequestId: string | null;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  claimantRole: RoleOption | "";
  claimantRoleOther: string;
  // Step 3 state
  verificationView: VerificationView;
  verificationMethod: VerificationMethod | null;
  verificationEmail: string;
  uploadedDocs: UploadedDoc[];
}

function emptyState(): WizardState {
  return {
    currentStep: 1,
    claimRequestId: null,
    claimantName: "",
    claimantEmail: "",
    claimantPhone: "",
    claimantRole: "",
    claimantRoleOther: "",
    verificationView: "picker",
    verificationMethod: null,
    verificationEmail: "",
    uploadedDocs: [],
  };
}

function storageKey(slug: string) {
  return `claim-wizard-${slug}`;
}

function loadState(slug: string): WizardState {
  if (typeof window === "undefined") return emptyState();
  try {
    const raw = window.sessionStorage.getItem(storageKey(slug));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as Partial<WizardState>;
    return { ...emptyState(), ...parsed };
  } catch {
    return emptyState();
  }
}

function persistState(slug: string, state: WizardState) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(slug), JSON.stringify(state));
  } catch {
    // sessionStorage write failures (quota, privacy mode) are non-fatal —
    // the wizard just won't survive a refresh.
  }
}

/** Mask a phone number for display: "+12146396420" → "(214) •••-6420". */
function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "(•••) •••-••••";
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "(•••) •••-••••";
  // Drop a leading "1" country code when present, then take area code + last 4.
  const local = digits.startsWith("1") && digits.length === 11 ? digits.slice(1) : digits;
  const area = local.slice(0, 3).padStart(3, "•");
  const last4 = local.slice(-4);
  return `(${area}) •••-${last4}`;
}

function dataSourceLabel(source: string | null | undefined): string {
  if (!source) return "Public records";
  switch (source) {
    case "samhsa_import":
      return "SAMHSA records";
    case "manual":
      return "Manually added";
    case "provider":
      return "Provider-submitted";
    default:
      return source.replace(/_/g, " ");
  }
}

export default function ClaimWizard() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [authChecking, setAuthChecking] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [state, setState] = useState<WizardState>(() =>
    slug ? loadState(slug) : emptyState(),
  );
  const [submittingStep2, setSubmittingStep2] = useState(false);

  // Persist state to sessionStorage on every change.
  useEffect(() => {
    if (slug) persistState(slug, state);
  }, [slug, state]);

  // Auth gate. If signed out, bounce to /auth/signup with returnTo so the
  // user can come back. The `claim=1` query param is informational; signup
  // pages can react if they want a different copy variant.
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session?.user) {
        const returnTo = `/provider/claim/${slug ?? ""}`;
        const search = new URLSearchParams({ returnTo, claim: "1" }).toString();
        navigate(`/auth/signup?${search}`, { replace: true });
        return;
      }
      setCurrentUserId(session.user.id);
      setCurrentUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [navigate, slug]);

  // Pre-fill the claimant email once we know the session, but only if the
  // user hasn't typed something else already (rehydration from sessionStorage
  // would have populated it).
  useEffect(() => {
    if (!currentUserEmail) return;
    setState((prev) =>
      prev.claimantEmail ? prev : { ...prev, claimantEmail: currentUserEmail },
    );
  }, [currentUserEmail]);

  const { facility, claimFlags, loading, notFound } = useFacilityBySlug(slug);

  const setStep = useCallback((next: number) => {
    setState((prev) => ({ ...prev, currentStep: next }));
  }, []);

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Claim your listing — RehabLookup</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <Header />
      <main className="container mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12 max-w-2xl">
        <WizardStepper
          currentStep={state.currentStep}
          totalSteps={TOTAL_STEPS}
          labels={WIZARD_STEP_LABELS}
          onStepClick={setStep}
          className="mb-8"
        />

        {loading && (
          <Card className="p-8 flex flex-col items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden />
            <p className="text-sm text-muted-foreground">Loading facility…</p>
          </Card>
        )}

        {!loading && (notFound || !facility) && (
          <UnavailableState
            title="We couldn't find this facility"
            body="The listing may have been removed, or the link is mistyped."
          />
        )}

        {!loading && facility && claimFlags?.is_claimed && (
          <UnavailableState
            title="This facility is already claimed"
            body="Someone has already verified ownership of this listing. If you believe this is an error, contact support."
          />
        )}

        {!loading && facility && !claimFlags?.is_claimed && (
          <>
            {state.currentStep === 1 && (
              <Step1ConfirmFacility
                facility={facility}
                onNext={() => setStep(2)}
              />
            )}

            {state.currentStep === 2 && (
              <Step2YourRole
                state={state}
                setState={setState}
                facilityId={facility.id}
                submitting={submittingStep2}
                setSubmitting={setSubmittingStep2}
                onBack={() => setStep(1)}
                onSubmitted={(claimRequestId) => {
                  setState((prev) => ({
                    ...prev,
                    claimRequestId,
                    currentStep: 3,
                  }));
                }}
              />
            )}

            {state.currentStep === 3 && state.claimRequestId && currentUserId && (
              <Step3Verification
                state={state}
                setState={setState}
                facility={facility}
                claimRequestId={state.claimRequestId}
                currentUserId={currentUserId}
                onBack={() => setStep(2)}
                onComplete={() => setStep(4)}
              />
            )}

            {state.currentStep === 3 && !state.claimRequestId && (
              <UnavailableState
                title="We lost track of your claim"
                body="Please go back to step 2 and submit your details again so we can resume."
              />
            )}

            {state.currentStep >= 4 && (
              <ComingSoonState stepName={WIZARD_STEP_LABELS[state.currentStep - 1]} />
            )}
          </>
        )}
      </main>
      <Footer />
    </>
  );
}

// ─── Step 1 ───────────────────────────────────────────────────────────────

function Step1ConfirmFacility({
  facility,
  onNext,
}: {
  facility: ReturnType<typeof useFacilityBySlug>["facility"];
  onNext: () => void;
}) {
  const navigate = useNavigate();
  if (!facility) return null;

  return (
    <Card className="p-6 md:p-7 space-y-5">
      <header className="space-y-1.5">
        <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
          Is this the facility you want to claim?
        </h1>
        <p className="text-sm text-muted-foreground">
          Confirm the details below before we collect your information.
        </p>
      </header>

      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-semibold text-base text-foreground">
              {facility.name}
            </h2>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
              <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {facility.address}, {facility.city}, {facility.state} {facility.zip_code}
              </span>
            </p>
            {facility.phone && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground mt-1">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="tabular-nums">{maskPhone(facility.phone)}</span>
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="gap-1">
            <Database className="h-3 w-3" aria-hidden />
            {dataSourceLabel(facility.data_source)}
          </Badge>
        </div>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Phone numbers from public records are masked here. You'll be able to
        update contact info after verifying ownership.
      </p>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={() => navigate("/provider/onboarding")}
          className="sm:w-auto"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          This isn't right
        </Button>
        <Button onClick={onNext} className="sm:w-auto">
          This is the right facility
          <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
        </Button>
      </div>
    </Card>
  );
}

// ─── Step 2 ───────────────────────────────────────────────────────────────

interface Step2Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  facilityId: string;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onBack: () => void;
  onSubmitted: (claimRequestId: string) => void;
}

function Step2YourRole({
  state,
  setState,
  facilityId,
  submitting,
  setSubmitting,
  onBack,
  onSubmitted,
}: Step2Props) {
  const isOther = state.claimantRole === "Other";

  const effectiveRole = useMemo(() => {
    if (!state.claimantRole) return "";
    if (isOther) return state.claimantRoleOther.trim();
    return state.claimantRole;
  }, [state.claimantRole, state.claimantRoleOther, isOther]);

  const valid =
    state.claimantName.trim().length >= 2 &&
    state.claimantName.trim().length <= 120 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.claimantEmail.trim()) &&
    effectiveRole.length >= 2 &&
    effectiveRole.length <= 100 &&
    (state.claimantPhone.trim().length === 0 ||
      (state.claimantPhone.trim().length >= 7 &&
        state.claimantPhone.trim().length <= 30));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke<{
        success?: boolean;
        claimRequestId?: string;
        error?: string;
        code?: string;
      }>("submit-facility-claim", {
        body: {
          facilityId,
          claimantName: state.claimantName.trim(),
          claimantEmail: state.claimantEmail.trim().toLowerCase(),
          claimantRole: effectiveRole,
          claimantPhone: state.claimantPhone.trim() || undefined,
        },
      });

      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        const code = ctx?.code;
        const friendly =
          code === "CLAIM_ALREADY_PENDING"
            ? "You already have a pending claim for this facility. Continuing where you left off."
            : code === "FACILITY_ALREADY_CLAIMED"
            ? "This facility has already been claimed by another owner."
            : code === "FACILITY_NOT_FOUND"
            ? "We couldn't find this facility. It may have been removed."
            : ctx?.error ?? error.message ?? "Submission failed. Please try again.";
        toast.error(friendly);
        // CLAIM_ALREADY_PENDING is informational — advance anyway so the
        // user can pick up at later steps. The edge function is idempotent
        // and will return the existing claim id on subsequent calls.
        if (code !== "CLAIM_ALREADY_PENDING") {
          setSubmitting(false);
          return;
        }
      }

      const claimRequestId = data?.claimRequestId;
      if (!claimRequestId) {
        toast.error("Submission succeeded but the claim id wasn't returned. Please retry.");
        setSubmitting(false);
        return;
      }

      toast.success("Saved — let's verify your ownership.");
      onSubmitted(claimRequestId);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-6 md:p-7 space-y-5">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
            Tell us who you are
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          We'll use this to verify your relationship to the facility. None of
          it gets published until you finish all the steps and we approve the
          claim.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="claim-name">
            Your full name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="claim-name"
            value={state.claimantName}
            onChange={(e) =>
              setState((p) => ({ ...p, claimantName: e.target.value }))
            }
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claim-email">
            Verification email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="claim-email"
            type="email"
            value={state.claimantEmail}
            onChange={(e) =>
              setState((p) => ({ ...p, claimantEmail: e.target.value }))
            }
            required
            autoComplete="email"
            disabled={submitting}
          />
          <p className="text-xs text-muted-foreground">
            A work email at the facility's domain (if it has one) is fastest.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claim-phone">
            Phone <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="claim-phone"
            type="tel"
            value={state.claimantPhone}
            onChange={(e) =>
              setState((p) => ({ ...p, claimantPhone: e.target.value }))
            }
            minLength={7}
            maxLength={30}
            autoComplete="tel"
            disabled={submitting}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="claim-role">
            Your role at the facility <span className="text-destructive">*</span>
          </Label>
          <Select
            value={state.claimantRole || undefined}
            onValueChange={(value) =>
              setState((p) => ({
                ...p,
                claimantRole: value as RoleOption,
                // Clear the free-text when switching away from Other.
                claimantRoleOther: value === "Other" ? p.claimantRoleOther : "",
              }))
            }
            disabled={submitting}
          >
            <SelectTrigger id="claim-role">
              <SelectValue placeholder="Select your role" />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isOther && (
            <Input
              aria-label="Describe your role"
              placeholder="e.g. Compliance Officer"
              value={state.claimantRoleOther}
              onChange={(e) =>
                setState((p) => ({ ...p, claimantRoleOther: e.target.value }))
              }
              minLength={2}
              maxLength={100}
              disabled={submitting}
              className="mt-2"
            />
          )}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            disabled={submitting}
            className="sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
            Back
          </Button>
          <Button type="submit" disabled={!valid || submitting} className="sm:w-auto">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                Saving…
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ─── Placeholders ─────────────────────────────────────────────────────────

function UnavailableState({ title, body }: { title: string; body: string }) {
  return (
    <Card className="p-6 md:p-7 space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h1 className="font-semibold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{body}</p>
        </div>
      </div>
      <div>
        <Button asChild variant="outline">
          <Link to="/provider/onboarding">
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
            Back to onboarding
          </Link>
        </Button>
      </div>
    </Card>
  );
}

function ComingSoonState({ stepName }: { stepName: string }) {
  return (
    <Card className="p-6 md:p-7 space-y-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" aria-hidden />
        <div>
          <h1 className="font-semibold text-foreground">
            Saved — "{stepName}" is coming next
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            We've recorded what you've entered so far. The remaining steps
            ship in upcoming releases. You can come back to this URL to pick
            up where you left off.
          </p>
        </div>
      </div>
    </Card>
  );
}

// ─── Step 3 ───────────────────────────────────────────────────────────────

interface Step3Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  facility: FacilityBaseData;
  claimRequestId: string;
  currentUserId: string;
  onBack: () => void;
  onComplete: () => void;
}

function Step3Verification({
  state,
  setState,
  facility,
  claimRequestId,
  currentUserId,
  onBack,
  onComplete,
}: Step3Props) {
  const setView = (view: VerificationView) =>
    setState((p) => ({ ...p, verificationView: view }));

  return (
    <Card className="p-6 md:p-7 space-y-5">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
            Prove you can speak for {facility.name}
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Pick the verification method that works for you. Email and SMS are
          instant; document review takes 1–2 business days.
        </p>
      </header>

      {state.verificationView === "picker" && (
        <MethodPicker
          facility={facility}
          onPick={(method) => {
            setState((p) => ({ ...p, verificationMethod: method }));
            if (method === "email_domain") setView("email-input");
            else if (method === "document_upload") setView("doc-upload");
            // SMS flow opens an AlertDialog from inside MethodPicker; it
            // calls setView("code-entry") once the send succeeds.
          }}
          claimRequestId={claimRequestId}
          onSmsCodeSent={() => setView("code-entry")}
          onBack={onBack}
        />
      )}

      {state.verificationView === "email-input" && (
        <EmailInputView
          state={state}
          setState={setState}
          claimRequestId={claimRequestId}
          facilityWebsite={facility.website}
          onSent={() => setView("code-entry")}
          onUseDifferentMethod={() => {
            setState((p) => ({ ...p, verificationMethod: null }));
            setView("picker");
          }}
        />
      )}

      {state.verificationView === "code-entry" && (
        <CodeEntryView
          state={state}
          claimRequestId={claimRequestId}
          onVerified={onComplete}
          onUseDifferentMethod={() => {
            setState((p) => ({ ...p, verificationMethod: null }));
            setView("picker");
          }}
        />
      )}

      {state.verificationView === "doc-upload" && (
        <DocUploadView
          state={state}
          setState={setState}
          facilityId={facility.id}
          claimRequestId={claimRequestId}
          currentUserId={currentUserId}
          onSubmitted={onComplete}
          onUseDifferentMethod={() => {
            setState((p) => ({ ...p, verificationMethod: null }));
            setView("picker");
          }}
        />
      )}
    </Card>
  );
}

interface MethodPickerProps {
  facility: FacilityBaseData;
  onPick: (method: VerificationMethod) => void;
  claimRequestId: string;
  onSmsCodeSent: () => void;
  onBack: () => void;
}

function MethodPicker({
  facility,
  onPick,
  claimRequestId,
  onSmsCodeSent,
  onBack,
}: MethodPickerProps) {
  const hasWebsite = !!facility.website?.trim();
  const hasPhone = !!facility.phone?.trim();
  const [smsConfirmOpen, setSmsConfirmOpen] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  async function handleSmsSend() {
    setSmsSending(true);
    try {
      const { error } = await supabase.functions.invoke(
        "initiate-claim-sms-verification",
        { body: { claimRequestId } },
      );
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        const code = ctx?.code;
        const message =
          code === "PHONE_NOT_AVAILABLE"
            ? "We don't have a phone number on file for this facility."
            : code === "TOO_MANY_CODES"
            ? "Too many codes sent recently. Please wait a few minutes."
            : code === "SMS_SEND_FAILED"
            ? "Our SMS provider failed to send. Please try a different method."
            : ctx?.error ?? error.message ?? "Could not send code.";
        toast.error(message);
        setSmsSending(false);
        return;
      }
      toast.success("Code sent to the facility's phone.");
      setSmsConfirmOpen(false);
      onPick("sms_phone");
      onSmsCodeSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSmsSending(false);
    }
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-3">
        <MethodCard
          icon={Mail}
          heading="Verify with work email"
          subtext="Send a 6-digit code to your email at the facility's web domain. Fastest method."
          available={hasWebsite}
          unavailableReason={
            hasWebsite ? undefined : "This facility doesn't have a website on file."
          }
          ctaLabel="Use email"
          onSelect={() => onPick("email_domain")}
        />
        <MethodCard
          icon={MessageSquare}
          heading="Verify with SMS"
          subtext="We'll text a 6-digit code to the facility's listed number. You'll need to be there to receive it."
          available={hasPhone}
          unavailableReason={
            hasPhone ? undefined : "This facility doesn't have a phone on file."
          }
          ctaLabel="Use SMS"
          onSelect={() => setSmsConfirmOpen(true)}
        />
        <MethodCard
          icon={FileText}
          heading="Verify with a document"
          subtext="Upload a JCAHO/CARF certificate, state license, or DEA registration. Our team reviews within 1–2 business days."
          available
          ctaLabel="Use document"
          onSelect={() => onPick("document_upload")}
        />
      </div>

      <div className="flex justify-start pt-2 border-t">
        <Button variant="outline" onClick={onBack} size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          Back to your info
        </Button>
      </div>

      <AlertDialog open={smsConfirmOpen} onOpenChange={setSmsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send SMS verification code?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll send a 6-digit code to{" "}
              <span className="font-medium tabular-nums">
                {maskPhone(facility.phone)}
              </span>
              . You'll need to be at the facility to receive it. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={smsSending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSmsSend} disabled={smsSending}>
              {smsSending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
                  Sending…
                </>
              ) : (
                "Send code"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

interface MethodCardProps {
  icon: typeof Mail;
  heading: string;
  subtext: string;
  available: boolean;
  unavailableReason?: string;
  ctaLabel: string;
  onSelect: () => void;
}

function MethodCard({
  icon: Icon,
  heading,
  subtext,
  available,
  unavailableReason,
  ctaLabel,
  onSelect,
}: MethodCardProps) {
  return (
    <div
      className={
        "rounded-md border p-4 flex flex-col gap-3 " +
        (available ? "bg-card" : "bg-muted/30 opacity-75")
      }
    >
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" aria-hidden />
        </div>
        <h3 className="font-semibold text-sm">{heading}</h3>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed flex-1">
        {subtext}
      </p>
      {!available && unavailableReason && (
        <p className="text-xs text-amber-700 dark:text-amber-500 flex items-start gap-1">
          <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" aria-hidden />
          <span>{unavailableReason}</span>
        </p>
      )}
      <Button
        size="sm"
        variant={available ? "default" : "secondary"}
        onClick={onSelect}
        disabled={!available}
        className="mt-auto"
      >
        {ctaLabel}
      </Button>
    </div>
  );
}

interface EmailInputProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  claimRequestId: string;
  facilityWebsite: string | null;
  onSent: () => void;
  onUseDifferentMethod: () => void;
}

function EmailInputView({
  state,
  setState,
  claimRequestId,
  facilityWebsite,
  onSent,
  onUseDifferentMethod,
}: EmailInputProps) {
  const [submitting, setSubmitting] = useState(false);
  const [expectedDomain, setExpectedDomain] = useState<string | null>(null);

  const domainHint = useMemo(() => {
    if (!facilityWebsite) return null;
    try {
      return new URL(
        facilityWebsite.startsWith("http") ? facilityWebsite : `https://${facilityWebsite}`,
      ).hostname.replace(/^www\./, "");
    } catch {
      return null;
    }
  }, [facilityWebsite]);

  const emailValid =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.verificationEmail.trim());

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!emailValid || submitting) return;
    setSubmitting(true);
    setExpectedDomain(null);
    try {
      const { error } = await supabase.functions.invoke(
        "initiate-claim-email-verification",
        {
          body: {
            claimRequestId,
            email: state.verificationEmail.trim().toLowerCase(),
          },
        },
      );
      if (error) {
        const ctx = (error as {
          context?: { error?: string; code?: string; expectedDomain?: string };
        }).context;
        const code = ctx?.code;
        if (code === "DOMAIN_MISMATCH") {
          setExpectedDomain(ctx?.expectedDomain ?? null);
          toast.error(
            ctx?.expectedDomain
              ? `Email must end in @${ctx.expectedDomain} (or a subdomain).`
              : "Email domain doesn't match the facility's website.",
          );
        } else if (code === "WEBSITE_NOT_AVAILABLE") {
          toast.error(
            "This facility doesn't have a website on file. Try SMS or document upload instead.",
          );
        } else if (code === "TOO_MANY_CODES") {
          toast.error("Too many codes sent recently. Please wait a few minutes.");
        } else {
          toast.error(ctx?.error ?? error.message ?? "Could not send code.");
        }
        setSubmitting(false);
        return;
      }
      toast.success("Code sent — check your inbox.");
      onSent();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Send failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="verify-email">
          Work email at the facility's domain
        </Label>
        <Input
          id="verify-email"
          type="email"
          value={state.verificationEmail}
          onChange={(e) =>
            setState((p) => ({ ...p, verificationEmail: e.target.value }))
          }
          placeholder={domainHint ? `you@${domainHint}` : "you@facility.org"}
          required
          autoComplete="email"
          disabled={submitting}
        />
        {domainHint && (
          <p className="text-xs text-muted-foreground">
            Use an email at <span className="font-medium">@{domainHint}</span>{" "}
            (or a subdomain).
          </p>
        )}
        {expectedDomain && expectedDomain !== domainHint && (
          <p className="text-xs text-destructive">
            Expected domain: @{expectedDomain}
          </p>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onUseDifferentMethod}
          size="sm"
          disabled={submitting}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          Use a different method
        </Button>
        <Button type="submit" disabled={!emailValid || submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            <>
              Send code
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface CodeEntryProps {
  state: WizardState;
  claimRequestId: string;
  onVerified: () => void;
  onUseDifferentMethod: () => void;
}

function CodeEntryView({
  state,
  claimRequestId,
  onVerified,
  onUseDifferentMethod,
}: CodeEntryProps) {
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | null>(null);
  const [lockedOut, setLockedOut] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  async function handleVerify(e?: FormEvent) {
    e?.preventDefault();
    if (code.length !== 6 || verifying) return;
    setVerifying(true);
    try {
      const { error } = await supabase.functions.invoke(
        "confirm-claim-verification-code",
        { body: { claimRequestId, code } },
      );
      if (error) {
        const ctx = (error as {
          context?: { error?: string; code?: string; attemptsRemaining?: number };
        }).context;
        const errCode = ctx?.code;
        if (errCode === "CODE_MISMATCH") {
          setAttemptsRemaining(ctx?.attemptsRemaining ?? null);
          toast.error(
            ctx?.attemptsRemaining != null
              ? `Wrong code. ${ctx.attemptsRemaining} attempts left.`
              : "Wrong code. Please try again.",
          );
        } else if (errCode === "CODE_EXPIRED") {
          toast.error("Code expired. Use 'Resend' to get a new one.");
        } else if (errCode === "TOO_MANY_ATTEMPTS") {
          setLockedOut(true);
          toast.error(
            "Too many wrong attempts. Pick another verification method.",
          );
        } else {
          toast.error(ctx?.error ?? error.message ?? "Verification failed.");
        }
        setVerifying(false);
        setCode("");
        return;
      }
      toast.success("Verified.");
      onVerified();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resending || resendCooldown > 0) return;
    if (!state.verificationMethod) return;
    setResending(true);
    try {
      const fn =
        state.verificationMethod === "email_domain"
          ? "initiate-claim-email-verification"
          : "initiate-claim-sms-verification";
      const body: Record<string, string> =
        state.verificationMethod === "email_domain"
          ? { claimRequestId, email: state.verificationEmail }
          : { claimRequestId };
      const { error } = await supabase.functions.invoke(fn, { body });
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        if (ctx?.code === "TOO_MANY_CODES") {
          toast.error("Too many codes sent recently. Please wait a few minutes.");
        } else {
          toast.error(ctx?.error ?? error.message ?? "Resend failed.");
        }
        setResending(false);
        return;
      }
      toast.success("New code sent.");
      setResendCooldown(30);
      setAttemptsRemaining(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Resend failed.");
    } finally {
      setResending(false);
    }
  }

  if (lockedOut) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 flex items-start gap-2 text-sm">
          <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" aria-hidden />
          <div>
            <p className="font-medium text-destructive">Too many wrong attempts.</p>
            <p className="text-muted-foreground mt-1">
              For security, this verification attempt is locked. Pick another
              method to keep going.
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onUseDifferentMethod} size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          Pick another method
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="space-y-2">
        <Label>Enter the 6-digit code we sent you</Label>
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          disabled={verifying}
          containerClassName="justify-start"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
        {attemptsRemaining != null && attemptsRemaining > 0 && (
          <p className="text-xs text-amber-700 dark:text-amber-500">
            {attemptsRemaining} attempt{attemptsRemaining === 1 ? "" : "s"} remaining.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={resending || resendCooldown > 0}
          className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline"
        >
          {resending
            ? "Sending…"
            : resendCooldown > 0
            ? `Resend in ${resendCooldown}s`
            : "Didn't receive it? Resend"}
        </button>
        <span className="text-muted-foreground">·</span>
        <button
          type="button"
          onClick={onUseDifferentMethod}
          disabled={verifying}
          className="text-muted-foreground hover:underline"
        >
          Use a different method
        </button>
      </div>

      <div className="flex justify-end pt-2 border-t">
        <Button type="submit" disabled={code.length !== 6 || verifying}>
          {verifying ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
              Verifying…
            </>
          ) : (
            <>
              Verify
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

interface DocUploadProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  facilityId: string;
  claimRequestId: string;
  currentUserId: string;
  onSubmitted: () => void;
  onUseDifferentMethod: () => void;
}

const DOC_MAX_BYTES = 10 * 1024 * 1024;
const DOC_ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/heif,image/webp";

function DocUploadView({
  state,
  setState,
  facilityId,
  claimRequestId: _claimRequestId,
  currentUserId,
  onSubmitted,
  onUseDifferentMethod,
}: DocUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    // Reset the input so re-uploading the same filename retriggers the change.
    e.target.value = "";

    setUploading(true);
    try {
      for (const file of files) {
        if (file.size > DOC_MAX_BYTES) {
          toast.error(`${file.name} exceeds the 10 MB limit.`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${currentUserId}/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
          .from("claim-evidence")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`Upload failed for ${file.name}: ${error.message}`);
          continue;
        }
        setState((p) => ({
          ...p,
          uploadedDocs: [...p.uploadedDocs, { path, name: file.name }],
        }));
      }
    } finally {
      setUploading(false);
    }
  }

  async function removeDoc(idx: number) {
    const doc = state.uploadedDocs[idx];
    if (!doc) return;
    // Best-effort delete from storage; remove from state regardless so the
    // user isn't stuck with a file they can't dismiss.
    try {
      await supabase.storage.from("claim-evidence").remove([doc.path]);
    } catch {
      // ignore — the user can always re-upload
    }
    setState((p) => ({
      ...p,
      uploadedDocs: p.uploadedDocs.filter((_, i) => i !== idx),
    }));
  }

  async function handleSubmit() {
    if (submitting || state.uploadedDocs.length === 0) return;
    setSubmitting(true);
    try {
      // The claim row was created in step 2; this update marks the
      // verification method and adds the uploaded docs to
      // pending_enrichments so admins can review them. submit-facility-claim
      // is idempotent on (claimant_user_id, facility_id) so re-sending the
      // step-2 fields here updates the same row.
      const { error } = await supabase.functions.invoke("submit-facility-claim", {
        body: {
          facilityId,
          claimantName: state.claimantName.trim(),
          claimantEmail: state.claimantEmail.trim().toLowerCase(),
          claimantRole:
            state.claimantRole === "Other"
              ? state.claimantRoleOther.trim()
              : state.claimantRole,
          claimantPhone: state.claimantPhone.trim() || undefined,
          verificationMethod: "document_upload",
          pendingEnrichments: {
            accreditations: state.uploadedDocs.map((doc) => ({
              type: "License/Cert",
              document_path: doc.path,
              document_name: doc.name,
            })),
          },
        },
      });
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        toast.error(ctx?.error ?? error.message ?? "Could not save documents.");
        setSubmitting(false);
        return;
      }
      toast.success(
        "Documents submitted — our team reviews within 1–2 business days.",
      );
      onSubmitted();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/30 p-4">
        <p className="text-sm font-medium">What we accept</p>
        <ul className="text-xs text-muted-foreground mt-1.5 space-y-0.5 list-disc list-inside">
          <li>JCAHO, CARF, COA, NAATP, LegitScript certificate</li>
          <li>State facility license</li>
          <li>DEA registration certificate</li>
        </ul>
        <p className="text-xs text-muted-foreground mt-2">
          PDF or image, up to 10 MB per file.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="doc-upload">Documents</Label>
        <label
          htmlFor="doc-upload"
          className="block rounded-md border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer p-6 text-center"
        >
          {uploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Uploading…
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
              <Upload className="h-5 w-5" aria-hidden />
              <span>
                <span className="text-primary font-medium">Click to upload</span>{" "}
                or drag and drop
              </span>
              <span className="text-xs">PDF, JPEG, PNG, HEIC, WEBP · up to 10 MB</span>
            </div>
          )}
          <input
            id="doc-upload"
            type="file"
            multiple
            accept={DOC_ACCEPT}
            onChange={handleFileSelect}
            disabled={uploading || submitting}
            className="sr-only"
          />
        </label>
      </div>

      {state.uploadedDocs.length > 0 && (
        <ul className="space-y-2">
          {state.uploadedDocs.map((doc, idx) => (
            <li
              key={doc.path}
              className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-sm"
            >
              <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
              <span className="truncate flex-1">{doc.name}</span>
              <button
                type="button"
                onClick={() => removeDoc(idx)}
                disabled={submitting}
                aria-label={`Remove ${doc.name}`}
                className="text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onUseDifferentMethod}
          size="sm"
          disabled={submitting || uploading}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          Use a different method
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={state.uploadedDocs.length === 0 || submitting || uploading}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              Submit for review
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
