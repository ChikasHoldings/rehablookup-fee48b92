// ============================================================
// Insurance + State Cross-Page Configuration
// Generates ~450 high-value compound keyword pages
// ============================================================

export interface InsurerConfig {
  slug: string;
  name: string;
  mainPagePath: string;
}

export interface StateInsuranceConfig {
  slug: string;
  state: string;
  stateAbbr: string;
  medicaidExpanded: boolean;
  notableInfo: string;
}

export const insurerConfigs: InsurerConfig[] = [
  { slug: "aetna-rehab", name: "Aetna", mainPagePath: "aetna-rehab" },
  { slug: "bcbs-treatment", name: "Blue Cross Blue Shield", mainPagePath: "bcbs-treatment" },
  { slug: "cigna-rehab", name: "Cigna", mainPagePath: "cigna-rehab" },
  { slug: "united-healthcare-rehab", name: "UnitedHealthcare", mainPagePath: "united-healthcare-rehab" },
  { slug: "humana-rehab", name: "Humana", mainPagePath: "humana-rehab" },
  { slug: "kaiser-rehab", name: "Kaiser Permanente", mainPagePath: "kaiser-rehab" },
  { slug: "medicare-rehab", name: "Medicare", mainPagePath: "medicare-rehab" },
  { slug: "medicaid-rehab", name: "Medicaid", mainPagePath: "medicaid-rehab" },
  { slug: "anthem-rehab", name: "Anthem", mainPagePath: "anthem-rehab" },
  { slug: "tricare-rehab", name: "TRICARE", mainPagePath: "tricare-rehab" },
  { slug: "molina-rehab", name: "Molina Healthcare", mainPagePath: "molina-rehab" },
  { slug: "magellan-rehab", name: "Magellan Health", mainPagePath: "magellan-rehab" },
  { slug: "wellcare-rehab", name: "WellCare", mainPagePath: "wellcare-rehab" },
  { slug: "ambetter-rehab", name: "Ambetter", mainPagePath: "ambetter-rehab" },
  { slug: "oscar-rehab", name: "Oscar Health", mainPagePath: "oscar-rehab" },
  { slug: "highmark-rehab", name: "Highmark", mainPagePath: "highmark-rehab" },
];

export const stateInsuranceConfigs: StateInsuranceConfig[] = [
  { slug: "alabama", state: "Alabama", stateAbbr: "AL", medicaidExpanded: true, notableInfo: "Alabama expanded Medicaid in 2024, broadening treatment access. The state has treatment facilities concentrated in Birmingham, Montgomery, and Mobile metro areas." },
  { slug: "alaska", state: "Alaska", stateAbbr: "AK", medicaidExpanded: true, notableInfo: "Alaska expanded Medicaid and provides behavioral health treatment through tribal health organizations and state-funded programs, particularly serving rural and indigenous communities." },
  { slug: "arizona", state: "Arizona", stateAbbr: "AZ", medicaidExpanded: true, notableInfo: "Arizona was an early Medicaid expansion state and offers comprehensive behavioral health coverage through AHCCCS. The state is known for luxury and holistic treatment programs in Scottsdale and Sedona." },
  { slug: "arkansas", state: "Arkansas", stateAbbr: "AR", medicaidExpanded: true, notableInfo: "Arkansas uses a private option Medicaid expansion model, providing premium assistance for qualified individuals to purchase marketplace plans that cover substance abuse treatment." },
  { slug: "california", state: "California", stateAbbr: "CA", medicaidExpanded: true, notableInfo: "California's Medi-Cal program provides extensive substance abuse coverage. The state has the nation's highest concentration of treatment facilities, particularly in Southern California and the San Francisco Bay Area." },
  { slug: "colorado", state: "Colorado", stateAbbr: "CO", medicaidExpanded: true, notableInfo: "Colorado expanded Medicaid and provides strong addiction treatment coverage. The state is known for wilderness therapy, adventure-based recovery, and holistic treatment approaches centered around Boulder and Denver." },
  { slug: "connecticut", state: "Connecticut", stateAbbr: "CT", medicaidExpanded: true, notableInfo: "Connecticut has strong mental health parity enforcement and expanded Medicaid coverage. The state's Department of Mental Health and Addiction Services oversees a comprehensive network of treatment providers." },
  { slug: "delaware", state: "Delaware", stateAbbr: "DE", medicaidExpanded: true, notableInfo: "Delaware expanded Medicaid and has invested in expanding treatment access through its Division of Substance Abuse and Mental Health. The state provides comprehensive coverage for all levels of addiction care." },
  { slug: "florida", state: "Florida", stateAbbr: "FL", medicaidExpanded: false, notableInfo: "Florida is a premier treatment destination with hundreds of accredited facilities, particularly in South Florida (Delray Beach, Fort Lauderdale, Palm Beach County). The state's Marchman Act allows involuntary assessment and treatment." },
  { slug: "georgia", state: "Georgia", stateAbbr: "GA", medicaidExpanded: false, notableInfo: "Georgia has significant treatment resources in the Atlanta metro area and coastal regions. The state's Department of Behavioral Health and Developmental Disabilities coordinates public treatment services." },
  { slug: "hawaii", state: "Hawaii", stateAbbr: "HI", medicaidExpanded: true, notableInfo: "Hawaii expanded Medicaid and offers treatment programs that incorporate indigenous healing practices. The state's unique geographic setting provides therapeutic environments for recovery." },
  { slug: "idaho", state: "Idaho", stateAbbr: "ID", medicaidExpanded: true, notableInfo: "Idaho expanded Medicaid via ballot initiative and has been growing its treatment infrastructure. The state offers outdoor and adventure-based therapy programs alongside traditional treatment approaches." },
  { slug: "illinois", state: "Illinois", stateAbbr: "IL", medicaidExpanded: true, notableInfo: "Illinois expanded Medicaid and provides comprehensive substance abuse treatment coverage. Chicago and suburban areas have high concentrations of accredited treatment facilities offering all levels of care." },
  { slug: "indiana", state: "Indiana", stateAbbr: "IN", medicaidExpanded: true, notableInfo: "Indiana's HIP 2.0 Medicaid expansion covers addiction treatment. The state has prioritized opioid treatment access and MAT programs, especially in Indianapolis and surrounding counties." },
  { slug: "iowa", state: "Iowa", stateAbbr: "IA", medicaidExpanded: true, notableInfo: "Iowa expanded Medicaid through its Iowa Health and Wellness Plan. The state offers treatment facilities across Des Moines, Cedar Rapids, and other metro areas with growing access to MAT services." },
  { slug: "kansas", state: "Kansas", stateAbbr: "KS", medicaidExpanded: false, notableInfo: "Kansas has treatment centers concentrated in Kansas City, Wichita, and Topeka. The state funds addiction treatment through its Behavioral Health Services Commission and federal block grants." },
  { slug: "kentucky", state: "Kentucky", stateAbbr: "KY", medicaidExpanded: true, notableInfo: "Kentucky expanded Medicaid and has significantly increased treatment access in response to the opioid epidemic. The state's Casey's Law allows family members to petition for involuntary treatment." },
  { slug: "louisiana", state: "Louisiana", stateAbbr: "LA", medicaidExpanded: true, notableInfo: "Louisiana expanded Medicaid in 2016, dramatically increasing treatment access. The state's Office of Behavioral Health coordinates substance abuse services across all parishes." },
  { slug: "maine", state: "Maine", stateAbbr: "ME", medicaidExpanded: true, notableInfo: "Maine expanded Medicaid and has invested in expanding MAT access statewide. The state offers both traditional and holistic treatment approaches, including programs in therapeutic coastal settings." },
  { slug: "maryland", state: "Maryland", stateAbbr: "MD", medicaidExpanded: true, notableInfo: "Maryland expanded Medicaid and has strong mental health parity laws. The Baltimore metro area and suburban DC regions have high concentrations of accredited treatment providers." },
  { slug: "massachusetts", state: "Massachusetts", stateAbbr: "MA", medicaidExpanded: true, notableInfo: "Massachusetts has some of the nation's strongest addiction treatment laws, including Section 35 for involuntary commitment. The state's MassHealth program provides comprehensive substance abuse coverage." },
  { slug: "michigan", state: "Michigan", stateAbbr: "MI", medicaidExpanded: true, notableInfo: "Michigan's Healthy Michigan Plan covers addiction treatment. The state has extensive treatment resources in the Detroit, Grand Rapids, and Ann Arbor metro areas." },
  { slug: "minnesota", state: "Minnesota", stateAbbr: "MN", medicaidExpanded: true, notableInfo: "Minnesota was an early Medicaid expansion state with comprehensive behavioral health coverage. The Hazelden Betty Ford Foundation, headquartered in Center City, is one of the nation's most recognized treatment organizations." },
  { slug: "mississippi", state: "Mississippi", stateAbbr: "MS", medicaidExpanded: false, notableInfo: "Mississippi funds treatment through the Department of Mental Health and federal grants. Treatment facilities are concentrated in Jackson, Gulfport, and other metro areas across the state." },
  { slug: "missouri", state: "Missouri", stateAbbr: "MO", medicaidExpanded: true, notableInfo: "Missouri expanded Medicaid in 2021. The state has treatment centers across St. Louis, Kansas City, and Springfield, with growing investment in MAT and recovery support services." },
  { slug: "montana", state: "Montana", stateAbbr: "MT", medicaidExpanded: true, notableInfo: "Montana expanded Medicaid and offers treatment programs including wilderness therapy. The state's HELP Act provides coverage for addiction treatment for qualifying low-income residents." },
  { slug: "nebraska", state: "Nebraska", stateAbbr: "NE", medicaidExpanded: true, notableInfo: "Nebraska expanded Medicaid via ballot initiative. Treatment facilities are concentrated in Omaha and Lincoln, with telehealth expanding access to rural communities." },
  { slug: "nevada", state: "Nevada", stateAbbr: "NV", medicaidExpanded: true, notableInfo: "Nevada expanded Medicaid and has treatment facilities concentrated in Las Vegas and Reno. The state has invested in expanding MAT access and recovery support services." },
  { slug: "new-hampshire", state: "New Hampshire", stateAbbr: "NH", medicaidExpanded: true, notableInfo: "New Hampshire expanded Medicaid and has been proactive in addressing the opioid epidemic. The state offers treatment programs in therapeutic New England settings." },
  { slug: "new-jersey", state: "New Jersey", stateAbbr: "NJ", medicaidExpanded: true, notableInfo: "New Jersey expanded Medicaid and has strong treatment infrastructure across the state. The state's Division of Mental Health and Addiction Services oversees comprehensive treatment programs." },
  { slug: "new-mexico", state: "New Mexico", stateAbbr: "NM", medicaidExpanded: true, notableInfo: "New Mexico expanded Medicaid and provides treatment access including culturally sensitive programs for Native American communities. Albuquerque and Santa Fe have the highest concentration of facilities." },
  { slug: "new-york", state: "New York", stateAbbr: "NY", medicaidExpanded: true, notableInfo: "New York provides robust Medicaid coverage for addiction treatment and has strong parity enforcement. The state's Office of Addiction Services and Supports (OASAS) licenses and monitors treatment facilities statewide." },
  { slug: "north-carolina", state: "North Carolina", stateAbbr: "NC", medicaidExpanded: true, notableInfo: "North Carolina expanded Medicaid in 2023, significantly increasing treatment access. The state has treatment facilities across Charlotte, Raleigh, and Asheville metro areas." },
  { slug: "north-dakota", state: "North Dakota", stateAbbr: "ND", medicaidExpanded: true, notableInfo: "North Dakota expanded Medicaid and provides behavioral health treatment through its Department of Human Services. Treatment facilities serve communities in Fargo, Bismarck, and Grand Forks." },
  { slug: "ohio", state: "Ohio", stateAbbr: "OH", medicaidExpanded: true, notableInfo: "Ohio, heavily impacted by the opioid epidemic, has significantly expanded treatment access through Medicaid expansion and state-funded initiatives. The state prioritizes MAT access and has invested heavily in recovery infrastructure." },
  { slug: "oklahoma", state: "Oklahoma", stateAbbr: "OK", medicaidExpanded: true, notableInfo: "Oklahoma expanded Medicaid via ballot initiative. The state's Department of Mental Health and Substance Abuse Services coordinates treatment access across Oklahoma City, Tulsa, and rural areas." },
  { slug: "oregon", state: "Oregon", stateAbbr: "OR", medicaidExpanded: true, notableInfo: "Oregon expanded Medicaid and passed Measure 110, decriminalizing personal drug possession and investing in treatment services. Portland and Eugene have the highest concentration of facilities." },
  { slug: "pennsylvania", state: "Pennsylvania", stateAbbr: "PA", medicaidExpanded: true, notableInfo: "Pennsylvania expanded Medicaid and has strengthened addiction treatment access in response to the opioid crisis. The state's Department of Drug and Alcohol Programs coordinates treatment services across all 67 counties." },
  { slug: "rhode-island", state: "Rhode Island", stateAbbr: "RI", medicaidExpanded: true, notableInfo: "Rhode Island expanded Medicaid and has pioneered treatment access in correctional settings. The state's comprehensive addiction treatment system serves the Providence metro and statewide." },
  { slug: "south-carolina", state: "South Carolina", stateAbbr: "SC", medicaidExpanded: false, notableInfo: "South Carolina funds addiction treatment through its Department of Alcohol and Other Drug Abuse Services. Treatment facilities are available in Charleston, Columbia, and Greenville metro areas." },
  { slug: "south-dakota", state: "South Dakota", stateAbbr: "SD", medicaidExpanded: true, notableInfo: "South Dakota expanded Medicaid via ballot initiative in 2023. Treatment services are available in Sioux Falls, Rapid City, and through tribal health programs." },
  { slug: "tennessee", state: "Tennessee", stateAbbr: "TN", medicaidExpanded: false, notableInfo: "Tennessee's TennCare program provides addiction treatment coverage for qualifying residents. Nashville, Memphis, and Knoxville have significant treatment infrastructure." },
  { slug: "texas", state: "Texas", stateAbbr: "TX", medicaidExpanded: false, notableInfo: "Texas has numerous treatment options across major metros including Houston, Dallas, Austin, and San Antonio. While Texas has not expanded Medicaid, the state funds treatment programs through its Health and Human Services Commission." },
  { slug: "utah", state: "Utah", stateAbbr: "UT", medicaidExpanded: true, notableInfo: "Utah expanded Medicaid and offers treatment programs including wilderness therapy and adventure-based recovery. Salt Lake City and surrounding areas have the highest concentration of facilities." },
  { slug: "vermont", state: "Vermont", stateAbbr: "VT", medicaidExpanded: true, notableInfo: "Vermont expanded Medicaid and pioneered the hub-and-spoke model for opioid treatment access, connecting specialized treatment hubs with community-based spoke sites statewide." },
  { slug: "virginia", state: "Virginia", stateAbbr: "VA", medicaidExpanded: true, notableInfo: "Virginia expanded Medicaid in 2019. The state has treatment facilities across Northern Virginia, Richmond, Hampton Roads, and Charlottesville, with growing investment in MAT programs." },
  { slug: "washington", state: "Washington", stateAbbr: "WA", medicaidExpanded: true, notableInfo: "Washington expanded Medicaid through Apple Health and has strong behavioral health integration. Seattle, Tacoma, and Spokane have extensive treatment networks." },
  { slug: "west-virginia", state: "West Virginia", stateAbbr: "WV", medicaidExpanded: true, notableInfo: "West Virginia expanded Medicaid and has been one of the states most impacted by the opioid crisis. The state has significantly invested in expanding treatment access and MAT programs." },
  { slug: "wisconsin", state: "Wisconsin", stateAbbr: "WI", medicaidExpanded: false, notableInfo: "Wisconsin provides BadgerCare coverage that includes addiction treatment services. Milwaukee, Madison, and Green Bay have the highest concentration of treatment facilities." },
  { slug: "wyoming", state: "Wyoming", stateAbbr: "WY", medicaidExpanded: false, notableInfo: "Wyoming funds addiction treatment through the Department of Health's Behavioral Health Division. The state offers treatment programs in Cheyenne, Casper, and through telehealth services for rural communities." },
];

// Generate all insurance+state path combinations for sitemap/routing
export const insuranceStateConfigs = insurerConfigs.flatMap((insurer) =>
  stateInsuranceConfigs.map((state) => ({
    insurerSlug: insurer.slug,
    stateSlug: state.slug,
    path: `/insurance/${insurer.slug}/${state.slug}`,
  }))
);

// Insurer-specific coverage details for content variation
const insurerCoverageDetails: Record<string, { networkSize: string; specialNote: string; denialTip: string }> = {
  Aetna: { networkSize: "one of the nation's largest behavioral health networks", specialNote: "Aetna's Behavioral Health division offers a dedicated substance use disorder care management team", denialTip: "Aetna provides an expedited appeals process for urgent treatment needs" },
  "Blue Cross Blue Shield": { networkSize: "the largest provider network in the US with 36 independent companies", specialNote: "BCBS coverage varies significantly between Blue Cross Blue Shield affiliates — verify your specific plan", denialTip: "BCBS affiliates have dedicated member advocates who can assist with appeals" },
  Cigna: { networkSize: "extensive national and international provider networks", specialNote: "Cigna's Evernorth behavioral health division manages specialized addiction treatment pathways", denialTip: "Cigna offers independent external review through MAXIMUS Federal Services" },
  UnitedHealthcare: { networkSize: "the nation's largest insurance carrier by enrollment", specialNote: "UHC's Optum behavioral health network manages treatment authorizations for most UnitedHealthcare plans", denialTip: "UnitedHealthcare allows expedited concurrent reviews for patients already in treatment" },
  Humana: { networkSize: "strong networks particularly in the Southeast and military communities", specialNote: "Humana offers specialized behavioral health programs through its Humana Behavioral Health division", denialTip: "Humana's grievance process includes clinical peer-to-peer review options" },
  "Kaiser Permanente": { networkSize: "integrated health system in 8 states and DC", specialNote: "Kaiser's integrated model means treatment is coordinated between primary care, psychiatry, and addiction medicine under one roof", denialTip: "Kaiser members can request an independent medical review through their state's Department of Managed Health Care" },
  Medicare: { networkSize: "accepted by the vast majority of licensed treatment facilities", specialNote: "Medicare Part A covers inpatient treatment, Part B covers outpatient, and Part D covers MAT medications like Suboxone", denialTip: "Medicare appeals go through a five-level process starting with redetermination by a Medicare Administrative Contractor" },
  Medicaid: { networkSize: "state-managed with varying provider networks", specialNote: "Medicaid coverage for substance use treatment varies by state — expansion states provide broader benefits", denialTip: "Medicaid fair hearing rights allow you to appeal any coverage denial at the state level" },
  Anthem: { networkSize: "serves over 45 million members through its Blue Cross Blue Shield affiliates", specialNote: "Anthem's behavioral health coverage includes its LiveHealth Online platform for virtual addiction counseling", denialTip: "Anthem offers a two-level internal appeals process before external review" },
  TRICARE: { networkSize: "serves 9.6 million military beneficiaries worldwide", specialNote: "TRICARE covers substance use treatment including residential care — active duty members can access programs through military treatment facilities", denialTip: "TRICARE beneficiaries can file formal appeals through the TRICARE Managerial Activity" },
  "Molina Healthcare": { networkSize: "serves Medicaid and Medicare populations in 19 states", specialNote: "Molina specializes in government-sponsored healthcare and provides comprehensive behavioral health coverage for qualifying members", denialTip: "Molina follows state Medicaid fair hearing requirements for treatment denials" },
  "Magellan Health": { networkSize: "manages behavioral health for employers and government agencies", specialNote: "Magellan Health often serves as the behavioral health carve-out for other insurance carriers", denialTip: "Magellan provides peer-to-peer clinical reviews and offers expedited appeal processes" },
  WellCare: { networkSize: "serves Medicaid, Medicare Advantage, and PDP populations", specialNote: "WellCare offers care management programs that coordinate addiction treatment with primary care", denialTip: "WellCare follows CMS appeal guidelines for Medicare Advantage and state rules for Medicaid" },
  Ambetter: { networkSize: "marketplace plans available in 27 states", specialNote: "Ambetter marketplace plans include essential health benefits covering substance use treatment as required by the ACA", denialTip: "Ambetter members can appeal through their state's marketplace appeal process" },
  "Oscar Health": { networkSize: "tech-forward insurer in select markets", specialNote: "Oscar Health provides concierge-style care navigation that can help members find in-network treatment facilities quickly", denialTip: "Oscar's member services team can initiate a fast-track review for urgent treatment needs" },
  Highmark: { networkSize: "serves members in Pennsylvania, Delaware, and West Virginia", specialNote: "Highmark's behavioral health services include its own network of recovery support specialists", denialTip: "Highmark offers a member complaint and grievance process with clinical peer review" },
};

export function getInsuranceStateFAQs(
  insurer: InsurerConfig,
  state: StateInsuranceConfig
): { question: string; answer: string }[] {
  const details = insurerCoverageDetails[insurer.name] || {
    networkSize: "a national provider network",
    specialNote: `${insurer.name} covers substance abuse treatment under federal parity laws`,
    denialTip: `${insurer.name} offers standard internal and external appeal processes`,
  };

  return [
    {
      question: `Does ${insurer.name} cover rehab in ${state.state}?`,
      answer: `Yes, ${insurer.name} covers substance abuse treatment in ${state.state} under the Mental Health Parity and Addiction Equity Act. As ${details.networkSize}, ${insurer.name} provides access to medical detox, inpatient rehab, outpatient programs (IOP/PHP), medication-assisted treatment, and therapy. ${state.medicaidExpanded ? `${state.state}'s Medicaid expansion further broadens coverage options for qualifying residents.` : ""} Specific coverage levels depend on your plan type and whether you choose in-network or out-of-network providers.`,
    },
    {
      question: `How do I find ${insurer.name} in-network rehab centers in ${state.state}?`,
      answer: `You can find in-network ${insurer.name} rehab centers in ${state.state} by: 1) Searching our RehabLookup directory and filtering by insurance accepted, 2) Calling ${insurer.name} member services to request a list of in-network behavioral health providers, 3) Using our concierge service for personalized facility matching with ${insurer.name} benefits verification. ${details.specialNote}.`,
    },
    {
      question: `What does ${insurer.name} typically cover for rehab treatment in ${state.state}?`,
      answer: `${insurer.name} typically covers: medical detoxification, residential/inpatient treatment, partial hospitalization (PHP), intensive outpatient programs (IOP), individual and group therapy, psychiatric evaluation, medication-assisted treatment (MAT), and aftercare planning. ${details.specialNote}. Coverage duration and copay amounts vary by specific plan. ${state.notableInfo}`,
    },
    {
      question: `Do I need pre-authorization from ${insurer.name} for rehab in ${state.state}?`,
      answer: `Most ${insurer.name} plans require pre-authorization for inpatient and residential treatment in ${state.state}. ${details.specialNote}. Outpatient services may not require prior approval depending on your plan. The treatment facility typically handles the authorization process. For urgent admissions, ${insurer.name} offers expedited review processes.`,
    },
    {
      question: `What if ${insurer.name} denies my rehab claim in ${state.state}?`,
      answer: `If ${insurer.name} denies coverage in ${state.state}, you can: 1) Request the denial in writing with specific reasons, 2) File an internal appeal with supporting clinical documentation, 3) Request an external independent review if the internal appeal is denied, 4) Contact the ${state.state} Department of Insurance for assistance. ${details.denialTip}. Many denials are overturned on appeal — do not accept an initial denial as final.`,
    },
    {
      question: `Can I use ${insurer.name} for out-of-state rehab from ${state.state}?`,
      answer: `Yes, ${insurer.name} provides out-of-network coverage that can be used for treatment in other states, though at higher out-of-pocket costs. As ${details.networkSize}, ${insurer.name} has providers across all 50 states. Some patients choose to travel for specialized treatment or to access facilities not available locally in ${state.state}. Contact ${insurer.name} member services to compare in-state versus out-of-state benefit levels.`,
    },
  ];
}
