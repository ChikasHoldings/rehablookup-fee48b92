/**
 * Generates unique, location-specific content for city and city+treatment SEO pages.
 * Content varies based on city name, state, population, treatment type, facility density,
 * and urban/rural classification to avoid templated/repetitive text that Google flags as thin content.
 */

import { contentHash, getFacilityDensity, getUrbanClassification } from "./seoPageValidator";

interface CityContentInput {
  cityName: string;
  stateName: string;
  stateAbbr: string;
  population?: number;
  facilityCount?: number; // actual facility matches for density-based variation
}

interface ContentSection {
  heading: string;
  content: string;
}

// Regional characteristics for content variation
const stateRegions: Record<string, { region: string; climate: string; flavor: string }> = {
  AL: { region: "Southeast", climate: "warm subtropical", flavor: "Gulf Coast and Appalachian foothills" },
  AK: { region: "Pacific Northwest", climate: "subarctic", flavor: "remote wilderness and tight-knit communities" },
  AZ: { region: "Southwest", climate: "arid desert", flavor: "desert landscapes and outdoor wellness" },
  AR: { region: "South Central", climate: "humid subtropical", flavor: "Ozark foothills and river valleys" },
  CA: { region: "West Coast", climate: "Mediterranean", flavor: "coastal living and innovation" },
  CO: { region: "Mountain West", climate: "semi-arid alpine", flavor: "mountain recreation and outdoor recovery" },
  CT: { region: "New England", climate: "continental", flavor: "historic charm and academic medicine" },
  DE: { region: "Mid-Atlantic", climate: "humid subtropical", flavor: "coastal proximity and small-state access" },
  FL: { region: "Southeast", climate: "tropical and subtropical", flavor: "beach settings and resort-style treatment" },
  GA: { region: "Southeast", climate: "humid subtropical", flavor: "Southern hospitality and growing metro areas" },
  HI: { region: "Pacific Islands", climate: "tropical", flavor: "island serenity and nature-immersive healing" },
  ID: { region: "Pacific Northwest", climate: "continental", flavor: "mountain wilderness and rural resilience" },
  IL: { region: "Midwest", climate: "continental", flavor: "urban medical centers and heartland community support" },
  IN: { region: "Midwest", climate: "humid continental", flavor: "Hoosier community values and accessible care" },
  IA: { region: "Midwest", climate: "humid continental", flavor: "agricultural communities and cooperative healthcare" },
  KS: { region: "Great Plains", climate: "continental", flavor: "prairie resilience and community-based treatment" },
  KY: { region: "Appalachian South", climate: "humid subtropical", flavor: "Bluegrass heritage and frontline opioid response" },
  LA: { region: "Gulf South", climate: "humid subtropical", flavor: "cultural richness and community health networks" },
  ME: { region: "New England", climate: "humid continental", flavor: "rural independence and coastal recovery settings" },
  MD: { region: "Mid-Atlantic", climate: "humid subtropical", flavor: "research institutions and federal healthcare access" },
  MA: { region: "New England", climate: "humid continental", flavor: "world-class hospitals and academic research" },
  MI: { region: "Great Lakes", climate: "humid continental", flavor: "Great Lakes communities and automotive heritage" },
  MN: { region: "Upper Midwest", climate: "humid continental", flavor: "nationally recognized treatment heritage (Hazelden)" },
  MS: { region: "Deep South", climate: "humid subtropical", flavor: "close-knit communities and faith-based recovery" },
  MO: { region: "Midwest", climate: "humid continental", flavor: "gateway communities and Show-Me pragmatism" },
  MT: { region: "Mountain West", climate: "continental", flavor: "Big Sky wilderness and ranch-based recovery" },
  NE: { region: "Great Plains", climate: "continental", flavor: "prairie strength and community solidarity" },
  NV: { region: "Mountain West", climate: "arid desert", flavor: "entertainment-industry recovery and desert serenity" },
  NH: { region: "New England", climate: "humid continental", flavor: "granite resilience and scenic recovery" },
  NJ: { region: "Mid-Atlantic", climate: "humid subtropical", flavor: "suburban networks and NYC-adjacent expertise" },
  NM: { region: "Southwest", climate: "arid semi-arid", flavor: "desert spirituality and multicultural healing traditions" },
  NY: { region: "Northeast", climate: "humid continental", flavor: "world-class medical infrastructure and diverse communities" },
  NC: { region: "Southeast", climate: "humid subtropical", flavor: "Research Triangle innovation and mountain retreats" },
  ND: { region: "Great Plains", climate: "continental", flavor: "frontier resilience and agricultural community support" },
  OH: { region: "Midwest", climate: "humid continental", flavor: "Rust Belt reinvention and opioid crisis frontlines" },
  OK: { region: "South Central", climate: "humid subtropical", flavor: "Plains heritage and tribal health partnerships" },
  OR: { region: "Pacific Northwest", climate: "oceanic", flavor: "progressive health policy and outdoor-focused recovery" },
  PA: { region: "Mid-Atlantic", climate: "humid continental", flavor: "historic healthcare institutions and diverse urban-rural landscape" },
  RI: { region: "New England", climate: "humid continental", flavor: "compact state with concentrated care networks" },
  SC: { region: "Southeast", climate: "humid subtropical", flavor: "Lowcountry charm and growing healthcare systems" },
  SD: { region: "Great Plains", climate: "continental", flavor: "Black Hills serenity and tribal health innovation" },
  TN: { region: "Southeast", climate: "humid subtropical", flavor: "music city culture and Appalachian community health" },
  TX: { region: "South Central", climate: "varied subtropical", flavor: "expansive metro networks and border-region bilingual care" },
  UT: { region: "Mountain West", climate: "arid continental", flavor: "family-centered values and outdoor wellness culture" },
  VT: { region: "New England", climate: "humid continental", flavor: "rural recovery and progressive health approaches" },
  VA: { region: "Mid-Atlantic", climate: "humid subtropical", flavor: "military-connected care and historic institutions" },
  WA: { region: "Pacific Northwest", climate: "oceanic", flavor: "tech-industry support and Pacific Rim diversity" },
  WV: { region: "Appalachian", climate: "humid continental", flavor: "Appalachian resilience and opioid crisis innovation" },
  WI: { region: "Upper Midwest", climate: "humid continental", flavor: "dairy land community bonds and lakeside recovery" },
  WY: { region: "Mountain West", climate: "continental", flavor: "frontier spirit and wilderness-based healing" },
  DC: { region: "Mid-Atlantic", climate: "humid subtropical", flavor: "federal resources and policy-driven healthcare" },
};

function getPopulationTier(pop?: number): "metro" | "mid" | "small" | "unknown" {
  if (!pop) return "unknown";
  if (pop >= 200000) return "metro";
  if (pop >= 50000) return "mid";
  return "small";
}

/**
 * Generates unique content sections for standalone city pages (/rehab-centers/:state/:city)
 */
export function generateCityContentSections(input: CityContentInput): ContentSection[] {
  const { cityName, stateName, stateAbbr, population, facilityCount = 0 } = input;
  const tier = getPopulationTier(population);
  const regionInfo = stateRegions[stateAbbr] || { region: "United States", climate: "temperate", flavor: "diverse communities" };
  const popText = population ? ` with a population of approximately ${population.toLocaleString()}` : "";
  const density = getFacilityDensity(facilityCount);
  const urbanClass = getUrbanClassification(population);
  const variant = contentHash(`${cityName}-${stateAbbr}`) % 3; // 3 variants per tier

  const sections: ContentSection[] = [];

  // Section 1: Local treatment landscape (varies by city size AND density AND variant)
  if (tier === "metro") {
    const densityNote = density === "high"
      ? `With ${facilityCount}+ verified treatment facilities, ${cityName} offers one of the strongest treatment networks in ${stateName}.`
      : density === "moderate"
      ? `${cityName} hosts a growing number of treatment providers, with several accredited facilities serving the metro area.`
      : `While ${cityName} is a major metro, treatment facility density is still developing — our concierge team can help identify the best available options.`;

    const variantContent = [
      `As a major ${regionInfo.region} metropolitan area${popText}, ${cityName} hosts a comprehensive network of addiction treatment providers. ${densityNote} The city's healthcare infrastructure supports everything from hospital-affiliated detox programs and academic medical center research trials to boutique residential facilities and community-based outpatient clinics. ${cityName}'s size means residents can typically find specialized programs — including tracks for professionals, veterans, young adults, and LGBTQ+ individuals — without traveling far from home. The local recovery community is active, with numerous support groups, sober living homes, and peer mentorship programs that strengthen long-term sobriety.`,
      `${cityName}${popText} stands as a key treatment hub in the ${regionInfo.region}, drawing both local residents and those from surrounding areas seeking specialized care. ${densityNote} The metro area's healthcare ecosystem includes major hospital systems with dedicated behavioral health wings, standalone residential treatment centers, and a robust outpatient network offering flexible scheduling. ${cityName}'s diverse population has spurred the development of culturally responsive treatment programs, multilingual clinical teams, and population-specific tracks that address the unique recovery needs of different communities.`,
      `The treatment landscape in ${cityName}${popText} reflects the breadth and depth you'd expect from a major ${regionInfo.region} metropolitan center. ${densityNote} Beyond traditional inpatient and outpatient models, ${cityName} providers have embraced innovative approaches including telehealth-enhanced recovery programs, employer-partnership treatment pathways, and integrated primary care–behavioral health models. The city's recovery infrastructure extends well beyond clinical treatment, encompassing alumni networks, recovery-oriented housing, vocational rehabilitation, and community reintegration support.`,
    ];

    sections.push({
      heading: variant === 0 ? `The Treatment Landscape in ${cityName}` : variant === 1 ? `Treatment Resources in ${cityName}, ${stateAbbr}` : `Addiction Treatment in ${cityName}`,
      content: variantContent[variant],
    });
  } else if (tier === "mid") {
    const densityNote = density === "high" || density === "moderate"
      ? `${cityName} offers a solid selection of treatment options that rivals many larger metros.`
      : `While treatment options in ${cityName} are developing, residents benefit from both local providers and easy access to regional facilities.`;

    const variantContent = [
      `${cityName}${popText} serves as an important treatment hub in the ${regionInfo.region} region. ${densityNote} Local providers understand the specific challenges facing ${cityName}'s community and often deliver more personalized care than larger urban centers. Community health centers and hospital behavioral health departments anchor the treatment network, with many facilities offering sliding-scale fees and accepting both private insurance and Medicaid.`,
      `As a mid-sized ${regionInfo.region} community${popText}, ${cityName} bridges the gap between major metro medical centers and smaller rural clinics. ${densityNote} The city's behavioral health providers have built strong referral networks, connecting residents to the right level of care — from medical detox and intensive outpatient programs to longer-term residential treatment when needed. Local practitioners often know patients by name, creating accountability and continuity of care that larger systems struggle to match.`,
      `${cityName}'s position in ${stateName}'s ${regionInfo.region} corridor provides residents with meaningful treatment access. ${densityNote} The community's healthcare infrastructure has grown alongside its population, with new treatment programs addressing local substance use patterns. ${cityName}-area providers specialize in creating treatment plans that respect the rhythms of community life — enabling patients to maintain employment, family connections, and social support during recovery.`,
    ];

    sections.push({
      heading: variant === 0 ? `Finding Treatment in ${cityName}` : variant === 1 ? `Recovery Options in ${cityName}, ${stateAbbr}` : `Treatment Access in ${cityName}`,
      content: variantContent[variant],
    });
  } else {
    const densityNote = density !== "none"
      ? `Despite its smaller size, ${cityName} has local treatment resources available to residents.`
      : `${cityName} residents can access treatment through a combination of local outpatient services, telehealth, and regional facilities.`;

    const variantContent = [
      `${cityName} may be smaller in size, but its treatment resources provide essential access for residents and surrounding communities in ${stateName}. ${densityNote} The close-knit nature of ${cityName}'s community often means stronger support networks and more individualized attention during treatment. Telehealth services have further expanded access, connecting residents with specialists across ${stateName}.`,
      `In ${cityName}${popText}, recovery is shaped by the strength of community bonds and local healthcare commitment. ${densityNote} Providers in smaller ${regionInfo.region} communities like ${cityName} often develop deep expertise in the substance use challenges most relevant to their patient population. When specialized programs aren't available locally, regional treatment centers and telehealth platforms ensure ${cityName} residents aren't left without options.`,
      `${cityName} and its surrounding ${stateName} communities represent the frontline of accessible treatment in the ${regionInfo.region}. ${densityNote} Local clinics, faith-based recovery programs, and community health worker initiatives provide culturally attuned care that resonates with ${cityName}'s residents. For those needing higher levels of care, transportation assistance and telemedicine consultations bridge the distance to regional centers.`,
    ];

    sections.push({
      heading: variant === 0 ? `Treatment Resources in ${cityName}` : variant === 1 ? `Finding Help in ${cityName}, ${stateAbbr}` : `Recovery Support in ${cityName}`,
      content: variantContent[variant],
    });
  }

  // Section 2: Treatment approaches (varies by region AND urban classification)
  const approachVariant = contentHash(`${cityName}-approach`) % 2;
  const outdoorTherapy = regionInfo.climate === "arid desert" || regionInfo.climate === "Mediterranean"
    ? "outdoor experiential therapy leveraging the region's natural landscape"
    : regionInfo.climate === "tropical"
    ? "nature-immersive healing unique to the region"
    : urbanClass === "major-metro" || urbanClass === "metro"
    ? "urban wellness programming including fitness centers and nutritional counseling"
    : "nature-based therapeutic activities that leverage the local environment";

  sections.push({
    heading: approachVariant === 0
      ? `Evidence-Based Treatment Approaches in ${cityName}, ${stateAbbr}`
      : `Clinical Methods and Therapies in ${cityName}`,
    content: approachVariant === 0
      ? `Treatment centers in ${cityName} employ a range of evidence-based methodologies tailored to the ${regionInfo.region} context. Cognitive behavioral therapy (CBT) and dialectical behavior therapy (DBT) form the clinical backbone at most facilities, helping patients identify triggers and develop coping strategies. Medication-assisted treatment (MAT) using FDA-approved medications like buprenorphine, naltrexone, and methadone is widely available for opioid and alcohol use disorders. Many ${cityName} programs integrate holistic approaches — including mindfulness meditation, yoga, art therapy, and ${outdoorTherapy} — recognizing that lasting recovery addresses mind, body, and spirit.`
      : `${cityName}'s treatment providers utilize proven therapeutic frameworks adapted for the ${regionInfo.region}'s population. The foundation of most programs includes CBT for restructuring thought patterns, motivational interviewing to build intrinsic commitment to change, and contingency management to reinforce positive behaviors. MAT protocols are available for opioid and alcohol dependence, reducing cravings and preventing relapse during the critical early recovery period. ${cityName} facilities increasingly offer ${outdoorTherapy}, trauma-focused therapies like EMDR, and family systems therapy — all of which contribute to the comprehensive, individualized treatment plans that lead to lasting recovery.`,
  });

  // Section 3: Choosing the right program (universal but location-flavored)
  sections.push({
    heading: `How to Choose a Rehab Center in ${cityName}`,
    content: `Selecting the right treatment facility in ${cityName} starts with understanding your specific needs. Consider whether you need medical detox before entering a program, whether inpatient or outpatient care fits your situation, and whether you have co-occurring mental health conditions requiring dual diagnosis treatment. Verify that any facility you're considering holds proper ${stateName} state licensing and nationally recognized accreditations from organizations like the Joint Commission or CARF. Ask about staff-to-patient ratios, the credentials of clinical team members, aftercare planning, and family involvement options. Insurance coverage varies by plan — most ${stateName} facilities accept major commercial insurers, Medicaid, and Medicare, but always confirm benefits before admission.`,
  });

  return sections;
}

/**
 * Generates "What to Expect" items for city pages
 */
export function generateCityWhatToExpect(cityName: string, stateAbbr: string): string[] {
  return [
    `Confidential clinical assessment to determine the appropriate level of care`,
    `Personalized treatment plan developed by licensed ${stateAbbr} clinicians`,
    `Individual therapy, group counseling, and peer support sessions`,
    `Insurance verification and financial planning assistance`,
    `Comprehensive aftercare and relapse prevention planning`,
    `Connection to ${cityName}-area recovery support groups and sober living resources`,
  ];
}

/**
 * Generates "Key Benefits" items for city pages
 */
export function generateCityBenefits(cityName: string, stateName: string, stateAbbr: string): string[] {
  const regionInfo = stateRegions[stateAbbr];
  const regionBenefit = regionInfo
    ? `Recovery setting shaped by ${regionInfo.flavor}`
    : `Strong local recovery community`;

  return [
    `Accredited, licensed treatment programs in ${cityName}`,
    `Evidence-based clinical approaches with measurable outcomes`,
    `Multiple levels of care from detox through continuing support`,
    `Insurance accepted — including most commercial plans and ${stateName} Medicaid`,
    regionBenefit,
    `24/7 support during critical early recovery phases`,
  ];
}

/**
 * Generates unique content for CityTreatmentPage sections
 */
export function generateTreatmentCitySections(
  treatmentLabel: string,
  treatmentSlug: string,
  cityName: string,
  stateAbbr: string,
): ContentSection[] {
  const regionInfo = stateRegions[stateAbbr] || { region: "United States", climate: "temperate", flavor: "diverse communities" };

  const sections: ContentSection[] = [];

  // Treatment-specific + city-specific content
  if (treatmentSlug.includes("detox")) {
    sections.push({
      heading: `Medical Detox Programs in ${cityName}`,
      content: `Medical detoxification in ${cityName}, ${stateAbbr} provides the critical first step toward recovery under 24/7 medical supervision. Local detox programs use FDA-approved medications to manage withdrawal symptoms safely, with protocols tailored to the substance involved — whether alcohol, opioids, benzodiazepines, or stimulants. ${cityName}'s detox facilities coordinate directly with the next level of care, ensuring a seamless transition into residential or outpatient treatment once stabilization is achieved.`,
    });
  } else if (treatmentSlug.includes("inpatient") || treatmentSlug.includes("residential")) {
    sections.push({
      heading: `Residential Treatment in ${cityName}`,
      content: `Inpatient rehab programs in ${cityName}, ${stateAbbr} provide immersive, round-the-clock care in a structured therapeutic environment. Residential stays typically range from 30 to 90 days, during which patients participate in daily individual therapy, group counseling, psychoeducation, and wellness activities. ${cityName}'s residential facilities remove individuals from triggering environments, allowing full focus on recovery. The ${regionInfo.region} setting brings unique advantages — ${regionInfo.flavor} — contributing to a healing atmosphere that supports lasting behavioral change.`,
    });
  } else if (treatmentSlug.includes("outpatient")) {
    sections.push({
      heading: `Outpatient Programs in ${cityName}`,
      content: `Outpatient treatment in ${cityName}, ${stateAbbr} allows individuals to receive structured addiction care while maintaining work, school, and family responsibilities. Programs range from intensive outpatient (IOP) with 9–20 hours per week of therapy, to standard outpatient with weekly individual and group sessions. ${cityName}'s outpatient providers offer flexible scheduling — including evening and weekend options — making treatment accessible for working professionals and parents. This level of care is ideal as a step-down from residential treatment or for individuals with mild to moderate substance use disorders.`,
    });
  } else if (treatmentSlug.includes("dual")) {
    sections.push({
      heading: `Dual Diagnosis Treatment in ${cityName}`,
      content: `Dual diagnosis programs in ${cityName}, ${stateAbbr} treat substance use disorders alongside co-occurring mental health conditions such as depression, anxiety, PTSD, and bipolar disorder. Integrated treatment is essential because untreated mental health issues are a leading cause of relapse. ${cityName}'s dual diagnosis providers combine psychiatric evaluation, medication management, evidence-based psychotherapy (CBT, DBT, EMDR), and addiction-specific interventions into a unified treatment plan. This coordinated approach addresses the root causes of addiction rather than symptoms alone.`,
    });
  } else {
    sections.push({
      heading: `${treatmentLabel} in ${cityName}`,
      content: `${cityName}, ${stateAbbr} provides access to quality ${treatmentLabel.toLowerCase()} through a network of licensed, accredited treatment providers. Local programs combine evidence-based clinical methods with holistic wellness approaches to address the full spectrum of addiction and recovery. Whether you're seeking initial assessment, active treatment, or long-term aftercare support, ${cityName}'s treatment community offers programs designed to meet diverse needs and recovery goals.`,
    });
  }

  // Second section: what makes this city unique for this treatment
  sections.push({
    heading: `Why Choose ${cityName} for ${treatmentLabel}?`,
    content: `${cityName}'s position in the ${regionInfo.region} brings distinct advantages for individuals seeking ${treatmentLabel.toLowerCase()}. The city's healthcare infrastructure supports specialized programming, while its ${regionInfo.climate} climate and local character — shaped by ${regionInfo.flavor} — create an environment conducive to healing and personal growth. Local treatment providers maintain strong connections with community recovery resources, sober living networks, and support groups, ensuring continuity of care well beyond formal treatment completion.`,
  });

  return sections;
}

/**
 * Generates "What to Expect" for treatment-specific city pages
 */
export function generateTreatmentWhatToExpect(treatmentLabel: string): string[] {
  return [
    `Comprehensive intake assessment and personalized treatment planning`,
    `Evidence-based ${treatmentLabel.toLowerCase()} delivered by licensed clinicians`,
    `Regular progress evaluations and treatment plan adjustments`,
    `Family education sessions and involvement opportunities`,
    `Discharge planning with structured aftercare recommendations`,
    `Alumni support and ongoing recovery community connections`,
  ];
}

/**
 * Generates "Key Benefits" for treatment-specific city pages
 */
export function generateTreatmentBenefits(treatmentLabel: string, cityName: string): string[] {
  return [
    `Accredited ${treatmentLabel.toLowerCase()} with verified outcomes`,
    `Licensed clinical staff specializing in addiction medicine`,
    `Insurance verification and financial assistance options`,
    `Coordinated care across all levels of treatment intensity`,
    `Local ${cityName} recovery support network integration`,
    `Confidential, judgment-free treatment environment`,
  ];
}
