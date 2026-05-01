
# Provider Panel — Full Deep Audit

## Why a plan (read this first)

The Provider Panel is large: **16 pages**, **30+ hooks**, **~110 edge functions**, and several thousand lines of payment/lead/PII logic (`unlock-lead` 731 LOC, `stripe-webhook` 1,932 LOC, `purchase-credits`, `auto-reload-credits`, `subscribe-pro`, etc.). A single reply that "audits everything" honestly cannot do all of: read every file, trace every flow, simulate every failure path, run smoke tests, and write a per-issue report — without either taking many hours of tool calls or, worse, fabricating findings.

This plan splits the audit into phases. Each phase produces a concrete artifact in the repo so nothing is hand-waved. You approve, I execute. No code changes happen in any phase except Phase 6 (fixes), which is gated on your sign-off per finding.

I already did a sampling pass to confirm the audit is worth running and to anchor it in real code (e.g. `unlock-lead` flow, `useLeadUnlocks`, `UnlockLeadButton`, dashboard, RPCs like `verify_leads_provider_view_rls`).

## Phases

### Phase 1 — Surface map & contract inventory
Produce `docs/audit/provider-panel/01-surface-map.md` listing every:
- Route under `/provider/*` and its top-level data dependencies
- Hook in `src/hooks/use*` used by the panel + which table/RPC/edge function it touches
- Edge function called from the panel (signup, billing, leads, credits, Pro, notifications)
- Supabase table / view / RPC / RLS policy reachable from the panel
- Auth + role gates (provider vs admin vs seeker, RLS, `verify_jwt`, in-function JWT checks)

This is the source of truth the rest of the audit references.

### Phase 2 — Static & contract checks (automated, no fabrication)
Run and capture results from existing guards plus a few new ones:
- `npm run check:provider-leads-masking` (PII masking contract)
- `npm run validate:seo-schema`, `validate:sitemap-robots`, `check:internal-links` (only the parts that touch provider URLs)
- `vitest run` for `src/test/provider-leads-masking.test.ts` and `src/components/provider/inquiries/InquiryListItem.test.tsx`
- `supabase--linter` (security advisor + performance advisor)
- `select public.verify_leads_provider_view_rls()` against the live DB
- New: scan provider edge functions for: missing `verify_jwt` enforcement in code, `select(*)`, missing CORS on error paths, unhandled `await` rejections, missing idempotency on Stripe handlers
- New: scan provider hooks/components for: `.from("leads").select("*")`, direct PII column reads outside `leads_provider_view`, missing loading/error/empty states (heuristic), `window.confirm` (banned by memory), navigation dead-ends

Output: `docs/audit/provider-panel/02-static-checks.md` with raw outputs + pass/fail per check.

### Phase 3 — Flow-by-flow trace (the real audit)
For each of these 12 flows, write a trace that lists the exact files, RPCs, edge functions, tables, and emails touched, plus success / failure / edge-case behavior observed in code:
1. Signup → onboarding → first dashboard load
2. Login + session expiration + logout
3. Add facility → publish → public visibility
4. Edit facility (incl. reply_email verification, image upload, staff)
5. Multi-facility switching + facility limits (Pro vs free vs purchased slots)
6. Lead arrival → notification (email/SMS/in-app) → list display (masked)
7. Lead unlock (credits path) — incl. race conditions, rollback, RLS-lag retry already in `UnlockLeadButton`
8. Lead unlock (Stripe path) — incl. webhook completion + idempotency
9. Credit purchase → balance update → auto-reload
10. Pro upgrade → discount → downgrade on failed payment / cancel
11. Concierge / placement inquiries (PII gated by `concierge_introductions.admin_disclosed_pii_at`)
12. Settings: sessions, MFA, payment methods, notifications, account deletion

For each flow: success path ✅, documented failure paths, and unanswered questions (which Phase 4 turns into reproductions).

Output: `docs/audit/provider-panel/03-flow-traces.md`.

### Phase 4 — Targeted reproductions (live preview)
Use the browser tools against the preview to reproduce / verify the **highest-risk** items surfaced in Phase 3. Not "test every page" — that's not realistic in one pass. Specifically:
- Direct-URL access to another provider's facility/lead/inquiry (authz bypass attempts)
- Unlock with insufficient credits → redirect path
- Unlock double-click / StrictMode (already guarded by `unlockingRef`, verify in DOM)
- Network failure mid-unlock (offline simulation) → confirm no dangling deduction
- Expired session on a protected page → confirm clean redirect, no blank screen
- Empty states on every panel page (no facility, no leads, no credits, no Pro)

Output: `docs/audit/provider-panel/04-repro-log.md` with screenshots + console/network excerpts.

### Phase 5 — Final report (the format you specified)
`docs/audit/provider-panel/REPORT.md` containing:
- Executive summary
- Issue list, each with: **Title / Severity (Critical|High|Medium|Low) / Affected Page or Flow / Steps to reproduce / Expected / Actual / Root cause / Required fix**
- Totals by severity
- Critical blockers (must-fix-before-prod)
- Quick wins (high impact / low effort)
- Explicit "did not test" list — what was out of scope and why, so nothing is silently skipped

### Phase 6 — Fixes (separate, opt-in)
After you read the report, you pick which issues to fix. I implement them in default mode, one PR-sized batch per severity tier (Critical → High → Medium → Low). No fixes happen in this plan.

## What I will NOT do (and why)

- **Pen-test the live site.** I can probe authz with the browser tool, but I will not run automated scanners against production from the sandbox.
- **Load / performance benchmarking under real traffic.** I'll flag obvious N+1s and missing `.select()` column lists; real perf needs APM data.
- **Stripe live-mode failure simulation.** I'll trace webhook code paths and idempotency, not actually charge cards.
- **SMS deliverability testing.** I'll verify trigger code + templates.

## Estimated tool-call budget

Phase 1: ~15 reads. Phase 2: ~10 commands. Phase 3: ~60 reads (this is the bulk). Phase 4: ~20 browser actions. Phase 5: writing. Phase 6: separate.

## Deliverables

```
docs/audit/provider-panel/
  01-surface-map.md
  02-static-checks.md
  03-flow-traces.md
  04-repro-log.md
  REPORT.md
```

Approve this plan and I'll switch to default mode and start with Phase 1. If you want a narrower first pass (e.g. "just lead unlock + credits + Pro billing"), say so and I'll trim Phase 3 accordingly.
