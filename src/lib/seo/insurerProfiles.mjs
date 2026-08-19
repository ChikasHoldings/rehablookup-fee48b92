/**
 * Per-insurer facts — the missing axis behind 7,527 near-identical pages.
 *
 * `insurerConfigs` in `src/data/seoInsuranceStateConfig.ts` carries a
 * slug, a display name and a path. Nothing else. Every /insurance/
 * {insurer}/{state}/{city} page therefore had exactly one variable worth
 * writing about — the name — and 7,527 pages collapsed to 29 distinct
 * bodies once geography was normalized out. The carrier axis contributed
 * a string substitution, not information.
 *
 * This module gives that axis something to say. Each profile records
 * facts that are TRUE OF THE CARRIER and differ between carriers:
 * whether it is a national commercial insurer, a federation of
 * independent licensees, a government program or an integrated
 * payer-provider; which entity actually administers its behavioral
 * health benefit; which plan structures it sells; and how a member
 * actually verifies a substance-use benefit with it.
 *
 * WHAT IS DELIBERATELY NOT HERE
 *
 * No dollar amounts, no deductibles, no coinsurance percentages, no
 * "covers N days", no claim that any facility is in-network. Those vary
 * by plan, employer group, state and year — writing them per carrier
 * would be inventing specifics for a health decision, which is worse
 * than the thin content it would replace. Everything below is
 * structural: how the carrier is organized and how a member checks their
 * own benefit. That is stable, checkable, and genuinely different from
 * carrier to carrier.
 *
 * Plain `.mjs` for the same reason as `src/lib/location/core.mjs`: the
 * static-HTML generators run under Node and cannot import `.ts`, and the
 * crawler-visible page and the React page must say the same thing.
 */

/**
 * @typedef {"national-commercial" | "blue-licensee" | "integrated" |
 *           "government" | "military" | "managed-behavioral" |
 *           "marketplace"} CarrierType
 */

/** Human wording for each structural category. */
export const CARRIER_TYPE_LABEL = {
  "national-commercial": "national commercial insurer",
  "blue-licensee": "Blue Cross Blue Shield licensee",
  integrated: "integrated health plan and care provider",
  government: "government health program",
  military: "military health program",
  "managed-behavioral": "managed behavioral health organization",
  marketplace: "ACA marketplace insurer",
};

/**
 * The 16 carriers the directory publishes pages for.
 *
 * `behavioralHealth` names the entity that actually administers the
 * substance-use benefit — often not the carrier whose name is on the
 * card, which is the single most useful thing a member can know before
 * calling. `verify` is the concrete route for that carrier.
 */
export const INSURER_PROFILES = {
  "aetna-rehab": {
    name: "Aetna",
    type: "national-commercial",
    parent: "CVS Health",
    behavioralHealth: "Aetna Behavioral Health",
    planTypes: ["HMO", "PPO", "EPO", "POS", "high-deductible plans"],
    network: "national",
    verify:
      "Call the Member Services number on your Aetna card and ask for the behavioral health line, or sign in to the Aetna member site and search the behavioral health directory.",
    distinctive:
      "Aetna administers substance-use benefits through its own behavioral health unit rather than a third-party carve-out, so medical and behavioral authorizations run through the same member number on your card.",
  },
  "bcbs-treatment": {
    name: "Blue Cross Blue Shield",
    type: "blue-licensee",
    parent: null,
    behavioralHealth: "your local Blue plan (varies by state)",
    planTypes: ["HMO", "PPO", "EPO", "POS"],
    network: "local plan plus national BlueCard access",
    verify:
      "Identify your local Blue plan from the three-letter prefix on your member ID, then call that plan's behavioral health number — benefits are set by the local plan, not by a national office.",
    distinctive:
      "Blue Cross Blue Shield is a federation of independent, locally operated companies rather than a single insurer, so coverage rules differ between states. The BlueCard program is what lets a member treated outside their home plan's area still be processed at in-network rates.",
  },
  "cigna-rehab": {
    name: "Cigna",
    type: "national-commercial",
    parent: "The Cigna Group",
    behavioralHealth: "Evernorth Behavioral Health",
    planTypes: ["HMO", "PPO", "EPO", "Open Access Plus", "high-deductible plans"],
    network: "national",
    verify:
      "Call the behavioral health number on your Cigna card — it routes to Evernorth, not to medical customer service — or use the Cigna member portal's behavioral provider directory.",
    distinctive:
      "Cigna's substance-use benefit is administered by Evernorth, its health-services arm. Members who call the general medical line are often transferred, so asking for behavioral health at the start saves a step.",
  },
  "united-healthcare-rehab": {
    name: "UnitedHealthcare",
    type: "national-commercial",
    parent: "UnitedHealth Group",
    behavioralHealth: "Optum Behavioral Health",
    planTypes: ["HMO", "PPO", "EPO", "POS", "high-deductible plans"],
    network: "national",
    verify:
      "Substance-use benefits are handled by Optum. Call the behavioral health number on your UnitedHealthcare card or use Optum's provider search rather than the general medical directory.",
    distinctive:
      "UnitedHealthcare carves its behavioral health benefit out to Optum, which maintains a separate provider network from the medical plan. A facility that is in-network medically is not automatically in-network for Optum.",
  },
  "humana-rehab": {
    name: "Humana",
    type: "national-commercial",
    parent: "Humana Inc.",
    behavioralHealth: "Humana Behavioral Health",
    planTypes: ["Medicare Advantage", "HMO", "PPO", "employer group plans"],
    network: "national, weighted toward Medicare Advantage",
    verify:
      "Call the number on your Humana card and specify whether your plan is Medicare Advantage or commercial — authorization rules differ between the two.",
    distinctive:
      "A large share of Humana's membership is Medicare Advantage, so substance-use coverage frequently follows Medicare's benefit structure and its prior-authorization and medical-necessity review rules rather than commercial plan rules.",
  },
  "kaiser-rehab": {
    name: "Kaiser Permanente",
    type: "integrated",
    parent: null,
    behavioralHealth: "Kaiser Permanente addiction medicine services",
    planTypes: ["HMO", "Medicare Advantage", "employer group plans"],
    network: "closed — care is generally delivered within Kaiser facilities",
    verify:
      "Contact Kaiser Permanente member services or your Kaiser primary care physician; addiction medicine referrals normally originate inside the Kaiser system.",
    distinctive:
      "Kaiser Permanente is both the insurer and the provider. Treatment is generally delivered at Kaiser-operated facilities or by contracted providers, and outside care usually requires prior authorization or an emergency, which makes it the most network-restricted plan in this directory.",
  },
  "medicare-rehab": {
    name: "Medicare",
    type: "government",
    parent: "Centers for Medicare & Medicaid Services",
    behavioralHealth: "Medicare Parts A and B, or a Part C plan's administrator",
    planTypes: ["Part A", "Part B", "Part C (Medicare Advantage)", "Part D"],
    network: "any Medicare-certified provider (Original Medicare)",
    verify:
      "Confirm whether you have Original Medicare or a Medicare Advantage (Part C) plan — with Original Medicare, check that the facility is Medicare-certified; with Part C, call the plan on your card.",
    distinctive:
      "Medicare splits the benefit: Part A covers inpatient hospital and inpatient rehabilitation stays under benefit periods, while Part B covers outpatient treatment, therapy and medication-assisted treatment. Which part applies depends on the level of care, not on the diagnosis.",
  },
  "medicaid-rehab": {
    name: "Medicaid",
    type: "government",
    parent: "state Medicaid agencies under federal rules",
    behavioralHealth: "your state Medicaid agency or its managed-care plan",
    planTypes: ["state fee-for-service", "Medicaid managed care"],
    network: "state-specific",
    verify:
      "Contact your state Medicaid agency or the managed-care plan named on your card — eligibility, covered levels of care and provider networks are set state by state.",
    distinctive:
      "Medicaid is administered by each state within federal rules, so it is the one program in this directory whose substance-use coverage genuinely differs by state — including whether the state expanded eligibility under the ACA.",
  },
  "anthem-rehab": {
    name: "Anthem",
    type: "blue-licensee",
    parent: "Elevance Health",
    behavioralHealth: "Carelon Behavioral Health",
    planTypes: ["HMO", "PPO", "EPO", "Medicaid and Medicare plans"],
    network: "Blue network in Anthem-licensed states",
    verify:
      "Behavioral health is administered by Carelon. Call the behavioral health number on your Anthem card rather than medical member services.",
    distinctive:
      "Anthem is a Blue Cross Blue Shield licensee operating in a defined set of states under Elevance Health, and its substance-use benefit is administered by Carelon Behavioral Health — a separate network from the medical plan.",
  },
  "tricare-rehab": {
    name: "TRICARE",
    type: "military",
    parent: "Defense Health Agency",
    behavioralHealth: "your regional TRICARE contractor",
    planTypes: ["Prime", "Select", "For Life", "Reserve Select"],
    network: "regional contractor networks",
    verify:
      "Contact your regional TRICARE contractor and confirm your plan type — Prime generally requires referrals and authorizations that Select does not.",
    distinctive:
      "TRICARE is administered by regional contractors rather than a single national office, and the referral and authorization rules differ sharply between Prime and Select. Beneficiary category — active duty, family member, retiree, reservist — also changes what applies.",
  },
  "molina-rehab": {
    name: "Molina Healthcare",
    type: "marketplace",
    parent: "Molina Healthcare, Inc.",
    behavioralHealth: "Molina behavioral health services",
    planTypes: ["Medicaid managed care", "Medicare", "ACA marketplace plans"],
    network: "state-by-state, where Molina holds contracts",
    verify:
      "Call the number on your Molina card and confirm which product you hold — Molina's Medicaid, Medicare and marketplace plans have different networks in the same state.",
    distinctive:
      "Molina's business is concentrated in government-sponsored coverage: Medicaid managed care and marketplace plans. It operates only in states where it holds contracts, so availability is genuinely regional rather than national.",
  },
  "magellan-rehab": {
    name: "Magellan Health",
    type: "managed-behavioral",
    parent: "Centene Corporation",
    behavioralHealth: "Magellan itself",
    planTypes: ["behavioral health carve-out contracts", "employer and public-sector programs"],
    network: "behavioral health specialty network",
    verify:
      "Magellan is usually the behavioral health administrator behind another plan or employer program — check whether Magellan is named on your card or in your benefit documents, then call Magellan directly.",
    distinctive:
      "Magellan is a managed behavioral health organization rather than a medical insurer. Members typically reach it as the carve-out administrator behind an employer plan, a health plan or a state program, which is why its name may appear only in benefit documents rather than on the card.",
  },
  "wellcare-rehab": {
    name: "WellCare",
    type: "government",
    parent: "Centene Corporation",
    behavioralHealth: "WellCare behavioral health services",
    planTypes: ["Medicare Advantage", "Part D", "Medicaid plans"],
    network: "plan- and state-specific",
    verify:
      "Call the number on your WellCare card and confirm the specific plan — WellCare's Medicare and Medicaid products have separate networks and authorization rules.",
    distinctive:
      "WellCare, part of Centene, concentrates on Medicare Advantage, prescription drug plans and Medicaid. Coverage follows the rules of the government program behind the plan rather than commercial insurance rules.",
  },
  "ambetter-rehab": {
    name: "Ambetter",
    type: "marketplace",
    parent: "Centene Corporation",
    behavioralHealth: "Ambetter behavioral health services",
    planTypes: ["ACA marketplace Bronze, Silver and Gold plans"],
    network: "state marketplace networks, often narrow",
    verify:
      "Call the number on your Ambetter card and confirm your metal tier — cost sharing for the same level of care differs substantially between Bronze, Silver and Gold.",
    distinctive:
      "Ambetter is Centene's ACA marketplace brand and is sold only in states where Centene participates in the exchange. Marketplace networks are frequently narrower than employer plans, so confirming that a specific facility participates matters more than usual.",
  },
  "oscar-rehab": {
    name: "Oscar Health",
    type: "marketplace",
    parent: "Oscar Health, Inc.",
    behavioralHealth: "Oscar behavioral health services",
    planTypes: ["ACA marketplace plans", "small group plans"],
    network: "limited to Oscar's licensed service areas",
    verify:
      "Use the Oscar app or member portal, or call the concierge team named on your card — Oscar routes members through a care team rather than a general call center.",
    distinctive:
      "Oscar operates in a limited set of metropolitan service areas and organizes member support around an assigned care team and app rather than a traditional call centre, so benefit checks usually start there.",
  },
  "highmark-rehab": {
    name: "Highmark",
    type: "blue-licensee",
    parent: "Highmark Health",
    behavioralHealth: "Highmark behavioral health services",
    planTypes: ["HMO", "PPO", "EPO", "Medicare Advantage"],
    network: "Blue network across Highmark's licensed states",
    verify:
      "Call the behavioral health number on your Highmark card and confirm which Highmark region issued your plan, since benefits are set regionally.",
    distinctive:
      "Highmark is a Blue Cross Blue Shield licensee operating across a defined multi-state region rather than nationally, and members treated outside that region rely on BlueCard reciprocity to be processed at in-network rates.",
  },
};

/** Profile for an insurer slug, or null when the slug is unknown. */
export function insurerProfile(slug) {
  if (!slug) return null;
  return INSURER_PROFILES[slug] ?? null;
}

/** Profile looked up by display name — the React page holds names, not slugs. */
export function insurerProfileByName(name) {
  if (!name) return null;
  const target = String(name).trim().toLowerCase();
  for (const profile of Object.values(INSURER_PROFILES)) {
    if (profile.name.toLowerCase() === target) return profile;
  }
  return null;
}

/** Every slug that has a profile — used by the coverage guard in tests. */
export function profiledInsurerSlugs() {
  return Object.keys(INSURER_PROFILES);
}
