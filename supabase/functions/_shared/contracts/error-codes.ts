// Machine-readable error code reference for onboarding/provider edge functions.
//
// This module is the single source of truth for stable error codes returned
// by the provider/onboarding edge functions. Each code maps to:
//   - a default HTTP status,
//   - a category (transport, validation, auth, business, integration, internal),
//   - a human-readable description,
//   - whether the caller can safely retry,
//   - the functions that may emit it.
//
// Keep this list in sync with:
//   - src/lib/contracts/error-codes.ts (frontend mirror)
//   - docs/api/error-codes.json (machine-readable export)
//   - docs/api/error-codes.md (human-readable reference)
//
// When adding a new code:
//   1. Add it to ERROR_CODES below.
//   2. Run `deno test supabase/functions/_tests/error-codes-registry_test.ts`
//      to verify every code emitted by the listed functions is registered.
//   3. Update the frontend mirror, JSON, and markdown files accordingly.

import { z } from "https://esm.sh/zod@3.23.8";

export type ErrorCategory =
  | "transport"
  | "validation"
  | "auth"
  | "business"
  | "integration"
  | "internal";

export interface ErrorCodeSpec {
  /** Stable machine-readable identifier returned in `code`. */
  readonly code: string;
  /** Default HTTP status used by edge functions when emitting this code. */
  readonly httpStatus: number;
  /** High-level grouping for dashboards and alerting. */
  readonly category: ErrorCategory;
  /** One-line human-readable description suitable for logs and docs. */
  readonly description: string;
  /** Whether the caller can safely retry the same request. */
  readonly retryable: boolean;
  /** Edge functions known to emit this code. */
  readonly emittedBy: readonly string[];
}

export const ERROR_CODES = {
  // ---------- Transport / protocol ----------
  method_not_allowed: {
    code: "method_not_allowed",
    httpStatus: 405,
    category: "transport",
    description:
      "Request used an HTTP method other than POST. All onboarding/provider functions are POST-only.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
      "submit-placement-case",
      "submit-international-intake",
      "submit-concierge-intake",
      "save-placement-draft",
      "save-international-placement-draft",
      "charge-placement-fee",
      "confirm-placement",
      "delete-provider-account",
      "admin-delete-provider",
      "send-provider-support",
    ],
  },
  invalid_json: {
    code: "invalid_json",
    httpStatus: 400,
    category: "transport",
    description: "Request body could not be parsed as JSON.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
      "submit-placement-case",
      "submit-international-intake",
      "submit-concierge-intake",
      "save-placement-draft",
      "save-international-placement-draft",
    ],
  },
  invalid_json_body: {
    code: "invalid_json_body",
    httpStatus: 400,
    category: "transport",
    description:
      "Request body was readable but did not contain a JSON object. Legacy alias of invalid_json — prefer invalid_json for new functions.",
    retryable: false,
    emittedBy: ["track-provider-event", "notify-admin-provider-signup"],
  },
  body_read_failed: {
    code: "body_read_failed",
    httpStatus: 400,
    category: "transport",
    description:
      "Request body stream could not be read (network truncation, client aborted upload).",
    retryable: true,
    emittedBy: ["notify-admin-provider-signup"],
  },

  // ---------- Validation ----------
  validation_error: {
    code: "validation_error",
    httpStatus: 400,
    category: "validation",
    description:
      "Request body failed Zod schema validation. The response includes an `errors` field with field-level details.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
      "submit-placement-case",
      "submit-international-intake",
      "submit-concierge-intake",
      "save-placement-draft",
      "save-international-placement-draft",
    ],
  },
  validation_failed: {
    code: "validation_failed",
    httpStatus: 400,
    category: "validation",
    description:
      "Server-side validation rejected the payload (legacy code in older functions). Prefer validation_error for new functions.",
    retryable: false,
    emittedBy: ["track-provider-event", "send-provider-support"],
  },
  invalid_type: {
    code: "invalid_type",
    httpStatus: 400,
    category: "validation",
    description:
      "A field had the wrong type (e.g. expected string but received number).",
    retryable: false,
    emittedBy: ["track-provider-event"],
  },
  invalid_email: {
    code: "invalid_email",
    httpStatus: 400,
    category: "validation",
    description:
      "Recipient email address is malformed and cannot be sent to (RFC syntax check failed).",
    retryable: false,
    emittedBy: ["send-provider-support"],
  },
  email_required: {
    code: "email_required",
    httpStatus: 400,
    category: "validation",
    description: "Recipient email field is missing or empty.",
    retryable: false,
    emittedBy: ["send-provider-support"],
  },
  name_required: {
    code: "name_required",
    httpStatus: 400,
    category: "validation",
    description: "Required name field is missing or empty.",
    retryable: false,
    emittedBy: ["send-provider-support"],
  },
  phone_required: {
    code: "phone_required",
    httpStatus: 400,
    category: "validation",
    description: "Required phone field is missing or empty.",
    retryable: false,
    emittedBy: ["send-provider-support"],
  },
  email_rejected: {
    code: "email_rejected",
    httpStatus: 400,
    category: "validation",
    description:
      "Recipient email failed the recipient guard (disposable domain, role address, malformed). The response includes a `reason` field.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
    ],
  },

  // ---------- Auth / access ----------
  conflict: {
    code: "conflict",
    httpStatus: 409,
    category: "auth",
    description:
      "Resource already exists or state transition not permitted (e.g. provider already deleted, draft already submitted).",
    retryable: false,
    emittedBy: ["admin-delete-provider", "delete-provider-account"],
  },
  rate_limited: {
    code: "rate_limited",
    httpStatus: 429,
    category: "auth",
    description:
      "Caller exceeded the per-IP or per-user rate limit. Honour the `Retry-After` header before retrying.",
    retryable: true,
    emittedBy: ["send-provider-support", "track-provider-event"],
  },

  // ---------- Business logic ----------
  facility_missing: {
    code: "facility_missing",
    httpStatus: 404,
    category: "business",
    description: "Referenced facility does not exist or is not accessible.",
    retryable: false,
    emittedBy: ["confirm-placement", "charge-placement-fee"],
  },
  lead_expired: {
    code: "lead_expired",
    httpStatus: 410,
    category: "business",
    description:
      "Lead is past its 24-hour redistribution window and can no longer be acted on.",
    retryable: false,
    emittedBy: ["confirm-placement"],
  },

  // ---------- Integration / downstream ----------
  email_send_failed: {
    code: "email_send_failed",
    httpStatus: 502,
    category: "integration",
    description:
      "Resend API rejected or failed the send after retries. Check the request id in logs.",
    retryable: true,
    emittedBy: [
      "send-provider-support",
      "send-abandoned-placement-email",
      "process-provider-drip",
    ],
  },
  welcome_email_send_failed: {
    code: "welcome_email_send_failed",
    httpStatus: 502,
    category: "integration",
    description:
      "Provider welcome email could not be sent via Resend after retries.",
    retryable: true,
    emittedBy: ["send-provider-welcome-email"],
  },
  welcome_offer_email_send_failed: {
    code: "welcome_offer_email_send_failed",
    httpStatus: 502,
    category: "integration",
    description:
      "Provider welcome-offer email could not be sent via Resend after retries.",
    retryable: true,
    emittedBy: ["send-provider-welcome-offer-email"],
  },
  admin_email_send_failed: {
    code: "admin_email_send_failed",
    httpStatus: 502,
    category: "integration",
    description: "Admin notification email could not be delivered via Resend.",
    retryable: true,
    emittedBy: ["notify-admin-provider-signup"],
  },
  admin_emails_missing: {
    code: "admin_emails_missing",
    httpStatus: 500,
    category: "integration",
    description:
      "No admin recipients are configured (admin_users table is empty or unreachable).",
    retryable: false,
    emittedBy: ["notify-admin-provider-signup"],
  },
  admin_notification_insert_failed: {
    code: "admin_notification_insert_failed",
    httpStatus: 502,
    category: "integration",
    description: "Failed to insert a row into admin_notifications.",
    retryable: true,
    emittedBy: ["notify-admin-provider-signup"],
  },
  in_app_notification_failed: {
    code: "in_app_notification_failed",
    httpStatus: 502,
    category: "integration",
    description: "Failed to deliver an in-app notification record.",
    retryable: true,
    emittedBy: ["notify-admin-provider-signup"],
  },
  missing_resend_key: {
    code: "missing_resend_key",
    httpStatus: 500,
    category: "integration",
    description:
      "RESEND_API_KEY secret is not configured for this environment.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
      "send-provider-support",
      "send-abandoned-placement-email",
    ],
  },
  payment_failed: {
    code: "payment_failed",
    httpStatus: 402,
    category: "integration",
    description:
      "Stripe charge or PaymentIntent failed (declined, insufficient funds, etc.).",
    retryable: false,
    emittedBy: ["charge-placement-fee", "save-provider-payment-method"],
  },
  charge_failed: {
    code: "charge_failed",
    httpStatus: 502,
    category: "integration",
    description:
      "Stripe charge call returned a non-success status due to a Stripe-side error.",
    retryable: true,
    emittedBy: ["charge-placement-fee"],
  },
  stripe_payment_failed: {
    code: "stripe_payment_failed",
    httpStatus: 502,
    category: "integration",
    description: "Stripe API errored while creating or confirming a payment.",
    retryable: true,
    emittedBy: ["charge-placement-fee", "confirm-placement"],
  },
  facility_invoice_payment_failed: {
    code: "facility_invoice_payment_failed",
    httpStatus: 502,
    category: "integration",
    description: "Invoice charge against the facility's saved method failed.",
    retryable: true,
    emittedBy: ["confirm-placement", "charge-placement-fee"],
  },
  international_invoice_failed: {
    code: "international_invoice_failed",
    httpStatus: 502,
    category: "integration",
    description:
      "International placement invoice could not be created in Stripe.",
    retryable: true,
    emittedBy: ["submit-international-intake"],
  },
  case_create_failed: {
    code: "case_create_failed",
    httpStatus: 500,
    category: "integration",
    description: "Database insert into placement_cases failed.",
    retryable: true,
    emittedBy: ["submit-placement-case", "submit-international-intake"],
  },
  draft_create_failed: {
    code: "draft_create_failed",
    httpStatus: 500,
    category: "integration",
    description: "Database insert into the relevant *_drafts table failed.",
    retryable: true,
    emittedBy: ["save-placement-draft", "save-international-placement-draft"],
  },
  draft_update_failed: {
    code: "draft_update_failed",
    httpStatus: 500,
    category: "integration",
    description: "Database update on the relevant *_drafts table failed.",
    retryable: true,
    emittedBy: ["save-placement-draft", "save-international-placement-draft"],
  },
  lead_unlock_attribution_failed: {
    code: "lead_unlock_attribution_failed",
    httpStatus: 500,
    category: "integration",
    description:
      "Attempted to attribute a lead unlock to a facility but the database write failed.",
    retryable: true,
    emittedBy: ["confirm-placement"],
  },
  unlock_rollback_failed: {
    code: "unlock_rollback_failed",
    httpStatus: 500,
    category: "integration",
    description:
      "Compensating rollback of a lead unlock failed after a downstream error.",
    retryable: true,
    emittedBy: ["confirm-placement"],
  },

  // ---------- Success-path informational codes ----------
  email_sent: {
    code: "email_sent",
    httpStatus: 200,
    category: "integration",
    description:
      "Email was newly sent. Returned in success responses, not in error envelopes.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
    ],
  },
  email_deduplicated: {
    code: "email_deduplicated",
    httpStatus: 200,
    category: "integration",
    description:
      "Idempotency key matched a prior send; no new email was dispatched. Returned in success responses, not in error envelopes.",
    retryable: false,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
    ],
  },

  // ---------- Internal ----------
  internal_error: {
    code: "internal_error",
    httpStatus: 500,
    category: "internal",
    description:
      "Unhandled server-side error. The response includes a `requestId` (shortId) for log correlation.",
    retryable: true,
    emittedBy: [
      "send-provider-welcome-email",
      "send-provider-welcome-offer-email",
      "submit-placement-case",
      "submit-international-intake",
      "submit-concierge-intake",
      "save-placement-draft",
      "save-international-placement-draft",
      "charge-placement-fee",
      "confirm-placement",
      "delete-provider-account",
      "admin-delete-provider",
      "send-provider-support",
      "track-provider-event",
      "notify-admin-provider-signup",
      "process-provider-drip",
      "send-abandoned-placement-email",
    ],
  },
} as const satisfies Record<string, ErrorCodeSpec>;

export type ErrorCode = keyof typeof ERROR_CODES;

/** All registered error code identifiers. */
export const ERROR_CODE_IDS: readonly ErrorCode[] = Object.keys(
  ERROR_CODES,
) as ErrorCode[];

/** Zod enum of every registered code, for runtime validation. */
export const ErrorCodeEnum = z.enum(
  ERROR_CODE_IDS as [ErrorCode, ...ErrorCode[]],
);

/** Type guard: is `value` a registered error code? */
export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && value in ERROR_CODES;
}

/** Get the spec for a registered code, or `undefined`. */
export function getErrorSpec(code: string): ErrorCodeSpec | undefined {
  return (ERROR_CODES as Record<string, ErrorCodeSpec>)[code];
}

/** Standard error envelope returned by edge functions. */
export interface ErrorEnvelope {
  success: false;
  code: ErrorCode;
  message: string;
  requestId?: string;
  /** Optional field-level validation details. */
  errors?: Record<string, string[]>;
  /** Optional sub-reason (e.g. for email_rejected). */
  reason?: string;
}
