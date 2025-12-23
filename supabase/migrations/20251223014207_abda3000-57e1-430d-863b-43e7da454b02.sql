-- Drop the broken policy that accesses auth.users directly
DROP POLICY IF EXISTS "Seekers can view their own submitted leads" ON public.leads;

-- Recreate with proper JWT-based email access
CREATE POLICY "Seekers can view their own submitted leads" 
ON public.leads 
FOR SELECT 
USING (email = (auth.jwt() ->> 'email'));