# RehabLookup Live Operations Readiness Runbook

**Production Deployment:** `357ccbc9` on main  
**Vercel:** READY (rehablookup.com)  
**Supabase Edge Functions:** All ACTIVE  

This runbook guides you through real-account QA to validate RehabLookup is production-ready. **This is owner-only work** — you need browser access, real email/SMS infrastructure, and monitoring capability.

---

## Section 1: Admin/Staff Account Cleanup

### 1.1 Review Active Admin Accounts

```sql
-- Run this on Supabase SQL Editor (project mldbxpntzcjalgjmwnqa)

-- 1. All admin/advisor accounts
SELECT DISTINCT
  u.id,
  u.email,
  ap.admin_role,
  ur.role as user_roles_role,
  ap.first_name,
  ap.last_name
FROM auth.users u
LEFT JOIN admin_user_profiles ap ON u.id = ap.user_id
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE ap.id IS NOT NULL OR ur.role = 'admin'
ORDER BY u.created_at DESC;

-- 2. Orphaned profiles (no auth.users row) - THESE MUST BE CLEANED UP
SELECT 
  ap.id,
  ap.user_id,
  ap.admin_role,
  ap.first_name,
  ap.last_name,
  ap.created_at
FROM admin_user_profiles ap
WHERE ap.user_id NOT IN (SELECT id FROM auth.users)
ORDER BY ap.created_at DESC;

-- 3. Count of active advisors with valid auth accounts
SELECT COUNT(*) as active_advisor_count
FROM admin_user_profiles ap
WHERE ap.user_id IN (SELECT id FROM auth.users)
  AND ap.admin_role = 'advisor';
```

### 1.2 Address Orphaned Profiles

Known orphaned profile: **Messia Oyowe** (likely test/stale)

**Decision:** Is this a real staff member who should be re-invited, or stale test data?

- **If real staff:** Delete the orphaned profile (lines below), then re-invite from Supabase Auth panel
- **If stale:** Delete the orphaned profile

```sql
-- DELETE orphaned profile (replace UUID with actual orphaned ap.id)
DELETE FROM admin_user_profiles WHERE id = 'UUID_FROM_QUERY_ABOVE';
```

### 1.3 Verify Real Advisor Account

Pick an active advisor and test:

1. **Log in:** Go to https://www.rehablookup.com/login with their email/password
2. **Admin panel loads:** Should see concierge dashboard, support inbox, etc.
3. **Check user_roles:** Run in SQL Editor:
   ```sql
   SELECT role FROM user_roles WHERE user_id = 'ADVISOR_USER_ID' AND role = 'admin';
   ```
   Expected: Single `admin` row

4. **Send test advisor message:** From admin panel, compose a concierge message (if UI exists for advisors to send direct messages)

### 1.4 Checklist

- [ ] Orphaned profiles reviewed
- [ ] Stale profiles deleted (Messia Oyowe or others)
- [ ] Real advisor account logs in
- [ ] Advisor has `user_roles 'admin'` row
- [ ] Advisor can access intended pages
- [ ] Advisor message flow works (if applicable)

---

## Section 2: Real Email/SMS Delivery QA

### 2.1 Send Test Support Alert Email

```bash
# From Supabase Functions dashboard, invoke send-support-request with valid seeker token

# 1. Get a real seeker JWT (via browser dev console after login)
# Or use service-role key for full auth

# 2. Trigger a support ticket creation (browser or API call):
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-support-request \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Test support message",
    "subject": "Test Subject",
    "email": "test@example.com",
    "name": "Test Seeker"
  }'
```

### 2.2 Check Resend Delivery

1. **Admin email inbox** (placement@rehablookup.com): Should receive support alert within 30 seconds
2. **Verify content:**
   - Sender/from name is correct
   - Subject line is clear
   - No internal notes or unauthorized PHI
   - Deep link to support page works

### 2.3 Send Test Concierge Message

From Supabase, directly insert a test concierge message or trigger via admin panel:

```sql
-- Insert a test message (replace IDs with real values)
INSERT INTO concierge_messages (
  thread_id,
  sender_id,
  sender_type,
  body,
  is_internal
) VALUES (
  'TEST_THREAD_UUID',
  'ADMIN_USER_ID',
  'advisor',
  'Test message content',
  FALSE
);
```

Then invoke send-message-notifications:

```bash
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "TEST_THREAD_UUID",
    "notificationType": "message_received"
  }'
```

Check:
- [ ] Email arrives within 30s
- [ ] No PHI leak (internal notes not exposed)
- [ ] Deep link to `/account/concierge` works

### 2.4 Test SMS Delivery

Create a test tour or concierge flow that should trigger SMS (if SMS is wired up):

```bash
# Send test SMS via send-tour-notifications
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-tour-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "tourId": "TEST_TOUR_UUID",
    "type": "tour_proposed"
  }'
```

Check:
- [ ] SMS arrives within 60s
- [ ] SMS text is concise and does not include seeker phone
- [ ] No retry duplication (wait 2 min, trigger again, should see same SMS once)

### 2.5 Test Email Retry Idempotency

Trigger the same email endpoint twice (same data, within 5 seconds):

```bash
# First call
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "threadId": "SAME_ID", "notificationType": "message_received" }'

sleep 2

# Second call (same data)
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "threadId": "SAME_ID", "notificationType": "message_received" }'
```

Check:
- [ ] First email received
- [ ] Second call returns `{ "deduplicated": true }` (no second email)
- [ ] Recipient's inbox has **only 1 email** (no duplicate)

### 2.6 Checklist

- [ ] Support alert email arrives (correct sender, subject, no PHI)
- [ ] Concierge message email arrives (deep link works)
- [ ] SMS arrives (if configured; text concise, no seeker phone in facility SMS)
- [ ] Email retry deduplicates (idempotency works)
- [ ] SMS retry does not duplicate
- [ ] Failed email / SMS enters DLQ (check Supabase logs if applicable)

---

## Section 3: Authenticated Browser QA

### 3.1 Seeker Browser QA

Use real seeker account (or create test seeker):

1. **Login**
   - [ ] Go to https://www.rehablookup.com/login
   - [ ] Log in with seeker email/password
   - [ ] Dashboard loads

2. **Support Page (`/account/support`)**
   - [ ] Page loads without errors
   - [ ] Can see existing tickets or "No tickets" message
   - [ ] "Create ticket" button is visible

3. **Create Support Ticket**
   - [ ] Click "Create ticket"
   - [ ] Fill form: subject, message, attachment (if supported)
   - [ ] Submit
   - [ ] Confirmation shown ("Ticket created")
   - [ ] Ticket appears in list

4. **Reply to Ticket**
   - [ ] Click existing ticket
   - [ ] Add reply message
   - [ ] Submit
   - [ ] Reply appears in thread

5. **Reopen Closed Ticket**
   - [ ] If ticket is closed, "Reopen" button visible
   - [ ] Click and confirm
   - [ ] Ticket status changes to "Open"

6. **Support Notification Deep Link**
   - [ ] Go to `/account/notifications` or check notification center
   - [ ] Click support ticket notification
   - [ ] Should deep-link to `/account/support` or specific ticket

7. **Concierge Page (`/account/concierge`)**
   - [ ] Page loads
   - [ ] If active concierge case exists, options are shown
   - [ ] Can confirm/reject recommendations (if applicable)

8. **Concierge Notification Deep Link**
   - [ ] If concierge message exists, click notification
   - [ ] Should deep-link to `/account/concierge`

9. **Security Checks**
   - [ ] Cannot see provider/admin notes (403 or hidden)
   - [ ] Cannot access `/admin/*` routes (redirected)
   - [ ] Cannot access other seekers' data

### 3.2 Provider Browser QA

Use real provider account or create test provider:

1. **Login & Provider Pages**
   - [ ] Log in to provider account
   - [ ] Provider dashboard loads
   - [ ] Can see facility info

2. **Provider Support**
   - [ ] Go to `/provider/support` (if exists) or support inbox
   - [ ] Can create support ticket
   - [ ] Can reply to tickets
   - [ ] Cannot see seeker-only tickets

3. **Facility Team Sharing**
   - [ ] If facility has team members, invite one and verify they can see shared tickets

4. **Permissions Check**
   - [ ] Cannot see client-only support tickets (403 or filtered)
   - [ ] Cannot see admin internal notes
   - [ ] Cannot access `/admin/*` routes

5. **Notification Deep Links**
   - [ ] Provider notifications link to correct pages (`/provider/inquiries`, etc.)

### 3.3 Admin/Advisor Browser QA

Use admin or advisor account:

1. **Admin Panel Login**
   - [ ] Log in with admin/advisor credentials
   - [ ] Admin panel loads (concierge dashboard, support inbox, etc.)
   - [ ] No redirect loops or blank pages

2. **Support Inbox**
   - [ ] Can see all support tickets
   - [ ] Can filter by status
   - [ ] Can add internal notes

3. **Internal Notes**
   - [ ] Create internal note on a support ticket
   - [ ] Switch to seeker account
   - [ ] Seeker CANNOT see internal note (403 or hidden)

4. **Resolve/Reopen Ticket**
   - [ ] Can mark ticket as resolved
   - [ ] Can reopen resolved ticket
   - [ ] Status updates correctly

5. **Advisor Message (if applicable)**
   - [ ] Can send message to seeker from concierge panel
   - [ ] Seeker receives message
   - [ ] Message is marked from "Advisor"

6. **Concierge Pages**
   - [ ] Can access concierge dashboard
   - [ ] Can see case list, filtering, etc.
   - [ ] No redirect loops

### 3.4 Checklist

- [ ] Seeker: login, support create/reply/reopen, concierge page, deep links work
- [ ] Seeker: cannot see provider/admin data
- [ ] Provider: login, support, facility team sharing, cannot see client-only data
- [ ] Admin: login, support inbox, internal notes NOT visible to seeker, resolve/reopen
- [ ] Advisor: can send messages, concierge pages accessible
- [ ] No blank pages or redirect loops for any role

---

## Section 4: No-Auth Security Checks

**From your local machine or external network**, test that sensitive endpoints reject unauthenticated calls.

### 4.1 Test send-message-notifications

```bash
# No auth — should return 401
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Content-Type: application/json" \
  -d '{ "threadId": "fake", "notificationType": "message_received" }'

# Expected: 401 Unauthorized
```

### 4.2 Test send-concierge-notifications

```bash
# No auth — should return 401
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-concierge-notifications \
  -H "Content-Type: application/json" \
  -d '{ "inquiryId": "fake", "type": "seeker_confirmed" }'

# Expected: 401 Unauthorized
```

### 4.3 Test send-tour-notifications

```bash
# No auth — should return 401
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-tour-notifications \
  -H "Content-Type: application/json" \
  -d '{ "tourId": "fake", "type": "tour_proposed" }'

# Expected: 401 Unauthorized
```

### 4.4 Test auto-decline-stale-introductions (Cron)

```bash
# No cron secret — should return 403
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/auto-decline-stale-introductions \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 403 Forbidden or similar

# With valid X-Cron-Secret (only known internally) — should work
# This is internal-only; don't test from external network
```

### 4.5 Test Legitimate Service-Role Call

```bash
# Valid service-role bearer — should work
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "threadId": "valid-id", "notificationType": "message_received" }'

# Expected: 200 OK or specific error (missing required data, not "unauthorized")
```

### 4.6 Checklist

- [ ] No-auth call to send-message-notifications → 401
- [ ] No-auth call to send-concierge-notifications → 401
- [ ] No-auth call to send-tour-notifications → 401
- [ ] No-auth call to auto-decline-stale-introductions → 403/401
- [ ] Valid service-role call → 200 (or specific error, not auth)

---

## Section 5: First Real Provider Onboarding Validation

Onboard 1–3 real or controlled test providers.

### 5.1 Claim a Facility

1. **Go to Provider Signup**
   - [ ] Visit https://www.rehablookup.com/provider/claim or signup flow
   - [ ] Enter facility details (name, phone, address)
   - [ ] Select "Free" or "Pro" plan

2. **Verify Email**
   - [ ] Check provider email for verification link
   - [ ] Click link
   - [ ] Email verified indicator shows

3. **Complete Profile**
   - [ ] Fill facility profile (services, specialties, insurance, etc.)
   - [ ] Upload facility image (if applicable)
   - [ ] Save profile

### 5.2 Test Provider Eligibility Logic

1. **Free Provider**
   - [ ] Create test seeker inquiry to this facility
   - [ ] Should **route to concierge** (not direct to free provider)

2. **Pro Provider** (if applicable)
   - [ ] Upgrade to Pro tier
   - [ ] Create test seeker inquiry
   - [ ] Should **route directly to provider** (not concierge)

### 5.3 Test Provider Support

1. **Create Support Ticket**
   - [ ] From provider account, create support ticket
   - [ ] Should arrive in admin support inbox

2. **Reply to Ticket**
   - [ ] Admin replies
   - [ ] Provider receives email reply notification
   - [ ] Provider can see reply in their support page

### 5.4 Test Provider Notifications

1. **Lead Notification** (if applicable)
   - [ ] A lead/inquiry arrives
   - [ ] Provider receives in-app notification
   - [ ] Provider receives email
   - [ ] Deep link works

2. **Check Notification Content**
   - [ ] No seeker internal notes
   - [ ] Contact info is appropriate for tier (Pro can see phone, Free→concierge)

### 5.5 Test Provider Data Access

1. **Can provider see unauthorized seeker PHI?**
   - [ ] Free provider cannot see seeker phone/email directly (routed via concierge)
   - [ ] Pro provider can see inquiries they own
   - [ ] Provider cannot see other facilities' seekers
   - [ ] Provider cannot see admin notes

### 5.6 Checklist

- [ ] Provider signup/claim works
- [ ] Facility profile complete
- [ ] Free provider leads route to concierge
- [ ] Pro provider leads route directly
- [ ] Provider support create/reply works
- [ ] Provider notifications arrive
- [ ] Deep links work
- [ ] Provider cannot access unauthorized data

---

## Section 6: First Real Seeker Flow Validation

Submit 2–3 controlled real seeker flows end-to-end.

### 6.1 Seeker Flow A: Request Info (Public)

1. **Seeker submits request info form**
   - [ ] Go to facility profile page
   - [ ] Fill "Request Information" form
   - [ ] Submit

2. **Confirmation**
   - [ ] Seeker sees confirmation page
   - [ ] Seeker receives confirmation email

3. **Provider/Admin Notification**
   - [ ] If Pro facility: provider receives notification + email
   - [ ] If Free facility: admin/concierge receives notification + email

4. **Check for Duplication**
   - [ ] Refresh form, submit same data again
   - [ ] Should NOT create duplicate inquiry/lead

5. **Seeker Sees Status**
   - [ ] Seeker logs in to `/account/leads` or `/account/inquiries`
   - [ ] Can see inquiry status

### 6.2 Seeker Flow B: Support Ticket

1. **Create Support Ticket** (as in Section 3.1)
2. **Admin Replies**
3. **Seeker Sees Reply**
4. **Seeker Replies**
5. **Admin Notification**
   - [ ] Admin receives notification of seeker reply

### 6.3 Seeker Flow C: Concierge/Advisor Path

1. **Concierge Intake**
   - [ ] Seeker fills concierge intake form (if applicable)
   - [ ] Submission succeeds

2. **Advisor Receives Intake**
   - [ ] Admin/advisor sees new intake notification
   - [ ] Email arrives

3. **Advisor Sends Message**
   - [ ] Advisor sends message to seeker
   - [ ] Seeker receives message notification + email

4. **Seeker Reads Message**
   - [ ] Seeker logs in to `/account/concierge`
   - [ ] Can see message thread
   - [ ] Can reply

### 6.4 Privacy/Security Checks

1. **Check Confirmation Email**
   - [ ] Seeker email: no internal notes, no admin-only data
   - [ ] Subject/sender are correct

2. **Check Notification Routing**
   - [ ] Seeker can see only own inquiries
   - [ ] Provider can see only own facilities' inquiries
   - [ ] Admin can see all

3. **Check for PHI Leaks**
   - [ ] Facility SMS does NOT include seeker phone
   - [ ] Admin emails have clear sender
   - [ ] No cross-tenant data visible

### 6.5 Checklist

- [ ] Public request info → seeker confirms, provider/admin notified
- [ ] No duplicate inquiries on retry
- [ ] Support ticket create/reply works end-to-end
- [ ] Concierge intake → advisor receives → advisor sends message → seeker receives
- [ ] Seeker sees correct status at each step
- [ ] Admin can track everything
- [ ] No PHI/coordination leak
- [ ] No duplicate emails/SMS on retry

---

## Section 7: Monitoring Window

**After completing Sections 1–6, monitor for 48–72 hours.**

### 7.1 Monitor Vercel Logs

1. Go to https://vercel.com/teams/ChikasHoldings/dashboard
2. Select rehablookup project
3. Go to **Logs** tab
4. Watch for runtime errors, crashes, blank pages

```
Alert on:
- ✗ 500 Internal Server Error
- ✗ Blank page responses (empty body)
- ✗ Unhandled promise rejections
```

### 7.2 Monitor Supabase Edge Function Logs

1. Go to Supabase dashboard: https://app.supabase.com/project/mldbxpntzcjalgjmwnqa
2. Go to **Edge Functions** tab
3. Click each function (send-message-notifications, send-concierge-notifications, send-tour-notifications, auto-decline-stale-introductions)
4. Watch **Invocations** tab for errors

```
Alert on:
- ✗ 401/403 spikes (auth failures)
- ✗ 500 errors
- ✗ Long execution times (>30s)
```

### 7.3 Monitor Postgres Logs

```sql
-- Run this periodically in SQL Editor to check for RLS denials or crashes

-- RLS denials (recent)
SELECT 
  count(*) as denial_count,
  MAX(timestamp) as last_denial
FROM postgres_logs
WHERE message LIKE '%policy%' 
  AND timestamp > NOW() - INTERVAL '1 hour';

-- Errors
SELECT 
  COUNT(*) as error_count,
  MAX(timestamp) as last_error
FROM postgres_logs
WHERE level = 'ERROR'
  AND timestamp > NOW() - INTERVAL '1 hour';
```

### 7.4 Monitor Email/SMS Delivery

1. Check **email_tracking_events** for failed sends:
   ```sql
   SELECT 
     email_type, 
     status, 
     COUNT(*) as count
   FROM email_tracking_events
   WHERE created_at > NOW() - INTERVAL '24 hours'
   GROUP BY email_type, status;
   ```

2. Check Twilio logs (if SMS wired up):
   - https://www.twilio.com/console/sms/logs

3. Check Resend logs (if integrated):
   - https://resend.com/ → dashboard → emails

### 7.5 Sample Monitoring Checklist (48h)

- [ ] Vercel logs: no 500 errors
- [ ] Edge function logs: no auth failures, no 500s
- [ ] Postgres: no RLS denial spikes
- [ ] Email delivery: <5% failure rate
- [ ] SMS delivery: <5% failure rate
- [ ] Support tickets: all created/replied successfully
- [ ] Concierge messages: all delivered, no duplicates
- [ ] Lead routing: correct tier logic
- [ ] Deep links: all working
- [ ] No blank pages or redirect loops

---

## Section 8: Patch Criteria

**Only patch for critical production issues discovered during QA:**

✅ **Patch if:**
- Login/account access failure (blocks users)
- Lead lost or misrouted (affects business)
- Concierge case stuck in wrong status
- Support ticket failed to create/deliver
- Message/notification spoofing or wrong recipient
- Email/SMS exposes PHI (seeker phone in facility SMS, etc.)
- False success on important user action (says "sent" but didn't)
- RLS/security leak (unauthorized data access)
- Production crash or blank page
- Payment/Pro eligibility broken

❌ **Do NOT patch for:**
- Copy/wording changes
- UI refinements
- Performance improvements (unless critical crash)
- Non-blocking warnings in logs
- Unrelated hardening passes
- "Should we also fix X?" scope creep

---

## Section 9: Final Live Operations Report

After completing all sections, compile this report:

### 9.1 Executive Verdict

**LIVE OPS READY** / **PARTIAL (with workarounds)** / **BLOCKED (critical issue found)**

### 9.2 Section Summaries

1. **Admin/Staff Cleanup:** [PASS/FAIL]
   - Orphaned profiles cleaned: YES/NO
   - Active advisors count: X
   - Real advisor can log in: YES/NO

2. **Email/SMS Delivery:** [PASS/FAIL]
   - Support alert: delivered in Xs
   - Concierge message: delivered, no PHI
   - SMS (if configured): no duplicates on retry
   - Idempotency test: passed

3. **Seeker Browser:** [PASS/FAIL]
   - Login: works
   - Support create/reply: works
   - Concierge page: accessible
   - Deep links: all work
   - Privacy: cannot see admin data

4. **Provider Browser:** [PASS/FAIL]
   - Login: works
   - Support: create/reply
   - Facility team: can share tickets
   - Privacy: cannot see unauthorized data

5. **Admin/Advisor Browser:** [PASS/FAIL]
   - Login: works
   - Support inbox: loads, can reply
   - Internal notes: seeker cannot see
   - Advisor messages: send/receive works

6. **No-Auth Security:** [PASS/FAIL]
   - send-message-notifications: 401
   - send-concierge-notifications: 401
   - send-tour-notifications: 401
   - auto-decline-stale-introductions: 403/401
   - Service-role calls: work

7. **Provider Onboarding:** [PASS/FAIL]
   - Claim works: YES/NO
   - Free→concierge routing: YES/NO
   - Pro→direct routing: YES/NO
   - Support works: YES/NO
   - Deep links work: YES/NO

8. **Seeker Flows:** [PASS/FAIL]
   - Request info: creates inquiry, no duplicates
   - Confirmation: seeker + provider/admin get email
   - Support ticket: create/reply end-to-end
   - Concierge: intake → advisor reply → seeker reply
   - No PHI leaks: YES/NO

9. **Monitoring (48–72h):** [PASS/FAIL]
   - Vercel errors: NONE / [list]
   - Edge function errors: NONE / [list]
   - Postgres errors: NONE / [list]
   - Email delivery: X% success rate
   - SMS delivery: X% success rate

10. **Issues Found:** [List any]
    - Issue 1: description, severity
    - Issue 2: description, severity

11. **Fixes Applied:** [List any patches deployed]
    - Fix 1: PR/commit, deployed when

12. **Remaining Owner-Only Tasks:**
    - [ ] Clean up test data
    - [ ] Set up monitoring dashboards
    - [ ] Brief support team on new workflows
    - [ ] Enable production marketing campaigns

13. **Final Launch Confidence:**

**0-20%:** Critical issues, not launch-ready  
**21-50%:** Significant gaps, needs more QA  
**51-80%:** Minor issues found and fixed, mostly ready  
**81-95%:** Ready with small workarounds  
**96-100%:** Ready, all green  

**Confidence:** X%  
**Recommendation:** [LAUNCH / DELAY X days for Y]

---

## Quick Reference: Key Commands

### Trigger Email Functions
```bash
# Replace YOUR_SERVICE_ROLE_KEY with actual key from Supabase dashboard

# Send support alert
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-support-request \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"message":"test","subject":"Test","email":"user@example.com","name":"Test"}'

# Send message notification
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"threadId":"UUID","notificationType":"message_received"}'

# Send concierge notification
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-concierge-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"inquiryId":"UUID","type":"seeker_confirmed"}'

# Send tour notification
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-tour-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"tourId":"UUID","type":"tour_proposed"}'
```

### Check Function Logs
```bash
# From Supabase dashboard: Edge Functions > [function name] > Invocations
# Watch for 401/403 errors (auth failure) and 500 errors (crash)
```

### Verify Data Integrity
```sql
-- In Supabase SQL Editor

-- Check for duplicate inquiries (idempotency test)
SELECT 
  user_email, 
  facility_id, 
  created_at,
  COUNT(*) as count
FROM concierge_inquiries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY user_email, facility_id
HAVING COUNT(*) > 1;

-- Check user_roles admin gate
SELECT 
  user_id,
  role,
  COUNT(*) as count
FROM user_roles
WHERE role = 'admin'
GROUP BY user_id
HAVING COUNT(*) > 1; -- Should be 0

-- Check for stale orphaned profiles
SELECT COUNT(*) FROM admin_user_profiles 
WHERE user_id NOT IN (SELECT id FROM auth.users);
```

---

## Going Live: Final Checklist

- [ ] Section 1 complete: admin cleanup done
- [ ] Section 2 complete: email/SMS verified working
- [ ] Section 3 complete: all browser QA passed
- [ ] Section 4 complete: no-auth endpoints reject correctly
- [ ] Section 5 complete: provider onboarding tested
- [ ] Section 6 complete: seeker flows end-to-end tested
- [ ] Section 7 complete: 48-72h monitoring window observed
- [ ] Section 8: only critical patches applied (if any)
- [ ] Section 9: final report compiled
- [ ] Confidence: ≥80%
- [ ] Ready to enable marketing campaigns
- [ ] Support team briefed on new workflows
- [ ] Monitoring dashboards active
- [ ] Incident response plan ready

**Status:** Ready for live operations ✅

---

Generated: 2026-06-22  
Production Commit: `357ccbc9`  
Vercel Deployment: READY
