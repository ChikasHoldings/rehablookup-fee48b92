export interface TreatmentProviderConfig {
  slug: string;
  label: string;
  headline: string;
  subheadline: string;
  painPoints: string[];
  insightText: string;
  keywords: string[];
}

export const treatmentProviderConfigs: TreatmentProviderConfig[] = [
  {
    slug: "detox",
    label: "Detox",
    headline: "Struggling to Fill Detox Beds?",
    subheadline: "Connect with patients actively searching for medical detox programs — right when they're ready to start.",
    painPoints: [
      "Detox beds sit empty while you spend thousands on Google Ads that attract tire-kickers",
      "Patients need immediate help but can't find your facility among hundreds of competitors",
      "Your admissions team wastes hours chasing leads that never convert",
      "Referral sources dry up without warning, leaving your census unpredictable",
    ],
    insightText: "Medical detox is one of the most time-sensitive treatments in addiction care. Patients and families searching for detox programs are ready to act within 24-48 hours — meaning every delay in connecting costs you a potential admission.",
    keywords: ["detox center marketing", "get detox patients", "detox lead generation", "fill detox beds"],
  },
  {
    slug: "residential",
    label: "Residential/Inpatient",
    headline: "Empty Beds Costing You Thousands?",
    subheadline: "Get matched with patients who need residential treatment and are ready to commit to recovery.",
    painPoints: [
      "Each empty bed costs $500-$1,500+ per day in lost revenue",
      "Google Ads for 'inpatient rehab' cost $150+ per click with low conversion rates",
      "Your facility gets lost among large corporate treatment chains",
      "Insurance verification delays cause patients to choose competitors who respond faster",
    ],
    insightText: "Residential treatment programs have the highest lifetime patient value in addiction care, often $30,000-$90,000 per stay. Yet most facilities operate at 70-80% occupancy. Increasing your census by just 2-3 patients can add $100K+ annually.",
    keywords: ["residential rehab marketing", "inpatient rehab patients", "fill rehab beds", "residential treatment leads"],
  },
  {
    slug: "iop",
    label: "IOP",
    headline: "IOP Groups Running Below Capacity?",
    subheadline: "Fill your Intensive Outpatient Program groups with patients who need structured support without residential care.",
    painPoints: [
      "IOP groups need minimum enrollment to be cost-effective, but census fluctuates weekly",
      "Patients step down from inpatient but don't stay for IOP — they go to competitors",
      "Marketing IOP is harder because patients don't search for it by name",
      "Insurance pre-authorization delays cause patients to drop out before starting",
    ],
    insightText: "IOP is the fastest-growing segment of addiction treatment, with demand increasing 40% since 2020. Patients increasingly prefer outpatient options that let them maintain work and family responsibilities while getting structured care.",
    keywords: ["IOP marketing", "intensive outpatient leads", "fill IOP groups", "outpatient program marketing"],
  },
  {
    slug: "php",
    label: "PHP",
    headline: "PHP Enrollment Below Target?",
    subheadline: "Connect with patients who need the structure of PHP — the bridge between inpatient and outpatient care.",
    painPoints: [
      "PHP requires a specific patient profile that's hard to target with traditional marketing",
      "Many patients don't understand the difference between PHP and IOP, choosing cheaper options",
      "Insurance companies are tightening PHP authorizations, making every admission count",
      "Competition from virtual PHP programs is undercutting your in-person program",
    ],
    insightText: "Partial Hospitalization Programs represent a $12B+ market opportunity, with insurance companies increasingly preferring PHP as a cost-effective alternative to full residential stays. Facilities that effectively market their PHP see 25-35% higher margins than residential-only programs.",
    keywords: ["PHP marketing", "partial hospitalization patients", "PHP lead generation", "PHP program marketing"],
  },
  {
    slug: "sober-living",
    label: "Sober Living",
    headline: "Sober Living Beds Sitting Empty?",
    subheadline: "Get discovered by individuals transitioning from treatment who need a structured sober environment.",
    painPoints: [
      "Residents leave before completing their stay, creating constant turnover and lost revenue",
      "You rely on treatment center referrals that dry up without warning",
      "Online directories list hundreds of sober living options with no differentiation",
      "Bad reviews from one former resident can tank your occupancy for months",
    ],
    insightText: "Research shows patients who complete 90+ days in sober living have 50% higher long-term recovery rates. Families are increasingly willing to pay for quality sober living, but they struggle to distinguish legitimate programs from poorly run houses.",
    keywords: ["sober living marketing", "sober living leads", "fill sober living beds", "sober living home marketing"],
  },
  {
    slug: "mat",
    label: "MAT",
    headline: "MAT Clinic Below Capacity?",
    subheadline: "Reach patients seeking Medication-Assisted Treatment for opioid and alcohol dependence.",
    painPoints: [
      "Stigma around MAT means patients search discreetly and choose the first option they find",
      "Competing with large pharmacy chains offering Suboxone without counseling support",
      "Patient retention is difficult — many drop off after the first month",
      "Insurance reimbursement for MAT is complex and often requires prior authorization",
    ],
    insightText: "With over 2 million Americans living with opioid use disorder, MAT demand continues to surge. The DEA's expansion of buprenorphine prescribing means more providers are entering the space, making visibility more important than ever.",
    keywords: ["MAT clinic marketing", "Suboxone clinic patients", "MAT lead generation", "medication assisted treatment marketing"],
  },
  {
    slug: "luxury",
    label: "Luxury Rehab",
    headline: "Premium Beds Going Unfilled?",
    subheadline: "Connect with high-net-worth individuals and families seeking world-class addiction treatment.",
    painPoints: [
      "Luxury rehab marketing costs $200-$500 per click with fierce competition from well-funded competitors",
      "Your target audience expects discretion and doesn't respond to typical rehab advertising",
      "Referral relationships with concierge physicians and wealth managers take years to build",
      "Each empty luxury bed represents $2,000-$5,000+ per day in lost revenue",
    ],
    insightText: "The luxury rehab market exceeds $35B globally, with high-net-worth individuals increasingly seeking evidence-based programs that offer privacy, comfort, and personalized care. Families often research for 2-4 weeks before making a decision.",
    keywords: ["luxury rehab marketing", "high-end rehab patients", "luxury treatment center leads", "premium rehab marketing"],
  },
  {
    slug: "dual-diagnosis",
    label: "Dual Diagnosis",
    headline: "Not Getting Enough Dual Diagnosis Referrals?",
    subheadline: "Reach patients who need integrated treatment for co-occurring mental health and substance use disorders.",
    painPoints: [
      "Dual diagnosis patients are the hardest to acquire — they're often misdiagnosed or bounced between providers",
      "Insurance companies resist covering integrated treatment, preferring to split mental health and SUD care",
      "Your clinical staff has dual diagnosis expertise, but patients don't know you exist",
      "Marketing dual diagnosis is complex because patients search for symptoms, not diagnoses",
    ],
    insightText: "Nearly 50% of individuals with substance use disorders also have a co-occurring mental health condition. Facilities offering true integrated dual diagnosis treatment command premium rates and have higher patient satisfaction scores.",
    keywords: ["dual diagnosis marketing", "co-occurring disorder patients", "dual diagnosis leads", "integrated treatment marketing"],
  },
];

export interface InsuranceProviderConfig {
  slug: string;
  label: string;
  headline: string;
  subheadline: string;
  memberCount: string;
  painPoints: string[];
  insightText: string;
  keywords: string[];
}

export const insuranceProviderConfigs: InsuranceProviderConfig[] = [
  {
    slug: "medicaid",
    label: "Medicaid",
    headline: "Want More Medicaid Patients?",
    subheadline: "Connect with Medicaid-covered individuals actively searching for addiction treatment in your area.",
    memberCount: "over 90 million",
    painPoints: ["Low reimbursement rates make volume essential, but marketing budgets are tight", "Patients don't understand which facilities accept Medicaid", "State-by-state Medicaid rules create compliance complexity", "High no-show rates with Medicaid patients make each lead more valuable"],
    insightText: "Medicaid covers more SUD treatment than any other payer in the U.S. With expansion in 40+ states, the patient pool continues to grow. Facilities that optimize for Medicaid volume can achieve strong margins through efficient operations.",
    keywords: ["Medicaid rehab marketing", "get Medicaid patients", "Medicaid addiction treatment leads"],
  },
  {
    slug: "medicare",
    label: "Medicare",
    headline: "Underserving the Medicare Population?",
    subheadline: "Reach Medicare beneficiaries who need addiction treatment — a growing and underserved demographic.",
    memberCount: "over 65 million",
    painPoints: ["Addiction among seniors is rising but most rehab marketing ignores this demographic", "Medicare reimbursement requires specific documentation and billing codes", "Families searching on behalf of elderly loved ones need different messaging", "Few facilities actively market to Medicare patients, creating an opportunity gap"],
    insightText: "Alcohol and prescription drug misuse among adults 65+ has doubled in the past decade. Medicare covers inpatient detox, residential treatment, and outpatient programs, but fewer than 20% of eligible patients receive treatment.",
    keywords: ["Medicare rehab marketing", "get Medicare patients", "Medicare addiction treatment", "senior rehab patients"],
  },
  {
    slug: "blue-cross",
    label: "Blue Cross Blue Shield",
    headline: "Missing Out on BCBS Patients?",
    subheadline: "Blue Cross Blue Shield covers 1 in 3 Americans. Make sure patients with BCBS can find your facility.",
    memberCount: "over 115 million",
    painPoints: ["BCBS has 36 independent companies with different coverage rules, making verification complex", "In-network vs out-of-network status dramatically impacts patient choice", "Patients with BCBS expect quality care and research facilities thoroughly", "Competing for BCBS patients means competing with the largest treatment chains"],
    insightText: "BCBS is the largest health insurance provider in the U.S. by enrollment. Their members tend to have higher coverage levels for SUD treatment, making them among the most valuable patients for rehab facilities.",
    keywords: ["BCBS rehab marketing", "Blue Cross patients", "BCBS addiction treatment", "Blue Cross rehab leads"],
  },
  {
    slug: "aetna",
    label: "Aetna",
    headline: "Not Getting Enough Aetna Referrals?",
    subheadline: "Aetna members searching for addiction treatment need to find your facility — not your competitor's.",
    memberCount: "over 34 million",
    painPoints: ["Aetna's behavioral health pre-authorization process causes patient drop-off", "CVS Health's acquisition of Aetna is changing referral patterns", "Aetna's preferred provider networks limit patient choice — are you in-network?", "Patients with Aetna PPO have better coverage but still struggle to find quality facilities"],
    insightText: "Aetna covers a wide range of SUD treatments including detox, residential, PHP, IOP, and MAT. Their members are concentrated in major metro areas, making geographic targeting especially effective.",
    keywords: ["Aetna rehab marketing", "get Aetna patients", "Aetna addiction treatment", "Aetna rehab leads"],
  },
  {
    slug: "cigna",
    label: "Cigna",
    headline: "Cigna Patients Can't Find You?",
    subheadline: "Help Cigna-covered individuals connect with your treatment facility when they need it most.",
    memberCount: "over 18 million",
    painPoints: ["Cigna's EAP program creates a separate referral pathway most facilities miss", "Behavioral health carve-outs mean Cigna patients are managed differently than medical patients", "Cigna's prior authorization requirements add friction that causes patient attrition", "Employer-sponsored Cigna plans have different SUD benefits than individual plans"],
    insightText: "Cigna's Evernorth behavioral health division manages care for millions of members. Facilities that understand Cigna's authorization workflows and coverage levels can convert at significantly higher rates.",
    keywords: ["Cigna rehab marketing", "get Cigna patients", "Cigna addiction treatment", "Cigna rehab leads"],
  },
  {
    slug: "united-healthcare",
    label: "UnitedHealthcare",
    headline: "Missing UnitedHealthcare Patients?",
    subheadline: "UnitedHealthcare is the largest commercial insurer. Ensure their members find your treatment facility.",
    memberCount: "over 50 million",
    painPoints: ["UHC's Optum behavioral health division controls referral pathways", "Prior authorization requirements are among the most stringent in the industry", "UHC's narrow network strategy limits which facilities patients can access", "High-deductible UHC plans create affordability concerns that delay treatment"],
    insightText: "UnitedHealthcare insures more Americans than any other commercial payer. Their members span every demographic and geography, making them the most valuable insurance relationship for most treatment facilities.",
    keywords: ["UnitedHealthcare rehab marketing", "UHC patients", "United Healthcare addiction treatment", "UHC rehab leads"],
  },
];

export interface ComparisonPageConfig {
  slug: string;
  title: string;
  metaTitle: string;
  headline: string;
  subheadline: string;
  sections: { heading: string; content: string }[];
  keywords: string[];
}

export const comparisonPageConfigs: ComparisonPageConfig[] = [
  {
    slug: "google-ads-vs-rehab-directories",
    title: "Google Ads vs Rehab Directories",
    metaTitle: "Google Ads vs Rehab Directories: Which Gets More Patients? | RehabLookup",
    headline: "Google Ads vs Rehab Directories: Where Should You Spend Your Marketing Budget?",
    subheadline: "Most rehab centers waste $10,000-$50,000/month on Google Ads. Here's why directories deliver better ROI.",
    sections: [
      { heading: "The Real Cost of Google Ads for Rehab", content: "The average cost-per-click for rehab-related Google Ads is $125-$200. With a 3-5% click-to-lead conversion rate, you're paying $2,500-$6,600 per qualified lead. Meanwhile, directory leads from patients actively searching for treatment convert at 15-25% because the intent is already established." },
      { heading: "Why Directories Win on Intent", content: "Google Ads intercept searchers at various stages — many are researching for school papers, news articles, or curiosity. Directory visitors have already decided they need treatment and are actively comparing facilities. This intent gap means directory leads are 3-5x more likely to convert to admissions." },
      { heading: "The Hidden Costs of PPC", content: "Beyond the click costs, Google Ads require a landing page, A/B testing, ongoing bid management, and click fraud monitoring. Most treatment centers need a dedicated marketing manager or agency ($5,000-$15,000/month) just to manage their PPC campaigns effectively." },
      { heading: "The Smart Approach: Both, But Weighted Right", content: "The highest-performing facilities use directories as their primary patient acquisition channel and supplement with targeted PPC for specific high-value keywords. RehabLookup's pay-for-performance model means you only pay when you receive a qualified lead — zero wasted spend." },
    ],
    keywords: ["google ads rehab", "rehab directory vs google ads", "rehab PPC cost", "rehab marketing ROI"],
  },
  {
    slug: "best-rehab-marketing-platforms-2026",
    title: "Best Rehab Marketing Platforms in 2026",
    metaTitle: "Best Rehab Marketing Platforms in 2026: Complete Comparison | RehabLookup",
    headline: "Best Rehab Marketing Platforms in 2026: An Honest Comparison",
    subheadline: "We compared the top platforms where treatment centers get patients. Here's what actually works.",
    sections: [
      { heading: "What to Look For in a Rehab Marketing Platform", content: "The best platforms deliver high-intent leads, offer transparent pricing, and provide measurable ROI. Avoid platforms that sell shared leads to 5+ facilities, charge monthly fees regardless of lead volume, or use aggressive sales tactics to lock you into long contracts." },
      { heading: "The Directory Landscape in 2026", content: "Major players include SAMHSA's treatment locator (free but generic), Psychology Today (therapy-focused), Rehabs.com (lead aggregator), and RehabLookup (high-intent SEO traffic with pay-for-performance pricing). Each serves a different purpose and patient population." },
      { heading: "Why SEO-Driven Platforms Outperform", content: "Platforms that generate traffic through organic SEO attract patients with the highest intent. These searchers have typed specific queries like 'detox centers in Dallas' or 'luxury rehab California' — they're not browsing; they're buying. SEO-driven leads convert 3-4x higher than paid traffic leads." },
      { heading: "Our Recommendation", content: "For most treatment centers, the best ROI comes from a combination of a strong directory presence (RehabLookup), an optimized Google Business Profile, and targeted local SEO. This approach generates consistent, high-quality leads without the volatility of paid advertising." },
    ],
    keywords: ["best rehab marketing platforms", "rehab directory comparison", "treatment center marketing platforms", "rehab listing sites"],
  },
  {
    slug: "is-psychology-today-worth-it-for-rehab",
    title: "Is Psychology Today Worth It for Rehab Centers?",
    metaTitle: "Is Psychology Today Worth It for Rehab Centers? Honest Review | RehabLookup",
    headline: "Is Psychology Today Worth It for Your Rehab Center?",
    subheadline: "Psychology Today is the #1 therapist directory. But does it work for treatment centers?",
    sections: [
      { heading: "Psychology Today's Strengths", content: "With 80M+ monthly visitors, Psychology Today has massive traffic. Their therapist directory is the gold standard. However, their treatment center listings are a secondary feature — most visitors are looking for individual therapists, not residential rehab programs." },
      { heading: "The Mismatch Problem", content: "Psychology Today's audience skews toward outpatient therapy clients — people looking for a weekly counselor, not a 30-day inpatient program. If your facility offers IOP or outpatient services, PT can be useful. For residential, detox, or luxury programs, the audience fit is poor." },
      { heading: "Cost vs Return Analysis", content: "Psychology Today charges $30-$60/month for a basic listing. The cost is low, but so is the return for most treatment centers. Facilities report 0-3 inquiries per month from PT, with low conversion rates because the leads often need a different level of care." },
      { heading: "Better Alternatives for Treatment Centers", content: "For facilities focused on residential, detox, or specialized addiction treatment, purpose-built directories like RehabLookup deliver significantly higher volume and quality. Our traffic is 100% addiction treatment-focused — every visitor is looking for exactly what you offer." },
    ],
    keywords: ["psychology today rehab listing", "psychology today for treatment centers", "rehab directory alternatives", "psychology today review"],
  },
  {
    slug: "facebook-ads-vs-seo-for-treatment-centers",
    title: "Facebook Ads vs SEO for Treatment Centers",
    metaTitle: "Facebook Ads vs SEO for Rehab Centers: Which Gets More Patients? | RehabLookup",
    headline: "Facebook Ads vs SEO for Treatment Centers: Which Actually Fills Beds?",
    subheadline: "Facebook's addiction treatment ad restrictions make rehab marketing harder. Here's what works instead.",
    sections: [
      { heading: "Facebook's Crackdown on Rehab Ads", content: "Since 2018, Facebook has severely restricted addiction treatment advertising. Many rehab-related ads are rejected outright. Those that do run face limited targeting, higher costs, and lower engagement. This has pushed savvy facilities toward organic channels." },
      { heading: "The SEO Advantage for Treatment Centers", content: "SEO targets patients at the exact moment they're searching for help. Someone typing 'alcohol rehab near me' into Google is ready to act. Facebook users scrolling through cat videos are not. This intent difference translates directly to conversion rates — SEO leads convert at 15-25% vs 1-3% for Facebook." },
      { heading: "The Timeline Reality", content: "SEO takes 6-12 months to show results, while Facebook ads can generate leads immediately. However, SEO compounds over time — your investment today generates leads for years. Facebook ads stop the moment you stop paying." },
      { heading: "The Optimal Strategy", content: "Use SEO and directory listings as your foundation, then supplement with Facebook for brand awareness and retargeting (not direct response). RehabLookup handles the SEO heavy lifting — your facility benefits from our domain authority and 5,400+ monthly visitors without any SEO investment on your end." },
    ],
    keywords: ["facebook ads rehab", "rehab center SEO", "rehab marketing facebook vs seo", "treatment center digital marketing"],
  },
  {
    slug: "rehab-lead-generation-paid-vs-organic",
    title: "Rehab Lead Generation: Paid vs Organic",
    metaTitle: "Rehab Lead Generation: Paid vs Organic Strategies Compared | RehabLookup",
    headline: "Rehab Lead Generation: Paid vs Organic — Which Path Fills More Beds?",
    subheadline: "The $64,000 question every treatment center owner asks. Here's the data-driven answer.",
    sections: [
      { heading: "The Paid Lead Landscape", content: "Paid rehab leads come from Google Ads ($125-200/click), call centers ($75-150/lead), lead aggregators ($50-300/shared lead), and social media ($40-80/click). The total cost per admission through paid channels averages $3,000-$8,000. For luxury facilities, it can exceed $15,000." },
      { heading: "The Organic Lead Advantage", content: "Organic leads come from SEO, directory listings, referrals, and content marketing. The cost per admission through organic channels averages $500-$2,000 — a 60-75% reduction versus paid. More importantly, organic leads have higher lifetime value because they come from trust, not advertising." },
      { heading: "Why Most Facilities Over-Invest in Paid", content: "Paid channels offer immediate gratification and measurable results. It's psychologically satisfying to spend $1,000 and see 5 phone calls. But the math rarely works long-term. Facilities that build organic channels see a 2-3x improvement in cost per admission within 12 months." },
      { heading: "The RehabLookup Model: Best of Both Worlds", content: "RehabLookup combines the immediacy of paid leads with the economics of organic. We invest heavily in SEO so our pages rank for high-intent keywords. You benefit from our organic traffic without building your own SEO. Pay only for real leads — no monthly fees, no contracts." },
    ],
    keywords: ["rehab lead generation", "paid vs organic rehab leads", "rehab marketing ROI", "treatment center lead generation cost"],
  },
];

export const STATE_TREATMENT_COMBOS = [
  { stateSlug: "alabama", stateName: "Alabama", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "alaska", stateName: "Alaska", treatments: ["detox", "residential", "iop", "mat"] },
  { stateSlug: "arizona", stateName: "Arizona", treatments: ["detox", "residential", "iop", "luxury", "sober-living"] },
  { stateSlug: "arkansas", stateName: "Arkansas", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "california", stateName: "California", treatments: ["detox", "residential", "iop", "luxury", "sober-living", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "colorado", stateName: "Colorado", treatments: ["detox", "residential", "iop", "sober-living", "mat", "dual-diagnosis"] },
  { stateSlug: "connecticut", stateName: "Connecticut", treatments: ["detox", "residential", "iop", "php", "mat"] },
  { stateSlug: "delaware", stateName: "Delaware", treatments: ["detox", "residential", "iop", "mat"] },
  { stateSlug: "florida", stateName: "Florida", treatments: ["detox", "residential", "iop", "luxury", "sober-living", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "georgia", stateName: "Georgia", treatments: ["detox", "residential", "iop", "sober-living", "dual-diagnosis", "mat"] },
  { stateSlug: "hawaii", stateName: "Hawaii", treatments: ["detox", "residential", "iop", "mat"] },
  { stateSlug: "idaho", stateName: "Idaho", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "illinois", stateName: "Illinois", treatments: ["detox", "residential", "iop", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "indiana", stateName: "Indiana", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "iowa", stateName: "Iowa", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "kansas", stateName: "Kansas", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "kentucky", stateName: "Kentucky", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "louisiana", stateName: "Louisiana", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "maine", stateName: "Maine", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "maryland", stateName: "Maryland", treatments: ["detox", "residential", "iop", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "massachusetts", stateName: "Massachusetts", treatments: ["detox", "residential", "iop", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "michigan", stateName: "Michigan", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "minnesota", stateName: "Minnesota", treatments: ["detox", "residential", "iop", "mat", "dual-diagnosis"] },
  { stateSlug: "mississippi", stateName: "Mississippi", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "missouri", stateName: "Missouri", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "montana", stateName: "Montana", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "nebraska", stateName: "Nebraska", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "nevada", stateName: "Nevada", treatments: ["detox", "residential", "iop", "luxury", "sober-living"] },
  { stateSlug: "new-hampshire", stateName: "New Hampshire", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "new-jersey", stateName: "New Jersey", treatments: ["detox", "residential", "iop", "php", "mat", "dual-diagnosis"] },
  { stateSlug: "new-mexico", stateName: "New Mexico", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "new-york", stateName: "New York", treatments: ["detox", "residential", "iop", "php", "mat", "dual-diagnosis", "luxury"] },
  { stateSlug: "north-carolina", stateName: "North Carolina", treatments: ["detox", "residential", "iop", "mat", "dual-diagnosis", "sober-living"] },
  { stateSlug: "north-dakota", stateName: "North Dakota", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "ohio", stateName: "Ohio", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis", "php"] },
  { stateSlug: "oklahoma", stateName: "Oklahoma", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "oregon", stateName: "Oregon", treatments: ["detox", "residential", "iop", "mat", "sober-living", "dual-diagnosis"] },
  { stateSlug: "pennsylvania", stateName: "Pennsylvania", treatments: ["detox", "residential", "iop", "mat", "dual-diagnosis", "php"] },
  { stateSlug: "rhode-island", stateName: "Rhode Island", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "south-carolina", stateName: "South Carolina", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "south-dakota", stateName: "South Dakota", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "tennessee", stateName: "Tennessee", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis", "sober-living"] },
  { stateSlug: "texas", stateName: "Texas", treatments: ["detox", "residential", "iop", "mat", "dual-diagnosis", "php", "luxury"] },
  { stateSlug: "utah", stateName: "Utah", treatments: ["detox", "residential", "iop", "mat", "sober-living"] },
  { stateSlug: "vermont", stateName: "Vermont", treatments: ["detox", "residential", "mat", "iop"] },
  { stateSlug: "virginia", stateName: "Virginia", treatments: ["detox", "residential", "iop", "mat", "dual-diagnosis", "php"] },
  { stateSlug: "washington", stateName: "Washington", treatments: ["detox", "residential", "iop", "mat", "sober-living", "dual-diagnosis"] },
  { stateSlug: "west-virginia", stateName: "West Virginia", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "wisconsin", stateName: "Wisconsin", treatments: ["detox", "residential", "mat", "iop", "dual-diagnosis"] },
  { stateSlug: "wyoming", stateName: "Wyoming", treatments: ["detox", "residential", "mat", "iop"] },
];

export const STATE_INSURANCE_COMBOS = [
  { stateSlug: "alabama", stateName: "Alabama", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "arizona", stateName: "Arizona", insurers: ["medicaid", "blue-cross", "aetna", "united-healthcare"] },
  { stateSlug: "california", stateName: "California", insurers: ["medicaid", "blue-cross", "aetna", "cigna", "united-healthcare", "medicare"] },
  { stateSlug: "colorado", stateName: "Colorado", insurers: ["medicaid", "blue-cross", "united-healthcare", "cigna"] },
  { stateSlug: "connecticut", stateName: "Connecticut", insurers: ["medicaid", "aetna", "cigna", "united-healthcare"] },
  { stateSlug: "florida", stateName: "Florida", insurers: ["medicaid", "blue-cross", "united-healthcare", "aetna", "cigna", "medicare"] },
  { stateSlug: "georgia", stateName: "Georgia", insurers: ["medicaid", "blue-cross", "united-healthcare", "aetna"] },
  { stateSlug: "illinois", stateName: "Illinois", insurers: ["medicaid", "blue-cross", "united-healthcare", "aetna"] },
  { stateSlug: "indiana", stateName: "Indiana", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "kentucky", stateName: "Kentucky", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "louisiana", stateName: "Louisiana", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "maryland", stateName: "Maryland", insurers: ["medicaid", "blue-cross", "cigna", "united-healthcare"] },
  { stateSlug: "massachusetts", stateName: "Massachusetts", insurers: ["medicaid", "blue-cross", "aetna", "united-healthcare"] },
  { stateSlug: "michigan", stateName: "Michigan", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "minnesota", stateName: "Minnesota", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "missouri", stateName: "Missouri", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "nevada", stateName: "Nevada", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "new-jersey", stateName: "New Jersey", insurers: ["medicaid", "blue-cross", "aetna", "cigna", "united-healthcare"] },
  { stateSlug: "new-york", stateName: "New York", insurers: ["medicaid", "blue-cross", "aetna", "cigna", "united-healthcare", "medicare"] },
  { stateSlug: "north-carolina", stateName: "North Carolina", insurers: ["medicaid", "blue-cross", "united-healthcare", "aetna"] },
  { stateSlug: "ohio", stateName: "Ohio", insurers: ["medicaid", "blue-cross", "united-healthcare", "aetna"] },
  { stateSlug: "oregon", stateName: "Oregon", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "pennsylvania", stateName: "Pennsylvania", insurers: ["medicaid", "blue-cross", "aetna", "cigna", "united-healthcare"] },
  { stateSlug: "south-carolina", stateName: "South Carolina", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "tennessee", stateName: "Tennessee", insurers: ["medicaid", "blue-cross", "united-healthcare", "cigna"] },
  { stateSlug: "texas", stateName: "Texas", insurers: ["medicaid", "blue-cross", "cigna", "united-healthcare", "aetna", "medicare"] },
  { stateSlug: "virginia", stateName: "Virginia", insurers: ["medicaid", "blue-cross", "aetna", "united-healthcare"] },
  { stateSlug: "washington", stateName: "Washington", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
  { stateSlug: "wisconsin", stateName: "Wisconsin", insurers: ["medicaid", "blue-cross", "united-healthcare"] },
];
