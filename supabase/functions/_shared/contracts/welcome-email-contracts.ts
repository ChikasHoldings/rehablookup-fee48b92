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

import { z } from "https://esm.sh/zod@3.23.8?target=denonext";

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

/** Machine-readable status of the send call. */
export const WelcomeEmailSendStatus = z.enum(["sent", "deduplicated"]);
export type WelcomeEmailSendStatus = z.infer<typeof WelcomeEmailSendStatus>;

export const WelcomeEmailSuccessResponseSchema = z.object({
  success: z.literal(true),
  /** "sent" = newly delivered, "deduplicated" = collapsed to a prior send. */
  status: WelcomeEmailSendStatus,
  /** Convenience boolean mirroring `status === "deduplicated"`. */
  deduplicated: z.boolean(),
  /** Stable string code (kept for backwards compatibility with old clients). */
  code: z.enum(["email_sent", "email_deduplicated"]),
  /** The idempotency key the server used (echoed even when client omitted it). */
  idempotencyKey: z.string(),
  /** Resend message id on a fresh send; the idempotency key on a dedup hit. */
  messageId: z.string().optional(),
  /** ISO timestamp of the original send when `status === "deduplicated"`. */
  firstSentAt: z.string().optional(),
  /** Correlation id (also returned in `x-request-id` header). */
  shortId: z.string().optional(),
});
export type WelcomeEmailSuccessResponse = z.infer<typeof WelcomeEmailSuccessResponseSchema>;

export const WelcomeEmailResponseSchema = z.union([
  WelcomeEmailSuccessResponseSchema,
  WelcomeEmailErrorResponseSchema,
]);
export type WelcomeEmailResponse = z.infer<typeof WelcomeEmailResponseSchema>;
