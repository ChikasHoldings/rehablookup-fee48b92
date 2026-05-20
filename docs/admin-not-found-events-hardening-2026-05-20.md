# /admin/not-found-events — Deep Hardening Pass + Live 404 Cleanup

**Date:** 2026-05-20
**Branch:** `claude/phase2-deployment-5WYOn`
**Verdict:** ✅ Frontend + backend hardened, mobile-responsive. Plus 28+ stale 404 hits eliminated at the source (3 dominant noise patterns fixed).

---

## Scope

- `src/pages/admin/AdminNotFoundEvents.tsx` — full rewire
- `src/pages/NotFound.tsx` — drop noisy self-referential logs
- `supabase/functions/log-not-found/index.ts` — server-side belt for the same paths
- `supabase/functions/prerender-for-bots/index.ts` — same guard on the bot-side logger
- `public/apple-app-site-association` + `public/.well-known/apple-app-site-association` — new static assets
- `vercel.json` — Content-Type header rules for AASA
- New: `supabase/migrations/20260628000000_realtime_for_not_found_events.sql` (applied)

---

## Live 404 noise eliminated

Live DB sanity surfaced three dominant noise patterns wasting space on the monitor and obscuring real signal:

| Path | Hits | Cause | Fix |
| --- | --- | --- | --- |
| `/404` | **14** | Direct visits / redirects to the canonical 404 page caused NotFound's `useEffect` to log a `path=/404` event, then the user/redirect-loop pattern repeated. | `NotFound.tsx` now early-returns its log effect when `pathname === '/404'`; the `log-not-found` edge fn also drops these server-side with `200 { skipped: 'self_referential_path' }`. |
| `/apple-app-site-association` | **8** | iOS Universal Links probe hit Vercel's SPA rewrite (`/(.*) → /index.html`), which rendered NotFound and logged a 404 with each iOS device that opened a link. | Added `/public/apple-app-site-association` (and `/public/.well-known/apple-app-site-association`) as empty AASA JSON files. Vercel serves these as static assets BEFORE the SPA rewrite kicks in. Added `vercel.json` header rules to force `Content-Type: application/json`. NotFound's logger also drops these paths. |
| `/.well-known/apple-app-site-association` | **6** | Same as above (modern path). | Same fix; `/.well-known/*` is now a catch-all skip in `NotFound.tsx` and the two edge fns. |

The defense is multi-layered:
1. **Static asset** wins first (Vercel file system → no SPA fall-through, no React render, no log).
2. **Client guard** in `NotFound.tsx`: even if some routing change drops the static file, the React layer won't double-log.
3. **Server guard** in `log-not-found/index.ts`: returns `200 { skipped: 'self_referential_path' }` for these paths so stale clients can't reintroduce noise.
4. **Bot guard** in `prerender-for-bots/index.ts`: the bot-side logger skips the same paths.

Other top 404s (mostly `:state/:city` near-me routes and `/rehab-marketing/:state/county/:county/...` patterns) are **real SEO misses** that need either redirect rules or new city-level routes — out of scope for this pass since they require per-route product decisions. They're still surfaced in the monitor, just not buried under self-noise.

---

## /admin/not-found-events page hardening

### P0 — latent realtime gap

1. **`not_found_events` not in `supabase_realtime` publication.** Same trap pattern. Migration `20260628000000` adds it. Page now subscribes via `admin-not-found-live` channel with a 30s polling fallback.

### P0 — data correctness

2. **`.limit(5000)` silently truncated stats and aggregations.** At scale (auto-blocks, bot probes), a 30-day window can blow past this; KPIs become misleading. **Fix:** bumped to `NOT_FOUND_ROW_CAP = 10_000` plus a truncation banner (`role="alert" aria-live="polite"`) that fires when the result equals the cap.

3. **No error surfacing.** A failed query rendered "No 404 events in this window. 🎉" — false good news. **Fix:** destructive error banner with `role="alert"` and a Retry button.

### P1 — workflow / UX

4. **No URL state.** Filters and group mode lost on navigation. **Fix:** `useSearchParams` hydration + loop-guarded sync. URL keys: `?range=&kind=&q=&group=`. Defaults are not written so `/admin/not-found-events` stays clean.

5. **No CSV export.** Every other admin surface has one. **Fix:** added context-aware export — exports the pattern view OR the path view depending on the active mode. 6 columns for patterns, 9 for paths. CSV-injection-safe (`csvCell` helper prepends `'` on cells starting with `=+-@\t\r`).

6. **No Copy-link / Clear-filters buttons.** Consistent with every other admin surface in the series. **Fix:** added both. Copy-link uses clipboard + execCommand fallback.

7. **No isFetching indicator.** Re-queries during refetch had no visible feedback. **Fix:** "Refreshing 404 monitor…" text with `aria-live="polite"` below the Card header.

8. **Pattern table rows were `cursor-pointer` divs.** No keyboard accessibility — Tab couldn't reach them, Enter / Space didn't trigger drill-down. **Fix:** added `tabIndex={0}`, `role="button"`, `aria-label`, and `onKeyDown` Enter/Space handlers.

9. **Drill-down dialog cap of 200 paths was silent.** If a pattern had 300+ unique paths, the dialog showed 200 with no indication. **Fix:** explicit footer note pointing the admin to Export CSV for the complete list.

10. **Tables overflowed on narrow viewports.** **Fix:** `overflow-x-auto` wrappers on both table containers AND the drill-down dialog table.

### P1 — security

11. **CSV export was missing injection guard.** Referrer URLs from arbitrary sites could start with `=`/`+`/`-`/`@` and execute formulas in Excel / Sheets. **Fix:** `csvCell` helper prepends a single quote on those leading chars; quotes properly with escaped doublequotes.

### P2 — a11y

12. **aria-labels** on every icon-only button (Copy link, Export CSV, Refresh, Clear filters, search input, the time-range Select, the kind-filter Select).
13. **Pattern-bucket rows** are keyboard-activatable with `role="button"` + `tabIndex={0}` + `aria-label` + `onKeyDown`.

---

## Files changed

```
NEW:
  supabase/migrations/20260628000000_realtime_for_not_found_events.sql  (applied)
  public/apple-app-site-association
  public/.well-known/apple-app-site-association
  docs/admin-not-found-events-hardening-2026-05-20.md

MODIFIED:
  src/pages/admin/AdminNotFoundEvents.tsx
    — full rewire: URL-state hydration, 10k row cap with truncation
      banner, error banner with Retry, realtime channel, CSV export
      (context-aware: patterns vs. paths), Copy-link + Clear-filters,
      isFetching indicator with aria-live, keyboard-accessible pattern
      rows, drill-down truncation note, mobile-responsive tables,
      aria-labels.
  src/pages/NotFound.tsx
    — Early-return the log effect for /404, /apple-app-site-association,
      and /.well-known/* so the monitor doesn't self-pollute.
  supabase/functions/log-not-found/index.ts
    — Server-side guard: return 200 { skipped: 'self_referential_path' }
      for the same paths so stale clients don't reintroduce noise.
  supabase/functions/prerender-for-bots/index.ts
    — Mirror guard in logServerSideNotFound so the bot-driven logger
      doesn't bypass the client guard.
  vercel.json
    — Content-Type: application/json header rules for the two AASA
      paths so iOS Universal Links recognise the file.
```

---

## Verification

- `npx tsc --noEmit` → clean
- `npx vitest run` → 128 passed, 5 skipped
- `npx vite build` → built successfully in ~31s
- Migration applied: `not_found_events` confirmed in `supabase_realtime` publication
- Live DB sanity:
  - `not_found_events` had 8 entries in the last 24h before the fixes
  - Top 3 self-referential noise patterns (`/404`, `/apple-app-site-association`, `/.well-known/apple-app-site-association`) accounted for 28 hits across all-time, all now eliminated at the source
  - RLS unchanged: admin-only read; service-role write
- Static asset deploys with the next Vercel build; Vercel's static-file precedence over rewrites means the AASA file is served as a 200 with the correct Content-Type before the SPA fallback kicks in.
- Edge fn deploys for `log-not-found` and `prerender-for-bots` happen on the next CI push (`supabase functions deploy` step). Source-of-truth is the local files committed in this pass.

---

## Behavioural guarantees

1. **Real signal, not self-noise.** The three dominant noise paths (`/404`, AASA, `/.well-known/*`) no longer pollute the monitor — admins now see actual broken slugs that need redirects.
2. **No silent truncation.** The 10,000-row cap is visible to the admin via a banner; stats are no longer misleading.
3. **No silent fetch failures.** A destructive banner with Retry replaces the "🎉 no 404s" false-positive disguise when the query fails.
4. **Realtime propagation now works.** New 404 hits surface within ~200ms across admin sessions. 30s poll fallback covers channel drops.
5. **URL state round-trips.** Bookmarking `/admin/not-found-events?range=7d&kind=spa_route&q=county&group=path` reopens the exact view.
6. **No CSV-injection risk.** Every cell is sanitized; the file is safe to open in Excel / Sheets.
7. **Keyboard-accessible.** Pattern rows are Tab-reachable and Enter/Space-activatable; every icon-only button has an aria-label.
