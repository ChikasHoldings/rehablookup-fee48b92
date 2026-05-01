# Onboarding/Provider Edge Function Error Codes

Machine-readable reference for stable error codes returned by onboarding and provider edge functions.

- **Source of truth:** `supabase/functions/_shared/contracts/error-codes.ts`
- **Frontend mirror:** `src/lib/contracts/error-codes.ts`
- **JSON export:** `docs/api/error-codes.json`

## Error envelope

All non-2xx responses use this shape:

```json
{
  "success": false,
  "code": "validation_error",
  "message": "Request body failed validation",
  "requestId": "abc12345",
  "errors": { "providerEmail": ["Invalid email"] }
}
```

The 2xx success envelope additionally uses two informational codes (`email_sent`, `email_deduplicated`) on the welcome email functions.

## Transport

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `method_not_allowed` | 405 | no | Request used an HTTP method other than POST. All onboarding/provider functions are POST-only. |
| `invalid_json` | 400 | no | Request body could not be parsed as JSON. |
| `invalid_json_body` | 400 | no | Request body was readable but did not contain a JSON object. Legacy alias of invalid_json — prefer invalid_json for new functions. |
| `body_read_failed` | 400 | yes | Request body stream could not be read (network truncation, client aborted upload). |

## Validation

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `validation_error` | 400 | no | Request body failed Zod schema validation. The response includes an `errors` field with field-level details. |
| `validation_failed` | 400 | no | Server-side validation rejected the payload (legacy code in older functions). Prefer validation_error for new functions. |
| `invalid_type` | 400 | no | A field had the wrong type (e.g. expected string but received number). |
| `invalid_email` | 400 | no | Recipient email address is malformed and cannot be sent to (RFC syntax check failed). |
| `email_required` | 400 | no | Recipient email field is missing or empty. |
| `name_required` | 400 | no | Required name field is missing or empty. |
| `phone_required` | 400 | no | Required phone field is missing or empty. |
| `email_rejected` | 400 | no | Recipient email failed the recipient guard (disposable domain, role address, malformed). The response includes a `reason` field. |
| `phone_rejected` | 400 | no | Recipient phone number is malformed or fails E.164 validation after normalization. |

## Auth

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `conflict` | 409 | no | Resource already exists or state transition not permitted (e.g. provider already deleted, draft already submitted). |
| `rate_limited` | 429 | yes | Caller exceeded the per-IP or per-user rate limit. Honour the `Retry-After` header before retrying. |

## Business

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `facility_missing` | 404 | no | Referenced facility does not exist or is not accessible. |
| `lead_expired` | 410 | no | Lead is past its 24-hour redistribution window and can no longer be acted on. |

## Integration

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `email_send_failed` | 502 | yes | Resend API rejected or failed the send after retries. Check the request id in logs. |
| `welcome_email_send_failed` | 502 | yes | Provider welcome email could not be sent via Resend after retries. |
| `welcome_offer_email_send_failed` | 502 | yes | Provider welcome-offer email could not be sent via Resend after retries. |
| `admin_email_send_failed` | 502 | yes | Admin notification email could not be delivered via Resend. |
| `admin_emails_missing` | 500 | no | No admin recipients are configured (admin_users table is empty or unreachable). |
| `admin_notification_insert_failed` | 502 | yes | Failed to insert a row into admin_notifications. |
| `in_app_notification_failed` | 502 | yes | Failed to deliver an in-app notification record. |
| `missing_resend_key` | 500 | no | RESEND_API_KEY secret is not configured for this environment. |
| `payment_failed` | 402 | no | Stripe charge or PaymentIntent failed (declined, insufficient funds, etc.). |
| `charge_failed` | 502 | yes | Stripe charge call returned a non-success status due to a Stripe-side error. |
| `stripe_payment_failed` | 502 | yes | Stripe API errored while creating or confirming a payment. |
| `facility_invoice_payment_failed` | 502 | yes | Invoice charge against the facility's saved method failed. |
| `international_invoice_failed` | 502 | yes | International placement invoice could not be created in Stripe. |
| `case_create_failed` | 500 | yes | Database insert into placement_cases failed. |
| `draft_create_failed` | 500 | yes | Database insert into the relevant *_drafts table failed. |
| `draft_update_failed` | 500 | yes | Database update on the relevant *_drafts table failed. |
| `lead_unlock_attribution_failed` | 500 | yes | Attempted to attribute a lead unlock to a facility but the database write failed. |
| `unlock_rollback_failed` | 500 | yes | Compensating rollback of a lead unlock failed after a downstream error. |
| `email_sent` | 200 | no | Email was newly sent. Returned in success responses, not in error envelopes. |
| `email_deduplicated` | 200 | no | Idempotency key matched a prior send; no new email was dispatched. Returned in success responses, not in error envelopes. |

## Internal

| Code | HTTP | Retryable | Description |
|---|---|---|---|
| `internal_error` | 500 | yes | Unhandled server-side error. The response includes a `requestId` (shortId) for log correlation. |

## Emitted by

- **admin-delete-provider** — `conflict`, `internal_error`, `method_not_allowed`
- **charge-placement-fee** — `charge_failed`, `facility_invoice_payment_failed`, `facility_missing`, `internal_error`, `method_not_allowed`, `payment_failed`, `stripe_payment_failed`
- **confirm-placement** — `facility_invoice_payment_failed`, `facility_missing`, `internal_error`, `lead_expired`, `lead_unlock_attribution_failed`, `method_not_allowed`, `stripe_payment_failed`, `unlock_rollback_failed`
- **delete-provider-account** — `conflict`, `internal_error`, `method_not_allowed`
- **notify-admin-provider-signup** — `admin_email_send_failed`, `admin_emails_missing`, `admin_notification_insert_failed`, `body_read_failed`, `in_app_notification_failed`, `internal_error`, `invalid_json_body`
- **process-provider-drip** — `email_send_failed`, `internal_error`
- **save-international-placement-draft** — `draft_create_failed`, `draft_update_failed`, `internal_error`, `invalid_json`, `method_not_allowed`, `validation_error`
- **save-placement-draft** — `draft_create_failed`, `draft_update_failed`, `internal_error`, `invalid_json`, `method_not_allowed`, `validation_error`
- **save-provider-payment-method** — `payment_failed`
- **send-abandoned-placement-email** — `email_send_failed`, `internal_error`, `missing_resend_key`
- **send-provider-support** — `email_required`, `email_send_failed`, `internal_error`, `invalid_email`, `method_not_allowed`, `missing_resend_key`, `name_required`, `phone_required`, `rate_limited`, `validation_failed`
- **send-provider-welcome-email** — `email_deduplicated`, `email_rejected`, `email_sent`, `internal_error`, `invalid_json`, `method_not_allowed`, `missing_resend_key`, `validation_error`, `welcome_email_send_failed`
- **send-provider-welcome-offer-email** — `email_deduplicated`, `email_rejected`, `email_sent`, `internal_error`, `invalid_json`, `method_not_allowed`, `missing_resend_key`, `validation_error`, `welcome_offer_email_send_failed`
- **submit-concierge-intake** — `internal_error`, `invalid_json`, `method_not_allowed`, `validation_error`
- **submit-international-intake** — `case_create_failed`, `internal_error`, `international_invoice_failed`, `invalid_json`, `method_not_allowed`, `validation_error`
- **submit-placement-case** — `case_create_failed`, `internal_error`, `invalid_json`, `method_not_allowed`, `validation_error`
- **track-provider-event** — `internal_error`, `invalid_json_body`, `invalid_type`, `rate_limited`, `validation_failed`

