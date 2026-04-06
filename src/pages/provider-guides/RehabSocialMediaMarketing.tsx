import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";

export default function RehabSocialMediaMarketing() {
  return (
    <ProviderSEOPageLayout
      title="Social Media Marketing for Rehab Centers"
      metaTitle="Social Media Marketing for Rehab Centers: Complete Strategy 2026"
      metaDescription="Build a social media strategy for your treatment center that builds trust, attracts patients, and stays compliant with HIPAA and platform policies."
      canonical="/provider-guides/rehab-social-media-marketing"
      keywords={["rehab social media marketing", "treatment center social media", "rehab Instagram marketing", "addiction treatment Facebook ads", "rehab center TikTok"]}
      heroHeadline="Social Media Marketing for Rehab Centers: Build Trust & Attract Patients"
      heroSubheadline="72% of adults use social media to find health information. Done right, social media builds the trust that turns followers into admissions — without violating patient privacy."
      sections={[
        {
          heading: "Why Social Media Matters for Treatment Centers in 2026",
          content: "Social media isn't just for brand awareness — it's where families research and vet treatment options. When a family receives a recommendation for your facility, the first thing they do is check your social media. A facility with an active, professional social presence that showcases its culture, team, and recovery community immediately builds trust. A facility with a dormant or unprofessional social presence raises red flags. In 2026, your social media IS your reputation.",
          bullets: [
            "72% of adults use social media to find health-related information",
            "Families check social media profiles before calling a treatment center",
            "Active social accounts boost your Google Search visibility through social signals",
            "Facebook and Instagram remain the top platforms for treatment center marketing",
            "Short-form video (Reels, TikTok) has the highest engagement rate for recovery content",
          ],
        },
        {
          heading: "Platform Strategy: Where to Focus Your Efforts",
          content: "You don't need to be everywhere — you need to be excellent on 2-3 platforms. For treatment centers, Facebook is essential for family decision-makers (ages 35-65), Instagram for visual storytelling and younger demographics, and LinkedIn for referral partner relationships. TikTok can be powerful for recovery awareness content but requires careful compliance management. YouTube is the best platform for long-form educational content that ranks in Google search results.",
          bullets: [
            "Facebook: Best for family audiences, community groups, and targeted ads",
            "Instagram: Visual storytelling — facility tours, team spotlights, recovery milestones",
            "LinkedIn: Professional network for referral partners, industry thought leadership",
            "YouTube: Educational content that ranks in Google (treatment explainers, facility tours)",
            "TikTok: Highest engagement but requires strict compliance protocols for healthcare",
          ],
        },
        {
          heading: "Content Pillars: What to Post (and What Never to Post)",
          content: "Organize your social content around four pillars: Education (addiction facts, treatment options, recovery science), Community (team spotlights, facility culture, alumni events), Inspiration (anonymized recovery stories, motivational content), and Resources (how to get help, insurance guides, family support). Never post identifiable patient information, before/after photos of patients, or content that could be perceived as guaranteeing outcomes. All patient-related content requires written, HIPAA-compliant consent.",
          bullets: [
            "Education: Addiction science, treatment options, mental health awareness (40% of posts)",
            "Community: Team introductions, facility updates, behind-the-scenes (25% of posts)",
            "Inspiration: Anonymized recovery stories, milestones, motivational quotes (20% of posts)",
            "Resources: Insurance guides, how to help a loved one, crisis hotlines (15% of posts)",
            "NEVER: Patient photos without consent, outcome guarantees, medical advice",
          ],
        },
        {
          heading: "Facebook Ads for Treatment Centers: What Actually Works",
          content: "Facebook advertising for addiction treatment is heavily restricted but still effective when done correctly. Facebook prohibits targeting based on health conditions, so you can't target 'people interested in rehab.' Instead, target demographics: ages 35-65 (family decision-makers), interest in healthcare/wellness, geographic targeting around your facility, and lookalike audiences from your website visitors. Lead generation ads with a 'Learn More' CTA consistently outperform traffic ads for treatment center marketing.",
          bullets: [
            "Use lead generation ad format with pre-filled forms for lowest cost-per-lead",
            "Target family demographics: ages 35-65, healthcare interests, geographic radius",
            "Build lookalike audiences from website visitors and past admissions (email list uploads)",
            "Compliance: No before/after images, no targeting by health condition",
            "Budget: Start with $50/day for testing, scale winning ad sets to $200+/day",
          ],
        },
        {
          heading: "Measuring Social Media ROI for Treatment Centers",
          content: "Social media ROI in treatment is measured differently than ecommerce. Track assisted conversions (did someone interact with your social content before calling?), brand awareness metrics (profile views, website traffic from social), and referral source attribution. Use UTM parameters on all social links to track which content drives website visits and form submissions. The most meaningful metric is 'social-influenced admissions' — patients who engaged with your social content at any point in their decision journey.",
          bullets: [
            "Track social-influenced admissions: patients who engaged with social before admission",
            "Use UTM parameters on every link shared on social media",
            "Monitor profile-to-website click-through rates monthly",
            "Measure engagement rate (likes + comments + shares / followers) — aim for 3%+",
            "Survey new admissions: 'How did you hear about us?' to attribute social influence",
          ],
        },
      ]}
    />
  );
}
