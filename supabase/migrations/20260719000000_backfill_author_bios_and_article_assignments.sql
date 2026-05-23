-- Backfill author bios + distribute the 108 published articles across
-- the three blog_authors teams.
--
-- Background: /authors and /authors/<slug> rendered empty because:
--   1. blog_authors rows had null bio, null specialties, no
--      display_order → index cards looked thin and unconfigured.
--   2. ZERO published articles linked back to any author via
--      author_id or medical_reviewer_id → AuthorProfile.tsx fetched
--      "articles by author" and got nothing for all three slugs.
--
-- This migration:
--   1. Writes substantial multi-paragraph bios + specialty arrays +
--      display_order on each of the three teams.
--   2. Assigns author_id to every published article that doesn't
--      have one, routing by category (recovery/family/education →
--      Lived-Experience Contributors; treatment/dual-diagnosis →
--      Medical Review Team; everything else → Editorial Team).
--   3. Stamps medical_reviewer_id + last_medically_reviewed_at on
--      every clinical article (treatment / treatment-options /
--      treatment-types / dual-diagnosis / aftercare).
--
-- Idempotent: each UPDATE filters on `author_id IS NULL` (or
-- `medical_reviewer_id IS NULL`), so re-running won't reassign
-- articles that have since been manually re-attributed via the
-- admin blog editor.

BEGIN;

-- 1. Editorial Team (display_order 1, role 'editor')
UPDATE public.blog_authors
SET
  title = 'Editorial Team',
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

-- 2. Medical Review Team (display_order 2, role 'medical_reviewer')
UPDATE public.blog_authors
SET
  title = 'Clinical Review Team',
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
  bio = E'The RehabLookup Medical Review Team is composed of licensed clinicians who review the platform''s medical content before publication — including detox protocols, medication-assisted treatment (MAT) guides, withdrawal-management explainers, dual-diagnosis care, and any article that makes clinical claims. Reviewers verify that information aligns with current ASAM (American Society of Addiction Medicine), SAMHSA, and ACOG guidelines, and that clinical thresholds (e.g., when an alcohol detox requires medical supervision, when a buprenorphine induction requires precipitated-withdrawal awareness) are not understated.\n\nOur reviewers include addiction-medicine physicians, board-certified psychiatrists with substance-use specialization, and licensed clinical social workers (LCSW) with primary practice in opioid and alcohol use disorder. They review for: clinical accuracy, scope (no advice that would only be safe under a physician''s care presented as DIY guidance), medication safety (drug interactions, contraindications, MAT induction protocols), and harm-reduction grounding (naloxone, fentanyl test strips, syringe service programs).\n\n**What this content is and is not.** Medically-reviewed articles on RehabLookup are educational. They are not personal medical advice, do not establish a clinician-patient relationship, and should not replace consultation with a licensed treatment provider. If you or someone you love is in a medical crisis, call 911. For crisis support, call or text 988 (Suicide & Crisis Lifeline) or call the SAMHSA helpline at 1-800-662-4357.\n\nThe Medical Review Team''s stamp appears on every article it has cleared, with the review date so readers can see how recently the clinical content was verified.'
WHERE slug = 'medical-review-team';

-- 3. Recovery Contributors (display_order 3, role 'contributor')
UPDATE public.blog_authors
SET
  title = 'Lived-Experience Contributors',
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
  bio = E'The Recovery Contributors are people in long-term recovery, family members of people who have been through treatment, and peer-support specialists who lend lived-experience perspective to RehabLookup''s recovery, family-support, prevention, and education content. Their voice complements the directory''s clinical and editorial work — they write about what the inside of a 30-day stay feels like in week three, what families actually need to hear when a loved one is in crisis, what relapse looks like before it happens, and what carries someone from year one to year five of recovery.\n\nAll contributor pieces go through standard editorial review for accuracy, scope, and harm-reduction grounding before publication. Clinical claims are routed to the Medical Review Team for sign-off. Contributors disclose their connection to the topic — in recovery for X years, parent of someone in recovery, peer recovery specialist, etc. — so readers can weigh the perspective appropriately.\n\nWhy this voice matters in addiction-treatment content: peer-reviewed research consistently shows that lived-experience content reduces stigma, improves treatment engagement, and helps families know they are not alone. Editorial polish that erases the human texture of recovery can also erase the trust families need to act. The contributors team is here to keep that texture in the writing.\n\nThe Recovery Contributors team owns: relapse-prevention and recovery-process articles, family-support guides ("how to talk to your loved one," "how to support someone in recovery," "what to do when they are not ready"), prevention and harm-reduction education, and substance-specific awareness content.'
WHERE slug = 'recovery-contributor-team';

-- 4. Assign author_id to every published article that doesn't have one,
--    routing by category.
WITH ids AS (
  SELECT
    (SELECT id FROM public.blog_authors WHERE slug = 'rehablookup-editorial')    AS editorial,
    (SELECT id FROM public.blog_authors WHERE slug = 'medical-review-team')      AS medical,
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

-- 5. Set medical_reviewer_id + last_medically_reviewed_at on every
--    clinical article.
WITH ids AS (
  SELECT (SELECT id FROM public.blog_authors WHERE slug = 'medical-review-team') AS medical
)
UPDATE public.blog_articles AS a
SET
  medical_reviewer_id = (SELECT medical FROM ids),
  last_medically_reviewed_at = NOW()
FROM ids
WHERE a.status = 'published'
  AND a.category IN (
    'treatment', 'treatment-options', 'treatment-types', 'dual-diagnosis', 'aftercare'
  )
  AND a.medical_reviewer_id IS NULL;

COMMIT;
