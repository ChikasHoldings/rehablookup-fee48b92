-- Create account activity log table
CREATE TABLE public.account_activity_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  event_description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.account_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own activity
CREATE POLICY "Users can view their own activity"
ON public.account_activity_log
FOR SELECT
USING (auth.uid() = user_id);

-- Service role can insert activity logs
CREATE POLICY "Service role can insert activity"
ON public.account_activity_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_activity_log_user_id ON public.account_activity_log(user_id);
CREATE INDEX idx_activity_log_created_at ON public.account_activity_log(created_at DESC);