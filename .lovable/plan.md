

# Exit-Intent Lead Capture System

## Overview

Build a smart, non-intrusive exit-intent lead capture modal that triggers based on user behavior (desktop cursor exit, scroll depth, time-on-page), captures minimal contact info, stores leads in the existing `leads` table, sends email notifications via existing Resend infrastructure, and surfaces captured leads in the existing Admin Leads dashboard.

## Architecture

```text
Layout.tsx
  └── ExitIntentCapture (new component, rendered once)
        ├── useExitIntentTrigger (hook: desktop exit, scroll, time)
        ├── ExitIntentModal (Dialog using existing UI system)
        └── submit → Edge Function → leads table + emails
```

## Implementation Plan

### 1. Database: No Schema Changes Needed

The existing `leads` table already has all required columns: `id`, `name`, `email`, `phone`, `source`, `status`, `created_at`, and `page_url` can be stored in `location_city_state` or `message`. The `source` field will be set to `"exit_intent"`.

The `sourceLabels.ts` file needs one new entry: `exit_intent: "Exit Intent"`.

### 2. Trigger Hook: `useExitIntentTrigger`

New file: `src/hooks/useExitIntentTrigger.ts`

- **Desktop exit-intent**: `mouseleave` on `document.documentElement` when `clientY < 10`
- **Scroll trigger**: fires after 60% scroll depth
- **Time trigger**: fires after 45 seconds on page
- **Mobile**: scroll + time only (no mouse events)
- **Session guard**: `sessionStorage` key prevents re-showing after dismiss or submit
- **Already-submitted guard**: check `sessionStorage` for submission flag
- Returns `{ shouldShow, dismiss }` — fires once per session, first trigger wins

### 3. Exit-Intent Modal Component

New file: `src/components/ExitIntentCapture.tsx`

- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` from `src/components/ui/dialog.tsx`
- Uses existing `Button`, `Input`, `ValidatedInput` components
- Form fields: First Name (required), Email (required, uses `EmailInput`), Phone (optional, uses `PhoneInput`)
- States: idle form, loading (spinner on button), success message, error with retry
- Messaging: "Before you go — let us help you find the right treatment" / "Get matched with verified treatment centers near you"
- Clean close via X button or backdrop click
- Compact modal (max-w-md), not full-screen takeover
- Stores `window.location.pathname` at trigger time for page URL tracking

### 4. Edge Function: `submit-exit-intent-lead`

New file: `supabase/functions/submit-exit-intent-lead/index.ts`

- Accepts: `firstName`, `email`, `phone` (optional), `pageUrl`
- Input validation with Zod (name 1-100 chars, valid email, optional phone)
- Duplicate check: query `leads` table for same email + source `exit_intent` in last 24 hours
- Insert into `leads` table: `name = firstName`, `email`, `phone`, `source = "exit_intent"`, `status = "new"`, `message = pageUrl` (to store capture page)
- Send admin notification email via Resend to `chikasholdings@gmail.com`
- Send user confirmation email via Resend using branded template matching `send-lead-confirmation` style
- Returns success/duplicate/error response
- Standard CORS headers and error handling

### 5. Source Label Update

Update `src/lib/sourceLabels.ts` to add `exit_intent: "Exit Intent"` mapping so Admin Leads dashboard displays the source correctly.

### 6. Layout Integration

Add `<ExitIntentCapture />` to `Layout.tsx` alongside `BackToTop` and `FloatingHelpButton` — renders on all public pages, lazy-loaded, zero layout impact.

### 7. Admin Dashboard: Already Wired

The existing `AdminLeads.tsx` page already:
- Fetches all leads from the `leads` table
- Displays source labels via `formatSourceLabel()`
- Supports filtering, sorting, search, status updates
- Has real-time subscription for new leads
- Shows lead profile modal with full details

No changes needed — exit-intent leads will appear automatically with source badge "Exit Intent".

## Technical Details

- **Performance**: Hook uses passive event listeners; component lazy-loaded; no DOM polling
- **Privacy**: No cookies used; `sessionStorage` only (cleared on tab close)
- **Deduplication**: Server-side 24-hour window check on email + source combination
- **Email**: Uses existing Resend integration with `no-reply@rehablookup.com` sender and branded `#1B365D` templates
- **Mobile**: `useIsMobile()` hook disables `mouseleave` listener; relies on scroll (60%) and time (45s) only

