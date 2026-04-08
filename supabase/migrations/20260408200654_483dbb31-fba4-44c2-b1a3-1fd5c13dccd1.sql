
-- Employment type enum
CREATE TYPE public.employment_type AS ENUM ('employee', 'contractor', 'va');

-- Escalation enums
CREATE TYPE public.escalation_priority AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.escalation_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- Earning status enum
CREATE TYPE public.earning_status AS ENUM ('pending', 'approved', 'paid');

-- Add columns to admin_user_profiles
ALTER TABLE public.admin_user_profiles
  ADD COLUMN IF NOT EXISTS employment_type public.employment_type,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS hire_date date,
  ADD COLUMN IF NOT EXISTS commission_rate integer;

-- ============ admin_escalations ============
CREATE TABLE public.admin_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  assigned_to uuid,
  subject text NOT NULL,
  description text NOT NULL,
  priority public.escalation_priority NOT NULL DEFAULT 'medium',
  status public.escalation_status NOT NULL DEFAULT 'open',
  related_type text,
  related_id uuid,
  resolution_notes text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_escalations ENABLE ROW LEVEL SECURITY;

-- Any admin can read all escalations
CREATE POLICY "Admins can view all escalations"
  ON public.admin_escalations FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Any admin can create escalations
CREATE POLICY "Admins can create escalations"
  ON public.admin_escalations FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND created_by = auth.uid());

-- Creator or assigned admin can update
CREATE POLICY "Admins can update own or assigned escalations"
  ON public.admin_escalations FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    AND (created_by = auth.uid() OR assigned_to = auth.uid() OR public.is_super_admin(auth.uid()))
  );

CREATE TRIGGER update_escalations_updated_at
  BEFORE UPDATE ON public.admin_escalations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ admin_impersonation_log ============
CREATE TABLE public.admin_impersonation_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  target_user_id uuid NOT NULL,
  target_role text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);

ALTER TABLE public.admin_impersonation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view impersonation log"
  ON public.admin_impersonation_log FOR SELECT
  TO authenticated
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Super admins can create impersonation log"
  ON public.admin_impersonation_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_super_admin(auth.uid()) AND admin_user_id = auth.uid());

CREATE POLICY "Super admins can update impersonation log"
  ON public.admin_impersonation_log FOR UPDATE
  TO authenticated
  USING (public.is_super_admin(auth.uid()) AND admin_user_id = auth.uid());

-- ============ advisor_earnings ============
CREATE TABLE public.advisor_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL,
  inquiry_id uuid REFERENCES public.concierge_inquiries(id) ON DELETE SET NULL,
  placement_fee_cents integer NOT NULL DEFAULT 0,
  commission_rate integer NOT NULL DEFAULT 0,
  commission_cents integer NOT NULL DEFAULT 0,
  status public.earning_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.advisor_earnings ENABLE ROW LEVEL SECURITY;

-- Advisors can read their own earnings
CREATE POLICY "Advisors can view own earnings"
  ON public.advisor_earnings FOR SELECT
  TO authenticated
  USING (
    advisor_id = auth.uid()
    OR public.is_super_admin(auth.uid())
    OR public.has_admin_role(auth.uid(), 'manager')
  );

-- Only super admins/managers can insert/update earnings
CREATE POLICY "Admins can manage earnings"
  ON public.advisor_earnings FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR public.has_admin_role(auth.uid(), 'manager')
  );

CREATE POLICY "Admins can update earnings"
  ON public.advisor_earnings FOR UPDATE
  TO authenticated
  USING (
    public.is_super_admin(auth.uid())
    OR public.has_admin_role(auth.uid(), 'manager')
  );
