# RehabLookup Live Operations — Quick Checklist

**Use this alongside LIVE_OPS_RUNBOOK.md**

---

## Pre-Launch Checklist

### ✅ Section 1: Admin/Staff Cleanup

- [ ] Run orphaned profile query (Section 1.1)
- [ ] Delete stale profiles or re-invite real staff
- [ ] Verify active advisor count
- [ ] Test real advisor login
- [ ] Confirm advisor has `user_roles='admin'`
- [ ] Test advisor message sending (if applicable)

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 2: Email/SMS Delivery

**Support Email:**
- [ ] Support alert email arrives within 30s
- [ ] Sender/from name correct
- [ ] No PHI in email
- [ ] Deep link works

**Concierge Message Email:**
- [ ] Message email arrives within 30s
- [ ] No internal notes exposed
- [ ] Link to `/account/concierge` works

**SMS (if configured):**
- [ ] SMS arrives within 60s
- [ ] Text is concise
- [ ] Facility SMS does NOT include seeker phone
- [ ] Retry does not duplicate

**Idempotency:**
- [ ] Same email triggered twice → only 1 received
- [ ] Same SMS triggered twice → only 1 received

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 3: Authenticated Browser QA

**Seeker Login & Support:**
- [ ] Login works
- [ ] `/account/support` loads
- [ ] Create ticket works
- [ ] Add attachment works (if applicable)
- [ ] Reply to ticket works
- [ ] Reopen ticket works

**Seeker Notifications & Concierge:**
- [ ] Support notification deep link → correct page
- [ ] `/account/concierge` loads
- [ ] Concierge message deep link → correct page
- [ ] Cannot see admin/provider data

**Provider Login & Support:**
- [ ] Provider login works
- [ ] Provider support page loads
- [ ] Create/reply tickets works
- [ ] Facility team can see shared tickets
- [ ] Cannot see client-only tickets
- [ ] Cannot see internal notes

**Admin/Advisor Login & Concierge:**
- [ ] Admin login works
- [ ] Advisor login works
- [ ] Support inbox loads
- [ ] Can reply to tickets
- [ ] Internal notes NOT visible to seeker
- [ ] Can resolve/reopen tickets
- [ ] Advisor message sending works
- [ ] Concierge dashboard loads
- [ ] No redirect loops or blank pages

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 4: No-Auth Security

```bash
# Run from external network

# No auth on all endpoints — expect 401/403
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Content-Type: application/json" -d '{}'
# Expected: 401

curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-concierge-notifications \
  -H "Content-Type: application/json" -d '{}'
# Expected: 401

curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-tour-notifications \
  -H "Content-Type: application/json" -d '{}'
# Expected: 401

curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/auto-decline-stale-introductions \
  -H "Content-Type: application/json" -d '{}'
# Expected: 403/401

# Valid service-role call — expect 200 or specific error
curl -X POST https://mldbxpntzcjalgjmwnqa.supabase.co/functions/v1/send-message-notifications \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -d '{"threadId":"x","notificationType":"message_received"}'
# Expected: 200 (or missing data error, NOT auth error)
```

- [ ] No-auth calls return 401/403
- [ ] Service-role calls work
- [ ] No open relay behavior

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 4b: Owner-only security/config (pre-GA, non-blocking for code deploys)

These cannot be set from code or migrations — a project **owner** must apply them
in the respective dashboards. They do **not** block a code deployment. Full
write-up: `docs/audit/prelaunch-security-config-2026-07-03.md`.

- [ ] **Leaked-password (HIBP) protection** — Supabase Dashboard →
      **Authentication → Password protection** → enable **"Check passwords
      against HaveIBeenPwned"** (leaked-password protection). Only affects
      new/changed passwords. *Recommended before GA.*
- [ ] **Stripe live Pro product ID** — confirm the live Stripe **Pro** product
      id is present in `PRO_PRODUCT_IDS` (defined in `check-subscription`,
      `get-revenue-stats`, `send-retention-outreach`,
      `check-provider-health-alerts`, and `_shared/email-templates.ts`). This
      list drives only email / plan-**label** classification — authoritative Pro
      entitlement is `facility_subscriptions.tier/status` + `has_active_pro()`,
      never this list. Current entries: `prod_pro_monthly` (legacy placeholder)
      + `prod_TbalLOPujTIoUe`, `prod_Tbyz1bf6iYyzYd`, `prod_TbalOeJZA2ZoJl`,
      `prod_TbyzJVNOQL71NN`. If the live id differs, add it — or, safer against
      future drift, switch the classifier to match on the Stripe price
      **lookup_key / price metadata** instead of a static product-id allowlist.

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 5: Provider Onboarding (1–3 providers)

**Signup & Claim:**
- [ ] Facility claim/signup flow works
- [ ] Profile completion works
- [ ] Email verification works

**Routing Logic:**
- [ ] Free provider: leads route to concierge
- [ ] Pro provider: leads route directly
- [ ] Tier detection logic correct

**Provider Features:**
- [ ] Support create/reply works
- [ ] Facility team sharing works
- [ ] Notifications arrive
- [ ] Cannot see unauthorized data

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 6: Seeker Flows (2–3 flows)

**Flow A: Public Request Info**
- [ ] Request form submitted
- [ ] Seeker receives confirmation
- [ ] Provider/admin receives notification
- [ ] Retry does NOT duplicate
- [ ] Seeker can see inquiry status

**Flow B: Support Ticket**
- [ ] Create ticket works
- [ ] Admin replies
- [ ] Seeker sees reply
- [ ] Seeker can reply
- [ ] Admin gets notification

**Flow C: Concierge Intake**
- [ ] Intake form submitted
- [ ] Advisor gets notification
- [ ] Advisor sends message
- [ ] Seeker gets message + email
- [ ] Seeker can reply

**Privacy Checks:**
- [ ] No internal notes in seeker email
- [ ] Seeker cannot see admin notes
- [ ] Facility SMS has no seeker phone
- [ ] No cross-tenant data visible

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 7: Monitoring (48–72 hours)

**Vercel Logs:**
- [ ] No 500 errors
- [ ] No blank pages
- [ ] No unhandled rejections

**Supabase Edge Functions:**
- [ ] No auth failures (401/403 spikes)
- [ ] No 500 errors
- [ ] Normal execution times (<30s)

**Postgres:**
- [ ] No RLS denial spikes
- [ ] No database errors

**Email/SMS:**
- [ ] Delivery success rate >95%
- [ ] No suspicious duplicates
- [ ] DLQ paths working

**Feature Checks:**
- [ ] Support tickets: all succeed
- [ ] Concierge messages: all deliver
- [ ] Lead routing: all correct tier
- [ ] Deep links: all work
- [ ] No blank pages or redirects

**Status:** ⬜ Pending | 🟢 PASS | 🔴 FAIL

---

### ✅ Section 8: Issues & Patches

**Critical Issues Found:**
1. [ ] Issue description: ____________
   - Severity: CRITICAL / HIGH / MEDIUM / LOW
   - Fixed: YES / NO
   - PR: ____________

2. [ ] Issue description: ____________
   - Severity: CRITICAL / HIGH / MEDIUM / LOW
   - Fixed: YES / NO
   - PR: ____________

**Only patch for:** login failure, lost lead, concierge stuck, ticket failed, spoofing, PHI leak, false success, RLS leak, crash, payment broken

---

### ✅ Section 9: Final Verdict

**Overall Status:**

| Area | Pass | Fail | Notes |
|------|------|------|-------|
| Admin cleanup | ⬜ | ⬜ | |
| Email/SMS | ⬜ | ⬜ | |
| Browser QA | ⬜ | ⬜ | |
| Security | ⬜ | ⬜ | |
| Provider onboarding | ⬜ | ⬜ | |
| Seeker flows | ⬜ | ⬜ | |
| Monitoring | ⬜ | ⬜ | |
| Issues | NONE | ⬜ | |

**Launch Confidence:**

- 🔴 0–20%: NOT READY
- 🟡 21–80%: NEEDS WORK
- 🟢 81–100%: READY TO LAUNCH

**Confidence:** _____ %

**Recommendation:**

- [ ] LAUNCH NOW
- [ ] DELAY for: ____________
- [ ] BLOCKED: ____________

---

## Post-Launch Monitoring (First 30 Days)

- [ ] Daily: Check Vercel/Supabase logs for errors
- [ ] Daily: Verify support tickets are working
- [ ] Daily: Spot-check lead routing (free vs. pro)
- [ ] 3x/week: Check email/SMS delivery rates
- [ ] Weekly: Review RLS audit logs
- [ ] Weekly: Confirm all notification routes active
- [ ] Biweekly: Provider/seeker satisfaction check

---

## Incident Response

**If critical issue found during QA:**

1. Document it in "Issues Found" section above
2. Assess severity (CRITICAL = blocks launch)
3. If patchable and safe:
   - Branch from main
   - Apply minimal fix only
   - Test locally
   - Deploy to production
   - Update PR / commit message
4. Re-test affected flow
5. Update checklist status

**Never:**
- Push unreviewed code
- Bypass tests or hooks
- Loosen RLS
- Add features beyond the fix
- Continue QA without fix confirmation

---

## Deployment Verification

**After any patch during QA:**

```bash
# Confirm new code reached production
git log --oneline | head -5
# Should see your patch commit

# Verify tests still pass
npm test
# Should be 390/390 passing

# Verify edge functions deployed
# Go to Supabase dashboard → Edge Functions
# All should show ACTIVE
```

---

## Sign-Off

| Role | Name | Date | Status |
|------|------|------|--------|
| Owner | ____________ | _____ | ⬜ |
| DevOps | ____________ | _____ | ⬜ |
| Support Lead | ____________ | _____ | ⬜ |

---

**Generated:** 2026-06-22  
**Production Commit:** `357ccbc9`  
**Next Review:** After QA completion
