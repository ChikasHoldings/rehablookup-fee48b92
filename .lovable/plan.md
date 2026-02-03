
# Audit: Provider Onboarding & Listing Wizard Enhancement

## Current State Analysis

### Provider Signup Wizard (7 Steps)
| Step | Purpose | Status |
|------|---------|--------|
| 1. Account | Personal info, password | Complete |
| 2. Verify | Email OTP verification | Complete |
| 3. Facility | Name, type, address | Missing some types |
| 4. Branding | Logo, gallery upload | Complete |
| 5. Services | Treatment types selection | Complete |
| 6. Insurance | Insurance providers, accreditations | Basic free-text only |
| 7. Review | Summary and terms | Complete |

### Inconsistency Found: Facility Types

```text
Signup Wizard:           Listing Editor:          Add Location:
------------------------  -----------------------  ------------------------
Residential Treatment     Residential Treatment    Residential Treatment Center
Outpatient Clinic         Outpatient Program       Outpatient Treatment
Detox Center              Detox Center             Detox Center
Sober Living Home         Sober Living             Sober Living
Hospital-Based Program    Dual Diagnosis           Dual Diagnosis
Telehealth/Virtual        Luxury Rehab             Luxury Rehab
                                                   IOP
                                                   PHP
```

**Issue**: Facility types are inconsistent across all three pages. Signup is missing "Luxury Rehab", "Dual Diagnosis", "IOP", and "PHP".

---

## Recommended Enhancements

### 1. Unify Facility Types (Required Fix)
Standardize facility types across all pages to this unified list:
- Residential Treatment Center
- Outpatient Program
- Detox Center  
- Intensive Outpatient (IOP)
- Partial Hospitalization (PHP)
- Sober Living
- Dual Diagnosis
- Luxury Rehab
- Telehealth/Virtual

### 2. Add "Luxury" Trust Badge (Enhancement)
Create a new badge type for luxury rehab facilities that displays on search results and profile pages:
- Gold/premium styling to differentiate from standard listings
- Auto-applied when facility_type = "Luxury Rehab"
- Displays alongside existing badges (Verified, Years, JCAHO, etc.)

### 3. Enhanced Accreditations Selection (Enhancement)
Replace free-text accreditations field with structured checkboxes (matching `ProviderTrustForm.tsx`):
- JCAHO Accredited
- CARF Certified  
- LegitScript Certified
- NAATP Member
- State Licensed
- SAMHSA Listed

This ensures data consistency and enables badge display on profiles.

### 4. Add "Accepts International Patients" Flag (Enhancement)
New database column and UI checkbox:
- `accepts_international_patients` boolean on facilities table
- Checkbox in Step 3 (Facility) of signup wizard
- Checkbox in Listing Editor
- Helps international placement matching

### 5. Placement Network Awareness (Optional Enhancement)
Add brief mention in Review step about the Placement Network opportunity:
- Info callout about earning $1,000+ per placement
- Link to learn more (not mandatory opt-in during signup)
- Keeps signup flow lean while creating awareness

---

## Technical Implementation

### Phase 1: Unify Facility Types
Files to update:
- `src/pages/ProviderSignup.tsx` - Update `facilityTypes` array
- `src/pages/provider/ListingEditor.tsx` - Already has most types
- `src/pages/provider/AddLocation.tsx` - Already has most types

### Phase 2: Add Luxury Badge
Files to create/update:
- `src/components/trust/TrustBadge.tsx` - Add "luxury" badge type
- `src/components/trust/TrustBadgesSection.tsx` - Auto-apply for luxury facilities

### Phase 3: Structured Accreditations in Signup
Files to update:
- `src/pages/ProviderSignup.tsx` - Replace textarea with checkboxes
- Database: Insert into `facility_accreditations` table on signup

### Phase 4: International Patients Flag
Database migration:
```sql
ALTER TABLE facilities 
ADD COLUMN accepts_international_patients BOOLEAN DEFAULT false;
```

Files to update:
- `src/pages/ProviderSignup.tsx` - Add checkbox in Step 3
- `src/pages/provider/ListingEditor.tsx` - Add toggle
- Search/matching logic for international placements

---

## Risk Assessment

| Change | Risk | Mitigation |
|--------|------|------------|
| Unifying facility types | Low | Existing values still valid |
| Adding luxury badge | Low | Additive change only |
| Structured accreditations | Low | Existing free-text preserved |
| International flag | Low | New optional field |
| Placement awareness | Low | Non-blocking info only |

---

## Summary

**Must Fix:**
- Unify facility types (signup missing Luxury Rehab, IOP, PHP, Dual Diagnosis)

**Recommended Enhancements:**
- Add Luxury badge for premium facilities
- Structured accreditation checkboxes in signup
- International patients acceptance flag
- Placement Network awareness callout

**Not Recommended:**
- Adding full Placement Network enrollment to signup (too complex, separate flow works well)
- Mandatory international opt-in (should remain in Placement Network page)

All changes are additive and backward-compatible with existing data.
