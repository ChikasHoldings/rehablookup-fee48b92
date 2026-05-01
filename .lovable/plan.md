
# User Panel — Full Deep Audit

## Why a plan (read this first)

The User Panel is the largest surface in the codebase: the public marketing site, hundreds of SEO pages (state/city/county/treatment/insurance/near-me/US-rehab/comparison/demographic/duration/cost/co-occurring/educational/seeker-guides), the facility profile, search + filters, lead intake, concierge multi-step intake, exit-intent + qualified + marketing leads, contact + provider-support forms, seeker auth + dashboard, notifications, plus the edge functions and DB views behind all of it.

A single reply that "audits everything" honestly cannot read every file, trace every flow, simulate every failure, run smoke tests, and write a per-issue report without either taking many tool-call hours or fabricating findings. So this is phased, each phase produces a real artifact in the repo, and you approve before any fixes happen.

This mirrors the structure of the already-approved Provider Panel audit (`.lovable/plan.md`) so the two reports are directly comparable.

## Scope (in)

- Public shell (`Layout`, `Header`, `Footer`, banners, sticky CTA, floating help)
- Homepage + all hub pages
- SEO pages: state, city, county, treatment, insurance, near-me, us-rehab, comparison, demographic, duration, cost, co-occurring, educational, seeker-guide, treatment-types, blog
- Search, filters, sorting, proximity ranking, results layout
- Facility profile (`/center/:slug`) — data load, gallery, services, insurance, reviews, schema, share bar
- Inquiry flow: `LeadIntakeForm` → `useLeadIntakeForm` → `submit-qualified-lead` / `submit-exit-intent-lead` / `submit-marketing-lead`
- Concierge flow: 11-step intake → `submit-concierge-intake` → Stripe checkout → `stripe-webhook` → drafts (`save-placement-draft`, `save-international-placement-draft`)
- Contact + provider-support forms
- Email verification flow (`is_email_verified`, verification codes)
- Seeker auth: signup/login/forgot/reset, `SeekerShell`, `SeekerMobileNav`, `seeker_profiles`
- Seeker dashboard pages: saved, notification preferences, settings
- Email/SMS notifications triggered by user actions
- Error/empty states on every page
- Mobile (≤640), tablet (641–1024), desktop (≥1025) layouts at the configured viewport breakpoints
- Edge functions touched by the panel + their RLS dependencies

## Scope (out, with reasons)

- Provider/Admin panels — already covered by the separate Provider Panel audit
- Live Stripe charges — trace code paths and idempotency only
- Real SMS deliverability — verify trigger code + templates only
- Pen-testing production — sandbox-side authz probing only
- Load/perf benchmarking under real traffic — flag obvious issues only, real perf needs APM
- Re-auditing things the existing scripts already cover unless they fail (`npm run check:structured-data`, `check:faq-jsonld`, `check:aggregate-rating`, `check:internal-links`, `validate:sitemap-robots`, `validate:seo-schema`, `check:gsc-indexing`, `check:provider-leads-masking`)

## Phases

### Phase 1 — Surface map & contract inventory
Produce `docs/audit/user-panel/01-surface-map.md` listing:
- Every public route + its data hook + tables/RPCs/edge functions touched
- Every SEO page template + the data it depends on (static config vs DB vs hybrid)
- Every form component + its submit target + validation schema
- Every edge function reachable from the user panel (and `verify_jwt` setting)
- All Supabase tables/views/RPCs/RLS policies on the user-facing path
- Notification touchpoints (which actions trigger which emails/SMS)

This becomes the source of truth the rest of the audit references.

### Phase 2 — Static & contract checks (no fabrication)
Run and capture results from:
- `npm run validate:seo-schema`
- `npm run validate:sitemap-robots`
- `npm run check:gsc-indexing`
- `npm run check:structured-data`
- `npm run check:faq-jsonld`
- `npm run check:aggregate-rating`
- `npm run check:internal-links`
- `npm run check:responsive-guards`
- `npm run check:seo-meta`
- `vitest run` for `layout-shell`, `responsive-snapshots`, lead-intake unit tests
- `supabase--linter` (security + performance)
- New scans:
  - User-panel hooks/components for `select(*)` (excluding the existing baseline)
  - Forms missing Zod validation
  - Edge functions reachable from public flows that lack the standardized error envelope
  - CTAs with empty/missing `to`/`href`/`onClick`
  - Pages missing loading/empty/error states (heuristic)
  - `window.confirm` usage (banned by memory)

Output: `docs/audit/user-panel/02-static-checks.md` with raw outputs + pass/fail per check.

### Phase 3 — Flow-by-flow trace (the real audit)
For each of these 14 flows, write a trace listing exact files, hooks, RPCs, edge functions, tables, and emails touched, plus success / failure / edge-case behavior observed in code:

1. Homepage → category browse → results
2. State → city → facility navigation (incl. fallback when no facilities match)
3. Treatment / insurance / near-me hub → results (proximity ranking)
4. Filters + sorting + pagination + URL state preservation
5. Facility profile load (incl. unclaimed-listing protection, schema, gallery, share bar)
6. Inquiry flow — qualified lead (default form path)
7. Inquiry flow — exit-intent lead
8. Inquiry flow — marketing lead
9. Email verification path (send code → verify → continue)
10. Concierge intake — domestic (11 steps, draft persistence at step 5, Stripe checkout, webhook completion, idempotency, abandoned-cart email)
11. Concierge intake — international variant
12. Contact + provider-support forms (now with field-specific `*_required` errors)
13. Seeker auth: signup → email verify → login → session expiration → logout → password reset
14. Seeker dashboard: profile load, saved facilities, notification prefs, account deletion

For each flow: ✅ success path, documented failure paths, and unanswered questions (which Phase 4 turns into reproductions). Concierge intake gets extra attention because of the placement-intake-idempotency memory and its triple-creation history.

Output: `docs/audit/user-panel/03-flow-traces.md`.

### Phase 4 — Targeted reproductions (live preview)
Use browser tools against the preview to reproduce the highest-risk items from Phase 3. Not "test every page" — that's not realistic in one pass. Specifically:
- Submit qualified lead with: missing email, whitespace email, non-string email, valid email (already partly covered by recent integration tests — verify against live edge functions)
- Submit concierge intake and confirm exactly one row is created (no triple-creation regression)
- Hit `/center/<unknown-slug>` → expect graceful 404, not blank
- Hit `/state/<unknown>`, `/city/<unknown>`, `/treatment/<unknown>` → expect fallback content + correct canonical, not soft-404
- Mobile (375px) walkthrough: home → search → facility → inquiry → success
- Tablet (768px) + desktop (1280px) parity check on the same flow
- Network offline mid-submission → expect retry/error, not dangling state
- Expired session on `/account/*` → expect clean redirect to `/login?redirect=...`
- Direct-URL access from a logged-in admin/provider to `/account/settings` → expect redirect away from seeker shell (already coded in `SeekerShell`, verify in DOM)
- Empty states: no saved facilities, no notifications, profile null

Output: `docs/audit/user-panel/04-repro-log.md` with screenshots + console/network excerpts.

### Phase 5 — Final report (the format you specified)
`docs/audit/user-panel/REPORT.md` containing every issue in this exact format:

- **Title**
- **Severity** (Critical | High | Medium | Low)
- **Affected Page / Flow**
- **Steps to Reproduce**
- **Expected Behavior**
- **Actual Behavior**
- **Root Cause**
- **Required Fix**

Plus:
- Totals by severity
- Critical blockers affecting lead generation
- Conversion-killing issues
- Quick wins (high impact / low effort)
- Performance flags
- Explicit "did not test" list — what was out of scope and why, so nothing is silently skipped

### Phase 6 — Fixes (separate, opt-in)
After you read the report, you pick which issues to fix. I implement them in default mode, one PR-sized batch per severity tier (Critical → High → Medium → Low). No fixes happen during the audit phases.

## What I will NOT do (and why)

- Charge real cards through Stripe — trace webhook + idempotency code instead
- Send real marketing emails to inboxes — verify templates + trigger conditions
- Run automated scanners against production — sandbox browser probes only
- Re-test things already protected by passing pre-build validators unless I find evidence they regressed

## Estimated tool-call budget

Phase 1: ~20 reads. Phase 2: ~12 commands. Phase 3: ~70 reads (the bulk). Phase 4: ~25 browser actions. Phase 5: writing. Phase 6: separate, opt-in.

## Deliverables

```text
docs/audit/user-panel/
  01-surface-map.md
  02-static-checks.md
  03-flow-traces.md
  04-repro-log.md
  REPORT.md
```

## How to approve

- "Approve" → I switch to default mode and start Phase 1.
- "Narrower first pass: <X>" (e.g. "just inquiry + concierge + facility profile") → I trim Phase 3 to those flows only and skip the rest until you ask.
- "Skip Phase 4 reproductions" → static + trace audit only, faster but lower confidence.
