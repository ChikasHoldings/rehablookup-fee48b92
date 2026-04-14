-- Enable realtime for leads table so providers get instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Enable realtime for lead_unlocks so unlock status updates instantly
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_unlocks;