-- Two-way messaging thread per direct lead (Pro provider ↔ the seeker who
-- submitted the inquiry). Sends are routed exclusively through the
-- send-lead-message edge function (service role), which enforces the
-- Pro gate (provider) / email-ownership (seeker) and fans out nudges —
-- so there are intentionally NO client INSERT/UPDATE/DELETE policies.
CREATE TABLE IF NOT EXISTS public.lead_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('provider', 'seeker')),
  sender_id uuid,
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_messages_lead_created
  ON public.lead_messages (lead_id, created_at);

ALTER TABLE public.lead_messages ENABLE ROW LEVEL SECURITY;

-- Provider: owner of the lead's facility can read the thread.
DROP POLICY IF EXISTS "lead_messages_provider_select" ON public.lead_messages;
CREATE POLICY "lead_messages_provider_select" ON public.lead_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    JOIN public.facilities f ON f.id = l.facility_id
    WHERE l.id = lead_messages.lead_id AND f.user_id = (SELECT auth.uid())
  ));

-- Seeker: the lead's email matches the caller's auth email (mirrors the
-- leads SELECT policy's seeker clause).
DROP POLICY IF EXISTS "lead_messages_seeker_select" ON public.lead_messages;
CREATE POLICY "lead_messages_seeker_select" ON public.lead_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.leads l
    WHERE l.id = lead_messages.lead_id
      AND l.email = ((SELECT auth.jwt()) ->> 'email')
  ));

-- Realtime: both parties subscribe to postgres_changes; RLS above scopes
-- delivery so each side only receives messages for threads they can read.
ALTER TABLE public.lead_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_messages;
