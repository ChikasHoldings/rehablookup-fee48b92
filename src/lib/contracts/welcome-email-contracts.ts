// Frontend-facing re-export of the welcome email request/response contracts.
//
// The canonical source lives in
// `supabase/functions/_shared/contracts/welcome-email-contracts.ts` and is
// imported by the edge functions through esm.sh. We can't import that file
// directly from the browser bundle (the `https://esm.sh/...` import would
// be left untransformed by Vite), so this module mirrors the schemas using
// the bundled `zod` package. The two definitions MUST stay in sync — the
// `welcome-email-contracts-parity_test.ts` test enforces that.

import { z } from "zod";

// ---------- Request ----------

export const WelcomeEmailRequestSchema = z.object({
  facilityId: z.string().uuid({ message: "facilityId must be a valid UUID" }),
  facilityName: z.string().trim().min(1).max(255),
  providerEmail: z.string().trim().email().max(255),
  providerFirstName: z.string().trim().min(1).max(120),
  selectedPlan: z.string().trim().min(1).max(50),
  idempotencyKey: z.string().trim().min(1).max(255).optional(),
});

export type WelcomeEmailRequest = z.infer<typeof WelcomeEmailRequestSchema>;

export const WelcomeOfferRequestSchema = WelcomeEmailRequestSchema;
export type WelcomeOfferRequest = WelcomeEmailRequest;

// ---------- Responses ----------

export const WelcomeEmailErrorCode = z.enum([
  "invalid_json",
  "validation_error",
  "email_rejected",
  "method_not_allowed",
  "internal_error",
]);
export type WelcomeEmailErrorCode = z.infer<typeof WelcomeEmailErrorCode>;

export const RecipientRejectionReason = z.enum([
  "malformed",
  "disposable_domain",
  "role_address",
]);
export type RecipientRejectionReason = z.infer<typeof RecipientRejectionReason>;

export const WelcomeEmailErrorResponseSchema = z.object({
  error: z.string(),
  code: WelcomeEmailErrorCode,
  shortId: z.string().optional(),
  fieldErrors: z.record(z.array(z.string())).optional(),
  rejectionReason: RecipientRejectionReason.optional(),
});
export type WelcomeEmailErrorResponse = z.infer<typeof WelcomeEmailErrorResponseSchema>;

export const WelcomeEmailSuccessResponseSchema = z.object({
  success: z.literal(true),
  messageId: z.string().optional(),
  shortId: z.string().optional(),
});
export type WelcomeEmailSuccessResponse = z.infer<typeof WelcomeEmailSuccessResponseSchema>;

export const WelcomeEmailResponseSchema = z.union([
  WelcomeEmailSuccessResponseSchema,
  WelcomeEmailErrorResponseSchema,
]);
export type WelcomeEmailResponse = z.infer<typeof WelcomeEmailResponseSchema>;

/**
 * Validate a payload before invoking either welcome-email edge function.
 * Returns parsed data on success, or a flat `fieldErrors` map on failure
 * (matching the server's `validation_error` payload shape).
 */
export function validateWelcomeEmailRequest(
  input: unknown,
):
  | { ok: true; data: WelcomeEmailRequest }
  | { ok: false; fieldErrors: Record<string, string[]> } {
  const parsed = WelcomeEmailRequestSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };
  return { ok: false, fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
}
