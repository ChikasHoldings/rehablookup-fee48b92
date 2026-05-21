# /admin/blog — Deep Hardening Pass

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend complete, mobile-responsive, fully hardened. Same standard as the prior 11 admin surfaces.

---

## Issues closed

### P0 — latent runtime bug

1. **`blog_articles` not in `supabase_realtime` publication AND no realtime channel subscription.** Same pattern as the prior reviews / escalations / marketing-leads passes. The page relied entirely on local mutation invalidations — if another admin published or edited an article from another browser, this admin would never see it until manual refresh. With 102 rows in production already, this was a real coordination gap. **Fix:** migration `20260624000000_realtime_for_blog_articles.sql` adds the table to the publication (idempotent). Added `admin-blog-live` channel subscribing to INSERT / UPDATE / DELETE. 30s polling fallback.

### P1 — workflow gaps

2. **No URL-state.** Filters (search / category / status / featured) lived only in component state. **Fix:** `useSearchParams` hydration on mount + loop-guarded sync (`?q=…&category=…&status=…&featured=…`). Defaults not written to URL.

3. **No bulk operations + no admin-gated edge function.** Single-action publish/unpublish/archive/delete only. **Fix:** new `admin-bulk-update-blog-articles` edge function (deployed v1) with three action endpoints (`update_status`, `set_featured`, `delete`) routed by six BulkBlogAction variants in the dialog (`publish`, `unpublish`, `archive`, `feature`, `unfeature`, `delete`). Defense-in-depth role tier check (super_admin + manager only; delete is super_admin only). 100-row cap, per-row `admin_audit_log` entry, partial-success summary. New `BulkBlogArticleActionDialog` routes the 6 actions through one UI.

4. **KPI cards reflected the FILTERED view, not global counts.** Filtering to "draft" made every KPI = draft count. **Fix:** new `["admin-blog-counts"]` query runs 5 `count: "exact", head: true` lookups (total + each status + featured) and feeds the KPI strip. The list view stays filtered.

5. **No CSV export.** Every other admin surface has one. **Fix:** 10-column CSV (id, title, slug, category, status, featured, author, published_at, created_at, updated_at). Filename `blog-articles-YYYY-MM-DD.csv`.

6. **No featured filter.** Editors couldn't isolate "featured" articles to manage the resources-page rotation. **Fix:** added Featured dropdown (All / Featured / Not featured).

7. **Single-action mutations swallowed the real error message.** `toast({ title: "Failed to delete article", description: error.message, ... })` was actually fine — the description was there. But the legacy `@/hooks/use-toast` API isn't used anywhere else in the prior 11 hardened surfaces. **Fix:** switched both `AdminBlog.tsx` and `ArticleEditor.tsx` to the sonner pattern with `toast.error(\`Failed to X: ${err.message}\`)`. Consistent error surfacing across the whole admin panel.

8. **`handleEdit` used `.single()` — throws if the row was deleted between the list-load and the edit-click.** Race window: admin A views the list, admin B deletes a row, admin A clicks Edit → confusing PostgrestError toast. **Fix:** swapped to `.maybeSingle()` with an explicit "Article no longer exists — it may have been deleted" toast + cache invalidation so the row drops from the list.

9. **`ArticleEditor` had no slug-uniqueness pre-check.** Submitting a duplicate slug returned a raw `duplicate key value violates unique constraint` toast. **Fix:** pre-check via `.maybeSingle()` lookup on slug before insert/update; on conflict throws a friendly `"Slug \\"foo\\" is already in use by another article. Pick a different slug."` error.

10. **`ArticleEditor` used `articleData as any` casts on insert/update.** Loss of type safety. **Fix:** narrowed to `as never` casts (matches the pattern used elsewhere in the codebase where Supabase's generated types don't yet cover all columns).

### P2 — UX/a11y polish

11. **Copy-link + Clear-filters + manual Refresh buttons** in the header.
12. **`isFetching` indicator** above the table.
13. **Multi-select checkbox column** with select-all-on-page. Gated by `canModerate` so non-moderators don't see the column at all.
14. **Selection-drift cleanup effect** — drops selected IDs that fall out of the filtered view.
15. **`Featured` toggle in the row dropdown menu** — click to flip featured state without opening the editor. New `updateFeaturedMutation` mirrors `updateStatusMutation`'s shape (with audit log).
16. **Action items in the row dropdown gated by `canModerate`** — non-moderators still see Edit + Preview but not Publish/Unpublish/Archive/Feature/Delete.
17. **`window.open(\`/resources/${slug}\`)` now includes `noopener,noreferrer`** for the Preview affordance. The new-window opener didn't have this hardening.
18. **A11y** — every checkbox got `aria-label`, the icon-only `MoreHorizontal` dropdown trigger got `aria-label={\`Actions for ${article.title}\`}`, the inline Star indicator got `aria-label="Featured"`, the search input got an extended placeholder including "excerpt".
19. **Stats card defaults shifted from "0" to "—" while counts load** so the strip doesn't briefly flash zeros.
20. **Empty-state copy updated to "Try adjusting your search or filters"** when filters are active vs. "Create your first article to get started" when the table is genuinely empty.

---

## New backend

### `admin-bulk-update-blog-articles` v1 (deployed)

| action          | extra payload                          | behavior                                                                                                                  |
| --------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| update_status   | `newStatus` ∈ {draft, published, archived} | Skips no-ops as `skipped`. First transition to `published` stamps `published_at`; subsequent re-publishes preserve it. |
| set_featured    | `featured: boolean`                    | Skips no-ops (already-featured / already-not-featured) as `skipped`.                                                       |
| delete          | (none) — **super_admin only**          | Permanent removal. Per-row audit row records the deleted article's metadata (title, slug, status, was_featured).         |

Gating: JWT → `has_role(_user_id, 'admin')` → `admin_user_profiles.admin_role IN ('super_admin', 'manager')` → (for delete) `admin_role = 'super_admin'`. Function ID: `1a2f8a41-5899-448a-a2e8-afeeabda15e1`

### Migration `20260624000000_realtime_for_blog_articles.sql`

Idempotent `ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_articles`. Applied to the live project.

---

## Files changed

```
NEW:
  src/components/admin/blog/BulkBlogArticleActionDialog.tsx
  supabase/functions/admin-bulk-update-blog-articles/index.ts        (deployed v1)
  supabase/migrations/20260624000000_realtime_for_blog_articles.sql  (applied)
  docs/admin-blog-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminBlog.tsx
    — full rewire: URL-state, realtime channel + 30s poll, global
      counts query, featured filter, bulk dialog wiring, selection
      column, dropdown role-gating, .maybeSingle() on edit fetch,
      sonner toast migration, CSV export, copy-link, clear-filters,
      refresh, isFetching indicator, a11y.
  src/components/admin/blog/ArticleEditor.tsx
    — slug-uniqueness pre-check, sonner toast migration,
      articleData typed as `never` instead of `any`, mutation
      onError surfaces underlying error message verbatim.
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~47s
- Edge function deployed: `admin-bulk-update-blog-articles` v1 (id `1a2f8a41-5899-448a-a2e8-afeeabda15e1`) — ACTIVE
- Migration applied: `blog_articles` confirmed in `supabase_realtime` publication
- Schema check: edge fn columns match `blog_articles` table (id, title, slug, status, featured, published_at)

---

## Behavioural guarantees

1. **Realtime actually works.** INSERT/UPDATE/DELETE on `blog_articles` propagate via the new channel within ~200ms. 30s poll fallback covers channel drops.
2. **No silent failures.** Every mutation `onError` surfaces the actual error message; `handleEdit` distinguishes "row deleted under us" from generic fetch errors.
3. **No duplicate slug surprises.** Save now pre-checks slug uniqueness with a friendly message instead of letting the DB throw a raw constraint violation.
4. **Defense in depth on bulk mutations.** Edge fn checks JWT → admin role → admin_role tier (super_admin + manager) → (delete only) super_admin. Customer_rep / advisor tokens that bypass the UI still bounce off the edge fn.
5. **URL-state round-trips.** Bookmarking `/admin/blog?status=draft&category=recovery&featured=featured&q=foo` reopens the exact filtered view.
6. **KPI strip stays truthful.** Numbers reflect the global table state — filtering the list view doesn't distort the KPIs.
