

# SEO Prerendering Fix: Making Pages Crawlable

## The Problem

Your `prerender-for-bots` edge function exists but is **never invoked**. The routing rule `/* /index.html 200` sends ALL requests directly to the SPA shell. Crawlers (Google, ChatGPT, etc.) see a generic HTML shell with navigation links instead of unique page content.

**Impact**: 
- `/for-providers` looks identical to homepage to crawlers
- `/privacy-policy` shows no policy text
- All SEO landing pages appear as near-duplicates

---

## The Solution

Implement a multi-layered approach to ensure crawlers receive unique, pre-rendered HTML for every SEO-critical page.

---

## Implementation Phases

### Phase 1: Enhanced Static Fallback Content (index.html) ✅ COMPLETE

Replace the generic `<noscript>` section with route-specific semantic content blocks containing unique text for:
- Homepage (treatment center discovery pitch)
- `/for-providers` (provider acquisition content)
- `/privacy-policy` (full policy text)
- `/terms-of-service` (full terms text)
- `/concierge` (placement service description)
- `/about`, `/contact`, `/how-it-works`

### Phase 2: Bot Detection Middleware Edge Function ✅ COMPLETE

Create `detect-and-prerender` edge function that:
1. Intercepts requests and checks User-Agent against 45+ bot patterns
2. For bots on SEO routes → Proxies to `prerender-for-bots`
3. For regular users → Passes through to SPA

### Phase 3: Update Prerender Function ✅ COMPLETE

Enhance `prerender-for-bots/index.ts`:
- Add `X-Prerender-Request` header for middleware calls
- Implement HTML caching (1-24 hour TTL)
- Return meaningful fallback HTML on errors

### Phase 4: Routing Updates ✅ COMPLETE

Updated `public/_redirects` with documentation explaining the bot detection flow. Edge functions handle prerendering at runtime.

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `index.html` | Add route-specific `<noscript>` content |
| `supabase/functions/detect-and-prerender/index.ts` | Create bot detection middleware |
| `supabase/functions/prerender-for-bots/index.ts` | Add caching, improve fallbacks |
| `supabase/config.toml` | Add detect-and-prerender config |
| `public/_redirects` | Update routing priorities |

---

## Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Unique HTML per page | 1 generic shell | 50+ unique pages |
| `/for-providers` indexability | Not indexable | Fully indexable |
| `/privacy-policy` visibility | No policy text | Full policy visible |
| Google ranking potential | Low | High |

---

## Priority Order

1. **Day 1**: Enhance `index.html` with unique `<noscript>` content
2. **Day 2-3**: Create `detect-and-prerender` middleware
3. **Day 4-5**: Implement HTML caching in prerender function
