// Shared request/response contracts for the provider welcome email edge functions.
//
// This module is the single source of truth for:
//   - send-provider-welcome-email
//   - send-provider-welcome-offer-email
//
// It is imported by:
//   - the edge functions themselves (Deno runtime, via esm.sh)
//   - the frontend (Vite/Node), via the re-export at
//     `src/lib/contracts/welcome-email-contracts.ts` which uses the
//     bundled `zod` package — the runtime z.* API is identical.
//
// Keep the schema definitions framework-agnostic. Do not import
// edge-only or browser-only code here.

import { z } from "https://esm.sh/zod@3.23.8";

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

// The offer email currently shares the exact same request contract.
// Aliased so callers can import a name that matches their function.
export const WelcomeOfferRequestSchema = WelcomeEmailRequestSchema;
export type WelcomeOfferRequest = WelcomeEmailRequest;

// ---------- Responses ----------

/** Stable machine-readable error codes returned by both functions. */
export const WelcomeEmailErrorCode = z.enum([
  "invalid_json",
  "validation_error",
  "email_rejected",
  "method_not_allowed",
  "internal_error",
]);
export type WelcomeEmailErrorCode = z.infer<typeof WelcomeEmailErrorCode>;

/** Reasons surfaced when `code === "email_rejected"`. */
export const RecipientRejectionReason = z.enum([
  "malformed",
  "disposable_domain",
  "role_address",
]);
export type RecipientRejectionReason = z.infer<typeof RecipientRejectionReason>;

export const WelcomeEmailErrorResponseSchema = z.object({
  error: z.string(),
  code: WelcomeEmailErrorCode,
  /** Correlation id (short form) — also returned in `x-request-id` header. */
  shortId: z.string().optional(),
  /** Per-field validation errors when `code === "validation_error"` or `"email_rejected"`. */
  fieldErrors: z.record(z.array(z.string())).optional(),
  /** Set when `code === "email_rejected"`. */
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
