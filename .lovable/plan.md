## Problem

`vercel.json` has both:
- `"cleanUrls": true` + `"trailingSlash": false` (Vercel native slash handling)
- An explicit `redirects` rule rewriting `/:path*/` → `/:path*`

These two mechanisms collide and produce `ERR_TOO_MANY_REDIRECTS` at the edge, before the SPA ever loads. Vercel builds succeed ("Ready"), but every request loops.

## Fix

### 1. Remove the redundant `redirects` block from `vercel.json`

`cleanUrls: true` + `trailingSlash: false` already:
- Strips trailing slashes via 308 redirect
- Strips `.html` extensions
- Serves `/foo` from `/foo.html` or `/foo/index.html`

The custom `redirects` rule duplicates this and causes the loop.

### 2. Keep everything else intact

- `rewrites` (SPA fallback) — keep as-is.
- `headers` (security, caching, sitemap content-type) — keep as-is.
- `buildCommand: npm run build:vercel` — keep.
- `framework: vite`, `outputDirectory: dist` — keep.

### 3. Client-side redirects stay

`TrailingSlashRedirect` and the trailing-slash logic in `SmartCatchAll` only run client-side (after HTML is served). They don't contribute to the edge loop and are still useful for in-app navigation. No changes needed.

## Updated `vercel.json` (target shape)

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npm run build:vercel",
  "outputDirectory": "dist",
  "installCommand": "npm install",
  "framework": "vite",
  "trailingSlash": false,
  "cleanUrls": true,
  "rewrites": [
    {
      "source": "/((?!api/|assets/|functions/).*)",
      "destination": "/index.html"
    }
  ],
  "headers": [ /* unchanged */ ],
  "github": { "silent": true }
}
```

Only change: delete the `"redirects": [...]` array. Everything else stays byte-identical.

## Validation after deploy

Once redeployed on Vercel:

1. `curl -I https://rehablookup.com/` → expect `200`, no `Location` header.
2. `curl -I https://rehablookup.com/about/` → expect single `308` to `/about`, then `200`.
3. `curl -I https://rehablookup.com/about.html` → expect `308` to `/about` (cleanUrls behavior).
4. `curl -I https://rehablookup.com/rehab-centers/maryland/towson` → expect `200` with prerendered HTML containing `<title>` and canonical.
5. Run `VERCEL_URL=https://rehablookup.com npm run validate:vercel-deploy` to confirm extensionless URLs serve the right HTML and that both `/path/index.html` and `/path.html` formats resolve.

## Rollback

If anything breaks after the change, restore the previous `vercel.json` from git history (the `redirects` block) and redeploy. Lovable Hosting at `rehablookup.lovable.app` remains as a fallback DNS target.

## Out of scope (not changing)

- No build script changes.
- No env var changes.
- No source code changes — `TrailingSlashRedirect`, `SmartCatchAll`, prerender scripts all unchanged.
- No sitemap or robots.txt changes.
