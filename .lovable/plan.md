

# Lead System Audit & Cleanup Plan

## Current Monetization Model (Confirmed Working)

```text
User submits inquiry on facility page
         |
         v
Lead created with:
  - facility_id: [target facility]
  - status: "new"
  - redistribution_status: "exclusive"
  - exclusive_until: +24 hours
         |
         v
Provider has 24hr exclusive window to unlock ($39-$49)
         |
         v
If NOT unlocked after 24hrs:
  - Lead redistributed to 2-3 nearby facilities
  - redistribution_status: "extended"
  - Price drops to $15
         |
         v
First facility to unlock wins exclusively
```

---

## Legacy Code to Remove

### 1. Database Columns (Deprecated)

These columns in the `leads` table are no longer used:

| Column | Purpose (Old) | Replacement |
|--------|---------------|-------------|
| `qualified` | Boolean qualification flag | Removed - all leads go to facility |
| `qualification_reason` | Why lead was (un)qualified | Removed |
| `assignment_status` | "assigned", "pending", "unassigned" | `redistribution_status` is now the only status |
| `assignment_reason` | Routing decision explanation | Removed |
| `routing_order` | Priority for multi-provider routing | Removed |
| `shared_with` | Array of facility IDs for shared leads | `lead_distributions` table |
| `exclusivity` | Old exclusivity tracking | `redistribution_status` |

### 2. Database Table

- **`lead_routing_logs`** - Tracked old routing decisions, no longer needed

### 3. Platform Settings

- **`inapp_unassigned_leads`** - Remove this setting (no unassigned concept)

---

## Files to Update

### A. Edge Functions

**1. `submit-qualified-lead/index.ts`**
- Remove `isDirectInquiry` logic and "unassigned" status
- All leads must have a `facility_id` (reject submissions without one)
- Remove direct inquiry email template
- Simplify to only handle facility-specific submissions

**2. `supabase/config.toml`**
- Remove `track-request-help` function reference (already commented/disabled)

### B. Admin UI Components

**1. `src/pages/admin/AdminLeads.tsx`**
- Remove "Unassigned" filter button
- Remove `unassignedFilter` state and logic
- Remove URL param handling for `?unassigned=true`

**2. `src/pages/admin/AdminAnalytics.tsx`**
- Remove qualification rate metrics
- Remove assignment success rate metrics
- Remove assignment reasons breakdown
- Remove qualification reasons breakdown
- Keep redistribution analytics (those are still valid)

**3. `src/pages/admin/AdminSettings.tsx`**
- Remove "Unassigned Leads" notification toggle

**4. `src/components/admin/AdminHeader.tsx`**
- Remove unassigned leads notifications query
- Remove unassigned leads count from notifications
- Remove "New Unassigned Lead" toast
- Remove "View Unassigned Leads" command item

**5. `src/components/admin/dashboard/SuperAdminDashboard.tsx`**
- Keep redistribution stats (exclusive/extended/expired)
- Remove any unassigned lead references

**6. `src/components/leads/LeadProfileModal.tsx`**
- Remove "Unassigned" badge display
- Remove "Leads are automatically assigned" message

### C. Provider Components

**1. `src/components/provider/leads/LeadDetailPanel.tsx`**
- Remove `assignment_status` display
- Remove `qualification_reason` display
- Keep redistribution-related displays

### D. Hooks & Utilities

**1. `src/hooks/useAdminUserManagement.ts`**
- Remove `lead_routing` permission from `ADMIN_PERMISSIONS`
- Remove `lead_routing` from all `ROLE_DEFAULTS`

**2. `src/hooks/useCentralizedLeadAnalytics.ts`**
- Remove qualification/assignment analytics

### E. Delete Edge Functions

**1. Remove or archive:**
- `supabase/functions/track-request-help/` (if still exists - appears disabled)

---

## Database Migration

Create migration to:

1. **Clean up platform_settings:**
```sql
DELETE FROM public.platform_settings 
WHERE setting_key = 'inapp_unassigned_leads';
```

2. **Note:** Keep the columns in the `leads` table for now (historical data) but stop using them in new code. A future migration can drop them after confirming no issues.

---

## Validation After Cleanup

1. Submit inquiry from facility profile page
   - Lead should be created with `facility_id` set
   - `redistribution_status` = "exclusive"
   - Provider receives notification

2. Admin dashboard should NOT show:
   - Unassigned leads count
   - Qualification rates
   - Assignment reasons

3. Admin leads page should NOT have:
   - "Unassigned" filter button
   - `?unassigned=true` URL param handling

4. Lead profile modal should NOT show:
   - "Unassigned" badge
   - Assignment status field

---

## Files Summary

| File | Action |
|------|--------|
| `supabase/functions/submit-qualified-lead/index.ts` | Remove direct inquiry logic |
| `supabase/config.toml` | Remove track-request-help entry |
| `src/pages/admin/AdminLeads.tsx` | Remove unassigned filter |
| `src/pages/admin/AdminAnalytics.tsx` | Remove qualification metrics |
| `src/pages/admin/AdminSettings.tsx` | Remove unassigned notification setting |
| `src/components/admin/AdminHeader.tsx` | Remove unassigned notifications |
| `src/components/leads/LeadProfileModal.tsx` | Remove unassigned badge |
| `src/components/provider/leads/LeadDetailPanel.tsx` | Remove assignment/qualification displays |
| `src/hooks/useAdminUserManagement.ts` | Remove lead_routing permission |

---

## What to KEEP

The redistribution system is still valid and should remain:

- `redistribution_status` column (exclusive, extended, expired)
- `exclusive_until` and `extended_until` columns
- `original_facility_id` column
- `lead_distributions` table
- `process-lead-redistribution` edge function
- `send-unlock-reminders` edge function
- Redistribution analytics in admin dashboard

