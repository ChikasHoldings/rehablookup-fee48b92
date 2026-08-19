/**
 * Composes the three per-state articles under
 * /rehab-centers/<state>/articles/.
 *
 * All 150 of them (three articles × fifty states) shipped as three
 * identical bodies with the state name swapped. They are the queries
 * people actually type — what does rehab cost, how do I pick one, where
 * do I go — so the answer being interchangeable is worse here than
 * almost anywhere else on the site.
 *
 * Each article gets its content from data that genuinely differs by
 * state: the cities this directory covers and their populations, the
 * state's licensing regulator and its license categories, its Medicaid
 * expansion posture, its facility density and metro distribution.
 *
 * ON THE COST ARTICLE
 *
 * It publishes no prices. The obvious way to write "cost of rehab in
 * Ohio" is to state a range, and every such range on the internet is
 * either a national average dressed as a local one or an invention.
 * This codebase has no price data, so the article answers the question
 * the reader is actually asking — what will THIS cost ME — by setting
 * out the four things that determine it in their state and how to get a
 * real number for each. That is more useful than a fabricated range and
 * it is the only version that is true.
 */

import { countyLabel } from "./textCase.mjs";

const num = (n) => Number(n).toLocaleString("en-US");

function list(items) {
  const a = items.filter(Boolean);
  if (a.length === 0) return "";
  if (a.length === 1) return a[0];
  return `${a.slice(0, -1).join(", ")} and ${a[a.length - 1]}`;
}

export const STATE_ARTICLE_KINDS = {
  "best-cities-for-addiction-treatment": "bestCities",
  "how-to-find-best-rehab-centers": "howToChoose",
  "cost-of-rehab": "cost",
};

/** `/rehab-centers/ohio/articles/cost-of-rehab-in-ohio` → "cost".
 *  Returns null for a slug this composer does not own, so a new article
 *  type gets no content rather than the wrong content. */
export function stateArticleKind(slug) {
  const stripped = String(slug ?? "").replace(/-in-[a-z-]+$/, "");
  return STATE_ARTICLE_KINDS[stripped] ?? null;
}

/**
 * @param {object} input
 * @param {string} input.kind        from stateArticleKind()
 * @param {string} input.stateName
 * @param {object} [input.stats]     stateAddictionStats row
 * @param {object} [input.licensing] stateLicensingData row
 * @param {{name: string, population?: number, county?: string}[]} [input.cities]
 *        the cities this directory covers in the state, any order
 */
export function buildStateArticleContent({ kind, stateName, stats, licensing, cities = [] }) {
  const ranked = [...cities]
    .filter((c) => Number.isFinite(c.population) && c.population > 0)
    .sort((a, b) => b.population - a.population);
  const regulator = licensing?.regulatoryBody
    ? `${licensing.regulatoryBody}${licensing.regulatoryAbbr ? ` (${licensing.regulatoryAbbr})` : ""}`
    : `the ${stateName} state regulator`;

  if (kind === "bestCities") return bestCities({ stateName, stats, ranked, regulator });
  if (kind === "howToChoose") return howToChoose({ stateName, stats, licensing, regulator, ranked });
  if (kind === "cost") return cost({ stateName, stats, regulator });
  return null;
}

function bestCities({ stateName, stats, ranked, regulator }) {
  const top = ranked.slice(0, 8);
  const sections = [];

  sections.push({
    heading: `What "best" can and cannot mean here`,
    body:
      `This page ranks ${stateName} cities by population and by what this directory covers in them. It is not a quality ranking, ` +
      `and treating it as one would be a mistake: a larger market means more options and more competition for beds, not better care. ` +
      `Quality is a property of an individual program — its licensure, its accreditation, its staffing and whether it treats what you have — ` +
      `and it varies more within any one city than it does between cities.`,
  });

  if (top.length) {
    sections.push({
      heading: `The ${stateName} markets this directory covers`,
      body:
        top
          .map((c, i) => `${i + 1}. ${c.name}${Number.isFinite(c.population) ? ` — about ${num(c.population)} residents` : ""}${c.county ? `, in ${countyLabel(c.county)}` : ""}`)
          .join(". ") +
        `. Larger markets generally carry more levels of care, which matters most for the levels that are hardest to staff — withdrawal management and residential beds.`,
    });
  }

  if (stats?.primaryMetro) {
    sections.push({
      heading: `Where ${stateName}'s treatment capacity actually sits`,
      body:
        `Capacity concentrates in ${stats.primaryMetro}` +
        (stats.secondaryMetros?.length ? `, then ${list(stats.secondaryMetros.slice(0, 4))}` : "") +
        `. ` +
        (stats.samhsaFacilities && stats.populationMillions
          ? `${stateName} has roughly ${num(stats.samhsaFacilities)} SAMHSA-listed facilities for about ${num(Math.round(stats.populationMillions * 1_000_000))} residents. `
          : "") +
        `Outside those metros the gaps are level-specific rather than total — outpatient care and medication management are widely distributed, while detox and residential beds are regional. ` +
        (stats.regionalContext ? `${stats.regionalContext} ` : "") +
        `Every program named in this directory should be checked against ${regulator} before you rely on it.`,
    });
  }

  const faqs = [
    {
      question: `Which city in ${stateName} has the most treatment options?`,
      answer: stats?.primaryMetro
        ? `${stats.primaryMetro} carries the most capacity, which is a function of population rather than of quality. More options also means more competition for the scarcest resources — detox and residential beds — so a larger market does not automatically mean a shorter wait.`
        : `The largest metropolitan areas carry the most capacity. That is a function of population, not of quality.`,
    },
    {
      question: `Should I travel to a bigger city for treatment?`,
      answer:
        `It depends entirely on the level of care. Residential treatment and withdrawal management are live-in, so travelling for them costs you little and widens the options considerably. Outpatient care is attended several times a week for months, so travelling for it is usually the wrong trade. This directory holds no provider coordinates and cannot rank options by distance — use it to find candidates, and a map for the travel question.`,
    },
  ];

  return {
    metaDescription: `The ${stateName} cities this directory covers, ranked by population, with where the state's treatment capacity actually concentrates — and why that is not a quality ranking.`,
    intro: `${stateName} treatment options are not spread evenly across the state. This page sets out which ${stateName} markets this directory covers, how large each one is, and where capacity concentrates — with the caveat that market size is not a measure of care quality.`,
    sections,
    faqs,
  };
}

function howToChoose({ stateName, stats, licensing, regulator, ranked }) {
  const sections = [
    {
      heading: `Start with ${stateName} licensure, not with reviews`,
      body:
        `Every program operating legally in ${stateName} is licensed by ${regulator}. ` +
        (licensing?.licensureTypes?.length
          ? `Its license categories include ${list(licensing.licensureTypes.slice(0, 4))}, and the category a program holds determines which levels of care it may lawfully deliver. `
          : `The category a program holds determines which levels of care it may lawfully deliver. `) +
        (licensing?.renewalPeriod ? `Licenses run on a ${licensing.renewalPeriod} renewal cycle, so a current one is a live fact rather than a historical one. ` : "") +
        `Ask any program for its license category and check it against the regulator's own directory. A program that will not tell you, or whose category does not cover the level of care it is selling you, has answered the question.`,
    },
    {
      heading: `Accreditation is a separate question`,
      body:
        `Licensure is the legal minimum; accreditation by the Joint Commission or CARF is voluntary and involves an outside survey of clinical practice. ` +
        `Neither is a guarantee of good care, and a program can be licensed without being accredited. What accreditation tells you is that someone independent has looked. ` +
        `Ask which one a program holds, when it was last surveyed, and — the question people forget — for which services, because accreditation can cover part of an organization rather than all of it.`,
    },
    {
      heading: `The questions that actually separate programs`,
      body:
        `Ask what happens after discharge, because the handoff is where most episodes fail. Ask whether the program treats co-occurring mental-health conditions with a prescriber on staff or refers them out. ` +
        `Ask whether medication for opioid use disorder is offered, discouraged or prohibited — programs still differ sharply on this and it is the single largest predictor of outcome in opioid use disorder. ` +
        `Ask what the program does when someone returns to use during treatment. And ask what you will owe, in writing, before you admit.`,
    },
  ];

  if (stats?.medicaidExpanded === false) {
    sections.push({
      heading: `The coverage gap in ${stateName}`,
      body:
        `${stateName} has not expanded Medicaid under the ACA, so some adults fall between Medicaid eligibility and marketplace subsidies. ` +
        `That makes state-funded and block-grant-funded programs, federally qualified health centers and sliding-scale providers materially more important here than in expansion states. ` +
        `SAMHSA's National Helpline (1-800-662-4357) is free, confidential and can route you to those specifically.`,
    });
  } else if (stats?.medicaidExpanded === true) {
    sections.push({
      heading: `Coverage in ${stateName}`,
      body:
        `${stateName} expanded Medicaid under the ACA, so adults up to 138% of the federal poverty level are generally eligible. ` +
        `Medicaid covers substance-use treatment, though which programs participate varies and prior authorization is common for residential care. ` +
        `Ask a program directly whether it takes ${stateName} Medicaid and whether it accepts your specific managed-care plan — those are two different questions.`,
    });
  }

  const faqs = [
    {
      question: `How do I check that a ${stateName} rehab is licensed?`,
      answer: `Ask the program for its license category and license number, then verify it against ${regulator}'s own directory rather than against the program's website. A directory listing — including this one — is a starting point, not a verification.`,
    },
    {
      question: `Does a facility being listed on RehabLookup mean it is vetted?`,
      answer: `No. This directory lists facilities and reports what they say about themselves, including which insurance they accept. Acceptance is not the same as being in-network, and a listing is not an endorsement or a clinical recommendation. Verify licensure with ${regulator} and coverage with your plan.`,
    },
    {
      question: `What if I cannot afford treatment in ${stateName}?`,
      answer: `Call SAMHSA's National Helpline at 1-800-662-4357 — it is free, confidential, staffed 24/7 and routes to state-funded and sliding-scale options. ${stateName}'s single state agency for substance use also maintains referral routes into publicly funded care, and many programs hold a small number of scholarship or charity-care beds they do not advertise.`,
    },
  ];

  return {
    metaDescription: `How to check a ${stateName} program's license with ${regulator}, what accreditation does and does not tell you, and the questions that actually separate treatment programs.`,
    intro: `Choosing a treatment program in ${stateName} is mostly a verification exercise, and it is one you can do yourself. This page sets out what to check, who to check it with, and the questions that separate programs once licensure is established.`,
    sections,
    faqs,
  };
}

function cost({ stateName, stats, regulator }) {
  const sections = [
    {
      heading: `Why this page does not quote a price`,
      body:
        `Published "average cost of rehab" figures are national numbers presented as local ones, and nobody pays an average. ` +
        `What you pay in ${stateName} depends on four things — your coverage, the level of care you need, how long the program runs, and whether the provider is in your plan's network — ` +
        `and three of those four are unknown until a program assesses you. RehabLookup holds no pricing data and will not invent a range. What follows is how to get a real number for each of the four.`,
    },
    {
      heading: `1. What your coverage actually is`,
      body:
        (stats?.medicaidExpanded === true
          ? `${stateName} expanded Medicaid, so adults up to 138% of the federal poverty level are generally eligible, and Medicaid covers substance-use treatment. `
          : stats?.medicaidExpanded === false
            ? `${stateName} has not expanded Medicaid, so some adults fall between Medicaid eligibility and marketplace subsidies. State-funded programs and federally qualified health centers carry more of the load here. `
            : "") +
        `Federal parity law requires plans that cover substance-use treatment to apply no harder limits to it than to comparable medical care — that constrains utilization review, but it does not set rates. ` +
        `Call the number on your card and ask three specific questions: is this level of care covered, is this facility in network, and what is my remaining deductible and out-of-pocket maximum this year.`,
    },
    {
      heading: `2. Which level of care you need`,
      body:
        `Cost tracks intensity, and the gap between levels is large. Medically supervised withdrawal is staffed around the clock and priced per day. Residential care is also per-day but runs for weeks. ` +
        `Partial hospitalization and intensive outpatient are attended rather than lived in and are priced per session or per week. Medication management is the least expensive of all and, for opioid use disorder, the most strongly supported by outcome evidence. ` +
        `A program's assessment determines the level; a second opinion is reasonable if the recommendation is the most expensive option available on site.`,
    },
    {
      heading: `3. What "in network" changes`,
      body:
        `An out-of-network admission can cost several multiples of an in-network one for the same clinical service, and it is the single largest cost variable you control. ` +
        `A facility telling you it "accepts" your insurance is not the same as it being in network — acceptance is not a guarantee of in-network status, and the difference lands on your bill, not theirs. ` +
        `Get the answer from your insurer, using the facility's name and tax ID, in writing where possible.`,
    },
    {
      heading: `4. What to do if the answer is that you cannot pay`,
      body:
        `Call SAMHSA's National Helpline at 1-800-662-4357: free, confidential, 24/7, and specifically able to route to publicly funded treatment. ` +
        `${stateName}'s single state agency for substance use administers block-grant-funded treatment, and federally qualified health centers provide sliding-scale care regardless of ability to pay. ` +
        `Many programs also hold a small number of scholarship beds that are never advertised — ask directly. And ask any program for a written good-faith estimate; if you are uninsured or self-paying, federal law generally entitles you to one.`,
    },
  ];

  const faqs = [
    {
      question: `How much does rehab cost in ${stateName}?`,
      answer: `There is no honest single number, and any page that gives you one is guessing. What you pay depends on your coverage, the level of care, the length of the episode and network status. This page sets out how to get a real figure for each, and if the answer is that you cannot pay, SAMHSA's National Helpline (1-800-662-4357) routes to publicly funded options in ${stateName}.`,
    },
    {
      question: `Will insurance cover addiction treatment in ${stateName}?`,
      answer: `Plans that cover substance-use treatment must, under federal parity law, apply no harder limits to it than to comparable medical care. That does not mean every program is covered or that authorization is automatic — prior authorization for residential care is common. Confirm the level of care, the specific facility's network status and your remaining deductible with your plan before admission.`,
    },
    {
      question: `Is free treatment available in ${stateName}?`,
      answer: `Publicly funded treatment exists in every state, administered through the state substance-use agency and delivered by contracted providers, federally qualified health centers and non-profits. Capacity is limited and waits are real, but it exists. SAMHSA's National Helpline at 1-800-662-4357 is the fastest route to it. Verify any program you are referred to against ${regulator}.`,
    },
  ];

  return {
    metaDescription: `What determines the cost of addiction treatment in ${stateName} — coverage, level of care, episode length and network status — and how to get a real figure rather than a national average.`,
    intro: `This page does not quote a price for treatment in ${stateName}, because no honest one exists: published averages are national figures dressed up as local ones, and nobody pays an average. It sets out the four things that decide what you will actually pay, and how to get a real number for each.`,
    sections,
    faqs,
  };
}
