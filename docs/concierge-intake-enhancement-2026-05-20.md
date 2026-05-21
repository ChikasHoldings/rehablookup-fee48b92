# Concierge Intake — End-to-End Enhancement

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Three high-value, surgical enhancements landed: crisis detection + escalation, SLA-copy reconciliation, and empty-state matching alert.

---

## TL;DR

The audit confirmed the concierge intake pipeline is well-architected end-to-end — 8-step form with email + phone OTP, draft autosave, idempotency, advisor auto-assignment, auto-matching, auto-introduction, and full admin surfacing. Three concrete weak points existed and are now fixed:

| # | Gap | Severity | Fix |
|---|-----|----------|-----|
| 1 | `suicide_history` field captured but no crisis escalation | 🔴 High (safety) | Inline 988 callout in form + elevated `concierge_intake_crisis` admin notification + always-on crisis line on ThankYou |
| 2 | SLA promise inconsistency: Landing hero "within an hour", FAQ + ThankYou "24-48 hours" | 🟡 Medium (trust) | Reconciled to honest two-step promise: coordinator within 1 business hour, full recommendations within 24-48 hours |
| 3 | Empty-match outcome silently parked seeker | 🟡 Medium (ops) | `concierge_no_matches` admin notification when `match-concierge-intake` returns 0 facilities |

---

## Enhancement 1 — Crisis detection + escalation

### Problem
The intake form asks "History of Self-Harm or Suicidal Thoughts?" (Yes/No/Prefer not to say) on Step 3 ([`StepCareNeed.tsx:243-257`](../src/components/concierge/StepCareNeed.tsx)). A "yes" answer was stored on the inquiry record but **had no follow-through**:

- Seeker saw no crisis-line callout, even while sitting in the form for another 4+ steps.
- Admin notification fired the routine `concierge_intake` type — indistinguishable from a low-acuity intake in the ops queue.
- ThankYou page omitted 988 / crisis-line content entirely.

### Fix

**Form (immediate visibility):**
The moment the seeker selects "Yes" on `suicideHistory`, an inline red-bordered callout appears inside the step:

> If you or your loved one is in immediate crisis right now, please call or text **988** — the 988 Suicide & Crisis Lifeline.
>
> You can keep filling out this form, but our care coordinators may take up to a business hour to reach you. 988 is available 24/7 and connects you to a trained counselor immediately.

The form does NOT block submission; it provides immediate help while letting the placement flow continue.

**Server (ops escalation):**
`submit-concierge-intake` now derives `isCrisis` from `suicideHistory === "yes"` and writes:
1. The standard `concierge_intake` admin notification with the title prefixed `🚨 CRISIS — New Placement Request` AND `metadata.crisis_flag: true` for downstream filtering.
2. A SECOND admin notification with `type='concierge_intake_crisis'`, `title='🚨 CRISIS intake — seeker reports active risk'`, body explicitly instructing "Call within 15 minutes if possible", and `metadata.sla_target_minutes: 15` for SLA-tracking integrations.

**ThankYou (durable visibility):**
Added an always-on crisis-line block above the support footer:

> **In crisis right now?**
> Call or text **988** for the Suicide & Crisis Lifeline, or visit 988lifeline.org. Trained counselors are available 24/7 — you don't have to wait for our coordinator.

This is *always* shown (not conditionally on `suicideHistory='yes'`), because substance-use placement is a high-stakes domain and 988 should be one tap away from every concierge submission, not just from those who self-flagged.

---

## Enhancement 2 — SLA copy reconciliation

### Problem
Three pages made three different promises:
- `ConciergeLanding.tsx:179` (hero): *"usually within an hour"*
- `ConciergeLanding.tsx:51` (FAQ): *"within 24-48 hours"*
- `ConciergeThankYou.tsx:380` (timeline): *"24-48 Hour Review"*

The hero promised speed the rest of the funnel walked back. Either the hero was overselling, or the funnel was underselling — but either way the seeker saw direct contradictions on the way to and after submitting.

### Fix
Unified all three on an honest **two-tier** SLA — backed by the ops infrastructure that already exists (admin_notifications + advisor auto-assign trigger immediately on submit):

**Tier 1 — Coordinator acknowledgement: within 1 business hour.**
The advisor reviews the intake, confirms details, answers immediate questions. This is fulfilled by the auto-assign + admin_notifications path in `submit-concierge-intake`.

**Tier 2 — Full recommendations: within 24-48 hours.**
Matched facility options + introductions. This is fulfilled by `match-concierge-intake` + `send-concierge-introduction`.

| Surface | Before | After |
|---------|--------|-------|
| Landing hero | "usually within an hour" | "A coordinator reaches out within 1 business hour; full recommendations within 24-48 hours." |
| Landing FAQ | "within 24-48 hours" | "A placement coordinator reaches out within 1 business hour…full program recommendations follow within 24-48 hours." |
| ThankYou timeline #1 | "24-48 Hour Review" | "Coordinator Reach-Out (within 1 business hour)" |
| ThankYou timeline #2 | "Facility Introductions" | "Facility Introductions (within 24-48 hours)" |

Also aligns with `InquiryConfirmation.tsx:96` (free-tier-redirect path) which already promises "1 business hour".

---

## Enhancement 3 — Empty-state matching alert

### Problem
After `submit-concierge-intake` auto-matches, if `match-concierge-intake` returns zero facilities (rare: extremely niche LoC + tight geography + insurance combination), the intake was left at `status='intake_submitted'` with a warning log entry. The seeker still saw the standard success page promising follow-up. No ops alert was raised — the case would sit invisibly until an advisor manually browsed the dashboard.

### Fix
In the existing `else` branch at line 717 of `submit-concierge-intake`, after logging the warning, also insert an admin notification:

```json
{
  "type": "concierge_no_matches",
  "title": "⚠️ No facilities matched seeker intake",
  "message": "No facilities matched {name}'s intake ({LoC} in {state}). Manual matching or broadened search needed.",
  "metadata": { inquiry_id, level_of_care, desired_state, desired_city, primary_concern, timeline, payment_type, crisis_flag }
}
```

Now an advisor sees the case immediately in their notifications inbox, marked with a warning emoji, and can either broaden the search criteria or close the case with a transparent "no matches available right now, let me reach out about alternatives" response.

`crisis_flag` is propagated to this notification so a no-match + crisis case is doubly visible (standard intake notification, crisis notification, AND no-match notification — three separate ops surfaces).

---

## What I intentionally did NOT change

| Item | Why |
|------|-----|
| Atomic advisor assignment RPC (race condition) | Would need a SECURITY DEFINER RPC with `FOR UPDATE SKIP LOCKED`. The current load-counting is already 30s polling — for typical concierge intake volume (handfuls per hour), race collisions are extremely rare and self-correct on next assignment. Worth doing later if volume grows. |
| Deep-link draft resume (`?draft={id}`) | Out of scope for this pass. Server-side `save-placement-draft` exists; client-side resume handler would need new state-restoration logic. |
| Mobile sticky-bottom CTAs | Form already has slide animations + responsive padding + `min-h-[320px]` reserved per step. Would need real-device testing — out of scope. |
| Multilingual support | `preferredLanguage` is captured but not enacted. Significant translation + i18n work; out of scope. |
| Insurance carrier validation against known-carrier list | The form accepts arbitrary strings. Validation would friction-up the funnel; the matcher already does fuzzy matching on insurance names. |
| Provider Inquiries page realtime updates | Intentionally polls (30s) for PII-safety reasons documented at `Inquiries.tsx:162`. |

---

## Files changed

| File | Change | LOC |
|------|--------|-----|
| `src/components/concierge/StepCareNeed.tsx` | Inline 988 callout when `suicideHistory==='yes'` | +25 |
| `supabase/functions/submit-concierge-intake/index.ts` | `isCrisis` derivation + elevated admin_notification + `concierge_no_matches` alert | +60 |
| `src/pages/concierge/ConciergeThankYou.tsx` | Always-on 988 callout + SLA copy reconciliation | +30 |
| `src/pages/concierge/ConciergeLanding.tsx` | SLA hero + FAQ copy reconciliation | +2 |
| `docs/concierge-intake-enhancement-2026-05-20.md` | This file | +new |

---

## CI gate results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` | ✅ 128 passed / 5 skipped |
| `npx vite build` | ✅ built in 42.90s |
| Source-contract smoke (13 enhancement-specific) | ✅ 13/13 |

---

## Enhancement smoke checks

```
✓ 1.form     : inline 988 callout when suicideHistory='yes'
✓ 2.server   : isCrisis derived from suicideHistory='yes'
✓ 2.server   : crisis_flag on standard admin_notification metadata
✓ 2.server   : SECOND elevated admin_notification when isCrisis (type=concierge_intake_crisis, SLA 15min)
✓ 3.server   : admin_notifications when match returns 0 facilities (type=concierge_no_matches)
✓ 4.landing  : hero says "1 business hour + 24-48 hours"
✓ 4.landing  : FAQ says "coordinator within 1 business hour"
✓ 5.thankyou : timeline says "Coordinator Reach-Out (within 1 business hour)"
✓ 5.thankyou : timeline says "Facility Introductions (within 24-48 hours)"
✓ 5.thankyou : 988 always-on callout present
✓ 6.regress  : server still v3.0 (no Stripe regression)
✓ 6.regress  : standard intake admin_notifications still wired
✓ 6.regress  : round-robin advisor auto-assign still present
```

---

## Smoke verdict

🟢 **Ship-ready.** The concierge intake now (a) treats high-acuity seekers with appropriate urgency by surfacing 988 inline in the form AND on the success page AND in ops alerts with a 15-minute SLA target, (b) makes a coherent two-step SLA promise that ops can actually deliver on (1h ack + 24-48h recommendations), and (c) never silently strands a seeker whose intake produced zero matches.
