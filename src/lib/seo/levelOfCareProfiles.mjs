/**
 * Operator-facing facts about each level of care.
 *
 * WHY
 *
 * The /rehab-marketing county pages publish fourteen variants per county
 * — eight levels of care and six payers. Before this module, the level
 * was substituted into headings and nothing else, so all fourteen pages
 * in a county were the same page with a different word in the title.
 * That is 419 counties × 8 levels of copy saying nothing about the level.
 *
 * The differences are real and they are exactly what an operator is
 * researching. A withdrawal-management unit and a recovery residence
 * differ in license category, staffing floor, length of stay, how
 * revenue arrives, and which regulator has jurisdiction. Setting that
 * out is more useful than the market-density paragraph these pages
 * already shared.
 *
 * WHAT IS AND IS NOT ASSERTED
 *
 * These are structural facts about how a level of care is regulated and
 * staffed in the United States generally — the kind of thing that is
 * true across states even though the specifics are not. Anything that
 * varies state by state (actual license names, staffing ratios, rates)
 * is deferred to the state regulator, which the page already names from
 * stateLicensingData. No rates, no margins, no occupancy promises: those
 * are per-contract facts nobody can publish generically, and a page that
 * invented them would be worse than one that stays quiet.
 *
 * ASAM level references are to the ASAM Criteria's published level
 * numbering, which is the vocabulary payers and regulators use.
 */

/**
 * @typedef {object} LevelOfCareProfile
 * @property {string} label          display name
 * @property {string} asam           ASAM level, or a note that it is not one
 * @property {string} licensure      what kind of authorization the level needs
 * @property {string} staffing       the staffing floor that drives fixed cost
 * @property {string} stay           length of stay and what it does to census
 * @property {string} revenue        how money actually arrives for this level
 * @property {string} constraint     the operational fact operators most often miss
 */

/** @type {Record<string, LevelOfCareProfile>} */
export const LEVEL_OF_CARE_PROFILES = {
  detox: {
    label: "Withdrawal management",
    asam: "ASAM Level 3.7-WM or 4-WM depending on medical acuity",
    licensure: "a residential or hospital-based license with an explicit withdrawal-management scope; the general residential license is usually not sufficient on its own",
    staffing: "24-hour nursing with physician oversight, which sets the highest fixed staffing cost of any non-hospital level",
    stay: "days rather than weeks, so beds turn over fast and the program lives or dies on a continuous admissions pipeline rather than on retention",
    revenue: "per-diem, authorized in short increments with frequent concurrent review — the shortest authorization windows in the continuum",
    constraint: "withdrawal management is stabilization, not treatment, so a unit without a reliable step-down destination discharges patients into relapse and loses the downstream episode as well",
  },
  residential: {
    label: "Residential treatment",
    asam: "ASAM Levels 3.1 through 3.5, which differ substantially in required clinical intensity",
    licensure: "a state residential treatment license, with the sub-level determining how much clinical service must be delivered on site",
    staffing: "24-hour supervision, with clinical staffing scaling by sub-level — 3.1 is a supported-living model, 3.5 is clinically managed high intensity",
    stay: "weeks, so occupancy rather than throughput drives the economics and a mid-week discharge is hard to backfill",
    revenue: "per-diem under medical-necessity authorization, with concurrent review deciding how long the episode actually runs",
    constraint: "the sub-level a program is licensed and staffed for has to match what it bills; residential denials cluster on documentation that describes a lower level of care than the one billed",
  },
  php: {
    label: "Partial hospitalization",
    asam: "ASAM Level 2.5",
    licensure: "usually an outpatient license carrying a partial-hospitalization or day-treatment designation rather than a separate license class",
    staffing: "a full clinical team during program hours with prescriber availability, but no overnight staffing — the cost structure sits between residential and IOP",
    stay: "several weeks at roughly twenty hours a week, so census is a scheduling problem rather than a bed problem",
    revenue: "per-diem or per-session depending on payer, authorized against medical-necessity criteria that assume the patient has stable housing",
    constraint: "PHP assumes the patient goes home at night, so a program drawing from outside its immediate area needs a housing answer or it will lose those admissions to residential",
  },
  iop: {
    label: "Intensive outpatient",
    asam: "ASAM Level 2.1",
    licensure: "a standard outpatient treatment license in most states, which makes it the lowest regulatory barrier of the clinical levels",
    staffing: "group-based clinical staffing, so margin depends heavily on how full each cohort runs",
    stay: "typically nine or more hours a week over a couple of months, attended rather than admitted",
    revenue: "per-session or per-week billing, generally with longer authorization windows and lighter concurrent review than bed-based levels",
    constraint: "cohorts start on a schedule, so a referral that arrives the day after a cohort opens waits — the gap between inquiry and start date is where IOP admissions are most often lost",
  },
  "sober-living": {
    label: "Recovery residence",
    asam: "not an ASAM level of care — it is housing, not treatment",
    licensure: "frequently not a clinical license at all; many states use voluntary certification through a NARR affiliate, and some now regulate residences directly",
    staffing: "house management rather than clinical staffing, which is why the cost base differs by an order of magnitude from any clinical level",
    stay: "months, with residents usually attending treatment elsewhere",
    revenue: "resident fees rather than insurance billing — billing a payer for the residence itself is where recovery-residence operators most often run into trouble",
    constraint: "the binding legal issues are zoning and fair housing rather than health licensure, and providing clinical services on site can pull a residence into a licensure category it was not built for",
  },
  mat: {
    label: "Medication-assisted treatment",
    asam: "spans the continuum — MAT is a medication strategy delivered at several levels, not a level itself",
    licensure: "splits sharply by medication: methadone requires SAMHSA certification as an opioid treatment program plus DEA registration and state authority, while buprenorphine can be prescribed office-based",
    staffing: "an OTP requires on-site dispensing, diversion control and counseling capacity; an office-based program can run on a prescriber and care coordination",
    stay: "open-ended by design, because retention is the outcome that matters most in opioid use disorder",
    revenue: "bundled or per-visit depending on payer and model, with OTP bundles common in Medicaid",
    constraint: "the OTP and office-based routes are different businesses with different capital requirements and different regulators; deciding which one a program is entering is the first decision, not a detail",
  },
  "dual-diagnosis": {
    label: "Co-occurring disorder treatment",
    asam: "delivered across levels, with the ASAM criteria's co-occurring-capable and co-occurring-enhanced designations describing how much psychiatric capability a program actually carries",
    licensure: "often requires mental-health scope in addition to substance-use scope, which in many states means a second license or an added service category",
    staffing: "psychiatric prescriber access plus licensed mental-health clinicians, not only substance-use counselors",
    stay: "longer than the equivalent single-diagnosis episode, because two conditions are being stabilized",
    revenue: "generally billed at the underlying level of care, though psychiatric services may bill separately depending on payer",
    constraint: "programs routinely advertise dual-diagnosis capability while being co-occurring-capable at best; the honest question is which of the two designations the staffing actually supports",
  },
  luxury: {
    label: "Private-pay and amenity-led programs",
    asam: "not a clinical category — an amenity and payer-mix position layered on residential or outpatient care",
    licensure: "exactly the same licensure as the clinical level being delivered; there is no separate luxury license and no regulator recognises the term",
    staffing: "the clinical level's staffing floor plus hospitality and ancillary staff, which is where the cost difference actually sits",
    stay: "set by the clinical level, though private-pay episodes are less constrained by concurrent review",
    revenue: "predominantly self-pay or out-of-network, which trades authorization risk for collection risk and a much smaller addressable population",
    constraint: "positioning as luxury changes the marketing and the cost base but not the regulatory obligations, and out-of-network economics depend on payer behaviour a program does not control",
  },
};

export function levelOfCareProfile(slug) {
  return LEVEL_OF_CARE_PROFILES[String(slug ?? "").toLowerCase()] ?? null;
}

/** Slugs that look like a level of care in a URL but are payers. They
 *  belong to the insurer profiles, not here — routing them through the
 *  level lookup would silently produce a generic page. */
export const PAYER_SLUGS = new Set([
  "medicaid",
  "medicare",
  "aetna",
  "blue-cross",
  "cigna",
  "united-healthcare",
  "humana",
  "tricare",
]);
