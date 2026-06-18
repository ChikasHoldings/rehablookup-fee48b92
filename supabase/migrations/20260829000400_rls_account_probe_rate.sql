-- Defense-in-depth for the M1 rate-limit bookkeeping table. Grants are already
-- revoked from anon/authenticated, so it isn't API-exposed; enabling RLS with
-- no policies makes "only the SECURITY DEFINER guard touches this" explicit and
-- survives any future accidental GRANT. The table and the guard function are
-- both owned by postgres, which bypasses RLS, so the guard's writes are
-- unaffected (RLS is enabled, not forced).
alter table public.account_probe_rate enable row level security;
