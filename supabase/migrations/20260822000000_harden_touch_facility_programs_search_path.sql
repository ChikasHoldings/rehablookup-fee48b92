-- Pin search_path on the updated_at trigger function so it is no longer
-- flagged by the function_search_path_mutable security advisor (the last
-- WARN of its kind). Safe and reversible — the function only sets
-- NEW.updated_at and references nothing schema-ambiguous.
ALTER FUNCTION public.touch_facility_programs_updated_at() SET search_path = 'public';
