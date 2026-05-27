-- Read receipts for the lead message thread. read_at is stamped on the
-- OTHER party's messages when a viewer opens the thread, via the
-- mark_lead_messages_read RPC (clients have no UPDATE policy on the table,
-- so marking-read is funneled through this SECURITY DEFINER function which
-- re-checks the caller is the provider/seeker for that lead).
ALTER TABLE public.lead_messages ADD COLUMN IF NOT EXISTS read_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_lead_messages_read(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_is_provider boolean;
  v_is_seeker boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE l.id = p_lead_id AND f.user_id = auth.uid()
  ) INTO v_is_provider;

  SELECT EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = p_lead_id AND l.email = (auth.jwt() ->> 'email')
  ) INTO v_is_seeker;

  IF v_is_provider THEN
    UPDATE public.lead_messages SET read_at = now()
    WHERE lead_id = p_lead_id AND sender_type = 'seeker' AND read_at IS NULL;
  ELSIF v_is_seeker THEN
    UPDATE public.lead_messages SET read_at = now()
    WHERE lead_id = p_lead_id AND sender_type = 'provider' AND read_at IS NULL;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_lead_messages_read(uuid) TO authenticated;
