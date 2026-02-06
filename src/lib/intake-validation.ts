import { z } from "zod";

// ========================================
// SHARED INPUT VALIDATION UTILITIES
// For intake forms and payment flows
// ========================================

// Email validation
export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .max(254, "Email too long")
  .email("Invalid email address")
  .transform((v) => v.toLowerCase());

// Phone validation - allows international formats
export const phoneSchema = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .max(20, "Phone number too long")
  .regex(/^[\d\s+\-().]+$/, "Invalid phone number format")
  .transform((v) => v.replace(/[^\d+\-() ]/g, ""));

// Optional phone
export const optionalPhoneSchema = z
  .string()
  .trim()
  .max(20, "Phone number too long")
  .regex(/^[\d\s+\-().]*$/, "Invalid phone number format")
  .transform((v) => v.replace(/[^\d+\-() ]/g, ""))
  .optional()
  .or(z.literal(""));

// Name validation - prevents XSS and excessive length
export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required")
  .max(100, "Name too long")
  .regex(/^[a-zA-Z\s\-'.]+$/, "Name contains invalid characters")
  .transform((v) => v.replace(/[<>]/g, ""));

// Optional name
export const optionalNameSchema = z
  .string()
  .trim()
  .max(100, "Name too long")
  .transform((v) => v.replace(/[<>]/g, ""))
  .optional()
  .or(z.literal(""));

// Text field validation - sanitizes XSS
export const sanitizedTextSchema = (maxLength = 500) =>
  z
    .string()
    .trim()
    .max(maxLength, `Text must be ${maxLength} characters or less`)
    .transform((v) => v.replace(/[<>]/g, ""));

// Required text field
export const requiredTextSchema = (maxLength = 500, fieldName = "Field") =>
  z
    .string()
    .trim()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be ${maxLength} characters or less`)
    .transform((v) => v.replace(/[<>]/g, ""));

// Notes/message validation
export const notesSchema = z
  .string()
  .trim()
  .max(2000, "Notes too long")
  .transform((v) => v.replace(/[<>]/g, ""))
  .optional()
  .or(z.literal(""));

// ========================================
// CONCIERGE INTAKE VALIDATION SCHEMA
// ========================================

export const conciergeIntakeSchema = z.object({
  // Step 1: Who needs help
  ageRange: requiredTextSchema(50, "Age range"),
  gender: requiredTextSchema(50, "Gender"),
  preferredLanguage: sanitizedTextSchema(50).default("english"),
  state: requiredTextSchema(50, "State"),
  city: requiredTextSchema(100, "City"),
  currentLivingSituation: requiredTextSchema(100, "Living situation"),
  relationship: requiredTextSchema(50, "Relationship").default("self"),
  mobilityNeeds: sanitizedTextSchema(200).optional(),

  // Step 2: Care needs
  primaryConcern: requiredTextSchema(100, "Primary concern"),
  substanceUseFrequency: sanitizedTextSchema(50).optional(),
  substanceUseDuration: sanitizedTextSchema(50).optional(),
  detoxNeeded: requiredTextSchema(50, "Detox needed"),
  levelOfCare: requiredTextSchema(50, "Level of care"),
  priorTreatment: z.boolean().nullable().optional(),
  priorTreatmentNotes: sanitizedTextSchema(500).optional(),
  currentMedications: sanitizedTextSchema(500).optional(),
  coOccurringConcerns: z.array(sanitizedTextSchema(100)).max(20).optional(),
  suicideHistory: sanitizedTextSchema(50).optional(),

  // Step 3: Logistics
  desiredState: requiredTextSchema(50, "Desired state"),
  desiredCity: sanitizedTextSchema(100).optional(),
  radiusMiles: z.number().min(10).max(500).default(50),
  preferredEnvironment: sanitizedTextSchema(50).optional(),
  timeline: requiredTextSchema(50, "Timeline"),
  faithBasedPreference: sanitizedTextSchema(50).optional(),
  holisticInterest: z.boolean().optional(),
  amenityPreferences: z.array(sanitizedTextSchema(100)).max(30).optional(),
  needsTransport: z.boolean().optional(),
  assessmentPreference: sanitizedTextSchema(50).optional(),

  // Step 4: Payment
  paymentType: requiredTextSchema(50, "Payment type"),
  insuranceCarrier: sanitizedTextSchema(100).optional(),
  insuranceMemberId: sanitizedTextSchema(50).optional(),
  insuranceGroupNumber: sanitizedTextSchema(50).optional(),
  employerName: sanitizedTextSchema(100).optional(),
  benefitsVerified: z.boolean().optional(),
  budgetRange: sanitizedTextSchema(50).optional(),
  scholarshipInterest: z.boolean().optional(),
  willingToTravel: z.boolean().optional(),

  // Step 5: Contact
  firstName: nameSchema,
  lastName: nameSchema,
  decisionMakerName: optionalNameSchema,
  phone: phoneSchema,
  email: emailSchema,
  bestTimeToCall: sanitizedTextSchema(50).optional(),
  alternativeContactName: optionalNameSchema,
  alternativeContactPhone: optionalPhoneSchema,
  emergencyContactName: optionalNameSchema,
  emergencyContactPhone: optionalPhoneSchema,
  notes: notesSchema,
  referralSource: sanitizedTextSchema(100).optional(),
  hipaaConsent: z.boolean().refine((v) => v === true, "HIPAA consent is required"),
});

export type ConciergeIntakeValidated = z.infer<typeof conciergeIntakeSchema>;

// ========================================
// INTERNATIONAL INTAKE VALIDATION SCHEMA
// ========================================

export const internationalIntakeSchema = z.object({
  first_name: nameSchema,
  last_name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema.or(z.literal("")),
  country: requiredTextSchema(100, "Country"),
  preferred_language: sanitizedTextSchema(50).default("English"),
  seeking_for: sanitizedTextSchema(50).optional(),
  age_range: sanitizedTextSchema(50).optional(),
  gender: sanitizedTextSchema(50).optional(),
  level_of_care: sanitizedTextSchema(100).optional(),
  primary_concern: sanitizedTextSchema(100).optional(),
  co_occurring_conditions: z.array(sanitizedTextSchema(100)).max(20).optional(),
  previous_treatment: sanitizedTextSchema(50).optional(),
  budget_range: sanitizedTextSchema(100).optional(),
  rehab_style: sanitizedTextSchema(100).optional(),
  treatment_duration: sanitizedTextSchema(50).optional(),
  amenities: z.array(sanitizedTextSchema(100)).max(30).optional(),
  special_requirements: sanitizedTextSchema(500).optional(),
  notes: notesSchema,
});

export type InternationalIntakeValidated = z.infer<typeof internationalIntakeSchema>;

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Validates and sanitizes concierge intake data
 * Returns validated data or throws ZodError
 */
export function validateConciergeIntake(data: unknown): ConciergeIntakeValidated {
  return conciergeIntakeSchema.parse(data);
}

/**
 * Validates and sanitizes international intake data
 * Returns validated data or throws ZodError
 */
export function validateInternationalIntake(data: unknown): InternationalIntakeValidated {
  return internationalIntakeSchema.parse(data);
}

/**
 * Safe validation that returns result object
 */
export function safeParseConciergeIntake(data: unknown) {
  return conciergeIntakeSchema.safeParse(data);
}

export function safeParseInternationalIntake(data: unknown) {
  return internationalIntakeSchema.safeParse(data);
}

/**
 * Sanitize a string for safe storage/display
 */
export function sanitizeInput(str: string | undefined | null, maxLength = 500): string {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "");
}

/**
 * Sanitize phone number
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^\d+\-() ]/g, "").slice(0, 20);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Rate limit check for frontend
 * Returns true if action should be blocked
 */
export function isRateLimited(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000
): boolean {
  const storageKey = `rate_limit_${key}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { attempts: [], blocked_until: null };

    // Check if currently blocked
    if (data.blocked_until && now < data.blocked_until) {
      return true;
    }

    // Clear old attempts
    data.attempts = data.attempts.filter(
      (timestamp: number) => now - timestamp < windowMs
    );

    // Check if over limit
    if (data.attempts.length >= maxAttempts) {
      data.blocked_until = now + windowMs;
      localStorage.setItem(storageKey, JSON.stringify(data));
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

/**
 * Record an action for rate limiting
 */
export function recordRateLimitAttempt(key: string): void {
  const storageKey = `rate_limit_${key}`;
  const now = Date.now();

  try {
    const stored = localStorage.getItem(storageKey);
    const data = stored ? JSON.parse(stored) : { attempts: [], blocked_until: null };

    data.attempts.push(now);
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Generate a CSRF-like token for form submissions
 */
export function generateFormToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}
