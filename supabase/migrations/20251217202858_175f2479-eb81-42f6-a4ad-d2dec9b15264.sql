-- Add RLS policy to allow users to insert their own sessions
CREATE POLICY "Users can insert their own sessions" 
ON public.user_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Also enable RLS if not already enabled (safe to run)
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;