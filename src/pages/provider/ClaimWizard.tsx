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
import { WizardStepper } from "@/components/provider/WizardStepper";
import { useFacilityBySlug } from "@/hooks/useFacilityBySlug";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Database,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
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

interface WizardState {
  currentStep: number;
  claimRequestId: string | null;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string;
  claimantRole: RoleOption | "";
  claimantRoleOther: string;
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

            {state.currentStep >= 3 && (
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
            (verification, listing details, review) ship in upcoming releases.
            You can come back to this URL to pick up where you left off.
          </p>
        </div>
      </div>
    </Card>
  );
}
