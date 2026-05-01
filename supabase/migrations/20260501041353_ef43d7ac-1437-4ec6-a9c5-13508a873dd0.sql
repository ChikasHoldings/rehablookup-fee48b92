
CREATE TABLE IF NOT EXISTS public.area_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  area_slug TEXT NOT NULL,
  area_label TEXT,
  city TEXT,
  state TEXT,
  treatment_type TEXT,
  source_path TEXT,
  user_agent TEXT,
  ip_hash TEXT,
  is_notified BOOLEAN NOT NULL DEFAULT false,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS area_waitlist_email_area_uniq
  ON public.area_waitlist (lower(email), area_slug);

CREATE INDEX IF NOT EXISTS area_waitlist_area_idx ON public.area_waitlist(area_slug);
CREATE INDEX IF NOT EXISTS area_waitlist_created_idx ON public.area_waitlist(created_at DESC);

ALTER TABLE public.area_waitlist ENABLE ROW LEVEL SECURITY;

-- Public anonymous can insert (lead capture from any page, signed in or not)
CREATE POLICY "Anyone can join area waitlist"
  ON public.area_waitlist
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email IS NOT NULL
    AND char_length(email) BETWEEN 3 AND 320
    AND area_slug IS NOT NULL
    AND char_length(area_slug) BETWEEN 1 AND 200
  );

-- Only admins can read/update/delete
CREATE POLICY "Admins can view area waitlist"
  ON public.area_waitlist
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update area waitlist"
  ON public.area_waitlist
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete area waitlist"
  ON public.area_waitlist
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
