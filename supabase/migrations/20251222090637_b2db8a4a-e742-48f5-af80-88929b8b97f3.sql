-- Create seeker notifications table
CREATE TABLE public.seeker_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_seeker_notifications_user_id ON public.seeker_notifications(user_id);
CREATE INDEX idx_seeker_notifications_created_at ON public.seeker_notifications(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.seeker_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" 
ON public.seeker_notifications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.seeker_notifications 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
ON public.seeker_notifications 
FOR DELETE 
USING (auth.uid() = user_id);

-- Service role can insert notifications (for system-generated notifications)
CREATE POLICY "Service role can insert notifications"
ON public.seeker_notifications
FOR INSERT
WITH CHECK (true);

-- Create storage bucket for seeker avatars if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('seeker-avatars', 'seeker-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for seeker avatars
CREATE POLICY "Seeker avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'seeker-avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'seeker-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (bucket_id = 'seeker-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (bucket_id = 'seeker-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);