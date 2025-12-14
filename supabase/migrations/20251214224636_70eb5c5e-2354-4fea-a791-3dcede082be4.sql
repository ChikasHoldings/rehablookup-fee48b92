-- Enable realtime for provider_notifications table
ALTER TABLE public.provider_notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.provider_notifications;