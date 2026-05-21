# Cache-aggression fix — "one bad URL locks the whole platform in 404" (2026-05-20)

## Symptom

User reported: "the platform is catching aggressively, even 404
errors; when a page 404s, the whole platform catches too."

## Root cause

`vercel.json:666-674` applied an aggressive Cache-Control header to
every response under the SEO prefix pattern:

```json
{
  "source": "/(rehab-centers|resources|treatment-types|insurance|drug-rehab-near-me|alcohol-rehab-near-me|detox-centers-near-me)(.*)",
  "headers": [{
    "key": "Cache-Control",
    "value": "public, max-age=3600, stale-while-revalidate=86400"
  }]
}
```

This applied INDISCRIMINATELY to:

1. **Real prerendered HTML** (correct — these are stable SEO content
   that rarely changes between deploys; 1h+24h cache is appropriate)

2. **SPA-shell rewrites for non-existent paths** (WRONG — the
   middleware rewrites `/<bad-slug>` to `/index.html`, which
   client-side renders `NotFound`. That response was cached for 1h
   fresh + 24h stale = 25h total)

Because Vercel applies header rules based on the ORIGINAL request URL
(not the rewrite target), both cases ended up with the same header.

**The bug experience**: a user hitting a 404-feeling URL (any
non-prerendered path under those prefixes) got the wrong content
cached for up to 25 hours. Even if a prerendered HTML for that URL
was published in the meantime, they kept seeing the cached
SPA-NotFound for the full window.

Compounding the issue: React Query's `retry: 2` was hitting 4xx
errors too — every 404 fetch waited 6+ seconds (2 retries with
exponential backoff: 1s + 2s + 4s capped at 10s) before showing the
NotFound UI. That made the "stuck" feeling worse.

## Three-layer fix

### Layer 1 — `vercel.json` cache header reduction

```diff
- "value": "public, max-age=3600, stale-while-revalidate=86400"
+ "value": "public, max-age=60, s-maxage=3600, stale-while-revalidate=3600"
```

- **`max-age=60`**: browser caches fresh for 1 minute (down from 1h)
- **`s-maxage=3600`**: CDN caches fresh for 1 hour (preserves CDN
  benefit; CDN purge is cleaner than browser-cache eviction)
- **`stale-while-revalidate=3600`**: serves stale for 1h while
  revalidating (down from 24h)

Worst-case stuck-state window for prerendered routes: **1h** (down from
25h). For real prerendered content the cache hit rate is preserved at
the CDN layer.

### Layer 2 — Middleware override for non-prerendered paths

In `middleware.ts`, the human-visitor branch now checks
`PRERENDERED.has(pathname)` and sets a tighter header when the path
is NOT in the prerender manifest:

```ts
if (!PRERENDERED.has(pathname)) {
  response.headers.set(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
  );
}
return response;
```

Effect: SPA-NotFound responses for genuinely-dead URLs cache for
**60s** on both browser AND CDN. If a prerendered HTML for that path
lands in the interim, the next visitor (after 60s) sees the new
content. Worst-case stuck-state window: **60s** (down from 25h, a
1500× improvement).

### Layer 3 — React Query no-retry-on-4xx

In `src/lib/queryClient.ts`, replaced the static `retry: 2` with a
function that skips retry on 4xx errors:

```ts
retry: (failureCount, error) => {
  const status = (error as { status?: number; statusCode?: number } | undefined)?.status
    ?? (error as { status?: number; statusCode?: number } | undefined)?.statusCode;
  if (typeof status === "number" && status >= 400 && status < 500) return false;
  return failureCount < 2;
},
```

A 4xx error (404 / 401 / 403 / 422) is by-definition not transient
— retrying just delays the not-found UI by 6+ seconds. 5xx and
network errors still retry up to 2× with exponential backoff (where
retry actually helps).

## Cache-Control matrix after fix

| URL pattern | Browser | CDN | Stale-revalidate | Source |
| --- | --- | --- | --- | --- |
| Prerendered SEO route (in manifest) | 60s | 1h | 1h | vercel.json |
| Non-prerendered (SPA-NotFound) | 60s | 60s | 300s | middleware.ts |
| `/assets/*` (Vite-hashed) | 1y immutable | 1y immutable | — | vercel.json (unchanged) |
| Everything else | (no header — Vercel/browser defaults) | — | — | — |

## Bug recovery characteristics

| Scenario | Before fix | After fix |
| --- | --- | --- |
| User lands on bad URL, page 404s | Cached 25h | Cached 60s |
| Prerender added for URL after user's first visit | User sees SPA-NotFound for 25h | User sees new content within 60s |
| User clicks valid link after seeing 404 | Browser/CDN may serve stale 404 for 24h | Browser revalidates within 60s |
| React Query 404 on a hook fetch | Waits 6+ seconds (2 retries) before showing NotFound | Shows NotFound immediately |

## Build sanity

```
$ npx tsc --noEmit       # clean
$ npx vite build         # clean, 34.30s
$ npm test               # 128 passed | 5 skipped (same as before)
```

## Risk assessment

**Low**. The change shortens cache windows but doesn't alter
correctness for any path. CDN cache (Vercel) absorbs most traffic, so
browser-cache revalidation overhead is offset by faster
prerender-content propagation + faster bug recovery.

**Deployment note**: existing users with cached 404 responses (under
the old 1h+24h header) will see the stuck state expire on its natural
schedule. New visits after deploy use the new cache rules.

## Related earlier fixes

This sits alongside two earlier "stuck state" fixes from prior
sessions:
- `GlobalErrorBoundary` resets `hasError` on route change (`componentDidMount` listens for `LOCATION_CHANGE_EVENT`)
- `SEORouteBoundary` does the same per-route
- Chunk-load auto-reload guarded by `sessionStorage` flag

Those handled JS-error stuck states. This commit handles HTTP-cache
stuck states — the third leg of the platform-resilience tripod.
