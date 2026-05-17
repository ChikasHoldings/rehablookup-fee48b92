/**
 * Claim Wizard — five-step provider claim flow at /provider/claim/:slug.
 *
 *   1. Confirm facility
 *   2. Your role (claimant info) — persists via submit-facility-claim
 *   3. Verification (email-domain / SMS-to-facility-phone / docs)
 *   4. Enrichment (services, photos, etc.)
 *   5. Review & submit
 *
 * Entry contract:
 *   - Anon visitors → /auth/signup?returnTo=/provider/claim/:slug
 *   - Signed-in users who never went through /provider/onboarding (no
 *     plan selection on file) → /provider/onboarding?intent=claim&
 *     facility_id=<id>, so they pick Free vs Pro before claiming.
 *   - Signed-in users with a plan selection → enter here directly.
 *
 * Persistence: wizard state lives in sessionStorage keyed by
 * `claim-wizard-${slug}`. submit-facility-claim writes the canonical
 * row on step 2; subsequent steps update it.
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
import { analytics } from "@/lib/analytics";
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { WizardStepper } from "@/components/provider/WizardStepper";
import { useFacilityBySlug, type FacilityBaseData } from "@/hooks/useFacilityBySlug";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Database,
  FileText,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  Trash2,
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

interface StoredFile {
  path: string;
  name: string;
}

interface CorrectedContact {
  phone: string;
  email: string;
  website: string;
}

interface AccreditationEntry {
  id: string; // client-side, stable across renders / sessionStorage
  type: string;
  number: string;
  issuing_authority: string;
  document_path?: string;
  document_name?: string;
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
  // Step 4 state (enrichment) — all optional, persisted on step transition
  step4Seeded: boolean;
  description: string;
  correctedContact: CorrectedContact;
  logo: StoredFile | null;
  photos: StoredFile[];
  services: string[];
  insurances: string[];
  accreditations: AccreditationEntry[];
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
    step4Seeded: false,
    description: "",
    correctedContact: { phone: "", email: "", website: "" },
    logo: null,
    photos: [],
    services: [],
    insurances: [],
    accreditations: [],
  };
}

const SERVICE_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "detox", label: "Detox" },
  { slug: "residential", label: "Residential" },
  { slug: "php", label: "Partial Hospitalization (PHP)" },
  { slug: "iop", label: "Intensive Outpatient (IOP)" },
  { slug: "outpatient", label: "Outpatient" },
  { slug: "mat_moud", label: "MAT / MOUD" },
  { slug: "individual_therapy", label: "Individual Therapy" },
  { slug: "group_therapy", label: "Group Therapy" },
  { slug: "family_therapy", label: "Family Therapy" },
  { slug: "dual_diagnosis", label: "Dual Diagnosis" },
  { slug: "trauma_informed", label: "Trauma-Informed Care" },
];

const INSURANCE_OPTIONS: Array<{ slug: string; label: string }> = [
  { slug: "aetna", label: "Aetna" },
  { slug: "anthem", label: "Anthem" },
  { slug: "bcbs", label: "Blue Cross Blue Shield" },
  { slug: "cigna", label: "Cigna" },
  { slug: "humana", label: "Humana" },
  { slug: "kaiser", label: "Kaiser" },
  { slug: "medicare", label: "Medicare" },
  { slug: "medicaid", label: "Medicaid" },
  { slug: "optum", label: "Optum" },
  { slug: "unitedhealthcare", label: "UnitedHealthcare" },
  { slug: "tricare", label: "TRICARE" },
  { slug: "self_pay", label: "Self-pay" },
];

const ACCREDITATION_TYPES = [
  "JCAHO",
  "CARF",
  "COA",
  "NAATP",
  "LegitScript",
  "State License",
  "DEA",
  "Other",
] as const;

const PHOTO_MAX_COUNT = 8;
const DESCRIPTION_MAX = 5000;
const PHOTO_MAX_BYTES = 10 * 1024 * 1024;
const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif,image/svg+xml";

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

  // Auth gate + plan-selection gate. Signed-out → /auth/signup with
  // returnTo. Signed-in but never went through the wizard (no plan on
  // either profiles.plan or provider_onboarding_state.plan) → bounce
  // back to /provider/onboarding so they select Free vs Pro before
  // claiming.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (cancelled) return;
      if (!session?.user) {
        const returnTo = `/provider/claim/${slug ?? ""}`;
        const search = new URLSearchParams({ returnTo, claim: "1" }).toString();
        navigate(`/auth/signup?${search}`, { replace: true });
        return;
      }
      const userId = session.user.id;
      const [{ data: profile }, { data: stateRow }] = await Promise.all([
        supabase
          .from("profiles")
          .select("plan, onboarding_completed_at")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("provider_onboarding_state")
          .select("plan, current_step, selected_facility_id")
          .eq("user_id", userId)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      const hasPlan =
        (profile as { plan?: string | null } | null)?.plan != null ||
        (stateRow as { plan?: string | null } | null)?.plan != null ||
        (profile as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at != null;
      if (!hasPlan) {
        const facilityId = (stateRow as { selected_facility_id?: string | null } | null)?.selected_facility_id ?? null;
        const params = new URLSearchParams({ intent: "claim" });
        if (facilityId) params.set("facility_id", facilityId);
        navigate(`/provider/onboarding?${params.toString()}`, { replace: true });
        return;
      }
      setCurrentUserId(userId);
      setCurrentUserEmail(session.user.email ?? null);
      setAuthChecking(false);
    })();
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

            {state.currentStep === 4 && state.claimRequestId && currentUserId && (
              <Step4Enrichment
                state={state}
                setState={setState}
                facility={facility}
                claimRequestId={state.claimRequestId}
                currentUserId={currentUserId}
                onBack={() => setStep(3)}
                onComplete={() => setStep(5)}
              />
            )}

            {state.currentStep === 5 && state.claimRequestId && currentUserId && (
              <Step5Review
                state={state}
                facility={facility}
                claimRequestId={state.claimRequestId}
                onJump={setStep}
                onBack={() => setStep(4)}
                onSubmitted={async () => {
                  try {
                    await supabase.rpc("complete_provider_onboarding");
                  } catch (e) {
                    console.warn("[ClaimWizard] onboarding completion advance failed", e);
                  }
                  navigate(`/provider/claim/${facility.slug}/submitted`, {
                    replace: true,
                  });
                }}
              />
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

      analytics.ctaClick("claim_submitted_step2", "claim_wizard");
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

  // Re-mount safety: if the user navigates back to step 3 after already
  // verifying (e.g. via the stepper dot from step 4), don't show the OTP
  // entry — show a "you're verified" card with Continue + switch-method.
  const [serverStatus, setServerStatus] = useState<
    "loading" | "verified" | "other"
  >("loading");

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("facility_claim_requests")
      .select("verification_status")
      .eq("id", claimRequestId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setServerStatus(
          data?.verification_status === "verified" ? "verified" : "other",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [claimRequestId]);

  if (serverStatus === "loading") {
    return (
      <Card className="p-6 md:p-7 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Checking verification status…
      </Card>
    );
  }

  if (serverStatus === "verified") {
    return (
      <Card className="p-6 md:p-7 space-y-5">
        <header className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
            <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
              You're already verified
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Your identity is on file. You can continue to the next step, or
            re-verify with a different method (this will reset your
            verification).
          </p>
        </header>
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // User wants to switch methods — reset client view back to
              // picker. The next initiate-* call will overwrite the
              // verification row and reset verification_status to 'pending'.
              setState((p) => ({
                ...p,
                verificationMethod: null,
                verificationEmail: "",
                verificationView: "picker",
              }));
              setServerStatus("other");
            }}
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
            Use a different method
          </Button>
          <Button onClick={onComplete}>
            Continue
            <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
          </Button>
        </div>
      </Card>
    );
  }

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
          claimantEmail={state.claimantEmail}
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
  /** Optional — when present, used to surface a "Recommended" badge on the
   *  email-domain method if the user's email matches the facility's web
   *  domain. */
  claimantEmail?: string;
  onPick: (method: VerificationMethod) => void;
  claimRequestId: string;
  onSmsCodeSent: () => void;
  onBack: () => void;
}

/**
 * Extracts a normalized hostname from a URL string. Returns null for
 * unparseable input. Strips a leading "www.".
 */
function hostnameFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Returns the apex domain (last two labels) of a hostname. */
function apexDomain(host: string): string {
  const parts = host.split(".").filter(Boolean);
  return parts.length >= 2 ? parts.slice(-2).join(".") : host;
}

function MethodPicker({
  facility,
  claimantEmail,
  onPick,
  claimRequestId,
  onSmsCodeSent,
  onBack,
}: MethodPickerProps) {
  const hasWebsite = !!facility.website?.trim();
  const hasPhone = !!facility.phone?.trim();
  // Recommend email_domain when the signed-in claimant's email already lives
  // on the facility's web apex domain — that path is single-click verifiable.
  const emailDomainRecommended = (() => {
    if (!hasWebsite || !claimantEmail) return false;
    const facilityHost = hostnameFromUrl(facility.website);
    if (!facilityHost) return false;
    const emailHost = claimantEmail.includes("@")
      ? claimantEmail.split("@")[1]?.toLowerCase().trim()
      : "";
    if (!emailHost) return false;
    return apexDomain(emailHost) === apexDomain(facilityHost);
  })();
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
          subtext={
            emailDomainRecommended
              ? "Your signed-in email already lives on this facility's domain — this will be near-instant."
              : "Send a 6-digit code to your email at the facility's web domain. Fastest method."
          }
          available={hasWebsite}
          unavailableReason={
            hasWebsite ? undefined : "This facility doesn't have a website on file."
          }
          ctaLabel="Use email"
          recommended={emailDomainRecommended}
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
  recommended?: boolean;
  onSelect: () => void;
}

function MethodCard({
  icon: Icon,
  heading,
  subtext,
  available,
  unavailableReason,
  ctaLabel,
  recommended,
  onSelect,
}: MethodCardProps) {
  return (
    <div
      className={
        "relative rounded-md border p-4 flex flex-col gap-3 " +
        (recommended && available
          ? "border-primary/50 bg-primary/[0.04] shadow-sm"
          : available
          ? "bg-card"
          : "bg-muted/30 opacity-75")
      }
    >
      {recommended && available && (
        <div className="absolute -top-2 right-3 inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
          Recommended
        </div>
      )}
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

// ─── Step 4 ───────────────────────────────────────────────────────────────

interface Step4Props {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  facility: FacilityBaseData;
  claimRequestId: string;
  currentUserId: string;
  onBack: () => void;
  onComplete: () => void;
}

function publicClaimPhotoUrl(path: string): string {
  return supabase.storage.from("claim-photos").getPublicUrl(path).data.publicUrl;
}

function buildPendingEnrichments(state: WizardState) {
  // Strip empty/falsy values so the JSONB column stays tidy.
  const correctedEntries = Object.entries(state.correctedContact).filter(
    ([, v]) => v.trim().length > 0,
  );
  const corrected_contact = correctedEntries.length
    ? Object.fromEntries(correctedEntries.map(([k, v]) => [k, v.trim()]))
    : undefined;

  return {
    description: state.description.trim() || undefined,
    corrected_contact,
    logo_path: state.logo?.path || undefined,
    photo_paths: state.photos.length ? state.photos.map((p) => p.path) : undefined,
    services: state.services.length ? state.services : undefined,
    insurances: state.insurances.length ? state.insurances : undefined,
    accreditations: state.accreditations.length
      ? state.accreditations.map((a) => ({
          type: a.type || "Other",
          number: a.number.trim() || undefined,
          issuing_authority: a.issuing_authority.trim() || undefined,
          document_path: a.document_path,
          document_name: a.document_name,
        }))
      : undefined,
  };
}

function Step4Enrichment({
  state,
  setState,
  facility,
  claimRequestId: _claimRequestId,
  currentUserId,
  onBack,
  onComplete,
}: Step4Props) {
  const [saving, setSaving] = useState(false);

  // One-time seed: pull doc-upload entries from step 3 into the accreditations
  // list, pre-fill corrected-contact from the facility row, AND pre-fill
  // description / services / insurance from the existing facility so SAMHSA
  // claimers can EDIT existing data rather than starting blank. The fetch
  // is best-effort: a failure here just leaves the section empty.
  useEffect(() => {
    if (state.step4Seeded) return;
    let cancelled = false;
    (async () => {
      const [servicesRes, insuranceRes] = await Promise.all([
        supabase
          .from("facility_services")
          .select("service_name")
          .eq("facility_id", facility.id),
        supabase
          .from("facility_insurance")
          .select("insurance_name")
          .eq("facility_id", facility.id),
      ]);
      if (cancelled) return;
      const existingServices = (servicesRes.data ?? [])
        .map((r) => (r as { service_name: string | null }).service_name)
        .filter((s): s is string => !!s && s.length > 0);
      const existingInsurances = (insuranceRes.data ?? [])
        .map((r) => (r as { insurance_name: string | null }).insurance_name)
        .filter((s): s is string => !!s && s.length > 0);

      setState((p) => {
        const seededAccreditations: AccreditationEntry[] =
          p.accreditations.length === 0 && p.uploadedDocs.length > 0
            ? p.uploadedDocs.map((doc) => ({
                id:
                  typeof crypto !== "undefined" && "randomUUID" in crypto
                    ? crypto.randomUUID()
                    : `${Date.now()}-${Math.random()}`,
                type: "",
                number: "",
                issuing_authority: "",
                document_path: doc.path,
                document_name: doc.name,
              }))
            : p.accreditations;

        const seededContact: CorrectedContact =
          p.correctedContact.phone || p.correctedContact.email || p.correctedContact.website
            ? p.correctedContact
            : {
                phone: facility.phone ?? "",
                email: "",
                website: facility.website ?? "",
              };

        return {
          ...p,
          step4Seeded: true,
          accreditations: seededAccreditations,
          correctedContact: seededContact,
          description:
            p.description.length > 0
              ? p.description
              : (facility.description ?? ""),
          services: p.services.length > 0 ? p.services : existingServices,
          insurances:
            p.insurances.length > 0 ? p.insurances : existingInsurances,
        };
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional one-time seed
  }, []);

  async function persistAndNavigate(navigate: () => void) {
    if (saving) return;
    setSaving(true);
    try {
      const pendingEnrichments = buildPendingEnrichments(state);
      const effectiveRole =
        state.claimantRole === "Other"
          ? state.claimantRoleOther.trim()
          : state.claimantRole;
      const { error } = await supabase.functions.invoke("submit-facility-claim", {
        body: {
          facilityId: facility.id,
          claimantName: state.claimantName.trim(),
          claimantEmail: state.claimantEmail.trim().toLowerCase(),
          claimantRole: effectiveRole,
          claimantPhone: state.claimantPhone.trim() || undefined,
          verificationMethod: state.verificationMethod ?? undefined,
          pendingEnrichments,
        },
      });
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        toast.error(ctx?.error ?? error.message ?? "Could not save your details.");
        setSaving(false);
        return;
      }
      navigate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-6 md:p-7 space-y-5">
      <header className="space-y-1.5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
            Add details
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every section is optional. Completing them now means your listing
          goes live the moment your claim is approved — otherwise you can fill
          them in afterward from your dashboard.
        </p>
      </header>

      <Accordion type="multiple" className="border-y divide-y -mx-1">
        <AccordionItem value="logo" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={ImageIcon}
              title="Logo"
              status={state.logo ? "Uploaded" : "Not added"}
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <LogoSection
              state={state}
              setState={setState}
              currentUserId={currentUserId}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="photos" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={ImageIcon}
              title="Photo gallery"
              status={
                state.photos.length === 0
                  ? "Not added"
                  : `${state.photos.length} of ${PHOTO_MAX_COUNT}`
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <PhotosSection
              state={state}
              setState={setState}
              currentUserId={currentUserId}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="services" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={CheckCircle2}
              title="Services offered"
              status={
                state.services.length === 0
                  ? "Not added"
                  : `${state.services.length} selected`
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <CheckboxGrid
              options={SERVICE_OPTIONS}
              value={state.services}
              onChange={(next) =>
                setState((p) => ({ ...p, services: next }))
              }
              fieldName="services"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="insurance" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={CheckCircle2}
              title="Insurance accepted"
              status={
                state.insurances.length === 0
                  ? "Not added"
                  : `${state.insurances.length} selected`
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <CheckboxGrid
              options={INSURANCE_OPTIONS}
              value={state.insurances}
              onChange={(next) =>
                setState((p) => ({ ...p, insurances: next }))
              }
              fieldName="insurances"
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="accreditations" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={ShieldCheck}
              title="Accreditations & licenses"
              status={
                state.accreditations.length === 0
                  ? "Not added"
                  : `${state.accreditations.length} on file`
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <AccreditationsSection
              state={state}
              setState={setState}
              currentUserId={currentUserId}
            />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="contact" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={Phone}
              title="Corrected contact info"
              status={
                state.correctedContact.phone ||
                state.correctedContact.email ||
                state.correctedContact.website
                  ? "Edited"
                  : "Not added"
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <ContactSection state={state} setState={setState} />
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="description" className="border-0">
          <AccordionTrigger className="px-1">
            <SectionLabel
              icon={FileText}
              title="About the facility"
              status={
                state.description.length === 0
                  ? "Not added"
                  : `${state.description.length} characters`
              }
            />
          </AccordionTrigger>
          <AccordionContent className="px-1 pt-2">
            <DescriptionSection state={state} setState={setState} />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-2 border-t">
        <Button
          variant="outline"
          onClick={() => persistAndNavigate(onBack)}
          disabled={saving}
          size="sm"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
          ) : (
            <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          )}
          Back
        </Button>
        <Button
          onClick={() => persistAndNavigate(onComplete)}
          disabled={saving}
        >
          {saving ? (
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
    </Card>
  );
}

function SectionLabel({
  icon: Icon,
  title,
  status,
}: {
  icon: typeof Mail;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-3 flex-1">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
      <span className="font-medium text-sm text-foreground">{title}</span>
      <span className="ml-auto text-xs text-muted-foreground font-normal">
        {status}
      </span>
    </div>
  );
}

interface LogoSectionProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  currentUserId: string;
}

function LogoSection({ state, setState, currentUserId }: LogoSectionProps) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("Logo must be under 10 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.includes(".")
        ? file.name.slice(file.name.lastIndexOf(".") + 1).toLowerCase()
        : "png";
      const path = `${currentUserId}/logo-${Date.now()}.${ext}`;
      // Remove the prior logo if any (best-effort).
      if (state.logo?.path) {
        await supabase.storage.from("claim-photos").remove([state.logo.path]).catch(() => {});
      }
      const { error } = await supabase.storage
        .from("claim-photos")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(`Logo upload failed: ${error.message}`);
        return;
      }
      setState((p) => ({ ...p, logo: { path, name: file.name } }));
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove() {
    if (!state.logo) return;
    try {
      await supabase.storage.from("claim-photos").remove([state.logo.path]).catch(() => {});
    } finally {
      setState((p) => ({ ...p, logo: null }));
    }
  }

  return (
    <div className="space-y-3">
      {state.logo ? (
        <div className="flex items-center gap-3 rounded-md border bg-card p-3">
          <img
            src={publicClaimPhotoUrl(state.logo.path)}
            alt="Logo preview"
            className="h-16 w-16 object-contain rounded bg-muted"
            loading="lazy"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{state.logo.name}</p>
            <p className="text-xs text-muted-foreground">Uploaded</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            <Trash2 className="h-4 w-4 mr-1.5" aria-hidden />
            Remove
          </Button>
        </div>
      ) : (
        <label
          htmlFor="logo-upload"
          className="block rounded-md border-2 border-dashed border-border hover:border-primary/40 transition-colors cursor-pointer p-5 text-center"
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
                a logo
              </span>
              <span className="text-xs">JPEG, PNG, WEBP, SVG · up to 10 MB</span>
            </div>
          )}
          <input
            id="logo-upload"
            type="file"
            accept={PHOTO_ACCEPT}
            onChange={handleFile}
            disabled={uploading}
            className="sr-only"
          />
        </label>
      )}
    </div>
  );
}

interface PhotosSectionProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  currentUserId: string;
}

function PhotosSection({ state, setState, currentUserId }: PhotosSectionProps) {
  const [uploading, setUploading] = useState(false);
  const atCap = state.photos.length >= PHOTO_MAX_COUNT;

  async function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        if (state.photos.length >= PHOTO_MAX_COUNT) {
          toast.warning(`Up to ${PHOTO_MAX_COUNT} photos. Remove one to add more.`);
          break;
        }
        if (file.size > PHOTO_MAX_BYTES) {
          toast.error(`${file.name} exceeds the 10 MB limit.`);
          continue;
        }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${currentUserId}/photos/${Date.now()}-${safeName}`;
        const { error } = await supabase.storage
          .from("claim-photos")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) {
          toast.error(`Upload failed for ${file.name}: ${error.message}`);
          continue;
        }
        // Functional update so we don't race against a stale closure when
        // uploading multiple files in a single batch.
        setState((p) => ({
          ...p,
          photos: [...p.photos, { path, name: file.name }],
        }));
      }
    } finally {
      setUploading(false);
    }
  }

  function move(idx: number, direction: -1 | 1) {
    setState((p) => {
      const next = [...p.photos];
      const target = idx + direction;
      if (target < 0 || target >= next.length) return p;
      [next[idx], next[target]] = [next[target], next[idx]];
      return { ...p, photos: next };
    });
  }

  async function remove(idx: number) {
    const doomed = state.photos[idx];
    if (!doomed) return;
    try {
      await supabase.storage.from("claim-photos").remove([doomed.path]).catch(() => {});
    } finally {
      setState((p) => ({
        ...p,
        photos: p.photos.filter((_, i) => i !== idx),
      }));
    }
  }

  return (
    <div className="space-y-3">
      {state.photos.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {state.photos.map((photo, idx) => (
            <li
              key={photo.path}
              className="flex items-center gap-2 rounded-md border bg-card p-2"
            >
              <img
                src={publicClaimPhotoUrl(photo.path)}
                alt={photo.name}
                className="h-12 w-12 object-cover rounded bg-muted shrink-0"
                loading="lazy"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{photo.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Position {idx + 1}
                </p>
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => move(idx, -1)}
                  disabled={idx === 0}
                  aria-label="Move up"
                >
                  <ChevronUp className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => move(idx, 1)}
                  disabled={idx === state.photos.length - 1}
                  aria-label="Move down"
                >
                  <ChevronDown className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => remove(idx)}
                  aria-label={`Remove ${photo.name}`}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <label
        htmlFor="photos-upload"
        className={
          "block rounded-md border-2 border-dashed transition-colors p-4 text-center " +
          (atCap || uploading
            ? "border-border bg-muted/30 cursor-not-allowed opacity-60"
            : "border-border hover:border-primary/40 cursor-pointer")
        }
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Uploading…
          </div>
        ) : atCap ? (
          <div className="text-sm text-muted-foreground">
            Maximum of {PHOTO_MAX_COUNT} photos reached.
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-sm text-muted-foreground">
            <Upload className="h-5 w-5" aria-hidden />
            <span>
              <span className="text-primary font-medium">Click to upload</span>{" "}
              photos
            </span>
            <span className="text-xs">
              JPEG, PNG, WEBP, SVG, HEIC · up to {PHOTO_MAX_COUNT} total, 10 MB each
            </span>
          </div>
        )}
        <input
          id="photos-upload"
          type="file"
          multiple
          accept={PHOTO_ACCEPT}
          onChange={handleFiles}
          disabled={atCap || uploading}
          className="sr-only"
        />
      </label>
    </div>
  );
}

interface CheckboxGridProps {
  options: Array<{ slug: string; label: string }>;
  value: string[];
  onChange: (next: string[]) => void;
  fieldName: string;
}

function CheckboxGrid({ options, value, onChange, fieldName }: CheckboxGridProps) {
  function toggle(slug: string, checked: boolean) {
    if (checked) {
      if (value.includes(slug)) return;
      onChange([...value, slug]);
    } else {
      onChange(value.filter((s) => s !== slug));
    }
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {options.map((opt) => {
        const id = `${fieldName}-${opt.slug}`;
        const checked = value.includes(opt.slug);
        return (
          <label
            key={opt.slug}
            htmlFor={id}
            className="flex items-center gap-2 rounded-md border bg-card p-2.5 text-sm cursor-pointer hover:bg-muted/40"
          >
            <Checkbox
              id={id}
              checked={checked}
              onCheckedChange={(v) => toggle(opt.slug, v === true)}
            />
            <span>{opt.label}</span>
          </label>
        );
      })}
    </div>
  );
}

interface AccreditationsSectionProps {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
  currentUserId: string;
}

function AccreditationsSection({
  state,
  setState,
  currentUserId,
}: AccreditationsSectionProps) {
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  function addRow() {
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setState((p) => ({
      ...p,
      accreditations: [
        ...p.accreditations,
        { id, type: "", number: "", issuing_authority: "" },
      ],
    }));
  }

  function updateRow(id: string, patch: Partial<AccreditationEntry>) {
    setState((p) => ({
      ...p,
      accreditations: p.accreditations.map((row) =>
        row.id === id ? { ...row, ...patch } : row,
      ),
    }));
  }

  async function removeRow(id: string) {
    const row = state.accreditations.find((r) => r.id === id);
    if (row?.document_path) {
      try {
        await supabase.storage.from("claim-evidence").remove([row.document_path]);
      } catch {
        // best-effort
      }
    }
    setState((p) => ({
      ...p,
      accreditations: p.accreditations.filter((r) => r.id !== id),
    }));
  }

  async function attachDoc(id: string, file: File) {
    if (file.size > PHOTO_MAX_BYTES) {
      toast.error("Document must be under 10 MB.");
      return;
    }
    setUploadingId(id);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${currentUserId}/${Date.now()}-${safeName}`;
      const { error } = await supabase.storage
        .from("claim-evidence")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        toast.error(`Upload failed: ${error.message}`);
        return;
      }
      // Drop the prior doc for this row (best-effort).
      const prior = state.accreditations.find((r) => r.id === id)?.document_path;
      if (prior && prior !== path) {
        await supabase.storage.from("claim-evidence").remove([prior]).catch(() => {});
      }
      updateRow(id, { document_path: path, document_name: file.name });
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className="space-y-3">
      {state.accreditations.length === 0 && (
        <p className="text-sm text-muted-foreground">
          Add any accreditations or state licenses you'd like surfaced on your
          listing. Each row needs a type; the rest is optional.
        </p>
      )}

      <ul className="space-y-3">
        {state.accreditations.map((row) => (
          <li key={row.id} className="rounded-md border bg-card p-3 space-y-2.5">
            <div className="grid gap-2.5 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <Select
                  value={row.type || undefined}
                  onValueChange={(v) => updateRow(row.id, { type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCREDITATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Number / ID</Label>
                <Input
                  value={row.number}
                  onChange={(e) => updateRow(row.id, { number: e.target.value })}
                  placeholder="Optional"
                  maxLength={120}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Issuing authority</Label>
              <Input
                value={row.issuing_authority}
                onChange={(e) =>
                  updateRow(row.id, { issuing_authority: e.target.value })
                }
                placeholder="e.g. Texas Department of State Health Services"
                maxLength={200}
              />
            </div>
            <div className="flex items-center justify-between gap-2 pt-1 border-t">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden />
                {row.document_name ? (
                  <span className="text-xs truncate">{row.document_name}</span>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No document attached
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <label
                  htmlFor={`doc-${row.id}`}
                  className="text-xs text-primary hover:underline cursor-pointer"
                >
                  {uploadingId === row.id
                    ? "Uploading…"
                    : row.document_path
                    ? "Replace"
                    : "Attach"}
                  <input
                    id={`doc-${row.id}`}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={uploadingId === row.id}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) attachDoc(row.id, f);
                    }}
                  />
                </label>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeRow(row.id)}
                  aria-label="Remove accreditation"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Button variant="outline" size="sm" onClick={addRow}>
        <Plus className="h-4 w-4 mr-1.5" aria-hidden />
        Add accreditation
      </Button>
    </div>
  );
}

function ContactSection({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1">
        <Label htmlFor="contact-phone">Phone</Label>
        <Input
          id="contact-phone"
          type="tel"
          value={state.correctedContact.phone}
          onChange={(e) =>
            setState((p) => ({
              ...p,
              correctedContact: { ...p.correctedContact, phone: e.target.value },
            }))
          }
          maxLength={30}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          type="email"
          value={state.correctedContact.email}
          onChange={(e) =>
            setState((p) => ({
              ...p,
              correctedContact: { ...p.correctedContact, email: e.target.value },
            }))
          }
          maxLength={255}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="contact-website">Website</Label>
        <Input
          id="contact-website"
          type="url"
          value={state.correctedContact.website}
          onChange={(e) =>
            setState((p) => ({
              ...p,
              correctedContact: { ...p.correctedContact, website: e.target.value },
            }))
          }
          maxLength={500}
        />
      </div>
      <p className="text-xs text-muted-foreground sm:col-span-2">
        These overwrite the public-records values once your claim is approved.
      </p>
    </div>
  );
}

function DescriptionSection({
  state,
  setState,
}: {
  state: WizardState;
  setState: React.Dispatch<React.SetStateAction<WizardState>>;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="claim-description">About the facility</Label>
      <Textarea
        id="claim-description"
        value={state.description}
        onChange={(e) =>
          setState((p) => ({ ...p, description: e.target.value }))
        }
        placeholder="What makes your program distinctive? Who do you serve best? What should families know before reaching out?"
        rows={6}
        maxLength={DESCRIPTION_MAX}
      />
      <p className="text-xs text-muted-foreground">
        {state.description.length} / {DESCRIPTION_MAX}
      </p>
    </div>
  );
}

// ─── Step 5 ───────────────────────────────────────────────────────────────

interface Step5Props {
  state: WizardState;
  facility: FacilityBaseData;
  claimRequestId: string;
  onJump: (step: number) => void;
  onBack: () => void;
  onSubmitted: () => void;
}

function Step5Review({
  state,
  facility,
  claimRequestId: _claimRequestId,
  onJump,
  onBack,
  onSubmitted,
}: Step5Props) {
  const [submitting, setSubmitting] = useState(false);

  const effectiveRole =
    state.claimantRole === "Other"
      ? state.claimantRoleOther.trim()
      : state.claimantRole;

  const verificationMethodLabel: Record<VerificationMethod | "none", string> = {
    email_domain: "Work email",
    sms_phone: "SMS to facility phone",
    document_upload: "Document upload",
    none: "Not selected",
  };

  const verificationStatusCopy = state.verificationMethod === "document_upload"
    ? "Pending admin review of your documents (1–2 business days)."
    : state.verificationMethod
    ? "Code verified."
    : "Not yet started.";

  const serviceLabels = state.services
    .map((s) => SERVICE_OPTIONS.find((o) => o.slug === s)?.label ?? s)
    .sort();
  const insuranceLabels = state.insurances
    .map((s) => INSURANCE_OPTIONS.find((o) => o.slug === s)?.label ?? s)
    .sort();

  const contactDiff = [
    state.correctedContact.phone &&
      state.correctedContact.phone !== facility.phone &&
      `Phone: ${state.correctedContact.phone}`,
    state.correctedContact.email && `Email: ${state.correctedContact.email}`,
    state.correctedContact.website &&
      state.correctedContact.website !== facility.website &&
      `Website: ${state.correctedContact.website}`,
  ].filter(Boolean) as string[];

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      // Final save — ensures pendingEnrichments is current on the claim row.
      // The edge function is idempotent on (claimant_user_id, facility_id).
      const { error } = await supabase.functions.invoke("submit-facility-claim", {
        body: {
          facilityId: facility.id,
          claimantName: state.claimantName.trim(),
          claimantEmail: state.claimantEmail.trim().toLowerCase(),
          claimantRole: effectiveRole,
          claimantPhone: state.claimantPhone.trim() || undefined,
          verificationMethod: state.verificationMethod ?? undefined,
          pendingEnrichments: buildPendingEnrichments(state),
        },
      });
      if (error) {
        const ctx = (error as { context?: { error?: string; code?: string } })
          .context;
        toast.error(ctx?.error ?? error.message ?? "Could not submit your claim.");
        setSubmitting(false);
        return;
      }
      toast.success("Claim submitted — we'll be in touch.");
      onSubmitted();
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
          <CheckCircle2 className="h-5 w-5 text-primary" aria-hidden />
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground">
            Review and submit
          </h1>
        </div>
        <p className="text-sm text-muted-foreground">
          One last look. Use the Edit link next to any section to go back
          and change something.
        </p>
      </header>

      {/* Facility — informational, not editable */}
      <div className="rounded-md border bg-muted/30 p-3">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">
          Facility
        </div>
        <div className="mt-0.5 font-medium text-foreground text-sm">
          {facility.name}
        </div>
        <div className="text-xs text-muted-foreground">
          {facility.city}, {facility.state}
        </div>
      </div>

      <ReviewSection title="Your role" onEdit={() => onJump(2)}>
        <ReviewKV label="Name" value={state.claimantName} />
        <ReviewKV label="Email" value={state.claimantEmail} />
        {state.claimantPhone && (
          <ReviewKV label="Phone" value={state.claimantPhone} />
        )}
        <ReviewKV label="Role" value={effectiveRole || "—"} />
      </ReviewSection>

      <ReviewSection title="Verification" onEdit={() => onJump(3)}>
        <ReviewKV
          label="Method"
          value={
            verificationMethodLabel[state.verificationMethod ?? "none"]
          }
        />
        <ReviewKV label="Status" value={verificationStatusCopy} />
        {state.verificationMethod === "email_domain" && state.verificationEmail && (
          <ReviewKV label="Verified email" value={state.verificationEmail} />
        )}
        {state.verificationMethod === "document_upload" &&
          state.uploadedDocs.length > 0 && (
            <ReviewKV
              label="Documents"
              value={`${state.uploadedDocs.length} uploaded`}
            />
          )}
      </ReviewSection>

      <ReviewSection title="Listing details" onEdit={() => onJump(4)}>
        {state.logo ? (
          <div className="flex items-center gap-3">
            <img
              src={publicClaimPhotoUrl(state.logo.path)}
              alt="Logo"
              className="h-14 w-14 object-contain rounded bg-muted"
              loading="lazy"
            />
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                Logo
              </div>
              <div className="text-sm">{state.logo.name}</div>
            </div>
          </div>
        ) : (
          <ReviewKV label="Logo" value="Not added" muted />
        )}

        <div>
          <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">
            Photos
          </div>
          {state.photos.length === 0 ? (
            <div className="text-sm text-muted-foreground">Not added</div>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {state.photos.slice(0, 8).map((photo) => (
                <img
                  key={photo.path}
                  src={publicClaimPhotoUrl(photo.path)}
                  alt={photo.name}
                  className="h-14 w-14 object-cover rounded bg-muted border"
                  loading="lazy"
                />
              ))}
            </div>
          )}
        </div>

        <ReviewKV
          label="Services"
          value={serviceLabels.length ? serviceLabels.join(", ") : "Not added"}
          muted={serviceLabels.length === 0}
        />
        <ReviewKV
          label="Insurance accepted"
          value={
            insuranceLabels.length ? insuranceLabels.join(", ") : "Not added"
          }
          muted={insuranceLabels.length === 0}
        />
        <ReviewKV
          label="Accreditations"
          value={
            state.accreditations.length === 0
              ? "Not added"
              : state.accreditations
                  .map((a) => a.type || "Untyped")
                  .join(", ")
          }
          muted={state.accreditations.length === 0}
        />
        <ReviewKV
          label="Contact changes"
          value={contactDiff.length ? contactDiff.join(" · ") : "None"}
          muted={contactDiff.length === 0}
        />
        {state.description ? (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">
              About
            </div>
            <p className="text-sm whitespace-pre-wrap line-clamp-4">
              {state.description}
            </p>
          </div>
        ) : (
          <ReviewKV label="About" value="Not added" muted />
        )}
      </ReviewSection>

      <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between pt-3 border-t">
        <Button variant="outline" onClick={onBack} disabled={submitting} size="sm">
          <ArrowLeft className="h-4 w-4 mr-1.5" aria-hidden />
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" aria-hidden />
              Submitting…
            </>
          ) : (
            <>
              Submit claim for review
              <ArrowRight className="h-4 w-4 ml-1.5" aria-hidden />
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}

function ReviewSection({
  title,
  onEdit,
  children,
}: {
  title: string;
  onEdit: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-semibold text-sm text-foreground">{title}</h2>
        <button
          type="button"
          onClick={onEdit}
          className="text-xs text-primary hover:underline"
        >
          Edit
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewKV({
  label,
  value,
  muted = false,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span
        className={
          muted ? "text-muted-foreground italic" : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
