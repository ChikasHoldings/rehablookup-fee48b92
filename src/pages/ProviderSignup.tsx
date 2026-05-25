import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Header } from "@/components/layout/Header";
import { ProviderValueProp } from "@/components/conversion/ProviderValueProp";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { analytics } from "@/lib/analytics";
// EmailVerificationStep import removed in phase W — the unified wizard
// (/provider/onboarding → VerifyEmailStep) handles email verification
// before this file ever renders.
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Building2,
  Stethoscope,
  CreditCard,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Image as ImageIcon,
  ShieldCheck,
  X,
} from "lucide-react";
import { PhoneInput } from "@/components/ui/phone-input";
import { PhoneVerificationStep } from "@/components/ui/PhoneVerificationStep";
import { useFacilityPhoneVerification } from "@/hooks/useFacilityPhoneVerification";
import { cn } from "@/lib/utils";
import { compressImage, validateImageFile } from "@/lib/imageUtils";
import { sanitizeText, sanitizeFacilityName, sanitizePersonName, sanitizeJobTitle, validateFacilityType, validateState, validateZipCode, validatePhone, validateEmail, sanitizeDescription, sanitizeWebsite, validateYearEstablished } from "@/lib/facilitySanitization";
import { FACILITY_TYPES, FACILITY_TYPE_VALUES, US_STATES, INSURANCE_PROVIDERS, TREATMENT_SERVICES, ACCREDITATION_OPTIONS } from "@/lib/facilityConstants";

import { PasswordStrengthIndicator, calculatePasswordStrength } from "@/components/ui/password-strength-indicator";
import { PLAN_LIMITS, resolvePlan } from "@/lib/planLimits";
import { UpgradeDialog } from "@/components/provider/onboarding/UpgradeDialog";

// Clear all provider-related caches from any previous session.
//
// Both prefixes ARE live (a pre-launch audit briefly flagged them as
// dead code — they are not). Sources:
//   - "provider-facilities-cache-<userId>"  written by useProviderFacilities
//     and by ProviderSignup itself (line ~870, end-of-publish warm-fill).
//   - "provider-data-<facilityId|default>"  written by useProviderData
//     and read on first paint to seed the provider portal before the
//     network round-trip lands.
// Wiping both at the start of a NEW signup is correct — the old
// userId's snapshot is irrelevant to whoever is signing up now, and
// leaving it in place pollutes the seed for the next first-paint.
const clearProviderCaches = () => {
  try {
    if (import.meta.env.DEV) console.log("[ProviderSignup] Clearing provider caches...");
    // Clear facilities cache (both global and any user-specific)
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith("provider-facilities-cache")) {
        localStorage.removeItem(key);
      }
      if (key.startsWith("provider-data-")) {
        localStorage.removeItem(key);
      }
    });
    // M5: do NOT clear selectedFacilityId here — if signup partially fails, the user
    // would otherwise be left with no selection on next login. The new facility id is
    // written to localStorage in step 8 (cache pre-population) which overwrites the
    // previous value cleanly.
    // Clear user role cache
    localStorage.removeItem("rl_cached_role");
    localStorage.removeItem("rl_cached_uid");
    localStorage.removeItem("rl_cached_auth");
    localStorage.removeItem("rl_cached_ts");
    if (import.meta.env.DEV) console.log("[ProviderSignup] Provider caches cleared");
  } catch (e) {
    console.error("[ProviderSignup] Error clearing caches:", e);
  }
};

const getBrowserInfo = (): { browser: string; os: string; device: string } => {
  const ua = navigator.userAgent;
  
  let browser = "Unknown Browser";
  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Edge";
  else if (ua.includes("Chrome")) browser = "Chrome";
  else if (ua.includes("Safari")) browser = "Safari";
  else if (ua.includes("Opera") || ua.includes("OPR")) browser = "Opera";
  
  let os = "Unknown OS";
  if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  
  let device = "Desktop";
  if (ua.includes("Mobile") || ua.includes("Android")) device = "Mobile";
  else if (ua.includes("Tablet") || ua.includes("iPad")) device = "Tablet";
  
  return { browser, os, device };
};

const generateSessionToken = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Round-30 merge: Step 8 (Plan) removed — Plan selection now lives in
// the unified wizard PlanStep that runs after listing publish.
const steps = [
  { id: 1, name: "Account", icon: User },
  { id: 2, name: "Verify", icon: ShieldCheck },
  { id: 3, name: "Facility", icon: Building2 },
  { id: 4, name: "Branding", icon: ImageIcon },
  { id: 5, name: "Services", icon: Stethoscope },
  { id: 6, name: "Insurance", icon: CreditCard },
  { id: 7, name: "Review", icon: CheckCircle },
];

// Use shared constants - single source of truth
const treatmentTypes = [...TREATMENT_SERVICES];
const insuranceProviders = [...INSURANCE_PROVIDERS];
const facilityTypes = FACILITY_TYPES.map(t => t.value);
const accreditationOptions = [...ACCREDITATION_OPTIONS];
const states = [...US_STATES];

/**
 * Facility-phone input with auto-triggered verification.
 *
 * Wraps <PhoneVerificationStep>: the "Verify" button surfaces the moment
 * the provider types a valid 10-digit number; on success the field
 * collapses to a green verified badge. Verification state is mirrored
 * back onto profiles.phone + phone_verified_at by the verify-sms-code
 * edge function. If the provider has already verified this number in a
 * prior session (or in another tab), useFacilityPhoneVerification skips
 * the prompt entirely.
 *
 * Defined here (not as its own file) because it has zero callers outside
 * this listing-details step and keeping it local makes the page's
 * intent clearer.
 */
function FacilityPhoneInputWithVerification({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { userId, isVerifiedForCurrentNumber, markVerified } =
    useFacilityPhoneVerification(value);
  return (
    <PhoneVerificationStep
      phone={value}
      onPhoneChange={onChange}
      userId={userId ?? undefined}
      userType="provider"
      isVerified={isVerifiedForCurrentNumber}
      onVerified={markVerified}
      label="Facility Phone *"
      verifiedHelper="Your facility phone is verified. We use it for lead handoffs and claim verification."
    />
  );
}

export default function ProviderSignup({
  initialStep,
  embedded = false,
}: { initialStep?: number; embedded?: boolean } = {}) {
  // Phase W consolidation: ProviderSignup is now ONLY the post-auth
  // facility-build wizard (steps 3-7). Account + email verification
  // run upstream in /provider/onboarding (AccountStep + VerifyEmailStep
  // in src/components/provider/onboarding/). The legacy steps 1-2
  // remain in this file for historical reference but are unreachable
  //
  // 2026-05-20 unification: `embedded=true` makes this component render
  // *inside* the unified wizard's BuildStep slot — no Header/Footer/
  // Helmet/page-title chrome, since the host page already provides
  // them. Toggled by BuildStep when the wizard's state.mode='list'.
  // because (a) the only caller — NewListingForm — always passes
  // initialStep={3}, (b) entry floor below blocks prevStep / stepper
  // clicks from descending below initialStep.
  const entryStep = initialStep ?? 3;
  const [currentStep, setCurrentStep] = useState(entryStep);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  // emailVerified is always true when we enter here — the wizard's
  // VerifyEmailStep is a hard gate upstream. Kept for compatibility
  // with the legacy step-2 JSX below (never rendered).
  const [emailVerified, setEmailVerified] = useState(true);
  void emailVerified;
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();


  // Check if user is already logged in
  useEffect(() => {
    // Embedded inside the unified wizard → the host has already gated
    // the session; never redirect away.
    if (embedded) return;
    // When mounted in "add another facility" mode (initialStep >= 3 via the
    // /provider/onboarding/new-listing route), an existing session is the
    // EXPECTED state — skip the redirect to dashboard and let the form
    // collect facility info under the current user.
    if (initialStep && initialStep >= 3) return;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/provider/dashboard");
      }
    });
  }, [navigate, initialStep, embedded]);

  // Round-30 merge: when mounted in resume mode (the unified wizard
  // already collected first/last name + email in Step 1), pre-fill
  // formData so downstream welcome-email + admin-notification payloads
  // aren't blank. Step 1's UI is hidden in this mode but the data is
  // still referenced by the publish handler.
  useEffect(() => {
    if (!initialStep || initialStep < 3) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const uid = session?.user.id;
      if (!uid) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, email, phone")
        .eq("user_id", uid)
        .maybeSingle();
      if (cancelled || !profile) return;
      setFormData((prev) => ({
        ...prev,
        firstName: prev.firstName || (profile.first_name ?? ""),
        lastName: prev.lastName || (profile.last_name ?? ""),
        email: prev.email || (profile.email ?? session?.user.email ?? ""),
        phone: prev.phone || (profile.phone ?? ""),
      }));
    })();
    return () => {
      cancelled = true;
    };
  }, [initialStep]);

  // Anti-bot honeypot
  const [honeypot, setHoneypot] = useState("");
  // Client-side rate limiting for submissions
  const [lastSubmitAttempt, setLastSubmitAttempt] = useState(0);

  // Plan-aware photo cap (Section 8 of the provider onboarding spec).
  // Free plans cap gallery at 5 photos; Pro lifts the cap to 10. We
  // also surface an UpgradeDialog when a Free user tries to add past
  // their cap. Defaults to 'free' until the first profile read so the
  // cap is correctly conservative if the read fails.
  const [providerPlan, setProviderPlan] = useState<"free" | "pro">("free");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("plan")
        .eq("user_id", userId)
        .maybeSingle();
      if (!cancelled) {
        setProviderPlan(resolvePlan((data as { plan: string | null } | null)?.plan ?? null));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  const photoCap = PLAN_LIMITS[providerPlan].photos;

  // Form state
  const [formData, setFormData] = useState({
    // Step 1: Account
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    jobTitle: "",

    // Step 3: Facility
    facilityName: "",
    facilityType: "",
    facilityPhone: "",
    facilityEmail: "",
    website: "",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    description: "",
    yearEstablished: "",

    // Step 4: Branding
    logoFile: null as File | null,
    logoPreview: "",
    galleryFiles: [] as File[],
    galleryPreviews: [] as string[],

    // Step 5: Services
    selectedTreatments: [] as string[],
    bedCount: "",
    ageGroups: [] as string[],
    genderServed: "",

    // Step 6: Insurance
    selectedInsurance: [] as string[],
    licensingInfo: "",
    accreditations: "",
    selectedAccreditations: [] as string[],

    // Step 3 extras
    acceptsInternationalPatients: false,

    // Terms
    agreeToTerms: false,
  });

  // Auto-save draft to sessionStorage so a refresh or accidental nav doesn't
  // wipe a half-filled wizard. File objects (logoFile, galleryFiles) and
  // password fields aren't persisted — files need re-upload after a reload,
  // passwords don't belong in storage. Keyed by user when known, else 'anon'.
  const DRAFT_KEY = "provider-signup-draft";
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const draft = JSON.parse(raw) as Record<string, unknown>;
      setFormData((prev) => ({
        ...prev,
        ...draft,
        // Files + secrets are never restored.
        logoFile: null,
        logoPreview: "",
        galleryFiles: [],
        galleryPreviews: [],
        password: "",
        confirmPassword: "",
      }));
    } catch {
      // Corrupt draft — ignore.
    }
   
  }, []);

  useEffect(() => {
    try {
      const {
        password: _p, confirmPassword: _c,
        logoFile: _lf, logoPreview: _lp,
        galleryFiles: _gf, galleryPreviews: _gp,
        ...persistable
      } = formData;
      void _p; void _c; void _lf; void _lp; void _gf; void _gp;
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(persistable));
    } catch {
      // Quota / privacy mode — fail silently.
    }
  }, [formData]);

  const updateFormData = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleArrayItem = (field: string, item: string) => {
    setFormData((prev) => {
      const array = prev[field as keyof typeof prev] as string[];
      if (array.includes(item)) {
        return { ...prev, [field]: array.filter((i) => i !== item) };
      } else {
        return { ...prev, [field]: [...array, item] };
      }
    });
  };

  const nextStep = () => {
    // Round-30 merge: max step is 7 (Review). Step 8 (Subscription) was
    // collapsed into the wizard's PlanStep which runs AFTER publish.
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    // Floor at entryStep so a user who landed here from the unified
    // wizard at step 3 can't walk back into the orphaned account /
    // email-verify steps (they already finished those upstream).
    if (currentStep > entryStep) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  // handleEmailVerified removed in phase W — the upstream
  // /provider/onboarding → VerifyEmailStep is the only path that
  // updates email verification state, and ProviderSignup is mounted
  // strictly post-verification at initialStep=3.

  const handleSubmit = async () => {
    // Prevent double submissions (useRef survives React StrictMode double-fire)
    if (submittingRef.current || isSubmitting) {
      if (import.meta.env.DEV) console.log("[ProviderSignup] Prevented double submission");
      return;
    }

    // Honeypot check - bots fill hidden fields
    if (honeypot) {
      if (import.meta.env.DEV) console.log("[ProviderSignup] Honeypot triggered");
      toast({ title: "Signup Failed", description: "An unexpected error occurred. Please try again.", variant: "destructive" });
      return;
    }

    // Client-side rate limiting: 1 attempt per 10 seconds
    const now = Date.now();
    if (now - lastSubmitAttempt < 10_000) {
      toast({ title: "Too Fast", description: "Please wait a few seconds before trying again.", variant: "destructive" });
      return;
    }
    setLastSubmitAttempt(now);
    
    submittingRef.current = true;
    setIsSubmitting(true);
    const isResumeMode = (initialStep ?? 1) >= 3;
    if (import.meta.env.DEV) console.log("[ProviderSignup] Starting", isResumeMode ? "facility creation (resume)" : "account creation", "for:", formData.email.substring(0, 3) + "***");

    try {
      let userId: string;

      if (isResumeMode) {
        // Resume mode: user was authed by /auth/signup before being routed
        // here via /provider/onboarding/new-listing. Skip the auth signup +
        // profile insert (already done) and proceed to facility creation.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          toast({
            title: "Session expired",
            description: "Please sign in again to add a new facility.",
            variant: "destructive",
          });
          submittingRef.current = false;
          setIsSubmitting(false);
          navigate("/provider/onboarding");
          return;
        }
        userId = session.user.id;
        if (import.meta.env.DEV) console.log("[ProviderSignup] Resume mode, userId:", userId.substring(0, 8) + "...");
      } else {
      // Check if email is already registered as a seeker or admin
      if (import.meta.env.DEV) console.log("[ProviderSignup] Checking for existing accounts...");
      const [seekerResult, adminResult] = await Promise.all([
        supabase.rpc('is_email_seeker', { p_email: formData.email }),
        supabase.rpc('is_email_admin', { p_email: formData.email }),
      ]);
      
      if (!seekerResult.error && seekerResult.data) {
        toast({
          title: "Account Exists",
          description: "This email is registered as a personal account. Please sign in with your personal account or use a different email for your facility.",
          variant: "destructive",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
      if (!adminResult.error && adminResult.data) {
        toast({
          title: "Account Exists",
          description: "This email is associated with an administrative account. Please use a different email.",
          variant: "destructive",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }
    // Clear any stale caches before creating new account
    clearProviderCaches();

      // 1. Create the user account via register-provider-account edge function.
      // Uses admin.createUser(email_confirm:false), so Supabase NEVER sends a
      // magic-link confirmation email. The 6-digit OTP that was verified in
      // step 2 already flipped email_confirmed_at via the updated verify-code.
      if (import.meta.env.DEV) console.log("[ProviderSignup] Creating auth account via register-provider-account...");
      const { data: regData, error: regErr } = await supabase.functions.invoke(
        "register-provider-account",
        {
          body: {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            accountType: "provider",
          },
        },
      );

      if (regErr || regData?.error) {
        const msg = regData?.error ?? regErr?.message ?? "Signup failed.";
        const code = regData?.code;
        if (code === "USER_EXISTS") {
          toast({
            title: "Account Exists",
            description: "An account with this email already exists. Please sign in instead.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Signup Failed", description: msg, variant: "destructive" });
        }
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      if (!regData?.userId) {
        toast({
          title: "Signup Failed",
          description: "Unable to create account. Please try again.",
          variant: "destructive",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      userId = regData.userId;
      if (import.meta.env.DEV) console.log("[ProviderSignup] Account created, userId:", userId.substring(0, 8) + "...");

      // Sign in with password to mint a session. email_confirmed_at is already
      // true (set by verify-code in step 2), so signInWithPassword succeeds.
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (signInErr) {
        console.error("[ProviderSignup] signInWithPassword failed", signInErr.message);
        toast({
          title: "Account created — please sign in",
          description: "Your account is ready. Please sign in to continue.",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        navigate("/login");
        return;
      }

      // 2. Create profile (with sanitized personal fields)
      if (import.meta.env.DEV) console.log("[ProviderSignup] Creating provider profile...");
      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: userId,
        first_name: sanitizePersonName(formData.firstName),
        last_name: sanitizePersonName(formData.lastName),
        email: formData.email.trim().slice(0, 255),
        phone: formData.phone.trim().slice(0, 30),
        job_title: sanitizeJobTitle(formData.jobTitle),
      });

      if (profileError) {
        console.error("[ProviderSignup] Profile creation error:", profileError);
        toast({
          title: "Profile Notice",
          description: "Your profile was created with limited info. You can update it later in settings.",
          variant: "default",
        });
      } else {
        if (import.meta.env.DEV) console.log("[ProviderSignup] Profile created successfully");
      }
      } // end !isResumeMode

      // 3. Create facility (with input sanitization)
      if (import.meta.env.DEV) console.log("[ProviderSignup] Creating facility...");

      // Validate and sanitize all facility inputs before DB insert
      let sanitizedName: string, sanitizedAddress: string, sanitizedCity: string;
      let sanitizedPhone: string, sanitizedEmail: string | null, sanitizedWebsite: string | null;
      let sanitizedDescription: string | null;
      let validatedYear: number | null;
      try {
        validateFacilityType(formData.facilityType);
        validateState(formData.state);
        validateZipCode(formData.zipCode);
        sanitizedName = sanitizeFacilityName(formData.facilityName);
        sanitizedAddress = sanitizeText(formData.address).slice(0, 200);
        sanitizedCity = sanitizeText(formData.city).slice(0, 100);
        sanitizedPhone = validatePhone(formData.facilityPhone);
        sanitizedEmail = validateEmail(formData.facilityEmail);
        sanitizedWebsite = sanitizeWebsite(formData.website);
        sanitizedDescription = sanitizeDescription(formData.description);
        validatedYear = validateYearEstablished(formData.yearEstablished);
      } catch (validationError) {
        toast({
          title: "Validation Error",
          description: (validationError instanceof Error ? validationError.message : "") || "Please check your facility information.",
          variant: "destructive",
        });
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const { data: facilityData, error: facilityError } = await supabase
        .from("facilities")
        .insert({
          user_id: userId,
          name: sanitizedName,
          facility_type: formData.facilityType,
          phone: sanitizedPhone,
          email: sanitizedEmail,
          website: sanitizedWebsite,
          address: sanitizedAddress,
          city: sanitizedCity,
          state: formData.state,
          zip_code: formData.zipCode.trim(),
          description: sanitizedDescription,
          bed_count: formData.bedCount,
          gender_served: formData.genderServed,
          year_established: validatedYear,
          accepts_international_patients: formData.acceptsInternationalPatients,
        })
        .select()
        .single();

      if (facilityError) {
        // PG 23505 unique_violation: the DB-level guard on
        // (user_id, lower(name), lower(address), lower(city))
        // fired — the same provider just submitted an identical
        // facility. This is the "double-submit during a cache race"
        // recovery path: their first insert already succeeded, so we
        // do NOT trigger the orphan-cleanup rollback (which would
        // destroy the auth user + the row they just created). Find
        // the row that's now in the DB and route them straight to
        // the plan step (which is where they were headed anyway).
        const pgCode = (facilityError as { code?: string }).code;
        if (pgCode === "23505") {
          console.warn(
            "[ProviderSignup] facility insert hit unique guard — finding existing row",
            facilityError.message,
          );
          try {
            const { data: existing } = await supabase
              .from("facilities")
              .select("id")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            if (existing?.id) {
              // Mirror the success path: advance the onboarding row
              // to 'plan' so the wizard host shows the plan picker
              // instead of bouncing back to build via canReach.
              await supabase
                .from("provider_onboarding_state")
                .upsert(
                  { user_id: userId, current_step: "plan" } as never,
                  { onConflict: "user_id" },
                );
              await queryClient.invalidateQueries({ queryKey: ["provider-onboarding-state"] });
              toast({
                title: "Listing already saved",
                description:
                  "Looks like your facility was already saved — continuing to the plan step.",
              });
              navigate("/provider/onboarding?step=plan");
              submittingRef.current = false;
              setIsSubmitting(false);
              return;
            }
          } catch (lookupErr) {
            console.warn("[ProviderSignup] post-23505 existing-row lookup failed", lookupErr);
          }
          // Fell through — could not locate the existing row.
          // Surface a useful error instead of triggering the auth
          // rollback (which would delete what they actually have).
          toast({
            title: "We've already saved this facility",
            description:
              "Refresh the page or go to your dashboard — your listing is in our system.",
            variant: "destructive",
          });
          submittingRef.current = false;
          setIsSubmitting(false);
          navigate("/provider/dashboard");
          return;
        }

        // Hardening: a failed facility insert leaves an orphan auth user +
        // profile with no facility. We now call the signup-rollback-cleanup
        // edge function which deletes the auth user + profile so the email
        // is freed and the user can retry signup. The admin_notifications
        // entry stays as a backup audit trail in case the cleanup itself
        // fails (in which case the dashboard banner becomes the safety net).
        console.error("[ProviderSignup] Facility creation error:", facilityError);
        try {
          await supabase.from("admin_notifications").insert({
            type: "signup_facility_insert_failed",
            title: "Provider signup needs support — facility insert failed",
            message: `Auth user ${userId.slice(0, 8)}… created profile but the facility row could not be inserted: ${facilityError.message}`,
            metadata: {
              user_id: userId,
              email: sanitizedEmail,
              attempted_name: sanitizedName,
              attempted_city: sanitizedCity,
              attempted_state: formData.state,
              postgres_error: facilityError.message,
              postgres_code: (facilityError as { code?: string }).code ?? null,
            },
          });
        } catch (notifyErr) {
          console.warn("[ProviderSignup] admin_notifications insert failed", notifyErr);
        }

        // Try the rollback. If it succeeds, the email is free and we can
        // tell the user to retry signup. If it fails, we fall back to the
        // dashboard recovery flow. Either way the user is never stuck.
        let cleanupSucceeded = false;
        try {
          const { error: cleanupErr } = await supabase.functions.invoke(
            "signup-rollback-cleanup",
            { body: {} },
          );
          if (cleanupErr) {
            console.warn("[ProviderSignup] cleanup edge fn returned error", cleanupErr);
          } else {
            cleanupSucceeded = true;
          }
        } catch (cleanupExc) {
          console.warn("[ProviderSignup] cleanup edge fn exception", cleanupExc);
        }

        if (cleanupSucceeded) {
          // Clean state — sign out so the dead session doesn't linger and
          // tell the user they can try again right here.
          await supabase.auth.signOut().catch(() => {});
          toast({
            title: "Couldn't save your facility — try again",
            description:
              "We couldn't save your facility details. Your account has been reset so you can re-submit the form below. If this keeps happening, contact support@rehablookup.com.",
            variant: "destructive",
          });
          submittingRef.current = false;
          setIsSubmitting(false);
          return;
        }

        // Cleanup failed → fall back to dashboard recovery banner.
        toast({
          title: "Account created — facility save failed",
          description:
            "Your account is set up but we couldn't save your facility right now. Our team has been notified. You can also retry from your dashboard.",
          variant: "destructive",
        });
        navigate("/provider/dashboard?signup_facility_failed=1");
        submittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      const facilityId = facilityData.id;
      if (import.meta.env.DEV) console.log("[ProviderSignup] Facility created, facilityId:", facilityId.substring(0, 8) + "...");

      // 4-7: Insert related data in parallel (services, age groups, insurance, accreditations)
      const relatedInserts: PromiseLike<void>[] = [];
      const relatedErrors: string[] = [];

      if (formData.selectedTreatments.length > 0) {
        relatedInserts.push(
          supabase.from("facility_services").insert(
            formData.selectedTreatments.map((service) => ({ facility_id: facilityId, service_name: service }))
          ).then(({ error }) => { if (error) relatedErrors.push("services"); })
        );
      }

      if (formData.ageGroups.length > 0) {
        relatedInserts.push(
          supabase.from("facility_age_groups").insert(
            formData.ageGroups.map((ag) => ({ facility_id: facilityId, age_group: ag }))
          ).then(({ error }) => { if (error) relatedErrors.push("age groups"); })
        );
      }

      if (formData.selectedInsurance.length > 0) {
        relatedInserts.push(
          supabase.from("facility_insurance").insert(
            formData.selectedInsurance.map((ins) => ({ facility_id: facilityId, insurance_name: ins }))
          ).then(({ error }) => { if (error) relatedErrors.push("insurance"); })
        );
      }

      if (formData.licensingInfo || formData.accreditations) {
        relatedInserts.push(
          supabase.from("facility_credentials").insert({
            facility_id: facilityId,
            licensing_info: formData.licensingInfo,
            accreditations: formData.accreditations,
          }).then(({ error }) => { if (error) relatedErrors.push("credentials"); })
        );
      }

      if (formData.selectedAccreditations.length > 0) {
        relatedInserts.push(
          supabase.from("facility_accreditations").insert(
            formData.selectedAccreditations.map((acc) => ({ facility_id: facilityId, accreditation_type: acc, verified: false }))
          ).then(({ error }) => { if (error) relatedErrors.push("accreditations"); })
        );
      }

      await Promise.allSettled(relatedInserts);

      if (relatedErrors.length > 0) {
        console.warn("[ProviderSignup] Some related data failed to save:", relatedErrors);
        toast({
          title: "Partial Save",
          description: `Some data (${relatedErrors.join(", ")}) couldn't be saved. You can update these in your dashboard settings.`,
          variant: "default",
        });
      }

      // 8. Upload images if provided
      let logoUrl: string | null = null;
      const galleryUrls: string[] = [];

      // Image uploads are best-effort: the facility is already saved, so an
      // upload failure shouldn't unwind signup. We do tally failures and
      // surface a single combined warning so providers know to retry from
      // the dashboard (rather than think their images uploaded silently).
      const imageUploadFailures: string[] = [];

      if (formData.logoFile) {
        try {
          const compressedLogo = await compressImage(formData.logoFile, "logo");
          const logoFileName = `${userId}/${facilityId}/logo/${Date.now()}.webp`;

          const { error: logoUploadError } = await supabase.storage
            .from("facility-images")
            .upload(logoFileName, compressedLogo, { upsert: true });

          if (logoUploadError) {
            imageUploadFailures.push("logo");
            console.warn("[ProviderSignup] Logo upload failed:", logoUploadError);
          } else {
            const { data: logoUrlData } = supabase.storage
              .from("facility-images")
              .getPublicUrl(logoFileName);
            logoUrl = logoUrlData.publicUrl;
          }
        } catch (e) {
          imageUploadFailures.push("logo");
          console.warn("[ProviderSignup] Logo upload exception:", e);
        }
      }

      if (formData.galleryFiles.length > 0) {
        let galleryFailCount = 0;
        for (const file of formData.galleryFiles) {
          try {
            const compressedImage = await compressImage(file, "gallery");
            const galleryFileName = `${userId}/${facilityId}/gallery/${Date.now()}-${Math.random().toString(36).slice(2)}.webp`;

            const { error: galleryUploadError } = await supabase.storage
              .from("facility-images")
              .upload(galleryFileName, compressedImage, { upsert: true });

            if (galleryUploadError) {
              galleryFailCount++;
              console.warn("[ProviderSignup] Gallery upload failed:", galleryUploadError);
            } else {
              const { data: galleryUrlData } = supabase.storage
                .from("facility-images")
                .getPublicUrl(galleryFileName);
              galleryUrls.push(galleryUrlData.publicUrl);
            }
          } catch (e) {
            galleryFailCount++;
            console.warn("[ProviderSignup] Gallery upload exception:", e);
          }
        }
        if (galleryFailCount > 0) {
          imageUploadFailures.push(`${galleryFailCount} of ${formData.galleryFiles.length} gallery image${galleryFailCount === 1 ? "" : "s"}`);
        }
      }

      if (imageUploadFailures.length > 0) {
        toast({
          title: "Images need a re-upload",
          description: `Your account and facility are saved, but these uploads failed: ${imageUploadFailures.join(", ")}. Retry from your dashboard.`,
          variant: "default",
        });
      }

      // Update facility with image URLs if any were uploaded
      if (logoUrl || galleryUrls.length > 0) {
        await supabase
          .from("facilities")
          .update({
            logo_url: logoUrl,
            gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
          })
          .eq("id", facilityId);
      }

    // Pre-populate caches with newly created facility data for instant dashboard render
    try {
      if (import.meta.env.DEV) console.log("[ProviderSignup] Pre-populating facility cache...");
      const facilityDataForCache = {
        id: facilityId,
        name: formData.facilityName,
        slug: facilityData.slug,
        status: "pending",
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zipCode,
        facility_type: formData.facilityType,
        logo_url: logoUrl,
        gallery_urls: galleryUrls.length > 0 ? galleryUrls : null,
        featured: false,
        created_at: new Date().toISOString(),
      };
      
      // Cache for useProviderFacilities (user-specific key)
      localStorage.setItem(`provider-facilities-cache-${userId}`, JSON.stringify({
        data: [facilityDataForCache],
        timestamp: Date.now(),
      }));
      
      // Cache for SelectedFacilityContext
      localStorage.setItem("selectedFacilityId", facilityId);
      localStorage.setItem("selectedFacilityData", JSON.stringify(facilityDataForCache));
      
      // Cache user role
      localStorage.setItem("rl_cached_role", "provider");
      localStorage.setItem("rl_cached_uid", userId);
      localStorage.setItem("rl_cached_auth", "true");
      localStorage.setItem("rl_cached_ts", String(Date.now()));
      
      if (import.meta.env.DEV) console.log("[ProviderSignup] Facility cache pre-populated successfully");
    } catch (cacheError) {
      console.error("[ProviderSignup] Cache pre-population error:", cacheError);
      // Non-blocking - continue even if cache fails
    }

      // 9. Create notification preferences (H4: idempotent — signup retries shouldn't fatal on unique violation)
      await supabase
        .from("notification_preferences")
        .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });

      // 10. Create initial login session tracking
      try {
        const { browser, os, device } = getBrowserInfo();
        const sessionToken = generateSessionToken();
        localStorage.setItem("current_session_token", sessionToken);
        
        await supabase.from("user_sessions").insert({
          user_id: userId,
          session_token: sessionToken,
          browser,
          os,
          device_name: device,
          is_current: true,
          last_active_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        });
        
        // Log the signup as activity
        supabase.functions.invoke("log-activity", {
          body: {
            user_id: userId,
            event_type: "account_action",
            event_description: `Created new provider account from ${browser} on ${os}`,
          },
        }).catch(() => {});
      } catch (sessionError) {
        console.error("Session tracking error:", sessionError);
        // Non-blocking - continue even if session tracking fails
      }

      // 11. Notify admin of new provider signup
      // M6: sanitize facilityName before passing to email/notification payloads.
      const safeFacilityName = sanitizeFacilityName(formData.facilityName);
      const safeFirstName = sanitizePersonName(formData.firstName);
      try {
        await supabase.functions.invoke("notify-admin-provider-signup", {
          body: {
            facilityId,
            facilityName: safeFacilityName,
            providerEmail: formData.email,
            city: formData.city,
            state: formData.state,
          },
        });
      } catch (notifyError) {
        console.error("Admin notification error:", notifyError);
        // Non-blocking - continue even if notification fails
      }

      // 12. Welcome email — handled downstream by PlanStep (2026-05-23).
      // Both new-list AND claim flows route success → /provider/onboarding
      // ?step=plan, where the provider picks Free vs Pro. PlanStep fires
      // send-provider-welcome-email with selectedPlan + Idempotency-Key
      // `welcome-<email>-<plan>` after the plan choice is committed —
      // so the welcome email always reflects the right tier and the
      // provider isn't greeted as "Free" before they've decided.
      // Earlier rounds fired this on email-verify, then duplicated it
      // here on publish; both were premature. Single emission at
      // onboarding-complete is the correct surface.

      // 12b. The legacy welcome-credits offer email was retired with the
      //   flat-fee Pro $99/mo monetization. PlanStep + WelcomeModal handle
      //   the Pro upsell now.

      // 13. Round-30 merge: advance onboarding state to 'plan' and route
      //   into the unified PlanStep at /provider/onboarding?step=plan.
      //   The PlanStep handles Free (mark complete + dashboard) and Pro
      //   (Stripe Checkout). No more page-level subscription picker.
      //
      // 2026-05-20 unification: the form always runs embedded inside
      // the unified wizard now. The decision between "first-time
      // onboarding → PlanStep" and "add another facility → dashboard"
      // is driven by `profiles.onboarding_completed_at`, not by the
      // call site. This makes the form robust regardless of how it
      // was mounted.
      analytics.signupComplete('provider', 'email');
      try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
      try { sessionStorage.removeItem("provider-onboarding-handoff"); } catch { /* ignore */ }

      // Read onboarding completion to decide where to land after publish.
      let alreadyOnboarded = false;
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user.id;
        if (uid) {
          const { data: profileRow } = await supabase
            .from("profiles")
            .select("onboarding_completed_at")
            .eq("user_id", uid)
            .maybeSingle();
          alreadyOnboarded = !!(profileRow as { onboarding_completed_at?: string | null } | null)?.onboarding_completed_at;
        }
      } catch (e) {
        console.warn("[ProviderSignup] onboarded-check failed; defaulting to first-time path", e);
      }

      if (alreadyOnboarded) {
        toast({
          title: "Facility submitted",
          description: "Your new location is pending review — we'll publish it shortly.",
        });
        navigate("/provider/dashboard");
        return;
      }

      // First-time onboarding — advance state then route to PlanStep.
      // Phase X fix: hard-fail with a retry CTA instead of silently
      // logging a warning if the upsert errors, so the user isn't
      // trapped in a canReach() bounce loop on the wizard host.
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const uid = sessionData.session?.user.id;
        if (!uid) {
          throw new Error("Session expired before publish completed");
        }
        const { error: stateErr } = await supabase
          .from("provider_onboarding_state")
          .upsert(
            { user_id: uid, current_step: "plan" } as never,
            { onConflict: "user_id" },
          );
        if (stateErr) throw stateErr;

        // CRITICAL: refresh the React Query cache for
        // `provider-onboarding-state` BEFORE navigating. The Onboarding
        // host reads `current_step` from the cached row to decide
        // whether `?step=plan` is reachable via `canReach()`. Without
        // this, the cache still says `build` for ~5s of staleTime,
        // canReach('plan', 'build') returns false, and the wizard host
        // strips the query param + shows "Let's finish the current step
        // first" — silently bouncing the user back to the Build form
        // they just completed. Awaiting invalidateQueries blocks on the
        // refetch so the navigate below lands on a fresh cache.
        await queryClient.invalidateQueries({ queryKey: ["provider-onboarding-state"] });
      } catch (e) {
        console.error("[ProviderSignup] onboarding state advance failed", e);
        toast({
          title: "Listing saved — couldn't open the plan step",
          description:
            "Your facility was published, but we couldn't advance the wizard. Reload and try again — your draft is preserved.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Listing published",
        description: "One last step — pick your plan.",
      });
      navigate("/provider/onboarding?step=plan");
      return;
    } catch (error) {
      console.error("Signup error:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const passwordStrength = calculatePasswordStrength(formData.password);
  const isPasswordStrong = passwordStrength.score >= 3; // At least "Fair" strength

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return (
          formData.firstName.trim().length >= 1 &&
          formData.firstName.trim().length <= 50 &&
          formData.lastName.trim().length >= 1 &&
          formData.lastName.trim().length <= 50 &&
          formData.email &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) &&
          formData.email.length <= 255 &&
          formData.phone &&
          formData.phone.replace(/\D/g, "").length >= 7 &&
          formData.password &&
          formData.password.length >= 8 &&
          isPasswordStrong &&
          formData.password === formData.confirmPassword
        );
      case 2:
        return emailVerified;
      case 3: {
        const zipValid = /^\d{5}(-\d{4})?$/.test(formData.zipCode.trim());
        const phoneDigits = formData.facilityPhone.replace(/\D/g, "").length;
        return (
          formData.facilityName.trim().length >= 2 &&
          formData.facilityName.trim().length <= 100 &&
          formData.facilityType &&
          (FACILITY_TYPE_VALUES as readonly string[]).includes(formData.facilityType) &&
          phoneDigits >= 7 &&
          formData.address.trim().length >= 2 &&
          formData.address.trim().length <= 200 &&
          formData.city.trim().length >= 1 &&
          formData.city.trim().length <= 100 &&
          formData.state &&
          (US_STATES as readonly string[]).includes(formData.state) &&
          zipValid
        );
      }
      case 4:
        return true; // Branding is optional
      case 5:
        return formData.selectedTreatments.length > 0;
      case 6:
        return true; // Insurance is optional — some facilities are self-pay only
      case 7:
        return formData.agreeToTerms;
      default:
        return false;
    }
  };

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast({
        title: "Invalid file",
        description: validation.error,
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    setFormData((prev) => ({
      ...prev,
      logoFile: file,
      logoPreview: preview,
    }));
  };

  const handleGallerySelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // PLAN_LIMITS gates the cap: 5 photos on Free, 10 on Pro.
    // Mirror this server-side via the facilities_plan_photo_cap_chk
    // trigger so a client bypass can't persist over the cap.
    const remainingSlots = photoCap - formData.galleryFiles.length;
    if (files.length > remainingSlots) {
      // Free user hitting the cap → pitch Pro instead of just rejecting.
      if (providerPlan === "free") {
        setUpgradeOpen(true);
      } else {
        toast({
          title: "Too many images",
          description: `You can only upload ${remainingSlots} more image${remainingSlots !== 1 ? "s" : ""}.`,
          variant: "destructive",
        });
      }
      return;
    }

    const validFiles: File[] = [];
    const previews: string[] = [];

    for (const file of files) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push(file);
        previews.push(URL.createObjectURL(file));
      }
    }

    setFormData((prev) => ({
      ...prev,
      galleryFiles: [...prev.galleryFiles, ...validFiles],
      galleryPreviews: [...prev.galleryPreviews, ...previews],
    }));
  };

  const removeGalleryImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      galleryFiles: prev.galleryFiles.filter((_, i) => i !== index),
      galleryPreviews: prev.galleryPreviews.filter((_, i) => i !== index),
    }));
  };

  const removeLogo = () => {
    setFormData((prev) => ({
      ...prev,
      logoFile: null,
      logoPreview: "",
    }));
  };

  // 2026-05-20 unification: when `embedded=true`, render the form
  // body without the page-level chrome (Header, Footer, Helmet,
  // hero / value-prop, page title) — the unified wizard's host owns
  // those, and rendering them again would double-stack. The inner
  // step-substepper, progress bar, and form sections all stay.
  const formBody = (
    <>
      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        feature="photos"
        returnTo={embedded ? "/provider/onboarding?step=build" : "/provider/onboarding/new-listing"}
      />
      <div className={cn(embedded ? "" : "container px-4 md:px-6")}>
        {/* Value proposition — shown only on step 1 to motivate sign-up.
            Suppressed when embedded — the wizard's outer header handles
            that role. */}
        {!embedded && currentStep === 1 && (
          <ProviderValueProp className="mb-8 mx-auto max-w-4xl" />
        )}
        <div className={cn(embedded ? "w-full" : "mx-auto max-w-xl")}>
          {/* Header & Progress */}
          <div className="mb-8">
            {!embedded && (
              <div className="text-center mb-6">
                <h1 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                  List Your Facility
                </h1>
                <p className="mt-1.5 text-sm text-muted-foreground">
                  Step {currentStep} of {steps.length} — {steps[currentStep - 1].name}
                </p>
              </div>
            )}
            {embedded && (
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Build sub-step {currentStep} of {steps.length} — {steps[currentStep - 1].name}
              </p>
            )}

              {/* Progress bar */}
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${(currentStep / steps.length) * 100}%` }}
                />
              </div>

              {/* Step indicators */}
              <div className="mt-5 flex justify-center gap-2">
                {steps.filter((step) => step.id >= entryStep).map((step) => (
                  <button
                    key={step.id}
                    onClick={() => {
                      // Only allow navigating to previously completed steps,
                      // bounded below by the entry floor — so post-auth users
                      // can't click back into the orphaned step 1/2 cards.
                      if (step.id < currentStep && step.id >= entryStep) {
                        setCurrentStep(step.id);
                      }
                    }}
                    disabled={step.id >= currentStep || step.id < entryStep}
                    className={cn(
                      "flex items-center justify-center transition-all",
                      step.id < entryStep && "hidden",
                    )}
                    title={step.name}
                  >
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full transition-all",
                      currentStep === step.id
                        ? "bg-primary text-primary-foreground ring-2 ring-primary/20 ring-offset-2 ring-offset-background"
                        : step.id < currentStep
                        ? "bg-accent text-accent-foreground cursor-pointer hover:bg-accent/80"
                        : "bg-muted text-muted-foreground cursor-not-allowed"
                    )}>
                      {step.id < currentStep ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : (
                        <step.icon className="h-4 w-4" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 1: Account Info */}
            {currentStep === 1 && (
              <div key="step-1" className="animate-step-enter rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                      <Input
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => updateFormData("firstName", e.target.value.slice(0, 50))}
                        placeholder="John"
                        maxLength={50}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                      <Input
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => updateFormData("lastName", e.target.value.slice(0, 50))}
                        placeholder="Smith"
                        maxLength={50}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="jobTitle" className="text-sm font-medium">Job Title</Label>
                    <Input
                      id="jobTitle"
                      value={formData.jobTitle}
                      onChange={(e) => updateFormData("jobTitle", e.target.value.slice(0, 100))}
                      placeholder="Admissions Director"
                      maxLength={100}
                      className="h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => {
                          updateFormData("email", e.target.value.slice(0, 255).toLowerCase().trim());
                          if (emailVerified) {
                            setEmailVerified(false);
                          }
                        }}
                        placeholder="john@facility.com"
                        maxLength={255}
                        className="pl-10 h-10"
                      />
                    </div>
                    {formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && (
                      <p className="text-xs text-destructive">Please enter a valid email address</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="phone" className="text-sm font-medium">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                      <PhoneInput
                        id="phone"
                        value={formData.phone}
                        onChange={(value) => updateFormData("phone", value)}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="password"
                          type="password"
                          value={formData.password}
                          onChange={(e) => updateFormData("password", e.target.value)}
                          placeholder="••••••••"
                          className={cn(
                            "pl-10 h-10",
                            formData.password && !isPasswordStrong && "border-destructive focus-visible:ring-destructive"
                          )}
                        />
                      </div>
                      <PasswordStrengthIndicator password={formData.password} />
                      {formData.password && !isPasswordStrong && (
                        <div className="rounded-md bg-destructive/10 border border-destructive/20 p-2.5 mt-2">
                          <p className="text-xs text-destructive font-medium">
                            Password is too weak. Please add more characters, uppercase, numbers, or special characters.
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={formData.confirmPassword}
                          onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                          placeholder="••••••••"
                          className="pl-10 h-10"
                        />
                      </div>
                      {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                        <p className="text-xs text-destructive">Passwords do not match</p>
                      )}
                    </div>
                  </div>
                  {/* Honeypot field - hidden from real users, bots fill it */}
                  <div className="absolute opacity-0 pointer-events-none h-0 overflow-hidden" aria-hidden="true" tabIndex={-1}>
                    <label htmlFor="website_url_confirm">Leave this empty</label>
                    <input
                      id="website_url_confirm"
                      name="website_url_confirm"
                      type="text"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                      autoComplete="off"
                      tabIndex={-1}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2 (Email Verification) consolidated upstream into
                /provider/onboarding → VerifyEmailStep
                (src/components/provider/onboarding/VerifyEmailStep.tsx).
                Removed in phase W; legacy import was deleted from
                src/components/provider/EmailVerificationStep.tsx. */}

            {/* Step 3: Facility Info */}
            {currentStep === 3 && (
              <div key="step-3" className="animate-step-enter rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <Label htmlFor="facilityName" className="text-sm font-medium">Facility Name *</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="facilityName"
                        value={formData.facilityName}
                        onChange={(e) => updateFormData("facilityName", e.target.value.slice(0, 100))}
                        placeholder="Serenity Recovery Center"
                        maxLength={100}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="facilityType" className="text-sm font-medium">Facility Type *</Label>
                    <Select
                      value={formData.facilityType}
                      onValueChange={(value) => updateFormData("facilityType", value)}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select facility type" />
                      </SelectTrigger>
                      <SelectContent>
                        {facilityTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      {/* Inline phone verification auto-triggers as soon as the
                          provider enters a valid 10-digit number. Wizard Step 3
                          no longer asks for phone verification; this is where
                          we collect + verify it because the number is also the
                          listing's public callback line. */}
                      <FacilityPhoneInputWithVerification
                        value={formData.facilityPhone}
                        onChange={(value) => updateFormData("facilityPhone", value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="facilityEmail" className="text-sm font-medium">Facility Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="facilityEmail"
                          type="email"
                          value={formData.facilityEmail}
                          onChange={(e) => updateFormData("facilityEmail", e.target.value.slice(0, 255).toLowerCase().trim())}
                          placeholder="info@facility.com"
                          maxLength={255}
                          className="pl-10 h-10"
                        />
                      </div>
                      {formData.facilityEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.facilityEmail) && (
                        <p className="text-xs text-destructive">Please enter a valid email address</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="website" className="text-sm font-medium">Website</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={(e) => updateFormData("website", e.target.value.slice(0, 500))}
                          placeholder="https://www.yourfacility.com"
                          maxLength={500}
                          className="pl-10 h-10"
                        />
                      </div>
                      {formData.website && /^(javascript|data):/i.test(formData.website.trim()) && (
                        <p className="text-xs text-destructive">Invalid URL — blocked protocol</p>
                      )}
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="yearEstablished" className="text-sm font-medium">Year Established</Label>
                      <Input
                        id="yearEstablished"
                        type="number"
                        value={formData.yearEstablished}
                        onChange={(e) => {
                          const val = e.target.value;
                          // Only allow 4-digit years within valid range
                          if (val === "" || (val.length <= 4 && /^\d{0,4}$/.test(val))) {
                            updateFormData("yearEstablished", val);
                          }
                        }}
                        placeholder="2010"
                        min="1900"
                        max={new Date().getFullYear()}
                        className="h-10"
                      />
                      {formData.yearEstablished && (
                        (() => {
                          const yr = parseInt(formData.yearEstablished, 10);
                          if (isNaN(yr) || yr < 1900 || yr > new Date().getFullYear()) {
                            return <p className="text-xs text-destructive">Year must be between 1900 and {new Date().getFullYear()}</p>;
                          }
                          return null;
                        })()
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-sm font-medium">Street Address *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => updateFormData("address", e.target.value.slice(0, 200))}
                        placeholder="123 Recovery Lane"
                        maxLength={200}
                        className="pl-10 h-10"
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="city" className="text-sm font-medium">City *</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => updateFormData("city", e.target.value.slice(0, 100))}
                        placeholder="Los Angeles"
                        maxLength={100}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="state" className="text-sm font-medium">State *</Label>
                      <Select
                        value={formData.state}
                        onValueChange={(value) => updateFormData("state", value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          {states.map((state) => (
                            <SelectItem key={state} value={state}>
                              {state}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="zipCode" className="text-sm font-medium">ZIP Code *</Label>
                      <Input
                        id="zipCode"
                        value={formData.zipCode}
                        onChange={(e) => updateFormData("zipCode", e.target.value.replace(/[^\d-]/g, "").slice(0, 10))}
                        placeholder="90210"
                        maxLength={10}
                        inputMode="numeric"
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="description" className="text-sm font-medium">Facility Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => updateFormData("description", e.target.value.slice(0, 2000))}
                      placeholder="Tell potential clients about your facility, treatment philosophy, and what makes you unique..."
                      rows={3}
                      maxLength={2000}
                      className="min-h-[100px]"
                    />
                    <p className="text-xs text-muted-foreground text-right">{formData.description.length}/2000</p>
                  </div>

                  {/* International Patients */}
                  <div className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50 border border-border">
                    <Checkbox
                      id="acceptsInternationalPatients"
                      checked={formData.acceptsInternationalPatients}
                      onCheckedChange={(checked) => updateFormData("acceptsInternationalPatients", checked === true)}
                      className="mt-0.5"
                    />
                    <div className="space-y-1">
                      <Label htmlFor="acceptsInternationalPatients" className="text-sm font-medium cursor-pointer">
                        Accept International Patients
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Check this if your facility can accommodate patients traveling from outside the United States
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Branding */}
            {currentStep === 4 && (
              <div key="step-4" className="animate-step-enter space-y-6">
                {/* Section 1: Logo */}
                <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">1</div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Facility Logo</h3>
                      <p className="text-sm text-muted-foreground">Your logo appears on search results and your profile card. Use a square image for best results.</p>
                    </div>
                  </div>
                  {formData.logoPreview ? (
                    <div className="flex items-center gap-4">
                      <img
                        src={formData.logoPreview}
                        alt="Logo preview"
                        className="h-16 w-16 rounded-lg object-cover border"
                      />
                      <Button variant="outline" size="sm" onClick={removeLogo}>
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-border rounded-lg p-6 text-center block cursor-pointer hover:border-primary/50 transition-colors">
                      <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-primary hover:underline text-sm font-medium">
                        Upload logo
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoSelect}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        PNG, JPG, or WebP (max 5MB)
                      </p>
                    </label>
                  )}
                </div>

                {/* Section 2: Gallery Photos */}
                <div className="rounded-xl border-2 border-primary/20 bg-card p-6 shadow-sm">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">2</div>
                    <div>
                      <h3 className="text-base font-semibold text-foreground">Facility Photos ({formData.galleryPreviews.length}/5)</h3>
                      <p className="text-sm text-muted-foreground">
                        Show families what your facility looks like. Upload photos of your building, rooms, common areas, or outdoor spaces. <span className="font-medium text-foreground">Listings with photos get 3× more inquiries.</span>
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {formData.galleryPreviews.map((preview, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={preview}
                          alt={`Gallery ${index + 1}`}
                          className="aspect-video w-full rounded-lg object-cover border"
                        />
                        <button
                          onClick={() => removeGalleryImage(index)}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {formData.galleryPreviews.length < 5 && (
                      <label className="border-2 border-dashed border-primary/30 rounded-lg aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors">
                        <ImageIcon className="h-6 w-6 text-primary/60 mb-1" />
                        <span className="text-xs font-medium text-primary/80">Add facility photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handleGallerySelect}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>
                  {formData.galleryPreviews.length === 0 && (
                    <p className="text-xs text-amber-600 mt-3 flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                      Tip: Adding at least one facility photo is highly recommended
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Services */}
            {currentStep === 5 && (
              <div key="step-5" className="animate-step-enter rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Treatment Types *</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {treatmentTypes.map((treatment) => (
                        <div
                          key={treatment}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={treatment}
                            checked={formData.selectedTreatments.includes(treatment)}
                            onCheckedChange={() => toggleArrayItem("selectedTreatments", treatment)}
                          />
                          <Label htmlFor={treatment} className="text-sm font-normal cursor-pointer">
                            {treatment}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="bedCount" className="text-sm font-medium">Bed Count</Label>
                      <Select
                        value={formData.bedCount}
                        onValueChange={(value) => updateFormData("bedCount", value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1-10">1-10</SelectItem>
                          <SelectItem value="11-25">11-25</SelectItem>
                          <SelectItem value="26-50">26-50</SelectItem>
                          <SelectItem value="51-100">51-100</SelectItem>
                          <SelectItem value="100+">100+</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="genderServed" className="text-sm font-medium">Gender Served</Label>
                      <Select
                        value={formData.genderServed}
                        onValueChange={(value) => updateFormData("genderServed", value)}
                      >
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Genders</SelectItem>
                          <SelectItem value="male">Men Only</SelectItem>
                          <SelectItem value="female">Women Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Age Groups Served</Label>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {["Adults (18+)", "Young Adults (18-25)", "Adolescents (13-17)", "Seniors (65+)"].map((age) => (
                        <div key={age} className="flex items-center space-x-2">
                          <Checkbox
                            id={age}
                            checked={formData.ageGroups.includes(age)}
                            onCheckedChange={() => toggleArrayItem("ageGroups", age)}
                          />
                          <Label htmlFor={age} className="text-sm font-normal cursor-pointer">
                            {age}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 6: Insurance */}
            {currentStep === 6 && (
              <div key="step-6" className="animate-step-enter rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">Accepted Insurance</Label>
                      <span className="text-xs text-muted-foreground">Optional — skip if self-pay only</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {insuranceProviders.map((insurance) => (
                        <div
                          key={insurance}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={insurance}
                            checked={formData.selectedInsurance.includes(insurance)}
                            onCheckedChange={() => toggleArrayItem("selectedInsurance", insurance)}
                          />
                          <Label htmlFor={insurance} className="text-sm font-normal cursor-pointer">
                            {insurance}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="licensingInfo" className="text-sm font-medium">Licensing Information</Label>
                    <Textarea
                      id="licensingInfo"
                      value={formData.licensingInfo}
                      onChange={(e) => updateFormData("licensingInfo", e.target.value)}
                      placeholder="e.g., State License #12345, DEA Registration..."
                      rows={2}
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Accreditations & Certifications</Label>
                    <p className="text-xs text-muted-foreground">
                      Select any accreditations your facility holds. These will be verified by our team and displayed as trust badges on your profile.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {accreditationOptions.map((acc) => (
                        <div
                          key={acc.value}
                          className="flex items-start space-x-2 p-2 rounded-md hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={acc.value}
                            checked={formData.selectedAccreditations.includes(acc.value)}
                            onCheckedChange={() => toggleArrayItem("selectedAccreditations", acc.value)}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5">
                            <Label htmlFor={acc.value} className="text-sm font-normal cursor-pointer">
                              {acc.label}
                            </Label>
                            <p className="text-xs text-muted-foreground">{acc.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="accreditations" className="text-sm font-medium">Other Accreditations</Label>
                    <Textarea
                      id="accreditations"
                      value={formData.accreditations}
                      onChange={(e) => updateFormData("accreditations", e.target.value)}
                      placeholder="List any other accreditations or certifications not shown above..."
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}


            {/* Step 7: Review */}
            {currentStep === 7 && (
              <div key="step-8" className="animate-step-enter rounded-xl border border-border bg-card p-6 shadow-sm">
                <div className="space-y-4">
                  {/* Account Summary */}
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2 text-sm">
                      <User className="h-4 w-4" /> Account
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                      <p><span className="text-muted-foreground">Name:</span> {formData.firstName} {formData.lastName}</p>
                      <p><span className="text-muted-foreground">Email:</span> {formData.email} {emailVerified && <span className="text-accent text-xs">✓ Verified</span>}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {formData.phone}</p>
                      {formData.jobTitle && <p><span className="text-muted-foreground">Title:</span> {formData.jobTitle}</p>}
                    </div>
                  </div>

                  {/* Facility Summary */}
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" /> Facility
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                      <p><span className="text-muted-foreground">Name:</span> {formData.facilityName}</p>
                      <p><span className="text-muted-foreground">Type:</span> {formData.facilityType}</p>
                      <p><span className="text-muted-foreground">Address:</span> {formData.address}, {formData.city}, {formData.state} {formData.zipCode}</p>
                      <p><span className="text-muted-foreground">Phone:</span> {formData.facilityPhone}</p>
                      {formData.website && <p><span className="text-muted-foreground">Website:</span> {formData.website}</p>}
                    </div>
                  </div>

                  {/* Services Summary */}
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2 text-sm">
                      <Stethoscope className="h-4 w-4" /> Services
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {formData.selectedTreatments.map((t) => (
                          <span key={t} className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Insurance Summary */}
                  <div className="space-y-2">
                    <h3 className="font-medium flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4" /> Insurance
                    </h3>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {formData.selectedInsurance.length > 0 ? formData.selectedInsurance.map((i) => (
                          <span key={i} className="bg-accent/10 text-accent px-2 py-0.5 rounded text-xs">
                            {i}
                          </span>
                        )) : (
                          <span className="text-muted-foreground text-xs italic">Self-pay / Not specified — you can update this later</span>
                        )}
                      </div>
                    </div>
                  </div>


                  {/* Terms */}
                  <div className="flex items-start space-x-3 pt-4 border-t">
                    <Checkbox
                      id="terms"
                      checked={formData.agreeToTerms}
                      onCheckedChange={(checked) => updateFormData("agreeToTerms", checked)}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-sm font-normal leading-relaxed cursor-pointer">
                      I agree to the{" "}
                      <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Terms of Service
                      </Link>{" "}
                      and{" "}
                      <Link to="/privacy-policy" className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                        Privacy Policy
                      </Link>
                      . I confirm that all information provided is accurate.
                    </Label>
                  </div>
                </div>
              </div>
            )}

            {/* Step 8 (Subscription) removed in round-30 merge — Plan
                selection now lives at /provider/onboarding?step=plan
                AFTER the listing is published. */}

            {/* Navigation Buttons */}
            <div className="mt-8 flex justify-between gap-4">
              {currentStep > entryStep && (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  disabled={isSubmitting}
                  size="default"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
              )}

              {currentStep < 7 && (
                <Button
                  onClick={nextStep}
                  disabled={!canProceed()}
                  className="ml-auto"
                  size="default"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {currentStep === 7 && (
                <Button
                  onClick={() => {
                    // Round-30 merge: Step 7 is now the final UI step;
                    // "Publish listing" submits and routes to the wizard
                    // PlanStep where Free/Pro is picked.
                    void handleSubmit();
                  }}
                  disabled={!canProceed() || isSubmitting}
                  className="ml-auto"
                  size="default"
                >
                  {isSubmitting ? "Publishing…" : "Publish listing"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Already have account — only meaningful for the
                legacy public entry; suppressed when embedded since
                the wizard host's AccountStep already provides the
                Sign-in link AND the user is signed in by this point. */}
            {!embedded && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </div>
      </>
    );

  if (embedded) {
    return formBody;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Helmet><title>List Your Facility | RehabLookup</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <Header />
      <main className="flex-1 py-8 md:py-16">
        {formBody}
      </main>
      <Footer />
      <BackToTop />
    </div>
  );
}