# Monetization cross-cutting fixes — 2026-05-20

Pair with `docs/monetization-cross-cutting-audit-2026-05-20.md`.

## Fix 1 — Vendor `admin-manage-invoice` 410-tombstone

The deployed function is a 410 Gone tombstone (retired with the EKRA
rebuild — `placement_invoices` and `provider_fee_status` were
dropped). No local file existed.

Vendored at `supabase/functions/admin-manage-invoice/index.ts` with
header comment documenting:
- Why it was retired (EKRA flat-fee model dropped per-placement
  invoice ledger)
- Where the canonical flows now live (Stripe Dashboard for Pro/add-on
  invoice management, Stripe Customer Portal for provider self-serve,
  `manage-international-case` for international invoicing)
- Why no admin invoice UI is built in the repo (no longer needed —
  Stripe owns this layer)

Closes the source-of-truth split that left this function
deployed-only. Now the C10 invariant holds for every monetization
function in the project.

## Fix 2..11 — N/A

Findings 1-2, 4-11 verified PASS in the audit doc. No code changes
required for those findings. Finding 3 (admin invoice UI) is
intentionally not built — see audit doc for rationale.

## Verification

```
$ git rev-list --count origin/claude/monetization-4-concierge ^HEAD
0   # branch descends from monetization-4 tip
$ npx tsc --noEmit
(clean)
$ ls supabase/functions/admin-manage-invoice/index.ts
(exists, 410-tombstone matching deployed)
```

## Ship-readiness

Cross-cutting monetization ships. The last item on the master plan is
Prompt 6 (smoke tests) — runtime end-to-end verification against a
Stripe test account.
