

# Placement System Transformation: Audit & Conversion Plan
## Converting from Marketplace to Brokerage Deal Desk

---

## Current State Audit

### Problems Identified

The current Placement system allows **direct provider-seeker interaction** which breaks the brokerage model:

| Feature | Location | Problem |
|---------|----------|---------|
| **Direct Messaging** | Provider: `PlacementMessagesTab.tsx` | Providers can message seekers directly |
| **Direct Messaging** | Seeker: `ConciergeMessaging.tsx` | Seekers can initiate threads with facilities |
| **Tour Scheduling** | Provider: `PlacementToursTab.tsx` | Providers manage tours directly |
| **Tour Requests** | Seeker: `TourRequestModal.tsx`, `PlacementTabs.tsx` | Seekers can request tours with facilities |
| **User Name Exposure** | `IntroductionCard.tsx` line 55 | Shows `inquiry?.user_name` to providers |
| **Facility Direct Access** | `PlacementMatchCard.tsx` | Seekers see facility names/contact info |
| **Confirm Placement** | `ProviderConfirmPlacementModal.tsx` | Providers can confirm placements directly |

### Current Flow (Problematic)

```text
Seeker submits intake
     ↓
Admin matches to facilities
     ↓
Provider sees: Name + Case Details
     ↓
Provider clicks "Interested"
     ↓
Provider & Seeker can MESSAGE DIRECTLY  ← Problem
     ↓
Provider & Seeker can SCHEDULE TOURS    ← Problem
     ↓
Provider confirms placement directly     ← Problem
```

---

## Target Architecture: Brokerage Deal Desk

### New Flow (Controlled)

```text
Seeker submits intake → Creates Placement Case
     ↓
Admin/Advisor reviews & matches
     ↓
Provider sees: ANONYMIZED CASE SUMMARY ONLY
  - Case #ABC123 (no name)
  - Level of care, budget, urgency, geography
  - Special requirements (anonymized)
     ↓
Provider can ONLY: Accept or Decline
     ↓
On Accept: RehabLookup takes over coordination
  - Admin contacts seeker
  - Admin coordinates calls
  - Admin manages medical info transfer
  - Admin handles travel/intake
     ↓
Admin confirms admission (both sides verified)
     ↓
Invoice generated → Placement complete
```

---

## Implementation Plan

### Phase 1: Remove Direct Contact from Provider Placement View

**1.1 Remove Messages Tab from Provider Placement**
- File: `src/pages/provider/PlacementNetwork.tsx`
- Remove the "messages" TabsTrigger and TabsContent (lines 488-494, 591-594)
- Remove `PlacementMessagesTab` import

**1.2 Remove Tours Tab from Provider Placement**
- File: `src/pages/provider/PlacementNetwork.tsx`
- Remove the "tours" TabsTrigger and TabsContent (lines 492-495, 596-599)
- Remove `PlacementToursTab` import

**1.3 Remove Provider Confirm Placement Button**
- File: `src/components/provider/placement-network/IntroductionCard.tsx`
- Remove the "Confirm Placement" button and modal
- Providers should NOT confirm placements - only Admin does

### Phase 2: Anonymize Case Data Shown to Providers

**2.1 Update IntroductionCard to Hide User Name**
- File: `src/components/provider/placement-network/IntroductionCard.tsx`
- Line 55: Change from `{inquiry?.user_name || ...}` to only show Case ID
- Always display: `Case #${inquiry?.id?.slice(0, 8).toUpperCase()}`

**2.2 Update International Candidate Cards**
- File: `src/components/provider/international/InternationalCandidatesTab.tsx`
- Ensure no PII is displayed
- Show only: Country, Budget Range, Urgency, Primary Concern, Preferences

**2.3 Simplify Provider Response Actions**
- Change from: "Interested", "Limited Availability", "Not Available"
- To: "Accept Candidate", "Decline Candidate"
- Remove notes field (all communication goes through Admin)

### Phase 3: Update Seeker Placement Hub

**3.1 Remove Direct Facility Messaging**
- File: `src/components/seeker/placement/PlacementTabs.tsx`
- Remove "Messages" tab for facility threads
- Keep ONLY "Advisor" messaging (seeker ↔ RehabLookup)

**3.2 Remove Tour Request Feature**
- File: `src/components/seeker/placement/PlacementTabs.tsx`
- Remove "Tours" tab entirely
- Tours will be coordinated by Admin, not self-serve

**3.3 Remove Direct Facility Actions from Match Cards**
- File: `src/components/seeker/placement/PlacementMatchCard.tsx`
- Remove "Request Tour" button
- Remove direct facility contact options
- Show only: "Your advisor will coordinate next steps"

### Phase 4: Centralize Control in Admin Panel

**4.1 Enhance Admin Case Management**
- File: `src/components/admin/ConciergeDetailSheet.tsx`
- Admin should be the ONLY one who can:
  - Send introductions to facilities
  - Coordinate calls between parties
  - Confirm placements
  - Generate invoices

**4.2 Add Admin-Controlled Disclosure**
- Create new admin action: "Disclose Patient Info to Facility"
- Only triggered after facility accepts AND Admin approves
- Logged in audit trail

### Phase 5: Database & Permission Changes

**5.1 Update concierge_introductions table**
- Add column: `admin_disclosed_pii_at` (timestamp, nullable)
- Add column: `disclosed_by_admin_id` (uuid, nullable)
- PII only shared when this is populated

**5.2 Restrict Direct Thread Creation**
- Update RLS policies on `concierge_threads`
- Prevent seekers from creating facility threads
- Only Admin can create seeker-facility threads

**5.3 Restrict Tour Request Creation**
- Update RLS or remove `concierge_tour_requests` from Placement flow
- Tours only exist in directory/self-serve context

---

## UI Changes Summary

### Provider Placement Dashboard (After)

| Tab | Status |
|-----|--------|
| Domestic Candidates | Keep (anonymized cases) |
| International Candidates | Keep (already anonymized) |
| ~~Messages~~ | **REMOVE** |
| ~~Tours~~ | **REMOVE** |
| Profile | Keep |
| Billing | Keep |
| Placed | Keep (history only) |

### Seeker Placement Hub (After)

| Tab | Status |
|-----|--------|
| Matches | Keep (show facility names, no direct contact) |
| ~~Tours~~ | **REMOVE** |
| ~~Messages (to facilities)~~ | **REMOVE** |
| Messages (to Advisor) | **KEEP** - This is the ONLY communication channel |

### Provider Case Card (After)

```text
┌────────────────────────────────────────┐
│ Case #ABC123XY                         │
│ ──────────────────────────────────────│
│ Level of Care: Residential Inpatient  │
│ Payment: Private Pay                   │
│ Budget: $25K-$50K/month               │
│ Urgency: Within 1 Week                │
│ Location: California preferred         │
│ ──────────────────────────────────────│
│ [Accept Candidate]  [Decline]          │
└────────────────────────────────────────┘
```

---

## Technical Implementation Order

1. **Provider Side First** (most critical for business protection)
   - Remove Messages/Tours tabs
   - Anonymize case cards
   - Remove confirm placement from provider

2. **Seeker Side Second**
   - Remove facility messaging
   - Remove tour requests
   - Keep advisor-only communication

3. **Admin Enhancements Third**
   - Add PII disclosure workflow
   - Enhance case coordination tools

4. **Database/RLS Last**
   - Add disclosure tracking columns
   - Update RLS policies

---

## What Stays the Same

- **Directory side** (search, profiles, self-serve listings): Tours, messages, and direct contact remain for the self-serve marketplace
- **International intake wizard**: No changes
- **Domestic intake flow**: No changes
- **Admin case management**: Enhanced, not replaced
- **Billing/invoicing**: No changes to fee structure

---

## Expected Outcome

After implementation, the Placement system will function as a true **brokerage deal desk**:

- RehabLookup controls all patient-provider introductions
- Providers see only what they need to make accept/decline decisions
- All coordination flows through Admin/Advisor
- Placement fees are protected because providers cannot bypass the platform
- Clear audit trail of all disclosures and communications

