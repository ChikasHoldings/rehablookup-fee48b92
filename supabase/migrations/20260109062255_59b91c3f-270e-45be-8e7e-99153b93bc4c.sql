-- Phase U3 & U4: Create tour requests and messaging tables

-- Tour Requests Table
CREATE TABLE IF NOT EXISTS public.concierge_tour_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  
  -- Tour details
  tour_type text NOT NULL DEFAULT 'in_person',
  preferred_dates jsonb DEFAULT '[]',
  notes text,
  contact_preference text,
  
  -- Status tracking
  status text NOT NULL DEFAULT 'requested',
  proposed_datetime timestamp with time zone,
  confirmed_datetime timestamp with time zone,
  
  -- Provider response
  facility_response_notes text,
  facility_responded_at timestamp with time zone,
  
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concierge_tour_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tour requests
CREATE POLICY "Users can view own tour requests"
  ON public.concierge_tour_requests FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create tour requests"
  ON public.concierge_tour_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own tour requests"
  ON public.concierge_tour_requests FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Providers can view tours for their facilities"
  ON public.concierge_tour_requests FOR SELECT
  USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update tours for their facilities"
  ON public.concierge_tour_requests FOR UPDATE
  USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all tour requests"
  ON public.concierge_tour_requests FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Messaging Threads Table
CREATE TABLE IF NOT EXISTS public.concierge_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id uuid REFERENCES public.concierge_inquiries(id) ON DELETE CASCADE NOT NULL,
  thread_type text NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  last_message_at timestamp with time zone,
  user_last_read_at timestamp with time zone,
  facility_last_read_at timestamp with time zone,
  admin_last_read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(inquiry_id, thread_type, facility_id)
);

-- Enable RLS
ALTER TABLE public.concierge_threads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for threads
CREATE POLICY "Users can view own threads"
  ON public.concierge_threads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create threads"
  ON public.concierge_threads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own threads"
  ON public.concierge_threads FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Providers can view facility threads"
  ON public.concierge_threads FOR SELECT
  USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Providers can update facility threads"
  ON public.concierge_threads FOR UPDATE
  USING (facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all threads"
  ON public.concierge_threads FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Messages Table
CREATE TABLE IF NOT EXISTS public.concierge_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid REFERENCES public.concierge_threads(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid NOT NULL,
  sender_type text NOT NULL,
  content text NOT NULL,
  attachment_url text,
  attachment_name text,
  read_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.concierge_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for messages
CREATE POLICY "Users can view messages in own threads"
  ON public.concierge_messages FOR SELECT
  USING (thread_id IN (SELECT id FROM public.concierge_threads WHERE user_id = auth.uid()));

CREATE POLICY "Users can create messages in own threads"
  ON public.concierge_messages FOR INSERT
  WITH CHECK (thread_id IN (SELECT id FROM public.concierge_threads WHERE user_id = auth.uid()) AND sender_id = auth.uid());

CREATE POLICY "Providers can view messages in facility threads"
  ON public.concierge_messages FOR SELECT
  USING (thread_id IN (SELECT id FROM public.concierge_threads WHERE facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())));

CREATE POLICY "Providers can create messages in facility threads"
  ON public.concierge_messages FOR INSERT
  WITH CHECK (thread_id IN (SELECT id FROM public.concierge_threads WHERE facility_id IN (SELECT id FROM public.facilities WHERE user_id = auth.uid())) AND sender_id = auth.uid());

CREATE POLICY "Admins can manage all messages"
  ON public.concierge_messages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Enable realtime for messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.concierge_messages;

-- Update timestamp triggers
CREATE TRIGGER update_concierge_tour_requests_updated_at
  BEFORE UPDATE ON public.concierge_tour_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();