-- Recompile review_anti_spam_check now that pg_trgm is installed.
--
-- The function was first defined before pg_trgm was loaded into the
-- public schema, so Postgres cached a parse-tree that said
-- public.similarity(text, text) did not exist. The cache survived the
-- CREATE EXTENSION call, leaving every facility_reviews INSERT to
-- fail at runtime even though the function existed.
--
-- Recreating the function (same body, with one additional guard) is
-- the canonical fix: CREATE OR REPLACE invalidates the cached parse.
--
-- The one body change is to SKIP the user-keyed duplicate-detection
-- block when NEW.user_id IS NULL. Token-submitted reviews coming from
-- submit_review_via_token() have no user_id (the submitter doesn't
-- have a seeker account), so the per-user fuzzy-match query would
-- silently match nothing — but the function still gets called once.
-- Skipping the block also leaves room for legitimate identical text
-- coming from different customers responding to a copy-pasted email.

CREATE OR REPLACE FUNCTION public.review_anti_spam_check()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_recent_count integer;
  v_duplicate_exists boolean;
  v_text_normalized text;
BEGIN
  IF TG_OP != 'INSERT' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_recent_count
  FROM public.facility_reviews
  WHERE user_id = NEW.user_id
    AND created_at > now() - interval '24 hours';
  IF v_recent_count >= 3 THEN
    RAISE EXCEPTION 'Rate limit exceeded: you can submit up to 3 reviews per day. Please try again later.';
  END IF;

  IF NEW.review_text IS NOT NULL AND length(trim(NEW.review_text)) > 0 THEN
    v_text_normalized := regexp_replace(lower(trim(NEW.review_text)), '[^a-z0-9 ]', '', 'g');
    v_text_normalized := regexp_replace(v_text_normalized, '\s+', ' ', 'g');

    IF NEW.user_id IS NOT NULL THEN
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
    END IF;

    IF length(v_text_normalized) > 5 AND v_text_normalized ~ '^(\w+)( \1){2,}$' THEN
      RAISE EXCEPTION 'This review appears to be spam. Please write a genuine review about your experience.';
    END IF;

    IF (length(NEW.review_text) - length(regexp_replace(NEW.review_text, 'https?://\S+', '', 'gi'))) > length(NEW.review_text) * 0.5 THEN
      RAISE EXCEPTION 'Reviews cannot consist primarily of URLs.';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
