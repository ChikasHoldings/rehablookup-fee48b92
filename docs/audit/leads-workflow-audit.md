# Leads Workflow End-to-End Audit

## Architecture Overview

### Entry Points
1. **Facility Profile Lead Form** (`useLeadIntakeForm.ts` → `submit-qualified-lead`)
2. **Exit Intent Modal** (`QuickStartModal.tsx` → `submit-exit-intent-lead`)
3. **Marketing Landing** (`MarketingLanding.tsx` → `submit-marketing-lead`)
4. **Facility Tour Request** (`FacilityTourRequestModal.tsx` → `submit-qualified-lead`)

### Core Flow
1. Seeker submits form → email verification enforced (client + server)
2. `submit-qualified-lead` validates, deduplicates, inserts into `leads` table
3. Lead assigned to facility with `exclusive_until` (24h) and `extended_until` (72h)
4. Provider sees lead in `leads_provider_view` (PII masked)
5. Provider unlocks via `unlock-lead` (credits or Stripe)
6. After unlock, `leads_provider_view` returns real PII
7. After exclusive window expires, `process-lead-redistribution` redistributes

### PII Masking (leads_provider_view)
- Uses `security_barrier = true` (prevents optimizer leaks)
- Masks: name, email, phone, message
- Condition: `EXISTS (SELECT 1 FROM lead_unlocks lu JOIN facilities f ON lu.facility_id = f.id WHERE lu.lead_id = l.id AND f.user_id = current_auth_uid())`
- WHERE clause: Only shows leads for facilities owned by current user OR distributed to them

## Issues Found

### CRITICAL
1. **[FIXED PREVIOUSLY] View uses `security_barrier` not `security_invoker`** — This is actually CORRECT for masking. `security_barrier` prevents predicate pushdown attacks that could leak masked data through WHERE clause timing attacks.

### HIGH
2. **`previous_treatment_details` exposed without unlock** — Line 85 shows this field is returned unmasked. This is a free-text field that could contain PII (names of doctors, facilities, personal medical history). Should be masked like `message`.

3. **`best_time_to_call` exposed without unlock** — Line 89. While not directly PII, combined with other fields it reveals scheduling preferences that should be gated behind unlock.

4. **Missing `current_auth_uid()` function check** — If this function doesn't exist or returns NULL for service_role, the view could behave unexpectedly. Need to verify.

### MEDIUM
5. **Unlock-lead returns full lead data in response** — Line 726-738 of unlock-lead returns the full `lead` object including name, email, phone. This is correct (provider just paid) but the response should be verified to not include internal fields.

6. **No facility_id validation in WHERE clause for redistributed leads** — The view shows leads where `lead_distributions` has a row for the user's facility. This is correct but should verify that `lead_distributions` is properly protected by RLS.

### LOW
7. **`special_needs` array exposed without unlock** — Could contain sensitive medical info depending on values.

## Verification Needed
- [ ] RLS on `leads` table (direct access blocked?)
- [ ] RLS on `lead_unlocks` table
- [ ] RLS on `lead_distributions` table
- [ ] `current_auth_uid()` function definition
- [ ] `submit-exit-intent-lead` and `submit-marketing-lead` validation
- [ ] `process-lead-redistribution` PII handling
- [ ] Admin panel leads management
