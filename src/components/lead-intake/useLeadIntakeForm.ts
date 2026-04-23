import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LeadIntakeFormData, initialLeadIntakeFormData, TOTAL_STEPS } from "./types";
import { analytics } from "@/lib/analytics";
import { useAuthReady } from "@/hooks/useAuthReady";

const STORAGE_KEY = "lead_intake_form_data";
const STORAGE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
const SUBMISSION_DEBOUNCE_MS = 3000; // 3 second debounce between submissions

interface StoredFormData {
  data: LeadIntakeFormData;
  step: number;
  timestamp: number;
}

interface UseLeadIntakeFormOptions {
  /** Override facility ID from URL params */
  facilityIdOverride?: string;
  /** Override facility name from URL params */
  facilityNameOverride?: string;
}

export function useLeadIntakeForm(options: UseLeadIntakeFormOptions = {}) {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuthReady();
  const hasPrePopulated = useRef(false);
  const lastSubmitAt = useRef(0);
  const idempotencyKeyRef = useRef<string | null>(null);
  
  // Parse facility info from URL, but allow overrides from props
  const urlFacilityId = searchParams.get("facility");
  const urlFacilityName = searchParams.get("facilityName") 
    ? decodeURIComponent(searchParams.get("facilityName")!) 
    : null;
  
  // Use override values if provided, otherwise use URL params
  const facilityId = options.facilityIdOverride || urlFacilityId;
  const facilityName = options.facilityNameOverride || urlFacilityName;
  const source = searchParams.get("source") || (facilityId ? "facility_profile" : "direct");
  
  // Form state
  const [formData, setFormData] = useState<LeadIntakeFormData>(initialLeadIntakeFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  // Email verification state
  const [codeSent, setCodeSent] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [resendCount, setResendCount] = useState(0);
  const [resendCooldown, setResendCooldown] = useState(0);
  
  // Tracking refs
  const hasTrackedPageView = useRef(false);
  const stepViewsTracked = useRef<Set<number>>(new Set());
  
  // Check if email is already verified (within 24h)
  const checkEmailAlreadyVerified = async (email: string): Promise<boolean> => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    
    try {
      const { data, error } = await supabase.functions.invoke("check-email-verified", {
        body: { email: email.toLowerCase().trim() },
      });
      
      if (error) throw error;
      return data?.verified === true;
    } catch (error) {
      console.error("Error checking email verification:", error);
      return false;
    }
  };
  
  // Load saved form data from localStorage
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed: StoredFormData = JSON.parse(saved);
          if (Date.now() - parsed.timestamp < STORAGE_EXPIRY_MS) {
            setFormData(parsed.data);
            setCurrentStep(parsed.step);
            
            // Check if the saved email is already verified
            if (parsed.data.email) {
              const alreadyVerified = await checkEmailAlreadyVerified(parsed.data.email);
              if (alreadyVerified) {
                setIsEmailVerified(true);
                setCodeSent(true); // Show as verified state
              }
            }
          } else {
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    };
    
    loadSavedData();
  }, []);
  
  // Pre-populate form with logged-in seeker's profile data
  useEffect(() => {
    if (!isAuthenticated || !user || hasPrePopulated.current) return;
    hasPrePopulated.current = true;

    const prefill = async () => {
      try {
        const { data: profile } = await supabase
          .from("seeker_profiles")
          .select("first_name, last_name, phone, zipcode, city, state")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            firstName: prev.firstName || profile.first_name || "",
            lastName: prev.lastName || profile.last_name || "",
            phone: prev.phone || profile.phone || "",
            email: prev.email || user.email || "",
            locationZip: prev.locationZip || profile.zipcode || "",
            locationCityState: prev.locationCityState || 
              (profile.city && profile.state ? `${profile.city}, ${profile.state}` : ""),
          }));
          
          // Auto-mark email as verified for logged-in users
          if (user.email) {
            setIsEmailVerified(true);
            setCodeSent(true);
          }
        } else if (user.email) {
          // No seeker profile but still logged in - fill email
          setFormData(prev => ({
            ...prev,
            email: prev.email || user.email || "",
          }));
          setIsEmailVerified(true);
          setCodeSent(true);
        }
      } catch (err) {
        console.error("[useLeadIntakeForm] Failed to prefill from profile:", err);
      }
    };

    prefill();
  }, [isAuthenticated, user]);

  // Save form data to localStorage
  useEffect(() => {
    if (!isSubmitted) {
      const toStore: StoredFormData = {
        data: formData,
        step: currentStep,
        timestamp: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    }
  }, [formData, currentStep, isSubmitted]);
  
  // Track page view
  useEffect(() => {
    if (!hasTrackedPageView.current) {
      hasTrackedPageView.current = true;
      trackAnalytics("page_view", { facilityId, source });
      analytics.leadFormStart();
    }
  }, [facilityId, source]);
  
  // Track step views
  useEffect(() => {
    if (!stepViewsTracked.current.has(currentStep)) {
      stepViewsTracked.current.add(currentStep);
      trackAnalytics("step_view", { step: currentStep, facilityId, source });
    }
  }, [currentStep, facilityId, source]);
  
  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);
  
  // Analytics tracking - track-request-help edge function was removed.
  // Kept as a no-op to preserve call sites; primary analytics flow through
  // the `analytics` helper (GA/Meta Pixel) elsewhere in this hook.
  const trackAnalytics = async (_eventType: string, _metadata?: Record<string, unknown>) => {
    // no-op
  };
  
  const updateFormData = useCallback((updates: Partial<LeadIntakeFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);
  
  const nextStep = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
      trackAnalytics("step_complete", { step: currentStep });
      analytics.leadFormStep(nextStepNum, `Step ${nextStepNum}`);
    }
  }, [currentStep]);
  
  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);
  
  // Function to check and auto-verify email (exposed for component use)
  const checkAndAutoVerifyEmail = async (email: string): Promise<boolean> => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
    
    const verified = await checkEmailAlreadyVerified(email);
    if (verified) {
      setIsEmailVerified(true);
      setCodeSent(true);
      return true;
    }
    return false;
  };
  
  // Email verification functions
  const sendVerificationCode = async () => {
    if (resendCount >= 3) {
      toast({
        title: "Too many attempts",
        description: "Maximum verification attempts reached. Please wait 10 minutes.",
        variant: "destructive",
      });
      return false;
    }
    
    if (resendCooldown > 0) return false;
    
    setIsSendingCode(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("send-verification-code", {
        body: { email: formData.email.toLowerCase().trim() },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setCodeSent(true);
      setResendCount(prev => prev + 1);
      setResendCooldown(60);
      setVerificationCode("");
      
      trackAnalytics("verification_code_sent");
      
      toast({
        title: "Verification code sent",
        description: "Check your email for the 6-digit code",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Failed to send code",
        description: error.message || "Please try again",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const verifyCode = async (code: string) => {
    if (code.length !== 6) return false;
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase.functions.invoke("verify-code", {
        body: { 
          email: formData.email.toLowerCase().trim(),
          code,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      setIsEmailVerified(true);
      trackAnalytics("email_verified");
      
      toast({
        title: "Email verified",
        description: "You can now submit your request",
      });
      
      return true;
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsVerifying(false);
    }
  };
  
  const resetEmailVerification = useCallback(() => {
    setCodeSent(false);
    setIsEmailVerified(false);
    setVerificationCode("");
    setResendCount(0);
    setResendCooldown(0);
  }, []);
  
 const handleSubmit = async (options?: { skipVerificationCheck?: boolean }) => {
    // Submission debounce - prevent double-clicks and rapid resubmission
    const now = Date.now();
    if (now - lastSubmitAt.current < SUBMISSION_DEBOUNCE_MS) {
      console.log("[useLeadIntakeForm] Submission debounced");
      return;
    }
    lastSubmitAt.current = now;

    // Check honeypot
    if (formData.website) {
      console.log("Honeypot triggered");
      trackAnalytics("spam_blocked", { reason: "honeypot" });
      // Pretend success to fool bots
      setIsSubmitted(true);
      return;
    }
    
    // Skip verification check if explicitly told verification just succeeded
    if (!options?.skipVerificationCheck && !isEmailVerified) {
      toast({
        title: "Email not verified",
        description: "Please verify your email before submitting",
        variant: "destructive",
      });
      return;
    }
    
    // Validate facility ID is present (required for all submissions)
    if (!facilityId) {
      toast({
        title: "Submission error",
        description: "Please select a treatment center before submitting",
        variant: "destructive",
      });
      trackAnalytics("form_submit_error", { error: "missing_facility_id" });
      return;
    }
    
    // Validate required fields
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide your full name",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      toast({
        title: "Invalid email",
        description: "Please provide a valid email address",
        variant: "destructive",
      });
      return;
    }
    
    // Normalize phone to digits only for submission
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (phoneDigits.length < 10) {
      toast({
        title: "Invalid phone",
        description: "Please provide a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    // Generate idempotency key (unique per submission attempt)
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `${formData.email.toLowerCase().trim()}-${facilityId}-${Date.now()}-${crypto.randomUUID().slice(0,8)}`;
    }
    
    setIsSubmitting(true);
    
    try {
      const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;
      
      const { data, error } = await supabase.functions.invoke("submit-qualified-lead", {
        body: {
          facilityId: facilityId,
          whoSeekingHelp: formData.whoSeekingHelp,
          locationZip: formData.locationZip?.trim(),
          locationCityState: formData.locationCityState?.trim() || undefined,
          urgency: formData.urgency,
          primarySubstance: formData.primarySubstance,
          levelOfCare: formData.levelOfCare,
          dualDiagnosis: formData.dualDiagnosis || undefined,
          insuranceType: formData.insuranceType,
          insuranceProvider: formData.insuranceProvider?.trim() || undefined,
          budgetPreference: formData.budgetPreference || undefined,
          name: fullName,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          phone: phoneDigits, // Send normalized phone
          email: formData.email.toLowerCase().trim(),
          preferredContact: formData.preferredContact,
          message: formData.message?.trim() || undefined,
          source,
          specialNeeds: formData.specialNeeds,
          // NEW enhanced intake fields
          ageRange: formData.ageRange || undefined,
          gender: formData.gender || undefined,
          relationshipToPatient: formData.relationshipToPatient || undefined,
          previousTreatment: formData.previousTreatment || undefined,
          previousTreatmentDetails: formData.previousTreatmentDetails?.trim() || undefined,
          coOccurringConditions: formData.coOccurringConditions?.length ? formData.coOccurringConditions : undefined,
          employmentStatus: formData.employmentStatus || undefined,
          veteranStatus: formData.veteranStatus || undefined,
          legalInvolvement: formData.legalInvolvement || undefined,
          readinessLevel: formData.readinessLevel || undefined,
          bestTimeToCall: formData.bestTimeToCall || undefined,
          idempotencyKey: idempotencyKeyRef.current,
        },
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Clear saved form data and idempotency key
      localStorage.removeItem(STORAGE_KEY);
      idempotencyKeyRef.current = null;
      
      trackAnalytics("form_submit_success");
      analytics.leadFormComplete(source);
      analytics.formSubmit("lead_intake", true);
      setIsSubmitted(true);
      
      // NOTE: Seeker confirmation email is sent server-side by submit-qualified-lead.
      // Do NOT send a duplicate frontend email here.
      
    } catch (error: any) {
      // Reset idempotency key so user can retry
      idempotencyKeyRef.current = null;
      trackAnalytics("form_submit_error", { error: error.message });
      toast({
        title: "Submission failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    // Form state
    formData,
    updateFormData,
    currentStep,
    setCurrentStep,
    nextStep,
    prevStep,
    
    // Context
    facilityId,
    facilityName,
    source,
    
    // Submission
    isSubmitting,
    isSubmitted,
    handleSubmit,
    
    // Email verification
    codeSent,
    isSendingCode,
    verificationCode,
    setVerificationCode,
    isVerifying,
    isEmailVerified,
    setIsEmailVerified,
    resendCount,
    resendCooldown,
    sendVerificationCode,
    verifyCode,
    resetEmailVerification,
    checkAndAutoVerifyEmail,
    
    // Analytics
    trackAnalytics,
  };
}
