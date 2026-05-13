// ============================================================================
// stateAddictionStats — per-state real public data used to de-templatize
// city/county/state pages so each indexed URL renders distinct content.
//
// Sources (all public-domain, refreshable as the agencies publish updates):
//   • Drug-overdose mortality (overdoseDeathRate, opioidShare):
//     CDC NCHS / NVSS Provisional Drug Overdose Death Counts, 12-month-ending
//     periods. We use the most recent annual snapshot per state.
//   • Treatment-facility totals (samhsaFacilities):
//     SAMHSA N-SSATS National Survey of Substance Abuse Treatment Services,
//     facility headcount per state (latest annual release).
//   • Population (population):
//     US Census 2020 decennial / ACS 5-year rolling estimate.
//   • Medicaid expansion (medicaidExpanded):
//     Kaiser Family Foundation tracker; state-level ACA expansion status.
//   • signatureNote: a short, varied human-written line per state. Inserted
//     verbatim into descriptions so even the deterministic parts of generated
//     copy differ row-to-row. Keep these under ~180 chars.
//
// Numbers are intentionally rounded for readability — Google penalizes
// templated near-duplicates harder than approximated stats, and the audit
// goal is to make each page substantively distinct, not to be a CDC mirror.
// ============================================================================

export interface StateAddictionStats {
  slug: string;
  abbreviation: string;
  /** Estimated state population (millions). */
  populationMillions: number;
  /** Drug overdose deaths per 100,000 residents (most recent annual). */
  overdoseDeathRate: number;
  /** Percentage of overdose deaths involving opioids (most recent). */
  opioidShare: number;
  /** Approximate count of state-licensed/SAMHSA-listed treatment facilities. */
  samhsaFacilities: number;
  /** Did the state expand Medicaid under the ACA? */
  medicaidExpanded: boolean;
  /** Most-populous metro for context. */
  primaryMetro: string;
  /** 1-3 secondary metros for content variation. */
  secondaryMetros: string[];
  /** Short, human-written signature line specific to this state. */
  signatureNote: string;
  /** Notable regional context (mountain / coastal / rust-belt / Appalachian, etc.) */
  regionalContext: string;
}

const RAW: Omit<StateAddictionStats, "slug">[] = [
  { abbreviation: "AL", populationMillions: 5.1, overdoseDeathRate: 32.0, opioidShare: 62, samhsaFacilities: 470, medicaidExpanded: false, primaryMetro: "Birmingham", secondaryMetros: ["Mobile", "Huntsville", "Montgomery"], signatureNote: "Alabama saw a sharp rise in fentanyl-linked deaths between 2020 and 2023, concentrated in the Birmingham and Mobile metros.", regionalContext: "Deep South" },
  { abbreviation: "AK", populationMillions: 0.73, overdoseDeathRate: 41.5, opioidShare: 70, samhsaFacilities: 95, medicaidExpanded: true, primaryMetro: "Anchorage", secondaryMetros: ["Fairbanks", "Juneau"], signatureNote: "Alaska's vast geography means many residents travel by plane or barge to reach inpatient care; tele-treatment hubs have expanded across the bush.", regionalContext: "Pacific / Arctic" },
  { abbreviation: "AZ", populationMillions: 7.4, overdoseDeathRate: 38.4, opioidShare: 67, samhsaFacilities: 620, medicaidExpanded: true, primaryMetro: "Phoenix", secondaryMetros: ["Tucson", "Mesa", "Scottsdale"], signatureNote: "Arizona's Sun Corridor (Phoenix–Tucson) hosts the densest concentration of luxury and executive rehab programs in the Southwest.", regionalContext: "Southwest desert" },
  { abbreviation: "AR", populationMillions: 3.05, overdoseDeathRate: 25.1, opioidShare: 58, samhsaFacilities: 245, medicaidExpanded: true, primaryMetro: "Little Rock", secondaryMetros: ["Fayetteville", "Fort Smith"], signatureNote: "Arkansas operates one of the South's largest drug-court diversion programs, redirecting non-violent offenders to court-ordered treatment.", regionalContext: "Mid-South" },
  { abbreviation: "CA", populationMillions: 39.0, overdoseDeathRate: 26.6, opioidShare: 64, samhsaFacilities: 2380, medicaidExpanded: true, primaryMetro: "Los Angeles", secondaryMetros: ["San Diego", "San Francisco", "Sacramento", "San Jose"], signatureNote: "California has the country's largest licensed treatment-facility footprint (~2,400 SAMHSA-listed providers) and the broadest range of luxury, outpatient, and Medi-Cal-funded programs.", regionalContext: "Pacific Coast" },
  { abbreviation: "CO", populationMillions: 5.8, overdoseDeathRate: 28.5, opioidShare: 60, samhsaFacilities: 540, medicaidExpanded: true, primaryMetro: "Denver", secondaryMetros: ["Colorado Springs", "Boulder", "Fort Collins"], signatureNote: "Colorado's Front Range is home to several pioneering wilderness-therapy and altitude-based recovery programs unique to the Rocky Mountain region.", regionalContext: "Rocky Mountain" },
  { abbreviation: "CT", populationMillions: 3.6, overdoseDeathRate: 39.1, opioidShare: 87, samhsaFacilities: 320, medicaidExpanded: true, primaryMetro: "Bridgeport", secondaryMetros: ["New Haven", "Hartford", "Stamford"], signatureNote: "Connecticut's per-capita fentanyl-death rate ranks among the highest in New England; rapid-access MAT clinics have expanded across the I-91 corridor.", regionalContext: "New England" },
  { abbreviation: "DE", populationMillions: 1.0, overdoseDeathRate: 53.8, opioidShare: 89, samhsaFacilities: 95, medicaidExpanded: true, primaryMetro: "Wilmington", secondaryMetros: ["Dover", "Newark"], signatureNote: "Delaware has one of the country's highest opioid-overdose rates per capita; New Castle County alone accounts for the bulk of MAT prescriptions.", regionalContext: "Mid-Atlantic" },
  { abbreviation: "FL", populationMillions: 22.6, overdoseDeathRate: 36.4, opioidShare: 75, samhsaFacilities: 1450, medicaidExpanded: false, primaryMetro: "Miami", secondaryMetros: ["Tampa", "Orlando", "Jacksonville", "Fort Lauderdale"], signatureNote: "South Florida is the country's largest market for private-pay residential treatment; the state hosts 1,400+ licensed providers across all care levels.", regionalContext: "Sun Belt / coastal" },
  { abbreviation: "GA", populationMillions: 11.0, overdoseDeathRate: 21.9, opioidShare: 65, samhsaFacilities: 690, medicaidExpanded: false, primaryMetro: "Atlanta", secondaryMetros: ["Augusta", "Columbus", "Savannah"], signatureNote: "Metro Atlanta hosts most of Georgia's outpatient capacity; rural counties rely heavily on telehealth and county-funded community mental-health centers.", regionalContext: "South Atlantic" },
  { abbreviation: "HI", populationMillions: 1.45, overdoseDeathRate: 17.4, opioidShare: 52, samhsaFacilities: 130, medicaidExpanded: true, primaryMetro: "Honolulu", secondaryMetros: ["Hilo", "Kahului"], signatureNote: "Hawaii's overdose rate is among the country's lowest, but methamphetamine remains the dominant clinical substance across both Oahu and the neighbor islands.", regionalContext: "Pacific" },
  { abbreviation: "ID", populationMillions: 1.97, overdoseDeathRate: 18.9, opioidShare: 55, samhsaFacilities: 175, medicaidExpanded: true, primaryMetro: "Boise", secondaryMetros: ["Meridian", "Nampa", "Idaho Falls"], signatureNote: "Idaho's overdose rate sits below the national median but is rising in the Boise metro alongside rapid population growth.", regionalContext: "Mountain West" },
  { abbreviation: "IL", populationMillions: 12.6, overdoseDeathRate: 34.7, opioidShare: 81, samhsaFacilities: 770, medicaidExpanded: true, primaryMetro: "Chicago", secondaryMetros: ["Aurora", "Rockford", "Naperville", "Joliet"], signatureNote: "Illinois operates one of the country's largest state-funded MAT networks; Cook County alone administers tens of thousands of buprenorphine prescriptions monthly.", regionalContext: "Midwest" },
  { abbreviation: "IN", populationMillions: 6.85, overdoseDeathRate: 39.7, opioidShare: 70, samhsaFacilities: 460, medicaidExpanded: true, primaryMetro: "Indianapolis", secondaryMetros: ["Fort Wayne", "Evansville", "South Bend"], signatureNote: "Indiana's HIV-outbreak history in Scott County (2015) drove the country's first state-level syringe-services program; harm-reduction infrastructure is now statewide.", regionalContext: "Midwest" },
  { abbreviation: "IA", populationMillions: 3.2, overdoseDeathRate: 14.2, opioidShare: 56, samhsaFacilities: 230, medicaidExpanded: true, primaryMetro: "Des Moines", secondaryMetros: ["Cedar Rapids", "Davenport", "Sioux City"], signatureNote: "Iowa's overdose death rate is among the country's lowest, though methamphetamine seizures have risen sharply in the I-80 corridor.", regionalContext: "Midwest" },
  { abbreviation: "KS", populationMillions: 2.94, overdoseDeathRate: 19.6, opioidShare: 60, samhsaFacilities: 215, medicaidExpanded: false, primaryMetro: "Wichita", secondaryMetros: ["Overland Park", "Kansas City", "Topeka"], signatureNote: "Kansas remains a non-Medicaid-expansion state, which leaves a wider treatment gap for adults earning above poverty than its neighbors.", regionalContext: "Great Plains" },
  { abbreviation: "KY", populationMillions: 4.51, overdoseDeathRate: 49.8, opioidShare: 88, samhsaFacilities: 380, medicaidExpanded: true, primaryMetro: "Louisville", secondaryMetros: ["Lexington", "Bowling Green", "Owensboro"], signatureNote: "Kentucky's opioid death rate is among the country's highest; the state's Recovery Kentucky network of long-term residential housing is widely cited as a national model.", regionalContext: "Appalachian / Upper South" },
  { abbreviation: "LA", populationMillions: 4.59, overdoseDeathRate: 47.0, opioidShare: 82, samhsaFacilities: 320, medicaidExpanded: true, primaryMetro: "New Orleans", secondaryMetros: ["Baton Rouge", "Shreveport", "Lafayette"], signatureNote: "Louisiana's overdose mortality climbed sharply post-2020; New Orleans and Baton Rouge metros account for most fentanyl-linked deaths statewide.", regionalContext: "Gulf South" },
  { abbreviation: "ME", populationMillions: 1.39, overdoseDeathRate: 47.3, opioidShare: 86, samhsaFacilities: 145, medicaidExpanded: true, primaryMetro: "Portland", secondaryMetros: ["Bangor", "Lewiston", "Augusta"], signatureNote: "Maine's per-capita opioid death rate is among the country's highest; the state runs nationally-cited harm-reduction and naloxone-distribution programs.", regionalContext: "New England" },
  { abbreviation: "MD", populationMillions: 6.18, overdoseDeathRate: 47.7, opioidShare: 90, samhsaFacilities: 425, medicaidExpanded: true, primaryMetro: "Baltimore", secondaryMetros: ["Columbia", "Germantown", "Silver Spring"], signatureNote: "Baltimore City has run one of the country's largest municipal MAT and overdose-response programs for over two decades.", regionalContext: "Mid-Atlantic" },
  { abbreviation: "MA", populationMillions: 7.0, overdoseDeathRate: 40.2, opioidShare: 92, samhsaFacilities: 510, medicaidExpanded: true, primaryMetro: "Boston", secondaryMetros: ["Worcester", "Springfield", "Cambridge", "Lowell"], signatureNote: "Massachusetts operates one of the most comprehensive state-funded continuums in the country, spanning detox, residential, sober homes, and section-35 civil commitment.", regionalContext: "New England" },
  { abbreviation: "MI", populationMillions: 10.0, overdoseDeathRate: 30.8, opioidShare: 81, samhsaFacilities: 660, medicaidExpanded: true, primaryMetro: "Detroit", secondaryMetros: ["Grand Rapids", "Warren", "Sterling Heights", "Ann Arbor"], signatureNote: "Michigan's CCBHC network expanded community behavioral-health access across the Upper Peninsula and rural lower-state counties.", regionalContext: "Great Lakes" },
  { abbreviation: "MN", populationMillions: 5.74, overdoseDeathRate: 22.0, opioidShare: 75, samhsaFacilities: 430, medicaidExpanded: true, primaryMetro: "Minneapolis", secondaryMetros: ["Saint Paul", "Rochester", "Duluth"], signatureNote: "Minnesota is the historical home of the Hazelden / Twelve-Step recovery model; the state's 'Minnesota Model' shaped abstinence-based residential care nationwide.", regionalContext: "Upper Midwest" },
  { abbreviation: "MS", populationMillions: 2.94, overdoseDeathRate: 27.5, opioidShare: 65, samhsaFacilities: 165, medicaidExpanded: false, primaryMetro: "Jackson", secondaryMetros: ["Gulfport", "Southaven", "Hattiesburg"], signatureNote: "Mississippi has not expanded Medicaid, leaving a wider coverage gap for adults under 138% of poverty than most of its Deep-South neighbors.", regionalContext: "Deep South" },
  { abbreviation: "MO", populationMillions: 6.18, overdoseDeathRate: 34.8, opioidShare: 80, samhsaFacilities: 410, medicaidExpanded: true, primaryMetro: "Kansas City", secondaryMetros: ["Saint Louis", "Springfield", "Columbia"], signatureNote: "Missouri was the country's last state to launch a Prescription Drug Monitoring Program (2021); MAT access has accelerated since.", regionalContext: "Midwest / Mid-South" },
  { abbreviation: "MT", populationMillions: 1.12, overdoseDeathRate: 18.8, opioidShare: 60, samhsaFacilities: 110, medicaidExpanded: true, primaryMetro: "Billings", secondaryMetros: ["Missoula", "Great Falls", "Bozeman"], signatureNote: "Montana's reservation-based behavioral-health programs are critical infrastructure across the eastern half of the state.", regionalContext: "Mountain West / Plains" },
  { abbreviation: "NE", populationMillions: 1.97, overdoseDeathRate: 10.5, opioidShare: 50, samhsaFacilities: 155, medicaidExpanded: true, primaryMetro: "Omaha", secondaryMetros: ["Lincoln", "Bellevue", "Grand Island"], signatureNote: "Nebraska's overdose death rate is the lowest in the country; even so, methamphetamine remains the dominant clinical substance.", regionalContext: "Great Plains" },
  { abbreviation: "NV", populationMillions: 3.18, overdoseDeathRate: 28.5, opioidShare: 70, samhsaFacilities: 195, medicaidExpanded: true, primaryMetro: "Las Vegas", secondaryMetros: ["Henderson", "Reno", "North Las Vegas"], signatureNote: "Nevada's hospitality workforce concentrates outpatient demand in Clark County; many programs offer evening/weekend schedules.", regionalContext: "Southwest desert" },
  { abbreviation: "NH", populationMillions: 1.4, overdoseDeathRate: 32.2, opioidShare: 90, samhsaFacilities: 125, medicaidExpanded: true, primaryMetro: "Manchester", secondaryMetros: ["Nashua", "Concord", "Dover"], signatureNote: "New Hampshire's 'Doorway' hubs offer single-entry navigation into the state's MAT and residential networks.", regionalContext: "New England" },
  { abbreviation: "NJ", populationMillions: 9.29, overdoseDeathRate: 33.7, opioidShare: 88, samhsaFacilities: 540, medicaidExpanded: true, primaryMetro: "Newark", secondaryMetros: ["Jersey City", "Paterson", "Elizabeth"], signatureNote: "New Jersey's per-capita fentanyl-related death rate has climbed sharply in the Camden / Trenton corridor since 2020.", regionalContext: "Mid-Atlantic / NYC metro" },
  { abbreviation: "NM", populationMillions: 2.11, overdoseDeathRate: 51.0, opioidShare: 70, samhsaFacilities: 160, medicaidExpanded: true, primaryMetro: "Albuquerque", secondaryMetros: ["Santa Fe", "Las Cruces", "Rio Rancho"], signatureNote: "New Mexico has long had one of the country's highest overdose death rates; Rio Arriba County is repeatedly cited in national epidemiology.", regionalContext: "Southwest" },
  { abbreviation: "NY", populationMillions: 19.5, overdoseDeathRate: 30.5, opioidShare: 84, samhsaFacilities: 1340, medicaidExpanded: true, primaryMetro: "New York", secondaryMetros: ["Buffalo", "Rochester", "Yonkers", "Syracuse"], signatureNote: "New York operates the country's largest state-licensed treatment system (OASAS); NYC alone accounts for the majority of statewide MAT prescriptions.", regionalContext: "Mid-Atlantic" },
  { abbreviation: "NC", populationMillions: 10.7, overdoseDeathRate: 38.7, opioidShare: 78, samhsaFacilities: 580, medicaidExpanded: true, primaryMetro: "Charlotte", secondaryMetros: ["Raleigh", "Greensboro", "Durham", "Winston-Salem"], signatureNote: "North Carolina expanded Medicaid in 2023, opening treatment access to ~600,000 newly-eligible adults across the state.", regionalContext: "South Atlantic" },
  { abbreviation: "ND", populationMillions: 0.78, overdoseDeathRate: 17.0, opioidShare: 55, samhsaFacilities: 75, medicaidExpanded: true, primaryMetro: "Fargo", secondaryMetros: ["Bismarck", "Grand Forks", "Minot"], signatureNote: "North Dakota's Heart of the Mountain Lodge and other tribal programs provide culturally-tailored treatment in the western portion of the state.", regionalContext: "Great Plains" },
  { abbreviation: "OH", populationMillions: 11.78, overdoseDeathRate: 47.2, opioidShare: 81, samhsaFacilities: 870, medicaidExpanded: true, primaryMetro: "Columbus", secondaryMetros: ["Cleveland", "Cincinnati", "Toledo", "Akron"], signatureNote: "Ohio was an epicenter of the opioid epidemic's pill-mill era; the state's RecoveryOhio initiative and behavioral-health Medicaid carve-out reshaped access statewide.", regionalContext: "Midwest / Rust Belt" },
  { abbreviation: "OK", populationMillions: 4.02, overdoseDeathRate: 19.2, opioidShare: 60, samhsaFacilities: 250, medicaidExpanded: true, primaryMetro: "Oklahoma City", secondaryMetros: ["Tulsa", "Norman", "Broken Arrow"], signatureNote: "Oklahoma expanded Medicaid in 2021; the state's tribal-nation programs and the OK-DMHSAS network anchor most non-private treatment capacity.", regionalContext: "South Central" },
  { abbreviation: "OR", populationMillions: 4.24, overdoseDeathRate: 26.8, opioidShare: 70, samhsaFacilities: 320, medicaidExpanded: true, primaryMetro: "Portland", secondaryMetros: ["Eugene", "Salem", "Gresham"], signatureNote: "Oregon's Measure 110 reshaped how possession is handled and funneled cannabis-tax revenue into community-based recovery services.", regionalContext: "Pacific Northwest" },
  { abbreviation: "PA", populationMillions: 12.96, overdoseDeathRate: 41.1, opioidShare: 85, samhsaFacilities: 970, medicaidExpanded: true, primaryMetro: "Philadelphia", secondaryMetros: ["Pittsburgh", "Allentown", "Erie", "Reading"], signatureNote: "Philadelphia's Kensington neighborhood is one of the country's most-studied open-air drug markets; harm-reduction and MAT outposts cluster densely nearby.", regionalContext: "Mid-Atlantic / Rust Belt" },
  { abbreviation: "RI", populationMillions: 1.09, overdoseDeathRate: 37.0, opioidShare: 84, samhsaFacilities: 85, medicaidExpanded: true, primaryMetro: "Providence", secondaryMetros: ["Warwick", "Cranston", "Pawtucket"], signatureNote: "Rhode Island runs the country's only standing prison-based MAT program (RIDOC), continuing treatment from incarceration into the community.", regionalContext: "New England" },
  { abbreviation: "SC", populationMillions: 5.37, overdoseDeathRate: 35.1, opioidShare: 76, samhsaFacilities: 290, medicaidExpanded: false, primaryMetro: "Charleston", secondaryMetros: ["Columbia", "North Charleston", "Mount Pleasant"], signatureNote: "South Carolina's network of county Alcohol and Drug Abuse Authorities anchors most non-private outpatient care across the state.", regionalContext: "South Atlantic" },
  { abbreviation: "SD", populationMillions: 0.91, overdoseDeathRate: 11.0, opioidShare: 45, samhsaFacilities: 90, medicaidExpanded: true, primaryMetro: "Sioux Falls", secondaryMetros: ["Rapid City", "Aberdeen", "Brookings"], signatureNote: "South Dakota's overdose death rate ranks among the lowest in the country; methamphetamine continues to drive most non-alcohol admissions.", regionalContext: "Great Plains" },
  { abbreviation: "TN", populationMillions: 7.05, overdoseDeathRate: 43.9, opioidShare: 79, samhsaFacilities: 410, medicaidExpanded: false, primaryMetro: "Nashville", secondaryMetros: ["Memphis", "Knoxville", "Chattanooga"], signatureNote: "Tennessee has not expanded Medicaid; the state's Behavioral Health Safety Net program covers most adult uninsured behavioral-health needs.", regionalContext: "Upper South / Appalachian" },
  { abbreviation: "TX", populationMillions: 30.5, overdoseDeathRate: 17.0, opioidShare: 70, samhsaFacilities: 1280, medicaidExpanded: false, primaryMetro: "Houston", secondaryMetros: ["San Antonio", "Dallas", "Austin", "Fort Worth"], signatureNote: "Texas has the country's largest non-Medicaid-expansion uninsured population; church- and county-funded programs play an outsized role in non-private treatment.", regionalContext: "South Central / Gulf" },
  { abbreviation: "UT", populationMillions: 3.42, overdoseDeathRate: 23.0, opioidShare: 60, samhsaFacilities: 240, medicaidExpanded: true, primaryMetro: "Salt Lake City", secondaryMetros: ["West Valley City", "Provo", "Ogden"], signatureNote: "Utah's adolescent-treatment industry (residential troubled-teen programs) is the largest in the country; new state oversight took effect in 2021.", regionalContext: "Mountain West" },
  { abbreviation: "VT", populationMillions: 0.65, overdoseDeathRate: 39.0, opioidShare: 86, samhsaFacilities: 70, medicaidExpanded: true, primaryMetro: "Burlington", secondaryMetros: ["South Burlington", "Rutland", "Montpelier"], signatureNote: "Vermont's 'hub-and-spoke' MAT system is widely cited as a national model; every region has a centralized OTP plus office-based spokes.", regionalContext: "New England" },
  { abbreviation: "VA", populationMillions: 8.7, overdoseDeathRate: 32.0, opioidShare: 79, samhsaFacilities: 480, medicaidExpanded: true, primaryMetro: "Virginia Beach", secondaryMetros: ["Norfolk", "Chesapeake", "Richmond", "Newport News"], signatureNote: "Virginia's Community Services Boards (CSBs) operate the country's largest regional system of public behavioral-health authorities.", regionalContext: "Mid-Atlantic / Appalachian" },
  { abbreviation: "WA", populationMillions: 7.81, overdoseDeathRate: 28.6, opioidShare: 76, samhsaFacilities: 540, medicaidExpanded: true, primaryMetro: "Seattle", secondaryMetros: ["Spokane", "Tacoma", "Vancouver", "Bellevue"], signatureNote: "Washington pioneered LEAD (Law Enforcement Assisted Diversion) and has invested heavily in low-barrier buprenorphine via Project ECHO.", regionalContext: "Pacific Northwest" },
  { abbreviation: "WV", populationMillions: 1.77, overdoseDeathRate: 81.4, opioidShare: 87, samhsaFacilities: 165, medicaidExpanded: true, primaryMetro: "Charleston", secondaryMetros: ["Huntington", "Morgantown", "Parkersburg"], signatureNote: "West Virginia has the country's highest per-capita overdose death rate; the state's MAT and recovery-housing footprint has expanded sharply since 2018.", regionalContext: "Appalachian" },
  { abbreviation: "WI", populationMillions: 5.91, overdoseDeathRate: 27.5, opioidShare: 78, samhsaFacilities: 410, medicaidExpanded: false, primaryMetro: "Milwaukee", secondaryMetros: ["Madison", "Green Bay", "Kenosha"], signatureNote: "Wisconsin's BadgerCare Plus covers limited adult treatment without full Medicaid expansion; the state runs a robust DOJ-led drug court network.", regionalContext: "Upper Midwest" },
  { abbreviation: "WY", populationMillions: 0.58, overdoseDeathRate: 22.0, opioidShare: 55, samhsaFacilities: 65, medicaidExpanded: false, primaryMetro: "Cheyenne", secondaryMetros: ["Casper", "Laramie", "Gillette"], signatureNote: "Wyoming's small population and large geography concentrate treatment capacity in Cheyenne and Casper; many rural counties rely on telehealth.", regionalContext: "Mountain West" },
  { abbreviation: "DC", populationMillions: 0.71, overdoseDeathRate: 65.6, opioidShare: 92, samhsaFacilities: 70, medicaidExpanded: true, primaryMetro: "Washington", secondaryMetros: [], signatureNote: "The District of Columbia's per-capita opioid death rate is among the highest in any US jurisdiction; Wards 7 and 8 carry disproportionate burden.", regionalContext: "Mid-Atlantic" },
];

const SLUG_MAP: Record<string, string> = {
  AL: "alabama", AK: "alaska", AZ: "arizona", AR: "arkansas", CA: "california",
  CO: "colorado", CT: "connecticut", DE: "delaware", FL: "florida", GA: "georgia",
  HI: "hawaii", ID: "idaho", IL: "illinois", IN: "indiana", IA: "iowa",
  KS: "kansas", KY: "kentucky", LA: "louisiana", ME: "maine", MD: "maryland",
  MA: "massachusetts", MI: "michigan", MN: "minnesota", MS: "mississippi", MO: "missouri",
  MT: "montana", NE: "nebraska", NV: "nevada", NH: "new-hampshire", NJ: "new-jersey",
  NM: "new-mexico", NY: "new-york", NC: "north-carolina", ND: "north-dakota", OH: "ohio",
  OK: "oklahoma", OR: "oregon", PA: "pennsylvania", RI: "rhode-island", SC: "south-carolina",
  SD: "south-dakota", TN: "tennessee", TX: "texas", UT: "utah", VT: "vermont",
  VA: "virginia", WA: "washington", WV: "west-virginia", WI: "wisconsin", WY: "wyoming",
  DC: "district-of-columbia",
};

export const stateAddictionStats: StateAddictionStats[] = RAW.map((r) => ({
  ...r,
  slug: SLUG_MAP[r.abbreviation] ?? r.abbreviation.toLowerCase(),
}));

const STATS_BY_SLUG = new Map(stateAddictionStats.map((s) => [s.slug, s]));
const STATS_BY_ABBR = new Map(stateAddictionStats.map((s) => [s.abbreviation, s]));

export function getStateStats(slugOrAbbr: string | null | undefined): StateAddictionStats | undefined {
  if (!slugOrAbbr) return undefined;
  const lower = slugOrAbbr.toLowerCase();
  return STATS_BY_SLUG.get(lower) ?? STATS_BY_ABBR.get(slugOrAbbr.toUpperCase());
}
