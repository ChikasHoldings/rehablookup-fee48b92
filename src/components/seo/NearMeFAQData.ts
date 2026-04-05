interface FAQ {
  question: string;
  answer: string;
}

type LocationParam = { city?: string; state?: string } | undefined;

function loc(location: LocationParam): string {
  return location?.city ? ` in ${location.city}` : location?.state ? ` in ${location.state}` : "";
}

export function getHolisticRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is holistic rehab${l}?`, answer: `Holistic rehab${l} combines evidence-based addiction treatment with complementary therapies like yoga, meditation, acupuncture, equine therapy, and nutritional counseling for whole-person healing.` },
    { question: `Does insurance cover holistic rehab${l}?`, answer: `Many insurance plans cover the clinical components of holistic rehab${l}. Some complementary therapies may require out-of-pocket payment. Verify your specific benefits through our insurance check tool.` },
    { question: `How long does holistic rehab last${l}?`, answer: `Holistic rehab programs${l} typically range from 30 to 90 days, with some extended programs lasting 6 months or more depending on individual needs.` },
    { question: `What therapies are included in holistic rehab${l}?`, answer: `Common holistic therapies${l} include yoga therapy, mindfulness meditation, art therapy, music therapy, equine-assisted therapy, acupuncture, nutritional counseling, and adventure therapy alongside traditional clinical care.` },
  ];
}

export function getChristianRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is Christian rehab${l}?`, answer: `Christian rehab${l} integrates biblical principles, prayer, pastoral counseling, and faith-based community support with evidence-based addiction treatment for spiritual and physical recovery.` },
    { question: `Does insurance cover Christian rehab${l}?`, answer: `Yes, most insurance plans cover Christian rehab${l} as the clinical treatment components meet medical standards. Some faith-based programs also offer scholarships and sliding-scale fees.` },
    { question: `Do I have to be Christian to attend${l}?`, answer: `Most Christian rehab programs${l} welcome people of all faiths or no faith. The spiritual component enhances treatment but is typically not mandatory.` },
    { question: `What does Christian rehab treatment include${l}?`, answer: `Treatment${l} includes individual and group therapy, Bible study, worship services, pastoral counseling, 12-step or faith-based step programs, and aftercare planning.` },
  ];
}

export function getLongTermRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is long-term rehab${l}?`, answer: `Long-term rehab${l} refers to residential treatment programs lasting 60 days or more, typically 90-120 days, providing comprehensive care for chronic or severe substance use disorders.` },
    { question: `How much does long-term rehab cost${l}?`, answer: `Long-term rehab${l} costs vary from $20,000 to $80,000+ depending on the program type and amenities. Most major insurance plans cover a significant portion of long-term treatment.` },
    { question: `Is long-term rehab more effective${l}?`, answer: `Research shows that longer treatment durations${l} are associated with better outcomes. Programs of 90 days or more show significantly higher rates of sustained recovery compared to shorter stays.` },
    { question: `What happens during long-term rehab${l}?`, answer: `Long-term rehab${l} includes medical stabilization, intensive therapy, skill-building workshops, relapse prevention training, vocational support, and gradual reintegration into daily life.` },
  ];
}

export function getIOPNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is IOP${l}?`, answer: `Intensive Outpatient Programs (IOP)${l} provide structured addiction treatment for 9-20 hours per week, allowing participants to live at home while attending therapy sessions, typically 3-5 days per week.` },
    { question: `How much does IOP cost${l}?`, answer: `IOP costs${l} typically range from $3,000 to $10,000 per month. Most major insurance plans cover IOP treatment under mental health and substance abuse benefits.` },
    { question: `Can I work while in IOP${l}?`, answer: `Yes, IOP programs${l} are designed for people who need to maintain work, school, or family responsibilities. Many offer evening and weekend session options for maximum flexibility.` },
    { question: `How long does IOP last${l}?`, answer: `IOP programs${l} typically last 8-12 weeks, though duration varies based on individual progress. Some programs offer extended care options for ongoing support.` },
  ];
}

export function getPHPNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is PHP${l}?`, answer: `Partial Hospitalization Programs (PHP)${l} provide intensive day treatment for 5-7 days per week, typically 6-8 hours daily, offering a high level of clinical care without requiring overnight stays.` },
    { question: `How is PHP different from IOP${l}?`, answer: `PHP${l} is more intensive than IOP, requiring more hours per week (30-40 vs 9-20). PHP is ideal as a step-down from inpatient care or for those needing more structure than IOP provides.` },
    { question: `Does insurance cover PHP${l}?`, answer: `Most major insurance plans cover PHP${l} as it is a recognized level of care for substance use disorders under the Mental Health Parity Act.` },
    { question: `What does a typical PHP day look like${l}?`, answer: `A typical PHP day${l} includes group therapy, individual counseling, psychoeducation, medication management, skill-building workshops, and wellness activities over 6-8 hours.` },
  ];
}

export function getCouplesRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is couples rehab${l}?`, answer: `Couples rehab${l} is specialized addiction treatment where both partners receive coordinated care, including joint counseling, individual therapy, and relationship repair alongside substance abuse treatment.` },
    { question: `Can couples stay together during rehab${l}?`, answer: `Many couples rehab programs${l} offer shared living arrangements while also providing individual treatment time. Each facility has different policies on cohabitation during treatment.` },
    { question: `Does insurance cover couples rehab${l}?`, answer: `Insurance typically covers each partner's individual treatment${l}. Couples counseling sessions may have separate coverage. Contact facilities to verify couples-specific benefit details.` },
    { question: `What if only one partner has an addiction${l}?`, answer: `Couples rehab${l} can still benefit relationships where only one partner has a substance use disorder. The non-addicted partner participates in family therapy and learns codependency recovery skills.` },
  ];
}

export function getExecutiveRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is executive rehab${l}?`, answer: `Executive rehab${l} provides confidential, premium addiction treatment designed for professionals and executives, featuring private accommodations, business amenities, and flexible scheduling.` },
    { question: `How much does executive rehab cost${l}?`, answer: `Executive rehab programs${l} typically range from $30,000 to $100,000+ per month due to premium amenities, private rooms, and specialized professional services.` },
    { question: `Can I continue working during executive rehab${l}?`, answer: `Many executive rehab programs${l} provide private offices, Wi-Fi, phone access, and flexible scheduling to allow limited work during treatment while maintaining confidentiality.` },
    { question: `Is executive rehab confidential${l}?`, answer: `Yes, executive rehab programs${l} prioritize absolute confidentiality with private check-in processes, NDAs, anonymous admission options, and discrete billing practices.` },
  ];
}

export function getRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `How do I find rehab${l}?`, answer: `Use RehabLookup to search verified rehab centers${l} by location, insurance, treatment type, and specialty. Our directory includes accredited facilities across all 50 states.` },
    { question: `How much does rehab cost${l}?`, answer: `Rehab costs${l} range from free (state-funded) to $100,000+ (luxury). Most programs cost $5,000-$30,000 per month. Insurance typically covers a significant portion.` },
    { question: `How long does rehab last${l}?`, answer: `Rehab programs${l} vary from 28-30 days (short-term) to 90+ days (long-term). The recommended duration depends on substance type, severity, and individual needs.` },
    { question: `What types of rehab are available${l}?`, answer: `Rehab options${l} include medical detox, inpatient/residential, outpatient (IOP/PHP), dual diagnosis, holistic, faith-based, luxury, and medication-assisted treatment programs.` },
  ];
}

export function getMATClinicNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `What is MAT${l}?`, answer: `Medication-Assisted Treatment (MAT)${l} combines FDA-approved medications like Suboxone, methadone, or Vivitrol with counseling and behavioral therapy to treat opioid and alcohol use disorders.` },
    { question: `What medications are used in MAT${l}?`, answer: `Common MAT medications${l} include buprenorphine (Suboxone), methadone, naltrexone (Vivitrol), acamprosate, and disulfiram. The best option depends on the substance and individual needs.` },
    { question: `Does insurance cover MAT${l}?`, answer: `Most insurance plans cover MAT${l} under the Mental Health Parity Act, including Medicaid and Medicare. Many clinics also offer sliding-scale fees.` },
    { question: `How long does MAT last${l}?`, answer: `MAT duration${l} varies by individual. Some people use MAT for months, others for years. Medical guidance helps determine the appropriate timeline for medication tapering.` },
  ];
}

export function getAffordableRehabNearMeFAQs(location?: LocationParam): FAQ[] {
  const l = loc(location);
  return [
    { question: `How can I find affordable rehab${l}?`, answer: `Affordable rehab options${l} include state-funded programs, Medicaid-accepting facilities, sliding-scale fee centers, nonprofit organizations, and scholarship programs.` },
    { question: `Is there free rehab available${l}?`, answer: `Yes, free rehab${l} is available through state-funded programs, SAMHSA grants, nonprofit organizations, and some faith-based facilities. Medicaid also covers treatment in many states.` },
    { question: `What is sliding-scale rehab${l}?`, answer: `Sliding-scale rehab${l} adjusts fees based on your income and ability to pay. Many facilities offer this option to make treatment accessible regardless of financial situation.` },
    { question: `Does Medicaid cover rehab${l}?`, answer: `Yes, Medicaid covers addiction treatment${l} in all states, including detox, inpatient, outpatient, and medication-assisted treatment. Coverage specifics vary by state Medicaid plan.` },
  ];
}
