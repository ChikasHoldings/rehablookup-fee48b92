/**
 * Composed content for the provider-facing /rehab-marketing/* family.
 *
 * 6,653 pages, 28 distinct bodies, a cluster of 2,926 identical ones and
 * a 235-word median. Same structural cause as the insurance family: the
 * only variables in the template were the state name and the treatment
 * name, both already in the title.
 *
 * These pages address treatment operators rather than people seeking
 * care, which changes what "useful" means. An operator evaluating a
 * market wants to know how crowded it is, who pays for treatment there,
 * and what it takes to be licensed — not a restatement of what detox is.
 * Every one of those is available as real per-state data the repo
 * already ships and this family never used:
 *
 *   `stateAddictionStats`  population, SAMHSA-listed facility count,
 *                          overdose death rate, opioid share, Medicaid
 *                          expansion, primary and secondary metros
 *   `stateLicensingData`   regulatory body, licensure types, renewal
 *   `countySeoData`        county seat, population, major cities
 *   `insurerProfiles`      network structure, which decides how hard a
 *                          carrier is to contract with
 *
 * DERIVED FIGURES ARE ARITHMETIC, NOT ESTIMATES
 *
 * Facilities per 100,000 residents is computed from the two real numbers
 * already in the dataset. It is labelled as what it is — a density
 * measure over SAMHSA-listed facilities — and never presented as market
 * share, revenue opportunity or a forecast. Nothing here projects demand
 * or promises results; those would be invented, and for an audience
 * making commercial decisions that is worse than saying less.
 */

import { CARRIER_TYPE_LABEL, insurerProfile, insurerProfileByName } from "./insurerProfiles.mjs";
import { levelOfCareProfile } from "./levelOfCareProfiles.mjs";
import { countyLabel, sentenceLabel } from "./textCase.mjs";

function list(items) {
  const xs = (items ?? []).filter(Boolean);
  if (!xs.length) return "";
  if (xs.length === 1) return xs[0];
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

/**
 * SAMHSA-listed facilities per 100,000 residents, to one decimal.
 * Returns null when either input is missing so the caller omits the
 * claim rather than printing a number derived from a guess.
 */
export function facilityDensityPer100k(samhsaFacilities, populationMillions) {
  if (!Number.isFinite(samhsaFacilities) || !Number.isFinite(populationMillions) || populationMillions <= 0) {
    return null;
  }
  return Math.round((samhsaFacilities / (populationMillions * 10)) * 10) / 10;
}

/** Plain-language reading of that density, banded. */
function densityReading(density) {
  if (density === null) return "";
  if (density >= 20) return "a densely served market where differentiation matters more than presence";
  if (density >= 12) return "a moderately served market with established competition in the main metros";
  if (density >= 6) return "a thinner market where coverage gaps are still common outside the largest metros";
  return "a sparsely served market where whole regions may have no local program at a given level of care";
}

/**
 * @param {object} input
 * @param {string} input.stateName
 * @param {object} [input.stats]      from `_unique-content.mjs` getStateStatsBySlug
 * @param {object} [input.licensing]  from `_unique-content.mjs` getStateLicensing
 * @param {string} [input.treatmentName]
 * @param {string} [input.levelSlug]     level-of-care slug, e.g. "iop"
 * @param {string} [input.countyName] without the "County" suffix
 * @param {string} [input.countySeat]
 * @param {number} [input.countyPopulation]
 * @param {string[]} [input.majorCities]
 * @param {string} [input.countyGovernance] where county government is absent or limited
 * @param {string} [input.insurerSlug]
 * @param {string} [input.insurerName]
 */
export function buildProviderMarketContent(input) {
  const {
    stateName,
    stats,
    licensing,
    treatmentName,
    levelSlug,
    countyName,
    countySeat,
    countyPopulation,
    majorCities,
    countyGovernance,
    insurerSlug,
    insurerName,
  } = input;

  const county = countyName ? countyLabel(countyName) : null;
  const scope = county ? `${county}, ${stateName}` : stateName;
  const service = treatmentName ? sentenceLabel(treatmentName) : "addiction treatment";

  const density = facilityDensityPer100k(stats?.samhsaFacilities, stats?.populationMillions);
  const sections = [];

  const intro =
    `This is a market overview for operators running or opening ${service} programs in ${scope}. ` +
    `It covers how served the market already is, who pays for treatment here, and what ${stateName} requires to operate — ` +
    `the three things that decide whether a new or expanding program is viable.`;

  // 1. Market density — the number an operator actually wants.
  const marketBits = [];
  if (stats?.samhsaFacilities && stats?.populationMillions) {
    marketBits.push(
      `${stateName} has ${stats.samhsaFacilities.toLocaleString()} SAMHSA-listed treatment facilities serving roughly ${(stats.populationMillions * 1_000_000).toLocaleString()} residents` +
        (density !== null
          ? `, about ${density} facilities per 100,000 people — ${densityReading(density)}.`
          : "."),
    );
  }
  if (stats?.overdoseDeathRate) {
    marketBits.push(
      `The state's overdose death rate is ${stats.overdoseDeathRate} per 100,000` +
        (stats?.opioidShare ? `, with ${stats.opioidShare}% of those deaths involving opioids` : "") +
        `. That is a measure of unmet clinical need, not of billable demand — the two diverge most where coverage is thin.`,
    );
  }
  if (stats?.primaryMetro) {
    marketBits.push(
      `Capacity concentrates in ${stats.primaryMetro}` +
        (stats?.secondaryMetros?.length ? `, followed by ${list(stats.secondaryMetros.slice(0, 4))}` : "") +
        `, so competitive pressure and referral volume both fall off outside those metros.`,
    );
  }
  if (marketBits.length) {
    sections.push({ heading: `${stateName} market conditions`, body: marketBits.join(" ") });
  }

  // 2. Catchment — only on county pages, and only from real county facts.
  if (county) {
    const catch_ = [];
    if (typeof countyPopulation === "number" && countyPopulation > 0) {
      catch_.push(`${county} has about ${countyPopulation.toLocaleString()} residents.`);
    }
    if (countySeat) {
      catch_.push(
        `${countySeat} is the county seat and normally anchors its healthcare infrastructure, which is where higher levels of care and referral relationships tend to concentrate.`,
      );
    }
    if (majorCities?.length) {
      catch_.push(`The practical catchment ${countySeat ? "also " : ""}includes ${list(majorCities.slice(0, 5))}.`);
    }
    // Where county government is absent or limited, saying so is the
    // point: the licensing and contracting advice on this page assumes
    // a county authority exists, and in several states it does not.
    if (countyGovernance) catch_.push(countyGovernance);
    if (catch_.length) sections.push({ heading: `${county} catchment`, body: catch_.join(" ") });
  }

  // 3. Payer mix — Medicaid expansion is the single biggest revenue-mix fact.
  const payerBits = [];
  if (typeof stats?.medicaidExpanded === "boolean") {
    payerBits.push(
      stats.medicaidExpanded
        ? `${stateName} expanded Medicaid under the ACA, so a larger share of the treatment-seeking population is publicly insured. For operators that generally means higher volume at lower per-episode reimbursement, and it makes Medicaid contracting a volume decision rather than a charity-care one.`
        : `${stateName} has not expanded Medicaid under the ACA. A larger share of the treatment-seeking population is uninsured or falls in the coverage gap, which shifts the mix toward commercial payers, self-pay and state-funded contracts, and makes grant and block-grant funding more material to a program's finances.`,
    );
  }
  payerBits.push(
    `Federal parity rules require plans that cover substance use treatment to apply no harder limits to it than to comparable medical care, which shapes utilization review but does not set rates. Rates are negotiated per contract.`,
  );
  sections.push({ heading: `Who pays for ${service} in ${stateName}`, body: payerBits.join(" ") });

  // 3b. Level of care — what actually differs between the fourteen
  // variants a county publishes. Without this the level was a word in
  // the heading and nothing else.
  const level = levelOfCareProfile(levelSlug);
  if (level) {
    sections.push({
      heading: `What running a ${level.label.toLowerCase()} program involves`,
      body:
        `${level.label} is ${level.asam}. It needs ${level.licensure}. Staffing floor: ${level.staffing}. ` +
        `Length of stay runs to ${level.stay}. Revenue arrives ${level.revenue}. ` +
        `The operational fact most often missed: ${level.constraint}. ` +
        `State specifics — the exact license names, staffing ratios and rates — come from ${licensing?.regulatoryBody ?? `the ${stateName} regulator`}, not from a national generalization.`,
    });
  }

  // 4. Carrier contracting — only on the insurance sub-family.
  const profile = insurerProfile(insurerSlug) ?? insurerProfileByName(insurerName);
  if (profile) {
    sections.push({
      heading: `Contracting with ${profile.name}`,
      body:
        `${profile.distinctive} ` +
        (profile.behavioralHealth
          ? `Behavioral health is administered by ${profile.behavioralHealth}, so network applications and utilization review run through that entity rather than the medical plan — a facility credentialed medically is not automatically credentialed for the behavioral network. `
          : "") +
        (profile.network ? `Its network structure here is ${profile.network}.` : ""),
    });
  }

  // 5. Licensure — the barrier to entry, genuinely different per state.
  if (licensing?.regulatoryBody) {
    const types = licensing.licensureTypes?.slice(0, 4);
    sections.push({
      heading: `Licensing and oversight in ${stateName}`,
      body:
        `Programs are licensed by ${licensing.regulatoryBody}${licensing.regulatoryAbbr ? ` (${licensing.regulatoryAbbr})` : ""}. ` +
        (types?.length ? `Licensure categories include ${list(types)}. ` : "") +
        (licensing.renewalPeriod ? `Renewal runs on a ${licensing.renewalPeriod} cadence. ` : "") +
        `Licensure category determines which levels of care a site may bill for, so it constrains the service line before any payer contract does.`,
    });
  }

  const faqs = [
    {
      question: `How competitive is the ${service} market in ${scope}?`,
      answer:
        density !== null
          ? `${stateName} carries about ${density} SAMHSA-listed facilities per 100,000 residents, which makes it ${densityReading(density)}. Density is concentrated in ${stats?.primaryMetro || "the largest metros"}, so a county-level view usually differs from the state average.`
          : `Competition varies sharply by metro. Capacity concentrates in the largest population centers, and coverage gaps persist outside them.`,
    },
    {
      question: `What license does a ${service} program need in ${stateName}?`,
      answer: licensing?.regulatoryBody
        ? `Licensure is issued by ${licensing.regulatoryBody}${licensing.regulatoryAbbr ? ` (${licensing.regulatoryAbbr})` : ""}${licensing.licensureTypes?.length ? `, across categories including ${list(licensing.licensureTypes.slice(0, 3))}` : ""}. Confirm current requirements directly with the regulator before planning a service line.`
        : `Licensure is issued by the state regulator. Confirm current requirements with them before planning a service line.`,
    },
    ...(level
      ? [
          {
            question: `What is different about operating ${level.label.toLowerCase()} specifically?`,
            answer: `${level.constraint} On the regulatory side it needs ${level.licensure}, and the staffing floor is ${level.staffing}. Confirm the ${stateName} specifics with ${licensing?.regulatoryBody ?? "the state regulator"} before committing capital.`,
          },
        ]
      : []),
    {
      question: `What does the payer mix look like in ${stateName}?`,
      answer:
        typeof stats?.medicaidExpanded === "boolean"
          ? stats.medicaidExpanded
            ? `${stateName} expanded Medicaid, so publicly insured volume is a larger share of the addressable population than in non-expansion states. Expect higher volume at lower per-episode reimbursement.`
            : `${stateName} has not expanded Medicaid, so more of the treatment-seeking population is uninsured or in the coverage gap. Commercial, self-pay and state-funded contracts carry proportionally more of the mix.`
          : `Payer mix depends on the state's Medicaid posture and local commercial penetration. Confirm both before modelling revenue.`,
    },
  ];

  const metaDescription = county
    ? `Market overview for ${service} operators in ${county}, ${stateName}: facility density, payer mix, catchment and ${stateName} licensing requirements.`
    : `Market overview for ${service} operators in ${stateName}: facility density${density !== null ? ` (${density} per 100k)` : ""}, payer mix and state licensing requirements.`;

  return { metaDescription, intro, sections, faqs };
}
