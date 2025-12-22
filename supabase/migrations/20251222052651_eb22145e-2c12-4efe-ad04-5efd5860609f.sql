-- Create facility_reviews table
CREATE TABLE public.facility_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  facility_id uuid REFERENCES public.facilities(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  status text NOT NULL DEFAULT 'pending',
  helpful_count integer NOT NULL DEFAULT 0,
  admin_notes text,
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, facility_id)
);

-- Enable RLS
ALTER TABLE public.facility_reviews ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facility_reviews
CREATE POLICY "Users can view approved reviews"
ON public.facility_reviews FOR SELECT
USING (status = 'approved');

CREATE POLICY "Users can view their own reviews"
ON public.facility_reviews FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert reviews"
ON public.facility_reviews FOR INSERT
WITH CHECK (
  auth.uid() = user_id 
  AND facility_id IN (SELECT id FROM public.facilities WHERE status = 'approved')
);

CREATE POLICY "Users can update their own pending reviews"
ON public.facility_reviews FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Users can delete their own reviews"
ON public.facility_reviews FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all reviews"
ON public.facility_reviews FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all reviews"
ON public.facility_reviews FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete reviews"
ON public.facility_reviews FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create review_helpful_votes table to track who found reviews helpful
CREATE TABLE public.review_helpful_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES public.facility_reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(review_id, user_id)
);

-- Enable RLS on helpful votes
ALTER TABLE public.review_helpful_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view helpful votes"
ON public.review_helpful_votes FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can vote"
ON public.review_helpful_votes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their vote"
ON public.review_helpful_votes FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_facility_reviews_updated_at
BEFORE UPDATE ON public.facility_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update helpful_count when votes change
CREATE OR REPLACE FUNCTION public.update_review_helpful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.facility_reviews 
    SET helpful_count = helpful_count + 1 
    WHERE id = NEW.review_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.facility_reviews 
    SET helpful_count = helpful_count - 1 
    WHERE id = OLD.review_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_helpful_vote_change
AFTER INSERT OR DELETE ON public.review_helpful_votes
FOR EACH ROW
EXECUTE FUNCTION public.update_review_helpful_count();