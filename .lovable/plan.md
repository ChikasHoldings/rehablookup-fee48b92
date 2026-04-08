

# Admin System Full Rebuild & Hardening Plan

## Current State Assessment

**What exists:**
- 4 admin roles: Super Admin, Manager, Customer Rep, Advisor
- Role-based permission system with `admin_user_permissions` table
- Role-specific dashboards for each role
- Basic user creation dialog (email, name, role, permissions)
- Permission-gated sidebar, routing, and page access
- Placement Advisor workspace with case management, inbox, tours

**What's completely missing:**
1. **Employee vs Contractor/VA classification** — No `employment_type` field in DB or UI
2. **Contractor earnings/commission tracking** — No tables, no dashboard
3. **Escalation system** — No escalation tables, no Back Office view
4. **Impersonation system** — Zero implementation
5. **Back Office panel** for Super Admin — Does not exist
6. **Polished welcome email per role** — Current email is generic with temp password; no role explanation or onboarding guidance

**What's partially built:**
- Create user dialog lacks employment type, phone, and structured onboarding fields
- Advisor dashboard exists but has no earnings/commission view for contractors
- Customer Rep has no escalation capability
- Settings page is Super Admin only; no role-specific settings views

---

## Implementation Plan

### Phase 1: Database Schema Updates

**Migration 1 — Employment classification & escalations**

Add to `admin_user_profiles`:
- `employment_type` column: `enum ('employee', 'contractor', 'va')` — nullable for backward compat, default null
- `phone` column: text, nullable
- `hire_date` column: date, nullable
- `commission_rate` column: integer (percentage), nullable — only for contractor advisors

Create `admin_escalations` table:
- `id` uuid PK
- `created_by` uuid (FK to auth.users) — who escalated
- `assigned_to` uuid nullable — Super Admin/Manager who picks it up
- `subject` text
- `description` text
- `priority` enum ('low', 'medium', 'high', 'critical')
- `status` enum ('open', 'in_progress', 'resolved', 'closed')
- `related_type` text nullable — e.g. 'concierge_inquiry', 'support_ticket', 'lead'
- `related_id` uuid nullable — reference to the related entity
- `resolution_notes` text nullable
- `resolved_at` timestamptz nullable
- `created_at`, `updated_at`
- RLS: Admins can read all; creator can read own; assigned_to can update

Create `admin_impersonation_log` table:
- `id` uuid PK
- `admin_user_id` uuid — Super Admin performing impersonation
- `target_user_id` uuid — user being impersonated
- `target_role` text
- `started_at` timestamptz default now()
- `ended_at` timestamptz nullable
- RLS: Only Super Admins can read/insert

Create `advisor_earnings` table:
- `id` uuid PK
- `advisor_id` uuid (FK auth.users)
- `inquiry_id` uuid (FK concierge_inquiries)
- `placement_fee_cents` integer
- `commission_rate` integer — percentage at time of placement
- `commission_cents` integer — calculated amount
- `status` enum ('pending', 'approved', 'paid')
- `paid_at` timestamptz nullable
- `created_at` timestamptz default now()
- RLS: Advisor can read own; Super Admin/Manager can read all

---

### Phase 2: Enhanced User Creation Dialog

Rebuild `CreateAdminUserDialog.tsx` with 3-tab form:

**Tab 1 — Identity:**
- Full Name (split first/last)
- Email
- Phone number
- Role selector (unchanged)

**Tab 2 — Classification:**
- Employment Type selector (dynamic based on role):
  - Manager → always "Employee" (auto-set, read-only)
  - Advisor → "Employee" or "Contractor"
  - Customer Rep → "Employee" or "VA"
  - Super Admin → always "Employee"
- If Contractor: Commission Rate % field (default 10%)
- Hire/Start Date

**Tab 3 — Permissions** (existing, unchanged)

Update `create-admin-user` edge function to:
- Accept and store `employment_type`, `phone`, `commission_rate`, `hire_date`
- Send role-specific welcome email (Phase 5)

---

### Phase 3: Escalation System

**New components:**
- `src/components/admin/escalations/EscalationDialog.tsx` — Modal to create an escalation from any context (case detail, support ticket, etc.)
- `src/components/admin/escalations/EscalationsList.tsx` — Filterable list of escalations
- `src/pages/admin/AdminEscalations.tsx` — Full escalations page

**Integration points:**
- Add "Escalate" button to `ConciergeActionsTab` (for Advisors → escalates to Manager/Super Admin)
- Add "Escalate" button to `SupportTicketModal` (for Customer Reps)
- Sidebar: Show "Escalations" menu item for Manager and Super Admin roles
- Route: `/admin/escalations` gated by new `escalations` permission (granted to Manager + Super Admin)

**Escalation flow:**
1. Any staff member creates escalation → selects priority, writes description, links related entity
2. Escalation appears in Manager/Super Admin escalations queue
3. Manager/Super Admin can assign, respond, resolve, close
4. Resolution is logged; creator gets notification

---

### Phase 4: Super Admin Back Office

New page: `src/pages/admin/AdminBackOffice.tsx`

Sections:
- **Escalation Queue** — All open escalations with priority sorting
- **System Health** — Active users, error rates, pending items across all modules
- **Staff Activity** — Recent actions by all admin users (from audit log)
- **Impersonation Controls** — List of staff with "View As" buttons
- **Override Actions** — Direct case reassignment, forced status changes

Route: `/admin/back-office` — Super Admin only permission

Sidebar: Add "Back Office" item under Administration group, Super Admin only.

---

### Phase 5: Impersonation System

**How it works:**
- Super Admin clicks "View As [User]" from Back Office or Staff page
- System stores impersonation state in sessionStorage (NOT auth — no actual login swap)
- UI renders the target role's sidebar, dashboard, and permission set
- A persistent yellow banner shows "Viewing as [Name] (Advisor)" with an "Exit" button
- All actions during impersonation are logged to `admin_impersonation_log`
- Impersonation is read-only by default; no mutations allowed unless explicitly enabled

**Implementation:**
- New hook: `useImpersonation.ts` — manages impersonation state, overrides `useAdminAuth` permission/role returns
- `AdminShell.tsx` — renders impersonation banner when active
- `AdminSidebar.tsx` — uses impersonated role for menu filtering
- Dashboard page — renders impersonated role's dashboard component

---

### Phase 6: Advisor Earnings Dashboard

New component: `src/components/admin/dashboard/AdvisorEarningsCard.tsx`

Shows for contractor advisors only:
- Total earnings (all time)
- This month's earnings
- Pending commissions
- Paid commissions
- List of recent placements with commission amounts
- Commission rate display

Integrated into `AdvisorDashboard.tsx` — conditionally rendered when `employment_type === 'contractor'`.

Super Admin/Manager view: `PlacementRevenueDashboard.tsx` enhanced with per-advisor commission breakdown table.

---

### Phase 7: Role-Specific Welcome Emails

Update `create-admin-user` edge function email generation:

**Super Admin:** "You've been granted full platform access. You can manage all staff, settings, and system operations."

**Manager:** "You've been added as a Manager. You oversee platform operations, staff, and can manage providers, leads, and escalations."

**Placement Advisor (Employee):** "You've been added as a Placement Advisor. You'll manage placement cases, coordinate between seekers and providers, and handle the full placement workflow."

**Placement Advisor (Contractor):** Same as above + "As a contractor, your commission rate is X%. You'll be able to track your earnings and payouts from your dashboard."

**Customer Rep (Employee):** "You've been added as a Customer Rep. You'll handle support inquiries, moderate reviews, and assist users with platform questions."

**Customer Rep (VA):** Same as above + "As a virtual assistant, you have the same capabilities within your assigned scope."

All emails include: Login URL, role badge, permission summary, "Complete Setup" CTA.

---

### Phase 8: Final Audit & Hardening

- Verify all new routes added to `routePermissionMap` in `useAdminAuth.ts`
- Verify sidebar entries added with correct permission keys
- Verify new permissions added to `ADMIN_PERMISSIONS` and `ROLE_DEFAULTS`
- Ensure all new tables have RLS policies
- Ensure escalation notifications are created in `admin_user_notifications`
- Test that no role can access pages they shouldn't
- Zero TypeScript errors

---

## New Routes Summary

| Route | Permission | Roles |
|---|---|---|
| `/admin/escalations` | `escalations` | Super Admin, Manager |
| `/admin/back-office` | `back_office` | Super Admin only |

## New DB Tables

| Table | Purpose |
|---|---|
| `admin_escalations` | Cross-role escalation tracking |
| `admin_impersonation_log` | Audit trail for impersonation |
| `advisor_earnings` | Contractor commission tracking |

## New Permissions

| Key | Label | Default Roles |
|---|---|---|
| `escalations` | Escalations | Super Admin, Manager |
| `back_office` | Back Office | Super Admin |

## Files to Create/Modify

**New files (~8):**
- `src/pages/admin/AdminEscalations.tsx`
- `src/pages/admin/AdminBackOffice.tsx`
- `src/components/admin/escalations/EscalationDialog.tsx`
- `src/components/admin/escalations/EscalationsList.tsx`
- `src/components/admin/dashboard/AdvisorEarningsCard.tsx`
- `src/hooks/useImpersonation.ts`
- 2-3 DB migrations

**Modified files (~10):**
- `src/components/admin/CreateAdminUserDialog.tsx` — add classification fields
- `src/components/admin/AdminSidebar.tsx` — add new menu items
- `src/components/admin/AdminShell.tsx` — impersonation banner
- `src/hooks/useAdminAuth.ts` — new routes, impersonation integration
- `src/hooks/useAdminUserManagement.ts` — new permissions
- `src/components/admin/dashboard/AdvisorDashboard.tsx` — earnings card
- `src/components/admin/concierge/ConciergeActionsTab.tsx` — escalate button
- `supabase/functions/create-admin-user/index.ts` — classification + welcome emails
- `src/App.tsx` — new routes
- `src/pages/admin/AdminStaff.tsx` — show employment type column

