

# Fix: Static HTML Serving Old Content on /resources

## Root Cause Identified

The `/resources` page is showing "old images" because **users never see the React application**. Instead, they receive a **static HTML file** (`public/resources.html`) that was hardcoded with placeholder content.

### Evidence

| File | Line | Code | Impact |
|------|------|------|--------|
| `public/_redirects` | 58 | `/resources /resources.html 200` | ALL users get static HTML |
| `public/resources.html` | 97-102 | Emoji placeholders (`📚 🏥 📅`) | No actual images |

The redirect rule serves static HTML to every visitor, completely bypassing the React SPA and database.

---

## Solution

### Option A: Remove Static Redirect (Recommended)

Remove line 58 from `public/_redirects` so the React SPA handles `/resources`:

**File: `public/_redirects`**

Delete this line:
```
/resources /resources.html 200
```

This allows the fallback rule `/* /index.html 200` to serve the React app, which fetches real data from the database.

### Option B: Redirect Static to SPA

If the static file must exist for some reason, change it to redirect users to the SPA:

```
/resources /index.html 200
```

---

## Implementation Steps

1. **Edit `public/_redirects`**: Remove or modify the `/resources` redirect rule (line 58)
2. **Optionally delete `public/resources.html`**: If no longer needed for SEO
3. **Test**: Visit `/resources` on published site to confirm React SPA loads with database images

---

## Technical Details

### Current Flow (Broken)
```
User visits /resources
    → Server matches `/resources /resources.html 200`
    → Static HTML served (emoji placeholders)
    → React app never loads
    → Database never queried
```

### Fixed Flow
```
User visits /resources
    → No specific redirect found
    → Falls through to `/* /index.html 200`
    → React SPA loads
    → React Query fetches from database
    → Correct Unsplash images displayed
```

### Files to Modify

| File | Action |
|------|--------|
| `public/_redirects` | Remove line 58 (`/resources /resources.html 200`) |
| `public/resources.html` | Optional: Delete if not needed for SEO bots |

### SEO Consideration

If the static file was intended for search engine crawlers, the existing `prerender-for-bots` edge function already handles bot requests separately. The static file is redundant and causes this bug for real users.

