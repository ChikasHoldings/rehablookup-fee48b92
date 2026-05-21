-- Facility profile content expansion — new columns for hours,
-- languages, accessibility, admissions status. Used by both
-- /center/[slug] (public) and /account/facility/[id] (seeker)
-- profile pages, and editable from /provider/listing-editor.
--
-- All four columns nullable + default-null so existing rows stay
-- unaffected. Display logic on both profile pages renders each
-- section ONLY when its column is populated — empty states are
-- silent (don't surface "no hours listed" placeholders that erode
-- trust).
--
-- Types:
--   hours_of_operation       text       Free-form, e.g.
--                                       "Mon-Fri 9am-5pm, Sat 10am-2pm,
--                                        Sun closed". Providers can write
--                                        whatever fits their facility;
--                                        we don't impose a schema that
--                                        forces them into a Mon-Sun grid
--                                        if they have variable hours.
--   languages_spoken         text[]     Array of language names,
--                                       e.g. ['English','Spanish','ASL'].
--   accessibility_features   text[]     Array of free-form features,
--                                       e.g. ['Wheelchair accessible',
--                                       'ASL interpreters available',
--                                       'Hearing loops'].
--   accepting_admissions     boolean    Three-valued:
--                                       true  = "Currently accepting"
--                                       false = "Not accepting / waitlist"
--                                       null  = "Unknown / unspecified"
--                                       (NULL is the default so we don't
--                                       wrongly claim every existing
--                                       SAMHSA-imported listing is open
--                                       for admissions).
--
-- Idempotent: ADD COLUMN IF NOT EXISTS so re-apply is a no-op.
ALTER TABLE public.facilities
  ADD COLUMN IF NOT EXISTS hours_of_operation     text,
  ADD COLUMN IF NOT EXISTS languages_spoken       text[],
  ADD COLUMN IF NOT EXISTS accessibility_features text[],
  ADD COLUMN IF NOT EXISTS accepting_admissions   boolean;
