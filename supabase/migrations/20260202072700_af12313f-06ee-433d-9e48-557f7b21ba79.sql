-- Create table to track facility invitations and responses for international cases
CREATE TABLE public.international_case_facility_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES public.international_placement_cases(id) ON DELETE CASCADE,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'accepted', 'declined')),
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  provider_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(case_id, facility_id)
);

-- Enable RLS
ALTER TABLE public.international_case_facility_matches ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage all matches"
ON public.international_case_facility_matches
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Providers can view their own facility matches
CREATE POLICY "Providers can view their matches"
ON public.international_case_facility_matches
FOR SELECT
TO authenticated
USING (provider_id = auth.uid());

-- Providers can update their own matches (respond)
CREATE POLICY "Providers can respond to matches"
ON public.international_case_facility_matches
FOR UPDATE
TO authenticated
USING (provider_id = auth.uid())
WITH CHECK (provider_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_international_case_facility_matches_updated_at
BEFORE UPDATE ON public.international_case_facility_matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_intl_matches_case ON public.international_case_facility_matches(case_id);
CREATE INDEX idx_intl_matches_facility ON public.international_case_facility_matches(facility_id);
CREATE INDEX idx_intl_matches_provider ON public.international_case_facility_matches(provider_id);
CREATE INDEX idx_intl_matches_status ON public.international_case_facility_matches(status);