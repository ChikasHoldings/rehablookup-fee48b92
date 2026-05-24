-- The review_anti_spam_check() trigger calls similarity() from pg_trgm
-- to block near-duplicate reviews from the same user. The extension
-- was never installed, so every facility_reviews INSERT (seeker- or
-- token-submitted) would have hit "function similarity(text, text)
-- does not exist". Install it now — safe to add idempotently.
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
