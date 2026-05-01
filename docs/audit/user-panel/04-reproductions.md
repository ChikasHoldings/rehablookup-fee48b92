# User Panel — Targeted Reproductions (Phase 4)

> Captured: 2026-05-01. Each item below is an independent, reproducible test against the live preview / live edge functions.

## R-1 — C-1 reproduced (`email_required` returns object envelope)

**Method:** Direct POST to `submit-qualified-lead` with empty email.

```
$ curl -X POST .../submit-qualified-lead \
    -d '{"facilityId":"00...001","name":"Audit Test","phone":"5551234567","email":""}'
HTTP 400
{
  "error": { "code": "email_required", "message": "Email is required" },
  "code": "email_required",
  "reason": "Email is required",
  "_version": "2.1.0",
  "details": { "field": "email" }
}
```

**Compare** — name validation still uses legacy string envelope:

```
$ curl ... -d '{"facilityId":"...","name":"X","phone":"5551234567","email":"a@b.co"}'
HTTP 400
{ "success": false, "error": "Name is required (minimum 2 characters)" }
```

**Confirms C-1** — the lead-intake client (`useLeadIntakeForm.ts:478`) does
`throw new Error(data.error)`. With the email-shape, `new Error({...})` produces
a `"[object Object]"` toast.

## R-2 — Unmapped slug → SmartCatchAll → NotFound ✅

**Method:** Browser nav `/foo-bar-no-such-slug`.
**Result:** Renders `<NotFound />` with a 404 heading and "Page Not Found" copy.
No infinite redirect, no blank page.

## R-3 — Unknown facility slug → graceful CenterNotFound ✅

**Method:** Browser nav `/center/no-such-facility-slug-zzz`.
**Result:** Renders the "Center Unavailable" page with heading
"We couldn't find that center" and a recovery paragraph
("Let's help you find the right one"). Confirms `CenterNotFound` is wired.

## R-4 — Admin hitting `/account/saved` → redirect ✅ (S-1 not visually triggered this run)

**Method:** Browser nav `/account/saved` while logged in as admin.
**Result:** URL settled at `/admin/dashboard` (correct redirect from `SeekerShell`).
**Note:** The S-1 race (admin briefly seeing the seeker "Complete Your Profile"
empty state) is **not visible at every load** — it requires `seeker-profile`
query to resolve before `shell-role-check`. The static analysis (Phase 3) shows
the missing `userRole === "seeker"` guard at `SeekerShell.tsx:219`, so the bug
exists in code regardless of timing in this particular run. Still recommend the
guard as a defense-in-depth fix.

## Items deferred / not reproduced this pass

- C-1 in concierge intake (Step 5 with malformed email) — same bug class as R-1,
  same root cause; not re-reproduced because the fix is shared.
- Anonymous user hitting `/account/*` — the browser session is logged in as admin
  and we won't sign out without user approval. Static trace confirms the redirect
  to `/login?redirect=/account/...` works (`SeekerShell.tsx:188`).
- Live submission of a real lead — would create production data; skipped.

End of Phase 4.
