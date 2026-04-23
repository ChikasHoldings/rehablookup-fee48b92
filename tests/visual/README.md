# Visual regression tests

These Playwright specs capture pixel-accurate screenshots of every key public
page at three viewports: **320px**, **768px**, and **1024px**. They are NOT
part of the default `npm run build` because they need a real Chromium binary.

## When to run

- After any UI / Tailwind class change to a public page or shared shell
- Before publishing a release
- In CI on every PR (recommended once Playwright is installed in your CI image)

## Setup (one-time)

```bash
npx playwright install chromium
```

## Generate baselines

The first run produces the baseline images that future runs diff against:

```bash
npm run dev                              # terminal 1
npx playwright test --update-snapshots   # terminal 2
```

Baselines are written to `tests/visual/__screenshots__/` — commit them.

## Run regression check

```bash
npm run dev                # terminal 1
npx playwright test        # terminal 2
```

Failures produce a side-by-side diff in `test-results/`.

## Accepting an intentional UI change

```bash
npx playwright test --update-snapshots
```

Then review and commit the updated baseline PNGs.

## Coverage

13 pages × 3 viewports = **39 screenshots per run**. Pages covered:

- Home, About, How It Works, FAQ, Contact
- Rehab Centers (state + treatment-type indexes)
- California state landing
- Detox Programs treatment landing
- Concierge, Insurance, Cost Estimator
- Blog index

Add new pages by appending to the `PAGES` array in `public-pages.spec.ts`.
