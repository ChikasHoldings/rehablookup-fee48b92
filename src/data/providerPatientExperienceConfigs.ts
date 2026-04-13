export interface ProviderPatientExperienceConfig {
  slug: string;
  label: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  heroHeadline: string;
  heroSubheadline: string;
  problemHeadline: string;
  problemPoints: string[];
  insightHeadline: string;
  insightContent: string;
  insightStats: { label: string; value: string }[];
}

export const providerPatientExperienceConfigs: ProviderPatientExperienceConfig[] = [
  {
    slug: "rehab-intake-optimization-guide",
    label: "Intake Optimization",
    metaTitle: "Rehab Intake Optimization Guide | Convert More Inquiries",
    metaDescription: "Optimize your treatment center's intake process to convert more inquiries into admissions. Reduce drop-off rates and improve the patient onboarding experience.",
    keywords: ["rehab intake optimization", "treatment center intake process", "addiction treatment admissions", "rehab inquiry conversion", "intake workflow optimization"],
    heroHeadline: "Convert More Inquiries Into Admissions With an Optimized Intake Process",
    heroSubheadline: "The average treatment center loses 65% of qualified inquiries between first call and admission. Facilities with optimized intake workflows convert at 2x the industry average.",
    problemHeadline: "Your Intake Process Is Losing You Patients",
    problemPoints: [
      "65% of qualified callers never complete the admissions process due to friction, delays, or poor follow-up",
      "Insurance verification taking 24-48 hours causes patients to call competitors who verify in under 2 hours",
      "Intake staff without scripts or training give inconsistent information that erodes caller confidence",
      "No after-hours intake capability means losing 40% of calls that come in evenings and weekends",
    ],
    insightHeadline: "Intake Conversion Benchmark Data",
    insightContent: "Optimizing each stage of the intake funnel — from first call to bed assignment — creates the single largest impact on census and revenue for most treatment facilities.",
    insightStats: [
      { label: "Avg Drop-Off Rate", value: "65%" },
      { label: "Conversion Improvement", value: "2x" },
      { label: "Speed-to-Verify Impact", value: "3x" },
      { label: "After-Hours Call Share", value: "40%" },
    ],
  },
  {
    slug: "rehab-family-engagement-programs",
    label: "Family Engagement",
    metaTitle: "Rehab Family Engagement Programs | Improve Outcomes & Reviews",
    metaDescription: "Build effective family engagement programs for your treatment center. Improve patient outcomes, reduce AMA discharges, and generate positive reviews and referrals.",
    keywords: ["rehab family engagement", "treatment center family programs", "addiction family therapy", "family involvement in treatment", "rehab family support"],
    heroHeadline: "Engage Families to Improve Outcomes and Build Your Reputation",
    heroSubheadline: "Patients with actively engaged families are 50% less likely to leave AMA and 40% more likely to complete treatment. Family satisfaction also drives 60% of positive online reviews.",
    problemHeadline: "Neglecting Families Hurts Outcomes and Referrals",
    problemPoints: [
      "Families who feel uninformed become adversarial — they're the #1 source of complaints and negative reviews",
      "Without family education, patients return to enabling environments that trigger immediate relapse",
      "AMA discharges increase 50% when families are excluded from treatment planning and progress updates",
      "Most facilities offer family programming as an afterthought — a single weekly group session isn't enough",
    ],
    insightHeadline: "Family Engagement Outcome Data",
    insightContent: "Comprehensive family engagement programs demonstrate clear ROI through improved clinical outcomes, reduced AMA rates, higher satisfaction scores, and increased organic referrals.",
    insightStats: [
      { label: "AMA Reduction", value: "50%" },
      { label: "Completion Rate Boost", value: "40%" },
      { label: "Review Generation", value: "60%" },
      { label: "Referral Increase", value: "35%" },
    ],
  },
  {
    slug: "rehab-aftercare-planning-programs",
    label: "Aftercare Planning",
    metaTitle: "Rehab Aftercare Planning Programs | Reduce Relapse & Build Alumni",
    metaDescription: "Design effective aftercare and continuing care programs for your treatment facility. Reduce relapse rates, build alumni networks, and improve long-term outcomes.",
    keywords: ["rehab aftercare planning", "treatment center continuing care", "addiction aftercare programs", "rehab alumni programs", "post-treatment support"],
    heroHeadline: "Build Aftercare Programs That Reduce Relapse and Generate Referrals",
    heroSubheadline: "Facilities with structured aftercare programs report 35% lower 90-day relapse rates and 45% more alumni referrals — your most valuable and lowest-cost patient acquisition channel.",
    problemHeadline: "Discharge Without Aftercare Sets Patients Up to Fail",
    problemPoints: [
      "60-90% of patients without aftercare support relapse within the first 90 days of discharge",
      "A generic discharge plan with a list of AA meetings does not constitute meaningful continuing care",
      "Facilities that lose touch with alumni miss the highest-converting referral source in addiction treatment",
      "Payers increasingly require aftercare metrics for network inclusion — facilities without data lose contracts",
    ],
    insightHeadline: "Aftercare Program Outcomes",
    insightContent: "Investing in structured aftercare transforms a cost center into a revenue generator through alumni referrals, improved outcomes data for payer negotiations, and community reputation.",
    insightStats: [
      { label: "Relapse Reduction", value: "35%" },
      { label: "Alumni Referrals", value: "+45%" },
      { label: "Payer Contract Value", value: "+20%" },
      { label: "Alumni Engagement", value: "28%" },
    ],
  },
  {
    slug: "rehab-patient-satisfaction-measurement",
    label: "Patient Satisfaction",
    metaTitle: "Rehab Patient Satisfaction Measurement | Improve CAHPS Scores",
    metaDescription: "Implement patient satisfaction measurement systems at your treatment center. Improve quality scores, meet accreditation requirements, and drive admissions growth.",
    keywords: ["rehab patient satisfaction", "treatment center quality scores", "addiction treatment CAHPS", "patient experience measurement", "rehab quality improvement"],
    heroHeadline: "Measure and Improve Patient Satisfaction to Drive Census Growth",
    heroSubheadline: "Treatment centers in the top quartile for patient satisfaction scores have 25% higher occupancy rates and 40% more positive online reviews than facilities in the bottom quartile.",
    problemHeadline: "You Can't Improve What You Don't Measure",
    problemPoints: [
      "Most facilities rely on informal feedback — missing systematic issues that drive dissatisfaction and AMA",
      "Accreditation bodies (CARF, Joint Commission) require documented patient satisfaction programs with action plans",
      "Without benchmarking data, you can't identify whether your scores are improving or declining over time",
      "Negative patient experiences spread 3x faster on social media than positive ones, amplifying reputation damage",
    ],
    insightHeadline: "Patient Satisfaction Impact Metrics",
    insightContent: "Systematic patient satisfaction measurement provides actionable data that improves clinical care, strengthens payer relationships, and directly correlates with census growth.",
    insightStats: [
      { label: "Occupancy Impact", value: "+25%" },
      { label: "Review Correlation", value: "+40%" },
      { label: "Accreditation Req", value: "100%" },
      { label: "Negative Spread Rate", value: "3x" },
    ],
  },
  {
    slug: "rehab-discharge-planning-best-practices",
    label: "Discharge Planning",
    metaTitle: "Rehab Discharge Planning Best Practices | Reduce Readmissions",
    metaDescription: "Implement evidence-based discharge planning at your treatment center. Reduce readmission rates, improve outcomes, and strengthen payer relationships.",
    keywords: ["rehab discharge planning", "treatment center discharge process", "addiction treatment transitions", "rehab readmission reduction", "step-down planning"],
    heroHeadline: "Implement Discharge Planning That Reduces Readmissions and Builds Trust",
    heroSubheadline: "Facilities with structured discharge planning protocols reduce 30-day readmission rates by 40% and increase step-down referral revenue by 25% through internal program transitions.",
    problemHeadline: "Poor Discharge Planning Creates Revolving Door Patients",
    problemPoints: [
      "Rushed discharge planning in the final 48 hours results in inadequate transition support and high relapse risk",
      "Patients discharged without medication management plans are 3x more likely to relapse within 30 days",
      "Failure to coordinate with outpatient providers creates dangerous gaps in continuity of care",
      "Payers penalize facilities with high readmission rates through reduced reimbursement and network exclusion",
    ],
    insightHeadline: "Discharge Planning Performance Data",
    insightContent: "Effective discharge planning begins at admission and involves the entire clinical team. Facilities treating discharge as a clinical intervention see measurable improvements across all outcome metrics.",
    insightStats: [
      { label: "Readmission Reduction", value: "40%" },
      { label: "Step-Down Revenue", value: "+25%" },
      { label: "Care Gap Risk", value: "3x" },
      { label: "Planning Start Day", value: "Day 1" },
    ],
  },
];
