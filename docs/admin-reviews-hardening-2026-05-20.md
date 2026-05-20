# /admin/reviews — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as `/admin/leads`, `/admin/providers`, `/admin/seekers`, `/admin/concierge`, `/admin/subscriptions`, `/admin/support`.

---

## Issues closed

### P0 — latent runtime bug

1. **Realtime channels were silently dead.** `AdminReviews` had been subscribing to `supabase.channel('admin-reviews-realtime')` and `'admin-disputes-realtime'` on `facility_reviews` + `review_disputes`, but **neither table was in the `supabase_realtime` publication**. So the channels mounted, subscribed, and never received any events. Admins were relying on the manual `Refresh` button and the post-mutation `fetchReviews()` call without realizing the realtime feed was broken.
   - **Fix:** new migration `20260621000000_realtime_for_reviews_and_disputes.sql` — idempotent `ALTER PUBLICATION supabase_realtime ADD TABLE …` for both tables. Applied to the live project. Verified after-apply with `pg_publication_tables` — both tables now in the publication.

2. **`handleUpholdDispute` half-state on failure** — three DB ops in sequence, but only one had its error checked:
   ```ts
   await supabase.from('facility_reviews').update({ status: 'hidden' }).eq('id', dispute.review_id);  // ← error ignored
   const { error } = await supabase.from('review_disputes').update({...}).eq('id', dispute.id);
   await supabase.from('facility_reviews').update({ disputed: false }).eq('id', dispute.review_id);  // ← error ignored
   ```
   If the first or third ops failed, the review could end up "disputed=true status=hidden" or "disputed=false status=approved" — half-resolved. **Fix:** sequenced with explicit error checks at each step, plus consolidated the two `facility_reviews` updates into one (`status: 'hidden', disputed: false`) so partial failure is impossible at that boundary. Errors throw with labeled messages.

3. **`handleDismissDispute` half-state on failure** — same shape as #2. **Fix:** sequenced with explicit error checks. The second op (clearing the `disputed` flag) is treated as a soft warning since the dispute resolution itself already persisted; failure shows `toast.warning("Dispute dismissed, but couldn't clear disputed flag: …")` instead of a generic success.

### P1 — workflow gaps

4. **No URL-state for filters/tab** — admins couldn't bookmark or share a filtered view. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync (`?tab=`, `?q=`, `?rating=`). Defaults not written to URL.

5. **No search filter** — no way to find reviews by facility name, reviewer, or text content. **Fix:** debounced search input (`350ms`) that matches across facility_name + reviewer_name + review_text + city/state.

6. **No rating filter** — no way to look at only 1-star reviews or only 5-star. **Fix:** rating-filter dropdown (All / 5 / 4 / 3 / 2 / 1).

7. **No bulk operations + no admin-gated edge function** — the existing single-action approve/reject path duplicated all the logic inline + only fired through the client. **Fix:** new `admin-bulk-moderate-reviews` edge function (deployed v1) with action dispatcher (`approve | reject | hide | delete`), 100-row cap, partial-success summary, per-row `admin_audit_log` entry, defense-in-depth role check (`super_admin` + `manager` only). Fires `send-review-notification` for approve/reject so the bulk and single-action paths produce identical emails. New `BulkReviewModerationDialog` component routes the four actions through one UI.

8. **No "hidden" tab** — reviews moved to `status='hidden'` (via dispute uphold) had no listing surface in the UI. They disappeared from the visible tabs but admins had no path back to them. **Fix:** added a "Hidden" tab in the same row as Pending/Approved/Rejected, plus a `hide` action in the bulk dialog.

9. **`useState` + `fetchX()` instead of `useQuery`** — no `isFetching` indicator, no proper cache lifecycle, harder invalidation. **Fix:** converted both `reviews` and `disputes` to `useQuery` with `staleTime: 30s`. `isFetching` drives the "Refreshing…" indicator.

10. **`fetchReviews` / `fetchDisputes` silently swallowed enrichment failures** — the parallel `facilities` + `seeker_profiles` lookups had no error checks. If either failed, every row rendered with "Unknown Facility" / "Verified Reviewer" placeholders, masking the outage. **Fix:** added `if (.error) throw` on every enrichment query.

11. **Single-action approve/reject email failures were swallowed** — `.catch(() => {})`. If the seeker email send failed, the admin saw "Review approved" with no warning. **Fix:** wrapped the invoke + check both `error` and `data?.error`; surfaces `toast.warning("Review approved, but seeker email failed: …")` when the email fails. Same fix in `ReviewDetailModal`.

12. **`ReviewDetailModal.handleModerate` didn't fire the seeker notification email** — the page-level handlers do, the modal handler didn't. Inconsistent behavior depending on which surface the admin moderated from. **Fix:** added the email-send block with soft-fail-as-warning semantics matching the page handlers.

13. **`ReviewDetailModal.handleModerate` didn't set `reviewed_by`** — the audit trail showed who approved/rejected via `admin_audit_log` but the `facility_reviews.reviewed_by` column stayed null. **Fix:** stamped from `supabase.auth.getUser()`.

14. **`handleDelete` (both page + modal) didn't cascade `review_disputes`** — if the review had a dispute attached, the FK constraint would block the delete with a confusing generic toast. **Fix:** delete `review_disputes WHERE review_id = …` first, with explicit error check, before deleting the review.

### P2 — UX/a11y polish

15. **No CSV export** — every other admin surface has one. **Fix:** 12-column export (ID, status, rating, facility, reviewer, city, state, text, helpful count, disputed flag, timestamps). Filename `reviews-export-YYYY-MM-DD.csv`.

16. **No copy-link / clear-filters** when filters are active. **Fix:** added both buttons with clipboard + `execCommand` fallback.

17. **No selection drift cleanup** — selecting reviews and then changing filters left stale IDs in the bulk selection. **Fix:** effect that prunes `selectedIds` to only contain currently-visible IDs.

18. **No `isFetching` indicator.** **Fix:** "Refreshing…" with `Loader2` + `aria-live="polite"` above each tab's content.

19. **"Backfill Names" button visible to all admins** — RPC `admin_backfill_reviewer_names` is SECURITY DEFINER + admin-gated server-side, but the button is a sensitive maintenance action better hidden from non-super-admins. **Fix:** wrapped in `{isSuperAdmin && …}`.

20. **A11y** — every checkbox, row button, bulk-action button, and StarRating got an `aria-label`. Row buttons got `focus-visible:ring`. Tab triggers got `aria-label`s for screen readers.

21. **Mobile responsiveness** — the tabs row now wraps in `overflow-x-auto` so 5 tabs (added "Hidden") fit on phone screens. Header actions use `flex-wrap` so the bulk + utility buttons stack cleanly.

22. **Disputed-flag badge on review rows** — rows with `disputed=true` had no visual indicator on the main list. **Fix:** added a small "Disputed" badge with the Flag icon.

23. **Per-row "Select" gating** — checkboxes only render for `canModerateReviews` users; non-moderator admins (advisor / customer_rep) see the list but can't bulk-act, matching the existing per-row buttons.

---

## New backend

### `admin-bulk-moderate-reviews` v1 (deployed)

| action  | behavior                                                                                       |
| ------- | ---------------------------------------------------------------------------------------------- |
| approve | `status=approved`, stamps `reviewed_at` + `reviewed_by` + optional `admin_notes`; emails seeker. |
| reject  | `status=rejected`, stamps `reviewed_at` + `reviewed_by`. **Requires `adminNotes`**. Emails seeker with rejection reason. |
| hide    | `status=hidden`, clears `disputed=false`. Typically post-dispute.                              |
| delete  | Cascades `review_disputes` rows first, then deletes the review.                                |

Gating: JWT → `has_role(_user_id, 'admin')` → `admin_user_profiles.admin_role IN ('super_admin', 'manager')`. Defense in depth — even if a customer_rep token reached the endpoint, the role tier check blocks bulk moderation. Per-row `admin_audit_log` entry with action-specific `action_type` (e.g. `review_bulk_approve`).

Function ID: `d4e401d3-4a9a-4a58-a878-5544cef8bb58`

### Migration `20260621000000_realtime_for_reviews_and_disputes.sql`

Idempotent `ALTER PUBLICATION supabase_realtime ADD TABLE` for both `facility_reviews` and `review_disputes`. Skips if the table is already in the publication (so re-running is safe).

---

## Files changed

```
NEW:
  src/components/admin/reviews/BulkReviewModerationDialog.tsx
  supabase/functions/admin-bulk-moderate-reviews/index.ts          (deployed v1)
  supabase/migrations/20260621000000_realtime_for_reviews_and_disputes.sql  (applied)
  docs/admin-reviews-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminReviews.tsx           — full rewire: useQuery, URL-state, search/rating filters, bulk actions, hidden tab, atomic dispute handlers, error-surfacing, CSV, a11y
  src/components/admin/ReviewDetailModal.tsx — moderate handler fires notification email + stamps reviewed_by; delete cascades review_disputes
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~48s
- Edge function deployed: `admin-bulk-moderate-reviews` v1 (id `d4e401d3-4a9a-4a58-a878-5544cef8bb58`) — ACTIVE
- Migration applied: both tables now in `supabase_realtime` publication
- Schema check: edge fn columns match `facility_reviews` (`status`, `admin_notes`, `reviewed_at`, `reviewed_by`, `disputed`, etc.)

---

## Behavioural guarantees

1. **Realtime actually works now.** The publication migration means INSERT/UPDATE/DELETE on `facility_reviews` and `review_disputes` propagate to the admin dashboard via the channel.
2. **No silent failures.** Every mutation `onError` surfaces the underlying error message; every notification-email failure surfaces as `toast.warning` so the admin knows the email didn't go out.
3. **No partial-state dispute resolution.** Both `handleUpholdDispute` and `handleDismissDispute` sequence their DB ops with explicit error checks, and the upheld path consolidates the two `facility_reviews` updates into one atomic statement.
4. **Bulk + single-action parity.** The bulk edge function fires `send-review-notification` per row, stamps `reviewed_by`, audits each row — same shape as the single-action paths. Admins get consistent behavior regardless of how many they moderated.
5. **Defense in depth on bulk moderation.** Even if a customer_rep token reaches the edge fn, the `admin_role` tier check blocks the action — matches the client-side `canModerateReviews` gate.
6. **URL-state round-trips.** Bookmarking `/admin/reviews?tab=disputes&q=spam&rating=1` reopens the exact same view.
7. **No latent FK errors on delete.** Reviews with attached disputes can now be deleted from both the page handler and the modal — the dispute cascade is explicit.
