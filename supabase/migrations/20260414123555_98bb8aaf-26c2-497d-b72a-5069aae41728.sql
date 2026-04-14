-- Enable realtime for concierge_introductions so providers get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_introductions;