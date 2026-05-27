-- Unschedule two cron jobs that invoke retired pay-per-placement functionality
-- and have no useful effect (and one errors every run):
--
--   * send_payment_reminder → the send-payment-reminder edge function queries
--     the dropped placement_invoices / placement_cases tables and throws on
--     every daily run ("Unknown error occurred"). Current subscription billing
--     reminders are handled by send-renewal-reminder /
--     send_subscription_renewal_reminders, and dunning by send-dunning-emails.
--
--   * retry_failed_payments → the retry-failed-payments edge function was
--     already tombstoned to HTTP 410 ("retired with the monetization rebuild").
--     The cron just pings that tombstone every 6 hours.
--
-- Both are leftovers from the retired per-admission/placement-invoice model
-- (cf. concierge_engagements removal, lead_unlocks/provider_credits retirement).
-- Reversible: re-add with cron.schedule(...) if the model ever returns.
DO $$
BEGIN
  BEGIN PERFORM cron.unschedule('send_payment_reminder'); EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('retry_failed_payments'); EXCEPTION WHEN OTHERS THEN NULL; END;
END $$;
