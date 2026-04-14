
-- Anti-spam trigger: rate limiting + duplicate content detection for facility reviews
CREATE OR REPLACE FUNCTION public.review_anti_spam_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_recent_count integer;
  v_duplicate_exists boolean;
  v_text_normalized text;
BEGIN
  -- Only check on INSERT (new reviews)
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- 1. RATE LIMITING: Max 3 reviews per user per 24 hours
  SELECT COUNT(*) INTO v_recent_count
  FROM public.facility_reviews
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';

  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: you can submit up to 3 reviews per day. Please try again later.';
  END IF;

  -- 2. DUPLICATE CONTENT DETECTION: Block identical or near-identical review text
  IF NEW.review_text IS NOT NULL AND length(trim(NEW.review_text)) > 0 THEN
    -- Normalize: lowercase, collapse whitespace, strip punctuation
    v_text_normalized := regexp_replace(
      lower(trim(NEW.review_text)),
      '[^a-z0-9 ]', '', 'g'
    );
    v_text_normalized := regexp_replace(v_text_normalized, '\s+', ' ', 'g');

    -- Check if same user submitted very similar text to ANY facility in last 90 days
    SELECT EXISTS (
      SELECT 1 FROM public.facility_reviews
      WHERE user_id = NEW.user_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND review_text IS NOT NULL
        AND created_at > now() - interval '90 days'
        AND similarity(
          regexp_replace(regexp_replace(lower(trim(review_text)), '[^a-z0-9 ]', '', 'g'), '\s+', ' ', 'g'),
          v_text_normalized
        ) > 0.8
    ) INTO v_duplicate_exists;

    IF v_duplicate_exists THEN
      RAISE EXCEPTION 'This review appears very similar to one you have already submitted. Please write a unique review for each facility.';
    END IF;

    -- 3. BASIC SPAM FILTERING: Block very short repeated patterns (e.g. "good good good good")
    -- Check if the review is just the same word repeated
    IF length(v_text_normalized) > 5 AND 
       v_text_normalized ~ '^(\w+)( \1){2,}$' THEN
      RAISE EXCEPTION 'This review appears to be spam. Please write a genuine review about your experience.';
    END IF;

    -- Block reviews that are mostly URLs
    IF (length(NEW.review_text) - length(regexp_replace(NEW.review_text, 'https?://\S+', '', 'gi'))) > length(NEW.review_text) * 0.5 THEN
      RAISE EXCEPTION 'Reviews cannot consist primarily of URLs.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Enable pg_trgm extension for similarity() function
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create the trigger (runs BEFORE insert, after validate_review_data)
CREATE TRIGGER review_anti_spam_trigger
  BEFORE INSERT ON public.facility_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.review_anti_spam_check();
