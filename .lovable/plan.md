# Resilient Reveal in Unlock Success Dialog

After a provider successfully unlocks a lead, `UnlockLeadButton.tsx` fetches the now-revealed `name`, `email`, `phone` from `leads_provider_view` to populate the success dialog. Today this fetch:

- has no retry,
- silently swallows failures (`catch {}`),
- shows the dialog with empty fields and no indication anything went wrong,
- and offers no way to recover without closing and re-finding the lead.

This plan adds bounded retry, a visible error state, and a manual retry button.

## What changes

### 1. Extract the reveal fetch into a helper with retry

In `src/components/provider/UnlockLeadButton.tsx`:

- New helper `fetchRevealedLead(leadId)` that wraps the existing `supabase.from("leads_provider_view").select("name, email, phone").eq("id", leadId).maybeSingle()` call.
- Auto-retry up to 3 attempts with exponential backoff (300ms, 800ms, 1500ms) on:
  - network/transport error,
  - Supabase error response,
  - row returned but all of `name`, `email`, `phone` are still `null` (RLS lag after unlock — replication can briefly trail the `lead_unlocks` insert).
- After auto-retries are exhausted, surface a structured error to the caller (does not throw — returns `{ data, error }`).

### 2. Track reveal loading + error state

Add three new pieces of component state next to the existing `revealedLead`:

- `revealLoading: boolean` — true while fetching/retrying.
- `revealError: string | null` — friendly message when all retries fail.
- A stable `loadRevealed(leadId)` callback used by both the post-unlock flow and the manual retry button.

The post-unlock flow becomes:

1. Open success dialog immediately with `revealLoading = true` (so the user sees confirmation that the unlock itself succeeded).
2. Call `loadRevealed(leadId)`. On success → populate `revealedLead`. On failure → set `revealError`.

This decouples "unlock succeeded" (which the server already confirmed via `unlockLead.mutateAsync`) from "we managed to fetch the freshly-readable PII".

### 3. Update `UnlockSuccessDialog` UI

Three visual states inside the existing revealed-contact card:

- **Loading**: 3 short skeleton rows in place of name / phone / email, with the heading "Loading contact details…".
- **Error**: replace the contact card with an inline error block (semantic `bg-destructive/10` / `text-destructive`), showing:
  - icon + heading "Couldn't load contact details"
  - body: "The unlock succeeded and you've been charged. We just couldn't fetch the revealed details. Try again in a moment."
  - **Retry** button (primary, with spinner while retrying) calling `loadRevealed(leadId)` again.
  - Secondary text link "Open in inbox" → `/provider/inquiries?lead=<id>` as a Zero-Dead-End fallback.
- **Loaded**: existing layout with name / phone / email + Call / Text / Email action row (unchanged).

The receipt block (Charged / Remaining balance) and the "Got it" footer button stay visible in all three states.

### 4. Props

Extend `UnlockSuccessDialogProps`:

- `loading: boolean`
- `error: string | null`
- `onRetry: () => void`
- `leadId: string` (used for the "Open in inbox" link)

No other call sites change — the dialog is internal to `UnlockLeadButton`.

## Out of scope

- No DB or RPC changes. The reveal still goes through `leads_provider_view` (masked view, RLS-enforced).
- No change to the `unlock-lead` edge function or to credit accounting — those are already authoritative on the server and unaffected by reveal-fetch failure.
- No new toasts (the existing success toast from `useLeadUnlocks` already fires).

## Files touched

- `src/components/provider/UnlockLeadButton.tsx` — add retry helper, reveal state, updated `handleUnlock`, updated `UnlockSuccessDialog` with loading / error / retry rendering.

## Verification

- Manual: temporarily force the reveal fetch to fail (e.g. wrong column) → confirm error state + Retry button appears, retrying restores normal state.
- Existing tests: `npm run test` (the provider masking contract test still passes — we keep using `leads_provider_view` with explicit columns).
