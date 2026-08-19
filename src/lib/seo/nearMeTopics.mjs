/**
 * Per-topic facts for the 58 "near me" page families.
 *
 * Twenty-one of these families run ~420 pages each and reduced to TWO
 * distinct bodies apiece — the single worst duplication ratio in the
 * corpus. `nearMeTypes.ts` carries a slug, a label and a treatment-type
 * string, so a "methadone clinic near me" page and a "sober living near
 * me" page were the same page with a different noun, even though those
 * two things are not remotely the same service.
 *
 * Each profile below records what genuinely distinguishes that topic:
 * what the service actually is, the one clinical or practical fact that
 * most changes how someone should approach it, and what to verify before
 * committing to a program.
 *
 * ACCURACY POLICY
 *
 * This is health content, so every `keyPoint` is a well-established
 * clinical or regulatory fact — that alcohol and benzodiazepine
 * withdrawal can be life-threatening while opioid withdrawal usually is
 * not; that methadone for opioid use disorder is dispensed only through
 * federally certified opioid treatment programs; that no medication is
 * FDA-approved for stimulant use disorder. No page states a success
 * rate, a cost, a duration guarantee, or a claim about a named facility.
 * Where a topic is a marketing category rather than a clinical one
 * ("luxury", "executive"), the profile says so plainly rather than
 * implying clinical superiority.
 */

/** Shared closing guidance — one sentence, appended per page, not a section. */
export const UNIVERSAL_VERIFY =
  "Confirm state licensure, the levels of care actually offered on site, and how the program handles a patient who needs a higher level of care than it provides.";

export const NEAR_ME_TOPICS = {
  // ── Core levels of care ────────────────────────────────────────────
  "rehab-near-me": {
    whatItIs: "General addiction treatment covering the full continuum, from medically supervised withdrawal through residential and outpatient care.",
    keyPoint: "\"Rehab\" is not one service. The level of care that fits depends on withdrawal risk, whether a co-occurring mental health condition is present, and whether the home environment supports recovery — not on how severe the addiction feels.",
    verify: "Ask which levels of care are delivered on site versus referred out, and what the admission assessment actually screens for.",
  },
  "drug-rehab-near-me": {
    whatItIs: "Treatment for substance use disorders involving drugs other than alcohol, across detox, residential and outpatient levels.",
    keyPoint: "The substance drives the medical plan. Opioid and benzodiazepine dependence have medication protocols; stimulant use disorder does not, and is treated behaviourally.",
    verify: "Ask whether the program treats your specific substance routinely, and whether medication is part of its approach.",
  },
  "alcohol-rehab-near-me": {
    whatItIs: "Treatment for alcohol use disorder, usually beginning with withdrawal management and continuing into residential or outpatient care.",
    keyPoint: "Alcohol withdrawal can be life-threatening. Seizures and delirium tremens are real risks for people who drink heavily and daily, which is why unsupervised 'cold turkey' detox is the one approach clinicians warn against outright.",
    verify: "Ask whether withdrawal is medically supervised, whether a prescriber is on site, and what happens if symptoms escalate overnight.",
  },
  "detox-near-me": {
    whatItIs: "Medically supervised withdrawal management — the stabilization step, not a complete course of treatment.",
    keyPoint: "Detox alone is not treatment for addiction. Without a planned step-down into residential or outpatient care, relapse risk after detox is high, and tolerance has dropped — which is what makes post-detox overdose particularly dangerous.",
    verify: "Ask what the discharge plan is before you admit, not after — a detox with no arranged next step is an incomplete referral.",
  },
  "inpatient-rehab-near-me": {
    whatItIs: "Residential treatment with 24-hour staffing, typically 28 to 90 days, combining clinical therapy with a structured environment.",
    keyPoint: "The value of residential care is the removal of access and the 24-hour clinical presence. It is indicated when withdrawal risk, co-occurring conditions or an unstable home environment make outpatient care unsafe — not automatically by substance type.",
    verify: "Ask about nurse and prescriber coverage overnight and at weekends, and the staff-to-patient ratio actually on shift.",
  },
  "outpatient-rehab-near-me": {
    whatItIs: "Scheduled treatment while living at home, ranging from weekly sessions to intensive multi-day programming.",
    keyPoint: "Outpatient care works when the home environment is stable and withdrawal is not medically risky. It is a clinical judgement about safety and support, not a budget compromise.",
    verify: "Ask the weekly hour commitment, whether sessions are group or individual, and whether evening or weekend scheduling exists.",
  },
  "iop-near-me": {
    whatItIs: "Intensive outpatient programming — typically 9 to 15 hours a week of group and individual therapy alongside work or school.",
    keyPoint: "IOP is the step-down level between partial hospitalization and standard outpatient care. Its defining feature is that clinical intensity continues while the person resumes ordinary responsibilities.",
    verify: "Ask the exact weekly hours, the group size, and whether the schedule can accommodate your work pattern before enrolling.",
  },
  "php-near-me": {
    whatItIs: "Partial hospitalization — day treatment, usually five to six days a week, returning home in the evenings.",
    keyPoint: "PHP delivers close to residential clinical intensity without the overnight stay, which makes it the usual step-down after inpatient care and the usual step-up when outpatient care is not holding.",
    verify: "Ask the daily hours, whether medical staff are on site, and how transport and meals are handled.",
  },
  "dual-diagnosis-near-me": {
    whatItIs: "Integrated treatment for a substance use disorder alongside a co-occurring mental health condition such as depression, PTSD, bipolar disorder or an anxiety disorder.",
    keyPoint: "Treating one condition and not the other predicts relapse in both. Integrated care means the same clinical team treats both concurrently, rather than sequencing them or referring the psychiatric side elsewhere.",
    verify: "Ask whether a psychiatrist or psychiatric nurse practitioner is on staff, and whether psychiatric medication is managed on site.",
  },

  // ── Cost and access ────────────────────────────────────────────────
  "free-rehab-near-me": {
    whatItIs: "Treatment at no cost to the patient, funded through state block grants, non-profits, or federally qualified health centres.",
    keyPoint: "Free programs are usually funded rather than charitable, which means eligibility criteria and waiting lists are the norm. State substance abuse authorities and SAMHSA's national helpline (1-800-662-4357) are the routes to what is actually available.",
    verify: "Ask about eligibility, current wait time, and whether the wait can be shortened by accepting a different level of care first.",
  },
  "affordable-rehab-near-me": {
    whatItIs: "Programs priced for self-pay or offering sliding-scale fees based on income.",
    keyPoint: "Sliding scale means the fee is set from documented income, so what you pay depends on paperwork you will need to produce. That is a different process from a published self-pay rate.",
    verify: "Ask what documentation the sliding scale requires and what the fee range actually spans before assuming affordability.",
  },
  "low-cost-rehab-near-me": {
    whatItIs: "Lower-cost treatment options including public programs, non-profits and reduced-fee private providers.",
    keyPoint: "Cost differences between programs at the same level of care often reflect amenities and staffing ratios rather than clinical method. The evidence-based therapies themselves are not proprietary.",
    verify: "Compare what clinical hours you receive per week, not the headline price — that is where genuine differences appear.",
  },
  "luxury-rehab-near-me": {
    whatItIs: "Private residential treatment with elevated accommodation, amenities and privacy.",
    keyPoint: "Luxury describes the setting, not the clinical model. The therapies delivered are generally the same evidence-based approaches used at any accredited program; what differs is accommodation, privacy and staffing ratio.",
    verify: "Ask which clinical credentials the treating staff hold, and separate that answer from the amenities tour.",
  },
  "executive-rehab-near-me": {
    whatItIs: "Programs structured for working professionals, typically preserving limited remote work access and privacy.",
    keyPoint: "Executive is a scheduling and privacy category rather than a clinical one. The trade-off worth examining is how much work access is permitted, since it directly reduces treatment engagement.",
    verify: "Ask exactly how many hours of work access are allowed and whether that reduces your clinical programming.",
  },

  // ── Setting ────────────────────────────────────────────────────────
  "sober-living-near-me": {
    whatItIs: "Structured drug- and alcohol-free housing for people in recovery — a recovery residence, not a treatment program.",
    keyPoint: "Sober living homes generally provide no clinical services. They provide housing, structure and accountability, usually alongside outpatient treatment delivered elsewhere. Licensure and standards vary widely by state.",
    verify: "Ask whether the residence is certified by a state or national recovery-residence body, and what the house rules and discharge policies are in writing.",
  },
  "faith-based-rehab-near-me": {
    whatItIs: "Treatment integrating spiritual practice with recovery programming.",
    keyPoint: "Faith-based programs range from licensed clinical facilities that add a spiritual component to non-clinical ministries with no licensed staff. Those are very different services under one label.",
    verify: "Ask directly whether the program is state-licensed and whether clinical staff hold professional credentials.",
  },
  "christian-rehab-near-me": {
    whatItIs: "Recovery programming grounded in Christian teaching, ranging from licensed clinical care to discipleship-based residential programs.",
    keyPoint: "The licensing question matters most here. A discipleship program and a licensed treatment centre may both describe themselves as Christian rehab while offering entirely different levels of clinical oversight.",
    verify: "Ask whether the program is licensed by the state and whether medical detox is available or referred out.",
  },
  "holistic-rehab-near-me": {
    whatItIs: "Treatment combining conventional clinical therapy with complementary practices such as mindfulness, yoga, acupuncture or nutrition work.",
    keyPoint: "Holistic approaches are adjuncts. They are best evaluated by whether the underlying evidence-based clinical care — therapy, medication where indicated, medical supervision — is fully present alongside them.",
    verify: "Ask what the core clinical programming is, and treat complementary practices as additions rather than substitutions.",
  },

  // ── Populations ────────────────────────────────────────────────────
  "womens-rehab-near-me": {
    whatItIs: "Gender-specific treatment for women, often incorporating trauma-informed care and family or childcare considerations.",
    keyPoint: "Women-specific programs frequently exist because trauma histories and caregiving responsibilities shape both the clinical need and the practical barriers to attending treatment at all.",
    verify: "Ask about childcare arrangements, family visitation, and whether trauma-specific therapies are delivered by trained clinicians.",
  },
  "mens-rehab-near-me": {
    whatItIs: "Gender-specific treatment for men, typically emphasising peer accountability in group work.",
    keyPoint: "The clinical argument for gender-separate programming is reduced distraction and franker disclosure in group therapy, particularly around trauma and relationships.",
    verify: "Ask whether groups are genuinely gender-separate throughout, or only for residential accommodation.",
  },
  "teen-rehab-near-me": {
    whatItIs: "Adolescent treatment, usually including family therapy and continued schooling.",
    keyPoint: "Adolescent treatment is a separate licensure category in most states and cannot be delivered by mixing minors into adult programming. Family involvement is a clinical component, not a courtesy.",
    verify: "Confirm the program is licensed for adolescents, and ask how schooling and family sessions are structured.",
  },
  "young-adult-rehab-near-me": {
    whatItIs: "Programming for roughly the 18-to-25 age group, addressing education, early career and peer environment.",
    keyPoint: "This age group is treated separately because the recovery environment being returned to — campus, first job, peer group — is a live clinical variable rather than background.",
    verify: "Ask how the program handles a return to campus or work, and whether that plan is built before discharge.",
  },
  "veterans-rehab-near-me": {
    whatItIs: "Treatment for veterans, frequently addressing PTSD, chronic pain and military sexual trauma alongside substance use.",
    keyPoint: "Veterans have coverage routes civilians do not — VA facilities, VA community care referrals, and TRICARE for those eligible. Which route applies changes both where you can be treated and who authorizes it.",
    verify: "Establish your eligibility route first, then ask whether the program treats combat trauma with clinicians trained in it.",
  },
  "lgbtq-rehab-near-me": {
    whatItIs: "Affirming treatment for LGBTQ+ people, addressing minority stress, identity and family rejection alongside substance use.",
    keyPoint: "Affirming care is a staff-training and policy question, not a marketing label. Rooming policy, name and pronoun practice, and clinician training are what distinguish a genuinely affirming program.",
    verify: "Ask what specific training clinical staff have completed and what the written rooming and non-discrimination policies say.",
  },
  "seniors-rehab-near-me": {
    whatItIs: "Treatment adapted for older adults, accounting for polypharmacy, chronic illness and slower physiological withdrawal.",
    keyPoint: "Withdrawal is medically riskier in older adults, and interactions with existing prescriptions are the central clinical concern. Alcohol and prescribed benzodiazepines are the most common presentations in this group.",
    verify: "Ask whether medical staff review the full prescription list on admission and whether medical comorbidity is managed on site.",
  },
  "first-responder-rehab-near-me": {
    whatItIs: "Programs for police, fire, EMS and dispatch personnel, usually addressing cumulative occupational trauma.",
    keyPoint: "Confidentiality and fitness-for-duty reporting are the practical barriers for this group, and how a program handles them affects whether someone enters treatment at all.",
    verify: "Ask in writing what is reported to an employer or licensing body, and what is not.",
  },
  "couples-rehab-near-me": {
    whatItIs: "Treatment admitting partners together, combining individual clinical care with couples therapy.",
    keyPoint: "Couples programming is contraindicated where intimate partner violence is present, and reputable programs screen for it before admitting a couple.",
    verify: "Ask whether partners receive separate individual therapy as well as joint sessions, and how the program screens for coercion.",
  },

  // ── Substance-specific ─────────────────────────────────────────────
  "opioid-rehab-near-me": {
    whatItIs: "Treatment for opioid use disorder, commonly combining medication with counselling.",
    keyPoint: "Medication for opioid use disorder — buprenorphine, methadone or naltrexone — is the evidence-based standard of care and substantially reduces overdose death. A program that declines to offer or refer for it is departing from that standard.",
    verify: "Ask which medications are offered on site, and if none, who they refer to and how quickly.",
  },
  "heroin-rehab-near-me": {
    whatItIs: "Treatment for heroin dependence, typically starting with withdrawal management and continuing with medication and therapy.",
    keyPoint: "Much of the illicit supply now contains fentanyl, which changes withdrawal timing and induction planning even when someone believes they are using heroin alone.",
    verify: "Ask whether the program tests for fentanyl on intake and how that affects the induction plan.",
  },
  "fentanyl-rehab-near-me": {
    whatItIs: "Treatment for fentanyl dependence, involving withdrawal management and medication for opioid use disorder.",
    keyPoint: "Fentanyl's potency and its storage in body fat change the clinical picture: withdrawal can be prolonged and buprenorphine induction may need a modified approach to avoid precipitated withdrawal. Naloxone access matters for anyone in this group.",
    verify: "Ask specifically how the program handles buprenorphine induction for fentanyl, since standard protocols may not transfer.",
  },
  "meth-rehab-near-me": {
    whatItIs: "Treatment for methamphetamine use disorder, delivered through behavioural therapies.",
    keyPoint: "There is no FDA-approved medication for stimulant use disorder. Contingency management and cognitive behavioural therapy carry the strongest evidence, and a program's answer about which behavioural methods it uses is therefore the substantive question.",
    verify: "Ask whether contingency management is offered, and how the program manages the prolonged low mood common in early stimulant recovery.",
  },
  "cocaine-rehab-near-me": {
    whatItIs: "Treatment for cocaine use disorder, based on behavioural therapy rather than medication.",
    keyPoint: "As with other stimulants, no medication is FDA-approved for the disorder itself. Withdrawal is not usually medically dangerous, which shifts the clinical focus toward relapse prevention and craving management.",
    verify: "Ask what the relapse-prevention model is and how long structured support continues after the intensive phase.",
  },
  "prescription-drug-rehab-near-me": {
    whatItIs: "Treatment for dependence on prescribed medications — most often opioid analgesics, benzodiazepines or stimulants.",
    keyPoint: "The medication class determines everything. Opioid analgesic dependence has medication treatment; benzodiazepine dependence requires a careful supervised taper; prescribed stimulants are handled differently again.",
    verify: "Ask whether the program coordinates with your prescriber, and whether tapering is supervised medically.",
  },
  "benzo-rehab-near-me": {
    whatItIs: "Treatment for benzodiazepine dependence, centred on a medically supervised taper.",
    keyPoint: "Abrupt benzodiazepine cessation can cause seizures and can be fatal. Withdrawal is managed by gradual tapering under medical supervision, and a program that proposes rapid discontinuation is not following standard practice.",
    verify: "Ask who supervises the taper, over what expected timeframe, and what happens if symptoms worsen.",
  },
  "xanax-rehab-near-me": {
    whatItIs: "Treatment for alprazolam dependence, a benzodiazepine, managed by supervised taper.",
    keyPoint: "Alprazolam is short-acting, so withdrawal can begin quickly and feel sharper between doses. Clinicians often cross-taper to a longer-acting benzodiazepine to make the taper tolerable — a specific clinical decision worth asking about.",
    verify: "Ask whether the program cross-tapers and who monitors the schedule.",
  },
  "kratom-rehab-near-me": {
    whatItIs: "Treatment for kratom dependence, which presents similarly to mild-to-moderate opioid withdrawal.",
    keyPoint: "Kratom is not an FDA-approved treatment for anything and its products are not consistently regulated, so potency varies between batches. Withdrawal is generally managed with supportive care and sometimes buprenorphine.",
    verify: "Ask whether the program has treated kratom dependence before and what its withdrawal protocol is.",
  },
  "marijuana-rehab-near-me": {
    whatItIs: "Treatment for cannabis use disorder, delivered through behavioural therapy.",
    keyPoint: "Cannabis withdrawal is real — irritability, sleep disruption, appetite change — but not medically dangerous. Treatment is outpatient in most cases, and higher-potency concentrates have made presentations more severe than they once were.",
    verify: "Ask whether the program treats cannabis use disorder specifically rather than folding it into general programming.",
  },

  // ── Medication-assisted treatment ──────────────────────────────────
  "mat-clinic-near-me": {
    whatItIs: "Clinics providing medication for opioid or alcohol use disorder alongside counselling.",
    keyPoint: "MAT is not substituting one addiction for another — a persistent misconception. Buprenorphine, methadone and naltrexone are prescribed at stable doses that do not produce intoxication and measurably reduce overdose death.",
    verify: "Ask which medications the clinic offers, since availability differs sharply between buprenorphine and methadone.",
  },
  "suboxone-clinic-near-me": {
    whatItIs: "Clinics prescribing buprenorphine-naloxone for opioid use disorder.",
    keyPoint: "Buprenorphine can be prescribed in ordinary office-based settings, and the federal waiver that once restricted which clinicians could prescribe it was eliminated in 2023 — so access is far wider than it was, including via telehealth in many states.",
    verify: "Ask about induction — whether it is done in office or at home — and how prescriptions continue between appointments.",
  },
  "methadone-clinic-near-me": {
    whatItIs: "Federally certified opioid treatment programs dispensing methadone for opioid use disorder.",
    keyPoint: "Methadone for opioid use disorder can only be dispensed through a federally certified opioid treatment program, not by an ordinary prescriber. That regulatory fact is why daily on-site dosing is typical at the start and why clinic location genuinely constrains who can use this treatment.",
    verify: "Ask about dosing hours, how long until take-home doses are possible, and what the transport options are.",
  },

  // ── Timing and urgency ─────────────────────────────────────────────
  "emergency-rehab-near-me": {
    whatItIs: "Urgent access to withdrawal management or crisis stabilization.",
    keyPoint: "A medical emergency is not a rehab admission. Overdose, seizure, chest pain or confusion during withdrawal are 911 situations; crisis lines and the 988 Suicide and Crisis Lifeline handle psychiatric crisis. Rehab admission follows stabilization.",
    verify: "If someone is in immediate danger, call 911. For crisis support, 988 is available 24 hours.",
  },
  "same-day-rehab-near-me": {
    whatItIs: "Programs able to assess and admit on the day of contact.",
    keyPoint: "Same-day admission usually depends on bed availability and insurance authorization completing quickly, both of which vary daily. Calling directly is more reliable than any published availability.",
    verify: "Ask what has to be in place for a same-day admission and what documentation to bring.",
  },
  "24-7-detox-near-me": {
    whatItIs: "Withdrawal management with round-the-clock clinical staffing.",
    keyPoint: "Overnight coverage varies more than people expect. There is a real difference between a nurse on site continuously and an on-call clinician reachable by phone, and it matters most in the hours when alcohol and benzodiazepine withdrawal escalate.",
    verify: "Ask specifically who is physically on site overnight and what their credentials are.",
  },
  "immediate-rehab-near-me": {
    whatItIs: "Programs with current openings and expedited intake.",
    keyPoint: "Waiting lists are common at the residential level and less common in outpatient care, so accepting a different level of care first is often the fastest route into any treatment at all.",
    verify: "Ask what is available today at each level of care, not only at the level you first asked about.",
  },

  // ── Duration ───────────────────────────────────────────────────────
  "30-day-rehab-near-me": {
    whatItIs: "Residential programming over roughly 30 days.",
    keyPoint: "Thirty days is a convention shaped substantially by insurance authorization patterns rather than by a clinical threshold. Longer engagement is associated with better outcomes, which is why the step-down plan matters more than the residential length.",
    verify: "Ask what happens on day 31 — the outpatient or sober-living plan is the part that carries the result.",
  },
  "60-day-rehab-near-me": {
    whatItIs: "Residential programming over roughly 60 days.",
    keyPoint: "The additional month is generally used to consolidate coping skills and address co-occurring conditions that a shorter stay only begins to reach.",
    verify: "Ask how the second month's programming differs from the first, and how continued authorization is handled.",
  },
  "90-day-rehab-near-me": {
    whatItIs: "Residential programming over roughly 90 days.",
    keyPoint: "Longer treatment episodes are associated with better sustained outcomes in the research literature, though 90 days rarely comes as a single insurance authorization — it is usually assembled across levels of care.",
    verify: "Ask how the 90 days is structured across levels and how the funding is sequenced.",
  },
  "long-term-rehab-near-me": {
    whatItIs: "Extended residential or therapeutic-community programming, typically beyond 90 days.",
    keyPoint: "Long-term programs suit people with repeated relapse, unstable housing or significant co-occurring conditions, and are frequently funded differently from short-term residential care.",
    verify: "Ask how the program is funded beyond the point where insurance authorization typically ends.",
  },
  "short-term-rehab-near-me": {
    whatItIs: "Brief residential or intensive programming, generally under 30 days.",
    keyPoint: "Short-term residential care functions as stabilization. Its results depend almost entirely on what follows it, because behaviour change is not consolidated in that window.",
    verify: "Ask what the aftercare plan is and who is responsible for arranging it before discharge.",
  },

  // ── Coverage routes ────────────────────────────────────────────────
  "medicaid-rehab-near-me": {
    whatItIs: "Programs accepting Medicaid for addiction treatment.",
    keyPoint: "Medicaid is administered state by state, so covered levels of care, provider networks and eligibility all differ by state — including whether the state expanded eligibility under the ACA.",
    verify: "Confirm with your state Medicaid agency or managed-care plan which levels of care are covered before admission.",
  },
  "medicare-rehab-near-me": {
    whatItIs: "Programs accepting Medicare for addiction treatment.",
    keyPoint: "Medicare splits the benefit: Part A covers inpatient stays under benefit periods, Part B covers outpatient care and medication-assisted treatment. Which part applies follows the level of care, and Medicare Advantage plans add their own authorization rules.",
    verify: "Establish whether you have Original Medicare or Medicare Advantage first — the rules differ substantially.",
  },
  "tricare-rehab-near-me": {
    whatItIs: "Programs accepting TRICARE for military members, retirees and families.",
    keyPoint: "TRICARE is administered by regional contractors, and referral and authorization requirements differ sharply between Prime and Select as well as by beneficiary category.",
    verify: "Contact your regional contractor to confirm plan type and referral requirements before admission.",
  },
  "blue-cross-rehab-near-me": {
    whatItIs: "Programs accepting Blue Cross Blue Shield plans.",
    keyPoint: "Blue Cross Blue Shield is a federation of independent local companies rather than one insurer, so benefits are set by your local plan. The BlueCard program is what allows care outside your home plan's area to process at in-network rates.",
    verify: "Identify your local plan from the prefix on your member ID and call that plan's behavioral health line.",
  },
  "aetna-rehab-near-me": {
    whatItIs: "Programs accepting Aetna plans.",
    keyPoint: "Aetna administers behavioral health through its own unit rather than an external carve-out, so medical and behavioral authorizations run through the same member number.",
    verify: "Call the member services number on your card and ask for behavioral health.",
  },
  "cigna-rehab-near-me": {
    whatItIs: "Programs accepting Cigna plans.",
    keyPoint: "Cigna's substance-use benefit is administered by Evernorth, its health-services arm, so the behavioral health line is the right first call rather than general medical customer service.",
    verify: "Use the behavioral health number on your Cigna card, which routes to Evernorth.",
  },
  "united-healthcare-rehab-near-me": {
    whatItIs: "Programs accepting UnitedHealthcare plans.",
    keyPoint: "UnitedHealthcare carves behavioral health out to Optum, which maintains a separate network. A facility in-network medically is not automatically in-network for Optum.",
    verify: "Search Optum's behavioral health directory rather than the general medical directory.",
  },
  "humana-rehab-near-me": {
    whatItIs: "Programs accepting Humana plans.",
    keyPoint: "A large share of Humana's membership is Medicare Advantage, so coverage frequently follows Medicare's benefit structure and its medical-necessity review rather than commercial plan rules.",
    verify: "Confirm whether your plan is Medicare Advantage or commercial before checking benefits.",
  },

  // ── Legal ──────────────────────────────────────────────────────────
  "court-ordered-rehab-near-me": {
    whatItIs: "Treatment completed to satisfy a court requirement, including DUI and drug-court programs.",
    keyPoint: "Court-mandated treatment requires the program to provide documentation the court will accept, and not every program does this routinely. Confirming the reporting format before admission avoids completing treatment that does not satisfy the order.",
    verify: "Give the program your court paperwork before admission and confirm in writing that it can report in the required format.",
  },
};

/** Profile for a near-me slug, or null when the slug has none. */
export function nearMeTopic(slug) {
  if (!slug) return null;
  return NEAR_ME_TOPICS[slug] ?? null;
}

/** Slugs with a profile — used by the coverage test. */
export function profiledNearMeSlugs() {
  return Object.keys(NEAR_ME_TOPICS);
}

/**
 * Compose a near-me page from the topic axis plus place facts.
 *
 * The topic is what makes a methadone-clinic page differ from a
 * sober-living page; the state and place facts are what make two
 * methadone-clinic pages differ from each other. Both are required —
 * either alone leaves a family of near-identical pages.
 *
 * @param {object} input
 * @param {string} input.topicSlug
 * @param {string} input.topicLabel
 * @param {string} input.stateName
 * @param {object} [input.stats]      getStateStatsBySlug
 * @param {object} [input.licensing]  getStateLicensing
 * @param {string} [input.placeName]  city or "X County", when scoped below state
 * @param {string} [input.countySeat]
 * @param {number} [input.placePopulation]
 * @param {string[]} [input.majorCities]
 */
export function buildNearMeContent(input) {
  const { topicSlug, topicLabel, stateName, stats, licensing, placeName, countySeat, placePopulation, majorCities } =
    input;

  const topic = nearMeTopic(topicSlug);
  const label = topicLabel || "treatment";
  const scope = placeName ? `${placeName}, ${stateName}` : stateName;
  const sections = [];

  const intro = topic
    ? `${topic.whatItIs} This page covers what to look for when choosing a ${label.toLowerCase()} program in ${scope}, and what ${stateName} adds to that picture.`
    : `This page covers ${label.toLowerCase()} options in ${scope} and what to verify before choosing a program.`;

  if (topic) {
    sections.push({
      heading: `What matters most with ${label.toLowerCase()}`,
      body: `${topic.keyPoint}`,
    });
    sections.push({
      heading: `Choosing a program in ${scope}`,
      body: `${topic.verify} ${UNIVERSAL_VERIFY}`,
    });
  }

  // Place axis — what is actually available where, from real data.
  const placeBits = [];
  if (stats?.samhsaFacilities && stats?.populationMillions) {
    const density = Math.round((stats.samhsaFacilities / (stats.populationMillions * 10)) * 10) / 10;
    placeBits.push(
      `${stateName} has ${stats.samhsaFacilities.toLocaleString()} SAMHSA-listed treatment facilities, about ${density} per 100,000 residents.`,
    );
  }
  if (stats?.primaryMetro) {
    placeBits.push(
      `Capacity concentrates in ${stats.primaryMetro}${stats?.secondaryMetros?.length ? ` and ${stats.secondaryMetros.slice(0, 3).join(", ")}` : ""}, so availability outside those areas is thinner — which matters most for services that require daily attendance.`,
    );
  }
  if (placeName && countySeat) {
    placeBits.push(`Within ${placeName}, higher levels of care are usually concentrated around ${countySeat}.`);
  }
  if (placeName && typeof placePopulation === "number" && placePopulation > 0) {
    placeBits.push(`${placeName} has about ${placePopulation.toLocaleString()} residents.`);
  }
  if (placeName && majorCities?.length) {
    placeBits.push(`Programs serving the area also draw from ${majorCities.slice(0, 4).join(", ")}.`);
  }
  if (typeof stats?.medicaidExpanded === "boolean") {
    placeBits.push(
      stats.medicaidExpanded
        ? `${stateName} expanded Medicaid under the ACA, which widens publicly funded options.`
        : `${stateName} has not expanded Medicaid under the ACA, so publicly funded options are narrower and state-funded and non-profit programs carry more of the load.`,
    );
  }
  if (placeBits.length) {
    sections.push({ heading: `Availability in ${scope}`, body: placeBits.join(" ") });
  }

  if (licensing?.regulatoryBody) {
    sections.push({
      heading: `Licensing in ${stateName}`,
      body:
        `Programs are licensed by ${licensing.regulatoryBody}${licensing.regulatoryAbbr ? ` (${licensing.regulatoryAbbr})` : ""}. ` +
        `Licensure category determines which levels of care a site may provide, so verifying it confirms that a program can legally deliver what it advertises.`,
    });
  }

  const faqs = [
    {
      question: `What should I check before choosing ${label.toLowerCase()} in ${scope}?`,
      answer: topic ? `${topic.verify} ${UNIVERSAL_VERIFY}` : UNIVERSAL_VERIFY,
    },
    {
      question: `Is ${label.toLowerCase()} widely available in ${stateName}?`,
      answer:
        stats?.primaryMetro
          ? `Capacity is concentrated around ${stats.primaryMetro}${stats?.secondaryMetros?.length ? ` and ${stats.secondaryMetros.slice(0, 3).join(", ")}` : ""}. Outside those areas, availability thins — which matters most for programs requiring daily attendance.`
          : `Availability varies by metro. Confirm directly with programs in your area.`,
    },
  ];

  const metaDescription = topic
    ? `${label} in ${scope}: ${topic.whatItIs} What to verify before choosing a program, and how availability looks across ${stateName}.`
    : `${label} in ${scope} — what to verify before choosing a program.`;

  return { metaDescription, intro, sections, faqs };
}
