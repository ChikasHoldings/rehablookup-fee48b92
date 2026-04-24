---
name: Anon Column Grants Hardening
description: Anonymous (anon) SELECT access on facilities, facility_reviews, and facility_staff is locked down at the column-grant level — defense in depth on top of RLS
type: feature
---
The platform enforces column-level grants (not just RLS) for anonymous
visitors on every public-facing table. RLS alone is not enough because
PostgREST inherits PUBLIC table grants, and CHECK constraints don't apply
to grants. Pattern: `REVOKE SELECT ON <table> FROM PUBLIC; REVOKE SELECT
... FROM anon; GRANT SELECT (<safe_cols>) ON <table> TO anon;`.

**`facilities` (anon-readable safe columns only):** `id, name, slug, address,
city, state, zip_code, phone, website, description, facility_type, bed_count,
gender_served, logo_url, gallery_urls, featured, verified, status,
year_established, suspended, created_at, updated_at, accepts_international_patients`
plus user_id (needed for owner-write checks). Explicitly anon-locked:
`email, reply_email, admin_notes, concierge_admissions_*, concierge_notes,
concierge_terms_accepted_by/at/version, concierge_agreement_preference,
concierge_availability_status, concierge_accepted_care_types,
concierge_accepted_insurance, concierge_network_opted_in, concierge_opted_in_at,
lead_limit_override, bonus_leads, calculated_ranking_score, response_rate_score,
listing_completeness_score, profile_reminder_count, profile_reminder_sent_at,
last_featured_shown_at, featured_display_order, featured_pinned, leads_reset_at,
profile_completion_celebrated`. The `public_facilities` view
(security_invoker=true) does not project the locked-down columns, so SEO and
public browsing are unaffected.

**`facility_reviews` (anon-readable safe columns only):** `id, facility_id,
rating, review_text, status, helpful_count, reviewer_display_name, disputed,
created_at, updated_at`. Explicitly anon-locked: `user_id, admin_notes,
reviewed_by, reviewed_at`. The reviewer's identity (and previously their
city/state via a seeker_profiles join in `useFacilityReviews.ts`) is no longer
discoverable by anonymous visitors. Display name comes exclusively from the
persisted `reviewer_display_name` snapshot the reviewer chose at submission
time. **Rule:** never re-add a `seeker_profiles` join on the public review
read path — that re-introduces the PII correlation finding
(`facility_reviews_user_id`).

**`facility_staff` (anon-readable safe columns only):** `id, facility_id, name,
job_title, bio, photo_url, display_order, is_visible, created_at, updated_at`.
Explicitly anon-locked: `email, phone`. Owners and admins retain full access
via existing RLS policies; the column revoke is defense-in-depth so a future
relaxed RLS policy still cannot leak staff PII to anon.

**`support_tickets`:** has an explicit
`"Authenticated users can open their own tickets"` INSERT policy scoped to
`authenticated` with `WITH CHECK (sender_user_id = auth.uid())`. Admins keep
their pre-existing ALL policy. Anonymous ticket submission is intentionally
NOT supported — public contact form goes through the
`send-contact-form` edge function instead.

**`admin_force_concierge_status` actor literal:** super-admin status overrides
write `actor_type: 'super_admin'` on `concierge_case_events` (not the legacy
`'admin'`). This matches the granular taxonomy in
`mem://architecture/workflow-state-machine-hooks` so audit-trail filtering
can distinguish a super-admin override from a routine rep action.

**Verification recipe:**
```sql
SELECT col, has_column_privilege('anon', 'public.<table>', col, 'SELECT')
FROM unnest(ARRAY['<col1>','<col2>',...]) AS col;
```
Expect `f` for every locked-down column and `t` for every safe one.
