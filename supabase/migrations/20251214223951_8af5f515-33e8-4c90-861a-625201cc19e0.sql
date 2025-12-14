-- Create notifications table for in-app notifications
CREATE TABLE public.provider_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  facility_id UUID REFERENCES public.facilities(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'lead_received', 'lead_status_changed', 'listing_approved', 'subscription_updated', 'lead_limit_warning', 'system'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.provider_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own notifications"
ON public.provider_notifications
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.provider_notifications
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.provider_notifications
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert notifications"
ON public.provider_notifications
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_provider_notifications_user_id ON public.provider_notifications(user_id);
CREATE INDEX idx_provider_notifications_read ON public.provider_notifications(user_id, read);
CREATE INDEX idx_provider_notifications_created_at ON public.provider_notifications(created_at DESC);