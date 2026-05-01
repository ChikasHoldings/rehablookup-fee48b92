import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, Mail, RefreshCw, AlertCircle, MapPin, User, Users, Clock, Heart, Shield, Calendar, UserCircle, Stethoscope, Send } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { PhoneInput } from "@/components/ui/phone-input";
import { EmailInput } from "@/components/ui/email-input";
import { isValidPhoneNumber } from "@/lib/phoneUtils";
import { isValidEmail } from "@/lib/emailUtils";
import { useZipcodeLookup } from "@/hooks/useZipcodeLookup";
import { cn } from "@/lib/utils";
import {
  LeadIntakeFormData,
  URGENCY_OPTIONS,
  AGE_RANGE_OPTIONS,
  GENDER_OPTIONS,
  RELATIONSHIP_OPTIONS,
  LEVEL_OF_CARE_OPTIONS,
  INSURANCE_TYPE_OPTIONS,
  PREVIOUS_TREATMENT_OPTIONS,
  BEST_TIME_OPTIONS,
} from "./types";

// Zod schema for the contact step. Mirrors UI rules + adds length caps to
// prevent abuse and align with backend Zod validation in the edge function.
const contactSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, { message: "First name is required" })
    .max(60, { message: "First name must be under 60 characters" })
    .regex(/^[\p{L}\p{M}'’\-.\s]+$/u, { message: "First name contains invalid characters" }),
  lastName: z
    .string()
    .trim()
    .min(1, { message: "Last name is required" })
    .max(60, { message: "Last name must be under 60 characters" })
    .regex(/^[\p{L}\p{M}'’\-.\s]+$/u, { message: "Last name contains invalid characters" }),
  phone: z
    .string()
    .trim()
    .max(32, { message: "Phone number is too long" })
    .refine(isValidPhoneNumber, { message: "Valid phone number is required" }),
  email: z
    .string()
    .trim()
    .max(254, { message: "Email is too long" })
    .refine(isValidEmail, { message: "Valid email is required" }),
  consentToContact: z.literal(true, {
    errorMap: () => ({ message: "Please agree to be contacted to continue" }),
  }),
});


// Question types
type QuestionType = "choice" | "multi-choice" | "text" | "location" | "contact" | "verify";

interface Question {
  id: string;
  type: QuestionType;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  field: keyof LeadIntakeFormData | "contact" | "verify";
  options?: { value: string; label: string; description?: string; icon?: React.ReactNode }[];
  required?: boolean;
  skipIf?: (formData: LeadIntakeFormData) => boolean;
}

// Define the question flow - prioritized for provider value
const QUESTIONS: Question[] = [
  {
    id: "who",
    type: "choice",
    title: "Who needs help?",
    subtitle: "We'll tailor the experience based on your situation",
    icon: <User className="h-6 w-6" />,
    field: "whoSeekingHelp",
    required: true,
    options: [
      { value: "self", label: "Myself", description: "I'm looking for treatment", icon: <User className="h-5 w-5" /> },
      { value: "loved-one", label: "A Loved One", description: "I'm helping someone else", icon: <Users className="h-5 w-5" /> },
    ],
  },
  {
    id: "relationship",
    type: "choice",
    title: "What's your relationship to them?",
    subtitle: "This helps us communicate effectively",
    icon: <Users className="h-6 w-6" />,
    field: "relationshipToPatient",
    skipIf: (data) => data.whoSeekingHelp !== "loved-one",
    options: RELATIONSHIP_OPTIONS.filter(o => o.value !== "self").map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "urgency",
    type: "choice",
    title: "How urgent is your situation?",
    subtitle: "This helps us prioritize your request",
    icon: <Clock className="h-6 w-6" />,
    field: "urgency",
    required: true,
    options: URGENCY_OPTIONS.map(o => ({
      value: o.value,
      label: o.label,
      icon: o.value === "immediate" ? <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" /> :
            o.value === "within-week" ? <span className="h-2 w-2 rounded-full bg-amber-500" /> :
            <span className="h-2 w-2 rounded-full bg-blue-500" />,
    })),
  },
  {
    id: "location",
    type: "location",
    title: "Where are you located?",
    subtitle: "We'll find treatment centers near you",
    icon: <MapPin className="h-6 w-6" />,
    field: "locationZip",
    required: true,
  },
  {
    id: "levelOfCare",
    type: "choice",
    title: "What level of care are you looking for?",
    subtitle: "Don't worry if you're unsure — we can help guide you",
    icon: <Stethoscope className="h-6 w-6" />,
    field: "levelOfCare",
    required: true,
    options: LEVEL_OF_CARE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "insurance",
    type: "choice",
    title: "How will you pay for treatment?",
    subtitle: "This helps us find facilities that accept your coverage",
    icon: <Shield className="h-6 w-6" />,
    field: "insuranceType",
    required: true,
    options: INSURANCE_TYPE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "ageRange",
    type: "choice",
    title: "What is the patient's age range?",
    subtitle: "Age-appropriate care makes a difference",
    icon: <Calendar className="h-6 w-6" />,
    field: "ageRange",
    required: true,
    options: AGE_RANGE_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "gender",
    type: "choice",
    title: "What is the patient's gender?",
    subtitle: "Some programs are gender-specific",
    icon: <UserCircle className="h-6 w-6" />,
    field: "gender",
    required: true,
    options: GENDER_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "previousTreatment",
    type: "choice",
    title: "Any previous treatment experience?",
    subtitle: "This helps connect you with the right approach",
    icon: <Heart className="h-6 w-6" />,
    field: "previousTreatment",
    required: true,
    options: PREVIOUS_TREATMENT_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "bestTime",
    type: "choice",
    title: "When's the best time to reach you?",
    subtitle: "The facility will reach out at your preferred time",
    icon: <Clock className="h-6 w-6" />,
    field: "bestTimeToCall",
    required: true,
    options: BEST_TIME_OPTIONS.map(o => ({ value: o.value, label: o.label })),
  },
  {
    id: "contact",
    type: "contact",
    title: "How can we reach you?",
    subtitle: "Your information is kept confidential",
    icon: <Mail className="h-6 w-6" />,
    field: "contact",
    required: true,
  },
  {
    id: "verify",
    type: "verify",
    title: "Verify your email",
    subtitle: "Enter the 6-digit code we sent you",
    icon: <CheckCircle2 className="h-6 w-6" />,
    field: "verify",
    required: true,
  },
];

interface SingleQuestionFlowProps {
  formData: LeadIntakeFormData;
  updateFormData: (updates: Partial<LeadIntakeFormData>) => void;
  onSubmit: (options?: { skipVerificationCheck?: boolean }) => Promise<void>;
  // Email verification
  codeSent: boolean;
  isSendingCode: boolean;
  verificationCode: string;
  setVerificationCode: (code: string) => void;
  isVerifying: boolean;
  isEmailVerified: boolean;
  setIsEmailVerified: (verified: boolean) => void;
  resendCount: number;
  resendCooldown: number;
  sendVerificationCode: () => Promise<boolean>;
  verifyCode: (code: string) => Promise<boolean>;
  resetEmailVerification: () => void;
  checkAndAutoVerifyEmail: (email: string) => Promise<boolean>;
  isSubmitting: boolean;
  facilityName?: string | null;
}

export function SingleQuestionFlow({
  formData,
  updateFormData,
  onSubmit,
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
  isSubmitting,
  facilityName,
}: SingleQuestionFlowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [consentToContact, setConsentToContact] = useState(false);
  const isSubmittingRef = useRef(false);
  
  // Filter questions based on skip conditions
  const activeQuestions = QUESTIONS.filter(q => !q.skipIf || !q.skipIf(formData));
  const totalQuestions = activeQuestions.length;
  const currentQuestion = activeQuestions[currentIndex];
  const progress = ((currentIndex + 1) / totalQuestions) * 100;
  
  // Location lookup
  const { data: zipcodeData, isLoading: isLookingUp, lookup } = useZipcodeLookup();
  
  // Auto-fill city/state when zipcode data is available
  useEffect(() => {
    if (zipcodeData) {
      updateFormData({ locationCityState: `${zipcodeData.city}, ${zipcodeData.stateAbbr}` });
    }
  }, [zipcodeData, updateFormData]);
  
  // Ref for scrolling to form top on step change
  const formTopRef = useRef<HTMLDivElement>(null);
  
  const scrollToFormTop = useCallback(() => {
    formTopRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  
  const goNext = useCallback(() => {
    if (currentIndex < activeQuestions.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
      scrollToFormTop();
    }
  }, [currentIndex, activeQuestions.length, scrollToFormTop]);
  
  const goBack = useCallback(() => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
      scrollToFormTop();
    }
  }, [currentIndex, scrollToFormTop]);
  
  // Handle choice selection with auto-advance
  const handleChoiceSelect = useCallback((field: keyof LeadIntakeFormData, value: string) => {
    updateFormData({ [field]: value });
    setErrors({});
    
    // Auto-advance after a brief delay for visual feedback
    setTimeout(() => {
      goNext();
    }, 300);
  }, [updateFormData, goNext]);
  
  // Handle location submission
  const handleLocationSubmit = () => {
    if (!formData.locationZip || !/^\d{5}$/.test(formData.locationZip)) {
      setErrors({ locationZip: "Please enter a valid 5-digit ZIP code" });
      return;
    }
    goNext();
  };
  
  // Handle zipcode change with lookup
  const handleZipcodeChange = (value: string) => {
    const cleanValue = value.replace(/\D/g, "").slice(0, 5);
    updateFormData({ locationZip: cleanValue });
    setErrors({});
    
    if (cleanValue.length === 5) {
      lookup(cleanValue);
    }
  };
  
  // Guard to prevent double-clicks during the entire contact submit flow
  const isContactSubmitting = useRef(false);
  
  // Handle contact submission - checks if email already verified, if so submits directly
  const handleContactSubmit = async () => {
    if (isSubmittingRef.current || isContactSubmitting.current) return;
    isContactSubmitting.current = true;
    
    try {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) newErrors.firstName = "First name is required";
    if (!formData.lastName.trim()) newErrors.lastName = "Last name is required";
    if (!isValidPhoneNumber(formData.phone)) newErrors.phone = "Valid phone number is required";
    if (!isValidEmail(formData.email)) newErrors.email = "Valid email is required";
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // Check if email is already verified (within 24h)
    const alreadyVerified = await checkAndAutoVerifyEmail(formData.email);
    
    if (alreadyVerified) {
      // Email already verified - submit directly with skip flag to avoid React state race condition
      isSubmittingRef.current = true;
      try {
        await onSubmit({ skipVerificationCheck: true });
      } finally {
        isSubmittingRef.current = false;
      }
      return;
    }
    
    // Send verification code and move to verification step
    const success = await sendVerificationCode();
    if (success) {
      goNext();
    }
    } finally {
      isContactSubmitting.current = false;
    }
  };
  
  // Handle verification
  const handleVerifyCode = async () => {
    if (isSubmittingRef.current) return;
    if (verificationCode.length === 6) {
      const success = await verifyCode(verificationCode);
      if (success) {
        isSubmittingRef.current = true;
        try {
          await onSubmit({ skipVerificationCheck: true });
        } finally {
          isSubmittingRef.current = false;
        }
      } else {
        setErrors({ code: "Invalid or expired code" });
      }
    }
  };
  
  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };
  
  // Render question content based on type
  const renderQuestionContent = () => {
    if (!currentQuestion) return null;
    
    switch (currentQuestion.type) {
      case "choice":
        return (
          <div className="space-y-2.5 sm:space-y-3">
            {currentQuestion.options?.map((option, index) => (
              <motion.button
                key={option.value}
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={() => handleChoiceSelect(currentQuestion.field as keyof LeadIntakeFormData, option.value)}
                className={cn(
                  "w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border-2 transition-all duration-200 text-left",
                  "hover:border-primary hover:bg-primary/5 hover:shadow-sm",
                  "active:scale-[0.98]",
                  formData[currentQuestion.field as keyof LeadIntakeFormData] === option.value
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border bg-card"
                )}
              >
                {option.icon && (
                  <div className={cn(
                    "w-9 h-9 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center shrink-0 transition-colors",
                    formData[currentQuestion.field as keyof LeadIntakeFormData] === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {option.icon}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className={cn(
                    "font-semibold text-sm sm:text-base transition-colors",
                    formData[currentQuestion.field as keyof LeadIntakeFormData] === option.value
                      ? "text-primary"
                      : "text-foreground"
                  )}>
                    {option.label}
                  </div>
                  {option.description && (
                    <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-1">{option.description}</div>
                  )}
                </div>
                <div className={cn(
                  "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                  formData[currentQuestion.field as keyof LeadIntakeFormData] === option.value
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30"
                )}>
                  {formData[currentQuestion.field as keyof LeadIntakeFormData] === option.value && (
                    <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
                  )}
                </div>
              </motion.button>
            ))}
          </div>
        );
        
      case "location":
        return (
          <div className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-5 gap-2 sm:gap-3">
              <div className="col-span-2 relative">
                <Input
                  placeholder="ZIP"
                  value={formData.locationZip}
                  onChange={(e) => handleZipcodeChange(e.target.value)}
                  className={cn(
                    "h-12 sm:h-14 text-base sm:text-lg font-medium text-center rounded-xl",
                    errors.locationZip && "border-destructive",
                    zipcodeData && "border-green-400 bg-green-50/50"
                  )}
                  inputMode="numeric"
                  maxLength={5}
                  autoFocus
                />
                {isLookingUp && (
                  <div className="absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div className="col-span-3">
                <Input
                  placeholder={isLookingUp ? "Detecting..." : "City, State"}
                  value={formData.locationCityState}
                  onChange={(e) => updateFormData({ locationCityState: e.target.value })}
                  className={cn(
                    "h-12 sm:h-14 text-base sm:text-lg rounded-xl",
                    zipcodeData && "bg-green-50/50 border-green-400"
                  )}
                  disabled={isLookingUp}
                />
              </div>
            </div>
            {errors.locationZip && (
              <p className="text-xs sm:text-sm text-destructive">{errors.locationZip}</p>
            )}
            {zipcodeData && (
              <motion.p 
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs sm:text-sm text-green-600 flex items-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Location detected
              </motion.p>
            )}
            <Button 
              onClick={handleLocationSubmit}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              size="lg"
            >
              Continue
            </Button>
          </div>
        );
        
      case "contact":
        return (
          <div className="space-y-4 sm:space-y-5">
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">First Name *</Label>
                <Input
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => {
                    updateFormData({ firstName: e.target.value });
                    setErrors(prev => ({ ...prev, firstName: "" }));
                  }}
                  className={cn("h-11 sm:h-12 text-sm sm:text-base rounded-lg", errors.firstName && "border-destructive")}
                  autoComplete="given-name"
                />
                {errors.firstName && <p className="text-xs text-destructive">{errors.firstName}</p>}
              </div>
              <div className="space-y-1.5 sm:space-y-2">
                <Label className="text-xs sm:text-sm font-medium">Last Name *</Label>
                <Input
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => {
                    updateFormData({ lastName: e.target.value });
                    setErrors(prev => ({ ...prev, lastName: "" }));
                  }}
                  className={cn("h-11 sm:h-12 text-sm sm:text-base rounded-lg", errors.lastName && "border-destructive")}
                  autoComplete="family-name"
                />
                {errors.lastName && <p className="text-xs text-destructive">{errors.lastName}</p>}
              </div>
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Phone Number *</Label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => {
                  updateFormData({ phone: value });
                  setErrors(prev => ({ ...prev, phone: "" }));
                }}
                className={cn("h-11 sm:h-12", errors.phone && "border-destructive")}
              />
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>
            
            <div className="space-y-1.5 sm:space-y-2">
              <Label className="text-xs sm:text-sm font-medium">Email Address *</Label>
              <EmailInput
                placeholder="you@example.com"
                value={formData.email}
                onChange={(value) => {
                  updateFormData({ email: value });
                  setErrors(prev => ({ ...prev, email: "" }));
                  if (codeSent || isEmailVerified) {
                    resetEmailVerification();
                  }
                }}
                className={cn("h-11 sm:h-12", errors.email && "border-destructive")}
              />
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>
            
            <Button 
              onClick={handleContactSubmit}
              disabled={isSendingCode || isSubmitting}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Submitting...
                </>
              ) : isSendingCode ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Submit
                </>
              )}
            </Button>
            
            <p className="text-[11px] sm:text-xs text-muted-foreground text-center leading-relaxed px-1">
              By submitting, you agree to be contacted by{facilityName ? ` ${facilityName}` : " the selected treatment center"} via phone, SMS, or email about treatment options. Message &amp; data rates may apply. Your information is confidential — see our{" "}
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>{" "}and{" "}
              <a href="/terms-of-service" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Terms</a>.
            </p>
          </div>
        );
        
      case "verify":
        return (
          <div className="space-y-4 sm:space-y-6">
            <p className="text-xs sm:text-sm text-muted-foreground text-center px-2">
              We sent a 6-digit code to <span className="font-medium text-foreground break-all">{formData.email}</span>
            </p>
            
            <div className="flex flex-col items-center gap-3 sm:gap-4">
              <InputOTP
                value={verificationCode}
                onChange={(value) => {
                  setVerificationCode(value);
                  setErrors({});
                }}
                maxLength={6}
              >
                <InputOTPGroup className="gap-1.5 sm:gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <InputOTPSlot key={i} index={i} className="h-12 w-10 sm:h-14 sm:w-12 text-lg sm:text-xl rounded-lg sm:rounded-xl" />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              
              {errors.code && (
                <p className="text-xs sm:text-sm text-destructive flex items-center gap-1.5 sm:gap-2">
                  <AlertCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  {errors.code}
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleVerifyCode}
              disabled={isVerifying || verificationCode.length !== 6 || isSubmitting}
              className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-all"
              size="lg"
            >
              {isVerifying || isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                  {isSubmitting ? "Submitting..." : "Verifying..."}
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Verify & Submit
                </>
              )}
            </Button>
            
            <div className="flex items-center justify-center gap-2 text-xs sm:text-sm">
              <span className="text-muted-foreground">Didn't receive it?</span>
              <Button
                variant="link"
                size="sm"
                onClick={sendVerificationCode}
                disabled={resendCooldown > 0 || resendCount >= 3}
                className="p-0 h-auto text-xs sm:text-sm"
              >
                {resendCooldown > 0 ? (
                  `Resend in ${resendCooldown}s`
                ) : (
                  <>
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Resend Code
                  </>
                )}
              </Button>
            </div>
            
            {resendCount >= 3 && (
              <p className="text-sm text-amber-600 text-center flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Maximum attempts reached. Please wait 10 minutes.
              </p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <div ref={formTopRef} className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="px-4 sm:px-6 pt-4 sm:pt-5">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-muted-foreground tabular-nums">
            Step {currentIndex + 1} of {totalQuestions}
          </span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          />
        </div>
      </div>
      
      {/* Question content */}
      <div className="relative min-h-[350px] sm:min-h-[400px] px-4 sm:px-6 pb-2">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={currentQuestion?.id}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="w-full"
          >
            {/* Question header */}
            <div className="text-center mb-5 sm:mb-8 pt-4 sm:pt-5">
              {currentQuestion?.icon && (
                <motion.div 
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary/10 text-primary mb-3 sm:mb-4"
                >
                  {currentQuestion.icon}
                </motion.div>
              )}
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-foreground mb-1.5 sm:mb-2 px-2">
                {currentQuestion?.title}
              </h2>
              {currentQuestion?.subtitle && (
                <p className="text-xs sm:text-sm text-muted-foreground px-4">
                  {currentQuestion.subtitle}
                </p>
              )}
            </div>
            
            {/* Question content */}
            {renderQuestionContent()}
          </motion.div>
        </AnimatePresence>
      </div>
      
      {/* Navigation */}
      <div className="px-4 sm:px-6 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={goBack}
          disabled={currentIndex === 0}
          className={cn(
            "gap-1.5 sm:gap-2 h-9 sm:h-10",
            currentIndex === 0 && "invisible"
          )}
        >
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="text-sm">Back</span>
        </Button>
        
        {/* Skip button for optional questions */}
        {!currentQuestion?.required && currentQuestion?.type === "choice" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={goNext}
            className="text-muted-foreground hover:text-foreground h-9 sm:h-10 text-sm"
          >
            Skip
          </Button>
        )}
      </div>
      
      {/* Trust indicators */}
      <div className="mx-4 sm:mx-6 mt-4 sm:mt-5 mb-4 sm:mb-5 pt-4 border-t flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary" />
          <span>HIPAA Compliant</span>
        </div>
        <span className="text-border">·</span>
        <div className="flex items-center gap-1">
          <span className="text-xs">🔒</span>
          <span>Encrypted</span>
        </div>
        <span className="text-border">·</span>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-green-500" />
          <span>100% Free</span>
        </div>
      </div>
      
      {/* Honeypot — hidden from humans, traps bots */}
      <div className="hidden" aria-hidden="true">
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={formData.website}
          onChange={(e) => updateFormData({ website: e.target.value })}
        />
      </div>
    </div>
  );
}
