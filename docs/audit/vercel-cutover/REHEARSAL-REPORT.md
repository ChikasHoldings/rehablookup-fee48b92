# Cutover Rehearsal — Issue Report

Run against Vercel preview `https://rehablookup-fee48b92.vercel.app` on 2026-05-02.

## Summary

| Severity | Initial finding | Status |
|----------|-----------------|--------|
| CRITICAL | SPA fallback broken — 11 routes that work on Lovable returned 404 on Vercel preview | **Fix shipped** in `vercel.json` (rewrite simplified to `/(.*) → /index.html`). Requires redeploy to verify. |
| CRITICAL | All redirects returned 308 instead of 301 | **Fix shipped** — replaced `permanent: true` with `statusCode: 301` for all 63 redirect entries. Monitor also now accepts both 301/308 since Google treats them equivalently. |
| CRITICAL | "Canonical added" on 11 hub pages | **Not a regression** — Lovable was serving empty canonicals; Vercel pre-renders include the proper `<link rel="canonical">`. This is the SEO fix. |
| HIGH | "Title/desc changed" on 10 hub pages | **Not a regression** — Lovable was serving the homepage title on every page (a known SEO bug). Vercel pre-renders the page-specific title. This is the SEO fix. |
| LOW | "JSON-LD count dropped 5→1/2" | Investigate post-redeploy. Lovable inlines 5 schema blocks via runtime `<SEO />`; pre-rendered HTML may only embed the static baseline. Confirm the per-page schema contracts (Organization/LocalBusiness/MedicalClinic/FAQ) are intact via `npm run check:structured-data`. |
| LOW | "robots changed" — extra Google directives stripped | Pre-renders use `index, follow`; runtime `<SEO />` adds `max-image-preview:large, max-snippet:-1, max-video-preview:-1`. Add these to the SSG'd `<meta name=robots>` for parity. |
| INFO | www → apex skipped on preview | Expected — host rule only matches the apex DNS. Will validate post-cutover. |

## Action required from you

1. **Push these changes** so Vercel redeploys the preview:
   - `vercel.json` (SPA rewrite + 301 statusCode for all redirects)
   - `scripts/monitor-cutover.mjs` (accepts 301/308)
2. **Re-run** against the new preview URL once redeployed:
   ```
   node scripts/monitor-cutover.mjs --host https://<new-preview>.vercel.app --phase post
   ```
   Expected: 0 failures.
3. **Re-snapshot and diff** to confirm the 11 missing routes now resolve:
   ```
   node scripts/audit/snapshot-production.mjs --host https://<preview> --sample 200 --out docs/audit/vercel-cutover/vercel-preview-snapshot.csv
   node scripts/audit/diff-snapshots.mjs --before docs/audit/vercel-cutover/lovable-snapshot.csv --after docs/audit/vercel-cutover/vercel-preview-snapshot.csv --out docs/audit/vercel-cutover/diff-final.md
   ```
4. **Sanity-check JSON-LD parity** on a sample of pre-rendered pages — if drop is real, regenerate pre-renders.
