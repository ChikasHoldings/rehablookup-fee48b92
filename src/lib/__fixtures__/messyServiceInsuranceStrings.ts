/**
 * Adversarial fixture datasets for `service_name` and `insurance_name`
 * regex matching in src/lib/profileRelatedLinks.ts.
 *
 * Goal: lock down word-boundary behaviour so cosmetic leaks never ship.
 *
 * Each fixture pairs a messy real-world-shaped string with:
 *   - `mustEmitSlugs`:  slugs the matcher MUST surface for this string.
 *   - `mustNotEmitSlugs`: slugs the matcher MUST NOT surface — these are
 *     the regexes that are most prone to substring leakage (men ⊂ women,
 *     anthem ⊂ "Anthem Blue Cross" must collapse to BCBS only, etc.).
 *
 * `notes` documents why a given case exists so future contributors don't
 * "fix" a deliberate negative assertion away.
 */

export interface FixtureCase {
  /** Raw service_name / insurance_name as it appears in the DB. */
  input: string;
  /** Canonical slugs the matcher MUST emit for this input. */
  mustEmitSlugs: string[];
  /** Canonical slugs the matcher MUST NOT emit (leakage guards). */
  mustNotEmitSlugs: string[];
  /** Why this case exists — keeps deliberate negatives from getting deleted. */
  notes: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Service / treatment-type fixtures
// ─────────────────────────────────────────────────────────────────────────
export const MESSY_SERVICE_FIXTURES: FixtureCase[] = [
  // ── audience: men vs women word-boundary ─────────────────────────────
  {
    input: "Women's Residential Program",
    mustEmitSlugs: ["womens-rehab", "residential-inpatient"],
    mustNotEmitSlugs: ["mens-rehab"],
    notes: "Classic leak: /men/ inside 'women' must NOT match.",
  },
  {
    input: "WOMEN ONLY",
    mustEmitSlugs: ["womens-rehab"],
    mustNotEmitSlugs: ["mens-rehab"],
    notes: "Uppercase + no possessive 's. Word boundary holds for /women/i.",
  },
  {
    input: "Men's Sober Living",
    mustEmitSlugs: ["mens-rehab", "sober-living"],
    mustNotEmitSlugs: ["womens-rehab"],
    notes: "Possessive form 'Men's' must match the men regex cleanly.",
  },
  {
    input: "Treatment for men and women",
    mustEmitSlugs: ["mens-rehab"],
    mustNotEmitSlugs: [],
    notes:
      "Both genders mentioned — first-match-wins picks women (listed before men). " +
      "Either is acceptable; this fixture only asserts no demographic-adjacent " +
      "false-positive (e.g. 'mens-rehab' must NEVER fire on 'women' alone).",
  },
  {
    input: "Acumen-based Therapy",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["mens-rehab", "womens-rehab"],
    notes:
      "'acumen' contains the substring 'men' — \\bmen\\b must NOT fire on it. " +
      "Same protection applies to 'regimen', 'specimen', 'omen', etc.",
  },
  {
    input: "Regimen review & medication management",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["mens-rehab", "womens-rehab"],
    notes: "'regimen' embeds 'men'; \\bmen\\b must not leak.",
  },
  {
    input: "Omen-style group therapy",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["mens-rehab", "womens-rehab"],
    notes: "'omen' embeds 'men'; \\bmen\\b must not leak.",
  },
  {
    input: "Veterinary technician on staff",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["veterans-rehab"],
    notes:
      "'veterinary' starts with 'veter' — must NOT match \\bveterans?\\b. " +
      "This was the canonical example called out in the file's comments.",
  },
  {
    input: "Veterans-only PTSD program",
    mustEmitSlugs: ["veterans-rehab"],
    mustNotEmitSlugs: [],
    notes: "Plural 'veterans' must still match (\\bveterans?\\b).",
  },

  // ── setting-of-care: inpatient / outpatient overlap ──────────────────
  {
    input: "Inpatient Detox",
    mustEmitSlugs: ["residential-inpatient", "drug-addiction-treatment"],
    mustNotEmitSlugs: ["outpatient-programs"],
    notes:
      "'inpatient' must NOT trigger 'outpatient'. Word boundary on /\\b(outpatient|...)\\b/ " +
      "guards against this — but only because the regex is anchored. " +
      "If someone removes \\b, 'inpatient' will leak into outpatient-programs.",
  },
  {
    input: "Intensive Outpatient (IOP)",
    mustEmitSlugs: ["outpatient-programs"],
    mustNotEmitSlugs: ["residential-inpatient"],
    notes: "IOP alias must hit outpatient hub.",
  },
  {
    input: "Partial Hospitalization Program",
    mustEmitSlugs: ["outpatient-programs"],
    mustNotEmitSlugs: ["residential-inpatient"],
    notes: "PHP wording must route to outpatient hub.",
  },
  {
    input: "Residential treatment",
    mustEmitSlugs: ["residential-inpatient"],
    mustNotEmitSlugs: ["outpatient-programs"],
    notes: "Residential alias for inpatient.",
  },

  // ── substance / clinical intent ──────────────────────────────────────
  {
    input: "Detoxification services",
    mustEmitSlugs: ["drug-addiction-treatment"],
    mustNotEmitSlugs: [],
    notes: "Long-form 'detoxification' must match \\bdetox(ification)?\\b.",
  },
  {
    input: "Alcoholism counselling",
    mustEmitSlugs: ["alcohol-rehabilitation"],
    mustNotEmitSlugs: [],
    notes: "'alcoholism' covered by /\\b(alcohol|alcoholism)\\b/.",
  },
  {
    input: "Co-occurring disorders / dual diagnosis",
    mustEmitSlugs: ["dual-diagnosis-treatment"],
    mustNotEmitSlugs: [],
    notes:
      "Hyphen and space variants of 'co-occurring' / 'dual diagnosis' / " +
      "'dual-diagnosis' must all collapse to dual-diagnosis-treatment.",
  },
  {
    input: "Mental health support",
    mustEmitSlugs: ["dual-diagnosis-treatment"],
    mustNotEmitSlugs: [],
    notes: "'mental health' folded into dual-diagnosis hub by design.",
  },

  // ── modality ─────────────────────────────────────────────────────────
  {
    input: "Faith-based 12-step",
    mustEmitSlugs: ["faith-based-rehab"],
    mustNotEmitSlugs: [],
    notes: "'faith-based' with hyphen.",
  },
  {
    input: "Christian recovery group",
    mustEmitSlugs: ["faith-based-rehab"],
    mustNotEmitSlugs: [],
    notes: "'christian' alias for faith-based modality.",
  },
  {
    input: "Holistic yoga & meditation",
    mustEmitSlugs: ["holistic-therapy"],
    mustNotEmitSlugs: [],
    notes: "First-match-wins picks holistic over yoga/meditation.",
  },

  // ── tier / cost ──────────────────────────────────────────────────────
  {
    input: "Luxury Executive Program",
    mustEmitSlugs: ["luxury-rehab"],
    mustNotEmitSlugs: ["free-rehab"],
    notes: "'luxury' / 'executive' map to luxury hub, not free-rehab.",
  },
  {
    input: "Free state-funded rehab",
    mustEmitSlugs: ["free-rehab"],
    mustNotEmitSlugs: ["luxury-rehab"],
    notes: "'free' must NOT collide with 'luxury'.",
  },
  {
    input: "Halfway house & sober living",
    mustEmitSlugs: ["sober-living"],
    mustNotEmitSlugs: [],
    notes: "Both halfway/sober-living aliases collapse to one hub.",
  },

  // ── empty / junk inputs ──────────────────────────────────────────────
  {
    input: "",
    mustEmitSlugs: [],
    mustNotEmitSlugs: [
      "residential-inpatient",
      "outpatient-programs",
      "drug-addiction-treatment",
      "mens-rehab",
      "womens-rehab",
    ],
    notes: "Empty service_name must produce zero matches (no emit).",
  },
  {
    input: "   ",
    mustEmitSlugs: [],
    mustNotEmitSlugs: [
      "residential-inpatient",
      "outpatient-programs",
      "drug-addiction-treatment",
    ],
    notes: "Whitespace-only string must produce zero matches.",
  },
  {
    input: "General wellness consultation",
    mustEmitSlugs: [],
    mustNotEmitSlugs: [
      "residential-inpatient",
      "outpatient-programs",
      "drug-addiction-treatment",
      "alcohol-rehabilitation",
      "mens-rehab",
      "womens-rehab",
      "veterans-rehab",
    ],
    notes:
      "Generic copy with no treatment keyword must NEVER emit a hub link " +
      "— guards against an over-eager regex (e.g. someone making the " +
      "patterns case-insensitive AND non-bounded).",
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Insurance fixtures
// ─────────────────────────────────────────────────────────────────────────
export const MESSY_INSURANCE_FIXTURES: FixtureCase[] = [
  // ── BCBS / Anthem precedence ─────────────────────────────────────────
  {
    input: "Anthem Blue Cross Blue Shield of California",
    mustEmitSlugs: ["bcbs-treatment"],
    mustNotEmitSlugs: ["anthem-rehab"],
    notes:
      "BCBS regex sits BEFORE the standalone /anthem/ regex AND first-match-wins. " +
      "'Anthem Blue Cross' must collapse to BCBS, never emit anthem-rehab too.",
  },
  {
    input: "Anthem Inc.",
    mustEmitSlugs: ["anthem-rehab"],
    mustNotEmitSlugs: ["bcbs-treatment"],
    notes:
      "Standalone 'Anthem' (no Blue) must hit anthem-rehab. " +
      "This pairs with the case above to lock the precedence rule.",
  },
  {
    input: "BCBS PPO",
    mustEmitSlugs: ["bcbs-treatment"],
    mustNotEmitSlugs: ["anthem-rehab"],
    notes: "Acronym BCBS alone is sufficient for the BCBS hub.",
  },
  {
    input: "Blue Cross",
    mustEmitSlugs: ["bcbs-treatment"],
    mustNotEmitSlugs: ["anthem-rehab"],
    notes: "Just 'Blue Cross' (no Shield) still hits BCBS.",
  },
  {
    input: "Blue Shield of California",
    mustEmitSlugs: ["bcbs-treatment"],
    mustNotEmitSlugs: ["anthem-rehab"],
    notes: "Just 'Blue Shield' still hits BCBS.",
  },

  // ── United Healthcare aliases ────────────────────────────────────────
  {
    input: "UnitedHealthcare Choice Plus",
    mustEmitSlugs: ["united-healthcare-rehab"],
    mustNotEmitSlugs: [],
    notes: "Concatenated 'UnitedHealthcare' (one word).",
  },
  {
    input: "United Health Care",
    mustEmitSlugs: ["united-healthcare-rehab"],
    mustNotEmitSlugs: [],
    notes: "Spaced-out 'United Health Care' must still match.",
  },
  {
    input: "United-Healthcare",
    mustEmitSlugs: ["united-healthcare-rehab"],
    mustNotEmitSlugs: [],
    notes: "Hyphenated form of UHC — covered by united[- ]?health(care)?.",
  },
  {
    input: "UHC",
    mustEmitSlugs: ["united-healthcare-rehab"],
    mustNotEmitSlugs: [],
    notes: "Acronym UHC alias.",
  },

  // ── Medicare vs Medicaid leakage ─────────────────────────────────────
  {
    input: "Medicare Advantage",
    mustEmitSlugs: ["medicare-rehab"],
    mustNotEmitSlugs: ["medicaid-rehab"],
    notes:
      "'Medicare' and 'Medicaid' share the prefix 'medica'; word-bounded " +
      "patterns must keep them distinct.",
  },
  {
    input: "Medicaid expansion plan",
    mustEmitSlugs: ["medicaid-rehab"],
    mustNotEmitSlugs: ["medicare-rehab"],
    notes: "Reverse leak guard for the medicare/medicaid pair.",
  },

  // ── Carrier collisions / substring traps ─────────────────────────────
  {
    input: "Cigna HealthSpring",
    mustEmitSlugs: ["cigna-rehab"],
    mustNotEmitSlugs: ["united-healthcare-rehab", "humana-rehab"],
    notes:
      "Defensive: 'HealthSpring' contains 'health' — \\bunited[- ]?health(care)?\\b " +
      "must NOT match it because 'united' is missing.",
  },
  {
    input: "Aetna Better Health",
    mustEmitSlugs: ["aetna-rehab"],
    mustNotEmitSlugs: ["united-healthcare-rehab"],
    notes:
      "'Better Health' must not trigger UHC. Confirms the 'united' anchor " +
      "in the UHC regex is doing its job.",
  },
  {
    input: "Kaiser Permanente",
    mustEmitSlugs: ["kaiser-rehab"],
    mustNotEmitSlugs: [],
    notes: "Plain Kaiser case.",
  },
  {
    input: "Humana Gold Plus",
    mustEmitSlugs: ["humana-rehab"],
    mustNotEmitSlugs: [],
    notes: "Plain Humana case.",
  },

  // ── Adversarial substring traps ──────────────────────────────────────
  {
    input: "TheBlueDoor Wellness", // no whitespace before "Blue"
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["bcbs-treatment", "anthem-rehab"],
    notes:
      "'Blue' embedded inside 'TheBlueDoor' has no leading word boundary; " +
      "the BCBS regex requires \\b(blue\\s*cross|...)\\b which must not fire here.",
  },
  {
    input: "Anthemic Foundation Grant",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["anthem-rehab", "bcbs-treatment"],
    notes:
      "'Anthemic' contains 'anthem' but lacks the trailing word boundary. " +
      "\\banthem\\b must NOT match 'anthemic'.",
  },
  {
    input: "BlueCross",
    mustEmitSlugs: ["bcbs-treatment"],
    mustNotEmitSlugs: ["anthem-rehab"],
    notes:
      "Concatenated 'BlueCross' (one word) — \\b(blue\\s*cross|...)\\b uses " +
      "\\s* so this still matches; documents that intentional behaviour.",
  },
  {
    input: "Cignal Boost Provider",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["cigna-rehab"],
    notes:
      "'Cignal' starts with 'cigna' but lacks trailing word boundary. " +
      "\\bcigna\\b must NOT match.",
  },
  {
    input: "Aetnatic Wellness Co", // synthetic — guards trailing-boundary
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["aetna-rehab"],
    notes:
      "Synthetic adversarial token: 'Aetnatic' embeds 'aetna' without a " +
      "trailing word boundary. Locks down \\baetna\\b.",
  },
  {
    input: "Premedicare Advisory",
    mustEmitSlugs: [],
    mustNotEmitSlugs: ["medicare-rehab", "medicaid-rehab"],
    notes:
      "'Premedicare' lacks a leading word boundary before 'medicare'. " +
      "\\bmedicare\\b must NOT fire on this.",
  },

  // ── empty / junk inputs ──────────────────────────────────────────────
  {
    input: "",
    mustEmitSlugs: [],
    mustNotEmitSlugs: [
      "bcbs-treatment",
      "anthem-rehab",
      "aetna-rehab",
      "cigna-rehab",
      "united-healthcare-rehab",
      "medicare-rehab",
      "medicaid-rehab",
    ],
    notes: "Empty insurance_name must produce zero matches.",
  },
  {
    input: "Self-pay / cash only",
    mustEmitSlugs: [],
    mustNotEmitSlugs: [
      "bcbs-treatment",
      "anthem-rehab",
      "aetna-rehab",
      "cigna-rehab",
      "united-healthcare-rehab",
      "humana-rehab",
      "kaiser-rehab",
      "medicare-rehab",
      "medicaid-rehab",
    ],
    notes:
      "No-carrier copy must NEVER emit an insurance hub link — guards " +
      "against a future regex that drops its anchor and pattern-matches " +
      "any string containing common letters.",
  },
];
