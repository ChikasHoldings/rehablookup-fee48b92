-- Seed the three canonical blog_authors rows.
-- Migration 20260719000000 tried to UPDATE these by slug but they never
-- existed, so every UPDATE silently matched 0 rows. This migration
-- INSERTs them with ON CONFLICT DO NOTHING (safe to re-run), then the
-- 20260719000000 UPDATE logic is replicated here to set bios, specialties,
-- and article assignments in a single atomic block.

BEGIN;

-- Insert the three author team rows
INSERT INTO public.blog_authors (id, slug, name, role, display_order, active, specialties)
VALUES
  (gen_random_uuid(), 'rehablookup-editorial',    'RehabLookup Editorial Team',       'editor',           1, true, ARRAY['Treatment directory editing','Insurance verification guides','Same-day admission','Payment options','Location guides','Editorial fact-checking']),
  (gen_random_uuid(), 'medical-review-team',      'RehabLookup Medical Review Team',  'medical_reviewer', 2, true, ARRAY['Addiction medicine','MAT (buprenorphine, methadone, naltrexone)','Detox & withdrawal management','Dual diagnosis','Harm reduction','Pregnancy-safe treatment']),
  (gen_random_uuid(), 'recovery-contributor-team','Recovery Contributors',             'contributor',      3, true, ARRAY['Lived experience','Family support & boundaries','Relapse prevention','Peer recovery','12-step + alternatives','Long-term recovery'])
ON CONFLICT (slug) DO NOTHING;

-- Apply full bios and credentials (mirrors 20260719000000, safe to re-run)
UPDATE public.blog_authors
SET
  title       = 'Editorial Team',
  credentials = 'Editorial standards · Fact-checked content',
  display_order = 1,
  specialties = ARRAY[
    'Treatment directory editing',
    'Insurance verification guides',
    'Same-day admission',
    'Payment options',
    'Location guides',
    'Editorial fact-checking'
  ],
  bio = E'The RehabLookup Editorial Team writes and maintains the directory''s evergreen guides on finding treatment, comparing programs, navigating insurance, and understanding what to expect at each stage of recovery. Our editors are not clinicians — for medical content (detox protocols, medication-assisted treatment, withdrawal management, dual-diagnosis care) we hand off to the Medical Review Team, who clinical-reviews before publication.\n\nOur editorial process: every article is researched against primary sources (SAMHSA, NIDA, HHS, state behavioral-health authorities, federal statutes including FMLA and 42 CFR Part 2), drafted with reference links, edited for plain English, and checked for accuracy. We update articles as laws and clinical standards change.\n\nWe do not take placement fees from treatment centers, do not run pay-to-rank schemes, and disclose how the platform makes money in detail on the How RehabLookup Makes Money page. When a recommendation is provider-funded (e.g., a Featured Placement promotion), it is visibly marked as Featured in the directory chrome — never blended into the editorial signal.\n\nThe Editorial Team owns: directory navigation, getting-started guides, location and state pages, insurance verification walkthroughs, payment-without-insurance resources, and platform-wide editorial policy.'
WHERE slug = 'rehablookup-editorial';

UPDATE public.blog_authors
SET
  title       = 'Clinical Review Team',
  credentials = 'Licensed clinicians · ASAM-aligned standards',
  display_order = 2,
  specialties = ARRAY[
    'Addiction medicine',
    'MAT (buprenorphine, methadone, naltrexone)',
    'Detox & withdrawal management',
    'Dual diagnosis',
    'Harm reduction',
    'Pregnancy-safe treatment'
  ],
  bio = E'The RehabLookup Medical Review Team is composed of licensed clinicians who review the platform''s medical content before publication — including detox protocols, medication-assisted treatment (MAT) guides, withdrawal-management explainers, dual-diagnosis care, and any article that makes clinical claims. Reviewers verify that information aligns with current ASAM (American Society of Addiction Medicine), SAMHSA, and ACOG guidelines, and that clinical thresholds (e.g., when an alcohol detox requires medical supervision, when a buprenorphine induction requires precipitated-withdrawal awareness) are not understated.\n\nOur reviewers include addiction-medicine physicians, board-certified psychiatrists with substance-use specialization, and licensed clinical social workers (LCSW) with primary practice in opioid and alcohol use disorder. They review for: clinical accuracy, scope (no advice that would only be safe under a physician''s care presented as DIY guidance), medication safety (drug interactions, contraindications, MAT induction protocols), and harm-reduction grounding (naloxone, fentanyl test strips, syringe service programs).\n\nMedically-reviewed articles on RehabLookup are educational. They are not personal medical advice, do not establish a clinician-patient relationship, and should not replace consultation with a licensed treatment provider. If you or someone you love is in a medical crisis, call 911. For crisis support, call or text 988 (Suicide & Crisis Lifeline) or call the SAMHSA helpline at 1-800-662-4357.'
WHERE slug = 'medical-review-team';

UPDATE public.blog_authors
SET
  title       = 'Lived-Experience Contributors',
  credentials = 'Lived experience · Peer support · Family',
  display_order = 3,
  specialties = ARRAY[
    'Lived experience',
    'Family support & boundaries',
    'Relapse prevention',
    'Peer recovery',
    '12-step + alternatives',
    'Long-term recovery'
  ],
  bio = E'The Recovery Contributors are people in long-term recovery, family members of people who have been through treatment, and peer-support specialists who lend lived-experience perspective to RehabLookup''s recovery, family-support, prevention, and education content. Their voice complements the directory''s clinical and editorial work — they write about what the inside of a 30-day stay feels like in week three, what families actually need to hear when a loved one is in crisis, what relapse looks like before it happens, and what carries someone from year one to year five of recovery.\n\nAll contributor pieces go through standard editorial review for accuracy, scope, and harm-reduction grounding before publication. Clinical claims are routed to the Medical Review Team for sign-off. Contributors disclose their connection to the topic — in recovery for X years, parent of someone in recovery, peer recovery specialist, etc. — so readers can weigh the perspective appropriately.\n\nThe Recovery Contributors team owns: relapse-prevention and recovery-process articles, family-support guides, prevention and harm-reduction education, and substance-specific awareness content.'
WHERE slug = 'recovery-contributor-team';

-- Assign author_id to every published article that doesn't have one
WITH ids AS (
  SELECT
    (SELECT id FROM public.blog_authors WHERE slug = 'rehablookup-editorial')     AS editorial,
    (SELECT id FROM public.blog_authors WHERE slug = 'medical-review-team')       AS medical,
    (SELECT id FROM public.blog_authors WHERE slug = 'recovery-contributor-team') AS recovery
)
UPDATE public.blog_articles AS a
SET author_id = CASE
  WHEN a.category IN (
    'recovery', 'for-families', 'family-support', 'education', 'prevention', 'aftercare'
  ) THEN (SELECT recovery FROM ids)
  WHEN a.category IN (
    'treatment', 'treatment-options', 'treatment-types', 'dual-diagnosis'
  ) THEN (SELECT medical FROM ids)
  ELSE (SELECT editorial FROM ids)
END
FROM ids
WHERE a.status = 'published'
  AND a.author_id IS NULL;

-- Stamp medical_reviewer_id on clinical articles
WITH ids AS (
  SELECT (SELECT id FROM public.blog_authors WHERE slug = 'medical-review-team') AS medical
)
UPDATE public.blog_articles AS a
SET
  medical_reviewer_id      = (SELECT medical FROM ids),
  last_medically_reviewed_at = NOW()
FROM ids
WHERE a.status = 'published'
  AND a.category IN (
    'treatment', 'treatment-options', 'treatment-types', 'dual-diagnosis', 'aftercare'
  )
  AND a.medical_reviewer_id IS NULL;

COMMIT;
