# Monetization Pro-upgrade fixes — 2026-05-20

Pair with `docs/monetization-pro-upgrade-audit-2026-05-20.md`. The
audit found that 8 of 9 Prompt-2 findings were already implemented;
the only outstanding work was source-of-truth alignment on 5 retired
edge functions.

## Fix 1 — Vendor five 410-tombstone edge functions (Finding 9)

Five edge functions are deployed to the Supabase project as
`function_retired` tombstones that return HTTP 410 Gone. None had a
file in the repo, which violated the "deployed function ⇔ repo file"
invariant the C10 audit established for `register-provider-account`.

This commit vendors matching local files so the repo and the deployed
set agree. Each file is a single `Deno.serve` handler that returns the
same 410-Gone payload as the deployed version, byte-equivalent (modulo
header comment that documents the retirement context).

| Vendored file | Bytes | Reason for retirement |
| --- | --- | --- |
| `supabase/functions/create-concierge-checkout/index.ts` | ~1.0 KB | Domestic concierge is now free for seekers; providers subscribe via `create-checkout-session` |
| `supabase/functions/charge-placement-fee/index.ts` | ~1.0 KB | Domestic per-admission fees dropped (EKRA compliance) |
| `supabase/functions/record-placement-agreement/index.ts` | ~0.9 KB | Per-admission agreements dropped (EKRA) |
| `supabase/functions/submit-placement-case/index.ts` | ~1.0 KB | Replaced by `submit-international-intake` for international, retired for domestic (EKRA) |
| `supabase/functions/retry-failed-payments/index.ts` | ~1.0 KB | `placement_invoices` table dropped; dunning now via Stripe-native + `notify-payment-failed` |

**Validation**: each retired function previously had no live caller in
`src/` or `supabase/functions/` (`grep -rn` returned 0 matches). The
410 tombstones serve as documentation + fail-loudly mechanism if a
future change inadvertently routes a call to one.

## Fix 2..8 — N/A (already implemented)

Per the audit, no code change is required for Findings 1, 2, 3, 4, 5,
6, 7, 8. Each is verified against file:line in the audit doc.

## Verification

```
$ git rev-list --count origin/claude/monetization-1-plan-gate ^HEAD
0   # branch descends from monetization-1 tip
$ npx tsc --noEmit
(clean, no output)
$ git diff --stat origin/claude/monetization-1-plan-gate..HEAD
 (excluding build artifacts)
 docs/monetization-pro-upgrade-audit-2026-05-20.md
 docs/monetization-pro-upgrade-fixes-2026-05-20.md
 supabase/functions/charge-placement-fee/index.ts
 supabase/functions/create-concierge-checkout/index.ts
 supabase/functions/record-placement-agreement/index.ts
 supabase/functions/retry-failed-payments/index.ts
 supabase/functions/submit-placement-case/index.ts
```

Diff against deployed:
- Local 410-stub source equals deployed function source (cross-checked
  against `mcp__supabase__get_edge_function` output for each slug).
- Vendored versions carry an additional explanatory block-comment
  header so a developer reading the repo learns the retirement reason
  without round-tripping to Supabase.

## Ship-readiness

Prompt 2 ships. The Pro-upgrade pipeline is hardened end-to-end:
- ✅ Idempotent Checkout (30-min reuse + 5-min idempotency-key bucket)
- ✅ Webhook event dedup with admin-notification on failure
- ✅ `profiles.plan` mirror on both upgrade and downgrade
- ✅ Pro benefits activation idempotent (`featured` + ranking-score
  boost only when transitioning from `featured=false`)
- ✅ Polling-timeout dead-end resolved (admin notification + dashboard
  fallback recovery)
- ✅ Server-side single-flight (Stripe idempotency-key + open-session
  reuse)
- ✅ Dunning banner on `/provider/billing` with Stripe Portal CTA
- ✅ Cancellation round-trip with refund-scope picker
- ✅ Source-of-truth alignment with 5 vendored 410-tombstones

Forward dependency for Prompts 3 (Featured) and 4 (Concierge):
`create-checkout-session` exists locally + deployed and handles the
add-on flows. No need to "build" it as the master plan implied — that
section of the master plan was stale.
