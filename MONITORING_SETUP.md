# RehabLookup Monitoring Setup Guide

**For 48–72 hour observation window during Live Operations QA**

---

## Dashboard 1: Vercel Runtime Logs

**Access:** https://vercel.com/teams/ChikasHoldings/dashboard

### Setup

1. Select **rehablookup** project
2. Go to **Logs** tab (top navigation)
3. Select **Runtime Logs** (all logs for deployed functions/pages)

### What to Watch

```
Alert immediately if you see:
- "Internal Server Error" (500)
- "Unhandled promise rejection"
- Blank/empty response body
- Request timeout (>60s)
- "ECONNREFUSED" or network errors
```

### Query Examples

Filter by status code:
- Status: 500
- Time range: Last 24 hours

Filter by error pattern:
- Search: "Error:"
- Time range: Last 24 hours

### Expected Baseline (No Issues)

- ~95% 2xx responses (success)
- <1% 4xx responses (client errors)
- <1% 5xx responses (server errors)
- P95 latency: <2s for normal routes
- No blank pages or timeouts

### Action Threshold

If 5xx errors >2% in any 1-hour window:
1. Note the time and endpoint
2. Check Supabase Edge Function logs (Dashboard 2)
3. Document in your monitoring notes
4. Do NOT panic unless users are blocked (broken login, lost support ticket, etc.)

---

## Dashboard 2: Supabase Edge Function Logs

**Access:** https://app.supabase.com/project/mldbxpntzcjalgjmwnqa

### Setup

1. Go to **Edge Functions** (left sidebar)
2. Select each function:
   - `send-message-notifications`
   - `send-concierge-notifications`
   - `send-tour-notifications`
   - `auto-decline-stale-introductions`

3. Click **Invocations** tab to see recent calls

### What to Watch

```
Alert if you see:
- "unauthorized" / 401 / 403 responses
- "error" in response body
- Function execution >30 seconds
- Multiple consecutive failures
```

### Expected Behavior

**send-message-notifications:**
- Success: `{ "ok": true, "result": {...} }`
- Auth rejection: `{ "error": "unauthorized" }`
- Expected rate: 1–10/hour (depends on message volume)

**send-concierge-notifications:**
- Success: `{ "ok": true, "result": {...} }`
- Auth rejection: `{ "error": "unauthorized" }`
- Type rejection (seeker action): `{ "error": "forbidden_type" }`
- Expected rate: 1–20/hour (depends on case volume)

**send-tour-notifications:**
- Success: `{ "ok": true, "result": {...} }`
- Auth rejection: `{ "error": "unauthorized" }`
- Expected rate: 0–5/hour (depends on tour activity)

**auto-decline-stale-introductions:**
- Success: `{ "ok": true, "declined_count": X }`
- Cron secret rejection: `{ "error": "missing cron secret" }`
- Expected rate: 1/hour (scheduled cron, runs every hour)

### Auth Failure Pattern to Watch

```json
Example of Auth Failure (Expected):
{
  "error": "unauthorized",
  "status": 401
}

If you see 10+ auth failures in 1 hour:
1. Check if requests are coming from external sources
2. Verify service-role key is correct in calling code
3. Review Section 4 (No-Auth Security) — might be under attack
```

### Action Threshold

If any function has >10% failure rate in 1-hour window:
1. Click the function name
2. Look at the **Details** for the failed invocation
3. Check error message and request payload
4. Compare to expected behavior above
5. Document and notify

---

## Dashboard 3: Postgres Errors & RLS

**Access:** Supabase SQL Editor

### Monitor RLS Denials

Run every 12 hours:

```sql
-- RLS denials (should be 0 except during testing)
SELECT 
  COUNT(*) as denial_count,
  MAX(timestamp) as last_denial
FROM postgres_logs
WHERE message LIKE '%policy%denied%' 
  AND timestamp > NOW() - INTERVAL '12 hours'
  AND severity = 'ERROR';

-- Expected: 0 denials (unless you're testing unauthorized access)
```

### Monitor Database Errors

Run every 12 hours:

```sql
-- Database errors (should be minimal)
SELECT 
  COUNT(*) as error_count,
  MAX(timestamp) as last_error,
  message
FROM postgres_logs
WHERE severity = 'ERROR'
  AND timestamp > NOW() - INTERVAL '12 hours'
GROUP BY message
ORDER BY error_count DESC;

-- Expected: <5 errors total (connection resets, etc. are normal)
```

### Monitor Slow Queries

Run every 24 hours:

```sql
-- Queries taking >1s (might indicate load issue)
SELECT 
  COUNT(*) as slow_count,
  query,
  MAX(duration) as max_duration_ms
FROM postgres_logs
WHERE duration_ms > 1000
  AND timestamp > NOW() - INTERVAL '24 hours'
GROUP BY query
ORDER BY max_duration_ms DESC
LIMIT 10;

-- Expected: <5 slow queries (some background jobs expected)
```

---

## Dashboard 4: Email/SMS Delivery

### Email Tracking

**Access:** Supabase SQL Editor

```sql
-- Email delivery summary (every 12 hours)
SELECT 
  email_type,
  status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / (
    SELECT COUNT(*) FROM email_tracking_events 
    WHERE created_at > NOW() - INTERVAL '12 hours'
  ), 1) as percent
FROM email_tracking_events
WHERE created_at > NOW() - INTERVAL '12 hours'
GROUP BY email_type, status
ORDER BY email_type, status;

-- Expected output:
-- email_type | status | count | percent
-- -----------|--------|-------|--------
-- support    | sent   | 95    | 95.0
-- support    | failed | 5     | 5.0
-- concierge  | sent   | 150   | 96.2
-- concierge  | failed | 6     | 3.8
```

### Email DLQ (Dead-Letter Queue)

```sql
-- Emails failed after all retries
SELECT 
  email_type,
  COUNT(*) as dlq_count,
  MAX(created_at) as last_dlq
FROM email_tracking_events
WHERE status = 'deadlettered'
  AND created_at > NOW() - INTERVAL '48 hours'
GROUP BY email_type;

-- Expected: 0 (or <5 if under heavy load)
```

### SMS Delivery (if Twilio wired)

Check Twilio Dashboard: https://www.twilio.com/console/sms/logs

```
Alert if:
- Delivery failure rate >5%
- "Invalid phone number" errors spike (>10% of SMS)
- "Carrier error" messages (provider issue, not ours)
```

---

## Dashboard 5: Feature-Specific Health Checks

Run these manually every 12 hours:

### Support Tickets

```sql
-- Support tickets created in last 24h
SELECT 
  status,
  COUNT(*) as count
FROM support_tickets
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Expected: most should be 'open', some 'resolved'

-- Check for stuck tickets (no reply >6h)
SELECT 
  id,
  created_at,
  NOW() - created_at as age
FROM support_tickets
WHERE status IN ('open', 'pending')
  AND created_at < NOW() - INTERVAL '6 hours'
  AND (
    SELECT COUNT(*) FROM support_replies 
    WHERE ticket_id = support_tickets.id 
      AND created_at > support_tickets.created_at + INTERVAL '5 minutes'
  ) = 0;

-- Expected: 0 (all tickets should get initial response)
```

### Concierge Cases

```sql
-- New concierge cases in last 24h
SELECT 
  status,
  COUNT(*) as count
FROM concierge_inquiries
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY status;

-- Expected: mix of pending, matched, etc.

-- Check for duplicate inquiries (retry test)
SELECT 
  COUNT(*) as duplicate_count
FROM (
  SELECT user_email, facility_id
  FROM concierge_inquiries
  WHERE created_at > NOW() - INTERVAL '24 hours'
  GROUP BY user_email, facility_id
  HAVING COUNT(*) > 1
) as dups;

-- Expected: 0
```

### Lead Routing

```sql
-- Check free vs. pro routing
SELECT 
  CASE 
    WHEN f.subscription_status = 'pro' THEN 'PRO→provider'
    ELSE 'FREE→concierge'
  END as routing,
  COUNT(ci.id) as count
FROM concierge_inquiries ci
JOIN facilities f ON ci.facility_id = f.id
WHERE ci.created_at > NOW() - INTERVAL '24 hours'
GROUP BY f.subscription_status;

-- Expected: 
-- PRO→provider | X
-- FREE→concierge | Y
-- (X and Y should both be >0 if we have active providers)
```

### Notification Delivery

```sql
-- Check notification sends (email + SMS)
SELECT 
  COUNT(*) as total_notifications,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status='sent') / COUNT(*), 1) as send_rate
FROM email_tracking_events
WHERE created_at > NOW() - INTERVAL '12 hours';

-- Expected: send_rate >95%
```

---

## Incident Response Playbook

### If 5xx Error Spike Detected

1. **Check Vercel logs:** Runtime error details
2. **Check Edge Function logs:** Function-specific error
3. **Check Postgres:** Database connection/lock issues
4. **Action:**
   - If database: likely connection pool exhausted → wait 5 min or restart
   - If Supabase: check status page (supabase.com/status)
   - If code: check recent deploys, rollback if needed
5. **Escalate if:** Still failing after 15 min

### If Auth Failure Spike Detected

1. **Check Edge Function logs:** `"unauthorized"` or `"403"` response
2. **Verify:**
   - Service-role key in environment variables correct?
   - Token format valid (Bearer token)?
   - User JWT expired or revoked?
3. **Action:**
   - Rotate service-role key if compromised
   - Check for malicious requests (Section 4 attack?)
   - Verify JWT signature
4. **Escalate if:** Continues after key rotation

### If Email/SMS Delivery Dropped

1. **Check Resend/Twilio status page**
2. **Check email_tracking_events for failures**
3. **Action:**
   - If Resend down: check Resend status
   - If Twilio down: check Twilio status
   - If rate-limited: check if we're over quota
   - If auth error: verify API keys
4. **Escalate if:** Issue persists >30 min

### If High RLS Denials

1. **Check Postgres logs** for pattern
2. **Action:**
   - If seeker accessing admin tables: expected denial, check logs
   - If provider accessing unauthorized data: security issue, escalate
   - If admin tools blocked: might be role bug, check code
3. **Escalate if:** Legitimate users blocked

---

## Monitoring Schedule (48–72h Window)

| Time | Check | Dashboard |
|------|-------|-----------|
| Start (T+0h) | Baseline | All 5 dashboards |
| T+6h | Spot check | Vercel + Edge Fn + Email |
| T+12h | Email/SMS summary | Dashboard 4 + SQL queries |
| T+24h | Feature health | Dashboard 5 + SQL |
| T+36h | Full health check | All 5 dashboards |
| T+48h | RLS + error summary | Postgres + Edge Fn |
| T+60h | Spot check | Vercel + Email |
| T+72h | Final summary | All dashboards |

---

## Automated Alerts (Optional Setup)

If you have monitoring service (DataDog, New Relic, etc.):

### Alert Rules

1. **Vercel 5xx rate >2% (1h window)**
2. **Edge Function 401 failures >10 (1h window)**
3. **Email delivery rate <95% (6h window)**
4. **RLS denials >0 (6h window, excluding tests)**
5. **Postgres slow queries >5 (24h window)**

### Alert Notification

Send to: [your-team-slack or email]

---

## Monitoring Dashboard Template

Print or fill this out every 12 hours:

```
========== MONITORING REPORT ==========
Time: __________

Vercel:
  Status: 🟢 OK / 🟡 WARNING / 🔴 CRITICAL
  5xx errors: ____ (threshold: <2%)
  Notes: ___________________________

Edge Functions:
  Status: 🟢 OK / 🟡 WARNING / 🔴 CRITICAL
  Auth failures: ____ (threshold: <10/h)
  Notes: ___________________________

Postgres:
  Status: 🟢 OK / 🟡 WARNING / 🔴 CRITICAL
  RLS denials: ____ (threshold: 0)
  Errors: ____ (threshold: <5)
  Notes: ___________________________

Email/SMS:
  Status: 🟢 OK / 🟡 WARNING / 🔴 CRITICAL
  Delivery rate: ___% (threshold: >95%)
  DLQ: ____ (threshold: <5)
  Notes: ___________________________

Features:
  Status: 🟢 OK / 🟡 WARNING / 🔴 CRITICAL
  Support: ✓/✗
  Concierge: ✓/✗
  Lead routing: ✓/✗
  Notifications: ✓/✗
  Notes: ___________________________

Overall: 🟢 GREEN / 🟡 YELLOW / 🔴 RED

Action items:
- [ ] ___________________________
- [ ] ___________________________
=====================================
```

---

## Sign-Off & Documentation

- [x] Monitoring setup complete
- [x] Dashboards accessed and baseline recorded
- [x] Alert thresholds understood
- [x] Incident response playbook reviewed
- [x] Team notified of monitoring window

**Monitoring starts:** [DATE/TIME]  
**Monitoring ends:** [DATE/TIME + 72h]  
**Owner/Operator:** ________________

---

Generated: 2026-06-22  
Production Environment: Supabase (mldbxpntzcjalgjmwnqa) + Vercel  
Monitoring Window: 48–72 hours post-QA
