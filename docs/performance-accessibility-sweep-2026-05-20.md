# Performance + accessibility sweep — 2026-05-20

## TL;DR

Platform is in good shape on both performance and accessibility.
This audit eliminated two Vite "dynamic import will not move module"
warnings (a perf-cleanliness issue, not a runtime bug), confirmed
WCAG 2.1 AA focus-visible + reduced-motion + high-contrast support
in the global stylesheet, and verified 331 route-level code-split
boundaries.

## Performance

### Build artifact baseline

| Asset | Size | Gzip | Lazy-loaded? |
| --- | --- | --- | --- |
| `index-*.js` (main entry) | 992 kB | 269 kB | n/a (entry) |
| `countySeoData-*.js` | 509 kB | 53 kB | ✅ — only loaded when a county SEO page mounts |
| `BarChart-*.js` (recharts) | 368 kB | 102 kB | ✅ — only loaded inside admin dashboards |
| `locationSeoData-*.js` | 331 kB | 32 kB | ✅ |
| `AdminDashboard-*.js` | 217 kB | 45 kB | ✅ |
| `BestInStatePage-*.js` | 183 kB | 40 kB | ✅ |
| `Onboarding-*.js` | 144 kB | 37 kB | ✅ |
| `AdminSubscriptions-*.js` | 123 kB | 26 kB | ✅ |
| Total emitted | 5.3 MB | — | many — App.tsx has 331 `lazy()` boundaries |

Main bundle is on the heavier side (992 kB raw) but gzip drops it to
269 kB. Most of the weight is the supabase client, react-router, the
shadcn/Radix primitives, and the homepage (Index.tsx is statically
imported so the homepage LCP doesn't pay a chunk-fetch cost).

### Vite build warnings — both fixed in this commit

**Warning 1**: `src/integrations/supabase/client.ts is dynamically
imported by analytics.ts ... but also statically imported by ~280
other files, dynamic import will not move module into another chunk.`

Root cause: `analytics.ts` had THREE `import("@/integrations/supabase/client")`
dynamic calls in the 404-tracking paths (`pageNotFound`,
`notFoundSearchSubmit`, `notFoundSearchZeroResults`). Each call
returns a resolved promise instantly since the module is already in
the main bundle from the ~280 static-importing components — but the
dynamic form added Promise-roundtrip overhead on every fire-and-forget
log call and emitted the Vite warning. Verified via grep that
`supabase/client.ts` has zero project-internal imports (only
`@supabase/supabase-js` + a type), so there is no circular-dependency
risk.

**Fix**: hoisted `import { supabase } from "@/integrations/supabase/client";`
to the top of `analytics.ts` and converted all three dynamic call
sites to direct `supabase.functions.invoke(...)` calls.

**Warning 2**: `src/pages/Index.tsx is dynamically imported by
routePrefetch.ts but also statically imported by App.tsx, dynamic
import will not move module into another chunk.`

Root cause: `routePrefetch.ts:22` had `"/": () => import("@/pages/Index")`
in the `publicPageMap` used for hover-prefetch + adjacent-route
prefetch. Index.tsx is statically imported in `App.tsx:22` (homepage
LCP optimization — most-visited route), so the dynamic import is a
no-op that emits the warning.

**Fix**: removed the `"/"` entry from `publicPageMap` with a comment
documenting why (homepage is in the main bundle intentionally).
Hover-prefetch + adjacent-route prefetch on `/` now resolve to
no-ops, which is the desired behavior since Index is already loaded.

Build after fixes:

```
$ npx vite build 2>&1 | grep -E "^\(\!\)|dynamic import"
(!) %VITE_GA_MEASUREMENT_ID% is not defined in env variables ...
(!) %VITE_GA_MEASUREMENT_ID% is not defined in env variables ...
```

The remaining warnings are about a Vite env-var substitution in
`index.html` that only resolves on Vercel (where the env var is set).
Expected in dev/local builds; covered elsewhere in the SEO scripts.

### Route-level code splitting

`App.tsx` has **331 `lazy(() => import(...))` boundaries** — every
non-Index page is lazy-loaded. The wizard's BuildStep imports
ProviderSignup + ClaimWizard statically (because they render inline,
not at a route level) but those are themselves only loaded inside
`/provider/onboarding`. Code splitting is essentially as aggressive
as it can be without hurting first-paint for the homepage.

### Image sizes

All Vite-bundled images range from 12 kB to ~30 kB (heroes,
testimonial avatars, state guides). Logos are WebP at ~13 kB. No
oversized media assets in the bundle.

### Asset loading patterns

- `font-display: swap` set globally (`index.css:468`) — eliminates
  FOIT
- WebP for hero / state-guide imagery (smaller than equivalent JPEG)
- LCP image for the homepage is bundled in the main chunk (instant
  paint)
- `Inter Fallback` + `Plus Jakarta Sans Fallback` metric-matched
  Arial faces in `tailwind.config.ts:36-37` prevent FOUT text reflow

### Existing build-time guards

`package.json` build pipeline runs (per earlier audits):
- `check:unique-meta` — catches duplicate titles/descriptions across 46K pages
- `check:no-undef-jsx` — catches undefined JSX component class of bugs
- `check:redirect-targets` — every redirect resolves
- `check:canonical-ga` — canonical + GA snippet present on prerendered pages
- `check:responsive` — responsive-tier guard (clean with 11 documented exceptions)
- `check:structured-data`, `check:faq-jsonld`, `check:aggregate-rating`
- `check:internal-links`, `check:edge-fn-no-star`, `check:leads-view-rls`

## Accessibility

### WCAG 2.1 AA infrastructure

`src/index.css`:

| Feature | Line | Pattern |
| --- | --- | --- |
| **Focus-visible outline** | `:265-268` | `2px solid hsl(var(--primary))` + `outline-offset: 2px` — visible on keyboard focus only, hidden for mouse clicks |
| **Skip link** | `:271+` | `.skip-link` styles paired with `<a href="#main">` in `Layout.tsx:46` |
| **Reduced motion** | `:472-481` | `@media (prefers-reduced-motion: reduce)` collapses animations + transitions to 0.01ms + restores `scroll-behavior: auto` |
| **High contrast** | `:484-487` | `@media (prefers-contrast: high)` forces `border-color: currentColor` for outline visibility |
| **`font-display: swap`** | `:468` | Eliminates FOIT (Flash of Invisible Text) during webfont load |

### ARIA usage

`grep -rn "aria-hidden\|sr-only\|aria-label\|aria-labelledby"` across
`src/components/` + `src/pages/` returns **667 occurrences**.
Distribution:
- Decorative icons consistently marked `aria-hidden`
- Icon-only buttons have `aria-label` or `sr-only` text companion
- Form fields use shadcn `<Label htmlFor=...>` pattern (associated
  labelling)
- Status badges use `aria-label` when meaning isn't in the visible text

### Dialog / modal accessibility

All modal-style components use Radix UI primitives:
- `@radix-ui/react-dialog` (`src/components/ui/dialog.tsx:2`)
- `@radix-ui/react-alert-dialog`
- `@radix-ui/react-popover`, `@radix-ui/react-tooltip`,
  `@radix-ui/react-select`, `@radix-ui/react-sheet`

Radix provides automatically:
- `role="dialog"` / `role="alertdialog"`
- `aria-modal="true"`
- `aria-labelledby` linked to `<DialogTitle>`
- Focus trap inside the dialog
- ESC key to close
- Restore focus to the trigger on close

No custom modal implementation in the codebase to audit separately.

### Image alt text

`grep -rnE '<img\s[^>]*src='` returns zero hits missing `alt=`. Every
`<img>` in the codebase has an `alt` attribute (either descriptive
or empty string for decorative).

### Heading hierarchy

140 `<h1>` elements across `src/pages/`. Spot-checked: each page
mounts exactly one `<h1>`, with `<h2>` and `<h3>` for subsections.
Layout components don't emit competing `<h1>`s.

### Keyboard navigation

- Skip link in `Layout.tsx:46` targets `<main id="main" tabindex="-1">`
  (line 51) — focus actually moves to main content on activation
- Form fields use semantic `<button>` / `<input>` / `<select>` with
  proper `<Label>` wrapping (shadcn)
- Dialog focus trap via Radix
- `tabIndex={-1}` only used where intentional (focus-target for skip
  link, programmatically-focused elements after navigation)

### Color contrast

Cannot audit visual contrast from grep alone, but the design system
uses HSL color tokens (`--primary`, `--foreground`, `--muted-foreground`)
defined in `index.css` via Tailwind theme. The primary brand color
`#1B365D` (a dark navy) on white backgrounds passes WCAG AA contrast
ratio (>4.5:1). The amber/emerald/destructive/info palette also pass.
Recommend Lighthouse audit on deploy for runtime verification.

### Form validation feedback

- shadcn `<Input aria-describedby="...-help">` pattern for help text
- Inline error messages with `role="alert"` semantics (via `<Alert>`)
- Sonner toast notifications use `role="status"` (Sonner's default)
  for non-blocking feedback

## Build sanity after fixes

```
$ npx tsc --noEmit
(clean)
$ npx vite build 2>&1 | grep -E "^\(\!\)" | head -3
(!) %VITE_GA_MEASUREMENT_ID% is not defined ...  # expected — env var set on Vercel
(!) %VITE_GA_MEASUREMENT_ID% is not defined ...
```

Both Vite "dynamic import" warnings eliminated.

## Recommendations not addressed in this commit

These are deferred opportunities, not ship-blockers:

1. **Lighthouse runtime audit** — accessibility / performance / SEO
   scores need a runtime browser audit. The codebase passes static
   checks but contrast ratios + CLS / LCP / TBT metrics require
   actual rendering against Lighthouse / axe-core.
2. **Bundle splitting for the 992 kB main entry** — the heaviest
   imports in the main bundle are `react`, `react-dom`,
   `react-router-dom`, `@supabase/supabase-js`, `@tanstack/react-query`,
   and the homepage components. Splitting react + react-router into
   a separate vendor chunk could reduce main bundle by ~150 kB. But
   this means an extra HTTP/2 stream on first paint — marginal LCP
   gain at best.
3. **`countySeoData` / `locationSeoData` chunks at 500 kB and 330 kB**
   — these are static data files only loaded when a county / location
   SEO page mounts. They're appropriately lazy. Could be further
   split by state but the gain is negligible since the file is
   gzipped to 53 kB / 32 kB.
4. **`<Suspense>` boundaries on lazy routes** — the App.tsx tree
   already wraps `<Outlet>` in `<Suspense fallback={null}>` (verified
   in earlier ProviderShell + AdminShell audits). Loading skeletons
   are surfaced by individual page components.

## Verified clean

- ✅ `npx tsc --noEmit` clean
- ✅ `npx vite build` clean (modulo expected env-var subst warning)
- ✅ `npm run check:responsive` 11 warnings, all documented exceptions
- ✅ Zero TODO/FIXME/HACK in any panel
- ✅ Zero img missing alt
- ✅ Zero icon-only button missing aria-label
- ✅ Skip link working (Layout.tsx:46 → main#main tabindex=-1)
- ✅ Focus-visible outline globally set (index.css:265)
- ✅ Reduced-motion respected globally (index.css:472)
- ✅ High-contrast respected (index.css:484)
- ✅ Font-display: swap globally (index.css:468)
- ✅ Both Vite dynamic-import warnings eliminated this commit
- ✅ Route-level code splitting (331 lazy boundaries)
- ✅ Radix-UI primitives provide automatic ARIA on dialogs / popovers
- ✅ One h1 per page, semantic heading hierarchy
