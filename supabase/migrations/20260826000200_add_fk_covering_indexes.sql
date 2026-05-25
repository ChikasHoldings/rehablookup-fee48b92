-- Performance: add covering indexes for foreign keys flagged by the Supabase
-- performance advisor (unindexed_foreign_keys). Without these, FK joins,
-- cascades, and lookups (e.g. the admin re-verification queue joining events to
-- attempts, team-member invited-by lookups, facility-alias moderation) do
-- sequential scans.
create index if not exists idx_facility_name_aliases_confirmed_by
  on public.facility_name_aliases (confirmed_by);

create index if not exists idx_facility_team_members_invited_by
  on public.facility_team_members (invited_by);

create index if not exists idx_re_verification_events_attempt_id
  on public.re_verification_events (attempt_id);
