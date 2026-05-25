-- Observability: super-admin-only view of scheduled-job (cron → edge function)
-- health, so admins can see edge-function/cron failures and last-run status.
-- Reads pg_cron's job + run-history tables (owned by postgres; SECURITY DEFINER
-- lets the gated caller read them).
create or replace function public.get_scheduled_job_health()
returns table (
  jobname text,
  schedule text,
  active boolean,
  last_run timestamptz,
  last_status text,
  last_message text,
  runs_24h bigint,
  failures_24h bigint
)
language plpgsql
security definer
set search_path = public, cron
as $$
begin
  if not public.is_super_admin(auth.uid()) then
    raise exception 'Not authorized: super admin only';
  end if;

  return query
  with latest as (
    select distinct on (jrd.jobid)
      jrd.jobid, jrd.start_time, jrd.status, jrd.return_message
    from cron.job_run_details jrd
    order by jrd.jobid, jrd.start_time desc
  ),
  agg as (
    select
      jobid,
      count(*) filter (where start_time > now() - interval '24 hours') as runs_24h,
      count(*) filter (where start_time > now() - interval '24 hours' and status = 'failed') as failures_24h
    from cron.job_run_details
    group by jobid
  )
  select
    j.jobname::text,
    j.schedule::text,
    j.active,
    l.start_time as last_run,
    l.status::text as last_status,
    left(coalesce(l.return_message, ''), 200) as last_message,
    coalesce(a.runs_24h, 0) as runs_24h,
    coalesce(a.failures_24h, 0) as failures_24h
  from cron.job j
  left join latest l on l.jobid = j.jobid
  left join agg a on a.jobid = j.jobid
  order by coalesce(a.failures_24h, 0) desc, j.jobname;
end;
$$;

revoke all on function public.get_scheduled_job_health() from public, anon;
grant execute on function public.get_scheduled_job_health() to authenticated;

comment on function public.get_scheduled_job_health() is
  'Super-admin only. Returns per cron job: schedule, active flag, last run time/status/message, and 24h run/failure counts. Powers the admin Scheduled Jobs health surface.';
