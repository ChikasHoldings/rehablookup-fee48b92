-- Defense-in-depth: enforce text-field length caps at the database
-- level so direct API calls / RLS-bypass attempts can't bloat the
-- profile tables with multi-MB strings. The frontend already enforces
-- these caps via maxLength + slice; this migration makes the cap
-- authoritative.
--
-- Caps mirror the maxLength values the panel UI uses:
--   facilities.description     2000  (ListingEditor + AddLocation wizard)
--   facilities.dba_name         120  (AddLocation wizard)
--   facilities.hours_of_operation 500  (AddLocation wizard)
--   facilities.video_url         500  (MediaUrlsSection)
--   facilities.virtual_tour_url  500  (MediaUrlsSection)
--   facilities.email             254  (RFC 5321 max)
--   facilities.website           500  (sanitizeWebsite)
--   facility_staff.name          120  (wizard) — modal caps at 100 but
--                                      keep 120 here to absorb both
--   facility_staff.bio           500  (StaffFormModal BIO_MAX_LENGTH)
--   facility_programs.name        80  (ProgramsManagementSection NAME_MAX)
--   facility_programs.description 1000 (ProgramsManagementSection DESC_MAX)
--   facility_amenities.amenity_name 80
--
-- Verified before applying: every existing row fits well under these caps
-- (live max for facilities.description was 1843; everything else
-- was either NULL or far smaller).
--
-- IF NOT EXISTS guard isn't supported on ADD CONSTRAINT, so we use a
-- DO block to make the migration idempotent.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_description_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_description_length_chk
      CHECK (description IS NULL OR LENGTH(description) <= 2000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_dba_name_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_dba_name_length_chk
      CHECK (dba_name IS NULL OR LENGTH(dba_name) <= 120);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_hours_of_operation_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_hours_of_operation_length_chk
      CHECK (hours_of_operation IS NULL OR LENGTH(hours_of_operation) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_video_url_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_video_url_length_chk
      CHECK (video_url IS NULL OR LENGTH(video_url) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_virtual_tour_url_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_virtual_tour_url_length_chk
      CHECK (virtual_tour_url IS NULL OR LENGTH(virtual_tour_url) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_email_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_email_length_chk
      CHECK (email IS NULL OR LENGTH(email) <= 254);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facilities_website_length_chk') THEN
    ALTER TABLE public.facilities
      ADD CONSTRAINT facilities_website_length_chk
      CHECK (website IS NULL OR LENGTH(website) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_staff_name_length_chk') THEN
    ALTER TABLE public.facility_staff
      ADD CONSTRAINT facility_staff_name_length_chk
      CHECK (LENGTH(name) <= 120);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_staff_bio_length_chk') THEN
    ALTER TABLE public.facility_staff
      ADD CONSTRAINT facility_staff_bio_length_chk
      CHECK (bio IS NULL OR LENGTH(bio) <= 500);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_programs_name_length_chk') THEN
    ALTER TABLE public.facility_programs
      ADD CONSTRAINT facility_programs_name_length_chk
      CHECK (LENGTH(name) <= 80);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_programs_description_length_chk') THEN
    ALTER TABLE public.facility_programs
      ADD CONSTRAINT facility_programs_description_length_chk
      CHECK (LENGTH(description) <= 1000);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'facility_amenities_name_length_chk') THEN
    ALTER TABLE public.facility_amenities
      ADD CONSTRAINT facility_amenities_name_length_chk
      CHECK (LENGTH(amenity_name) <= 80);
  END IF;
END$$;
