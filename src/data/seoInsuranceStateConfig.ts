// ============================================================
// Insurance + State Cross-Page Configuration
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
  { slug: "aetna-rehab-coverage", name: "Aetna", mainPagePath: "aetna-rehab" },
  { slug: "bcbs-rehab-coverage", name: "Blue Cross Blue Shield", mainPagePath: "bcbs-treatment" },
  { slug: "cigna-rehab-coverage", name: "Cigna", mainPagePath: "cigna-rehab" },
  { slug: "unitedhealthcare-rehab-coverage", name: "UnitedHealthcare", mainPagePath: "united-healthcare-rehab" },
  { slug: "humana-rehab-coverage", name: "Humana", mainPagePath: "humana-rehab" },
];

export const stateInsuranceConfigs: StateInsuranceConfig[] = [
  { slug: "california", state: "California", stateAbbr: "CA", medicaidExpanded: true, notableInfo: "California's Medi-Cal program provides extensive substance abuse coverage. The state also has the nation's highest concentration of treatment facilities, particularly in Southern California and the San Francisco Bay Area." },
  { slug: "florida", state: "Florida", stateAbbr: "FL", medicaidExpanded: false, notableInfo: "Florida is a premier treatment destination with hundreds of accredited facilities, particularly concentrated in South Florida (Delray Beach, Fort Lauderdale, Palm Beach County). The state's Marchman Act allows involuntary assessment and treatment." },
  { slug: "texas", state: "Texas", stateAbbr: "TX", medicaidExpanded: false, notableInfo: "Texas has numerous treatment options across major metros including Houston, Dallas, Austin, and San Antonio. While Texas has not expanded Medicaid, the state funds treatment programs through its Health and Human Services Commission." },
  { slug: "new-york", state: "New York", stateAbbr: "NY", medicaidExpanded: true, notableInfo: "New York provides robust Medicaid coverage for addiction treatment and has strong parity enforcement. The state's Office of Addiction Services and Supports (OASAS) licenses and monitors treatment facilities statewide." },
  { slug: "arizona", state: "Arizona", stateAbbr: "AZ", medicaidExpanded: true, notableInfo: "Arizona was an early Medicaid expansion state and offers comprehensive behavioral health coverage through AHCCCS. The state is particularly known for luxury and holistic treatment programs in Scottsdale and Sedona." },
  { slug: "colorado", state: "Colorado", stateAbbr: "CO", medicaidExpanded: true, notableInfo: "Colorado expanded Medicaid and provides strong addiction treatment coverage. The state is known for wilderness therapy, adventure-based recovery programs, and holistic treatment approaches centered around Boulder and Denver." },
  { slug: "ohio", state: "Ohio", stateAbbr: "OH", medicaidExpanded: true, notableInfo: "Ohio, heavily impacted by the opioid epidemic, has significantly expanded treatment access through Medicaid expansion and state-funded initiatives. The state prioritizes MAT access and has invested heavily in recovery infrastructure." },
  { slug: "pennsylvania", state: "Pennsylvania", stateAbbr: "PA", medicaidExpanded: true, notableInfo: "Pennsylvania expanded Medicaid and has strengthened addiction treatment access in response to the opioid crisis. The state's Department of Drug and Alcohol Programs coordinates treatment services across all 67 counties." },
  { slug: "illinois", state: "Illinois", stateAbbr: "IL", medicaidExpanded: true, notableInfo: "Illinois expanded Medicaid and provides comprehensive substance abuse treatment coverage. Chicago and suburban areas have high concentrations of accredited treatment facilities offering all levels of care." },
];

export const insuranceStateConfigs = insurerConfigs.flatMap((insurer) =>
  stateInsuranceConfigs.map((state) => ({
    insurerSlug: insurer.slug,
    stateSlug: state.slug,
    path: `/insurance/${insurer.slug}/${state.slug}`,
  }))
);

export function getInsuranceStateFAQs(
  insurer: InsurerConfig,
  state: StateInsuranceConfig
): { question: string; answer: string }[] {
  return [
    {
      question: `Does ${insurer.name} cover rehab in ${state.state}?`,
      answer: `Yes, ${insurer.name} covers substance abuse treatment in ${state.state} under the Mental Health Parity and Addiction Equity Act. Coverage includes medical detox, inpatient rehab, outpatient programs (IOP/PHP), medication-assisted treatment, and therapy. Specific coverage levels depend on your plan type and whether you choose in-network or out-of-network providers.`,
    },
    {
      question: `How do I find ${insurer.name} in-network rehab centers in ${state.state}?`,
      answer: `You can find in-network ${insurer.name} rehab centers in ${state.state} by: 1) Searching our RehabLookup directory and filtering by insurance accepted, 2) Calling ${insurer.name} member services to request a list of in-network behavioral health providers, 3) Using our concierge service for personalized facility matching with ${insurer.name} benefits verification.`,
    },
    {
      question: `What does ${insurer.name} typically cover for rehab treatment?`,
      answer: `${insurer.name} typically covers: medical detoxification, residential/inpatient treatment, partial hospitalization (PHP), intensive outpatient programs (IOP), individual and group therapy, psychiatric evaluation, medication-assisted treatment (MAT), and aftercare planning. Coverage duration and copay amounts vary by specific plan.`,
    },
    {
      question: `Do I need pre-authorization from ${insurer.name} for rehab in ${state.state}?`,
      answer: `Most ${insurer.name} plans require pre-authorization for inpatient and residential treatment. Outpatient services may not require prior approval depending on your plan. The treatment facility typically handles the authorization process. For urgent admissions, ${insurer.name} offers expedited review processes.`,
    },
    {
      question: `What if ${insurer.name} denies my rehab claim in ${state.state}?`,
      answer: `If ${insurer.name} denies coverage, you can: 1) Request the denial in writing with specific reasons, 2) File an internal appeal with supporting clinical documentation, 3) Request an external independent review if the internal appeal is denied, 4) Contact the ${state.state} Department of Insurance for assistance. Many denials are overturned on appeal.`,
    },
    {
      question: `Can I use ${insurer.name} for out-of-state rehab from ${state.state}?`,
      answer: `Yes, ${insurer.name} provides out-of-network coverage that can be used for treatment in other states, though at higher out-of-pocket costs. Some patients choose to travel for specialized treatment or to access facilities not available locally. ${insurer.name}'s national network includes providers across all 50 states.`,
    },
  ];
}
