
# Leads Inquiry E2E Audit & Enhancement Plan

## Executive Summary

After a thorough audit of the leads inquiry system, I've identified several gaps and areas for enhancement. While the core infrastructure is well-built, there are **missing form fields**, **incomplete UI integration**, and **enhancement opportunities** to make the system truly industry-standard.

---

## Current System Status

### What's Working
| Component | Status | Notes |
|-----------|--------|-------|
| Lead Intake Form (3-step) | Functional | Submit via `submit-qualified-lead` with email verification |
| Direct Request Modal | Functional | Submit via `submit-direct-lead` from facility profiles |
| Lead Masking (locked leads) | Functional | `leads_provider_view` masks PII via `is_lead_unlocked()` |
| Credit-based Unlock | Functional | `unlock-lead` edge function with Pro discount |
| Email after Unlock | Functional | `send-lead-email` with professional templates |
| SMS Notification | Functional | `send-sms-notification` via Twilio |
| Provider Inquiries Page | Functional | Displays locked/unlocked leads with filters |
| Admin Leads Page | Functional | Full admin visibility and management |

### Critical Gaps Found

#### 1. Missing Industry-Standard Form Fields (HIGH PRIORITY)
The current form lacks critical fields that providers need to make informed decisions:

| Missing Field | Why It Matters | Provider Value |
|---------------|----------------|----------------|
| **Age/Age Range** | Insurance coverage, program eligibility | High - determines treatment options |
| **Gender** | Gender-specific programs | High - facility matching |
| **Relationship to Patient** | Who to communicate with | Medium - communication context |
| **Previous Treatment History** | Indicates relapse risk/level of care | High - treatment planning |
| **Co-occurring Disorders** | Beyond dual diagnosis (anxiety, depression, PTSD) | High - specialized care |
| **Employment/Student Status** | Scheduling, financial options | Medium - flexibility |
| **Military/Veteran Status** | VA benefits, specialized programs | Medium - funding options |
| **Legal/Court Involvement** | Court-mandated treatment, drug court | High - compliance requirements |
| **Readiness Level** | Stage of change, commitment level | High - conversion probability |
| **Best Time to Call** | When to reach seeker | High - contact success rate |

#### 2. RequestInfoModal Missing Fields (MEDIUM PRIORITY)
The direct request modal from facility profiles captures less data than the main form:
- Missing: location, level of care, insurance type, dual diagnosis, substances
- Impact: Providers receive incomplete information for unlocked direct leads

#### 3. SMS/Call After Unlock Not Prominent (MEDIUM PRIORITY)
After unlocking, providers see phone numbers but there's no "click-to-call" or "send SMS" prominent CTA in the detail panel.

#### 4. Seeker Panel Lead Tracking (LOW PRIORITY)
Registered seekers can submit inquiries but currently cannot track their submitted requests in their `/account` dashboard.

---

## Detailed Implementation Plan

### Phase 1: Enhance Lead Intake Form Fields (HIGH PRIORITY)

#### 1.1 Update Form Types (`src/components/lead-intake/types.ts`)
Add new fields to `LeadIntakeFormData`:
```typescript
// New fields to add
ageRange: string;                    // "18-25", "26-35", "36-45", "46-55", "56+"
gender: string;                      // "male", "female", "non-binary", "prefer-not-say"
relationshipToPatient: string;       // "self", "parent", "spouse", "child", "sibling", "friend", "other"
previousTreatment: string;           // "none", "once", "multiple", "currently-in"
previousTreatmentDetails: string;    // Free text for previous programs
coOccurringConditions: string[];     // ["anxiety", "depression", "ptsd", "eating-disorder", "other"]
employmentStatus: string;            // "employed", "unemployed", "student", "retired", "disabled"
veteranStatus: string;               // "veteran", "active-duty", "family-of-veteran", "none"
legalInvolvement: string;            // "none", "court-ordered", "drug-court", "probation", "pending"
readinessLevel: string;              // "ready-now", "considering", "researching", "helping-someone"
bestTimeToCall: string;              // "morning", "afternoon", "evening", "anytime"
```

New form options constants:
```typescript
export const AGE_RANGE_OPTIONS = [
  { value: "18-25", label: "18-25 years old" },
  { value: "26-35", label: "26-35 years old" },
  { value: "36-45", label: "36-45 years old" },
  { value: "46-55", label: "46-55 years old" },
  { value: "56+", label: "56+ years old" },
];

export const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-say", label: "Prefer not to say" },
];

export const PREVIOUS_TREATMENT_OPTIONS = [
  { value: "none", label: "No previous treatment" },
  { value: "once", label: "Been to treatment once before" },
  { value: "multiple", label: "Multiple treatment experiences" },
  { value: "currently-in", label: "Currently in treatment (looking to step up/down)" },
];

export const READINESS_OPTIONS = [
  { value: "ready-now", label: "Ready to start immediately" },
  { value: "considering", label: "Seriously considering, need more info" },
  { value: "researching", label: "Early research, exploring options" },
  { value: "helping-someone", label: "Helping someone else decide" },
];

export const BEST_TIME_OPTIONS = [
  { value: "morning", label: "Morning (8am-12pm)" },
  { value: "afternoon", label: "Afternoon (12pm-5pm)" },
  { value: "evening", label: "Evening (5pm-8pm)" },
  { value: "anytime", label: "Anytime" },
];

export const VETERAN_STATUS_OPTIONS = [
  { value: "none", label: "Not applicable" },
  { value: "veteran", label: "Veteran" },
  { value: "active-duty", label: "Active Duty Military" },
  { value: "family-of-veteran", label: "Family member of Veteran" },
];

export const LEGAL_OPTIONS = [
  { value: "none", label: "No legal involvement" },
  { value: "court-ordered", label: "Court ordered treatment" },
  { value: "drug-court", label: "Drug court participant" },
  { value: "probation", label: "On probation/parole" },
  { value: "pending", label: "Pending legal matters" },
];

export const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed (full/part time)" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "disabled", label: "On disability" },
];

export const CO_OCCURRING_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD / Trauma" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "eating-disorder", label: "Eating Disorder" },
  { value: "adhd", label: "ADHD" },
  { value: "other", label: "Other" },
];
```

#### 1.2 Update Database Schema (Migration Required)
Add new columns to `leads` table:
```sql
ALTER TABLE leads ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS relationship_to_patient text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_treatment text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS previous_treatment_details text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS co_occurring_conditions text[];
ALTER TABLE leads ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS veteran_status text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS legal_involvement text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS readiness_level text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS best_time_to_call text;

-- Update the leads_provider_view to include new columns
```

#### 1.3 Update Step Components
- **StepImmediateNeed**: Add age range, gender, relationship to patient
- **StepEligibility**: Add previous treatment, co-occurring conditions, legal involvement, veteran status, readiness level
- **StepContactVerify**: Add best time to call, employment status

#### 1.4 Update Edge Functions
Update `submit-qualified-lead` and `submit-direct-lead` to accept and store new fields.

---

### Phase 2: Enhance Provider Lead Detail Panel (MEDIUM PRIORITY)

#### 2.1 Add Prominent Contact CTAs After Unlock
In `LeadDetailPanel.tsx`, add prominent call-to-action buttons when lead is unlocked:
```text
┌─────────────────────────────────────────────────────┐
│  John D.                           [Call] [Text]   │
│  Dallas, TX • 5 mins ago           [Send Email]    │
├─────────────────────────────────────────────────────┤
│  📞 (214) 555-1234  [Copy] [Call Now]              │
│  📧 john.doe@email.com [Copy] [Email]              │
└─────────────────────────────────────────────────────┘
```

Features to add:
- Click-to-call with `tel:` links
- SMS link with `sms:` protocol
- Copy buttons for phone/email
- Quick action buttons in header

#### 2.2 Display New Enhanced Fields
Update detail panel to show new intake fields:
- Age range & gender
- Previous treatment history
- Co-occurring conditions
- Legal involvement status
- Readiness level
- Best time to call (prominently displayed)

---

### Phase 3: Enhance RequestInfoModal (MEDIUM PRIORITY)

#### 3.1 Add Step 2 with Treatment Details
The current modal only captures basic info. Add an optional step 2:
- Level of care needed
- Insurance type
- Primary substance
- Age range
- Previous treatment

This brings direct leads to parity with the main intake form.

---

### Phase 4: Seeker Request Tracking (LOW PRIORITY)

#### 4.1 Add "My Requests" to Seeker Account
Create `/account/requests` page showing:
- Submitted inquiries with timestamps
- Facility names and status
- "Request submitted - awaiting response" status
- Link to submit new request

---

## File Change Summary

### New Files
None required - all changes are updates to existing files.

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/lead-intake/types.ts` | Add 11 new form fields and option constants |
| `src/components/lead-intake/StepImmediateNeed.tsx` | Add age range, gender, relationship |
| `src/components/lead-intake/StepEligibility.tsx` | Add previous treatment, co-occurring, legal, veteran, readiness |
| `src/components/lead-intake/StepContactVerify.tsx` | Add best time to call, employment |
| `src/components/lead-intake/useLeadIntakeForm.ts` | Handle new fields in form submission |
| `supabase/functions/submit-qualified-lead/index.ts` | Accept and store new fields |
| `supabase/functions/submit-direct-lead/index.ts` | Accept and store new fields |
| `src/components/provider/leads/LeadDetailPanel.tsx` | Display new fields, add click-to-call/SMS |
| `src/components/provider/leads/LeadDetailDrawer.tsx` | Display new fields (mobile) |
| `src/components/profile/RequestInfoModal.tsx` | Add optional treatment details step |
| `supabase/migrations/*.sql` | Add new columns to leads table |

### Edge Functions to Update
- `submit-qualified-lead` - Accept new fields
- `submit-direct-lead` - Accept new fields (optional)
- `leads_provider_view` - Include new columns in masked view

---

## Technical Details

### Database Migration SQL
```sql
-- Add new industry-standard fields to leads table
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS age_range text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS relationship_to_patient text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS previous_treatment text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS previous_treatment_details text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS co_occurring_conditions text[];
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS employment_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS veteran_status text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS legal_involvement text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS readiness_level text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS best_time_to_call text;

-- Update leads_provider_view to include new fields
CREATE OR REPLACE VIEW public.leads_provider_view
WITH (security_invoker = on)
AS
SELECT 
  -- existing columns...
  l.age_range,
  l.gender,
  l.relationship_to_patient,
  l.previous_treatment,
  l.previous_treatment_details,
  l.co_occurring_conditions,
  l.employment_status,
  l.veteran_status,
  l.legal_involvement,
  l.readiness_level,
  l.best_time_to_call,
  -- masked fields (existing)...
FROM public.leads l;
```

### Verification Checklist

| Test Case | Expected Result |
|-----------|-----------------|
| Unregistered seeker submits inquiry | Lead created, email verified, provider notified |
| Registered seeker submits inquiry | Same as above, linked to seeker account |
| Provider views locked lead | PII masked, unlock button visible |
| Provider unlocks with credits | Credit deducted, full data revealed |
| Pro provider unlocks | 20% discount applied |
| Provider sends email after unlock | Email sent via Resend |
| Provider clicks call button | Opens phone dialer |
| Admin views leads | Full access to all leads data |
| New form fields saved | All 11 new fields stored in DB |
| New fields displayed | Provider sees all intake data |

---

## Implementation Priority

1. **Phase 1** (HIGH): Enhanced form fields - 2-3 hours
2. **Phase 2** (MEDIUM): Provider panel enhancements - 1-2 hours  
3. **Phase 3** (MEDIUM): RequestInfoModal enhancements - 1 hour
4. **Phase 4** (LOW): Seeker request tracking - 1-2 hours

**Total estimated effort**: 5-8 hours

---

## Security Considerations

All new fields will:
- Be included in the masked view (hidden until unlock)
- Follow existing RLS patterns
- Not expose PII to unauthorized users
- Be validated on both client and server side
