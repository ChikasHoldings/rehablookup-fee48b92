-- EKRA cleanup: unschedule retired legacy-monetization cron jobs.
--   auto_reload_sweep              → credit auto-reload (retired credit model)
--   send_unlock_reminders          → lead-unlock reminders (retired unlock model)
--   send_abandoned_placement_email → legacy paid-placement abandonment
-- All three target edge functions whose source has been removed; the jobs only
-- produced failing invocations and, for auto-reload, a non-EKRA per-credit
-- charge path. EKRA-current jobs (drain-addon-waitlist, send-dunning-emails,
-- retry-failed-payments, subscription alerts, etc.) are intentionally kept.
do $$
declare
  j text;
begin
  foreach j in array array[
    'auto_reload_sweep',
    'send_unlock_reminders',
    'send_abandoned_placement_email'
  ] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end $$;
