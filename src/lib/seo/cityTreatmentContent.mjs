/**
 * Composes the city-specific half of a `<treatment>-in-<city>` page.
 *
 * The state-keyed blocks these pages already carry (fact box, licensing,
 * insurance directory) are good content and stay. What was missing is
 * anything keyed on the CITY, which is why two cities in one state
 * rendered the same page. This composer supplies that half.
 *
 * The differentiating axes, in order of how much they separate:
 *
 *   county name / seat / peer cities  — words no other county's pages
 *                                       carry (234 of 288 top cities)
 *   size peers                        — available for every listed city
 *   population band × care setting    — 24 distinct pieces of guidance
 *   metro role                        — primary / secondary / neither
 *
 * The band × care-setting guidance is the part that is actually useful
 * to a reader rather than merely distinct. "Is there detox in a city of
 * 40,000?" and "is there IOP in a city of 40,000?" have different real
 * answers, and both differ from the answer in a city of 900,000. That
 * is what these paragraphs say.
 *
 * WHAT THIS FILE MAY NOT SAY
 *
 * - No distances, no "nearest", no "close by". This codebase holds no
 *   coordinates; Phase 2 removed proximity language from every surface
 *   and it must not re-enter through content. Size peers are described
 *   as comparable in SIZE, which is what they are.
 * - No claim that a specific provider exists in a specific city. Only
 *   the facility count the caller passes in is stated, and only when
 *   the caller actually has one.
 * - No prices, no outcome rates, no guarantees. Same constraints the
 *   other composers are held to, asserted in composedContent.test.ts.
 */

/**
 * Care setting drives what "local" means. A daily methadone dose and a
 * 30-day residential bed impose completely different geography on a
 * patient, and that is the honest reason these pages differ.
 */
import { sentenceLabel } from "./textCase.mjs";

export const CARE_SETTINGS = {
  detox: ["detox", "detox-centers"],
  bed: [
    "inpatient-rehab", "luxury-rehab", "sober-living", "long-term-rehab",
    "short-term-rehab", "30-day-rehab", "60-day-rehab", "90-day-rehab",
    "executive-rehab", "holistic-rehab", "christian-rehab", "faith-based-rehab",
    "couples-rehab", "teen-rehab", "womens-rehab", "mens-rehab", "veterans-rehab",
    "lgbtq-rehab", "young-adult-rehab", "seniors-rehab", "first-responder-rehab",
  ],
  visit: ["outpatient-rehab", "iop", "php"],
  dosing: ["mat-clinic", "suboxone-clinic", "methadone-clinic"],
  urgent: ["emergency-rehab", "same-day-rehab"],
};

const SETTING_BY_SLUG = (() => {
  const m = new Map();
  for (const [setting, slugs] of Object.entries(CARE_SETTINGS)) {
    for (const s of slugs) m.set(s, setting);
  }
  return m;
})();

/** `alcohol-rehab-in-` / `alcohol-rehab` → the care setting, defaulting
 *  to the honest "mixed" rather than guessing a level of care. */
export function careSettingFor(prefixOrSlug) {
  const slug = String(prefixOrSlug ?? "").replace(/^\//, "").replace(/-in-?$/, "");
  return SETTING_BY_SLUG.get(slug) ?? "mixed";
}

/**
 * What a market of this size typically supports, per care setting.
 * Hedged deliberately — these are statements about how services of a
 * given type tend to be distributed, not claims about any provider.
 */
const GUIDANCE = {
  detox: {
    unknown: "Medically supervised withdrawal needs 24-hour clinical staffing, which makes it the least evenly distributed level of care anywhere — it clusters around hospital systems rather than spreading across every community. Ask whether a program admits people from outside its immediate service area, and whether it can bridge you clinically if the bed you need is not free today.",
    major: "Medically supervised withdrawal is bed-based and staffed around the clock, so it clusters where hospital systems already are. A market this size usually supports more than one detox provider, which in practice means the question is admission timing and insurance authorization rather than whether a bed exists at all. Ask what the wait looks like today, not in general.",
    large: "Withdrawal management needs 24-hour clinical staffing, so it concentrates in hospital-anchored markets. A city this size commonly has at least one detox provider, sometimes attached to a hospital rather than a standalone rehab. If the first call has no bed, ask whether they hold a waitlist and whether they can bridge you clinically until one opens.",
    midsize: "Detox is the most staffing-intensive level of care and the least evenly distributed. In a market this size it may run through a hospital's behavioral-health unit rather than a dedicated center, and capacity can be a handful of beds. Ask directly whether the program admits people from outside its immediate service area.",
    small: "Standalone detox is uncommon in smaller markets because 24-hour clinical cover is expensive to staff. Withdrawal management here is more often handled through a hospital emergency department or a regional provider that draws from a wide area. Plan for the possibility of travelling for this step even if later care is available locally.",
  },
  bed: {
    unknown: "Residential treatment is live-in, so where the building stands matters far less than whether the program fits clinically and what it arranges for you afterwards. Many people are admitted outside their own city. The question worth pressing is what the step-down looks like — outpatient care, medication management or sober living back where you actually live.",
    major: "Residential care means living on site, so the practical constraint is a bed and an authorization, not a commute. A market this size typically carries several residential providers at different price points and clinical intensities, which makes it worth comparing program length and what step-down care each one arranges before you accept the first available bed.",
    large: "Because residential treatment is live-in, its location matters less than its clinical fit and what it hands you off to at discharge. A city this size usually supports residential capacity, though specialized tracks may be thinner. Ask what the program's step-down looks like and whether it arranges outpatient care back in your own community.",
    midsize: "Residential beds are distributed less evenly than outpatient services. A market this size may have general residential capacity while a specific track is only offered regionally. Since residential care is live-in, widening the search beyond the city costs you little — but ask each program what aftercare it arranges once you return home.",
    small: "Residential capacity is concentrated in larger markets, so a smaller city often has none of its own. That matters less than it first appears, because residential treatment is live-in: the important questions are clinical fit, program length, and whether the provider will arrange outpatient follow-up back where you actually live.",
  },
  visit: {
    unknown: "Outpatient care is the level where location genuinely constrains treatment, because you attend several times a week for months rather than being admitted once. Ask about session times before clinical philosophy, and ask specifically about telehealth-delivered components and satellite sites — both exist precisely to shorten the trip.",
    major: "Outpatient care is the one level where location genuinely constrains treatment: you attend several times a week, for months. In a market this size there is usually a choice of programs, so compare schedules — evening and early-morning tracks exist specifically for people holding a job — and check what public transit or parking looks like at the site.",
    large: "Because outpatient programs require repeat attendance rather than a single admission, the commute is part of the treatment plan. A city this size generally supports outpatient and intensive-outpatient capacity. Ask about session times before clinical philosophy: a program you cannot reliably get to three evenings a week is the wrong program.",
    midsize: "Outpatient care is attended, not admitted, so travel time compounds over months. Markets this size usually carry outpatient capacity, though intensive tracks may run fewer cohorts and start on a schedule rather than on demand. Ask when the next cohort begins and whether any component is offered by telehealth.",
    small: "This is the level of care where a smaller market bites hardest, because the program requires you to be physically present repeatedly over months. Ask specifically about telehealth-delivered components and about whether the provider runs satellite sessions — many extend into smaller communities rather than expecting everyone to travel to the main site.",
  },
  dosing: {
    unknown: "The distinction that decides everything here is dispensing. Buprenorphine is prescribed and filled at a pharmacy like other medication; methadone is dispensed on site at a federally licensed opioid-treatment program, daily at first, with take-home doses earned over months of stable participation. Ask which of the two a clinic actually offers before anything else.",
    major: "Medication for opioid use disorder splits along a practical line: office-based buprenorphine can be prescribed and collected like other prescriptions, while methadone is dispensed on site under federal opioid-treatment-program rules, initially daily. A market this size usually has both, so ask which model a given clinic runs before anything else.",
    large: "The distinction that matters is dispensing, not brand. Buprenorphine is prescribed and filled at a pharmacy; methadone is dispensed at a licensed opioid-treatment program, with take-home doses earned over months of stable participation. A city this size typically has buprenorphine prescribers, and often an opioid-treatment program too.",
    midsize: "Buprenorphine prescribing is far more widely distributed than methadone dispensing, because methadone requires a federally licensed opioid-treatment program with on-site dosing. In a market this size, buprenorphine is usually obtainable locally; a daily methadone dose may mean a regional program. Ask which of the two a clinic actually offers.",
    small: "Daily on-site dosing is the hard constraint in a smaller market: methadone must be dispensed at a federally licensed opioid-treatment program, and those are regionally placed. Office-based buprenorphine is far more widely available and can often be prescribed locally, including by telehealth in many circumstances. Ask about both routes rather than only the one you have heard of.",
  },
  urgent: {
    unknown: "Urgent access is a capacity question answered hour by hour, so call rather than infer anything from a listing. Low-barrier medication clinics are usually the fastest door. Where there is immediate medical risk — severe withdrawal, overdose, suicidality alongside substance use — emergency care comes first and treatment placement follows medical clearance.",
    major: "Urgent admission is a capacity question answered hour by hour, not a property of a city. In a market this size more doors exist, but availability still changes through the day. If there is immediate medical risk — severe withdrawal, overdose, suicidality alongside substance use — an emergency department is the route to medical clearance first, and admission follows from there.",
    large: "Same-day capacity depends on who happens to have a bed or an induction slot this morning, so call rather than infer from a listing. Low-barrier medication clinics are usually the fastest door. Where there is immediate medical risk, emergency care comes first and treatment placement follows medical clearance.",
    midsize: "In a market this size, the fastest realistic route is often a low-barrier medication clinic rather than a residential admission, because bed capacity is smaller and authorization takes time. If the situation is medically urgent, the emergency department is the right first call — placement is arranged after clearance, not instead of it.",
    small: "Urgent treatment access in a smaller market usually runs through the hospital rather than a dedicated intake line, simply because that is where 24-hour clinical staff are. For immediate medical risk, go through emergency care first. For rapid medication starts, ask about telehealth induction, which removes travel from the most time-critical step.",
  },
  mixed: {
    unknown: "This category spans several levels of care, and they impose very different demands. Withdrawal management and residential treatment are bed-based; outpatient care is attended repeatedly over months; medication management sits somewhere between. Deciding which level you actually need first will save you calls, because availability differs sharply between them.",
    major: "Programmes in this category span several levels of care, so the useful first question is which level you are actually looking for — withdrawal management, a live-in program, or something you attend from home. A market this size typically supports all three, and the answer changes what matters: a bed and an authorization for residential, a workable schedule for outpatient.",
    large: "This category covers more than one level of care, and they impose different demands. Residential is live-in, so location matters less than clinical fit; outpatient is attended repeatedly over months, so travel time is part of the plan. A city this size generally supports both, which makes the level-of-care decision the one worth spending time on.",
    midsize: "Because this category spans levels of care, availability is not one number. Outpatient and medication services are usually the most locally available in a market this size, while residential and withdrawal management are distributed more regionally. Deciding which level you need first will save calls.",
    small: "In a smaller market the levels of care separate sharply: outpatient counselling and medication management are frequently available locally, while residential beds and medically supervised withdrawal tend to be regional. Since residential care is live-in anyway, the practical plan is often regional for the intensive step and local for everything after it.",
  },
};

const VERIFY = "Availability changes constantly and a directory listing is a starting point, not a confirmation — call the provider to confirm current capacity, the level of care they actually offer, and whether they accept your coverage.";

const num = (n) => Number(n).toLocaleString("en-US");

function ordinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function listNames(names, max = 3) {
  const take = names.slice(0, max);
  if (take.length === 0) return "";
  if (take.length === 1) return take[0];
  return `${take.slice(0, -1).join(", ")} and ${take[take.length - 1]}`;
}

/**
 * @param {{profile: any, treatmentLabel: string, treatmentSlug: string,
 *          facilityCount?: number|null}} input
 * @returns {{metaDescription: string, intro: string,
 *           sections: {heading: string, body: string}[],
 *           faqs: {question: string, answer: string}[]}}
 */
export function buildCityTreatmentContent({ profile, treatmentLabel, treatmentSlug, facilityCount = null }) {
  if (!profile) throw new TypeError("buildCityTreatmentContent: profile is required");
  const {
    city, state, stateAbbr, population, rankInState, listedInState, band, county,
    countyPeers, sizePeers, relatedMarkets, metroRole, stateSharePct, largestListedInState,
  } = profile;
  const label = treatmentLabel || "treatment";
  const lower = sentenceLabel(label);
  const setting = careSettingFor(treatmentSlug);

  // Guidance is keyed on how big the market is. Where no population
  // shipped for this city, there is no honest band to assert, so the
  // page gets the mid-size guidance — which is the hedged one — and
  // never claims to know the size.
  const bandId = band?.id ?? "unknown";
  const knowsSize = Boolean(band && Number.isFinite(population));

  // ─── Where the city sits ───────────────────────────────────────────
  const placeParts = [];
  if (knowsSize) {
    placeParts.push(
      `${city} has about ${num(population)} residents, which makes it the ${ordinal(rankInState)} largest of the ${listedInState} ${state} cities this directory covers`,
    );
    if (stateSharePct != null && stateSharePct >= 0.1) {
      placeParts.push(`roughly ${stateSharePct}% of the state's population lives here`);
    }
  }
  if (metroRole === "primary") {
    placeParts.push(`${knowsSize ? "it" : city} is the state's largest metropolitan center, which is where ${state}'s treatment capacity concentrates`);
  } else if (metroRole === "secondary") {
    placeParts.push(`${knowsSize ? "it" : city} is one of ${state}'s secondary metropolitan centers`);
  } else if (largestListedInState && largestListedInState !== city) {
    placeParts.push(`the largest ${state} market in this directory is ${largestListedInState}, and specialized services often concentrate there`);
  }
  let placeBody = placeParts.length ? placeParts.join("; ") + "." : "";
  if (placeBody) placeBody = placeBody.charAt(0).toUpperCase() + placeBody.slice(1);

  if (county) {
    const seatClause = county.isSeat
      ? `${city} is the seat of ${county.name} County`
      : `${city} sits in ${county.name} County, whose seat is ${county.seat}`;
    placeBody += `${placeBody ? " " : ""}${seatClause} — a county of roughly ${num(county.population)} residents.`;
    if (countyPeers.length) {
      placeBody += ` Other places this directory lists in the same county: ${listNames(countyPeers, 4)}.`;
    }
    placeBody += ` County matters more than it looks for treatment: in a number of states, publicly funded treatment is administered through a county or regional behavioral-health authority rather than the state directly, so check which body covers ${county.name} County before assuming a state-level answer applies.`;
  }

  // ─── Guidance ──────────────────────────────────────────────────────
  const guidance = (GUIDANCE[setting] ?? GUIDANCE.mixed)[bandId] ?? GUIDANCE.mixed.midsize;

  const sections = [];
  if (placeBody) sections.push({ heading: `${city} at a glance`, body: placeBody });
  sections.push({
    heading: knowsSize ? `What a market this size means for ${lower}` : `What to expect for ${lower} here`,
    body: `${guidance} ${VERIFY}`,
  });

  // ─── Related markets ───────────────────────────────────────────────
  // Prefer the curated association the caller supplies over the derived
  // population neighbours: it is editorial data this site already
  // maintains, and it covers cities the population table does not.
  const peers = (relatedMarkets ?? []).length ? relatedMarkets : sizePeers ?? [];
  if (peers.length) {
    const derived = !((relatedMarkets ?? []).length);
    sections.push({
      heading: `Related ${state} markets`,
      body: derived
        ? `If ${city} turns up nothing that fits, the ${state} cities closest to it in population in this directory are ${listNames(sizePeers, 2)}. They are listed as comparable in size, not in distance — this directory does not hold provider coordinates and will not tell you which option is physically closest. Use them as a second search, and use a map for the travel question.`
        : `This directory associates ${city} with ${listNames(peers, 4)}. That association is editorial — it is where a search that starts in ${city} sensibly widens to next, not a distance calculation. RehabLookup does not hold provider coordinates and cannot rank options by how far away they are, so check a map before you commit to traveling.`,
    });
  }

  // ─── Intro ─────────────────────────────────────────────────────────
  let intro = `This page lists ${lower} options for ${city}, ${stateAbbr}`;
  if (Number.isFinite(facilityCount)) {
    intro += facilityCount > 0
      ? `. RehabLookup currently lists ${num(facilityCount)} ${facilityCount === 1 ? "facility" : "facilities"} in ${city} itself`
      : `. RehabLookup does not currently list a facility in ${city} itself, so the context below covers what to look for and where else to search`;
  }
  intro += knowsSize
    ? `. ${city} is a ${band.label} of about ${num(population)} people${county ? ` in ${county.name} County` : ""}, and what that means for ${lower} specifically is set out below.`
    : `.${county ? ` ${city} sits in ${county.name} County, ${stateAbbr}.` : ""} What the local picture means for ${lower} specifically is set out below.`;

  // ─── FAQs ──────────────────────────────────────────────────────────
  const faqs = [];
  const firstGuidanceSentence = guidance.split(". ")[0];

  faqs.push({
    question: `Is there ${lower} in ${city} itself?`,
    answer: Number.isFinite(facilityCount) && facilityCount > 0
      ? `This directory lists ${num(facilityCount)} ${facilityCount === 1 ? "facility" : "facilities"} in ${city}. That is what RehabLookup holds, not a count of everything operating in the city, and a listing does not confirm current capacity — call to check. ${firstGuidanceSentence}.`
      : `RehabLookup does not currently list one in ${city}. That is a statement about this directory's coverage, not proof that nothing operates locally. ${firstGuidanceSentence}.`,
  });

  if (county) {
    faqs.push({
      question: `What county is ${city} in, and why does it matter?`,
      answer: `${city} is in ${county.name} County, ${stateAbbr}${county.isSeat ? ", and is the county seat" : `, whose seat is ${county.seat}`}. It matters because eligibility for publicly funded treatment is frequently administered at county or regional level rather than state level, and because providers often describe their service area by county. When you call, asking whether they take referrals from ${county.name} County residents is usually a faster question than asking about ${city} specifically.`,
    });
  } else if (peers.length) {
    faqs.push({
      question: `Where else should I look if ${city} has nothing available?`,
      answer: `Widen to ${listNames(peers, 3)}, and to the state's larger centers, where specialized programs concentrate. Note that these are related markets, not ranked by distance: this directory does not hold coordinates and cannot tell you which option is physically closest.`,
    });
  }

  faqs.push({
    question: `Do I have to be treated in ${city} to get ${lower}?`,
    answer: setting === "visit"
      ? `For programs you attend rather than live in, being able to get there repeatedly over several months is part of whether the treatment works, so local really does matter here. Ask about evening cohorts, satellite sites and telehealth-delivered components before ruling a program out on travel alone.`
      : setting === "dosing"
        ? `It depends on the medication. Buprenorphine is prescribed and filled like other prescriptions and is often manageable locally; methadone is dispensed on site at a federally licensed opioid-treatment program, daily at first, which does tie you to that location until take-home doses are earned.`
        : `No. Residential and withdrawal-management programs are live-in, so many people are admitted outside their own city. What matters more is what the program arranges for afterwards — ask specifically whether it will set up follow-up care back in ${city}.`,
  });

  const sizeClause = knowsSize
    ? ` — a ${band.label} of about ${num(population)}${county ? ` in ${county.name} County` : ""}`
    : county ? ` — ${county.name} County` : "";
  const metaDescription = `${label} in ${city}, ${stateAbbr}${sizeClause}. Compare programs, coverage and what the local market typically supports.`;

  return { metaDescription, intro, sections, faqs };
}
