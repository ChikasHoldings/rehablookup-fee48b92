import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Header as PublicHeader } from "@/components/layout/Header";
import { Footer as PublicFooter } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { scrollToTopSmooth } from "@/hooks/useScrollToTop";
import {
  emitConciergeFunnelEvent,
  fnv1a32,
  getOrCreateConciergeSessionId,
  type ConciergePrefillContext,
} from "@/lib/conciergeAnalytics";

// Step components
import { StepWhoNeedsHelp } from "@/components/concierge/StepWhoNeedsHelp";
import { StepCareNeed } from "@/components/concierge/StepCareNeed";
import { StepLogistics } from "@/components/concierge/StepLogistics";
import { StepPaymentInfo } from "@/components/concierge/StepPaymentInfo";
import { StepContact } from "@/components/concierge/StepContact";
import { StepEmailVerification } from "@/components/concierge/StepEmailVerification";
import { SmsCallbackFallback } from "@/components/concierge/SmsCallbackFallback";
import { StepReviewSubmit } from "@/components/concierge/StepReviewSubmit";
import { IntakeProgress } from "@/components/concierge/IntakeProgress";

export interface ConciergeIntakeData {
  // Step 1: Who needs help
  ageRange: string;
  gender: string;
  preferredLanguage: string;
  state: string;
  city: string;
  currentLivingSituation: string;
  relationship: string;
  mobilityNeeds: string;
  
  // Step 2: Care need
  primaryConcern: string;
  substanceUseFrequency: string;
  substanceUseDuration: string;
  detoxNeeded: string;
  levelOfCare: string;
  priorTreatment: boolean | null;
  priorTreatmentNotes: string;
  currentMedications: string;
  coOccurringConcerns: string[];
  suicideHistory: string;
  
  // Step 3: Logistics
  desiredState: string;
  desiredCity: string;
  radiusMiles: number;
  preferredEnvironment: string;
  timeline: string;
  faithBasedPreference: string;
  holisticInterest: boolean;
  amenityPreferences: string[];
  needsTransport: boolean;
  assessmentPreference: string;
  
  // Step 4: Payment
  paymentType: string;
  insuranceCarrier: string;
  insuranceMemberId: string;
  insuranceGroupNumber: string;
  employerName: string;
  benefitsVerified: boolean;
  budgetRange: string;
  scholarshipInterest: boolean;
  willingToTravel: boolean;
  
  // Step 5: Contact
  firstName: string;
  lastName: string;
  decisionMakerName: string; // Legacy - computed from firstName + lastName
  phone: string;
  email: string;
  bestTimeToCall: string;
  alternativeContactName: string;
  alternativeContactPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  notes: string;
  referralSource: string;
  hipaaConsent: boolean;
}

interface EmailVerificationState {
  verified: boolean;
  verifiedAt: string | null;
}

const STORAGE_KEY = "concierge_intake_draft";
const EMAIL_VERIFICATION_KEY = "concierge_email_verified";
const DRAFT_ID_KEY = "concierge_draft_id";

// 30-minute TTL for the locally cached non-PII draft
const DRAFT_TTL_MS = 30 * 60 * 1000;

/**
 * PII-SAFE WHITELIST — only non-PII fields may be persisted to localStorage.
 *
 * SECURITY: Browser extensions, shared devices, and any other JS on the page
 * can read localStorage. Clinical PII (suicide history, medications, insurance
 * IDs, names, phone, email, etc.) MUST NOT be persisted client-side. The full
 * intake (including PII) is stored server-side via the `save-placement-draft`
 * edge function, which is the source of truth.
 */
const CONCIERGE_PERSISTABLE_FIELDS: ReadonlyArray<keyof ConciergeIntakeData> = [
  // Step 1 — non-PII demographics (no name/contact)
  "ageRange",
  "gender",
  "preferredLanguage",
  "state",
  "city",
  "currentLivingSituation",
  "relationship",
  "mobilityNeeds",
  // Step 3 — logistics (location preferences only, no PII)
  "desiredState",
  "desiredCity",
  "radiusMiles",
  "preferredEnvironment",
  "timeline",
  "faithBasedPreference",
  "holisticInterest",
  "amenityPreferences",
  "needsTransport",
  "assessmentPreference",
  // Step 4 — payment type only (no insurance IDs / employer)
  "paymentType",
  "budgetRange",
  "scholarshipInterest",
  "willingToTravel",
  // Step 2 — only the broad level-of-care selector (no clinical narrative)
  "levelOfCare",
];

function pickPersistableConciergeData(
  data: ConciergeIntakeData
): Partial<ConciergeIntakeData> {
  const out: Partial<ConciergeIntakeData> = {};
  for (const key of CONCIERGE_PERSISTABLE_FIELDS) {
    // @ts-expect-error indexed assignment from typed key list
    out[key] = data[key];
  }
  return out;
}

const initialData: ConciergeIntakeData = {
  ageRange: "",
  gender: "",
  preferredLanguage: "english",
  state: "",
  city: "",
  currentLivingSituation: "",
  relationship: "self",
  mobilityNeeds: "",
  primaryConcern: "",
  substanceUseFrequency: "",
  substanceUseDuration: "",
  detoxNeeded: "",
  levelOfCare: "",
  priorTreatment: null,
  priorTreatmentNotes: "",
  currentMedications: "",
  coOccurringConcerns: [],
  suicideHistory: "",
  desiredState: "",
  desiredCity: "",
  radiusMiles: 50,
  preferredEnvironment: "",
  timeline: "",
  faithBasedPreference: "",
  holisticInterest: false,
  amenityPreferences: [],
  needsTransport: false,
  assessmentPreference: "",
  paymentType: "",
  insuranceCarrier: "",
  insuranceMemberId: "",
  insuranceGroupNumber: "",
  employerName: "",
  benefitsVerified: false,
  budgetRange: "",
  scholarshipInterest: false,
  willingToTravel: false,
  firstName: "",
  lastName: "",
  decisionMakerName: "",
  phone: "",
  email: "",
  bestTimeToCall: "",
  alternativeContactName: "",
  alternativeContactPhone: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  notes: "",
  referralSource: "",
  hipaaConsent: false,
};

// NEW: 7 steps with email verification as step 6
const STEP_CONFIG = [
  { 
    title: "Who Needs Help", 
    description: "Tell us about the person seeking treatment",
    icon: "👤"
  },
  { 
    title: "Care Needs", 
    description: "Substance concerns and treatment requirements",
    icon: "💊"
  },
  { 
    title: "Location & Preferences", 
    description: "Where and how you'd like to receive care",
    icon: "📍"
  },
  { 
    title: "Payment & Insurance", 
    description: "How treatment will be funded",
    icon: "💳"
  },
  { 
    title: "Contact Information", 
    description: "How we can reach you about your placement",
    icon: "📞"
  },
  { 
    title: "Verify Email", 
    description: "Confirm your email to proceed to payment",
    icon: "✉️"
  },
  { 
    title: "Review & Pay", 
    description: "Review your information and complete payment",
    icon: "✅"
  },
];

export default function ConciergeIntake() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [direction, setDirection] = useState(1);
  const [formData, setFormData] = useState<ConciergeIntakeData>(initialData);
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [draftId, setDraftId] = useState<string | null>(null);
  
  // Email verification state
  const [emailVerification, setEmailVerification] = useState<EmailVerificationState>({
    verified: false,
    verifiedAt: null,
  });

  // Handle canceled payment
  // M5: When the user returns from a canceled Stripe checkout, force a fresh
  // re-verification of email if the prior verification is older than 24h, and
  // re-validate steps 5 + 6 so a stale form can't be re-submitted untouched.
  useEffect(() => {
    if (searchParams.get("canceled") === "true") {
      // Force re-verify if email verification is missing or older than 24h
      const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
      let shouldReverify = !emailVerification.verified;
      if (emailVerification.verified && emailVerification.verifiedAt) {
        const ageMs = Date.now() - new Date(emailVerification.verifiedAt).getTime();
        if (ageMs > VERIFY_TTL_MS) shouldReverify = true;
      }
      if (shouldReverify) {
        setEmailVerification({ verified: false, verifiedAt: null });
        localStorage.removeItem(EMAIL_VERIFICATION_KEY);
        setCurrentStep(6); // back to email-verification step
        toast.info("Payment was canceled. Please re-verify your email to continue.");
      } else {
        setCurrentStep(7); // Go to review step
        toast.info("Payment was canceled. You can try again when ready.");
      }
      // Clear the param
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("canceled");
      setSearchParams(newParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, setSearchParams]);

  // Phase 3: prefill from search-results / homepage / SEO page CTAs.
  // Accepts ?location=Boise,ID  ?treatment=detox  ?insurance=aetna  ?from=...
  // Runs once on mount; never overwrites a value the user has already filled.
  const prefillAppliedRef = useRef(false);
  // Funnel attribution: every concierge_intake_* event downstream attaches
  // this context so dashboards can JOIN prefilled → started → submitted by
  // dedup_key and segment by which fields were applied.
  const prefillContextRef = useRef<ConciergePrefillContext | null>(null);
  const startedFiredRef = useRef(false);
  const submittedFiredRef = useRef(false);
  useEffect(() => {
    if (prefillAppliedRef.current) return;
    const loc = searchParams.get("location") || "";
    const treatment = searchParams.get("treatment") || "";
    const insurance = searchParams.get("insurance") || "";
    const source = searchParams.get("from") || "";
    if (!loc && !treatment && !insurance) return;
    prefillAppliedRef.current = true;

    // Track which fields were actually applied (vs. ignored because user
    // already filled them) so analytics reflect real attribution impact.
    const applied = {
      city: false,
      state: false,
      zip: false,
      insurance_carrier: false,
      payment_type: false,
      level_of_care: false,
    };

    setFormData((prev) => {
      const next = { ...prev };
      if (loc && !next.desiredCity && !next.desiredState) {
        // Supported inputs:
        //   "Boise, ID"        → city="Boise", state="ID"
        //   "Boise ID"         → city="Boise", state="ID"
        //   "83702"            → ZIP only → desiredZip
        //   "Boise, ID 83702"  → city + state + zip
        //   "California" / "CA"→ state only (2-letter or full name match)
        //   "Boise"            → bare city
        const US_STATES: Record<string, string> = {
          alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
          colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
          hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
          kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
          massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
          montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
          "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND",
          ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI",
          "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT",
          vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV",
          wisconsin: "WI", wyoming: "WY", "district of columbia": "DC",
        };
        const STATE_CODES = new Set(Object.values(US_STATES));
        const ZIP_RE = /\b(\d{5})(?:-\d{4})?\b/;

        const raw = loc.trim();
        const zipMatch = raw.match(ZIP_RE);
        const zip = zipMatch?.[1] || "";
        const withoutZip = (zipMatch ? raw.replace(zipMatch[0], "") : raw)
          .replace(/,\s*,/g, ",")
          .replace(/^[,\s]+|[,\s]+$/g, "")
          .trim();

        const peelState = (s: string): { city: string; state: string } => {
          if (!s) return { city: "", state: "" };
          const lower = s.toLowerCase();
          const sortedNames = Object.keys(US_STATES).sort((a, b) => b.length - a.length);
          for (const name of sortedNames) {
            if (lower === name) return { city: "", state: US_STATES[name] };
            if (lower.endsWith(" " + name) || lower.endsWith("," + name) || lower.endsWith(", " + name)) {
              const city = s.slice(0, s.length - name.length).replace(/[,\s]+$/, "").trim();
              return { city, state: US_STATES[name] };
            }
          }
          const tokens = s.split(/[,\s]+/).filter(Boolean);
          if (tokens.length >= 2) {
            const last = tokens[tokens.length - 1].toUpperCase();
            if (last.length === 2 && STATE_CODES.has(last)) {
              return { city: tokens.slice(0, -1).join(" ").replace(/,$/, "").trim(), state: last };
            }
          }
          if (tokens.length === 1) {
            const only = tokens[0];
            if (only.length === 2 && STATE_CODES.has(only.toUpperCase())) {
              return { city: "", state: only.toUpperCase() };
            }
            if (US_STATES[only.toLowerCase()]) {
              return { city: "", state: US_STATES[only.toLowerCase()] };
            }
            return { city: only, state: "" };
          }
          return { city: s, state: "" };
        };

        let city = "";
        let state = "";
        if (withoutZip.includes(",")) {
          const parts = withoutZip.split(",").map((s) => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            city = parts[0];
            const tail = parts.slice(1).join(" ").trim();
            const peeled = peelState(tail);
            state = peeled.state || tail.toUpperCase().slice(0, 2);
          } else {
            const peeled = peelState(parts[0] || "");
            city = peeled.city;
            state = peeled.state;
          }
        } else {
          const peeled = peelState(withoutZip);
          city = peeled.city;
          state = peeled.state;
        }

        if (city) { next.desiredCity = city; applied.city = true; }
        if (state) { next.desiredState = state; applied.state = true; }
        if (zip && "desiredZip" in next && !(next as any).desiredZip) {
          (next as any).desiredZip = zip;
          applied.zip = true;
        } else if (zip && !city && !state) {
          next.desiredCity = zip;
          applied.zip = true;
          applied.city = true;
        }
      }
      if (insurance && !next.insuranceCarrier) {
        next.insuranceCarrier = insurance;
        applied.insurance_carrier = true;
        if (!next.paymentType) {
          next.paymentType = "insurance";
          applied.payment_type = true;
        }
      }
      if (treatment && !next.levelOfCare) {
        const t = treatment.toLowerCase();
        if (t.includes("detox")) { next.levelOfCare = "detox"; applied.level_of_care = true; }
        else if (t.includes("inpatient") || t.includes("residential")) { next.levelOfCare = "residential"; applied.level_of_care = true; }
        else if (t.includes("outpatient") || t.includes("iop") || t.includes("php")) { next.levelOfCare = "outpatient"; applied.level_of_care = true; }
      }
      return next;
    });

    // Build the funnel context once. Stashed in `prefillContextRef` so the
    // _started and _submitted events further down the funnel can attach the
    // exact same dedup_key + applied flags. Dashboards JOIN by dedup_key.
    const appliedAny = Object.values(applied).some(Boolean);
    const sessionId = getOrCreateConciergeSessionId();
    const normalize = (v: string) => v.trim().toLowerCase();
    const dedupKey = fnv1a32(
      [
        sessionId,
        normalize(source),
        normalize(loc),
        normalize(treatment),
        normalize(insurance),
      ].join("|"),
    );
    const ctx: ConciergePrefillContext = {
      dedup_key: dedupKey,
      source: source || "(direct)",
      has_location: !!loc,
      has_treatment: !!treatment,
      has_insurance: !!insurance,
      treatment_hint: treatment ? treatment.toLowerCase().slice(0, 32) : undefined,
      insurance_hint: insurance ? insurance.toLowerCase().slice(0, 32) : undefined,
      applied_city: applied.city,
      applied_state: applied.state,
      applied_zip: applied.zip,
      applied_insurance_carrier: applied.insurance_carrier,
      applied_payment_type: applied.payment_type,
      applied_level_of_care: applied.level_of_care,
      applied_any_field: appliedAny,
    };
    prefillContextRef.current = ctx;

    // Per-event sessionStorage dedup: same (session, params) tuple ⇒ no
    // duplicate event. Catches bfcache restores, route re-mounts, and late
    // analytics flushes beyond StrictMode's double-mount.
    const SENT_KEY = "rl_prefill_events_sent";
    let sentList: string[] = [];
    try {
      const raw = sessionStorage.getItem(SENT_KEY);
      sentList = raw ? (JSON.parse(raw) as string[]) : [];
      if (sentList.includes(dedupKey)) return;
    } catch {
      sentList = [];
    }

    emitConciergeFunnelEvent("concierge_intake_prefilled", { ...ctx });

    try {
      const next = [...sentList, dedupKey].slice(-50);
      sessionStorage.setItem(SENT_KEY, JSON.stringify(next));
    } catch {
      // best-effort
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load draft from localStorage (non-PII fields only, with TTL)
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Enforce 30-min TTL — older drafts are discarded
        const savedAtMs = parsed.savedAt ? new Date(parsed.savedAt).getTime() : 0;
        if (savedAtMs && Date.now() - savedAtMs > DRAFT_TTL_MS) {
          localStorage.removeItem(STORAGE_KEY);
        } else if (parsed.data && typeof parsed.data === "object") {
          // Defense-in-depth: re-pick whitelist on read in case an older
          // pre-fix payload (with PII) is still in localStorage.
          const safe = pickPersistableConciergeData(parsed.data as ConciergeIntakeData);
          setFormData(prev => ({ ...prev, ...safe }));
          if (parsed.savedAt) {
            setLastSaved(new Date(parsed.savedAt));
          }
        }
      } catch (e) {
        console.error("Failed to parse saved draft", e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }

    // Load email verification state
    const savedEmailVerification = localStorage.getItem(EMAIL_VERIFICATION_KEY);
    if (savedEmailVerification) {
      try {
        const parsed = JSON.parse(savedEmailVerification);
        // Check if verification is still valid (within 24 hours)
        if (parsed.verifiedAt) {
          const verifiedTime = new Date(parsed.verifiedAt).getTime();
          const now = Date.now();
          const hoursElapsed = (now - verifiedTime) / (1000 * 60 * 60);
          if (hoursElapsed < 24) {
            setEmailVerification(parsed);
          } else {
            // Clear expired verification
            localStorage.removeItem(EMAIL_VERIFICATION_KEY);
          }
        }
      } catch (e) {
        console.error("Failed to parse email verification state", e);
      }
    }

    // Load draft ID
    const savedDraftId = localStorage.getItem(DRAFT_ID_KEY);
    if (savedDraftId) {
      setDraftId(savedDraftId);
    }
  }, []);

  // Save draft to localStorage on every change — STRIPS PII via whitelist.
  // Full intake (incl. PII) is persisted server-side via save-placement-draft.
  useEffect(() => {
    const saveData = {
      data: pickPersistableConciergeData(formData),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saveData));
    setLastSaved(new Date());
  }, [formData]);

  // Belt-and-suspenders: clear the local draft when the tab is closed/hidden
  // so PII-adjacent selections (state, city, payment type) don't linger.
  useEffect(() => {
    const handleUnload = () => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore — best-effort cleanup
      }
    };
    window.addEventListener("pagehide", handleUnload);
    return () => window.removeEventListener("pagehide", handleUnload);
  }, []);

  const updateFormData = (updates: Partial<ConciergeIntakeData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
    // Clear errors for updated fields
    const newErrors = { ...stepErrors };
    Object.keys(updates).forEach(key => {
      delete newErrors[key];
    });
    setStepErrors(newErrors);

    // If email changed, invalidate stale verification
    if ('email' in updates && updates.email !== formData.email) {
      setEmailVerification({ verified: false, verifiedAt: null });
      localStorage.removeItem(EMAIL_VERIFICATION_KEY);
    }
  };

  const validateStep = (step: number): boolean => {
    const errors: Record<string, string> = {};

    switch (step) {
      case 1: // Who needs help
        if (!formData.ageRange) errors.ageRange = "Age range is required";
        if (!formData.gender) errors.gender = "Gender is required";
        if (!formData.state) errors.state = "State is required";
        if (!formData.city) errors.city = "City is required";
        if (!formData.currentLivingSituation) errors.currentLivingSituation = "Living situation is required";
        if (!formData.relationship) errors.relationship = "Relationship is required";
        break;
      case 2: // Care need
        if (!formData.primaryConcern) errors.primaryConcern = "Primary concern is required";
        if (!formData.substanceUseFrequency) errors.substanceUseFrequency = "Use frequency is required";
        if (!formData.detoxNeeded) errors.detoxNeeded = "Please indicate if detox is needed";
        if (!formData.levelOfCare) errors.levelOfCare = "Level of care is required";
        if (formData.priorTreatment === null) errors.priorTreatment = "Please indicate prior treatment";
        break;
      case 3: // Logistics
        if (!formData.desiredState) errors.desiredState = "Preferred location is required";
        if (!formData.timeline) errors.timeline = "Timeline is required";
        if (!formData.assessmentPreference) errors.assessmentPreference = "Assessment preference is required";
        break;
      case 4: // Payment
        if (!formData.paymentType) errors.paymentType = "Payment type is required";
        if ((formData.paymentType === "insurance" || formData.paymentType === "both") && !formData.insuranceCarrier) {
          errors.insuranceCarrier = "Insurance carrier is required";
        }
        if ((formData.paymentType === "self-pay" || formData.paymentType === "both") && !formData.budgetRange) {
          errors.budgetRange = "Budget range is required";
        }
        break;
      case 5: // Contact
        if (!formData.firstName || formData.firstName.trim().length < 1) errors.firstName = "First name is required";
        if (formData.firstName && formData.firstName.length > 100) errors.firstName = "First name is too long";
        if (!formData.lastName || formData.lastName.trim().length < 1) errors.lastName = "Last name is required";
        if (formData.lastName && formData.lastName.length > 100) errors.lastName = "Last name is too long";
        if (!formData.phone) errors.phone = "Phone is required";
        if (formData.phone && formData.phone.replace(/\D/g, "").length < 10) {
          errors.phone = "Please enter a valid 10-digit phone number";
        }
        if (!formData.email) errors.email = "Email is required";
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          errors.email = "Please enter a valid email";
        }
        if (formData.email && formData.email.length > 254) {
          errors.email = "Email address is too long";
        }
        if (!formData.bestTimeToCall) errors.bestTimeToCall = "Best time to call is required";
        if (formData.notes && formData.notes.length > 1000) {
          errors.notes = "Notes must be 1000 characters or less";
        }
        if (!formData.hipaaConsent) errors.hipaaConsent = "You must consent to continue";
        break;
      case 6: // Email verification
        if (!emailVerification.verified) {
          errors.email = "Please verify your email to continue";
        }
        break;
    }

    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEmailVerified = (verifiedAt: string) => {
    const newState = { verified: true, verifiedAt };
    setEmailVerification(newState);
    localStorage.setItem(EMAIL_VERIFICATION_KEY, JSON.stringify(newState));
    // Auto-advance to review step after email verification
    setTimeout(() => {
      setDirection(1);
      setCurrentStep(7);
      scrollToTopSmooth();
    }, 800);
  };

  const handleEditEmail = () => {
    // Clear email verification and go back to step 5
    setEmailVerification({ verified: false, verifiedAt: null });
    localStorage.removeItem(EMAIL_VERIFICATION_KEY);
    setDirection(-1);
    setCurrentStep(5);
  };

  // Fires concierge_intake_started exactly once per mount, the first time the
  // user successfully advances past step 1. Carries the prefill context (when
  // present) so the funnel can be segmented by attribution source / which
  // fields were prefilled. dedup_key joins to the _prefilled and _submitted
  // events.
  const fireStartedEvent = useCallback(() => {
    if (startedFiredRef.current) return;
    startedFiredRef.current = true;
    const ctx = prefillContextRef.current;
    emitConciergeFunnelEvent("concierge_intake_started", {
      // When there's no prefill context, synthesize a session-only dedup_key
      // so organic visits still get a stable join key on _started → _submitted.
      dedup_key:
        ctx?.dedup_key ||
        fnv1a32(`${getOrCreateConciergeSessionId()}|started|(direct)`),
      source: ctx?.source || "(direct)",
      had_prefill: !!ctx,
      applied_any_field: ctx?.applied_any_field ?? false,
      applied_city: ctx?.applied_city ?? false,
      applied_state: ctx?.applied_state ?? false,
      applied_zip: ctx?.applied_zip ?? false,
      applied_insurance_carrier: ctx?.applied_insurance_carrier ?? false,
      applied_payment_type: ctx?.applied_payment_type ?? false,
      applied_level_of_care: ctx?.applied_level_of_care ?? false,
    });
  }, []);

  // Fires concierge_intake_submitted exactly once per mount, regardless of
  // submission channel (Stripe checkout redirect or SMS-callback fallback).
  // Carries channel + prefill context so funnel dashboards can compute
  // submit-rate by source/applied-field segments.
  const fireSubmittedEvent = useCallback(
    (channel: "checkout" | "sms", extras?: Record<string, unknown>) => {
      if (submittedFiredRef.current) return;
      submittedFiredRef.current = true;
      const ctx = prefillContextRef.current;
      emitConciergeFunnelEvent("concierge_intake_submitted", {
        dedup_key:
          ctx?.dedup_key ||
          fnv1a32(`${getOrCreateConciergeSessionId()}|submitted|(direct)`),
        source: ctx?.source || "(direct)",
        channel,
        had_prefill: !!ctx,
        applied_any_field: ctx?.applied_any_field ?? false,
        applied_city: ctx?.applied_city ?? false,
        applied_state: ctx?.applied_state ?? false,
        applied_zip: ctx?.applied_zip ?? false,
        applied_insurance_carrier: ctx?.applied_insurance_carrier ?? false,
        applied_payment_type: ctx?.applied_payment_type ?? false,
        applied_level_of_care: ctx?.applied_level_of_care ?? false,
        ...extras,
      });
    },
    [],
  );

  const handleNext = async () => {
    if (validateStep(currentStep)) {
      if (currentStep === 1) fireStartedEvent();
      if (currentStep < 7) {
        // Auto-save draft to DB when leaving contact step (step 5)
        // This captures leads who drop off before email verification or payment
        if (currentStep === 5) {
          try {
            const { data: draftData } = await supabase.functions.invoke("save-placement-draft", {
              body: {
                intakeData: formData,
                emailVerifiedAt: null,
                draftId: draftId,
              },
            });
            if (draftData?.draftId) {
              setDraftId(draftData.draftId);
              localStorage.setItem(DRAFT_ID_KEY, draftData.draftId);
            }
          } catch (e) {
            // Don't block navigation if draft save fails
            console.error("Auto-save draft failed:", e);
          }
        }
        setDirection(1);
        setCurrentStep(prev => prev + 1);
        scrollToTopSmooth();
      }
    } else {
      toast.error("Please fill in all required fields");
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setDirection(-1);
      setCurrentStep(prev => prev - 1);
      scrollToTopSmooth();
    }
  };

  const handleEditStep = (step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
    scrollToTopSmooth();
  };

  const handleProceedToPayment = async () => {
    // Prevent double-click
    if (isProcessingPayment) return;

    // Validate all previous steps before payment
    for (let step = 1; step <= 6; step++) {
      if (!validateStep(step)) {
        setCurrentStep(step);
        toast.error("Please complete all required fields before payment");
        return;
      }
    }

    setIsProcessingPayment(true);
    
    try {
      // Save draft to database first
      const { data: draftData, error: draftError } = await supabase.functions.invoke("save-placement-draft", {
        body: {
          intakeData: formData,
          emailVerifiedAt: emailVerification.verifiedAt,
          draftId: draftId,
        },
      });

      if (draftError) {
        console.error("Draft save error:", draftError);
        // Don't block payment if draft save fails
      } else if (draftData?.draftId) {
        setDraftId(draftData.draftId);
        localStorage.setItem(DRAFT_ID_KEY, draftData.draftId);
      }

      // Create checkout session
      const { data, error } = await supabase.functions.invoke("create-concierge-checkout", {
        body: {
          email: formData.email,
          intakeDraftKey: STORAGE_KEY,
          draftId: draftData?.draftId || draftId,
        },
      });

      if (error) throw error;

      if (data?.url && (data.url.startsWith("https://checkout.stripe.com") || data.url.startsWith("https://billing.stripe.com"))) {
        window.location.href = data.url;
      } else if (data?.url) {
        throw new Error("Invalid checkout URL");
      } else {
        throw new Error("No checkout URL returned");
      }
    } catch (err) {
      console.error("Checkout error:", err);
      toast.error("Failed to create checkout session. Please try again.");
      setIsProcessingPayment(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <StepWhoNeedsHelp
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 2:
        return (
          <StepCareNeed
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 3:
        return (
          <StepLogistics
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 4:
        return (
          <StepPaymentInfo
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 5:
        return (
          <StepContact
            data={formData}
            errors={stepErrors}
            onChange={updateFormData}
          />
        );
      case 6:
        return (
          <>
            <StepEmailVerification
              email={formData.email}
              firstName={formData.firstName}
              onVerified={handleEmailVerified}
              onEditEmail={handleEditEmail}
              isVerified={emailVerification.verified}
              verifiedAt={emailVerification.verifiedAt}
            />
            {/* Optional SMS-callback escape hatch — bypasses email verify + payment */}
            <SmsCallbackFallback
              draftId={draftId}
              firstName={formData.firstName}
              lastName={formData.lastName}
              phone={formData.phone}
              email={formData.email}
              notes={formData.notes}
              onRequested={(inquiryId) => {
                toast.success("Got it — a specialist will text you soon.");
                // Clear local draft state so users can't double-submit.
                localStorage.removeItem(STORAGE_KEY);
                localStorage.removeItem(EMAIL_VERIFICATION_KEY);
                localStorage.removeItem(DRAFT_ID_KEY);
                navigate(`/concierge/thank-you?channel=sms&id=${inquiryId}`);
              }}
            />
          </>
        );
      case 7:
        return (
          <StepReviewSubmit
            data={formData}
            paymentState={{ sessionId: null, paid: false, verifiedAt: null }}
            onEdit={handleEditStep}
            onPay={handleProceedToPayment}
            isSubmitting={false}
            isProcessingPayment={isProcessingPayment}
          />
        );
      default:
        return null;
    }
  };

  // Determine if we can proceed from current step
  const canProceed = () => {
    if (currentStep === 6) {
      return emailVerification.verified;
    }
    return true;
  };

  // Animation variants for step transitions
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    }),
  };

  return (
    <>
      <Helmet>
        <title>Placement Request | RehabLookup</title>
        <meta name="description" content="Complete your intake form to be placed with the right treatment programs." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <PublicHeader />

        <main className="flex-1 py-4 sm:py-6 md:py-12">
          <div className="container mx-auto px-3 sm:px-4">
            <div className="max-w-2xl mx-auto">
              {/* Form Container */}
              <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
                {/* Progress */}
                <div className="px-4 sm:px-6 md:px-8 pt-4 pb-3 border-b bg-muted/30">
                  <IntakeProgress currentStep={currentStep} totalSteps={7} />
                </div>

                {/* Step Content */}
                <div className="px-4 sm:px-6 md:px-8 py-5 sm:py-6 md:py-8 min-h-[300px]">
                  {/* Step Header */}
                  <motion.div
                    key={`header-${currentStep}`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-5 sm:mb-6"
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      <span className="text-xl sm:text-2xl">{STEP_CONFIG[currentStep - 1].icon}</span>
                      <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground">
                        {STEP_CONFIG[currentStep - 1].title}
                      </h2>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {STEP_CONFIG[currentStep - 1].description}
                    </p>
                  </motion.div>

                  <AnimatePresence mode="wait" custom={direction}>
                    <motion.div
                      key={currentStep}
                      custom={direction}
                      variants={slideVariants}
                      initial="enter"
                      animate="center"
                      exit="exit"
                      transition={{
                        x: { type: "spring", stiffness: 300, damping: 30 },
                        opacity: { duration: 0.2 },
                      }}
                    >
                      {renderStep()}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Navigation */}
                {currentStep < 7 && (
                  <div className="px-4 sm:px-6 md:px-8 py-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row justify-center gap-3">
                    {currentStep > 1 && (
                      <Button
                        variant="outline"
                        onClick={handlePrev}
                        className="h-11 px-5"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                      </Button>
                    )}
                    {currentStep === 6 ? (
                      // Email verification step - only show Continue if verified
                      emailVerification.verified && (
                        <Button
                          onClick={handleNext}
                          className="h-11 px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
                        >
                          Continue to Review
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={handleNext}
                        className="h-11 px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
                      >
                        {currentStep === 5 ? "Verify Email" : "Continue"}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}

                {currentStep === 7 && (
                  <div className="px-4 sm:px-6 py-3 border-t bg-muted/20 flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handlePrev}
                      className="text-muted-foreground"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Go back to edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Auto-save indicator */}
              {lastSaved && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  Auto-saved
                </motion.div>
              )}
            </div>
          </div>
        </main>

        <PublicFooter />
      </div>
    </>
  );
}
