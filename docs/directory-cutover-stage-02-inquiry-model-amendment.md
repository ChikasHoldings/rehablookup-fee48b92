# Directory cutover — Stage 2 inquiry-model amendment

**Status:** source + preview only. Migration NOT applied. No Edge Function deployed. Not merged.
**Branch:** `directory-cutover-02-inquiry-routing`
**Baseline:** `cb2fde1806f3c846ab6d31f36f9c0a7c0326467d`

---

## 1. Why Stage 2's policy changed before merge

Stage 2 shipped an inquiry model gated on entitlement:

| Facility state | Stage 2 behaviour |
| --- | --- |
| Active Pro | On-platform inquiry form → that facility's inbox |
| Everything else | `DIRECT_CONTACT_REQUIRED`; no form, no persistence. The seeker was shown the facility's **phone number** and told to call it themselves |

Two problems, discovered while verifying that work:

1. **It monetized the wrong thing.** Gating *inquiry eligibility* meant the vast majority of the directory (3,794 approved facilities, **0** of them Pro) could not be contacted on-platform at all. A directory whose contact button only works for paying listings is not much of a directory.
2. **The thing it gave away for free was the thing worth selling.** The non-Pro path handed out the facility's phone number — which is exactly the contact channel a provider would pay to publish.

So the two axes were swapped. The amendment is deliberately narrow: **inquiry eligibility is now universal; phone visibility is now the paid feature.** Nothing else about the monetization changed.

---

## 2. Final entitlement matrix

| Capability | Free / claimed | Featured + non-Pro | Active Pro | Unclaimed (approved) |
| --- | --- | --- | --- | --- |
| Appears in directory | ✅ | ✅ (boosted placement) | ✅ | ✅ |
| Seeker may send an inquiry | ✅ | ✅ | ✅ | ✅ (stored, see §9) |
| Inquiry pinned to that one facility | ✅ | ✅ | ✅ | ✅ |
| Website / directions (when real) | ✅ | ✅ | ✅ | ✅ |
| **Public phone number** | ❌ | ❌ | ✅ | ❌ |
| **Call Facility action / `tel:`** | ❌ | ❌ | ✅ | ❌ |
| **`telephone` in public JSON-LD** | ❌ | ❌ | ✅ | ❌ |
| Provider receives the inquiry | ✅ | ✅ | ✅ | ❌ (no verified recipient) |

**Featured never unlocks a phone.** Featured is paid *visibility*. `verified`, `is_claimed`, `has_facility_verified_contact` and a merely non-empty `phone` column are all equally irrelevant. The only key is `has_active_pro(id) === true`.

Pro buys **product features**, not a different seeker's inquiry: there is no priority lane, no routing distinction, and no queue ordering by tier.

---

## 3. The live leak found during verification

This was **not** a UI-only problem. Two independent public paths returned a non-Pro facility's raw phone in production.

### 3.1 `public_facilities` selected raw `phone`

The Pro `CASE` had been deliberately removed by `20260714000000_drop_pro_pii_gating_on_public_facilities.sql` under the then-current "remove all PII gating" directive, and was never restored when Pro became a contact tier again. The view selected a bare `phone` column.

Worse, `supabase/functions/get-public-facilities/index.ts` carried this comment:

> *"Pro-gated fields (phone/email/website) are masked to null by the `public_facilities` view for non-Pro facilities"*

That statement was false on three counts — the mask did not exist, and `email`/`website` are not Pro-gated by product decision. The endpoint **read as if it had been audited**. This is the single most important lesson from the incident and is why the new guards assert mechanisms rather than prose.

### 3.2 The base table was directly readable — so gating the view would have fixed nothing

```
GRANT SELECT ON public.facilities TO anon;                      -- 20260523011251
POLICY facilities_select_public  TO public
  USING (status = 'approved' AND COALESCE(suspended,false) = false)
```

`TO public` covers **anon and every authenticated seeker**. Any caller could skip the view entirely:

```sql
select phone from facilities where id = '<free facility>';
```

Reproduced on production as `anon` against **Tony Rice Center, INC** (`3b11bad0-6d79-431c-9e39-605064080a56`, `is_pro = false`, approved, unclaimed) — it returned `931-685-0957`.

### 3.3 A third leak, found while auditing the rest of the surface

`get-featured-rotation` (public, `verify_jwt = false`, service-role reads) computed:

```ts
display_phone: f.has_facility_verified_contact && f.verified_phone ? f.verified_phone : f.phone
```

with **no entitlement check at all**, for both the paid Featured pool (which requires only `has_featured` / `has_concierge_partner` — *not* `tier='pro'`) and the top-rated **fallback pool**, which requires no subscription whatsoever. A Featured-only facility, and even a completely unsubscribed one, had its raw phone broadcast on a public endpoint.

---

## 4. The new public data boundary

Migration source: **`supabase/migrations/20260831000000_pro_gate_public_facility_phone.sql`** — sorts after every existing migration (previous last: `20260830000100`). **NOT APPLIED.**

### 4.1 View mask

```sql
CASE WHEN has_active_pro(id) THEN phone ELSE NULL::text END AS phone
```

`has_active_pro()` is the canonical, grace-aware predicate. Subscription logic is **not** re-implemented in SQL or TypeScript anywhere in this change.

`public_facilities` has `reloptions = NULL` in production — i.e. it is **SECURITY DEFINER** and runs as `postgres`. That is what lets it still read the raw column in order to mask it, and why the grant/policy changes below do not break it. (The `SECURITY DEFINER` comments in `20260829004900` were verified against production rather than trusted.)

### 4.2 Closing the base-table bypass

| Role | Before | After |
| --- | --- | --- |
| `anon` | approved rows, **all columns incl. phone** | approved rows, **every column except `phone`** (column privilege revoked) |
| authenticated seeker | approved rows, all columns | **no SELECT policy at all** on `facilities` |
| facility owner | own rows, all columns | **unchanged** |
| facility team | `user_can_access_facility` rows | **unchanged** |
| admin | all rows | **unchanged** |
| `service_role` | all rows | **unchanged** |

Two different mechanisms, chosen deliberately:

- **anon → column privilege.** Table-level `SELECT` implies every column, so it is revoked wholesale and re-granted per column from the live column list minus `phone`. This is a hard privilege boundary that RLS cannot be tricked past, and it is **fail-closed**: a column added to `facilities` later is not granted to anon until someone does so on purpose.
- **authenticated → row policy.** Column grants are role-wide, and providers/admins are *also* `authenticated`, so a column revoke there would break provider editing. Instead the blanket `TO public` policy is replaced with an `anon`-scoped one, leaving ordinary seekers matching no policy while `facilities_select_authenticated` (admin OR owner) and `facilities_team_select` are untouched.

### 4.3 Collateral the boundary required

Removing public raw-row access breaks anything that quietly depended on it. Each was migrated **before** the policy was tightened:

| Consumer | Problem | Fix |
| --- | --- | --- |
| `public_facility_accreditations` / `_amenities` / `_programs` / `_staff`, `facility_badge_recency` | `security_invoker=true` views joining `facilities` directly | Repointed to `JOIN public.public_facilities`. They stay INVOKER, so RLS on *their* base tables is unchanged — this widens nothing |
| `facility_name_aliases_select_public` | RLS policy with an inline `EXISTS (SELECT 1 FROM facilities …)`; an RLS subquery runs with the caller's own RLS, so it would have silently gone dark for anon and broken slug-alias/legacy-URL resolution | Rewritten to use `is_approved_facility()` (SECURITY DEFINER, anon-executable) |
| `seeker/InquiryDetailModal`, `SeekerHeader`, `SeekerRequests`, `SeekerReviews` | Read `facilities` directly as authenticated seekers | Repointed to `public_facilities`. `InquiryDetailModal` also selected `phone` — now masked, which is the correct outcome |

**Known cosmetic residual:** `TrustStrip` counts `facilities where verified = true` (currently 3 rows) directly. anon keeps row access so it is unaffected; for a *logged-in* visitor the count now returns 0 and the component falls back to its "Verified" label. It is explicitly fail-silent and non-critical. It was left alone on purpose: `public_facilities.verified` is Pro-masked, so repointing it would report ~0, and `get_directory_stats()` counts *approved* (3,794), which would inflate a "Vetted treatment centers" claim.

### 4.4 What the migration deliberately does not do

- Does **not** null, move or delete `facilities.phone`. The raw number stays stored and remains authorized data for owner / team / admin / service-role, including claim SMS and voice verification.
- Does **not** gate name, address, website, directions data, or any other directory metadata. **Phone is the only newly gated field.**
- Does **not** touch pricing, Stripe, Featured, or claim state.

---

## 5. Defence in depth in the public API

The database mask alone is not enough, because the public Edge functions read with the **service role**, which bypasses RLS by design.

| Function | Change |
| --- | --- |
| `get-public-facilities` | `phone: isPro ? f.phone : null`, where `isPro = f.is_pro === true`. The false comment was replaced with the exact contract. `website` is explicitly **not** gated |
| `get-featured-rotation` | New `fetchProFacilityIds()` batch-resolves canonical Pro via `public_facilities.is_pro` (one query, no per-row RPC, no re-derived subscription logic) and fails **closed** to an empty set on error. `display_phone` is `null` unless the facility is in that set |
| `get-featured-facilities` | Audited — returns no phone field. No change |
| `prerender-for-bots` | Audited — already gated on `isPro && f.phone`. No change |
| `sitemap-facilities`, `detect-and-prerender`, `log-phone-click`, `track-featured-analytics` | Audited — no facility phone in any response |

This also means the responses are safe **on the old schema**, before the migration is applied.

---

## 6. Frontend: capability model

`useFacilityContactRouting` (`"pro" | "direct"`) is **deleted**. It encoded a rule that no longer exists, and both tiers now use the same form. `FacilityDirectContact.tsx` is **deleted** — the experience it implemented is gone, and dead components are not kept for history.

Replaced by `useFacilityContactCapabilities`, whose two axes are independent:

```ts
canSubmitInquiry   // = isApproved.  NOT derived from entitlement.
showPhone          // = data.is_pro === true.  The only phone key.
phone              // ALWAYS null when showPhone is false.
```

One shared rule, `src/lib/facilityPhoneVisibility.ts`, is used by every public surface (`resolvePublicFacilityPhone`). It gates on `isPro !== true` → hidden, never consults Featured/verified, and returns no display value *and* no `tel:` href when hidden, so a caller cannot render digits by reading the wrong field.

**Fail-closed on purpose.** During the controlled rollout the frontend can be live against a database whose migration has not been applied, so the old backend will happily return a Free facility's raw phone. The client refuses to render it regardless. This is what makes preview verification meaningful before the DB changes (§13).

Surfaces audited and gated: `CenterProfile` (hero CTA, contact card, sidebar CTA, mobile CTA row, sticky mobile call bar, LocalBusiness structured data), `SearchResultCard`, `TreatmentCenterCard`, seeker `FacilityCard`, `SeekerSaved`, `Comparison`, `FeaturedStripCard` (pre-gated server-side), the contact modal.

**Removed substitution:** `CenterProfile`'s non-Pro branch previously rendered the SAMHSA National Helpline **inside the facility's "Phone" slot**. A number in a facility's phone slot reads as that facility's number; substituting one would misdirect someone in crisis. The slot is now simply absent. SAMHSA/988/911 remain in the page's crisis footer, labelled as theirs.

---

## 7. Contact modal rebuild

`RequestInfoModal.tsx` keeps its filename (avoiding route/import churn) but the concept is now **"Contact <Facility>"**.

- **Header** — facility name, city/state, "Send an inquiry directly to this treatment center."
- **Pro contact strip** — phone + Call Facility, secondary to the form, styled as a quiet outline card rather than a dominant primary CTA. No trust implication, no "Pro Provider" crown, no "recommended".
- **Form** — the same for every tier.
- **Secondary actions** — website / directions when the data is real.

The old `SingleQuestionFlow` (967-line, one-question-at-a-time placement intake asking age range, gender, veteran status, legal involvement, prior treatment, co-occurring conditions, readiness level) is **not used** on this surface. It remains for the standalone marketing funnels. The replacement is `FacilityInquiryForm`:

| Required | Optional |
| --- | --- |
| First name, Last name, Email | Your phone, Preferred contact, What are you looking for (level of care), Insurance or payment, Timeline, Message |

**Seeker phone vs facility phone.** The seeker's own callback number is optional on every tier. The Pro restriction is about the **facility's published number** and has nothing to do with whether a seeker may leave one.

**Preferred contact** offers *Email* only, until the seeker supplies a usable 10-digit number — then *Email / Phone call / Text*. A stale phone/text selection collapses back to Email when the number is cleared. Offering "call me back" with no number is a promise nobody can keep.

**Preserved, not relaxed:** server-side email verification, the idempotency key, the 3s submission debounce, the honeypot, and the exact request field names the hardened backend expects. Verification presentation is cleaner (inline card; verifying submits in one step) but the requirement is intact.

**Accessibility:** `RadioGroupItem` renders a `<button role="radio">`, which is **not labellable** — `<label htmlFor>` alone left it with no accessible name. Each now carries an explicit `aria-label`. Errors use `role="alert"` + `aria-describedby`; inputs are `h-11`, chips `min-h-11`; the dialog is `max-h-[92dvh]` with `overscroll-contain`.

---

## 8. Backend: `submit-qualified-lead` 3.0.0 → **3.1.0**

Ordering (PII processing still begins only after the destination is proven):

1. Parse body
2. Read **only** the facility identifier
3. Validate UUID
4. Resolve the facility from trusted server-side data
5. Confirm it exists
6. Confirm approved + not suspended
7. **Immutable destination established** — and delivery *capability* resolved (`facilityIsClaimed`)
8. **Only now** sanitize seeker PII
9. Blocked-identifier check → 10. server-side email verification → 11. idempotency → 12. duplicate → 13. rate limits
14. Insert **one** row pinned to `leads.facility_id`
15. Notify the provider (only when a verified recipient exists)
16. Truthful seeker confirmation
17. Return success

**The Pro gate is gone.** `has_active_pro` is no longer called in this handler at all — which is the point: there is no code path by which entitlement can refuse an inquiry.

**`DIRECT_CONTACT_REQUIRED` is fully retired server-side.** No constant, no helper, no emission. The *client* keeps a defensive handler purely for the rollout window in which an older deployed copy answers a newer client; there it renders a non-success state (no delivered state, no Concierge navigation, no Free phone reveal).

`leads` remains the storage table — renaming it is needless production risk — but a row is conceptually a **facility inquiry**: no exclusivity window, no redistribution window, no credits, no per-lead sale, no unlock step.

---

## 9. Unclaimed facilities — the sharpest edge

An approved listing can have `user_id IS NULL`. The pre-existing notification code resolved:

```ts
notificationEmail = verified reply_email ?? profiles.email ?? facility.email
```

For an unclaimed listing the first two are null, so it fell through to **`facilities.email`** — an unverified address from a SAMHSA/scrape/admin import. That path was unreachable while non-Pro was short-circuited. **Removing the Pro gate would have made it live**, mailing a seeker's name, email, phone and clinical context to an address nobody verified.

Resolution:

- `facilityIsClaimed = !!facility.user_id` is computed **before** any PII is touched.
- When false: **every** notification channel is off (`masterEnabled` is `false`, closing the "missing preferences row defaults to true" hole), and `notificationEmail` is `null`. The `facility.email` fallback is now reachable only for a claimed listing.
- The inquiry **is still stored**, pinned to that facility. Provider RLS is ownership-based, so whoever later claims the listing inherits it.
- The seeker is told the truth via `deliveryState: "stored_pending_claim"`:
  > *"Your inquiry was recorded for X. This listing isn't managed by the facility on RehabLookup yet, so we can't confirm anyone there has seen it. To reach them now, use their own website or address."*

It is never rerouted, never sent to an alternative facility, never handed to an advisor, and never converted into a Concierge case to make the flow "work".

---

## 10. Copy

**Provider email** — removed: "View lead in dashboard", "Providers who respond within the first hour convert up to 7× more leads" (×2), "A potential client just submitted", and the "Connecting families with quality care" tagline (it implies RehabLookup chose the facility). Now: "Someone searching the RehabLookup directory selected X and sent you an inquiry. It was sent to your facility only." / "View inquiry" / "Respond to <name>".

**Seeker confirmation** — removed the "Within 24–48 hours an admissions specialist will reach out" ladder. Now branches on delivery state, promises no response time, no RehabLookup follow-up, no advisor, no alternative facility, and offers self-service directory navigation.

**Static FAQ** — a non-Pro answer must never tell the reader to call, nor quote the digits in prose as a workaround. Visible FAQ and FAQPage JSON-LD are generated from one string, so they cannot disagree.

---

## 11. Static / prerender contract

`data-contact-routing="pro" | "direct"` is replaced by two independent markers on every generated facility page:

```
data-inquiry-routing="facility"        # only legal value
data-phone-visibility="pro" | "hidden" # is_pro === true, nothing else
```

`check:inquiry-routing-prerender` was **rewritten, not weakened**. It now asserts exactly one of each marker, an inquiry CTA targeting the page's own slug, and — for `hidden` pages — no non-allowlisted `tel:`, no JSON-LD `telephone`, no visible `Phone:` line, no Call CTA, plus no coordination or response-time copy.

**Site support vs facility phone.** The shared SEO shell legitimately carries RehabLookup's support number and 988/911/SAMHSA on every page. A blanket `tel:` ban would be both wrong and useless, so the guard allowlists those specific numbers **by digits** and treats any other `tel:` target on a phone-hidden page as a facility leak.

**The fixtures that matter.** A test feeding `phone: null` and finding no phone proves nothing. The Free-claimed and Featured-only fixtures carry a **populated** phone column (`(931) 685-0957`, mirroring the real leaking row) and assert the digits never reach the HTML — masking, not an empty fixture. Five deterministic fixtures: Free claimed *with* phone, Free with website+address, Featured-only non-Pro *with* phone, active Pro *with* phone, and no-phone.

---

## 12. Regression coverage

| Suite | Covers |
| --- | --- |
| `src/test/public-phone-entitlement.test.ts` (34) | View mask; **base-table bypass closure**; anon column revoke; owner/admin/team preserved; dependent views repointed; alias policy; no data destruction; both Edge masks; shared frontend rule; CenterProfile; capability hook; modal accepts no caller phone; prerender gating |
| `src/__tests__/submit-qualified-lead-routing.test.ts` (27) | Cases A–N in-process against the real handler: claimed Free, Pro, Featured-only, **unclaimed PII safety**, suspended, unapproved, unknown, malformed, idempotency, rate limits, blocked identifiers, email verification, PII logging, redistribution |
| `src/__tests__/facility-prerender-contact-routing.test.ts` (42) | The five prerender fixtures, generator + guard agreeing |
| `src/components/profile/RequestInfoModal.routing.test.tsx` (29) | Free / Featured-only / Pro modal matrix, `is_pro` shape table, success copy, transitional `DIRECT_CONTACT_REQUIRED` defence |
| `src/components/profile/FacilityInquiryForm.test.tsx` (17) | Fields, validation, a11y wiring, preferred-contact rules, verification preserved, honeypot, copy |
| `src/__tests__/inquiry-routing-cutover-guards.test.ts` (21) | Source contract: retired files deleted, eligibility not derived from entitlement, ordering, no `DIRECT_CONTACT_REQUIRED`, migration is non-destructive |
| `npm run check:pro-phone-visibility` | New build-time guard across DB + Edge + frontend |

Obsolete Stage-2 tests encoding `Free → DIRECT_CONTACT_REQUIRED` were **rewritten to describe the new product**, not kept green by preserving old behaviour.

---

## 13. Rollout — dependency analysis (do not execute now)

**The combination that must never be live:**

> New Free-inquiry UI **+** old backend that routes Free seeker PII into Concierge.

The Stage-2 rollout order is obsolete because this amendment changes both inquiry behaviour and public DB exposure. Two hazards pull in opposite directions:

- Deploy the **frontend first** → new UI invites Free inquiries; the old function answers `DIRECT_CONTACT_REQUIRED`. Mitigated by the client's defensive handler (non-success, no PII stored, no Concierge, no phone reveal) — degraded, but safe.
- Deploy the **function first** → Free inquiries are accepted and stored while the UI still shows the old flow. Safe.
- Deploy **neither** but apply the migration → Free phones vanish from the API while the old UI expects them. It fails closed (renders nothing). Safe.

Recommended order, each step independently reversible:

| # | Step | Rollback |
| --- | --- | --- |
| 1 | **Apply the migration.** Closes the live phone leak — the only step fixing a real production exposure. Independent of the app: masks a column and tightens a policy | Restore view bodies from `20260830000000`; re-point the five projections at `facilities`; recreate `facilities_select_public`; `GRANT SELECT ON facilities TO anon` |
| 2 | **Deploy `get-public-facilities` + `get-featured-rotation`.** Defence in depth; also fixes the Featured/fallback leak, which the migration does **not** cover (service-role reads bypass RLS) | Redeploy previous versions |
| 3 | **Deploy `submit-qualified-lead` 3.1.0.** Backend accepts universal inquiries *before* the UI offers them | Redeploy 3.0.0 |
| 4 | **Promote the Vercel build.** UI + static artifacts last, against a backend that already honours the new contract | Promote previous deployment |

Verify between steps: after 1, `select phone from public_facilities` as anon for a Free facility → `NULL`, and the raw-table bypass fails; after 3, a Free facility inquiry inserts exactly one `leads` row and writes nothing to `concierge_inquiries`.

**Post-rollout only:** the anon/authenticated authorization behaviour in §4.2 can only be *fully* verified once the migration is applied. Source-level coverage pins the SQL contract; the live matrix (anon cannot read `facilities.phone`; an ordinary authenticated seeker matches no policy; owner/team/admin/claimant unaffected) must be re-checked against the database during the controlled rollout.

---

## 14. Explicitly unchanged

$99/month Pro price · Stripe checkout / webhook / activation / past-due grace · Featured purchase, rotation and placement · claims and provider onboarding · `has_active_pro` as the canonical entitlement (no second phone-specific entitlement table) · Stage-1 public positioning, redirects, article overrides, public-shell guard · the Stage-2 navigation cutover (`Find Treatment · Insurance · Resources · Compare · For Providers`) · SEO generators, sitemaps, reviews · provider/admin surfaces (Stage 3 not started) · legacy Concierge/placement Edge functions (Stage 4 scope) · the `/inquiry/confirmation/:id` legacy route.

---

## 15. Deferred

- **`get-featured-rotation` publishes raw `verified`** while `public_facilities` Pro-masks it (`20260819000000`). A pre-existing inconsistency, out of scope here; flagged rather than changed, since altering badge visibility is a separate product decision.
- **`TrustStrip` for logged-in visitors** (§4.3) — cosmetic, fail-silent.
- **Retiring the Concierge/placement Edge functions and tables** — Stage 4.
- **Provider/admin navigation** — Stage 3.
