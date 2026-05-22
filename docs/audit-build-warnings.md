# Build Warnings — captured 2026-05-22

Branch: `claude/phase2-deployment-5WYOn`

Output of `npx vite build` (the bundling step that `npm run build` and
`npm run build:vercel` both call). The full `npm run build` pipeline
wraps this with ~30 SEO / sitemap / structured-data validators on
either side; this file captures the warnings emitted by the actual
bundling step, with a special pass for `Duplicate key` and `warning`
lines as requested.

All warnings below were emitted on a fresh `npm install` + `vite build`
run with no prior `dist/` cache.

---

## `Duplicate key` warnings

Vite's `vite:esbuild` plugin reported one duplicate object-literal key:

```
[plugin:vite:esbuild] [plugin vite:esbuild] src/pages/admin/AdminLeads.tsx: Duplicate key "staleTime" in object literal
321|      staleTime: 60_000,
322|      refetchInterval: 60_000,
323|      staleTime: 1000 * 60 * 2,
   |      ^
324|    });
```

This is a real bug — the `useQuery` options object had `staleTime`
defined twice. In JS object literals the last assignment wins
(`1000 * 60 * 2` = 120,000ms), silently overriding the first
(`60_000` = 60s). **Fixed in this commit** by removing the first
`staleTime: 60_000` line. The new `scripts/check-no-duplicate-keys.mjs`
guard (wired into `validate:blocking`) prevents this class of bug
from re-entering main.

## `warning` lines

Three non-fatal warning lines were emitted by `vite build`:

```
(!) %VITE_GA_MEASUREMENT_ID% is not defined in env variables found in /index.html. Is the variable mistyped?
(!) %VITE_GA_MEASUREMENT_ID% is not defined in env variables found in /index.html. Is the variable mistyped?
Browserslist: browsers data (caniuse-lite) is 11 months old. Please run:
  npx update-browserslist-db@latest
```

Notes:

- **`%VITE_GA_MEASUREMENT_ID%` not defined** (emitted twice — once per
  occurrence in `index.html`). Vercel injects this at build time from
  the project env; locally it's unset because `.env` isn't checked in.
  Not a real issue for production, but the local build leaves the
  placeholder string in `dist/index.html` which would show up to users
  if anyone served the local `dist/` directly. Worth gating with a
  default at index-injection time or moving to runtime injection in a
  follow-up.
- **Browserslist DB is 11 months old**. Doesn't fail the build —
  caniuse-lite just suggests refreshing. Safe to bump via
  `npx update-browserslist-db@latest` in a routine PR.

## Other notable build output

- **No `node_modules/**` or `dist/**` collisions reported.**
- **No `chunk size larger than ...` warning** at the default 500 KB
  threshold (largest emitted chunk is `index-_F_IEwVx.js` at 975 KB
  but Vite did not emit a console warning under the current
  `build.chunkSizeWarningLimit` setting).
- **Vite exit code: 0.** Build artifacts emitted to `dist/` in 45.71s.

## ESLint warnings (separate from `vite build`, recorded for completeness)

`npm run lint` exits 1 with **626 problems (545 errors, 81 warnings)**.
Errors are almost entirely `@typescript-eslint/no-explicit-any` in
`supabase/functions/**/index.ts` (Deno edge functions). Warnings are
overwhelmingly `react-refresh/only-export-components` in the shadcn UI
shim files (`src/components/ui/*.tsx`) and one
`@typescript-eslint/no-unused-vars` directive. None block the
production build today, but the ESLint exit code is non-zero — see
`docs/audit-notes.md` for follow-up suggestions.
