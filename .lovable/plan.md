
# Lead Redistribution & Reminder System

## Overview

Implement an automated lead monetization recovery system where facilities receive reminders at **6h, 12h, and 24h** after lead submission. After **24 hours**, if the lead remains unlocked, it gets redistributed to **2-3 nearby facilities** at a **$15 unlock price** - without any visible indication that it's a redistributed lead.

---

## System Flow

```text
LEAD LIFECYCLE
──────────────────────────────────────────────────────────────────
 [0h]      [6h]       [12h]      [24h]       [72h]
   │         │          │          │           │
   ▼         ▼          ▼          ▼           ▼
 Lead    Reminder   Reminder   Exclusive   Extended
Created   #1 Sent    #2 Sent   Expires &   Window
                     + Final   Redistributed Expires
                     Warning

├─── EXCLUSIVE PHASE ───┼──── EXTENDED PHASE ────┤
│    ($39-49 pricing)   │    ($15 for new        │
│    1 facility only    │    2-3 facilities)     │
└───────────────────────┴────────────────────────┘
```

---

## Technical Implementation

### 1. Database Schema Changes

**Add columns to `leads` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `exclusive_until` | timestamptz | When 24h window expires |
| `extended_until` | timestamptz | When redistributed window expires (72h from creation) |
| `redistribution_status` | text | 'exclusive', 'extended', 'expired' |
| `original_facility_id` | uuid | Track original target facility |
| `reminder_6h_sent_at` | timestamptz | Track 6h reminder |
| `reminder_12h_sent_at` | timestamptz | Track 12h reminder |
| `reminder_24h_sent_at` | timestamptz | Track 24h reminder |

**Create new `lead_distributions` table:**

| Column | Type | Purpose |
|--------|------|---------|
| `id` | uuid | Primary key |
| `lead_id` | uuid | Reference to lead |
| `facility_id` | uuid | Facility that can see this lead |
| `is_original` | boolean | True for original facility |
| `distributed_at` | timestamptz | When distributed |
| `notification_sent` | boolean | Email notification sent |

**Add platform settings:**

| Setting Key | Default Value | Purpose |
|-------------|---------------|---------|
| `exclusive_window_hours` | 24 | Hours before redistribution |
| `extended_window_hours` | 48 | Hours for extended phase |
| `redistributed_unlock_price` | 1500 | $15.00 in cents |
| `max_redistribution_facilities` | 3 | Max facilities to redistribute to |

---

### 2. Edge Functions

**New: `send-unlock-reminders`**
- Runs hourly via cron job
- Sends 3 reminder emails per lead:
  - **6h reminder**: "You have a new lead waiting"
  - **12h reminder**: "Don't miss out on this inquiry"  
  - **24h reminder**: "FINAL: Your exclusive access expires soon"
- Updates reminder timestamp columns

**New: `process-lead-redistribution`**
- Runs hourly via cron job
- Finds leads where:
  - `exclusive_until < NOW()`
  - `redistribution_status = 'exclusive'`
  - No unlock exists
- For each expired lead:
  1. Find 2-3 nearby approved facilities in same state (excluding original)
  2. Create entries in `lead_distributions`
  3. Send notification emails (generic "New lead available" - no redistribution indicator)
  4. Update lead `redistribution_status` to 'extended'

---

### 3. Unlock Logic Updates

**Modify `unlock-lead` edge function:**

```text
IF lead.redistribution_status = 'extended' 
   AND facility_id != lead.original_facility_id:
   
   → Price = $15 (from platform_settings)
   → Verify facility_id exists in lead_distributions
   
ELSE:
   → Price = Normal pricing ($39/$49)
```

**Critical**: No UI changes to indicate redistribution status. The unlock button and price display should show $15 without explaining why.

---

### 4. Modify Lead Submission Flow

**Update `submit-qualified-lead`:**
- Set `exclusive_until = NOW() + 24 hours`
- Set `extended_until = NOW() + 72 hours`  
- Set `redistribution_status = 'exclusive'`
- Set `original_facility_id = facility_id`
- Create initial entry in `lead_distributions` with `is_original = true`

---

### 5. Provider Lead Queries

**Modify lead fetching logic:**

Providers should see leads where:
```sql
facility_id = :provider_facility_id  -- Original leads
OR
lead_id IN (SELECT lead_id FROM lead_distributions WHERE facility_id = :provider_facility_id)  -- Redistributed leads
```

**Important**: No visual distinction between original and redistributed leads.

---

### 6. Reminder Email Templates

**6-Hour Reminder:**
```
Subject: New inquiry waiting for you
Body: You received an inquiry [X hours ago]. Respond quickly to increase your chances of converting this lead.
CTA: View Lead in Dashboard
```

**12-Hour Reminder:**
```
Subject: Don't miss this lead opportunity  
Body: A potential client is waiting. Quick response times lead to better conversion rates.
CTA: Unlock & Connect Now
```

**24-Hour Reminder (Final Warning):**
```
Subject: ⚠️ Last chance to respond to this inquiry
Body: Your exclusive window to respond is closing soon. Unlock now to connect with this potential client.
CTA: Unlock Before Time Runs Out
```

---

### 7. Price Display Logic

**Frontend (useUnlockPricing hook):**

Add logic to check if current facility is the original or redistributed:
- If redistributed → Return $15 price
- If original → Return normal $39/$49 price

**No badges, no "shared" indicators, no countdown timers** - redistributed leads appear exactly like normal leads with a lower price.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/send-unlock-reminders/index.ts` | Reminder email automation |
| `supabase/functions/process-lead-redistribution/index.ts` | Lead expiry & redistribution |
| `src/hooks/useLeadAccess.ts` | Check facility access to leads |

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/unlock-lead/index.ts` | Add $15 pricing for redistributed leads |
| `supabase/functions/submit-qualified-lead/index.ts` | Set expiry timestamps |
| `src/hooks/useUnlockPricing.ts` | Fetch redistributed price from settings |
| `src/components/provider/UnlockLeadButton.tsx` | Use updated pricing logic |
| Provider leads queries | Include redistributed leads |

---

## Cron Schedule (via pg_cron)

```sql
-- Run every hour to process reminders and redistribution
SELECT cron.schedule('process-lead-reminders', '0 * * * *', ...);
SELECT cron.schedule('process-lead-redistribution', '0 * * * *', ...);
```

---

## Revenue Impact

| Scenario | Current | With Redistribution |
|----------|---------|---------------------|
| 100 leads/month | | |
| 40% unlock by original ($44 avg) | $1,760 | $1,760 |
| 30% of remaining 60 via redistribution ($15) | $0 | $270 |
| **Total** | **$1,760** | **$2,030** (+15%) |

---

## Summary

This system ensures maximum monetization while maintaining a seamless provider experience:

- **3 reminders** create urgency (6h, 12h, 24h)
- **$15 redistributed price** makes leads attractive to nearby facilities
- **No visible indicators** prevent facilities from deprioritizing redistributed leads
- **First-to-unlock wins** creates healthy competition
