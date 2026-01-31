
# Lead Qualification, Routing & Scoring System Cleanup

## Overview
This plan removes the complex lead qualification, routing, and scoring system since the new monetization model is simplified to:
1. **Direct Inquiry**: Seeker submits inquiry from facility profile → goes directly to that facility (no routing/scoring needed)
2. **Concierge Service**: Paid placement service for users who want help finding the right facility

---

## What Will Be Removed

### Backend (Edge Functions)

| Function | Purpose | Action |
|----------|---------|--------|
| `reroute-stale-leads` | Re-routes unactioned leads to other providers | **DELETE** |
| `send-followup-reminders` | 24/48/72h follow-up reminders based on lead status | **DELETE** |

### Frontend Components

| Component | Location | Action |
|-----------|----------|--------|
| `AdminLeadRouting.tsx` | `src/pages/admin/` | **DELETE** |
| `RoutingLogsTable.tsx` | `src/components/admin/` | **DELETE** |
| `LeadDeliveryHealthCheck.tsx` | `src/components/admin/` | **DELETE** |
| `LeadOverrideDialog.tsx` | `src/components/admin/` | **DELETE** |
| `LeadReassignDialog.tsx` | `src/components/admin/` | **DELETE** |
| `LeadScoreBadge.tsx` | `src/components/provider/leads/` | **DELETE** |
| `LeadConversionAnalytics.tsx` | `src/components/provider/leads/` | **DELETE** |

### Scoring System (Full Removal)

| File/Directory | Action |
|----------------|--------|
| `src/lib/scoring/` directory (6 files) | **DELETE** |
| `src/lib/leadScoring.ts` | **DELETE** |

---

## Files Requiring Updates

### 1. App.tsx
- Remove `AdminLeadRouting` lazy import
- Remove `/admin/lead-routing` route

### 2. Admin Sidebar (`AdminSidebar.tsx`)
- Remove "Lead Routing" nav item from Leads group
- Simplify Leads group to single item (no dropdown needed)

### 3. Admin Dashboard (`AdminDashboard.tsx`)
- Remove `LeadDeliveryHealthCheck` import and component
- Remove related stats fetching

### 4. Admin Leads Page (`AdminLeads.tsx`)
- Remove scoring badge display
- Remove `RoutingLogsTable` import and component
- Remove `LeadOverrideDialog` and `LeadReassignDialog`
- Remove qualification/routing filters and columns
- Simplify to show leads as direct inquiries

### 5. Provider Lead Detail Components
- `LeadDetailPanel.tsx`: Remove scoring badge and qualification status displays
- `LeadDetailDrawer.tsx`: Remove scoring components

### 6. Lead Profile Modal (`LeadProfileModal.tsx`)
- Remove scoring imports and displays

### 7. Provider Activity Timeline (`ProviderActivityTimeline.tsx`)
- Remove lead routing log fetching
- Simplify lead event types

### 8. Data Health Monitor (`DataHealthMonitor.tsx`)
- Remove `lead_routing_logs` table monitoring

### 9. Admin Prefetch (`adminPrefetch.ts`)
- Remove lead-routing page references

### 10. Admin Auth Hook (`useAdminAuth.ts`)
- Remove lead-routing permission mapping

### 11. Supabase Config (`config.toml`)
- Remove `reroute-stale-leads` entry
- Remove `send-followup-reminders` entry
- Remove `submit-direct-lead` entry (already deleted folder but config entry remains)

---

## Edge Function Simplification

### `submit-qualified-lead` → Rename to `submit-lead-inquiry`
Current: 2000+ lines with complex routing, scoring, provider eligibility checks
After: Simple direct submission to specified facility

**Simplified Logic:**
1. Validate required fields
2. Check for spam/duplicates
3. Insert lead record with `facility_id` from request
4. Send confirmation email to seeker
5. Send notification to facility
6. Return success

Remove:
- All scoring weight constants
- Provider eligibility checking
- Provider capacity tracking
- Auto-assignment logic
- Fairness scoring algorithms
- Plan tier priority logic

---

## Database Considerations

The `lead_routing_logs` table will become orphaned. This is acceptable as:
- Historical data preserved for analytics
- No new entries will be created
- Table can be archived/dropped later if needed

Fields that become unused on `leads` table:
- `qualified` - Will always be `true` for new leads (direct submissions)
- `qualification_reason` - No longer populated
- `assignment_status` - No longer used (direct assignment)
- `assignment_reason` - No longer used

---

## Summary of Deletions

```
Edge Functions to DELETE:
├── supabase/functions/reroute-stale-leads/
├── supabase/functions/send-followup-reminders/

Frontend Pages to DELETE:
├── src/pages/admin/AdminLeadRouting.tsx

Admin Components to DELETE:
├── src/components/admin/RoutingLogsTable.tsx
├── src/components/admin/LeadDeliveryHealthCheck.tsx
├── src/components/admin/LeadOverrideDialog.tsx
├── src/components/admin/LeadReassignDialog.tsx

Provider Components to DELETE:
├── src/components/provider/leads/LeadScoreBadge.tsx
├── src/components/provider/leads/LeadConversionAnalytics.tsx

Scoring Library to DELETE:
├── src/lib/scoring/ (entire directory)
│   ├── advancedScoring.ts
│   ├── baseScoring.ts
│   ├── facilityMatch.ts
│   ├── index.ts
│   ├── qualityMetrics.ts
│   └── types.ts
├── src/lib/leadScoring.ts
```

---

## Files to Update

1. **Routing/Navigation** (3 files)
   - `src/App.tsx`
   - `src/components/admin/AdminSidebar.tsx`
   - `src/lib/adminPrefetch.ts`

2. **Admin Panel** (4 files)
   - `src/pages/admin/AdminDashboard.tsx`
   - `src/pages/admin/AdminLeads.tsx`
   - `src/components/admin/DataHealthMonitor.tsx`
   - `src/components/admin/ProviderActivityTimeline.tsx`

3. **Provider Panel** (2 files)
   - `src/components/provider/leads/LeadDetailPanel.tsx`
   - `src/components/provider/leads/LeadDetailDrawer.tsx`

4. **Shared Components** (1 file)
   - `src/components/leads/LeadProfileModal.tsx`

5. **Hooks** (1 file)
   - `src/hooks/useAdminAuth.ts`

6. **Config** (1 file)
   - `supabase/config.toml`

7. **Edge Function** (1 file - major simplification)
   - `supabase/functions/submit-qualified-lead/index.ts`

---

## Post-Cleanup Result

After this cleanup:
- **Inquiries flow directly** from facility profile to that facility
- **No automated routing** between providers
- **No lead scoring** or qualification gates
- **Simplified admin view** showing all inquiries without routing complexity
- **Concierge service** remains for users wanting guided placement help
