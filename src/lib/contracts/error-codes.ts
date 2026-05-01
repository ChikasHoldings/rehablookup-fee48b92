// Frontend mirror of supabase/functions/_shared/contracts/error-codes.ts
//
// Kept in sync via supabase/functions/_tests/error-codes-registry_test.ts.
// Use these constants when handling responses from onboarding/provider
// edge functions in the React app.

import { z } from "zod";

export type ErrorCategory =
  | "transport"
  | "validation"
  | "auth"
  | "business"
  | "integration"
  | "internal";

export interface ErrorCodeSpec {
  readonly code: string;
  readonly httpStatus: number;
  readonly category: ErrorCategory;
  readonly description: string;
  readonly retryable: boolean;
  readonly emittedBy: readonly string[];
}

// NOTE: The `emittedBy` lists are abbreviated on the frontend — the canonical
// inventory lives in the Deno-runtime module. The set of CODE KEYS here MUST
// stay identical to the canonical module (verified by the parity test).
export const ERROR_CODES = {
  method_not_allowed: { code: "method_not_allowed", httpStatus: 405, category: "transport", description: "Request used an HTTP method other than POST.", retryable: false, emittedBy: [] },
  invalid_json: { code: "invalid_json", httpStatus: 400, category: "transport", description: "Request body could not be parsed as JSON.", retryable: false, emittedBy: [] },
  invalid_json_body: { code: "invalid_json_body", httpStatus: 400, category: "transport", description: "Request body was not a JSON object (legacy alias of invalid_json).", retryable: false, emittedBy: [] },
  body_read_failed: { code: "body_read_failed", httpStatus: 400, category: "transport", description: "Request body stream could not be read.", retryable: true, emittedBy: [] },
  validation_error: { code: "validation_error", httpStatus: 400, category: "validation", description: "Request body failed schema validation; see `errors` for details.", retryable: false, emittedBy: [] },
  validation_failed: { code: "validation_failed", httpStatus: 400, category: "validation", description: "Server-side validation rejected the payload (legacy).", retryable: false, emittedBy: [] },
  invalid_type: { code: "invalid_type", httpStatus: 400, category: "validation", description: "A field had the wrong type.", retryable: false, emittedBy: [] },
  invalid_email: { code: "invalid_email", httpStatus: 400, category: "validation", description: "Recipient email address is malformed.", retryable: false, emittedBy: [] },
  email_required: { code: "email_required", httpStatus: 400, category: "validation", description: "Recipient email field missing.", retryable: false, emittedBy: [] },
  name_required: { code: "name_required", httpStatus: 400, category: "validation", description: "Required name field missing.", retryable: false, emittedBy: [] },
  phone_required: { code: "phone_required", httpStatus: 400, category: "validation", description: "Required phone field missing.", retryable: false, emittedBy: [] },
  email_rejected: { code: "email_rejected", httpStatus: 400, category: "validation", description: "Recipient email failed the recipient guard; see `reason`.", retryable: false, emittedBy: [] },
  phone_rejected: { code: "phone_rejected", httpStatus: 400, category: "validation", description: "Recipient phone number is malformed or fails E.164 validation.", retryable: false, emittedBy: ["send-sms-notification"] },
  conflict: { code: "conflict", httpStatus: 409, category: "auth", description: "Resource already exists or invalid state transition.", retryable: false, emittedBy: [] },
  rate_limited: { code: "rate_limited", httpStatus: 429, category: "auth", description: "Caller exceeded the rate limit; honour `Retry-After`.", retryable: true, emittedBy: [] },
  facility_missing: { code: "facility_missing", httpStatus: 404, category: "business", description: "Referenced facility does not exist or is not accessible.", retryable: false, emittedBy: [] },
  lead_expired: { code: "lead_expired", httpStatus: 410, category: "business", description: "Lead is past its 24-hour redistribution window.", retryable: false, emittedBy: [] },
  email_send_failed: { code: "email_send_failed", httpStatus: 502, category: "integration", description: "Resend API failed after retries.", retryable: true, emittedBy: [] },
  welcome_email_send_failed: { code: "welcome_email_send_failed", httpStatus: 502, category: "integration", description: "Provider welcome email send failed.", retryable: true, emittedBy: [] },
  welcome_offer_email_send_failed: { code: "welcome_offer_email_send_failed", httpStatus: 502, category: "integration", description: "Provider welcome-offer email send failed.", retryable: true, emittedBy: [] },
  admin_email_send_failed: { code: "admin_email_send_failed", httpStatus: 502, category: "integration", description: "Admin notification email send failed.", retryable: true, emittedBy: [] },
  admin_emails_missing: { code: "admin_emails_missing", httpStatus: 500, category: "integration", description: "No admin recipients are configured.", retryable: false, emittedBy: [] },
  admin_notification_insert_failed: { code: "admin_notification_insert_failed", httpStatus: 502, category: "integration", description: "Failed to insert admin notification row.", retryable: true, emittedBy: [] },
  in_app_notification_failed: { code: "in_app_notification_failed", httpStatus: 502, category: "integration", description: "Failed to deliver in-app notification.", retryable: true, emittedBy: [] },
  missing_resend_key: { code: "missing_resend_key", httpStatus: 500, category: "integration", description: "RESEND_API_KEY secret is not configured.", retryable: false, emittedBy: [] },
  payment_failed: { code: "payment_failed", httpStatus: 402, category: "integration", description: "Stripe charge or PaymentIntent failed.", retryable: false, emittedBy: [] },
  charge_failed: { code: "charge_failed", httpStatus: 502, category: "integration", description: "Stripe charge failed due to a Stripe-side error.", retryable: true, emittedBy: [] },
  stripe_payment_failed: { code: "stripe_payment_failed", httpStatus: 502, category: "integration", description: "Stripe API errored while processing payment.", retryable: true, emittedBy: [] },
  facility_invoice_payment_failed: { code: "facility_invoice_payment_failed", httpStatus: 502, category: "integration", description: "Invoice charge against facility method failed.", retryable: true, emittedBy: [] },
  international_invoice_failed: { code: "international_invoice_failed", httpStatus: 502, category: "integration", description: "International placement invoice creation failed.", retryable: true, emittedBy: [] },
  case_create_failed: { code: "case_create_failed", httpStatus: 500, category: "integration", description: "Database insert into placement_cases failed.", retryable: true, emittedBy: [] },
  draft_create_failed: { code: "draft_create_failed", httpStatus: 500, category: "integration", description: "Database insert into a drafts table failed.", retryable: true, emittedBy: [] },
  draft_update_failed: { code: "draft_update_failed", httpStatus: 500, category: "integration", description: "Database update on a drafts table failed.", retryable: true, emittedBy: [] },
  lead_unlock_attribution_failed: { code: "lead_unlock_attribution_failed", httpStatus: 500, category: "integration", description: "Lead unlock attribution write failed.", retryable: true, emittedBy: [] },
  unlock_rollback_failed: { code: "unlock_rollback_failed", httpStatus: 500, category: "integration", description: "Lead unlock compensating rollback failed.", retryable: true, emittedBy: [] },
  email_sent: { code: "email_sent", httpStatus: 200, category: "integration", description: "Email newly sent (success path).", retryable: false, emittedBy: [] },
  email_deduplicated: { code: "email_deduplicated", httpStatus: 200, category: "integration", description: "Idempotency key matched a prior send (success path).", retryable: false, emittedBy: [] },
  internal_error: { code: "internal_error", httpStatus: 500, category: "internal", description: "Unhandled server error; check `requestId` in logs.", retryable: true, emittedBy: [] },
} as const satisfies Record<string, ErrorCodeSpec>;

export type ErrorCode = keyof typeof ERROR_CODES;

export const ERROR_CODE_IDS: readonly ErrorCode[] = Object.keys(
  ERROR_CODES,
) as ErrorCode[];

export const ErrorCodeEnum = z.enum(
  ERROR_CODE_IDS as [ErrorCode, ...ErrorCode[]],
);

export function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === "string" && value in ERROR_CODES;
}

export function getErrorSpec(code: string): ErrorCodeSpec | undefined {
  return (ERROR_CODES as Record<string, ErrorCodeSpec>)[code];
}

export interface ErrorEnvelope {
  success: false;
  code: ErrorCode;
  message: string;
  requestId?: string;
  errors?: Record<string, string[]>;
  reason?: string;
}
