export interface ProviderMarketingChannelConfig {
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

export const providerMarketingChannelConfigs: ProviderMarketingChannelConfig[] = [
  {
    slug: "rehab-seo-marketing-strategy",
    label: "SEO Strategy",
    metaTitle: "Rehab SEO Marketing Strategy | Organic Search for Treatment Centers",
    metaDescription: "Master SEO for your addiction treatment center. Learn keyword strategies, local SEO tactics, and content marketing approaches that drive qualified patient inquiries.",
    keywords: ["rehab SEO", "treatment center SEO", "addiction treatment SEO strategy", "rehab organic search", "behavioral health SEO"],
    heroHeadline: "Dominate Organic Search and Attract Patients Who Are Ready for Treatment",
    heroSubheadline: "Organic search drives 53% of all treatment center inquiries. Facilities ranking on page 1 for local treatment keywords receive 10x more qualified leads than those on page 2.",
    problemHeadline: "Why Most Rehab SEO Strategies Fail",
    problemPoints: [
      "Generic SEO agencies don't understand healthcare compliance requirements or LegitScript restrictions",
      "Targeting broad keywords like 'drug rehab' wastes budget competing against national directories",
      "Neglecting local SEO means losing patients who search 'rehab near me' — the fastest-growing query type",
      "Thin content and duplicate city pages trigger Google's Helpful Content penalties, tanking rankings",
    ],
    insightHeadline: "Treatment Center Search Behavior Data",
    insightContent: "Understanding how patients and families search for treatment online is critical to building an SEO strategy that captures high-intent traffic at the decision moment.",
    insightStats: [
      { label: "Organic Share of Inquiries", value: "53%" },
      { label: "Page 1 Click Rate", value: "92%" },
      { label: "'Near Me' Growth", value: "150%" },
      { label: "Avg Cost Per Organic Lead", value: "$45" },
    ],
  },
  {
    slug: "rehab-ppc-advertising-guide",
    label: "PPC Advertising",
    metaTitle: "Rehab PPC Advertising Guide | Google Ads for Treatment Centers",
    metaDescription: "Navigate Google Ads for addiction treatment with LegitScript compliance. Optimize PPC campaigns to reduce cost-per-admission and maximize ROAS.",
    keywords: ["rehab PPC", "treatment center Google Ads", "addiction treatment PPC", "LegitScript certified advertising", "rehab paid search"],
    heroHeadline: "Run Compliant, High-Converting PPC Campaigns for Your Treatment Center",
    heroSubheadline: "Google requires LegitScript certification to advertise addiction treatment. Certified facilities that optimize their campaigns achieve 40% lower cost-per-admission than industry average.",
    problemHeadline: "PPC Pitfalls That Drain Treatment Center Budgets",
    problemPoints: [
      "Google Ads requires LegitScript certification — facilities without it cannot run treatment ads at all",
      "Average cost-per-click for rehab keywords exceeds $50, making unoptimized campaigns extremely expensive",
      "Call-only campaigns waste budget on after-hours calls that go to voicemail and never convert",
      "Broad match keywords attract clicks from people searching for physical rehabilitation, not addiction treatment",
    ],
    insightHeadline: "Treatment Center PPC Benchmarks",
    insightContent: "The addiction treatment PPC landscape is one of the most competitive in healthcare. Understanding industry benchmarks helps set realistic budgets and performance expectations.",
    insightStats: [
      { label: "Avg CPC", value: "$52" },
      { label: "Conversion Rate", value: "5.2%" },
      { label: "Cost Per Admission", value: "$1,800" },
      { label: "LegitScript Cost", value: "$950/yr" },
    ],
  },
  {
    slug: "rehab-social-media-marketing",
    label: "Social Media Marketing",
    metaTitle: "Rehab Social Media Marketing | Build Trust & Drive Admissions",
    metaDescription: "Build a HIPAA-compliant social media strategy for your treatment center. Grow community trust, share recovery stories, and drive patient inquiries ethically.",
    keywords: ["rehab social media", "treatment center social media marketing", "addiction recovery social media", "HIPAA social media", "rehab Facebook marketing"],
    heroHeadline: "Build Community Trust and Drive Admissions Through Social Media",
    heroSubheadline: "78% of families research treatment facilities on social media before calling. A professional, active presence builds trust and reduces the decision timeline by 40%.",
    problemHeadline: "Social Media Risks for Treatment Centers",
    problemPoints: [
      "HIPAA violations on social media can result in fines up to $1.5M — even well-meaning patient testimonials can violate privacy",
      "Inconsistent posting and abandoned accounts signal instability to prospective patients and families",
      "Negative reviews and comments require careful, compliant responses that most staff aren't trained to handle",
      "Paid social ads for addiction treatment face strict platform policies that frequently lead to account suspensions",
    ],
    insightHeadline: "Social Media Impact on Treatment Decisions",
    insightContent: "Families increasingly use social media platforms to evaluate treatment facilities, read reviews, and assess organizational culture before making admission decisions.",
    insightStats: [
      { label: "Families Researching", value: "78%" },
      { label: "Decision Time Reduction", value: "40%" },
      { label: "Trust Factor", value: "3.5x" },
      { label: "Avg Engagement Rate", value: "2.1%" },
    ],
  },
  {
    slug: "rehab-content-marketing-strategy",
    label: "Content Marketing",
    metaTitle: "Rehab Content Marketing Strategy | Educate, Engage, Convert",
    metaDescription: "Create a content marketing strategy for your treatment facility that builds authority, educates families, and converts readers into admissions inquiries.",
    keywords: ["rehab content marketing", "treatment center blog strategy", "addiction content strategy", "behavioral health content", "rehab educational content"],
    heroHeadline: "Turn Educational Content Into Your Most Powerful Admissions Tool",
    heroSubheadline: "Treatment centers publishing 4+ quality blog posts per month generate 3.5x more organic traffic and 2.8x more admissions inquiries than those without a content strategy.",
    problemHeadline: "Why Most Treatment Center Content Falls Flat",
    problemPoints: [
      "Generic content about 'what is addiction' competes with WebMD and NIDA — you'll never outrank them",
      "Content written without keyword research attracts traffic that never converts to admissions inquiries",
      "Publishing inconsistently signals to Google that your site is low-priority, suppressing rankings for all pages",
      "Failing to update outdated clinical content creates liability risks and erodes professional credibility",
    ],
    insightHeadline: "Content Marketing Performance Benchmarks",
    insightContent: "Strategic content marketing creates compounding returns over time, with each published piece serving as a permanent patient acquisition channel through organic search.",
    insightStats: [
      { label: "Traffic Multiplier", value: "3.5x" },
      { label: "Inquiry Increase", value: "2.8x" },
      { label: "Content Lifespan", value: "2+ Yrs" },
      { label: "Cost Per Lead (Content)", value: "$38" },
    ],
  },
  {
    slug: "rehab-reputation-management",
    label: "Reputation Management",
    metaTitle: "Rehab Reputation Management | Reviews & Online Presence",
    metaDescription: "Manage your treatment center's online reputation. Build positive reviews, respond to criticism professionally, and protect your facility's brand and admissions.",
    keywords: ["rehab reputation management", "treatment center reviews", "addiction rehab reviews strategy", "online reputation for rehabs", "Google reviews treatment center"],
    heroHeadline: "Protect and Grow Your Treatment Center's Online Reputation",
    heroSubheadline: "93% of patients read online reviews before choosing a treatment facility. Each one-star increase in Google rating correlates with a 12% increase in admissions inquiries.",
    problemHeadline: "Reputation Damage Can Destroy Admissions Overnight",
    problemPoints: [
      "A single negative news story or viral social media post can reduce admissions inquiries by 60% within days",
      "Former patients and disgruntled employees post reviews that violate HIPAA if you respond with clinical details",
      "Facilities with fewer than 10 Google reviews are filtered out of local search results entirely",
      "Fake negative reviews from competitors are increasingly common and difficult to remove through platform appeals",
    ],
    insightHeadline: "Online Reputation Impact Data",
    insightContent: "Your online reputation is your most valuable marketing asset. Systematic review generation and response protocols directly impact admissions volume and revenue.",
    insightStats: [
      { label: "Patients Read Reviews", value: "93%" },
      { label: "Impact Per Star", value: "+12%" },
      { label: "Min Reviews for Visibility", value: "10+" },
      { label: "Response Rate Impact", value: "35%" },
    ],
  },
];
