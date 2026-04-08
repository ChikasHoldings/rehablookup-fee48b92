
CREATE INDEX IF NOT EXISTS idx_facility_views_facility_date ON public.facility_views(facility_id, view_date DESC);
