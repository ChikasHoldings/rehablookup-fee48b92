-- Create table for storing credential document references
CREATE TABLE public.facility_credential_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  document_name TEXT NOT NULL,
  document_url TEXT NOT NULL,
  document_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  verified_at TIMESTAMP WITH TIME ZONE,
  verified_by UUID
);

-- Enable RLS
ALTER TABLE public.facility_credential_documents ENABLE ROW LEVEL SECURITY;

-- Providers can view their own credential documents
CREATE POLICY "Users can view credential documents of their facilities"
ON public.facility_credential_documents
FOR SELECT
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can insert credential documents for their facilities
CREATE POLICY "Users can insert credential documents for their facilities"
ON public.facility_credential_documents
FOR INSERT
WITH CHECK (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Providers can delete their own credential documents
CREATE POLICY "Users can delete credential documents from their facilities"
ON public.facility_credential_documents
FOR DELETE
USING (
  facility_id IN (
    SELECT id FROM public.facilities WHERE user_id = auth.uid()
  )
);

-- Admins can view all credential documents
CREATE POLICY "Admins can view all credential documents"
ON public.facility_credential_documents
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update credential documents (for verification)
CREATE POLICY "Admins can update credential documents"
ON public.facility_credential_documents
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete credential documents
CREATE POLICY "Admins can delete credential documents"
ON public.facility_credential_documents
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create index for faster queries
CREATE INDEX idx_facility_credential_documents_facility_id ON public.facility_credential_documents(facility_id);
CREATE INDEX idx_facility_credential_documents_status ON public.facility_credential_documents(status);