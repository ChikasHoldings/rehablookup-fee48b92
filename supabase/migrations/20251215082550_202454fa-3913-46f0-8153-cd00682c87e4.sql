-- Fix critical security issue: Remove public access to email_verification_codes
-- This table should ONLY be accessible by service role (for edge functions)

-- First drop the existing overly-permissive policy
DROP POLICY IF EXISTS "Service role can manage verification codes" ON public.email_verification_codes;

-- Create proper restrictive policies - only service role can access
-- RLS is enabled but with no user-facing policies means only service role can access
CREATE POLICY "Only service role can insert verification codes" 
ON public.email_verification_codes 
FOR INSERT 
TO service_role
WITH CHECK (true);

CREATE POLICY "Only service role can select verification codes" 
ON public.email_verification_codes 
FOR SELECT 
TO service_role
USING (true);

CREATE POLICY "Only service role can update verification codes" 
ON public.email_verification_codes 
FOR UPDATE 
TO service_role
USING (true);

CREATE POLICY "Only service role can delete verification codes" 
ON public.email_verification_codes 
FOR DELETE 
TO service_role
USING (true);