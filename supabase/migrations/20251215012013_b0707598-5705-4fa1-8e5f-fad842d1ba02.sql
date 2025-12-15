-- Create user_sessions table to track active sessions
CREATE TABLE public.user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  session_token text NOT NULL UNIQUE,
  device_name text,
  browser text,
  os text,
  ip_address text,
  location text,
  is_current boolean DEFAULT false,
  last_active_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  revoked_at timestamp with time zone,
  expires_at timestamp with time zone
);

-- Enable RLS
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view their own sessions"
ON public.user_sessions
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own sessions (for revoking)
CREATE POLICY "Users can update their own sessions"
ON public.user_sessions
FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can insert sessions (from edge functions)
CREATE POLICY "Service role can insert sessions"
ON public.user_sessions
FOR INSERT
WITH CHECK (true);

-- Users can delete their own sessions
CREATE POLICY "Users can delete their own sessions"
ON public.user_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX idx_user_sessions_token ON public.user_sessions(session_token);