
# RehabLookup Placement System - Complete Audit Report

## Executive Summary

After deep inspection of the codebase, I've identified **critical violations** of the brokerage model that enable provider bypass, along with structural issues and missing components.

---

## 1. PLACEMENT INTAKE AUDIT

### Domestic Placement ($29 Client Fee)

| Component | Status | Finding |
|-----------|--------|---------|
| Intake Form | Implemented | `ConciergeIntake.tsx` - 6-step wizard with comprehensive fields |
| Payment Gate | **MISSING** | Concierge checkout creates session but does NOT require payment before case creation |
| Case Creation | Partial | Case created in `submit-concierge-intake` only AFTER payment verified |
| Payment Record | Implemented | `concierge_inquiries.payment_status`, `payment_amount_cents = 2900` |
| Idempotency | Implemented | Uses `idempotency_key` to prevent duplicates |

**Issue**: The domestic price ID is hardcoded (`price_1SnWYz9fxdThyiakSODGlML5`) but should be verified against Stripe dashboard.

### International Placement ($299 Client Fee)

| Component | Status | Finding |
|-----------|--------|---------|
| Intake Form | Implemented | `InternationalApplication.tsx` - 10-step wizard |
| Payment Gate | Implemented | `create-international-checkout` requires payment before case creation |
| Case Creation | Implemented | `submit-international-intake` creates case in `international_placement_cases` |
| Payment Record | Implemented | `international_payments` table tracks pending payments |
| Payment Verification | Implemented | Stripe session verification before case update |

**Fields Captured (Both):**
- Demographics (age, gender, location)
- Clinical info (substances, level of care, detox needed)
- Insurance/payment type
- Timeline/urgency
- Contact information
- HIPAA consent

---

## 2. PLACEMENT CASE MODEL AUDIT

### Domestic Cases (`concierge_inquiries`)

| Field | Present | Notes |
|-------|---------|-------|
| Budget/Insurance | Yes | `payment_type`, `insurance_carrier`, `budget_range` |
| Substance/Care | Yes | `primary_concern`, `level_of_care`, `co_occurring_concerns` |
| Urgency | Yes | `timeline_urgency` |
| Location | Yes | `preferred_state`, `preferred_city`, `desired_radius_miles` |
| Preferences | Yes | `amenity_preferences`, `faith_based_preference` |
| Notes | Yes | `notes`, `admin_notes` |
| Advisor | **MISSING** | No `assigned_advisor_id` field |
| Status | Yes | `status` field with pipeline values |
| Financials | Yes | `provider_fee_cents`, `provider_fee_status` |
| Provider Matches | Yes | `matched_facility_ids`, `placed_facility_id` |

**Status Pipeline:**
```
new → reviewing → matching → matched → introductions_sent → in_contact → placed → closed
```

### International Cases (`international_placement_cases`)

| Field | Present | Notes |
|-------|---------|-------|
| All Clinical Fields | Yes | Stored in `intake_data` JSON |
| Country | Yes | `client_country` |
| Advisor | Yes | `assigned_advisor_id` |
| Status | Yes | Different statuses including `admitted` |
| Facility Fee | Yes | `facility_fee_cents = 450000` ($4,500) |
| Refund Tracking | Yes | `refund_type`, `refunded_at`, `refunded_by` |
| Payment | Yes | `international_payment_id`, `stripe_payment_intent_id` |

**Gap Identified**: Domestic cases lack `assigned_advisor_id` while International has it.

---

## 3. PROVIDER PLACEMENT NETWORK AUDIT

### Current Provider Actions (CRITICAL VIOLATIONS)

| Feature | Status | Violation Level |
|---------|--------|-----------------|
| View Anonymized Cases | Implemented | OK |
| Accept/Decline Candidate | Implemented | OK |
| **Direct Messaging** | **IMPLEMENTED** | **CRITICAL** |
| **Tour Scheduling** | **IMPLEMENTED** | **CRITICAL** |
| View User Name | After PII Disclosure | OK (controlled) |
| View User Email/Phone | After PII Disclosure | OK (controlled) |

### CRITICAL VIOLATION #1: PlacementMessagesTab.tsx

```typescript
// Lines 62-91 - Provider can send messages directly to seekers
const sendMessageMutation = useMutation({
  mutationFn: async () => {
    const { error } = await supabase.from("concierge_messages").insert({
      thread_id: selectedThreadId,
      sender_id: session.session.user.id,
      sender_type: "provider",
      content: newMessage.trim(),
    });
  }
});
```

**This allows providers to bypass placement fees by communicating directly with seekers.**

### CRITICAL VIOLATION #2: PlacementToursTab.tsx

```typescript
// Lines 91-142 - Provider can confirm/propose tours directly
const respondMutation = useMutation({
  mutationFn: async () => {
    updates.status = "confirmed";
    updates.confirmed_datetime = dateTime.toISOString();
    
    const { error } = await supabase
      .from("concierge_tour_requests")
      .update(updates)
      .eq("id", selectedTour.id);
  }
});
```

**This enables direct provider-seeker interaction without admin oversight.**

### What Providers Currently See (Provider PlacementNetwork.tsx)

The provider dashboard has 5 tabs:
1. **Domestic** - Lists anonymized candidates with Accept/Decline buttons (OK)
2. **International** - Same as domestic for global clients (OK)
3. **Placed** - History of placements (OK)
4. **Profile** - Network settings (OK)
5. **Billing** - Payment methods and invoices (OK)

**However**, the index exports include messaging and tours that shouldn't exist:
```typescript
// src/components/provider/placement-network/index.ts
export { PlacementMessagesTab } from "./PlacementMessagesTab";
export { PlacementToursTab } from "./PlacementToursTab";
```

---

## 4. ADMIN & ADVISOR CONTROL AUDIT

### Current Admin Structure

| Page | Purpose | Status |
|------|---------|--------|
| `/admin/concierge` | Domestic Case Management | Implemented |
| `/admin/international` | International Case Management | Implemented (separate) |

**Issue**: Domestic and International are managed on SEPARATE pages instead of unified with tabs.

### Admin Concierge Page (AdminConcierge.tsx)

| Feature | Status |
|---------|--------|
| View all cases | Yes |
| Filter by status | Yes |
| Search by name/email/phone | Yes |
| Assign advisor | **NO** - Not in domestic |
| Invite providers | Yes (via ConciergeMatchingTab) |
| See provider responses | Yes (via ConciergeIntroductionsTab) |
| Add internal notes | Yes |
| Confirm admission | Yes (AdminConfirmPlacement) |
| Messages Tab | Yes - But labeled "Coord" |
| Tours Tab | **EXISTS** - Violates brokerage |

### Admin International Page (AdminInternational.tsx)

| Feature | Status |
|---------|--------|
| View all cases | Yes |
| Filter by status/urgency/budget/VIP | Yes |
| Assign advisor | Yes |
| Invite providers | Yes |
| See provider responses | Yes |
| Add internal notes | Yes |
| Confirm admission | Yes |
| Handle $299 refund/credit | Yes |
| Generate $4,500 invoice | Yes |

---

## 5. BILLING & PAYMENTS AUDIT

### Client Payment Flow

| Flow | Fee | Implementation | Status |
|------|-----|----------------|--------|
| Domestic Intake | $29 | `create-concierge-checkout` → Stripe | Implemented |
| International Intake | $299 | `create-international-checkout` → Stripe | Implemented |

### Facility Fee Flow

| Flow | Fee | Implementation | Status |
|------|-----|----------------|--------|
| Domestic Placement | $1,000 ($800 Pro) | `charge-placement-fee` | Implemented |
| International Placement | $4,500 | `manage-international-case` | Implemented |

### Invoice Tracking

**Domestic (`placement_invoices`):**
- Invoice created on admission confirmation
- Tracks: `amount_cents`, `status`, `stripe_invoice_id`
- Retry logic exists (`retry-failed-payments`)
- Reminder system exists (`send-payment-reminder`)

**International (`international_facility_invoices`):**
- Invoice created on admission confirmation
- Same structure as domestic
- Includes waive functionality

### Payment Status Tracking

| Status | Domestic | International |
|--------|----------|---------------|
| Pending | Yes | Yes |
| Paid | Yes | Yes |
| Failed | Yes | Yes |
| Overdue | Yes | Yes |
| Waived | Yes | Yes |

---

## 6. PORTAL SEPARATION AUDIT

### Route Protection (PublicRouteGuard.tsx)

```typescript
// Admin redirect
if (role === "admin") {
  return <Navigate to="/admin" replace />;
}

// Provider redirect
if (role === "provider") {
  if (PROVIDER_ALLOWED_ROUTES.some(route => currentPath.startsWith(route))) {
    return <>{children}</>;
  }
  return <Navigate to="/provider/dashboard" replace />;
}
```

**Status**: Implemented correctly - Admins and Providers are redirected from public routes.

### International Geo-Banner

The geo-banner implementation should be audited to ensure it's hidden on admin/provider routes. Based on memory notes, this is implemented.

---

## 7. CRITICAL ISSUES SUMMARY

### MUST FIX IMMEDIATELY

| Issue | Severity | Impact |
|-------|----------|--------|
| `PlacementMessagesTab` exists | **CRITICAL** | Providers can bypass fees via direct messaging |
| `PlacementToursTab` exists | **CRITICAL** | Providers can schedule direct contact |
| `concierge_threads` with facility access | **CRITICAL** | Database allows provider-seeker threads |
| `concierge_tour_requests` with provider actions | **CRITICAL** | Providers can confirm tours directly |

### STRUCTURAL ISSUES

| Issue | Severity | Impact |
|-------|----------|--------|
| Domestic cases missing `assigned_advisor_id` | HIGH | Cannot track advisor assignment for domestic |
| Concierge and International split into separate admin pages | MEDIUM | Should be unified with tabs |
| Provider Profile still shows "Commission" option | LOW | Commission model removed but UI still has it |

### MISSING FEATURES

| Feature | Severity | Notes |
|---------|----------|-------|
| Domestic advisor assignment | HIGH | International has it, domestic doesn't |
| Unified admin command center | MEDIUM | Currently split across pages |
| PII disclosure audit trail for domestic | MEDIUM | International tracks it, domestic doesn't explicitly |

---

## 8. IMPLEMENTATION PLAN

### Phase 1: Remove Provider Bypass Capabilities (URGENT)

1. **Delete PlacementMessagesTab.tsx**
   - Remove from `src/components/provider/placement-network/`
   - Remove export from `index.ts`
   - Remove any references in PlacementNetwork.tsx

2. **Delete PlacementToursTab.tsx**
   - Remove from `src/components/provider/placement-network/`
   - Remove export from `index.ts`
   - Remove any references in PlacementNetwork.tsx

3. **Lock down concierge_threads RLS**
   - Add policy: Providers cannot SELECT threads where `facility_id` = their facility
   - Only admins and seekers can access threads

4. **Lock down concierge_tour_requests RLS**
   - Providers should only VIEW tour requests (no UPDATE)
   - Only admins can confirm/modify tours

### Phase 2: Unify Admin Command Center

1. **Add Domestic/International tabs to single Admin Placement page**
   - Move AdminConcierge cases list to "Domestic" tab
   - Move AdminInternational cases list to "International" tab
   - Share provider network and invoices across both

2. **Add `assigned_advisor_id` to concierge_inquiries**
   ```sql
   ALTER TABLE concierge_inquiries 
   ADD COLUMN assigned_advisor_id UUID REFERENCES admin_user_profiles(user_id);
   ```

3. **Add advisor assignment UI to domestic cases**
   - Mirror the international case detail sheet's advisor dropdown

### Phase 3: Clean Up Legacy Code

1. **Remove commission option from provider profile**
   - Remove `SelectItem value="commission"` from PlacementNetwork.tsx line 611

2. **Add explicit PII disclosure tracking for domestic**
   - Add `admin_disclosed_pii_at` and `disclosed_by_admin_id` columns to `concierge_introductions` (already exists - just ensure it's used)

3. **Update terminology**
   - Admin "Messages" tab is correctly renamed to "Coord"
   - Verify all user-facing text follows "individuals and families" standard

### Phase 4: Verification & Testing

1. **Test provider cannot access messaging**
2. **Test provider cannot schedule tours**
3. **Test admin can confirm placement and invoice generates**
4. **Test $29 domestic and $299 international payments**
5. **Test $1,000 domestic and $4,500 international facility fees**

---

## 9. DATABASE TABLES REFERENCE

### Placement-Related Tables

| Table | Purpose | Status |
|-------|---------|--------|
| `concierge_inquiries` | Domestic cases | Active |
| `international_placement_cases` | International cases | Active |
| `concierge_introductions` | Provider-case matches | Active |
| `international_case_facility_matches` | Intl provider matches | Active |
| `placement_invoices` | Domestic facility billing | Active |
| `international_facility_invoices` | Intl facility billing | Active |
| `concierge_threads` | Messaging (REMOVE ACCESS) | **Needs RLS fix** |
| `concierge_messages` | Messages (REMOVE ACCESS) | **Needs RLS fix** |
| `concierge_tour_requests` | Tours (REMOVE PROVIDER WRITE) | **Needs RLS fix** |
| `concierge_case_events` | Audit trail | Active |
| `international_case_events` | Intl audit trail | Active |

---

## 10. FINAL CHECKLIST

### Before Go-Live

- [ ] Delete PlacementMessagesTab.tsx
- [ ] Delete PlacementToursTab.tsx
- [ ] Update concierge_threads RLS to block provider access
- [ ] Update concierge_tour_requests RLS to block provider writes
- [ ] Add assigned_advisor_id to concierge_inquiries
- [ ] Remove commission option from provider UI
- [ ] Test all payment flows
- [ ] Test admin confirmation workflow
- [ ] Test invoice generation

### Revenue Protection Verification

- [ ] $29 domestic client fee enforced
- [ ] $299 international client fee enforced
- [ ] $1,000 domestic facility fee generated on admission
- [ ] $4,500 international facility fee generated on admission
- [ ] No provider-seeker direct contact possible

---

## Summary

The Placement system has solid foundations but contains **critical security vulnerabilities** that allow providers to bypass placement fees through direct messaging and tour scheduling. These must be removed immediately to protect the brokerage model.

The recommended implementation order:
1. **Phase 1** - Remove bypass capabilities (1-2 hours)
2. **Phase 2** - Unify admin command center (2-3 hours)
3. **Phase 3** - Clean up legacy code (1 hour)
4. **Phase 4** - Verification (1 hour)

Total estimated effort: **5-7 hours**
