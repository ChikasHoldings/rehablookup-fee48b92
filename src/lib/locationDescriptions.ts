// ============================================================================
// locationDescriptions — varied-content helpers used by StatePage, CityPage,
// and CountyPage so each of the ~19k indexed location URLs renders distinct
// body copy. The audit flagged the previous data files (locationSeoData.ts,
// countySeoData.ts) as templated near-verbatim, which puts every page at
// risk of Google's "Duplicate content without user-selected canonical"
// classification.
//
// Strategy: combine real per-state data from `stateAddictionStats.ts`
// (CDC + SAMHSA + Census-derived) with whatever is unique about the
// city/county/state on the page (name, population, neighbor cities,
// regional context) and pick one of N deterministic prose variants keyed
// off a slug hash. The result varies the *structure* of the paragraph as
// well as the data points so two cities in the same state still ship
// substantively different HTML.
//
// All helpers are pure (no DB calls) — they're called from the page's
// useMemo blocks so the result is stable + cache-friendly.
// ============================================================================

import { getStateStats, type StateAddictionStats } from "@/data/stateAddictionStats";

/** Deterministic non-cryptographic hash → bucket. Same slug → same bucket. */
function hashBucket(input: string, buckets: number): number {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) + h) ^ input.charCodeAt(i);
  }
  return Math.abs(h) % buckets;
}

/** Format population as "245k" or "1.2M" so it reads naturally inline. */
function fmtPop(n: number | undefined): string | null {
  if (!n || n <= 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}

function listAnd(items: string[], max = 3): string {
  const top = items.slice(0, max).filter(Boolean);
  if (top.length === 0) return "";
  if (top.length === 1) return top[0];
  if (top.length === 2) return `${top[0]} and ${top[1]}`;
  return `${top.slice(0, -1).join(", ")}, and ${top[top.length - 1]}`;
}

// ── State-level overview ────────────────────────────────────────────────────

/** Build a 2-3 paragraph overview for a state landing page. */
export function buildStateOverview(stateSlug: string, stateName: string, facilityCount: number): string {
  const s = getStateStats(stateSlug);
  if (!s) return defaultStateOverview(stateName, facilityCount);

  const variants = [
    stateOverviewVariantA,
    stateOverviewVariantB,
    stateOverviewVariantC,
  ];
  return variants[hashBucket(stateSlug, variants.length)](stateName, s, facilityCount);
}

function stateOverviewVariantA(name: string, s: StateAddictionStats, count: number): string {
  return [
    `${name} runs an addiction-treatment landscape shaped by its ${s.regionalContext} geography and a ${s.populationMillions.toFixed(s.populationMillions < 5 ? 2 : 1)}-million-resident population. The state's most recent overdose-mortality figure sits at roughly ${s.overdoseDeathRate.toFixed(1)} deaths per 100,000 residents, with opioids involved in about ${s.opioidShare}% of those losses.`,
    `Approximately ${s.samhsaFacilities.toLocaleString()} licensed treatment facilities operate across ${name} according to SAMHSA's national survey. ${count > 0 ? `RehabLookup currently tracks ${count.toLocaleString()} verified listings statewide.` : ""} ${s.medicaidExpanded ? `${name} expanded Medicaid under the ACA, broadening coverage for adults seeking residential and outpatient care.` : `${name} has not adopted ACA Medicaid expansion, which keeps a wider coverage gap for working-age adults than neighboring states.`}`,
    `${s.signatureNote}`,
  ].join(" ");
}

function stateOverviewVariantB(name: string, s: StateAddictionStats, count: number): string {
  const metros = listAnd([s.primaryMetro, ...s.secondaryMetros]);
  return [
    `Treatment options in ${name} concentrate in ${metros}, though SAMHSA's tally of around ${s.samhsaFacilities.toLocaleString()} licensed providers also reaches smaller communities across the ${s.regionalContext}.`,
    `CDC data place ${name}'s drug-overdose death rate near ${s.overdoseDeathRate.toFixed(1)} per 100,000 — roughly ${s.opioidShare}% of those losses involve opioids. ${count > 0 ? `${count.toLocaleString()} verified facility listings in the RehabLookup directory currently serve ${name} residents.` : ""}`,
    `${s.medicaidExpanded ? "Medicaid expansion" : "The absence of ACA Medicaid expansion"} continues to shape who can afford detox, residential, and long-term care here. ${s.signatureNote}`,
  ].join(" ");
}

function stateOverviewVariantC(name: string, s: StateAddictionStats, count: number): string {
  return [
    `${s.signatureNote}`,
    `Set against a state population of about ${s.populationMillions.toFixed(s.populationMillions < 5 ? 2 : 1)} million, ${name}'s overdose-mortality rate (roughly ${s.overdoseDeathRate.toFixed(1)} per 100,000, with opioids in ~${s.opioidShare}% of cases) frames how facilities here triage detox vs longer-term residential admissions.`,
    `SAMHSA lists approximately ${s.samhsaFacilities.toLocaleString()} licensed treatment facilities across the state. ${count > 0 ? `RehabLookup's verified directory currently surfaces ${count.toLocaleString()} of them across ${listAnd([s.primaryMetro, ...s.secondaryMetros])} and beyond.` : `Care is anchored in ${listAnd([s.primaryMetro, ...s.secondaryMetros])}.`} ${s.medicaidExpanded ? "ACA Medicaid expansion is in effect, broadening adult coverage." : "Medicaid was not expanded under the ACA, so coverage gaps remain wider for working-age adults than in neighboring states."}`,
  ].join(" ");
}

function defaultStateOverview(name: string, count: number): string {
  return `Find verified addiction treatment providers across ${name}. ${count > 0 ? `${count} listings currently tracked.` : ""}`;
}

// ── City-level overview ─────────────────────────────────────────────────────

export function buildCityOverview(
  stateSlug: string,
  stateName: string,
  cityName: string,
  facilityCount: number,
  population?: number,
): string {
  const s = getStateStats(stateSlug);
  const slugKey = `${stateSlug}-${cityName}`.toLowerCase();
  if (!s) return defaultCityOverview(stateName, cityName, facilityCount);
  const variants = [cityOverviewVariantA, cityOverviewVariantB, cityOverviewVariantC, cityOverviewVariantD];
  return variants[hashBucket(slugKey, variants.length)](stateName, cityName, s, facilityCount, population);
}

function cityOverviewVariantA(
  stateName: string, city: string, s: StateAddictionStats, count: number, pop?: number,
): string {
  const popStr = fmtPop(pop);
  const isPrimary = city.toLowerCase() === s.primaryMetro.toLowerCase();
  return [
    `${city}${popStr ? ` (population ~${popStr})` : ""} sits inside ${stateName}'s ${s.regionalContext} treatment landscape.`,
    isPrimary
      ? `As the state's largest metro, ${city} carries the deepest concentration of inpatient and outpatient providers — both private and publicly-funded.`
      : `Seekers in ${city} commonly compare local options against larger ${stateName} metros like ${s.primaryMetro}; many treatment programs operate across both.`,
    `Statewide overdose-mortality data (about ${s.overdoseDeathRate.toFixed(1)} per 100,000, ${s.opioidShare}% opioid-related) inform how local programs triage detox vs longer-term residential care. ${count > 0 ? `RehabLookup currently lists ${count.toLocaleString()} verified provider${count === 1 ? "" : "s"} in or near ${city}.` : `RehabLookup is actively expanding ${city} coverage; the directory below blends nearby verified listings.`}`,
  ].join(" ");
}

function cityOverviewVariantB(
  stateName: string, city: string, s: StateAddictionStats, count: number, pop?: number,
): string {
  const popStr = fmtPop(pop);
  return [
    `Addiction-treatment options in ${city}, ${stateName} reflect both the ${s.regionalContext} regional pattern and the broader state context: ${s.signatureNote}`,
    `${popStr ? `${city}'s ${popStr} residents` : `${city} residents`} compare local detox, inpatient, IOP, PHP, and outpatient programs alongside larger metros like ${listAnd(s.secondaryMetros.length > 0 ? s.secondaryMetros : [s.primaryMetro])}.`,
    `${count > 0 ? `${count.toLocaleString()} verified treatment facilit${count === 1 ? "y is" : "ies are"} currently listed in or near ${city}.` : `The directory below surfaces verified facilities near ${city}.`}`,
  ].join(" ");
}

function cityOverviewVariantC(
  stateName: string, city: string, s: StateAddictionStats, count: number, pop?: number,
): string {
  const popStr = fmtPop(pop);
  return [
    `Families researching addiction care in ${city}, ${stateName} typically weigh proximity (a roughly ${popStr ? `${popStr}-resident ` : ""}city core plus the ${s.primaryMetro} regional system), insurance coverage (${s.medicaidExpanded ? "Medicaid expansion is in effect statewide" : "ACA Medicaid expansion is not in effect"}), and program model (medication-assisted, abstinence-based, dual-diagnosis).`,
    `Statewide drivers — about ${s.overdoseDeathRate.toFixed(1)} drug-overdose deaths per 100,000 residents, with opioids implicated in roughly ${s.opioidShare}% — shape how providers across ${stateName} structure detox windows, MAT availability, and aftercare planning.`,
    `${count > 0 ? `RehabLookup currently surfaces ${count.toLocaleString()} verified ${city} provider${count === 1 ? "" : "s"}.` : "Verified listings near " + city + " appear below."}`,
  ].join(" ");
}

function cityOverviewVariantD(
  stateName: string, city: string, s: StateAddictionStats, count: number, _pop?: number,
): string {
  void _pop;
  return [
    `${city} is one of the addiction-treatment hubs serving ${stateName}'s ${s.regionalContext} corridor.`,
    `Local providers operate within a state framework where SAMHSA tracks roughly ${s.samhsaFacilities.toLocaleString()} licensed facilities and CDC data show a recent overdose-death rate near ${s.overdoseDeathRate.toFixed(1)} per 100,000 residents. ${s.signatureNote}`,
    `${count > 0 ? `${count.toLocaleString()} of those facilit${count === 1 ? "y is" : "ies are"} verified in the RehabLookup directory for ${city}.` : "Use the directory below to compare verified options near " + city + "."}`,
  ].join(" ");
}

function defaultCityOverview(stateName: string, city: string, count: number): string {
  return `Find verified treatment providers near ${city}, ${stateName}. ${count > 0 ? `${count} listings.` : ""}`;
}

// ── County-level overview ───────────────────────────────────────────────────

export function buildCountyOverview(
  stateSlug: string,
  stateName: string,
  countyName: string,
  facilityCount: number,
): string {
  const s = getStateStats(stateSlug);
  const slugKey = `${stateSlug}-${countyName}`.toLowerCase();
  if (!s) return `Find verified addiction-treatment providers in ${countyName}, ${stateName}.`;
  const variants = [countyOverviewVariantA, countyOverviewVariantB, countyOverviewVariantC];
  return variants[hashBucket(slugKey, variants.length)](stateName, countyName, s, facilityCount);
}

function countyOverviewVariantA(
  stateName: string, county: string, s: StateAddictionStats, count: number,
): string {
  return [
    `${county} sits within ${stateName}'s ${s.regionalContext} treatment landscape.`,
    `Across the state, SAMHSA lists about ${s.samhsaFacilities.toLocaleString()} licensed providers and CDC data show a recent overdose-mortality rate near ${s.overdoseDeathRate.toFixed(1)} per 100,000 residents, with ${s.opioidShare}% of those losses opioid-related. ${s.medicaidExpanded ? "Medicaid expansion is in effect statewide, broadening adult coverage." : "Medicaid has not been expanded statewide, leaving wider coverage gaps."}`,
    `${count > 0 ? `${count.toLocaleString()} verified provider${count === 1 ? "" : "s"} currently serve ${county} via the RehabLookup directory.` : `The directory below blends verified facilities serving ${county} from across ${stateName}.`}`,
  ].join(" ");
}

function countyOverviewVariantB(
  stateName: string, county: string, s: StateAddictionStats, count: number,
): string {
  return [
    `${s.signatureNote}`,
    `${county} residents typically compare local detox, residential, IOP, PHP, and outpatient options against the broader ${stateName} system — anchored in ${s.primaryMetro} and serviced by ${s.samhsaFacilities.toLocaleString()}+ licensed facilities statewide.`,
    `${count > 0 ? `${count.toLocaleString()} verified ${county} listing${count === 1 ? "" : "s"} are currently tracked.` : `Verified options near ${county} appear below.`}`,
  ].join(" ");
}

function countyOverviewVariantC(
  stateName: string, county: string, s: StateAddictionStats, count: number,
): string {
  return [
    `Treatment access in ${county} reflects ${stateName}'s broader pattern: about ${s.overdoseDeathRate.toFixed(1)} drug-overdose deaths per 100,000 residents (CDC), an estimated ${s.samhsaFacilities.toLocaleString()} licensed facilities, and ${s.medicaidExpanded ? "ACA Medicaid expansion in effect" : "no ACA Medicaid expansion"}.`,
    `${count > 0 ? `RehabLookup currently surfaces ${count.toLocaleString()} verified provider${count === 1 ? "" : "s"} serving ${county}.` : `Use the directory below to compare verified facilities near ${county}.`} ${s.signatureNote}`,
  ].join(" ");
}
