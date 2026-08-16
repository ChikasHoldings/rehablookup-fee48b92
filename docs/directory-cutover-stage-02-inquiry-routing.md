# Directory cutover — Stage 2: inquiry-routing cutover

**Stop new Free / unclaimed concierge case creation. Preserve Pro direct inquiries.**

| | |
|---|---|
| Starting SHA | `bea82fe1fee52b00b1ea40f1726f697098ec516e` (approved Stage-1 final) |
| Branch | `directory-cutover-02-inquiry-routing` |
| Database migrations | **NONE** |
| Edge function deployments | **NONE** (source-only change) |
| Stripe / Pro / Featured changes | **NONE** |
| Merged to main | **NO** |

Stage 2 changes the **consumer facility-contact routing model** only. It is a
stop-new-writes / routing cutover. It is *not* the provider/admin concierge
removal stage (Stage 3) and *not* the database/backend retirement stage
(Stage 4).

---

## 1. Operating rule after this stage

**Active Pro facility**
→ RehabLookup may offer the on-platform *Request Info* form.
→ The inquiry goes directly to that one selected facility.
→ Existing `leads` + provider notification/inbox infrastructure is unchanged.
→ RehabLookup does **not** match, reassign, advise, coordinate, or introduce.

**Free / unclaimed / Featured-only / non-Pro / unconfirmed**
→ RehabLookup collects **no** seeker PII.
→ No concierge case, no coordinator, no advisor, no matching.
→ The visitor contacts the selected facility directly: Call / Visit Website /
Get Directions, wherever that facility actually published the data.
→ Otherwise: continue searching / compare facilities.

---

## 2. Before / after architecture

### Before

```
Seeker → CenterProfile / SearchResultCard
       → RequestInfoModal  (LeadIntakeForm for BOTH Free and Pro)
       → seeker PII + email verification + clinical intake
       → submit-qualified-lead
            ├── has_active_pro() == true  → leads insert → provider inbox
            └── has_active_pro() != true  → CONCIERGE TAKEOVER
                   • insert concierge_inquiries (routing_mode='free_tier_redirect')
                   • insert admin_notifications  (type='concierge_intake')
                   • insert concierge_case_events (case_created)
                   • query admin_user_profiles for active `advisor`s
                   • round-robin assign an advisor
                   • email seeker "a care coordinator will call within 1 business hour"
                   • invoke notify-free-tier-inquiry-redirect
                   • return { routing_mode, inquiry_id, confirmation_path }
                        → /inquiry/confirmation/:id
                          ("coordinator within 1 business hour",
                           "1–2 additional matched facilities",
                           "3 facilities matching your insurance")

       PLUS: if the facility record failed to load, RequestInfoModal fell back to
       handleConciergeFallbackSubmit → submit-marketing-lead, under the banner
       "our team will match you with the right program and follow up shortly".
```

### After

```
Seeker → CenterProfile / SearchResultCard
       → RequestInfoModal
       → useFacilityContactRouting resolves public_facilities.is_pro
          (= canonical grace-aware has_active_pro; anonymous-readable)

          ├── "pro"    → LeadIntakeForm  → submit-qualified-lead
          │                 ├── facility identity + eligibility
          │                 ├── has_active_pro() == true
          │                 └── PII validation → leads insert → provider inbox
          │
          └── "direct" → FacilityDirectContact
                            Call · Visit Website · Get Directions
                            Continue searching · Compare facilities
                            (zero PII collected, zero edge calls)

       Server remains authoritative: if submit-qualified-lead answers
       action="DIRECT_CONTACT_REQUIRED", the client drops to the direct-contact
       panel and never shows "Request Sent".
```

---

## 3. Public facility-contact entry points audited

| Entry point | File | Before | After |
|---|---|---|---|
| Profile hero CTA | `src/pages/CenterProfile.tsx` | "Message Center" → PII modal for all tiers | "Contact Facility" → routing-aware modal |
| Profile sidebar CTA | `src/pages/CenterProfile.tsx` | "Message Center" | "Contact Facility" |
| Profile mobile card CTA | `src/pages/CenterProfile.tsx` | "Get Started" under "Message Center" heading | "Contact Facility" under "Contact This Center" |
| Profile sticky mobile bar | `src/pages/CenterProfile.tsx` | "Request info"; **Call fell back to a helpline number when the facility had none** | "Contact"; Call renders only when the facility published a phone, otherwise inert |
| Search result card CTA | `src/components/cards/SearchResultCard.tsx` | "Message Center" → PII modal (never passed a plan, so always Free-routed server-side) | "Contact Facility" → routing-aware modal |
| Deep link `?action=request-info` | `src/pages/CenterProfile.tsx` | opened PII modal | opens routing-aware modal |
| Nav-state `openRequestModal` | `src/pages/CenterProfile.tsx` | opened PII modal | opens routing-aware modal |
| Post-submit "nearby facility" hop | `RequestInfoModal` (Free-tier only) | re-opened the PII modal on a *different* facility | **removed** |

Marketing landing funnels (`AdLanding`, `MarketingLanding`, `SocialLanding`,
`SeekerRequestForm`) are **not** selected-facility contact surfaces and are out
of scope for this stage. They continue to use `LeadIntakeForm` with their own
`onCustomSubmit`.

---

## 4. `public.concierge_inquiries` writer inventory

| Writer | Caller | Publicly reachable? | Stage-1 UI retired? | New traffic? | Retirement stage |
|---|---|---|---|---|---|
| `submit-qualified-lead` | seeker facility-contact form | **was YES** | no (this stage) | **NO — removed in Stage 2** | done here |
| `submit-concierge-intake` | none in `src/` (only tests + docs reference it) | **no** — Stage 1 removed the seeker concierge intake UI | yes | no | Stage 4 |
| `save-placement-draft` | none in `src/` | no — no frontend caller remains | yes | no | Stage 4 |
| `run-smoke-tests` | `src/components/admin/SmokeTestRunner.tsx` | no — admin-only, authenticated | n/a | admin-initiated smoke tests only | Stage 4 |

Classification key used during the audit: **A** reachable from the public
Stage-1 site, **B** historical/admin-only, **C** legacy edge endpoint with no
current public caller, **D** unknown.

- `submit-qualified-lead` → **A** → cut over in this stage.
- `submit-concierge-intake` → **C**.
- `save-placement-draft` → **C**.
- `run-smoke-tests` → **B**.

No unknown (**D**) writers remain. After Stage 2 ships, **no public
seeker-facing code path can create a `concierge_inquiries` row.**

The table, its columns (including `routing_mode`), its RLS policies, its
triggers, and every historical row are **untouched**. Admin and provider
compatibility with historical rows is unchanged.

---

## 5. Pro direct-inquiry contract (unchanged behaviour, preserved)

For a confirmed active Pro facility, `submit-qualified-lead` still performs, in
order: PII sanitisation → field validation → enum validation → blocked-identifier
check → server-side email-verification enforcement → idempotency → duplicate
check → per-email / per-facility / per-IP rate limiting → `leads` insert →
seeker confirmation email → channel-aware provider fan-out (email / SMS /
in-app, gated by `notification_preferences`) → provider inbox.

Preserved invariants:

- the inquiry stays attached to **exactly one** selected `facility_id`;
- no matching, redistribution, reassignment, or advisor routing;
- high-intent metadata, `inquiry_type`, idempotency key, `ip_hash` unchanged;
- reply-email behaviour (`reply_email` / `reply_email_verified`) unchanged;
- the retired lead-redistribution invariant comment is retained.

---

## 6. Free / non-Pro direct-contact contract

The direct-contact panel (`src/components/profile/FacilityDirectContact.tsx`)
renders **only** actions backed by real, already-public facility data:

| Action | Rendered when |
|---|---|
| Call facility | the listing has a phone with ≥ 10 digits |
| Visit facility website | the listing has a website that parses as an http/https URL |
| Get directions | there is a street address, **or** a city *and* a state |
| Continue searching | always |
| Compare facilities | always |

If none of the first three are available the panel states *"Direct contact
information is not available for this facility yet."* and offers only the two
directory actions. Nothing is manufactured, and a RehabLookup support number is
never offered as a treatment-navigation path.

Not rendered, called, or collected anywhere on this path: name, email, phone,
insurance member details, clinical intake answers, preferred contact, free-text
message; `send-verification-code`, `verify-code`, `check-email-verified`,
`submit-qualified-lead`, `submit-marketing-lead`, `submit-concierge-intake`.

---

## 7. `DIRECT_CONTACT_REQUIRED` response contract

`submit-qualified-lead` returns **HTTP 200** with:

```json
{
  "ok": true,
  "action": "DIRECT_CONTACT_REQUIRED",
  "direct_contact_required": true,
  "facility_id": "<uuid>",
  "facility_name": "<public facility name>",
  "reason": "facility_not_pro" | "entitlement_unconfirmed",
  "_version": "3.0.0"
}
```

Invariants:

- it is **not** represented as a successful lead submission (`success` absent);
- no `leadId`, no `inquiry_id`, no `confirmation_path`;
- no `routing_mode` — and specifically never `free_tier_redirect`, nor any
  replacement pseudo-mode implying RehabLookup will handle the inquiry;
- no seeker PII echoed back;
- `reason` is a non-sensitive diagnostic only.

`entitlement_unconfirmed` is returned when the `has_active_pro()` RPC itself
errors. **An entitlement failure fails SAFE to direct contact and is never
routed into concierge.**

---

## 8. PII processing order (the core safety property)

The entitlement gate sits immediately after facility identity resolution and
**before every PII-dependent operation**:

```
1. accept POST
2. parse body
3. extract + validate facilityId (the only field read pre-gate)
4. load facility (identity, status, suspended)
5. reject unapproved / suspended
6. has_active_pro(facility_id)
7. not confirmed true  → DIRECT_CONTACT_REQUIRED  ← returns here
8. ── ACTIVE PRO ONLY BELOW ──
   sanitise PII → validate name/email/phone → blocked-identifier lookup →
   email-verification lookup → idempotency → duplicate query → rate limits →
   leads insert → notifications
```

Consequently a non-Pro request carrying **only** `{ facilityId }` — no name, no
email, no phone — reaches `DIRECT_CONTACT_REQUIRED` successfully, because the
platform does not accept those fields for that facility. Nothing is read from,
written to, or logged about the seeker on that branch.

Both properties are proven at runtime by
`src/__tests__/submit-qualified-lead-routing.test.ts`, which executes the real
handler against recording stubs and asserts the *exact* set of tables read,
rows inserted, RPCs called, and functions invoked.

---

## 9. Historical `InquiryConfirmation` compatibility

`/inquiry/confirmation/:inquiryId` is **retained as a legacy compatibility
page** so links already sent to seekers keep resolving. It is not part of any
current flow:

- no Stage-2 code navigates there;
- `submit-qualified-lead` no longer returns a `confirmation_path`;
- no new `free_tier_redirect` row can be created by the seeker-facing site.

Hardened in this stage:

- the id must be a well-formed UUID, else redirect to `/search-results`;
- the row must exist **and** have `routing_mode = 'free_tier_redirect'`, else
  redirect to `/search-results`;
- forward-looking promises removed ("within 1 business hour", "1–2 additional
  matched facilities", "3 facilities matching your insurance");
- remaining coordinator language is scoped to *this existing request*, which
  is truthful for historical cases still being serviced;
- the retained RehabLookup phone number is explicitly labelled *"Support for
  this inquiry only — this is not a treatment placement or referral
  helpline."*;
- a code comment records that the route exists only until the Stage-4
  historical concierge data/workflow retirement.

---

## 10. Removed `submit-marketing-lead` fallback

`RequestInfoModal.handleConciergeFallbackSubmit` → `submit-marketing-lead` is
**removed**, along with the *"our team will match you with the right program and
follow up shortly"* banner it backed.

A facility record that fails to load now renders a safe failure state
(*"We couldn't load this facility's details"* + Continue searching + Compare
facilities) and collects nothing.

`submit-marketing-lead` itself is **not** deleted — the call-graph audit shows
legitimate remaining callers:

| Remaining caller | Surface |
|---|---|
| `src/pages/AdLanding.tsx` | paid-ad marketing landing funnel |
| `src/pages/MarketingLanding.tsx` | marketing landing funnel |
| `supabase/functions/_tests/email-required-integration_test.ts` | contract test |

Provider/admin marketing cleanup is explicitly **not** Stage-2 scope.

---

## 11. Orphaned functions deliberately NOT deleted

Left fully in place, deployed and untouched, for Stage 4:

`submit-concierge-intake`, `match-concierge-intake`,
`notify-free-tier-inquiry-redirect`, `placement-cron`, `placement-monitor`,
`send-placement-review-requests`, `send-concierge-notifications`,
`send-tour-notifications`, `detect-and-prerender`, `prerender-for-bots`.

> **`notify-free-tier-inquiry-redirect` may remain deployed after this source
> cutover, but becomes unreachable from `submit-qualified-lead` once Stage 2 is
> deployed.** It has no other invoker in the repository.

A regression guard asserts these directories still exist, so a later stage
cannot delete them by accident while Stage 2 is the active change.

---

## 12. `prerender-for-bots` / `detect-and-prerender` caller status

**Verified for this stage: still no active Vercel/public-app caller.**

- `middleware.ts` does not reference either function; crawler routing uses
  static prerendered HTML with an `og-share` fallback.
- The only repository references are the allowlist entries in
  `scripts/check-edge-function-auth.mjs`.

The active production `prerender-for-bots` still contains legacy `/concierge`
and "24/7 confidential help" fallback content, and `detect-and-prerender` can
call it. Neither is reachable from the site today, so **this stage does not
delete or modify them** — both are added to the Stage-4 inventory below. A test
guard (`inquiry-routing-cutover-guards.test.ts`) fails if a `middleware.ts`
caller is ever reintroduced.

---

## 13. Safe rollout order (documented — **NOT executed in this task**)

1. **A.** Land/deploy the frontend so Free/non-Pro users cannot submit PII.
2. **B.** Verify production Free/non-Pro facility pages are direct-contact-only.
3. **C.** Deploy the independently verified new `submit-qualified-lead`.
4. **D.** Verify a non-Pro, no-PII entitlement request returns
   `DIRECT_CONTACT_REQUIRED`.
5. **E.** Verify active-Pro inquiry behaviour without generating a fake patient
   lead.
6. **F.** Only then consider the old free-tier routing writer closed in
   production.

Frontend-first is deliberate: while the *old* production
`submit-qualified-lead` is still deployed, any Free/non-Pro submission would
still create a concierge case. Do **not** submit seeker inquiry forms against
the branch Preview — the Preview may point at production Supabase.

`scripts/lead-e2e.mjs` (manual, read-only/negative-path) was updated to accept
both post-cutover outcomes so it does not report a false failure between steps
A and C.

---

## 14. Stage-3 dependencies

Stage 3 (provider/admin concierge removal) can begin once Stage 2 is deployed
and verified, because after step F no new concierge cases exist to service.
It will cover:

- `/provider/billing/concierge`, `/provider/marketing/concierge`,
  `/admin/concierge` and their supporting components;
- renaming provider **Leads → Inquiries**;
- retiring the `advisor` admin role and advisor dashboards/inboxes;
- Concierge Stripe products/prices;
- provider/admin marketing cleanup (including remaining
  `submit-marketing-lead` surfaces).

None of that is started here.

## 15. Stage-4 retirement inventory

Backend retirement, only after every writer *and* reader is gone:

**Edge functions** — `submit-concierge-intake`, `match-concierge-intake`,
`notify-free-tier-inquiry-redirect`, `save-placement-draft`,
`save-international-placement-draft`, `placement-cron`, `placement-monitor`,
`send-placement-review-requests`, `send-concierge-notifications`,
`send-concierge-introduction`, `send-tour-notifications`,
`record-introduction-decision`, `auto-decline-stale-introductions`,
`get-inquiry-match-candidates`, `link-inquiry-to-user`,
`request-concierge-sms-callback`, `admin-bulk-reassign-concierge-advisor`,
`admin-bulk-update-concierge-status`,
**plus** `detect-and-prerender` and `prerender-for-bots` (legacy `/concierge`
and "24/7 confidential help" fallback content).

**Frontend** — `src/pages/InquiryConfirmation.tsx` and its route registration
in `src/App.tsx`; the admin concierge surfaces enumerated in Stage 3.

**Database** — `concierge_inquiries` (incl. `routing_mode`),
`concierge_case_events`, `concierge_introductions`, placement/tour tables, the
`advisor` admin role, and the related RPCs/RLS policies/triggers. Regenerate
`src/integrations/supabase/types.ts` only at that point.

---

## 16. Verification performed on this branch

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | 216 problems (180 errors, 36 warnings) — **identical to the starting SHA**; no new issue in any touched file |
| `npm run test` | **635 passed / 635** (584 pre-existing + 51 new) |
| `npm run check:directory-public-shell` | pass |
| `npm run check:prerendered-shell` | pass |
| `npm run check:internal-links` | pass (0 unmatched) |
| `npm run check:redirect-targets` | pass (0 dead) |
| `npm run check:no-internal-404` | pass (46,687 paths) |
| `npm run check:sitemap-coverage` | pass |
| `npm run check:facility-sitemap-sync` | pass |
| `npm run validate:sitemap-robots` | pass |
| `npm run check:structured-data` | pass |
| `npm run check:seo-meta` | pass (0 errors) |
| `npm run build:vercel` | pass |

New regression coverage:

- `src/__tests__/submit-qualified-lead-routing.test.ts` — 13 behavioural tests
  executing the real edge handler (cases A–F).
- `src/components/profile/RequestInfoModal.routing.test.tsx` — 15 UI tests.
- `src/components/lead-intake/useLeadIntakeForm.directContact.test.tsx` — 4
  tests for the server-authoritative downgrade.
- `src/pages/InquiryConfirmation.legacy.test.tsx` — 5 legacy-compatibility tests.
- `src/__tests__/inquiry-routing-cutover-guards.test.ts` — 14 scoped
  no-regression guards.
- `src/__tests__/helpers/edgeFunctionHarness.ts` — reusable in-process Deno
  edge-function harness (no network, no Supabase project).

---

## 17. Verification hotfix #1 — prerender contact parity + Pro email copy

Independent verification of the stage-2 Preview found **two** contradictions
the original stage-2 report missed. Both are corrected in a single follow-up
commit on this same branch. Neither changes the DB, Stripe, Pro pricing,
Featured behaviour, or any provider/admin surface, and neither deploys the
edge function.

### 17.1 Blocker 1 — the static/crawler facility mirror ignored entitlement

**What was wrong.** Stage 2 routed the *React* facility-contact path by
entitlement, and `submit-qualified-lead` refuses a non-Pro inquiry with
`DIRECT_CONTACT_REQUIRED`. But `scripts/generate-facility-profiles-html.mjs`
— the crawler-facing static mirror at `/center/<slug>.html` — rendered its
contact CTA and its contact/insurance FAQ answers **unconditionally**.

On the real stage-2 Preview, the generated page for a genuinely Free facility
(`Tony Rice Center, INC`, slug
`tony-rice-center-inc-shelbyville-tn-cfa6cfec`, `is_pro = false` at
verification time) still shipped:

- `<h2>Request Information from Tony Rice Center, INC</h2>`
- `/center/tony-rice-center-inc-shelbyville-tn-cfa6cfec?action=request-info`
- a `Request Information` button as the primary contact mechanism
- FAQ/JSON-LD copy: *use the "Request Information" form on the RehabLookup
  profile*
- insurance FAQ copy: *request a benefits verification through the profile*

So the crawler-served document advertised an on-platform inquiry form for a
facility whose inquiries the server would reject.

**Root cause.** Not missing entitlement data — the generator already selects
`public_facilities.is_pro`, and already uses it to gate the Pro-only *rich*
sections (`renderProRichSections` returns `""` when `is_pro` is falsy). The
CTA block and `buildFaqItems()` simply never consulted it. `is_pro` gated
*content richness* but not *contact routing*.

**Why the existing guards missed it.** `check:directory-public-shell` hunts
retired **Concierge/placement marketing**. "Request Information" is not
retired marketing — it is a live, legitimate affordance that is merely
entitlement-scoped, so no rule fired. `check:prerendered-shell` is a *drift*
check ("does this committed page still match what the generator would
emit?"), and the committed page matched the generator perfectly — the
generator itself was wrong.

### 17.2 Blocker 2 — the Pro seeker email promised alternate-provider coordination

`supabase/functions/submit-qualified-lead/index.ts` correctly kept a Pro
inquiry attached to exactly one selected facility, but its seeker
confirmation template still read:

> **Haven't heard back?** If 48 hours pass without a response, reply to this
> email or contact us at help@rehablookup.com and we'll help connect you with
> another provider.

RehabLookup may provide the directory. It must not promise that staff will
connect, match, find or arrange another provider.

### 17.3 Entitlement source (unchanged and non-duplicated)

The generator still reads **`public_facilities.is_pro`** and nothing else.
That column is the build-time projection of the canonical `has_active_pro(id)`
predicate — tier, status, `past_due` grace and `current_period_end` are all
resolved in Postgres. The fix explicitly does **not**:

- query `facility_subscriptions`,
- re-implement `tier = 'pro'` / status / grace / period-end rules in JS, or
- derive routing from `featured`.

`isActivePro(f)` returns `f?.is_pro === true` and **fails safe**: `false`,
`null`, `undefined`, a missing column, a string `"true"`, or any unexpected
shape all route to direct contact. Over-showing an inquiry form on a Free
listing is the exact failure this stage exists to prevent, so ambiguity always
resolves to `direct`.

### 17.4 The contact-routing marker

Every generated facility page now carries `<body data-page="facility-profile">`
and **exactly one** routing classification on the CTA wrapper:

| Marker | Emitted when | Static page may offer |
|---|---|---|
| `data-contact-routing="pro"` | `facility.is_pro === true` | Request Information for **that one** facility, plus direct phone / website / directions where real data exists |
| `data-contact-routing="direct"` | everything else | direct facility contact only — no `?action=request-info`, no RehabLookup inquiry-form promise |

The marker is never derived from Featured.

### 17.5 Free / non-Pro static profile

The unconditional CTA was replaced by **Contact `<FACILITY NAME>` Directly**,
with actions emitted only where the facility's own data supports them:

- **Call `<phone>`** — only when `phone` exists
- **Visit Facility Website** — only when `website` is an absolute `http(s)` URL
  (`safeExternalUrl()`; blank / relative / `javascript:` values yield no action)
- **Get Directions** — Google Maps link built from the row's real
  name + address + city + state
- **View Full Profile** and **Search Other Treatment Centers** (`/search-results`)

No phone, website or address is ever manufactured, and RehabLookup's own
support number is never substituted for a missing facility number. A listing
with neither phone nor website says so plainly ("has not published a direct
phone number or website on RehabLookup") and still offers profile/search
recovery — a map link is treated as a *location* affordance, not as a way to
reach admissions, so it cannot make an unreachable listing read as contactable.

### 17.6 Active Pro static profile

Retains `Request Information` → `/center/<slug>?action=request-info`, pinned to
that one slug, because the React profile renders the on-platform inquiry form
and the server accepts an inquiry for it. Direct phone / website / directions
remain alongside. The copy promises no matching, no routing to alternatives, no
advisor or coordinator, and no multi-facility distribution ("Your details go to
this facility only — no obligation").

### 17.7 FAQ / structured data

`buildFaqItems()` is now entitlement-aware. Because the same items render as
visible HTML **and** as `FAQPage` JSON-LD, one fix keeps both aligned.

| FAQ | Pro | Free / non-Pro |
|---|---|---|
| *How do I contact …?* | may reference calling the facility and the "Request Information" form on its profile | facility's real channels only — call directly / visit the website; "contact admissions directly to confirm insurance benefits, availability, costs, and program details". If neither exists, says so and falls back to the profile + directory search |
| *Does … accept insurance?* | confirm with the facility's admissions team; may mention a confidential inquiry through the profile | **"Contact the facility directly to confirm benefits and out-of-pocket costs."** |

The unsupported per-facility response-time claim (*"typically responds the same
business day"*) was removed from **both** modes — there is no source-backed
metric behind it, and neutral wording is preferred.

### 17.8 New build guard — `check:inquiry-routing-prerender`

`scripts/check-inquiry-routing-prerender.mjs`, wired into `build:vercel`
**after** `vite build` so it sees both `public/center/**` and the built
`dist/center/**`. `check:directory-public-shell` is unchanged and both guards
now run.

Rules, scoped to generated `/center/*.html` only:

0. any center page — `?action=request-info` requires a `pro` marker
1. facility-profile pages — exactly one marker, value `pro` or `direct`
2. `direct` — no `?action=request-info`, no *"Request Information" form on
   the …* promise, no *request a benefits verification through the profile*,
   no *send a confidential inquiry through the profile*, and no
   `<h2>Request Information from …` as the primary contact mechanism
3. `pro` — the inquiry CTA is allowed but must target the page's **own** slug

Coordination promises (connect you with another provider, we'll find/match a
provider, our advisors/coordinators, sent to multiple facilities) are forbidden
in **both** modes. The words "request information" are **not** banned globally —
editorial prose, provider/admin surfaces, historical migrations and docs are
out of scope. This is a generated-facility-profile contract.

### 17.9 Pro seeker email correction

The alternate-provider paragraph now reads:

> **Haven't heard back?** You can return to RehabLookup to
> [continue searching](https://rehablookup.com/search-results) and contact
> another treatment center directly — you choose where to reach out next.

No support-escalation workflow, no fallback matching, no another-provider
handoff, no Concierge or referral case was created. The email remains about
the one facility the inquiry was actually sent to.

### 17.10 Active-Pro copy audit

Audited the seeker confirmation email, `RequestInfoModal` success view,
`LeadIntakeForm` / `LeadIntakeSuccess` / `useLeadIntakeForm`,
`FacilityDirectContact`, `useFacilityContactRouting` and `SingleQuestionFlow`
for *we'll connect / another provider / we'll find / matched provider /
advisor / coordinator*.

- The React success surfaces were already clean — they name the facility as the
  responder and the keep-searching CTA is plain directory navigation.
- One borderline string was tightened: `SingleQuestionFlow` step subtitle
  *"We'll find treatment centers near you"* → *"Used to show treatment centers
  near you"* (directory-first phrasing).
- Historical `InquiryConfirmation`, the stage-4 legacy functions, old
  migrations and history docs were deliberately **not** touched.

### 17.11 Server boundary preserved

`submit-qualified-lead` ordering is unchanged — facility identity → facility
eligibility → `has_active_pro()` → `DIRECT_CONTACT_REQUIRED` when Pro is not
confirmed → PII processing **only** for active Pro. `VERSION` stays `3.0.0`
(no convention required a bump). The `directContactResponse` contract, absence
of concierge writes / advisor lookup / `notify-free-tier-inquiry-redirect`,
Pro lead insertion, the Pro notification pipeline, the single selected
`facility_id`, email verification, rate limits and idempotency are all intact.
Only the email template string and an explanatory comment changed.

### 17.12 Regression coverage added

`src/__tests__/facility-prerender-contact-routing.test.ts` (26 tests) imports
the **real** generator and the **real** guard and renders real HTML from
fixtures — no network, no Supabase. `main()` in the generator is now guarded
behind an invoked-directly check (the same pattern
`check-directory-public-shell.mjs` uses) so importing it neither fetches nor
writes.

- **Fixture 1 — Free, full data** (`is_pro: false`, phone + website + address):
  `direct` marker; call / website / directions actions present; no
  `?action=request-info`; no inquiry-form promise; no benefits-verification-
  through-the-profile; insurance and contact FAQ direct the seeker to the
  facility, asserted in **both** visible HTML and `FAQPage` JSON-LD.
- **Fixture 1b — Free, no phone and no website**: `direct` marker; no
  manufactured contact action; RehabLookup's support number not substituted;
  profile + `/search-results` recovery still present.
- **Fixture 2 — Active Pro** (`is_pro: true`): `pro` marker; Request
  Information CTA present and pinned to its own slug; direct contact retained;
  no matching / advisor / coordinator promise.
- Entitlement fail-safe: `false`, `null`, `undefined`, `"true"`, `1`, `{}` and
  a missing column all yield `direct`; `featured: true` on a Free row still
  yields `direct`.
- The guard itself is proven to **fail** on the pre-hotfix regression (a direct
  page carrying the old Request Information CTA) and on a missing marker.

`src/__tests__/submit-qualified-lead-routing.test.ts` gains a test that runs
the real edge handler on the Pro path and asserts the sent seeker email
contains no alternate-provider coordination promise and **does** contain
`https://rehablookup.com/search-results`.

### 17.13 Verification results (hotfix #1)

| Check | Result |
|---|---|
| `npm run typecheck` | pass |
| `npm run lint` | 216 problems (180 errors, 36 warnings) — **unchanged baseline**; no new issue in any touched file |
| `npm run test` | **662 passed / 662** |
| `npm run check:directory-public-shell` | pass (46,679 artifacts) |
| `npm run check:inquiry-routing-prerender` | pass (new) |
| `npm run check:prerendered-shell` | pass |
| `npm run check:internal-links` | pass (0 unmatched) |
| `npm run check:redirect-targets` | pass (0 dead) |
| `npm run check:no-internal-404` | pass (46,687 paths) |
| `npm run check:sitemap-coverage` | pass |
| `npm run check:facility-sitemap-sync` | pass |
| `npm run validate:sitemap-robots` | pass |
| `npm run check:structured-data` | pass |
| `npm run check:seo-meta` | pass (0 errors) |
| `npm run build:vercel` | pass |

The local sandbox cannot reach the Supabase host (egress allowlist), so
`generate:facility-profiles-html` skips there and the local guard run sees 0
facility profiles. **The Vercel Preview build is therefore the authoritative
check for the generated mirror** — it builds from live Supabase, and the new
guard runs inside it.

### 17.14 Rollout status after this hotfix

- Production `submit-qualified-lead` is **still the old deployed function**.
  Nothing was deployed in this hotfix.
- No production Supabase write, no migration, no Stripe change. Pro remains
  $99/month; Featured is untouched.
- Provider/admin Stage-3 work has not started.
- The Preview was not promoted and `main` was not merged.
- The controlled rollout described in §13 remains **pending**.
