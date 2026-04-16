export interface ProviderBrandingConfig {
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

export const providerBrandingConfigs: ProviderBrandingConfig[] = [
  {
    slug: "rehab-reputation-crisis-management",
    label: "Reputation Crisis Management",
    metaTitle: "Reputation Crisis Management for Rehab Centers: Protect Your Brand | RehabLookup",
    metaDescription: "Handle negative press, viral reviews, and media crises for your treatment center. Crisis response playbooks, PR strategies, and reputation recovery tactics.",
    keywords: ["rehab reputation crisis management", "treatment center negative press", "rehab crisis PR", "addiction treatment reputation recovery", "rehab brand protection"],
    heroHeadline: "A Single Negative News Story Can Cut Admissions 60% — Have a Crisis Plan Before You Need One",
    heroSubheadline: "Treatment centers face unique reputation risks: patient deaths, regulatory actions, and disgruntled former patients with social media megaphones. Proactive crisis management protects years of brand building.",
    problemHeadline: "Why Treatment Centers Are Uniquely Vulnerable to Reputation Attacks",
    problemPoints: [
      "Patient deaths — even medically unavoidable ones — generate sensational headlines that permanently damage facility reputation",
      "Former patients posting detailed negative experiences on Reddit, TikTok, or Google can reach millions before you can respond",
      "State regulatory actions and licensing investigations become public record and dominate search results for your facility name",
      "Competitor-planted fake reviews and smear campaigns are increasingly common in high-value treatment markets",
    ],
    insightHeadline: "Reputation Crisis Impact Data",
    insightContent: "In addiction treatment, reputation isn't just marketing — it's clinical. Families won't trust their loved ones to a facility with a damaged reputation, regardless of actual clinical quality.",
    insightStats: [
      { label: "Admissions Drop (Crisis)", value: "-60%" },
      { label: "Recovery Time", value: "12-18 mo" },
      { label: "Revenue at Risk", value: "$500K-$2M" },
      { label: "Facilities Without Plan", value: "78%" },
    ],
  },
  {
    slug: "rehab-social-media-content-strategy",
    label: "Social Media Content for Rehab",
    metaTitle: "Social Media Content Strategy for Rehab Centers: HIPAA-Safe Posting Guide | RehabLookup",
    metaDescription: "Create engaging, HIPAA-compliant social media content for your treatment center. Content calendars, post templates, and platform-specific strategies that build trust.",
    keywords: ["rehab social media content", "treatment center social media posts", "HIPAA social media content", "rehab Instagram strategy", "addiction treatment TikTok"],
    heroHeadline: "The Treatment Centers Winning on Social Media Post 4x Per Week — With Zero HIPAA Risk",
    heroSubheadline: "Social media is the #1 trust-building channel for families researching treatment. Facilities with active, authentic social presence reduce the decision timeline by 40% and increase direct inquiries by 65%.",
    problemHeadline: "Most Rehab Social Media Accounts Do More Harm Than Good",
    problemPoints: [
      "Posting patient testimonials without proper authorization documentation creates HIPAA violations with fines up to $1.5M per incident",
      "Inconsistent posting schedules (3 posts one week, nothing for a month) signal organizational instability to prospective families",
      "Generic motivational quotes and stock imagery make your facility indistinguishable from 10,000 other treatment center accounts",
      "Instagram and TikTok algorithms penalize facilities that only post promotional content — you need an 80/20 value-to-promotion ratio",
    ],
    insightHeadline: "Social Media Impact on Treatment Decisions",
    insightContent: "Social media has replaced word-of-mouth as the primary trust signal for families evaluating treatment options. A strong presence converts passive browsers into active inquiries.",
    insightStats: [
      { label: "Families Researching Social", value: "78%" },
      { label: "Inquiry Increase (Active)", value: "65%" },
      { label: "Ideal Post Frequency", value: "4x/week" },
      { label: "Decision Timeline Reduction", value: "40%" },
    ],
  },
  {
    slug: "rehab-google-business-profile-optimization",
    label: "Google Business Profile for Rehab",
    metaTitle: "Google Business Profile Optimization for Rehab Centers: Dominate Local Search | RehabLookup",
    metaDescription: "Optimize your treatment center's Google Business Profile for maximum visibility. Photos, posts, Q&A, review management, and local pack ranking strategies.",
    keywords: ["rehab Google Business Profile", "treatment center Google listing", "rehab Google Maps optimization", "addiction treatment local SEO", "rehab GBP optimization"],
    heroHeadline: "Your Google Business Profile Generates More Calls Than Your Website — Are You Optimizing It?",
    heroSubheadline: "64% of treatment center phone calls come from Google Business Profile, not the website. Facilities with fully optimized GBPs receive 7x more calls and 5x more direction requests than incomplete profiles.",
    problemHeadline: "Incomplete Google Profiles Are Invisible to Families in Crisis",
    problemPoints: [
      "Facilities without 10+ photos receive 35% fewer clicks — families want to see where their loved one will live and heal",
      "Not responding to Google Q&A means competitors and former patients control your facility's narrative on the world's largest search engine",
      "Missing business hours, service categories, and insurance information causes Google to rank your profile below competitors",
      "Duplicate or unclaimed Google listings split your reviews and confuse the algorithm, suppressing your visibility in local pack results",
    ],
    insightHeadline: "Google Business Profile Performance Data",
    insightContent: "For treatment centers, Google Business Profile is the highest-converting free marketing channel available. Most families make their first contact directly from the listing, never visiting your website.",
    insightStats: [
      { label: "Calls from GBP", value: "64%" },
      { label: "Visibility Boost (Optimized)", value: "7x" },
      { label: "Photo Impact on Clicks", value: "+35%" },
      { label: "Avg Monthly Impressions", value: "12K+" },
    ],
  },
  {
    slug: "rehab-public-relations-media-strategy",
    label: "PR & Media for Rehab Centers",
    metaTitle: "Public Relations & Media Strategy for Rehab Centers: Earn Positive Coverage | RehabLookup",
    metaDescription: "Build a PR strategy for your treatment center that earns media coverage, establishes thought leadership, and positions your facility as the go-to expert in your market.",
    keywords: ["rehab public relations", "treatment center PR strategy", "addiction treatment media coverage", "rehab thought leadership", "behavioral health PR"],
    heroHeadline: "Earned Media Coverage Generates 3x More Trust Than Any Paid Advertisement",
    heroSubheadline: "Treatment centers featured in local news, health publications, and podcasts are perceived as 3x more trustworthy than those relying solely on paid ads. Strategic PR creates authority that advertising can't buy.",
    problemHeadline: "Why Journalists Ignore Most Treatment Center Pitches",
    problemPoints: [
      "Self-promotional press releases about 'grand openings' and 'new programs' get deleted — journalists want data, trends, and expert commentary",
      "Facilities without a designated media spokesperson miss opportunities when reporters need addiction treatment experts on deadline",
      "HIPAA concerns cause most treatment centers to avoid media entirely, ceding the narrative to competitors willing to engage",
      "No crisis communication plan means your first media interaction may be a reporter asking about a patient death or regulatory action",
    ],
    insightHeadline: "PR Value for Treatment Centers",
    insightContent: "In a market where trust is the primary purchase driver, earned media creates an authority moat that competitors cannot replicate through spending alone.",
    insightStats: [
      { label: "Trust Multiplier", value: "3x" },
      { label: "PR-Driven Inquiry Lift", value: "45%" },
      { label: "Media Feature Lifespan", value: "2+ years" },
      { label: "Cost vs. Equivalent Ads", value: "1/10th" },
    ],
  },
  {
    slug: "rehab-video-testimonial-production",
    label: "Video Testimonials for Rehab",
    metaTitle: "Video Testimonial Production for Rehab Centers: Build Trust & Convert | RehabLookup",
    metaDescription: "Produce compelling, HIPAA-compliant video testimonials for your treatment center. Production tips, consent workflows, and distribution strategies that drive admissions.",
    keywords: ["rehab video testimonials", "treatment center patient videos", "addiction recovery stories video", "HIPAA compliant testimonials", "rehab video marketing production"],
    heroHeadline: "Video Testimonials Convert 80% More Website Visitors Than Text Reviews Alone",
    heroSubheadline: "Nothing builds trust faster than seeing and hearing real alumni share their recovery journey. Facilities with 5+ professional video testimonials report 80% higher website conversion rates and 50% shorter decision timelines.",
    problemHeadline: "Why Most Treatment Center Video Testimonials Look Unprofessional or Feel Exploitative",
    problemPoints: [
      "Filming current patients creates HIPAA liability — only alumni who've been discharged 90+ days should participate, with written authorization",
      "Poor production quality (shaky camera, bad audio, harsh lighting) makes your facility look unprofessional regardless of content",
      "Scripted testimonials feel inauthentic — viewers can detect coached responses, which destroys the trust you're trying to build",
      "Posting testimonials without proper authorization documentation, re-consent protocols, and takedown procedures creates ongoing legal exposure",
    ],
    insightHeadline: "Video Testimonial Performance Data",
    insightContent: "Video is the most persuasive medium for treatment center marketing because it lets families evaluate the human experience of your facility — something no brochure or website can replicate.",
    insightStats: [
      { label: "Conversion Lift", value: "80%" },
      { label: "Decision Time Reduction", value: "50%" },
      { label: "Min Videos for Impact", value: "5+" },
      { label: "Watch-Through Rate", value: "65%" },
    ],
  },
];
