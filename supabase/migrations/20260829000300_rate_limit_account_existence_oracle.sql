-- ─────────────────────────────────────────────────────────────────────────
-- Audit finding M1: throttle the pre-auth account-existence oracle.
--
-- is_email_admin / is_email_provider / is_email_seeker are anon-callable and
-- invoked BEFORE sign-in (Login, SeekerSignup, ProviderSignup, ForgotPassword)
-- to route the user. Unthrottled, they let anyone enumerate which emails have
-- an account (and its type) by probing addresses.
--
-- This adds a per-IP, per-minute rate limit that FAILS OPEN: if the client IP
-- can't be determined, or anything in the guard errors, the call is ALLOWED.
-- Login/signup must never break because of this guardrail — worst case the
-- limiter is inert, never harmful. A normal sign-in issues 3 probes and a
-- signup 2–3, far below the limit; bulk enumeration (hundreds+/min from one IP)
-- is what gets blocked. A throttled probe simply returns false (Login.tsx
-- already treats that as "unknown" and the user can retry next minute).
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.account_probe_rate (
  ip           text        not null,
  window_start timestamptz not null,
  hits         integer     not null default 0,
  primary key (ip, window_start)
);
-- Internal bookkeeping only — touched solely by the SECURITY DEFINER guard.
revoke all on table public.account_probe_rate from public, anon, authenticated;

create or replace function public._account_probe_allowed()
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
declare
  v_headers json;
  v_ip      text;
  v_window  timestamptz := date_trunc('minute', now());
  v_count   integer;
  -- Probes per IP per minute. A sign-in = 3 probes; kept generous so shared
  -- NATs aren't tripped, while still capping bulk enumeration hard.
  v_limit   constant integer := 60;
begin
  -- PostgREST exposes the request headers as a GUC; absent in non-HTTP
  -- contexts (e.g. internal SQL), which simply falls through to fail-open.
  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    return true;
  end;
  if v_headers is null then
    return true;
  end if;

  v_ip := coalesce(
    split_part(v_headers ->> 'x-forwarded-for', ',', 1),
    v_headers ->> 'cf-connecting-ip',
    v_headers ->> 'x-real-ip'
  );
  v_ip := nullif(btrim(v_ip), '');
  if v_ip is null then
    return true;  -- can't identify the caller → fail open
  end if;

  insert into public.account_probe_rate (ip, window_start, hits)
       values (v_ip, v_window, 1)
  on conflict (ip, window_start)
       do update set hits = public.account_probe_rate.hits + 1
    returning hits into v_count;

  -- Opportunistic GC so the table stays small without a cron.
  if random() < 0.005 then
    delete from public.account_probe_rate where window_start < now() - interval '2 hours';
  end if;

  return v_count <= v_limit;
exception when others then
  -- ANY failure → fail open. Never block a legitimate login.
  return true;
end;
$$;
revoke all on function public._account_probe_allowed() from public, anon, authenticated;

-- Re-define the three oracles to run the guard FIRST (unconditionally, so the
-- no-match probes that enumeration relies on are still counted), then the
-- original existence check verbatim. SECURITY DEFINER + search_path preserved;
-- CREATE OR REPLACE keeps the existing anon EXECUTE grants. LANGUAGE becomes
-- plpgsql/volatile (the guard writes the rate counter).

create or replace function public.is_email_admin(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if not public._account_probe_allowed() then
    return false;
  end if;
  return exists (
    select 1 from public.user_roles ur
    join auth.users u on ur.user_id = u.id
    where lower(u.email) = lower(p_email) and ur.role = 'admin'
  );
end;
$$;

create or replace function public.is_email_provider(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if not public._account_probe_allowed() then
    return false;
  end if;
  return exists (
    select 1 from public.profiles p
    join auth.users u on p.user_id = u.id
    where u.email = p_email
  );
end;
$$;

create or replace function public.is_email_seeker(p_email text)
returns boolean
language plpgsql
volatile
security definer
set search_path to 'public'
as $$
begin
  if not public._account_probe_allowed() then
    return false;
  end if;
  return exists (
    select 1 from public.seeker_profiles sp
    join auth.users u on sp.user_id = u.id
    where u.email = p_email
  );
end;
$$;
