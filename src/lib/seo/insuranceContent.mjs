/**
 * Composed content for /insurance/{insurer}/{state}/{city} pages.
 *
 * The problem this solves, measured: 7,527 insurance pages reduced to 29
 * distinct bodies once each page's own geography was normalized away.
 * They were one ~120-word template with three substitutions — insurer
 * name, city, state — so every page said the same thing and none of them
 * answered the question it was built to rank for.
 *
 * The fix is not more words. It is more AXES. A page here now composes
 * from three independent sources of real fact:
 *
 *   carrier  `insurerProfiles.mjs` — how this insurer is structured, who
 *            actually administers its behavioral health benefit, and how
 *            a member verifies a substance-use benefit with it.
 *   state    `stateInsuranceConfigs` — Medicaid expansion status and the
 *            state's own `notableInfo`, which is already written per
 *            state and was previously unused on city pages.
 *   city     `locationSeoData` population plus the EXACT facility count
 *            from the Phase 2 location layer.
 *
 * Two pages now differ because the facts differ, not because a token was
 * swapped. Cigna-in-Fresno and Kaiser-in-Fresno describe different
 * network structures and different verification routes; Cigna-in-Fresno
 * and Cigna-in-Toledo carry different state rules and different local
 * inventory.
 *
 * TRUTH CONSTRAINTS
 *
 *  - No dollar figures, deductibles, coinsurance or covered-day counts.
 *    Those are plan-specific and would be invented.
 *  - No claim that any facility is in-network. Acceptance is reported by
 *    facilities; network status must be confirmed with the carrier. This
 *    is the same distinction Phase 2 held for insurance matching.
 *  - Facility counts come from the caller's EXACT count and are omitted
 *    entirely when that count is unknown, never guessed or rounded up.
 *
 * Plain `.mjs` so the static-HTML generators (Node) and the React page
 * render from one implementation rather than two that drift.
 */

import { CARRIER_TYPE_LABEL, insurerProfile, insurerProfileByName } from "./insurerProfiles.mjs";

/** Join a list into readable prose: "a, b and c". */
function list(items) {
  const xs = items.filter(Boolean);
  if (xs.length === 0) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

function plural(n, one, many) {
  return n === 1 ? one : many;
}

/**
 * Build the page content.
 *
 * @param {object} input
 * @param {string} [input.insurerSlug]   e.g. "cigna-rehab"
 * @param {string} [input.insurerName]   e.g. "Cigna" (React page has names)
 * @param {string} input.cityName
 * @param {string} input.stateName
 * @param {string} [input.stateAbbr]
 * @param {boolean} [input.medicaidExpanded]
 * @param {string} [input.notableInfo]   state-specific paragraph
 * @param {number} [input.population]    real city population, if known
 * @param {number} [input.facilityCount] EXACT city+insurer matches, if known
 * @param {string} [input.primaryMetro]  the state's largest metro, if known
 * @param {string[]} [input.secondaryMetros] the state's other named metros
 * @returns {{metaDescription: string, intro: string,
 *            sections: {heading: string, body: string}[],
 *            faqs: {question: string, answer: string}[]}}
 */
export function buildInsuranceCityContent(input) {
  const {
    insurerSlug,
    insurerName,
    cityName,
    stateName,
    stateAbbr,
    medicaidExpanded,
    notableInfo,
    population,
    facilityCount,
    primaryMetro,
    secondaryMetros,
  } = input;

  const profile = insurerProfile(insurerSlug) ?? insurerProfileByName(insurerName);
  const name = profile?.name ?? insurerName ?? "your insurer";
  const typeLabel = profile ? CARRIER_TYPE_LABEL[profile.type] : null;
  const place = `${cityName}, ${stateAbbr || stateName}`;

  // Only stated when the caller supplied a real number. `undefined` and
  // `null` mean "not known here" and produce no claim at all.
  const hasCount = typeof facilityCount === "number" && Number.isFinite(facilityCount);
  const countClause = !hasCount
    ? ""
    : facilityCount > 0
      ? ` RehabLookup lists ${facilityCount} ${plural(facilityCount, "facility", "facilities")} in ${cityName} reporting that ${name} is accepted.`
      : ` RehabLookup does not currently list a facility in ${cityName} reporting that ${name} is accepted — the ${stateName} directory covers the rest of the state.`;


  const intro =
    `${name} is ${typeLabel ? `a ${typeLabel}` : "a health plan"}${profile?.parent ? `, part of ${profile.parent}` : ""}. ` +
    `This page covers how its addiction-treatment benefit works for people seeking care in ${place}, ` +
    `what to confirm before admission, and which ${stateName} rules affect it.${countClause}`;

  const sections = [];

  // 1. Carrier structure — the axis that was missing entirely.
  if (profile) {
    sections.push({
      heading: `How ${name} covers addiction treatment`,
      body:
        `${profile.distinctive} ` +
        (profile.behavioralHealth
          ? `The substance-use benefit is administered by ${profile.behavioralHealth}, which is who confirms medical necessity and authorizations. `
          : "") +
        (profile.planTypes?.length
          ? `${name} plans in this category include ${list(profile.planTypes)}, and the level of cost sharing and referral requirement depends on which one you hold. `
          : "") +
        (profile.network
          ? `Its network here is ${profile.network}, which is what determines whether a ${cityName} program is treated as in-network.`
          : ""),
    });

    // 2. Verification — concretely different per carrier.
    sections.push({
      heading: `Verifying your ${name} benefits in ${cityName}`,
      body:
        `${profile.verify} ` +
        `Ask specifically about substance use disorder or behavioral health rather than general medical benefits, and ask three things about any ${cityName} program you are considering: whether it is in-network for your specific plan, whether the level of care you need requires prior authorization, and what documentation the facility must submit to keep that authorization in place. ` +
        `Facilities on RehabLookup report which plans they accept; acceptance is not the same as being in-network, and only ${name} can confirm network status for your plan.`,
    });
  }

  // 3. City context — the axis that keeps two cities in the SAME state,
  //    on the SAME carrier, from collapsing into one another.
  //
  //    Population alone cannot do this: a bare number carries no words, so
  //    "Fresno, pop. 542,000" and "Bakersfield, pop. 403,000" read as the
  //    same sentence to a duplicate-content check and to a reader. What
  //    differs in prose is the city's ROLE in the state — whether it is the
  //    primary metro, a named secondary metro, or a smaller community — and
  //    the size band that follows from its real population. Both are
  //    derived from real data, never asserted beyond it.
  const cityBits = [];
  const isPrimary = primaryMetro && cityName && primaryMetro.toLowerCase().includes(cityName.toLowerCase());
  const isSecondary =
    Array.isArray(secondaryMetros) &&
    secondaryMetros.some((m) => String(m).toLowerCase().includes(String(cityName).toLowerCase()));

  if (isPrimary) {
    cityBits.push(
      `${cityName} is the largest metropolitan area in ${stateName}, so it carries the widest range of programs in the state — usually including detox and residential capacity that smaller communities refer out for.`,
    );
  } else if (isSecondary) {
    cityBits.push(
      `${cityName} is one of ${stateName}'s secondary metropolitan areas. It typically supports outpatient and intensive outpatient care locally, while some residential or specialty placements are made in ${primaryMetro}.`,
    );
  } else if (primaryMetro) {
    cityBits.push(
      `${cityName} sits outside ${stateName}'s largest metros, so local options are usually weighted toward outpatient care, and residential or detox placements are more often made in ${primaryMetro} or another regional centre.`,
    );
  }

  if (typeof population === "number" && population > 0) {
    const band =
      population >= 500_000
        ? "a large city, which generally means several programs at each level of care and shorter waits for outpatient admission"
        : population >= 150_000
          ? "a mid-sized city, which usually supports outpatient and intensive outpatient programs locally with fewer residential options"
          : "a smaller community, where the nearest residential or detox bed is often in a neighbouring city";
    cityBits.push(
      `With a population of about ${population.toLocaleString()}, ${cityName} is ${band}. That affects travel distance more than it affects what ${name} will authorize.`,
    );
  }

  if (cityBits.length) {
    sections.push({ heading: `Treatment in ${cityName}`, body: cityBits.join(" ") });
  }

  // 4. State rules — `notableInfo` already existed per state and was unused.
  const stateBits = [];
  if (notableInfo) stateBits.push(notableInfo);
  if (typeof medicaidExpanded === "boolean") {
    stateBits.push(
      medicaidExpanded
        ? `${stateName} expanded Medicaid eligibility under the Affordable Care Act, so more residents of ${cityName} qualify for publicly funded treatment than in non-expansion states.`
        : `${stateName} has not expanded Medicaid eligibility under the Affordable Care Act, which narrows the publicly funded options available to ${cityName} residents who fall in the coverage gap.`,
    );
  }
  if (profile?.type === "government" && name === "Medicaid") {
    stateBits.push(
      `Because Medicaid is administered by ${stateName} within federal rules, the covered levels of care and the provider network on this page are set by the state rather than nationally.`,
    );
  }
  if (stateBits.length) {
    sections.push({
      heading: `${stateName} rules that affect ${name} coverage`,
      body: stateBits.join(" "),
    });
  }

  // 4. Parity — shared law, kept short so it cannot dominate the page.
  sections.push({
    heading: "What federal parity law requires",
    body:
      `Under the Mental Health Parity and Addiction Equity Act, a plan that covers substance use treatment may not apply harder limits to it than to comparable medical care — that covers visit limits, prior-authorization burden, and out-of-pocket maximums. ` +
      `Parity governs how ${name} may treat the benefit relative to medical care; it does not by itself guarantee that a particular ${cityName} facility is in-network or that a particular level of care will be authorized.`,
  });

  const faqs = [
    {
      question: `Does ${name} cover rehab in ${cityName}?`,
      answer:
        `${name} plans that include substance use disorder treatment are subject to federal parity rules, which prevent the benefit from being limited more tightly than comparable medical care. ` +
        (profile?.behavioralHealth
          ? `Coverage decisions for ${cityName} treatment are made by ${profile.behavioralHealth}. `
          : "") +
        `What is covered for you depends on your specific plan, so confirm the level of care and network status before admission.`,
    },
    {
      question: `How do I check my ${name} benefits before entering treatment in ${cityName}?`,
      answer: profile?.verify
        ? `${profile.verify} Ask about substance use disorder benefits specifically, and confirm prior-authorization requirements for the level of care you need.`
        : `Call the member services number on your card, ask for substance use disorder benefits, and confirm prior-authorization requirements for the level of care you need.`,
    },
    {
      question: hasCount
        ? `How many ${name} facilities does RehabLookup list in ${cityName}?`
        : `How do I find ${name} facilities in ${cityName}?`,
      answer: hasCount
        ? (facilityCount > 0
            ? `RehabLookup lists ${facilityCount} ${plural(facilityCount, "facility", "facilities")} in ${cityName}, ${stateName} reporting that ${name} is accepted. `
            : `RehabLookup does not currently list a facility in ${cityName}, ${stateName} reporting that ${name} is accepted. `) +
          `Acceptance is reported by each facility and is not a guarantee of in-network status — verify with ${name} before admission.`
        : `Search the ${cityName} directory and filter by ${name}. Acceptance is reported by each facility and is not a guarantee of in-network status — verify with ${name} before admission.`,
    },
  ];

  const metaDescription = profile
    ? `How ${name} covers addiction treatment in ${place}: ${profile.behavioralHealth ? `benefits administered by ${profile.behavioralHealth}, ` : ""}what to verify before admission, and the ${stateName} rules that apply.`
    : `How ${name} covers addiction treatment in ${place}, what to verify before admission, and the ${stateName} rules that apply.`;

  return { metaDescription, intro, sections, faqs };
}

/**
 * Composed content for /insurance/{insurer}/{state}/county/{county}.
 *
 * This is the largest single sub-family in the corpus — 6,704 pages —
 * and it had the same defect as the city pages plus one of its own: the
 * county axis was reduced to a name, even though `countySeoData` already
 * carries each county's seat, population and major cities.
 *
 * It deliberately does NOT reuse `countySeoData`'s prose fields
 * (`treatmentOverview`, `demographics`, `accessNotes`) or its generated
 * FAQs. Those are themselves one template per county — the same three
 * sentences with the name swapped — and their FAQ set asserts identical
 * dollar ranges for every county in the country. Propagating them would
 * move the duplication rather than remove it, and would restate cost
 * figures this directory cannot stand behind. Only the county FACTS are
 * used: name, seat, population, major cities.
 *
 * @param {object} input — as `buildInsuranceCityContent`, plus:
 * @param {string} input.countyName    without the "County" suffix
 * @param {string} [input.countySeat]
 * @param {number} [input.countyPopulation]
 * @param {string[]} [input.majorCities]
 */
export function buildInsuranceCountyContent(input) {
  const {
    insurerSlug,
    insurerName,
    countyName,
    countySeat,
    countyPopulation,
    majorCities,
    stateName,
    stateAbbr,
    medicaidExpanded,
    notableInfo,
  } = input;

  const profile = insurerProfile(insurerSlug) ?? insurerProfileByName(insurerName);
  const name = profile?.name ?? insurerName ?? "your insurer";
  const typeLabel = profile ? CARRIER_TYPE_LABEL[profile.type] : null;
  const county = `${countyName} County`;
  const place = `${county}, ${stateAbbr || stateName}`;

  const cities = Array.isArray(majorCities) ? majorCities.filter(Boolean) : [];

  const intro =
    `${name} is ${typeLabel ? `a ${typeLabel}` : "a health plan"}${profile?.parent ? `, part of ${profile.parent}` : ""}. ` +
    `This page covers how its addiction-treatment benefit applies across ${place} — what the county's own geography means for where you are likely to be treated, ` +
    `what to confirm with ${name} before admission, and which ${stateName} rules apply.`;

  const sections = [];

  if (profile) {
    sections.push({
      heading: `How ${name} covers addiction treatment`,
      body:
        `${profile.distinctive} ` +
        (profile.behavioralHealth
          ? `The substance-use benefit is administered by ${profile.behavioralHealth}, which is who reviews medical necessity for a ${county} admission. `
          : "") +
        (profile.network ? `Its network here is ${profile.network}.` : ""),
    });
  }

  // County geography — real facts, and the part that genuinely differs
  // between two counties in the same state on the same carrier.
  const geo = [];
  if (countySeat) {
    geo.push(
      `${countySeat} is the county seat of ${county} and is normally where its highest levels of care are concentrated, so a ${name} member living elsewhere in the county is most likely to be referred there for detox or residential admission.`,
    );
  }
  if (cities.length) {
    geo.push(
      cities.length === 1
        ? `${cities[0]} is the other population centre the county's programs draw from.`
        : `Programs serving the county also draw from ${list(cities.slice(0, 5))}, which is the practical catchment for outpatient scheduling.`,
    );
  }
  if (typeof countyPopulation === "number" && countyPopulation > 0) {
    geo.push(
      `${county} has about ${countyPopulation.toLocaleString()} residents. County population is a reasonable proxy for how many programs operate locally, but it says nothing about which of them are in-network for your plan — that is a ${name} question, not a geographic one.`,
    );
  }
  if (geo.length) sections.push({ heading: `Treatment access across ${county}`, body: geo.join(" ") });

  if (profile) {
    sections.push({
      heading: `Verifying your ${name} benefits`,
      body:
        `${profile.verify} ` +
        `Confirm three things for any ${county} program: in-network status for your specific plan, whether the level of care needs prior authorization, and what the facility must document to keep that authorization. ` +
        `Facilities on RehabLookup report which plans they accept; acceptance is not the same as in-network status.`,
    });
  }

  const stateBits = [];
  if (notableInfo) stateBits.push(notableInfo);
  if (typeof medicaidExpanded === "boolean") {
    stateBits.push(
      medicaidExpanded
        ? `${stateName} expanded Medicaid under the ACA, which widens publicly funded options for ${county} residents.`
        : `${stateName} has not expanded Medicaid under the ACA, which narrows publicly funded options for ${county} residents in the coverage gap.`,
    );
  }
  if (stateBits.length) {
    sections.push({ heading: `${stateName} rules that affect ${name} coverage`, body: stateBits.join(" ") });
  }

  sections.push({
    heading: "What federal parity law requires",
    body:
      `Under the Mental Health Parity and Addiction Equity Act, a plan covering substance use treatment may not limit it more tightly than comparable medical care. ` +
      `Parity governs how ${name} treats the benefit; it does not guarantee that a given ${county} facility is in-network or that a level of care will be authorized.`,
  });

  const faqs = [
    {
      question: `Does ${name} cover rehab in ${county}?`,
      answer:
        `${name} plans that include substance use treatment are subject to federal parity rules. ` +
        (profile?.behavioralHealth ? `Authorization decisions are made by ${profile.behavioralHealth}. ` : "") +
        `What applies to you depends on your plan — confirm level of care and network status before admission.`,
    },
    {
      question: `Where in ${county} is treatment usually located?`,
      answer: countySeat
        ? `Higher levels of care are typically concentrated in ${countySeat}, the county seat${cities.length ? `, with additional programs serving ${list(cities.slice(0, 3))}` : ""}. Outpatient care is more widely distributed than detox or residential care.`
        : `Programs are distributed across the county, with higher levels of care concentrated in its larger population centres.`,
    },
    {
      question: `How do I check my ${name} benefits?`,
      answer: profile?.verify
        ? `${profile.verify} Ask about substance use disorder benefits specifically.`
        : `Call the member services number on your card and ask about substance use disorder benefits specifically.`,
    },
  ];

  const metaDescription = profile
    ? `How ${name} covers addiction treatment across ${place}: ${profile.behavioralHealth ? `benefits administered by ${profile.behavioralHealth}, ` : ""}where care is concentrated, and what to verify before admission.`
    : `How ${name} covers addiction treatment across ${place}, where care is concentrated, and what to verify before admission.`;

  return { metaDescription, intro, sections, faqs };
}

/** Render composed content to the HTML body the static generators emit. */
export function renderInsuranceCityHtml(content) {
  const parts = [`<p>${content.intro}</p>`];
  for (const s of content.sections) {
    parts.push(`<h2>${s.heading}</h2>`, `<p>${s.body}</p>`);
  }
  if (content.faqs?.length) {
    parts.push("<h2>Frequently asked questions</h2>");
    for (const f of content.faqs) {
      parts.push(`<h3>${f.question}</h3>`, `<p>${f.answer}</p>`);
    }
  }
  return parts.join("\n      ");
}
