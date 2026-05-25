/**
 * AddLocation — multi-step wizard for creating a new facility.
 *
 * Captures every field the public /center/<slug> page can render so a
 * new location is a complete profile from day one (text-only — photo
 * uploads need the facility id, so they happen post-create on the
 * listing editor).
 *
 * Six steps:
 *   1. Core identity (required to proceed)
 *   2. Treatment details (levels of care, services, approaches, age, languages, capacity)
 *   3. Insurance & payment
 *   4. Accreditations & licensing
 *   5. Profile content (description, video, virtual tour, amenities) + staff
 *   6. Review & submit
 *
 * Persistence: useAddLocationWizard mirrors the draft to localStorage
 * so refreshes / accidental closes don't lose work. Cleared on
 * successful submit.
 *
 * Submission writes to:
 *   facilities (core row, status='pending' so admin approves)
 *   facility_services
 *   facility_insurance
 *   facility_age_groups
 *   facility_programs (treatment approaches)
 *   facility_amenities
 *   facility_accreditations
 *   facility_staff (Pro only — capped at 3 for Free, 10 for Pro)
 *
 * Failure handling: every insert is wrapped; if a side-table insert
 * fails after the core facility row is created, we surface the partial-
 * success to the user with the failed table list — the facility still
 * exists and can be edited from the listing editor.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  AlertCircle,
  Building2,
  ClipboardList,
  Heart,
  ShieldCheck,
  ImageIcon,
  Users2,
  Loader2,
  Lock,
  Sparkles,
  Trash2,
  Plus,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneInput } from "@/components/ui/phone-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getCachedSession } from "@/lib/sessionCache";
import { useFacilityLimits } from "@/hooks/useFacilityLimits";
import { useProviderFacilities } from "@/hooks/useProviderFacilities";
import { useProStatus } from "@/hooks/useProStatus";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";
import {
  US_STATES,
  FACILITY_TYPES,
  TREATMENT_SERVICES,
  INSURANCE_PROVIDERS,
  AGE_GROUPS,
  BED_COUNT_OPTIONS,
  ACCREDITATION_OPTIONS,
} from "@/lib/facilityConstants";
import { sanitizeFacilityPayload } from "@/lib/facilitySanitization";
import { ProviderPageHeader } from "@/components/provider/ProviderPageHeader";
import {
  useAddLocationWizard,
  validateStep,
  INITIAL_DRAFT,
  type AddLocationDraft,
} from "@/hooks/useAddLocationWizard";

// Levels of care + payment options + treatment approaches +
// language options are shared with the wizard only — keep them
// inline so a future spec change doesn't require editing the
// codebase-wide constants file.
const LEVELS_OF_CARE = [
  "Detox",
  "Residential / Inpatient",
  "Partial Hospitalization (PHP)",
  "Intensive Outpatient (IOP)",
  "Outpatient",
  "Sober Living",
  "Medication-Assisted Treatment (MAT)",
  "Aftercare",
  "Telehealth",
] as const;

const TREATMENT_APPROACHES = [
  "Cognitive Behavioral Therapy (CBT)",
  "Dialectical Behavior Therapy (DBT)",
  "12-Step Facilitation",
  "Non-12-Step (SMART Recovery)",
  "Motivational Interviewing",
  "Trauma-Informed Care",
  "EMDR",
  "Holistic / Wellness",
  "Faith-Based",
  "LGBTQ-Affirming",
  "Family Therapy",
  "Group Therapy",
] as const;

const PAYMENT_OPTIONS = [
  "Insurance",
  "Self-Pay",
  "Sliding Scale",
  "Financing Available",
  "Payment Plans",
  "Scholarship / Grants",
] as const;

const COMMON_LANGUAGES = [
  "English",
  "Spanish",
  "Mandarin",
  "Vietnamese",
  "Tagalog",
  "Arabic",
  "Russian",
  "Korean",
  "Portuguese",
  "French",
  "ASL",
] as const;

const COMMON_AMENITIES = [
  "Private rooms",
  "Semi-private rooms",
  "On-site gym",
  "Yoga / meditation",
  "Pool",
  "Pet-friendly",
  "Tobacco-friendly outdoor space",
  "Equine therapy",
  "Art / music therapy",
  "Chef-prepared meals",
  "Outdoor recreation",
  "Family visitation rooms",
] as const;

const ACCESSIBILITY_FEATURES = [
  "Wheelchair accessible",
  "ASL / sign-language available",
  "Elevators on site",
  "Accessible bathrooms",
  "Service animal welcome",
  "Visual aids available",
  "Hearing-loop equipped",
  "Step-free entrances",
] as const;

const GENDER_OPTIONS = [
  { value: "All Genders", label: "All genders" },
  { value: "Men Only", label: "Men only" },
  { value: "Women Only", label: "Women only" },
] as const;

const ADMISSIONS_OPTIONS = [
  { value: "yes", label: "Yes — currently accepting" },
  { value: "no", label: "Not currently accepting" },
] as const;

const STAFF_BIO_LIMIT = 500;
const FREE_STAFF_CAP = 3;
const PRO_STAFF_CAP = 10;

type StepKey =
  | "identity"
  | "treatment"
  | "insurance"
  | "credentials"
  | "content"
  | "review";

const STEPS: { key: StepKey; label: string; icon: typeof Building2 }[] = [
  { key: "identity", label: "Identity", icon: Building2 },
  { key: "treatment", label: "Treatment", icon: ClipboardList },
  { key: "insurance", label: "Insurance", icon: Heart },
  { key: "credentials", label: "Credentials", icon: ShieldCheck },
  { key: "content", label: "Profile", icon: ImageIcon },
  { key: "review", label: "Review", icon: CheckCircle2 },
];

interface PartialSuccess {
  facilityId: string;
  failedTables: string[];
}

export default function AddLocationPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { facilities, refetch: refetchFacilities } = useProviderFacilities();
  const { used: usedLocations } = useFacilityLimits();
  const { data: proStatus } = useProStatus();
  const isPro = proStatus?.isPro ?? false;

  const [userId, setUserId] = useState<string | null>(null);
  useEffect(() => {
    getCachedSession()
      .then((session) => setUserId(session?.user?.id ?? null))
      .catch((err) => {
        // Transient session-fetch failure. Surface to console for
        // monitoring; the wizard's submit flow re-calls
        // getCachedSession and will redirect to login if it actually
        // fails at submit time, so leaving userId null here is safe.
        console.warn("[AddLocation] getCachedSession failed", err);
      });
  }, []);

  const { draft, updateField, reset, hydrated } = useAddLocationWizard(userId);
  const [activeStep, setActiveStep] = useState(0);
  const [stepErrors, setStepErrors] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [success, setSuccess] = useState<{
    facilityId: string;
    slug: string | null;
  } | null>(null);
  const [partialSuccess, setPartialSuccess] = useState<PartialSuccess | null>(null);

  // Zipcode auto-detect
  const { data: zipcodeData, isLoading: isLookingUp, lookup } = useZipcodeLookup();
  useEffect(() => {
    if (zipcodeData && !draft.city) {
      updateField("city", zipcodeData.city);
      updateField("state", zipcodeData.state);
    }
  }, [zipcodeData, draft.city, updateField]);

  const handleZipBlur = useCallback(() => {
    if (/^\d{5}$/.test(draft.zip_code)) {
      lookup(draft.zip_code);
    }
  }, [draft.zip_code, lookup]);

  // Step navigation
  const goNext = useCallback(() => {
    const errs = validateStep(activeStep, draft);
    setStepErrors(errs);
    if (errs.length > 0) {
      toast({
        title: "Please fix these before continuing",
        description: errs.join(" • "),
        variant: "destructive",
      });
      return;
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
    setStepErrors([]);
  }, [activeStep, draft, toast]);

  const goBack = useCallback(() => {
    setStepErrors([]);
    setActiveStep((s) => Math.max(s - 1, 0));
  }, []);

  const jumpToStep = useCallback(
    (target: number) => {
      // Only allow jumping FORWARD past steps that have been validated.
      // Backward jump is unrestricted. The Review step Edit-links use
      // this to send the provider back to fix something specific.
      if (target < activeStep) {
        setStepErrors([]);
        setActiveStep(target);
        return;
      }
      // Forward jump — validate each intermediate step.
      for (let i = activeStep; i < target; i++) {
        const errs = validateStep(i, draft);
        if (errs.length > 0) {
          setStepErrors(errs);
          setActiveStep(i);
          return;
        }
      }
      setActiveStep(target);
    },
    [activeStep, draft],
  );

  // Submit — creates facility + every side table row
  async function handleSubmit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setPartialSuccess(null);

    try {
      const session = await getCachedSession();
      if (!session?.user) {
        toast({
          title: "Sign in required",
          description: "Please sign in again to add a facility.",
          variant: "destructive",
        });
        navigate("/login?returnTo=/provider/add-location");
        return;
      }

      // Sanitize the core facility payload — reuses the existing
      // sanitizer (trims, strips control chars, validates URLs, etc.).
      let sanitized: Record<string, unknown>;
      try {
        sanitized = sanitizeFacilityPayload({
          name: draft.name,
          address: draft.address,
          city: draft.city,
          state: draft.state,
          zip_code: draft.zip_code,
          phone: draft.phone,
          email: draft.email || null,
          website: draft.website || null,
          facility_type: draft.facility_type,
          description: draft.description || null,
        }) as Record<string, unknown>;
      } catch (vErr) {
        toast({
          title: "Validation error",
          description:
            vErr instanceof Error
              ? vErr.message
              : "Please check your facility info.",
          variant: "destructive",
        });
        return;
      }

      // 1. Insert facility row (status=pending → admin approval pipeline)
      const insertPayload: Record<string, unknown> = {
        user_id: session.user.id,
        name: sanitized.name as string,
        address: sanitized.address as string,
        city: sanitized.city as string,
        state: sanitized.state as string,
        zip_code: sanitized.zip_code as string,
        phone: sanitized.phone as string,
        email: (sanitized.email as string | null) ?? null,
        website: (sanitized.website as string | null) ?? null,
        facility_type: sanitized.facility_type as string,
        description: (sanitized.description as string | null) ?? null,
        status: "pending",
      };
      // Pro-only enhanced fields are written even for Free providers —
      // the public profile masks them via the public_facilities view
      // anyway. This preserves the provider's data on upgrade.
      if (draft.video_url) insertPayload.video_url = draft.video_url;
      if (draft.virtual_tour_url) insertPayload.virtual_tour_url = draft.virtual_tour_url;
      if (draft.bed_count) insertPayload.bed_count = draft.bed_count;
      // Column is languages_spoken (text[]) per the existing schema.
      if (draft.languages.length > 0) insertPayload.languages_spoken = draft.languages;
      if (draft.levels_of_care.length > 0)
        insertPayload.levels_of_care = draft.levels_of_care;
      if (draft.payment_options.length > 0)
        insertPayload.payment_options = draft.payment_options;
      if (draft.dba_name) insertPayload.dba_name = draft.dba_name;
      if (draft.gender_served) insertPayload.gender_served = draft.gender_served;
      if (draft.hours_of_operation.trim())
        insertPayload.hours_of_operation = draft.hours_of_operation.trim();
      if (draft.accessibility_features.length > 0)
        insertPayload.accessibility_features = draft.accessibility_features;
      // accepting_admissions: "" stays unset (NULL hides the badge),
      // "yes" → true, "no" → false. Schema is boolean only.
      if (draft.accepting_admissions === "yes") {
        insertPayload.accepting_admissions = true;
      } else if (draft.accepting_admissions === "no") {
        insertPayload.accepting_admissions = false;
      }
      if (draft.accepts_international_patients) {
        insertPayload.accepts_international_patients = true;
      }
      if (draft.year_established) {
        const y = Number(draft.year_established);
        if (Number.isInteger(y)) insertPayload.year_established = y;
      }
      // license_number is stored on facility_credentials.licensing_info
      // (the existing free-text column the public page reads).

      const { data: newFacility, error: insertError } = await supabase
        .from("facilities")
        .insert(insertPayload)
        .select("id, slug")
        .single();

      if (insertError) {
        const code = (insertError as { code?: string }).code;
        if (code === "23505") {
          toast({
            title: "Duplicate listing",
            description:
              "You already have a facility with this name + address. Edit that one from /provider/listings.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Could not create facility",
            description: insertError.message,
            variant: "destructive",
          });
        }
        return;
      }

      const facilityId = newFacility.id;
      const failedTables: string[] = [];

      // 2. Side-table inserts. Each is wrapped — failures get added to
      //    `failedTables` so we can surface a partial-success to the
      //    provider rather than rolling back the core facility row.
      const insertSideTable = async (
        table: string,
        rows: Array<Record<string, unknown>>,
      ) => {
        if (rows.length === 0) return;
        const { error } = await supabase.from(table).insert(rows);
        if (error) {
          console.warn(`[add-location] ${table} insert failed:`, error.message);
          failedTables.push(table);
        }
      };

      await insertSideTable(
        "facility_services",
        draft.services.map((s) => ({ facility_id: facilityId, service_name: s })),
      );
      await insertSideTable(
        "facility_insurance",
        draft.insurance.map((i) => ({ facility_id: facilityId, insurance_name: i })),
      );
      await insertSideTable(
        "facility_age_groups",
        draft.age_groups.map((a) => ({ facility_id: facilityId, age_group: a })),
      );
      await insertSideTable(
        "facility_amenities",
        draft.amenities.map((a, idx) => ({
          facility_id: facilityId,
          amenity_name: a,
          display_order: idx,
        })),
      );
      await insertSideTable(
        "facility_programs",
        draft.treatment_approaches.map((approach, idx) => ({
          facility_id: facilityId,
          name: approach,
          // facility_programs.description is NOT NULL with a
          // `length(btrim(description)) > 0` CHECK. The wizard captures
          // approaches as bare names; we seed description with the
          // name itself so the row inserts cleanly. Providers can
          // enrich each program (full description + level_of_care +
          // length_text) from the enhanced-profile editor after the
          // facility is approved.
          description: approach,
          display_order: idx,
          is_visible: true,
        })),
      );
      await insertSideTable(
        "facility_accreditations",
        draft.accreditations.map((acc) => ({
          facility_id: facilityId,
          accreditation_type: acc,
        })),
      );

      // License number lives on facility_credentials.licensing_info
      // (existing free-text column). Only insert if provided.
      if (draft.license_number.trim()) {
        await insertSideTable("facility_credentials", [
          {
            facility_id: facilityId,
            licensing_info: draft.license_number.trim(),
            accreditations: draft.accreditations.length > 0 ? draft.accreditations.join(", ") : null,
          },
        ]);
      }

      // Staff — only the cap'd entries with a name+title. Photo URLs
      // are filled in post-create from the listing editor (photos need
      // facility_id-scoped storage paths).
      const staffCap = isPro ? PRO_STAFF_CAP : FREE_STAFF_CAP;
      const staffRows = draft.staff
        .filter((s) => s.name.trim() && s.job_title.trim())
        .slice(0, staffCap)
        .map((s, idx) => ({
          facility_id: facilityId,
          name: s.name.trim(),
          job_title: s.job_title.trim(),
          bio: s.bio.trim() || null,
          photo_url: "", // facility_staff.photo_url is NOT NULL; "" is a sentinel
          display_order: idx,
          is_visible: false, // hidden until a photo is added
        }));
      await insertSideTable("facility_staff", staffRows);

      // The facility row + all side-tables are committed at this point —
      // anything below is best-effort UX polish. Clear the draft FIRST
      // so a network blip on cache invalidation can't leave a stale
      // draft (the user might refresh, see the old draft, and re-submit,
      // accidentally creating a second facility).
      reset();

      // Show the right outcome screen before kicking off cache work so
      // the user gets visual confirmation even if the React Query
      // invalidation network calls hang.
      if (failedTables.length > 0) {
        setPartialSuccess({ facilityId, failedTables });
      } else {
        setSuccess({ facilityId, slug: newFacility.slug ?? null });
      }

      // Refresh React Query caches so the provider's listings list
      // updates immediately. Best-effort — failures here only mean
      // the listings page won't auto-refresh, not that the facility
      // wasn't created.
      try {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ["provider-facilities"] }),
          queryClient.invalidateQueries({ queryKey: ["facility-limits"] }),
        ]);
        refetchFacilities();
      } catch (cacheErr) {
        console.warn("[add-location] cache invalidation failed (non-fatal):", cacheErr);
      }
    } catch (err) {
      console.error("[add-location] unexpected error:", err);
      toast({
        title: "Something went wrong",
        description:
          err instanceof Error ? err.message : "Try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
      submittingRef.current = false;
    }
  }

  // Discard draft + reset
  const [discardOpen, setDiscardOpen] = useState(false);
  const doDiscard = useCallback(() => {
    reset();
    setActiveStep(0);
    setStepErrors([]);
    toast({ title: "Draft discarded" });
  }, [reset, toast]);
  // A pristine draft discards immediately; a draft with edits asks for
  // confirmation via a styled dialog (replaces the native window.confirm).
  const handleDiscard = useCallback(() => {
    if (JSON.stringify(draft) === JSON.stringify(INITIAL_DRAFT)) {
      doDiscard();
    } else {
      setDiscardOpen(true);
    }
  }, [draft, doDiscard]);

  if (!hydrated) {
    return (
      <div className="min-h-full bg-slate-50">
        <ProviderPageHeader
          title="Add Location"
          description="Loading…"
          icon={<Building2 className="h-4 w-4" />}
        />
      </div>
    );
  }

  // Success screen
  if (success) {
    return (
      <div className="min-h-full bg-slate-50">
        <Helmet>
          <title>Location added | RehabLookup Provider</title>
          <meta name="robots" content="noindex, nofollow" />
        </Helmet>
        <ProviderPageHeader
          title="Location added"
          description="Submitted for review."
          icon={<CheckCircle2 className="h-4 w-4" />}
        />
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-emerald-200 bg-emerald-50/40">
            <CardContent className="p-6 space-y-4 text-center">
              <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold">Submitted for review</h2>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Your new location is in the admin queue. We typically approve
                within 1–2 business days. You'll get a notification when it
                goes live.
              </p>
              <div className="flex flex-wrap gap-2 justify-center pt-2">
                <Button asChild>
                  <Link to="/provider/listings">Back to My Listings</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/provider/listings?facility=${success.facilityId}`}>
                    Add photos &amp; finish setup
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Partial-success screen
  if (partialSuccess) {
    return (
      <div className="min-h-full bg-slate-50">
        <ProviderPageHeader
          title="Location added with some issues"
          description="The core listing was created but some details didn't save."
          icon={<AlertCircle className="h-4 w-4" />}
        />
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <Card className="border-amber-300 bg-amber-50/40">
            <CardContent className="p-6 space-y-3">
              <p className="text-sm">
                Your facility was created successfully, but the following
                details didn't save:
              </p>
              <ul className="list-disc list-inside text-sm text-foreground">
                {partialSuccess.failedTables.map((t) => (
                  <li key={t}>{t.replace("facility_", "").replace("_", " ")}</li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground">
                You can re-enter these from the listing editor. Click below
                to continue.
              </p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button asChild>
                  <Link to={`/provider/listings?facility=${partialSuccess.facilityId}`}>
                    Continue in editor
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/provider/listings">Back to My Listings</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stepDef = STEPS[activeStep];

  return (
    <div className="min-h-full bg-slate-50">
      <Helmet>
        <title>Add Location | RehabLookup Provider</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <ProviderPageHeader
        title="Add a new location"
        description={`Step ${activeStep + 1} of ${STEPS.length} · ${stepDef.label}`}
        icon={<stepDef.icon className="h-4 w-4" />}
        backTo="/provider/listings"
        backLabel="My Listings"
        actions={
          usedLocations > 0 ? (
            <Badge variant="outline" className="text-xs">
              {usedLocations} existing
            </Badge>
          ) : null
        }
      />

      <div className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 space-y-4">
        <WizardProgress
          active={activeStep}
          steps={STEPS}
          onJump={jumpToStep}
        />

        {stepErrors.length > 0 && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
              <ul className="text-xs space-y-0.5">
                {stepErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-5 sm:p-6">
            {activeStep === 0 && (
              <Step1Identity
                draft={draft}
                updateField={updateField}
                onZipBlur={handleZipBlur}
                isZipLookingUp={isLookingUp}
              />
            )}
            {activeStep === 1 && (
              <Step2Treatment draft={draft} updateField={updateField} />
            )}
            {activeStep === 2 && (
              <Step3Insurance draft={draft} updateField={updateField} />
            )}
            {activeStep === 3 && (
              <Step4Credentials draft={draft} updateField={updateField} />
            )}
            {activeStep === 4 && (
              <Step5Content
                draft={draft}
                updateField={updateField}
                isPro={isPro}
              />
            )}
            {activeStep === 5 && (
              <Step6Review draft={draft} onEditStep={(i) => setActiveStep(i)} isPro={isPro} />
            )}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={goBack}
              disabled={activeStep === 0 || isSubmitting}
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              onClick={handleDiscard}
              disabled={isSubmitting}
              className="text-muted-foreground hover:text-destructive"
            >
              Discard draft
            </Button>
            <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Discard your draft?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Everything you've entered for this location will be deleted.
                    This can't be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep editing</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={doDiscard}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Discard draft
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div>
            {activeStep < STEPS.length - 1 ? (
              <Button onClick={goNext} disabled={isSubmitting}>
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} size="lg">
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Submit for review
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════ progress strip ════════════════════════ */

function WizardProgress({
  active,
  steps,
  onJump,
}: {
  active: number;
  steps: { key: StepKey; label: string; icon: typeof Building2 }[];
  onJump: (i: number) => void;
}) {
  return (
    <ol className="flex items-center gap-1 overflow-x-auto pb-1">
      {steps.map((s, i) => {
        const isActive = i === active;
        const isDone = i < active;
        const Icon = s.icon;
        return (
          <li key={s.key} className="flex-1 min-w-[80px]">
            <button
              type="button"
              onClick={() => onJump(i)}
              className={cn(
                "w-full flex flex-col items-center gap-1 py-1.5 px-1 rounded-md transition-colors text-[11px]",
                isActive
                  ? "bg-primary/10 text-primary"
                  : isDone
                    ? "text-emerald-600 hover:bg-slate-100"
                    : "text-muted-foreground hover:bg-slate-100",
              )}
              aria-current={isActive ? "step" : undefined}
            >
              <span
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : isDone
                      ? "bg-emerald-100 text-emerald-600"
                      : "bg-slate-200 text-slate-500",
                )}
              >
                {isDone ? (
                  <Check className="h-3.5 w-3.5" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium">{s.label}</span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

/* ════════════════════════ step 1 ════════════════════════ */

function Step1Identity({
  draft,
  updateField,
  onZipBlur,
  isZipLookingUp,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
  onZipBlur: () => void;
  isZipLookingUp: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle title="Core identity" subtitle="Required to publish." />
      <Field label="Facility name *">
        <Input
          value={draft.name}
          onChange={(e) => updateField("name", e.target.value)}
          placeholder="Sunrise Recovery Center"
          maxLength={120}
          autoComplete="organization"
        />
      </Field>
      <Field
        label="DBA / alternate name"
        hint="Only if you operate under a name different from the legal one."
      >
        <Input
          value={draft.dba_name}
          onChange={(e) => updateField("dba_name", e.target.value)}
          maxLength={120}
        />
      </Field>
      <Field label="Facility type *">
        <Select
          value={draft.facility_type}
          onValueChange={(v) => updateField("facility_type", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select facility type" />
          </SelectTrigger>
          <SelectContent>
            {FACILITY_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Street address *">
        <Input
          value={draft.address}
          onChange={(e) => updateField("address", e.target.value)}
          placeholder="123 Main St"
          maxLength={200}
          autoComplete="street-address"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="ZIP *">
          <Input
            value={draft.zip_code}
            onChange={(e) =>
              updateField("zip_code", e.target.value.replace(/\D/g, "").slice(0, 5))
            }
            onBlur={onZipBlur}
            placeholder="90210"
            inputMode="numeric"
            maxLength={5}
            autoComplete="postal-code"
          />
          {isZipLookingUp && (
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Looking up city/state…
            </p>
          )}
        </Field>
        <Field label="City *">
          <Input
            value={draft.city}
            onChange={(e) => updateField("city", e.target.value)}
            placeholder="Los Angeles"
            maxLength={80}
            autoComplete="address-level2"
          />
        </Field>
        <Field label="State *">
          <Select value={draft.state} onValueChange={(v) => updateField("state", v)}>
            <SelectTrigger>
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              {US_STATES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <Field label="Phone *">
        <PhoneInput
          value={draft.phone}
          onChange={(v) => updateField("phone", v)}
          placeholder="(555) 123-4567"
        />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Email">
          <Input
            type="email"
            value={draft.email}
            onChange={(e) => updateField("email", e.target.value)}
            placeholder="admissions@facility.com"
            autoComplete="email"
          />
        </Field>
        <Field label="Website">
          <Input
            type="url"
            value={draft.website}
            onChange={(e) => updateField("website", e.target.value)}
            placeholder="https://example.com"
          />
        </Field>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Bed count">
          <Select
            value={draft.bed_count}
            onValueChange={(v) => updateField("bed_count", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="How many beds?" />
            </SelectTrigger>
            <SelectContent>
              {BED_COUNT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Year established" hint="e.g. 2008">
          <Input
            value={draft.year_established}
            onChange={(e) =>
              updateField(
                "year_established",
                e.target.value.replace(/\D/g, "").slice(0, 4),
              )
            }
            placeholder="2008"
            inputMode="numeric"
            maxLength={4}
          />
        </Field>
      </div>
      <Field
        label="Accepting admissions"
        hint="Shown on your public page so families know whether to call."
      >
        <Select
          value={draft.accepting_admissions}
          onValueChange={(v) =>
            updateField(
              "accepting_admissions",
              v as "" | "yes" | "no",
            )
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Pick admissions status" />
          </SelectTrigger>
          <SelectContent>
            {ADMISSIONS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field
        label="International patients"
        hint="Shown on your public page so families searching from outside the US know you accept them."
      >
        <label className="flex items-center gap-2.5 cursor-pointer rounded-md border border-slate-200 px-3 py-2.5 hover:bg-slate-50">
          <Checkbox
            checked={draft.accepts_international_patients}
            onCheckedChange={(c) =>
              updateField("accepts_international_patients", c === true)
            }
          />
          <span className="text-sm text-slate-700">
            This facility accepts international patients
          </span>
        </label>
      </Field>
    </div>
  );
}

/* ════════════════════════ step 2 ════════════════════════ */

function Step2Treatment({
  draft,
  updateField,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Treatment details"
        subtitle="Help families understand what you offer."
      />
      <ChipMultiSelect
        label="Levels of care"
        options={[...LEVELS_OF_CARE]}
        selected={draft.levels_of_care}
        onChange={(v) => updateField("levels_of_care", v)}
        allowCustom
      />
      <ChipMultiSelect
        label="Services"
        options={[...TREATMENT_SERVICES]}
        selected={draft.services}
        onChange={(v) => updateField("services", v)}
        allowCustom
      />
      <ChipMultiSelect
        label="Treatment approaches"
        options={[...TREATMENT_APPROACHES]}
        selected={draft.treatment_approaches}
        onChange={(v) => updateField("treatment_approaches", v)}
        allowCustom
      />
      <ChipMultiSelect
        label="Age groups served"
        options={[...AGE_GROUPS]}
        selected={draft.age_groups}
        onChange={(v) => updateField("age_groups", v)}
      />
      <Field label="Gender served">
        <Select
          value={draft.gender_served}
          onValueChange={(v) => updateField("gender_served", v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Who do you serve?" />
          </SelectTrigger>
          <SelectContent>
            {GENDER_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <ChipMultiSelect
        label="Languages spoken"
        options={[...COMMON_LANGUAGES]}
        selected={draft.languages}
        onChange={(v) => updateField("languages", v)}
        allowCustom
      />
    </div>
  );
}

/* ════════════════════════ step 3 ════════════════════════ */

function Step3Insurance({
  draft,
  updateField,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Insurance & payment"
        subtitle="Which plans do you accept?"
      />
      <ChipMultiSelect
        label="Accepted insurance"
        options={[...INSURANCE_PROVIDERS]}
        selected={draft.insurance}
        onChange={(v) => updateField("insurance", v)}
        allowCustom
      />
      <ChipMultiSelect
        label="Payment options"
        options={[...PAYMENT_OPTIONS]}
        selected={draft.payment_options}
        onChange={(v) => updateField("payment_options", v)}
      />
    </div>
  );
}

/* ════════════════════════ step 4 ════════════════════════ */

function Step4Credentials({
  draft,
  updateField,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Accreditations & licensing"
        subtitle="These build trust and unlock the verified badge later."
      />
      <ChipMultiSelect
        label="Accreditations"
        options={ACCREDITATION_OPTIONS.map((a) => a.value)}
        selected={draft.accreditations}
        onChange={(v) => updateField("accreditations", v)}
      />
      <Field
        label="State license number"
        hint="The license issued by your state regulatory body."
      >
        <Input
          value={draft.license_number}
          onChange={(e) => updateField("license_number", e.target.value)}
          maxLength={64}
        />
      </Field>
    </div>
  );
}

/* ════════════════════════ step 5 ════════════════════════ */

function Step5Content({
  draft,
  updateField,
  isPro,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
  isPro: boolean;
}) {
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Profile content"
        subtitle="Text content for your public page. Photos come next, after the listing is approved."
      />
      <Field
        label="Facility description"
        hint={`${draft.description.length} / 2000 characters`}
      >
        <Textarea
          value={draft.description}
          onChange={(e) =>
            updateField("description", e.target.value.slice(0, 2000))
          }
          rows={5}
          placeholder="Tell families what makes your facility special — programs, philosophy, environment."
        />
      </Field>

      <ProLockedField isPro={isPro} label="Video URL">
        <Input
          type="url"
          value={draft.video_url}
          onChange={(e) => updateField("video_url", e.target.value)}
          placeholder="https://www.youtube.com/watch?v=…"
          disabled={!isPro}
        />
      </ProLockedField>

      <ProLockedField isPro={isPro} label="Virtual tour URL">
        <Input
          type="url"
          value={draft.virtual_tour_url}
          onChange={(e) => updateField("virtual_tour_url", e.target.value)}
          placeholder="https://my.matterport.com/show/?m=…"
          disabled={!isPro}
        />
      </ProLockedField>

      <ChipMultiSelect
        label="Amenities"
        options={[...COMMON_AMENITIES]}
        selected={draft.amenities}
        onChange={(v) => updateField("amenities", v)}
        allowCustom
      />

      <ChipMultiSelect
        label="Accessibility features"
        options={[...ACCESSIBILITY_FEATURES]}
        selected={draft.accessibility_features}
        onChange={(v) => updateField("accessibility_features", v)}
        allowCustom
      />

      <Field
        label="Hours of operation"
        hint="Plain text — e.g. 'Admissions Mon–Fri 8a–6p, 24/7 inquiry phone line'"
      >
        <Textarea
          value={draft.hours_of_operation}
          onChange={(e) =>
            updateField("hours_of_operation", e.target.value.slice(0, 500))
          }
          rows={2}
          placeholder="Admissions Mon–Fri 8a–6p · 24/7 inquiry line"
        />
      </Field>

      <StaffSubStep draft={draft} updateField={updateField} isPro={isPro} />
    </div>
  );
}

/* ════════════════════════ step 6 ════════════════════════ */

function Step6Review({
  draft,
  onEditStep,
  isPro,
}: {
  draft: AddLocationDraft;
  onEditStep: (i: number) => void;
  isPro: boolean;
}) {
  return (
    <div className="space-y-4">
      <SectionTitle
        title="Review and submit"
        subtitle="One last look before we send this to the admin queue. You can still edit anything."
      />
      <ReviewSection title="Core identity" onEdit={() => onEditStep(0)}>
        <p>
          <strong>{draft.name || "—"}</strong>
          {draft.dba_name && <span> (DBA {draft.dba_name})</span>}
        </p>
        <p className="text-muted-foreground">{draft.facility_type || "—"}</p>
        <p>
          {draft.address || "—"}, {draft.city || "—"}, {draft.state || "—"} {draft.zip_code}
        </p>
        <p>
          {draft.phone || "—"}
          {draft.email && <span> · {draft.email}</span>}
          {draft.website && <span> · {draft.website}</span>}
        </p>
        {draft.bed_count && <p>Beds: {draft.bed_count}</p>}
        {draft.year_established && <p>Established: {draft.year_established}</p>}
        {draft.accepting_admissions && (
          <p>
            Admissions:{" "}
            {ADMISSIONS_OPTIONS.find((o) => o.value === draft.accepting_admissions)
              ?.label ?? draft.accepting_admissions}
          </p>
        )}
        {draft.accepts_international_patients && <p>Accepts international patients</p>}
      </ReviewSection>

      <ReviewSection title="Treatment details" onEdit={() => onEditStep(1)}>
        <ReviewList label="Levels of care" items={draft.levels_of_care} />
        <ReviewList label="Services" items={draft.services} />
        <ReviewList label="Approaches" items={draft.treatment_approaches} />
        <ReviewList label="Age groups" items={draft.age_groups} />
        {draft.gender_served && <p>Gender served: {draft.gender_served}</p>}
        <ReviewList label="Languages" items={draft.languages} />
      </ReviewSection>

      <ReviewSection title="Insurance & payment" onEdit={() => onEditStep(2)}>
        <ReviewList label="Accepted insurance" items={draft.insurance} />
        <ReviewList label="Payment options" items={draft.payment_options} />
      </ReviewSection>

      <ReviewSection title="Credentials" onEdit={() => onEditStep(3)}>
        <ReviewList label="Accreditations" items={draft.accreditations} />
        {draft.license_number && <p>License: {draft.license_number}</p>}
      </ReviewSection>

      <ReviewSection title="Profile content" onEdit={() => onEditStep(4)}>
        <p className="line-clamp-4">{draft.description || "(no description)"}</p>
        {draft.video_url && <p>Video: {draft.video_url}</p>}
        {draft.virtual_tour_url && <p>Tour: {draft.virtual_tour_url}</p>}
        <ReviewList label="Amenities" items={draft.amenities} />
        <ReviewList label="Accessibility" items={draft.accessibility_features} />
        {draft.hours_of_operation && <p>Hours: {draft.hours_of_operation}</p>}
        {draft.staff.length > 0 && (
          <p className="text-muted-foreground">
            {draft.staff.filter((s) => s.name && s.job_title).length} staff member(s)
            {!isPro && " (Pro required to appear publicly)"}
          </p>
        )}
      </ReviewSection>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardContent className="p-3 text-xs flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <p>
            After submitting, the listing goes to the admin queue and is
            usually approved in 1–2 business days. You'll be able to upload
            photos and staff portraits once the listing is approved.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

/* ════════════════════════ shared widgets ════════════════════════ */

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs sm:text-sm font-medium">{label}</Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function ChipMultiSelect({
  label,
  options,
  selected,
  onChange,
  allowCustom = false,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (v: string[]) => void;
  allowCustom?: boolean;
}) {
  const [custom, setCustom] = useState("");
  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };
  const addCustom = () => {
    const t = custom.trim();
    if (!t) return;
    if (!selected.includes(t)) onChange([...selected, t]);
    setCustom("");
  };
  return (
    <Field label={label} hint={`${selected.length} selected`}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const on = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={cn(
                "text-xs px-2.5 py-1 rounded-full border transition-colors",
                on
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-slate-300 hover:border-primary/40 text-slate-700",
              )}
              aria-pressed={on}
            >
              {opt}
            </button>
          );
        })}
        {selected
          .filter((s) => !options.includes(s))
          .map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggle(s)}
              className="text-xs px-2.5 py-1 rounded-full border border-primary bg-primary text-primary-foreground inline-flex items-center gap-1"
              title="Remove"
            >
              {s}
              <Trash2 className="h-2.5 w-2.5" />
            </button>
          ))}
      </div>
      {allowCustom && (
        <div className="flex gap-1.5 mt-2">
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="Add custom…"
            className="h-8 text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
            maxLength={80}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={addCustom}
            disabled={!custom.trim()}
            className="h-8"
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      )}
    </Field>
  );
}

function ProLockedField({
  isPro,
  label,
  children,
}: {
  isPro: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs sm:text-sm font-medium flex items-center gap-1.5">
          {label}
          {!isPro && (
            <Badge variant="outline" className="text-[10px] gap-0.5">
              <Lock className="h-2.5 w-2.5" /> Pro
            </Badge>
          )}
        </Label>
        {!isPro && (
          <Button asChild variant="ghost" size="sm" className="h-6 text-[11px] gap-1">
            <Link to="/provider/subscription">
              <Sparkles className="h-3 w-3" /> Upgrade
            </Link>
          </Button>
        )}
      </div>
      <div className={cn(!isPro && "opacity-50 pointer-events-none")}>
        {children}
      </div>
      {!isPro && (
        <p className="text-[11px] text-muted-foreground">
          Free providers can prepare this field; it'll appear publicly once
          you upgrade to Pro.
        </p>
      )}
    </div>
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
    <div className="border rounded-md p-3 space-y-1.5 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">{title}</p>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs"
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground space-y-1">
        {children}
      </div>
    </div>
  );
}

function ReviewList({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return (
      <p>
        <span className="text-foreground">{label}:</span>{" "}
        <span className="text-muted-foreground italic">none</span>
      </p>
    );
  }
  return (
    <p>
      <span className="text-foreground">{label}:</span> {items.join(", ")}
    </p>
  );
}

function StaffSubStep({
  draft,
  updateField,
  isPro,
}: {
  draft: AddLocationDraft;
  updateField: <K extends keyof AddLocationDraft>(field: K, value: AddLocationDraft[K]) => void;
  isPro: boolean;
}) {
  const cap = isPro ? PRO_STAFF_CAP : FREE_STAFF_CAP;

  const addStaff = () => {
    if (draft.staff.length >= cap) return;
    updateField("staff", [
      ...draft.staff,
      { name: "", job_title: "", bio: "" },
    ]);
  };
  const removeStaff = (i: number) => {
    updateField(
      "staff",
      draft.staff.filter((_, idx) => idx !== i),
    );
  };
  const updateStaff = (i: number, field: "name" | "job_title" | "bio", value: string) => {
    updateField(
      "staff",
      draft.staff.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );
  };

  return (
    <div className="space-y-3 border-t border-slate-200 pt-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Users2 className="h-4 w-4" /> Staff / team
            {!isPro && (
              <Badge variant="outline" className="text-[10px] gap-0.5">
                <Lock className="h-2.5 w-2.5" /> Pro
              </Badge>
            )}
          </h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {isPro
              ? `Add up to ${cap} staff members. Photos can be uploaded after approval.`
              : `Free providers can prepare up to ${cap}; staff appears publicly only on Pro.`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={addStaff}
          disabled={draft.staff.length >= cap}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          Add
        </Button>
      </div>

      {draft.staff.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          No staff added yet. Click "Add" to start.
        </p>
      )}

      <div className="space-y-2">
        {draft.staff.map((s, i) => (
          <div
            key={i}
            className="border rounded-md p-3 space-y-2 bg-slate-50/30"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-muted-foreground">
                Staff #{i + 1}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeStaff(i)}
                className="h-6 text-xs text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={s.name}
                onChange={(e) => updateStaff(i, "name", e.target.value)}
                placeholder="Full name"
                maxLength={120}
                className="h-8 text-xs"
              />
              <Input
                value={s.job_title}
                onChange={(e) => updateStaff(i, "job_title", e.target.value)}
                placeholder="Position / title"
                maxLength={120}
                className="h-8 text-xs"
              />
            </div>
            <Textarea
              value={s.bio}
              onChange={(e) =>
                updateStaff(i, "bio", e.target.value.slice(0, STAFF_BIO_LIMIT))
              }
              placeholder="Short bio (max 500 chars)"
              rows={2}
              className="text-xs"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {s.bio.length} / {STAFF_BIO_LIMIT}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
