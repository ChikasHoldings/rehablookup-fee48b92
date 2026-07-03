# Pre-go-live security/config checks (2026-07-03) — item 8

Applied where safe via migration; the rest are owner/dashboard-only and documented here.

## Applied (migration `20260829005200`)
- **facility-staff-photos** and **seeker-avatars** storage buckets now restrict
  `allowed_mime_types` to `image/jpeg,image/png,image/webp` and set a
  `file_size_limit` (10 MB / 5 MB) — previously both were NULL (any type, any
  size). Matches `facility-images`. Verified live via `storage.buckets`.

## Owner/dashboard-only — MANUAL STEP REQUIRED (non-blocking)

### Leaked-password (HIBP) protection — DISABLED
Supabase security advisor `auth_leaked_password_protection` = WARN. This is a
project **Auth** setting that cannot be toggled via SQL/MCP; it must be enabled
by a project owner:

> Supabase Dashboard → **Authentication → Policies / Password protection** →
> enable **"Check passwords against HaveIBeenPwned"** (Leaked password
> protection). Docs: https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection

Low risk to enable; only affects new/changed passwords. Recommended before GA.

### Stripe Pro product id in `PRO_PRODUCT_IDS`
`supabase/functions/_shared/email-templates.ts` `PRO_PRODUCT_IDS` currently:
`prod_pro_monthly` (legacy placeholder) + `prod_TbalLOPujTIoUe`,
`prod_Tbyz1bf6iYyzYd`, `prod_TbalOeJZA2ZoJl`, `prod_TbyzJVNOQL71NN`.

This fallback is only consulted for email/plan-label classification; the
authoritative Pro state is `facility_subscriptions.tier/status` +
`has_active_pro()`, not this list. **Manual confirmation (owner):** verify the
live Stripe **Pro** product id is one of the four `prod_*` values above. If the
live product id differs, add it — or (safer, no future drift) switch the
classifier to match on the Stripe **price lookup_key / price metadata** instead
of hard-coded product ids. Not changed in this pass to avoid destabilizing the
webhook/checkout classification without a confirmed live id.
