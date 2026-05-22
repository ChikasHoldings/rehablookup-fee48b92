# Accessibility (axe-core) — top 20 routes

**Date:** 2026-05-22  
**Spec:** `tests/visual/a11y-axe.spec.ts`  
**Tag set:** WCAG 2.1 A + AA (best-practice rules intentionally not enabled — they hide real failures with noise).

## What this commit shipped

1. **Skip-link duplication fixed.** Two skip-to-main links were rendering after hydration:
   - `index.html:417` — `<a class="skip-link">Skip to content</a>` (static shell, present pre- and post-hydration)
   - `src/components/layout/Layout.tsx:46` — `<a className="skip-link">Skip to main content</a>` (React Layout, only on Layout-using routes after hydration)

   The React one was removed. The static one's text was updated to `"Skip to main content"` so the single remaining link uses the more precise label. Snapshot test (`src/test/layout-shell.test.tsx`) updated.

2. **`@axe-core/playwright` added** as a dev dependency.

3. **`tests/visual/a11y-axe.spec.ts`** runs axe against 20 routes sampled stratified by path prefix from `public/prerender-manifest.json`. Same sample every run (reproducible failures).

4. **This doc** covers how to run the audit and where to fix violations.

## What this commit did NOT ship

This sandbox can't run a headless browser, so the full audit run + per-violation fixes (color contrast, labels, heading order) need to happen on a machine with a browser. The spec is the forcing function: it fails loudly on each violation, and each fix-commit removes a failing route from the list.

## Running the audit

```bash
# 1. Install Playwright browser binaries (one-time).
npx playwright install chromium

# 2. Start the dev server.
npm run dev          # terminal 1

# 3. Run the a11y spec.
PLAYWRIGHT_BASE_URL=http://localhost:8080 \
  npx playwright test a11y-axe   # terminal 2
```

The spec sets `expect(serious).toHaveLength(0)` per route, where `serious` = axe violations with `impact === "serious"` OR `"critical"`. Moderate/minor violations are printed but don't fail the run; deal with them in a separate pass.

## Reading the output

When a route fails:

```
/concierge — 2 serious/critical violation(s):
  ✗ [serious] color-contrast: Elements must meet minimum color contrast ratio thresholds
      help: https://dequeuniversity.com/rules/axe/4.x/color-contrast
      target: .text-muted-foreground
      why: Element has insufficient color contrast of 3.42 (foreground #8a93a3, background #f5f7fa). Expected ≥ 4.5:1.
  ✗ [critical] label: Form elements must have labels
      target: input[name="zip"]
      why: Form element does not have an implicit or explicit label.
```

## Fix recipes

### Color contrast

Almost always traces to a semantic token (`text-muted-foreground`, etc.) whose HSL in `src/index.css` is too light against the page background.

1. Find the token: `grep -A1 "muted-foreground:" src/index.css`.
2. Check against `--background` via [WebAIM contrast checker](https://webaim.org/resources/contrastchecker/) or [Stark](https://www.getstark.co/).
3. Bump L value until ratio is ≥ 4.5:1 for body text (≥ 3:1 for ≥ 18pt or bold ≥ 14pt).
4. Re-run. If one change fixes 30 routes, you've found a systemic issue — commit it alone.

### Missing labels

`<input>`, `<select>`, `<textarea>` without a programmatic label.

1. Best: `<label htmlFor="x">…</label>` + `<input id="x" />`.
2. Acceptable when visual-only label suffices: `aria-label="…"` on the input.
3. Avoid `aria-labelledby` pointing at decorative text — brittle.

### Heading order

axe rule: `heading-order`. The page goes `h1 → h3` skipping `h2` (etc.).

1. List levels: `Array.from(document.querySelectorAll('h1,h2,h3,h4,h5,h6')).map(h => h.tagName)`.
2. Renumber subsequent headings down, or convert a decorative heading into a `div` (no semantic level).
3. Never rely on CSS to "fix" heading order — it doesn't change AT semantics.

### Skip-link

Already fixed in this commit. If `bypass` or `skip-link` flags again, regression in `index.html` or `Layout.tsx`.

## CI gate

Once the baseline is green, add to `.github/workflows/*` (or whatever runs the visual specs):

```yaml
- name: a11y audit
  run: |
    npm run dev &
    npx wait-on http://localhost:8080
    PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test a11y-axe
```

**Do not gate merges** until the baseline is green — it would fail every PR for unrelated reasons. Intermediate state is acceptable: the spec is in the repo, can be run locally, tracks the work.

## Status — 2026-05-22

| Step | State |
|------|-------|
| Skip-link duplication fixed | ✓ done |
| `@axe-core/playwright` installed | ✓ done |
| Spec authored, 20-route stratified sample | ✓ done |
| Full audit run + per-violation fixes | ◯ requires browser sandbox |
| CI gate in place | ◯ blocked on baseline being green |
