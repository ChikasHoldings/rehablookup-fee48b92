# User Panel — Static & Contract Checks (Phase 2)

> Captured: 2026-05-01. All commands run from `/dev-server` (project root).
> Each section has the command, the exit code, and the **finding** (i.e. what to do about it).

## Summary

| Check | Status | Finding |
|---|---|---|
| `validate:seo-schema` | ✅ pass | All SEO pages emit exactly one Breadcrumb / FAQ / ItemList. |
| `validate:sitemap-robots` | ✅ pass | Sitemap fresh, all hub URLs listed, all crawlable. |
| `check:gsc-indexing` | ✅ pass | Sitemaps submitted, robots clean, canonicals self-referencing. |
| `check:structured-data` | ✅ pass | Required schemas declared, JSON-LD parses cleanly. |
| `check:faq-jsonld` | ✅ pass | 964 valid Q/A pairs across pages. |
| `check:aggregate-rating` | ✅ pass | 0 nodes — no pages currently render `<AggregateRating>` star UI without backing JSON-LD. |
| `check:seo-meta` | ✅ pass | Every page ships title/description/canonical/OG. |
| `check:responsive` | ✅ pass | 46 warnings (non-blocking). |
| `check:internal-links` | ✅ pass | No hardcoded paths missing route/SmartCatchAll prefix. |
| `check:edge-fn-no-star` | ✅ pass | No new `select("*")` in edge fns; 13 grandfathered. |
| `check:provider-leads-masking` | ✅ pass | All 111 provider-scoped files read leads via `leads_provider_view`. |
| `window.confirm` ban | ✅ pass | No violations in `src/`. |
| **`select("*")` in user-panel hooks** | ⚠️ flagged | See §Findings F-1 (count-only `head:true` is benign; one `RequestInfoModal` is also count-only). |
| **Forms without Zod** | ⚠️ flagged | See §Findings F-2 (Contact, SeekerSignup, ResetPassword, ProviderSupport, useLeadIntakeForm). |
| **Seeker pages without loading state** | ⚠️ flagged | `SeekerHelp.tsx`. |
| **Seeker pages without empty state** | ⚠️ flagged | 9 pages — see §Findings F-4. |

Pre-build validators that gate `npm run build` are **all green** at audit start.

## Detailed results

### 2.1 SEO validators

```
$ npm run validate:seo-schema
✅ All SEO pages emit exactly one set of Breadcrumb / FAQ / ItemList schema.

$ npm run validate:sitemap-robots
✅ All sitemap URLs are crawlable by Googlebot, all required hubs are listed, and every pre-rendered SEO page is discoverable.
   (Note: an earlier run flagged 297 stale pre-rendered .html files not in sitemap; the validator now reports them as resolved.)

$ npm run check:gsc-indexing
✅ Sitemaps submitted, robots.txt clean, canonicals self-referencing, sitemap fresh.

$ npm run check:structured-data
✅ Required schemas declared and JSON-LD parses cleanly.

$ npm run check:faq-jsonld
Valid Q/A pairs: 964
✅ FAQ JSON-LD audit passed.

$ npm run check:aggregate-rating
AggregateRating nodes found: 0
✅ AggregateRating JSON-LD audit passed.

$ npm run check:seo-meta
✅ Every page ships title, description, canonical, and OG tags.

$ npm run check:responsive
✅ Responsive guards intact (46 warnings).

$ npm run check:internal-links
✅ (no failures).
```

### 2.2 Backend / contract

```
$ npm run check:edge-fn-no-star
✅ no NEW .select("*") found — 13 pre-existing violations grandfathered.

$ npm run check:provider-leads-masking
✅ 111 provider-scoped files read leads through leads_provider_view with explicit columns.
```

### 2.3 `select("*")` scan in user-panel hooks/components

Scanned `src/` for `.from("...").select("*")`. Only count-style queries (`{ count: "exact", head: true }`) and joins (`*, foreignTable(...)`) appear:

```
src/hooks/usePendingConciergeCount.ts:20         .select("*", { count: "exact", head: true })
src/hooks/usePendingInternationalCount.ts:20     .select("*", { count: "exact", head: true })
src/components/profile/RequestInfoModal.tsx:340  .select("*", { count: "exact", head: true })
src/components/admin/concierge/PlacementDetailModal.tsx:549   .select("*, facility:facilities(...)")
src/components/admin/concierge/ConciergeDecisionTab.tsx:30    .select("*, facilities:facility_id(...)")
src/components/admin/concierge/ConciergeDecisionTab.tsx:44    .select("*, facilities:facility_id(...)")
```

**Finding F-1 (Low):** Count-style `select("*", { head: true })` does not retrieve column data and is benign for PII/perf. The two **admin** `concierge_*` queries with embedded relations are out of user-panel scope. **No user-panel violation of the no-star rule.**

### 2.4 Window.confirm ban

```
$ rg -n "window\.confirm" src/
src/components/admin/ConfirmActionDialog.tsx:3: * Replaces window.confirm with a proper AlertDialog ...
```

**Finding:** Only a comment reference — no actual `window.confirm()` call. ✅

### 2.5 Empty/missing CTAs

```
$ rg -n 'to=""|href=""' src/pages src/components
(no matches)
```

**Finding:** ✅ no empty link CTAs detected by static grep.

### 2.6 TODO/FIXME in user-panel forms & pages

```
$ rg -n 'TODO|FIXME|HACK|XXX' src/pages/concierge src/pages/seeker src/pages/international src/components/lead-intake src/components/seeker
(no matches)
```

**Finding:** ✅ no unresolved markers in user-panel hot paths.

### 2.7 Console.log in user-panel forms (privacy hygiene)

```
src/components/lead-intake/useLeadIntakeForm.ts:355   console.log("[useLeadIntakeForm] Submission debounced");
src/components/lead-intake/useLeadIntakeForm.ts:362   console.log("Honeypot triggered");
```

**Finding F-2-bis (Low):** Both logs are non-PII (no email/phone/name). Acceptable. Recommend gating behind `import.meta.env.DEV` for production hygiene but not a blocker.

### 2.8 Forms without Zod validation

| File | Status |
|---|---|
| `src/pages/Login.tsx` | ✅ Zod |
| `src/pages/ForgotPassword.tsx` | ✅ Zod |
| `src/pages/Contact.tsx` | ❌ No Zod (relies on inline checks; backend now returns `*_required` errors) |
| `src/pages/SeekerSignup.tsx` | ❌ No Zod |
| `src/pages/ResetPassword.tsx` | ❌ No Zod |
| `src/pages/ProviderSupport.tsx` | ❌ No Zod (backend covered) |
| `src/components/lead-intake/useLeadIntakeForm.ts` | ❌ No Zod (extensive inline validation; backend covered) |

**Finding F-2 (Medium):** Five user-facing forms validate inline rather than via a Zod schema. Backend edge functions enforce server-side validation (the recent `email_required` / `email_rejected` / `*_required` standardization), so this is **defense-in-depth** rather than a security hole. Recommend Zod as a follow-up consistency improvement, prioritizing `SeekerSignup` + `ResetPassword` (highest risk: bad signups, weak passwords).

### 2.9 Seeker pages missing loading state

```
MISSING-LOADING: src/pages/seeker/SeekerHelp.tsx
```

**Finding F-3 (Low):** `SeekerHelp.tsx` is likely a static info/FAQ page so a skeleton is unnecessary. Confirm in Phase 3 trace; if it has any async data, add a `Skeleton`.

### 2.10 Seeker pages missing empty state

```
MISSING-EMPTY: SeekerFacilityProfile, SeekerHelp, SeekerInternationalCase, SeekerNotificationPreferences,
               SeekerRequests, SeekerReviews, SeekerSaved, SeekerSearch, SeekerSettings
```

**Finding F-4 (Medium):** Heuristic match (no "No X yet" / "haven't" / "empty" / "0 results" string). Several of these almost certainly do have empty states using different copy (e.g. an icon + button). To be confirmed in Phase 3 file traces and Phase 4 reproductions. **Marked as suspected, not confirmed.**

## Open items routed to Phase 3 (flow trace)

- F-1 confirmation: re-verify all user-panel `select` calls list explicit columns when retrieving real rows (vs counts).
- F-2: trace `submit-*` edge functions to confirm their server-side schemas reject malformed input the unprotected client forms might send.
- F-4: every seeker page — confirm presence/quality of empty state when collection is empty.

## Open items routed to Phase 4 (reproductions)

- Hit each seeker page logged in with zero data → screenshot empty state.
- Submit each form with empty body via DevTools → confirm 400 with friendly error toast.
- Hit `/center/<unknown>` and unknown SEO slugs → confirm graceful fallback.

End of Phase 2.
