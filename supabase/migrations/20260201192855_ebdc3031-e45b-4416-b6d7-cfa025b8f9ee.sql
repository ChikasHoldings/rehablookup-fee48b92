-- Create support_tickets table for Admin Support Inbox
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source tracking
  source text NOT NULL CHECK (source IN ('public_contact', 'provider_support', 'seeker_support')),
  
  -- Sender info
  sender_name text NOT NULL,
  sender_email text NOT NULL,
  sender_user_id uuid,
  
  -- Content
  category text NOT NULL,
  subject text,
  message text NOT NULL,
  
  -- Assignment & Status
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'open', 'in_progress', 'resolved', 'closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  assigned_to uuid,
  assigned_at timestamptz,
  assigned_by uuid,
  
  -- Resolution
  resolved_at timestamptz,
  resolved_by uuid,
  resolution_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create support_ticket_notes table for internal comments
CREATE TABLE public.support_ticket_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes for common queries
CREATE INDEX idx_support_tickets_status ON support_tickets(status);
CREATE INDEX idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX idx_support_tickets_created_at ON support_tickets(created_at DESC);
CREATE INDEX idx_support_tickets_source ON support_tickets(source);
CREATE INDEX idx_support_ticket_notes_ticket_id ON support_ticket_notes(ticket_id);

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_notes ENABLE ROW LEVEL SECURITY;

-- Admin-only access policies
CREATE POLICY "Admins can manage support tickets"
  ON support_tickets FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

CREATE POLICY "Admins can manage ticket notes"
  ON support_ticket_notes FOR ALL
  TO authenticated
  USING (public.user_is_admin(auth.uid()));

-- Add trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();