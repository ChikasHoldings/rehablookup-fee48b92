// ========================================
// SHARED SERVER-SIDE VALIDATION UTILITIES
// For Edge Functions
// ========================================

/**
 * Sanitize string input - removes XSS characters and enforces max length
 */
export function sanitizeString(str: unknown, maxLength: number = 500): string {
  if (!str || typeof str !== "string") return "";
  return str
    .trim()
    .slice(0, maxLength)
    .replace(/[<>]/g, "")
    .replace(/\0/g, ""); // Remove null bytes
}

/**
 * Sanitize phone number - only allow digits and phone formatting chars
 */
export function sanitizePhone(phone: unknown): string {
  if (!phone || typeof phone !== "string") return "";
  return phone.replace(/[^\d+\-() ]/g, "").slice(0, 30);
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254 && email.length >= 5;
}

/**
 * Sanitize and validate email
 */
export function sanitizeEmail(email: unknown): string {
  if (!email || typeof email !== "string") return "";
  const cleaned = email.trim().toLowerCase().slice(0, 254);
  if (!isValidEmail(cleaned)) {
    throw new Error("Invalid email format");
  }
  return cleaned;
}

/**
 * Validate UUID format
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Sanitize name - only allow letters, spaces, hyphens, apostrophes
 */
export function sanitizeName(name: unknown, maxLength: number = 100): string {
  if (!name || typeof name !== "string") return "";
  return name
    .trim()
    .slice(0, maxLength)
    .replace(/[^a-zA-Z\s\-'.]/g, "")
    .replace(/[<>]/g, "");
}

/**
 * Validate and sanitize array of strings
 */
export function sanitizeStringArray(arr: unknown, maxItems: number = 50, maxItemLength: number = 100): string[] {
  if (!Array.isArray(arr)) return [];
  return arr
    .slice(0, maxItems)
    .filter((item) => typeof item === "string")
    .map((item) => sanitizeString(item, maxItemLength));
}

/**
 * Validate request body size (in bytes)
 */
export function validateBodySize(body: string, maxSizeBytes: number = 100000): boolean {
  return new TextEncoder().encode(body).length <= maxSizeBytes;
}

/**
 * Parse and validate JSON body safely
 */
export function safeParseJSON<T = Record<string, unknown>>(body: string): T | null {
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string | null;
}

/**
 * Check rate limit against database
 */
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  actionType: string,
  maxAttempts: number = 10,
  windowMinutes: number = 15
): Promise<RateLimitResult> {
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { count } = await supabase
    .from("rate_limit_log")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action_type", actionType)
    .gte("created_at", windowStart);

  const currentCount = count || 0;
  const allowed = currentCount < maxAttempts;
  const resetAt = allowed ? null : new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();

  return {
    allowed,
    remaining: Math.max(0, maxAttempts - currentCount),
    resetAt,
  };
}

/**
 * Log rate limit event
 */
export async function logRateLimitEvent(
  supabase: any,
  identifier: string,
  actionType: string,
  success: boolean = true,
  metadata: Record<string, unknown> = {}
): Promise<void> {
  try {
    await supabase.from("rate_limit_log").insert({
      identifier,
      action_type: actionType,
      success,
      metadata,
    });
  } catch (err) {
    console.warn("Failed to log rate limit event:", err);
  }
}

/**
 * Validate Stripe session ID format
 */
export function isValidStripeSessionId(sessionId: string): boolean {
  return /^cs_[a-zA-Z0-9_]+$/.test(sessionId) && sessionId.length < 100;
}

/**
 * Validate payment intent ID format
 */
export function isValidPaymentIntentId(piId: string): boolean {
  return /^pi_[a-zA-Z0-9_]+$/.test(piId) && piId.length < 100;
}

/**
 * Structured API error with a stable machine-readable code so callers
 * (smoke tests, monitoring, the UI) can branch on the cause without
 * pattern-matching on free-form messages.
 *
 * Throw it inside a Deno handler and convert it in the catch block via
 * `apiErrorResponse(err, corsHeaders)`.
 */
export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly httpStatus: number = 400,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Standard JSON error envelope: `{ error: { code, message }, ...extras }`.
 * Use this for ALL error responses so smoke tests and clients can rely on
 * a consistent shape.
 */
export function jsonError(
  code: string,
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  extras: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ error: { code, message }, ...extras }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    },
  );
}

/**
 * Convert any thrown error into the standard envelope.
 * - ApiError → its declared code + httpStatus
 * - everything else → INTERNAL_ERROR / 500
 */
export function apiErrorResponse(
  err: unknown,
  corsHeaders: Record<string, string>,
  extras: Record<string, unknown> = {},
): Response {
  if (err instanceof ApiError) {
    return jsonError(err.code, err.message, err.httpStatus, corsHeaders, extras);
  }
  const message = err instanceof Error ? err.message : String(err);
  return jsonError("INTERNAL_ERROR", message, 500, corsHeaders, extras);
}

/**
 * Build standardized error response (legacy shape — prefer `jsonError`).
 */
export function errorResponse(
  message: string,
  status: number = 400,
  corsHeaders: Record<string, string>,
  details?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      ...(details || {}),
    }),
    {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    }
  );
}

/**
 * Build standardized success response
 */
export function successResponse(
  data: Record<string, unknown>,
  corsHeaders: Record<string, string>,
  status: number = 200
): Response {
  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });
}

/**
 * Sanitize intake data object comprehensively
 */
export function sanitizeIntakeData(data: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (value === null || value === undefined) {
      sanitized[key] = null;
    } else if (typeof value === "string") {
      // Sanitize strings based on field type
      if (key.toLowerCase().includes("email")) {
        try {
          sanitized[key] = sanitizeEmail(value);
        } catch {
          sanitized[key] = "";
        }
      } else if (key.toLowerCase().includes("phone")) {
        sanitized[key] = sanitizePhone(value);
      } else if (key.toLowerCase().includes("name") && !key.toLowerCase().includes("username")) {
        sanitized[key] = sanitizeName(value);
      } else {
        sanitized[key] = sanitizeString(value, key.toLowerCase().includes("notes") ? 2000 : 500);
      }
    } else if (typeof value === "boolean") {
      sanitized[key] = value;
    } else if (typeof value === "number") {
      // Clamp numbers to reasonable ranges
      sanitized[key] = Math.max(-999999, Math.min(999999, value));
    } else if (Array.isArray(value)) {
      sanitized[key] = sanitizeStringArray(value);
    } else if (typeof value === "object") {
      // Recursively sanitize nested objects (limited depth)
      sanitized[key] = sanitizeIntakeData(value as Record<string, unknown>);
    }
  }

  return sanitized;
}
