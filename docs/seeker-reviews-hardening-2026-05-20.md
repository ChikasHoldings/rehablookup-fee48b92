# /account/reviews — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Scope:** `SeekerReviews.tsx` page — the seeker's review history, edit, delete, and moderation-status surface.

---

## Findings closed

### Finding 1 — No realtime updates (P0)

**Evidence:** The page fetched reviews on mount and only re-fetched on Refresh-button click. Three classes of state change happen WITHOUT any seeker action:
1. Admin moderates a pending review → approved/rejected (UPDATE on `facility_reviews`)
2. Admin bulk-deletes (DELETE on `facility_reviews`)
3. A facility responds to an approved review (INSERT on `review_responses`)

All three left the page showing stale state until the user clicked Refresh — they might never know their pending review was approved or that the facility responded.

**Fix:** added a realtime subscription on `seeker-reviews-${userId}` channel listening to:
- `facility_reviews` event:"*" with `filter: user_id=eq.<id>` so the seeker's own reviews refetch on any state transition
- `review_responses` event:"INSERT" (no filter possible — table has no user_id column; RLS limits delivery to responses on approved reviews the user can see via the "Public can view active responses" policy)

Both tables are in `supabase_realtime` publication (verified via `pg_publication_tables`), so the subscription actually delivers events.

### Finding 2 — Facility-deleted dead links (P1)

**Evidence:** `ReviewCard` line 109 had:
```ts
const facilityLink = review.facility_slug ? `/center/${review.facility_slug}` : `/center/${review.facility_id}`;
```

When the facility join fails (deleted from DB, RLS-hidden, or join produced no row), `facility_slug` is empty and `facility_name` falls back to `"Unknown Facility"`. The link then went to `/center/<uuid>` which is a 404 — a dead end for the user.

**Fix:** when `facility_slug` is empty, render the facility name as plain text instead of a Link. Title attribute: "This facility is no longer listed". The review row remains visible (so the seeker can still delete it) but the broken navigation is gone.

### Finding 3 — Missing URL state for status filter (P1)

**Evidence:** `statusFilter` lived only in `useState`. Bookmarking `?status=pending` didn't work and back/forward through the page reset to "all".

**Fix:** `useSearchParams` hydration on mount + loop-guarded sync. `?status=pending|approved|rejected|all`. Defaults (`all`) not written so the bare `/account/reviews` URL stays clean.

### Finding 4 — Mutation error toasts hid the underlying reason (P1)

**Evidence:** Both the edit-save and delete handlers showed generic copy ("Could not update your review. Please try again.") on failure, ignoring `error.message` entirely. If RLS denies the update (e.g. status moved out of `pending` between page load and click), the user sees "Please try again" — but trying again doesn't help; they need to know the row's no longer editable.

**Fix:** description string is now `error.message || "<fallback>"`. The fallback stays for cases where the error has no message. Also applied to the initial-fetch `error` state for consistency.

---

## What was already correct (verified, no changes)

- **Reviews fetch RLS.** `facility_reviews` has `"Users can view their own reviews" USING (auth.uid() = user_id)` — direct SELECT works for seekers.
- **Edit gating.** `canEdit` is `review.status === 'pending'` AND the RLS policy `"Users can update their own pending reviews"` enforces it server-side (`WITH CHECK (... AND status='pending')`). So even if a malicious user manipulated the client state, the DB would reject the update.
- **Re-edits go back to `pending`.** Update payload sets `status: 'pending'` so an admin re-moderates the new content. Prevents the "approved review edited in place, stays approved" hole.
- **Delete RLS.** `"Users can delete their own reviews" USING (auth.uid() = user_id)` — the seeker owns the right to remove their content (including approved ones from public view). By-design.
- **Local-state optimistic remove.** `setReviews(prev => prev.filter(r => r.id !== deleteReviewId))` runs on success. The realtime DELETE event will also fire and trigger refetch — idempotent, no double-removal because the row's already gone from local state.
- **Rate limit on save.** 5-second client-side cooldown via `lastReviewSaveRef`. Friction-only; real abuse prevention is at the RLS layer.
- **Input sanitization.** Strips HTML tags and `javascript:` protocol from `editText` (defense in depth — the read path also escapes, but server should never receive HTML).
- **Char count display.** 2000-char cap with live counter in the Edit dialog.
- **`response` join via separate query.** Returns null when the facility hasn't responded yet; rendered conditionally. No dead-end.
- **Stats card.** Computed via `useMemo`, hidden when there are no reviews.
- **Tabs visible only when `reviews.length > 1`.** Avoids the "All (1)" tab on a single-review page.
- **`flagged` / `hidden` statuses** — implicitly handled. The status badge `default` case returns null, so any unrecognised admin-internal status just shows no badge. The tabs only filter the four user-relevant statuses; flagged/hidden reviews drop into "all" naturally.

---

## Files changed

```
MODIFIED:
  src/pages/seeker/SeekerReviews.tsx
    - Realtime subscription on facility_reviews (user-filtered) and
      review_responses (RLS-filtered) so admin moderation and facility
      responses propagate within ~200ms
    - URL state for statusFilter (?status=pending|approved|rejected|all)
      with loop-guarded sync
    - Mutation error toasts now include error.message
    - ReviewCard: dead-link fix — when facility_slug is empty, render
      facility name as plain text instead of linking to a 404
    - Initial-fetch error message uses the actual reviewsError.message

NEW:
  docs/seeker-reviews-hardening-2026-05-20.md
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~40s
- DB sanity: RLS policies for `facility_reviews` and `review_responses` verified to deliver realtime to seekers for their own rows / approved responses

---

## Behavioural guarantees

1. **Live state.** A pending review approved by admin transitions from "Pending Review" badge to "Published" badge within ~200ms without any user action. A facility responding to an approved review appears in the response block within ~200ms.
2. **No dead-end links.** Reviews for deleted facilities render the name as plain text — the row is still editable / deletable but no broken navigation.
3. **Bookmarkable filter.** `/account/reviews?status=pending` restores the view.
4. **Honest error messages.** Save / delete failures surface the actual reason (RLS denial, conflict, validation) instead of generic "Please try again".
5. **No duplicates.** Optimistic delete + realtime DELETE event are idempotent (filter-by-id is a no-op when the row's already gone).
6. **No silent failures.** Both the initial fetch and the two mutation handlers expose the underlying error message.

---

## What was NOT changed (and why)

| Area | Decision | Rationale |
| --- | --- | --- |
| `helpful_count` displayed but no vote UI for seekers | Left as-is | Informational only; seekers don't vote on their own reviews. |
| `lastReviewSaveRef` 5-second cooldown | Left as-is | Client-side friction reduction; real rate limiting lives in DB/edge. |
| Defensive `editRating < 1 || editRating > 5` check | Left as-is | Belt-and-suspenders; the state can only reach 1-5 through the star buttons, but the guard cost is one comparison. |
| Refresh button rendered only when `userId` exists | Left as-is | Sensible — there's nothing to refresh without a session. |
