

# International Placement System - Complete Restructure

## Overview
This plan completely restructures the International Placement system with a premium design, comprehensive intake form capturing all placement-critical data, and clear provider visibility.

---

## 1. Landing Page Redesign (`InternationalLanding.tsx`)

### Remove
- `PreCheckoutForm` component from hero section
- All price references from buttons ("$299")
- Payment-first flow

### Add
- Full-width hero with premium imagery using Unsplash
- Clear "Start Application" CTA (no price visible)
- Trust indicators with actual imagery
- Enhanced visual hierarchy

### New Hero Structure
```text
+--------------------------------------------------+
|  [Full-width hero image: luxury US facility]      |
|                                                   |
|   Your Gateway to American Rehab                  |
|   Expert placement into America's finest          |
|   treatment centers                               |
|                                                   |
|   [ Start Your Application ]  [ Call an Advisor ] |
|                                                   |
|   50+ Countries • 200+ Centers • 24hr Response    |
+--------------------------------------------------+
```

---

## 2. Complete Multi-Step Intake Wizard

### NEW Route: `/international/apply`

Create a sleek, one-question-at-a-time wizard that captures ALL data needed for successful placement.

### Form Steps (10 steps total)

| Step | Title | Fields |
|------|-------|--------|
| 1 | Contact Info | First name, Last name |
| 2 | Email | Email address |
| 3 | Phone | International phone |
| 4 | Location | Country, Preferred language |
| 5 | About the Patient | Who needs help, Age range, Gender |
| 6 | **Level of Care** | Detox, Inpatient, PHP, IOP, Sober Living, Not sure |
| 7 | Clinical Details | Primary concern, Co-occurring conditions, Previous treatment |
| 8 | Preferences | Budget, Rehab style (Luxury/Executive/Standard), Duration |
| 9 | Special Requirements | Amenities, Gender-specific, LGBTQ+, Faith-based |
| 10 | Review & Pay | Summary + "Continue to Payment - $299" |

### Missing Fields Being Added

**Level of Care (CRITICAL)**
```typescript
const LEVEL_OF_CARE_OPTIONS = [
  { value: "detox", label: "Medical Detox" },
  { value: "inpatient", label: "Inpatient / Residential" },
  { value: "php", label: "Partial Hospitalization (PHP)" },
  { value: "iop", label: "Intensive Outpatient (IOP)" },
  { value: "sober-living", label: "Sober Living / Extended Care" },
  { value: "not-sure", label: "Not sure — I need guidance" },
];
```

**Age Range**
```typescript
const AGE_RANGE_OPTIONS = [
  { value: "18-25", label: "18-25 years old" },
  { value: "26-35", label: "26-35 years old" },
  { value: "36-45", label: "36-45 years old" },
  { value: "46-55", label: "46-55 years old" },
  { value: "56+", label: "56+ years old" },
];
```

**Gender**
```typescript
const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer-not-say", label: "Prefer not to say" },
];
```

**Previous Treatment**
```typescript
const PREVIOUS_TREATMENT_OPTIONS = [
  { value: "none", label: "No previous treatment" },
  { value: "once", label: "Been to treatment once" },
  { value: "multiple", label: "Multiple treatment attempts" },
];
```

**Co-occurring Conditions**
```typescript
const CO_OCCURRING_OPTIONS = [
  { value: "anxiety", label: "Anxiety" },
  { value: "depression", label: "Depression" },
  { value: "ptsd", label: "PTSD / Trauma" },
  { value: "bipolar", label: "Bipolar Disorder" },
  { value: "eating-disorder", label: "Eating Disorder" },
  { value: "none", label: "None / Not sure" },
];
```

**Treatment Duration**
```typescript
const DURATION_OPTIONS = [
  { value: "30-days", label: "30 days" },
  { value: "60-days", label: "60 days" },
  { value: "90-days", label: "90 days" },
  { value: "6-months", label: "6+ months (extended care)" },
  { value: "flexible", label: "Flexible / Need guidance" },
];
```

**Special Requirements / Amenities**
```typescript
const AMENITY_OPTIONS = [
  { value: "private-room", label: "Private room" },
  { value: "gym-fitness", label: "Gym / Fitness facilities" },
  { value: "spa-wellness", label: "Spa / Wellness services" },
  { value: "holistic", label: "Holistic therapies" },
  { value: "equine", label: "Equine therapy" },
  { value: "ocean-view", label: "Ocean/mountain views" },
  { value: "women-only", label: "Women only program" },
  { value: "men-only", label: "Men only program" },
  { value: "lgbtq", label: "LGBTQ+ friendly" },
  { value: "faith-based", label: "Faith-based program" },
];
```

### Design Specifications
- Animated progress bar at top (0-100%)
- Framer Motion slide transitions between steps
- Large, touch-friendly inputs
- One focus area per step
- Back/Next navigation
- Final step shows complete summary + $299 payment button

---

## 3. Updated Form Data Structure

```typescript
interface InternationalIntakeData {
  // Contact
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  country: string;
  preferred_language: string;
  
  // Patient Demographics
  seeking_for: 'self' | 'loved-one';
  age_range: string;
  gender: string;
  
  // Level of Care (NEW - CRITICAL)
  level_of_care: string;
  
  // Clinical
  primary_concern: string;
  co_occurring_conditions: string[];
  previous_treatment: string;
  
  // Preferences
  budget_range: string;
  rehab_style: string;  // standard, luxury, executive, vip
  treatment_duration: string;
  willing_to_travel: string;
  
  // Special Requirements (NEW)
  amenities: string[];
  special_requirements: string;
  
  // Notes
  notes: string;
}
```

---

## 4. Enhanced Thank You Page

### Premium Design Elements
- Full-page layout with confetti animation on load
- Large success checkmark with pulse animation
- Email verification status/prompt section
- Clear timeline visualization
- Track case CTA to user portal
- Professional contact information

### Email Verification Flow
```text
+--------------------------------------------------+
|  [✓ Success Animation]                            |
|                                                   |
|  Application Submitted!                           |
|                                                   |
|  ⚠️ Please verify your email                      |
|  [We sent a verification link to xxx@email.com]   |
|                                                   |
|  [Resend Verification Email]                      |
|                                                   |
|  WHAT'S NEXT                                      |
|  1. Verify your email ←                           |
|  2. Advisor reviews your case (within 24hrs)      |
|  3. Receive matched facility options              |
|  4. Confirm placement & travel                    |
|                                                   |
|  [Track Your Case]  [Return Home]                 |
+--------------------------------------------------+
```

---

## 5. Provider Tab Restructure

### Current State (PlacementNetwork.tsx)
```tsx
<TabsTrigger value="introductions">Intros</TabsTrigger>
<TabsTrigger value="international">Int'l</TabsTrigger>
```

### New State
```tsx
<TabsTrigger value="domestic" className="font-semibold">
  <MapPin className="h-4 w-4 mr-1.5" />
  <span>Domestic</span>
  {domesticCount > 0 && <Badge>{domesticCount}</Badge>}
</TabsTrigger>
<TabsTrigger value="international" className="font-semibold">
  <Globe className="h-4 w-4 mr-1.5" />
  <span>International</span>
  {internationalCount > 0 && <Badge>{internationalCount}</Badge>}
</TabsTrigger>
```

### Tab Layout (7 tabs → clearer labels)
```text
[Domestic] [International] [Messages] [Tours] [Profile] [Billing] [History]
```

- Bold, legible text
- Icons + full words (not abbreviations)
- Badge counts on both placement types

---

## 6. Files to Create

| File | Purpose |
|------|---------|
| `src/pages/international/InternationalApplication.tsx` | Multi-step intake wizard page |
| `src/components/international/steps/StepContact.tsx` | Name inputs |
| `src/components/international/steps/StepEmail.tsx` | Email input |
| `src/components/international/steps/StepPhone.tsx` | International phone |
| `src/components/international/steps/StepLocation.tsx` | Country & language |
| `src/components/international/steps/StepPatient.tsx` | Who, age, gender |
| `src/components/international/steps/StepLevelOfCare.tsx` | Care level selection |
| `src/components/international/steps/StepClinical.tsx` | Concern, conditions, history |
| `src/components/international/steps/StepPreferences.tsx` | Budget, style, duration |
| `src/components/international/steps/StepAmenities.tsx` | Special requirements |
| `src/components/international/steps/StepReview.tsx` | Summary + payment |
| `src/components/international/IntakeProgress.tsx` | Progress bar component |

---

## 7. Files to Modify

| File | Changes |
|------|---------|
| `src/pages/international/InternationalLanding.tsx` | Remove form, add imagery, polish design, add "Start Application" CTA |
| `src/pages/international/InternationalThankYou.tsx` | Premium design, email verification, confetti |
| `src/pages/provider/PlacementNetwork.tsx` | Rename tabs to "Domestic" / "International" |
| `src/App.tsx` | Add route `/international/apply` |
| `src/components/international/PreCheckoutForm.tsx` | Delete (no longer needed) |
| `src/pages/international/InternationalIntake.tsx` | Deprecate (redirect to /apply) |

---

## 8. Route Structure

```text
/international              → Landing page (redesigned, no form)
/international/apply        → Multi-step intake wizard (NEW)
/international/intake       → Redirect to /apply (deprecated)
/international/thank-you    → Enhanced thank you page
```

---

## 9. Data Flow

```text
1. User visits /international (landing page)
2. Clicks "Start Application" → navigates to /international/apply
3. Completes 10-step wizard (data stored in React state)
4. Final step shows summary + "Continue to Payment - $299"
5. On submit: call edge function with complete intake data
6. Edge function creates pending case + Stripe session
7. User redirected to Stripe checkout
8. On success: redirected to /international/thank-you
9. Thank you page prompts email verification
```

---

## 10. Provider View Updates

When providers view international candidates, they will now see:
- Level of care needed
- Age range
- Gender
- Previous treatment history
- Co-occurring conditions
- Treatment duration preference
- Special requirements/amenities

This gives facilities the complete picture needed to make acceptance decisions.

---

## Summary

This restructure delivers:

1. **Premium Landing Page** - No price on CTAs, professional imagery, enterprise feel
2. **Complete Intake Data** - Level of care, age, gender, treatment history, amenities
3. **Sleek Form Experience** - One-at-a-time wizard with smooth animations
4. **Payment After Form** - Serious applicants complete full form before paying
5. **Enhanced Thank You** - Email verification + clear next steps
6. **Clear Provider Tabs** - "Domestic" and "International" with full labels

