# User Panel Audit — REPORT

> **Scope:** End-to-end audit of every patient/family-facing surface on RehabLookup — frontend, backend edge functions, data, SEO templates, and conversion flows.
> **Captured:** 2026-05-01.
> **Methodology:** Phase 1 (surface map) → Phase 2 (static + contract checks) → Phase 3 (code-level flow trace) → Phase 4 (targeted live reproductions) → Phase 5 (this report).
> **Companion docs:** `01-surface-map.md`, `02-static-checks.md`, `03-flow-trace.md`, `04-reproductions.md`.

---

## Headline

The User Panel is broadly production-ready: SEO infrastructure, sitemap freshness, structured data, RLS masking on `facilities`, lead-intake idempotency, concierge intake idempotency, and PII-safe localStorage are **all green**. Pre-build validators that gate `npm run build` (`validate:seo-schema`, `validate:sitemap-robots`, `check:gsc-indexing`, `check:structured-data`, `check:faq-jsonld`, `check:aggregate-rating`, `check:internal-links`, `check:provider-leads-masking`) **all pass**.

There is **one Critical conversion-blocking bug** (C-1) and a small handful of medium/low items. None are silent dead-ends — the panel routes, redirects, and 404s correctly.

---

## Findings by severity

### 🔴 Critical (1)

#### C-1 — `"[object Object]"` toast on email_required / invalid_email errors

| | |
|---|---|
| **Reach** | All forms invoking `submit-qualified-lead`, `submit-concierge-intake`, `send-contact-form`, `send-provider-support`, `submit-exit-intent-lead`, `submit-marketing-lead`, `save-placement-draft`, `save-international-placement-draft`, `submit-placement-case`, `submit-concierge-intake` |
| **Impact** | User submitting a lead with a missing/invalid email sees a debugger-style toast: `"Submission failed / [object Object]"`. They cannot tell what went wrong. **Direct conversion blocker.** |
| **Root cause** | The recent `email_required` standardization introduced a structured envelope (`{ error: { code, message }, code, reason, details }`) while every other validation branch in the same functions still uses the legacy string envelope (`{ success: false, error: "..." }`). All client consumers do `throw new Error(data.error)` — which works for strings but produces `"[object Object]"` for the new shape. |
| **Reproduced** | Yes — Phase 4 R-1 (live curl). |
| **Fix (recommended, not implemented in this audit)** | Add a single client-side helper `extractErrorMessage(data)` and apply at every `supabase.functions.invoke` site. See Phase 3 §C-1 for sample code. Optionally, finish the envelope standardization on the server too. |

### 🟠 Medium (3)

#### S-1 — Admin/provider sees seeker "Complete Your Profile" empty state on `/account/*`

`SeekerShell.tsx:219` shows the seeker empty state when `profile === null`, without checking the user's actual role. An admin/provider deep-linking to `/account/...` can briefly see the seeker onboarding card before the role-redirect effect fires. Fix: add `&& userRole === "seeker"` (or render the skeleton until both queries resolve).

#### M-1 — Five user-facing forms validate inline rather than via Zod

`Contact.tsx`, `SeekerSignup.tsx`, `ResetPassword.tsx`, `ProviderSupport.tsx`, `useLeadIntakeForm.ts`. Backend already validates server-side, so this is **defense-in-depth** + UX consistency, not a security hole. Highest priority of the five: `SeekerSignup` and `ResetPassword` (account-creation forms — bad signups + weak passwords).

#### M-2 — `lastSubmitAt` debounce + idempotency-key are per-instance

If the lead-intake modal unmounts and remounts within 3s the in-memory debounce resets. **Mitigated** by server-side `idempotencyKey` dedupe — duplicate submissions silently no-op on the server. Informational.

### 🟡 Low (3)

- **L-1:** `SeekerShellSkeleton` has no error fallback if `seeker-profile` query fails repeatedly. Add an error boundary fallback inside `SeekerShell`.
- **L-2:** `useLeadIntakeForm.ts` has two `console.log` calls (lines 355, 362) that should be gated behind `import.meta.env.DEV`.
- **L-3:** Dev-server console warning `Unknown message type: RESET_BLANK_CHECK` — emitted by `cdn.gpteng.co/lovable.js`, not our code. No user impact.

---

## Confirmed clean (no action needed)

| Area | Evidence |
|---|---|
| SEO + sitemap + canonicals + JSON-LD | All 12 build-gating validators pass (`02-static-checks.md`). |
| Lead-intake idempotency | Per-submission `idempotencyKey` reaches `submit-qualified-lead`. |
| Concierge intake triple-creation guard | `mem://features/placement-intake-idempotency` + `ConciergeIntake.tsx:530–551` confirmed (draft upsert → checkout link → webhook fallback). |
| PII safety in localStorage | Explicit whitelists `PERSISTABLE_FIELDS` / `CONCIERGE_PERSISTABLE_FIELDS`; names/emails/phones/insurance IDs/clinical narrative never persist. |
| Bot honeypot | `formData.website` returns fake-success on bot submissions (`useLeadIntakeForm.ts:362`). |
| Anonymous `/account/*` | Static trace confirms redirect to `/login?redirect=...` after `useAuthReady` settles — no flicker (`SeekerShell.tsx:188`). |
| 404 paths | `/foo-bar-no-such-slug` → `<NotFound />` (R-2). `/center/no-such-slug` → `<CenterNotFound />` with recovery copy (R-3). |
| Empty states on collection pages | Saved, Reviews, Requests, Search, InternationalCase, FacilityProfile — all have explicit empty-state copy. |
| Provider lead masking contract | 111 provider files confirmed reading `leads_provider_view` with explicit columns (`check:provider-leads-masking`). |
| `select("*")` audit | No user-panel violations of the no-star rule (only count-style `head:true` queries). |
| `window.confirm` ban | No violations. |

---

## Quick wins (high-impact, low-effort)

In ranked order:

1. **Fix C-1.** ~30-line helper + ~14 call-site swaps. Eliminates `"[object Object]"` for every email-validation error across the entire user panel.
2. **Fix S-1.** One-line guard (`&& userRole === "seeker"`). Eliminates wrong-role flicker on `/account/*`.
3. **Standardize `submit-qualified-lead` envelopes.** Convert remaining string-error branches (Name, Phone, Facility, Rate-limit, etc.) to the structured shape. Lets the new client helper render specific field errors instead of generic toasts.
4. **Gate `console.log` in `useLeadIntakeForm.ts`** (L-2).
5. **Wrap `SeekerShell` profile fetch in an error boundary** (L-1).

Together these are ~1 small PR.

---

## Conversion-killing issues

Only **C-1** rises to "conversion-killing." A user who mistypes their email — or whose autofill puts a stray space in the email field — sees an error message that looks like a developer console dump. They will most plausibly abandon the form.

Everything else either has a fallback (M-2 — server dedupes), is a UX nit (S-1, L-1, L-2), or is defense-in-depth that the backend already covers (M-1).

---

## Backend / RLS / data integrity

- `facilities` anon SELECT is constrained by RLS per `mem://security/rls-anonymous-directory-access`.
- `seeker_profiles` write uses `prevent_seeker_double_account` trigger.
- `facility_reviews` rate-limit (3/day) enforced by `review_anti_spam_check` trigger.
- `lead_unlocks`, `leads`, and provider masking confirmed via `check:provider-leads-masking` and the `leads_provider_view` RPC contract.
- All edge fns return JSON with CORS headers; no path-style invocations (`/api/...`).

---

## Files produced by this audit

```
docs/audit/user-panel/
├── 01-surface-map.md
├── 02-static-checks.md
├── 03-flow-trace.md
├── 04-reproductions.md
└── REPORT.md          ← this file
```

End of audit.
