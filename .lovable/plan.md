
# Enhanced Accreditation Verification System

## Current State Analysis

The existing system has two separate, unlinked tables:
- **`facility_accreditations`**: Stores claimed accreditations (JCAHO, CARF, etc.) with verification status
- **`facility_credential_documents`**: Stores generic uploaded documents without linking to specific accreditations

**Problem**: When a provider claims an accreditation, there's no way to:
1. Enter a verification number specific to that accreditation
2. Upload a certificate linked directly to that accreditation
3. Provide a public verification URL for admin lookup

---

## Verification Methods by Accreditation Type

| Accreditation | Primary Verification | Public Lookup Available |
|---------------|---------------------|------------------------|
| **JCAHO** | Certificate/Organization Number | qualitycheck.org |
| **CARF** | Accreditation Number | carf.org/providerSearch |
| **LegitScript** | Certification ID | legitscript.com/search |
| **NAATP** | Member ID | naatp.org/membership-directory |
| **State Licensed** | License Number + State | Varies by state |
| **SAMHSA Listed** | Facility ID or Name | findtreatment.gov |

---

## Proposed Database Changes

### 1. Extend `facility_accreditations` Table

Add new columns to store verification data directly on each accreditation:

```text
New Columns:
├── verification_number (text) - License/certificate/member number
├── verification_url (text) - Optional public lookup URL
├── document_url (text) - Uploaded certificate file URL
├── document_name (text) - Original filename
├── issuing_authority (text) - e.g., "State of California DHCS"
└── notes (text) - Provider notes for admin
```

### 2. Add Verification Metadata Config

Create an `ACCREDITATION_VERIFICATION_CONFIG` that defines what each accreditation type requires:

```text
JCAHO:
├── requiresNumber: true
├── numberLabel: "Organization ID"
├── numberPlaceholder: "e.g., 123456"
├── numberFormat: "6-digit number"
├── lookupUrl: "https://www.qualitycheck.org"
├── supportsDocument: true
└── documentLabel: "JCAHO Certificate"

CARF:
├── requiresNumber: true
├── numberLabel: "Accreditation Number"
├── supportsDocument: true
...

State Licensed:
├── requiresNumber: true
├── numberLabel: "License Number"
├── requiresState: true (already captured at facility level)
├── supportsDocument: true
└── documentLabel: "State License Document"
```

---

## UI/UX Enhancements

### 1. Enhanced Accreditation Card Component

When a provider checks an accreditation, expand to show verification fields:

```text
┌─────────────────────────────────────────────────────┐
│ ☑ JCAHO Accredited                    [Pending ⏳] │
│   Joint Commission on Accreditation...             │
│                                                     │
│   ┌─ Verification Details ────────────────────┐   │
│   │                                            │   │
│   │  Organization ID *                         │   │
│   │  ┌──────────────────────────────────────┐ │   │
│   │  │ e.g., 123456                         │ │   │
│   │  └──────────────────────────────────────┘ │   │
│   │                                            │   │
│   │  Upload Certificate (Optional)             │   │
│   │  ┌──────────────────────────────────────┐ │   │
│   │  │ 📄 Choose file or drag & drop        │ │   │
│   │  └──────────────────────────────────────┘ │   │
│   │                                            │   │
│   │  🔗 Verify at qualitycheck.org            │   │
│   │                                            │   │
│   │           [Save Verification Details]      │   │
│   └────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

### 2. Verification Status Indicators

Enhanced badges showing verification completeness:

```text
States:
├── ⚪ Not Claimed - Gray checkbox
├── 🟡 Claimed (No Details) - Yellow "Needs Info" badge
├── 🟠 Claimed (Details Provided) - Orange "Pending Review" badge
├── 🟢 Verified - Green "Verified ✓" badge
└── 🔴 Rejected - Red "Rejected" badge with reason tooltip
```

---

## Implementation Plan

### Phase 1: Database Migration
1. Add new columns to `facility_accreditations` table
2. Update RLS policies for new columns
3. Create indexes for efficient querying

### Phase 2: Configuration & Types
1. Create `ACCREDITATION_VERIFICATION_CONFIG` constant
2. Update TypeScript types for new fields
3. Add validation schemas (Zod)

### Phase 3: UI Components
1. Create `AccreditationVerificationForm` component
2. Update `ProviderTrustForm` to use expandable verification cards
3. Add file upload handling per-accreditation
4. Add external verification link buttons

### Phase 4: Admin Enhancements
1. Update `ProviderDetailModal` to show verification details
2. Add one-click lookup links for admins
3. Show uploaded certificates inline
4. Add verification/rejection workflow with notes

---

## File Changes Summary

| File | Changes |
|------|---------|
| `supabase/migrations/` | New migration for schema changes |
| `src/components/trust/TrustBadge.tsx` | Add verification config export |
| `src/components/provider/ProviderTrustForm.tsx` | Replace simple checkboxes with expandable verification cards |
| `src/components/provider/AccreditationVerificationCard.tsx` | **New** - Individual accreditation verification form |
| `src/components/admin/providers/ProviderDetailModal.tsx` | Show verification details, lookup links |
| `src/integrations/supabase/types.ts` | Auto-updated after migration |

---

## Technical Considerations

### Backward Compatibility
- Existing accreditations without verification details remain valid
- New fields are nullable, won't break existing records
- Gradual adoption: providers can add details over time

### Storage
- Certificates uploaded to existing `facility-images` bucket
- Path: `{userId}/{facilityId}/accreditations/{type}-{timestamp}.{ext}`

### Validation
- Number formats validated per-accreditation type
- File type restrictions (PDF, JPG, PNG)
- Max file size: 10MB (consistent with existing uploads)

---

## Admin Workflow Enhancement

```text
Admin views accreditation claim:
│
├── See provider-submitted verification number
├── See uploaded certificate (preview/download)
├── One-click to open public lookup site
├── Compare submitted info with official records
│
└── Actions:
    ├── ✅ Verify - Marks as verified
    ├── ❌ Reject - Requires reason (shown to provider)
    └── 📝 Request More Info - Sends notification
```

This approach integrates verification data directly into the accreditation workflow without breaking existing functionality or requiring a separate documents management system for accreditations.
