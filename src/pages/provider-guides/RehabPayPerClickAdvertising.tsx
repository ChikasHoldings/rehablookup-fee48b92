import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";

export default function RehabPayPerClickAdvertising() {
  return (
    <ProviderSEOPageLayout
      title="PPC Advertising for Rehab Centers"
      metaTitle="PPC for Rehab Centers: Google Ads Strategy That Reduces Cost Per Admission"
      metaDescription="Master Google Ads for your treatment center. Reduce cost per click from $50+ to under $20 with proven PPC strategies for addiction treatment facilities."
      canonical="/provider-guides/rehab-pay-per-click-advertising"
      keywords={["rehab PPC advertising", "Google Ads rehab center", "treatment center PPC", "addiction treatment Google Ads", "reduce rehab cost per click", "rehab center paid search"]}
      heroHeadline="PPC for Rehab Centers: Google Ads That Actually Reduce Cost Per Admission"
      heroSubheadline="The average 'rehab center' click costs $50+. Most facilities waste 40-60% of their ad spend on unqualified clicks. Here's how to run profitable Google Ads campaigns."
      sections={[
        {
          heading: "The State of Google Ads for Addiction Treatment in 2026",
          content: "Google Ads remains the fastest way to generate treatment center inquiries — and the easiest way to waste money. The average cost per click for addiction treatment keywords exceeds $50, with competitive markets like Florida, California, and Arizona seeing $100+ CPCs. The facilities winning at paid search aren't outspending competitors; they're outmaneuvering them with tighter targeting, better landing pages, and disciplined negative keyword management. A well-optimized campaign can achieve a cost per admission of $2,000-$4,000 vs. the industry average of $5,000-$10,000.",
          bullets: [
            "Average CPC for 'rehab center' keywords: $45-$85 in 2026",
            "Competitive markets (FL, CA, AZ): $80-$150+ per click",
            "Industry average cost per admission from Google Ads: $5,000-$10,000",
            "Top-performing facilities achieve $2,000-$4,000 cost per admission",
            "40-60% of typical rehab Google Ads budgets are wasted on unqualified clicks",
          ],
        },
        {
          heading: "LegitScript Certification: The Required First Step",
          content: "Google requires LegitScript certification for all addiction treatment advertising. Without it, your ads will be disapproved immediately. The certification process takes 4-8 weeks and costs $995/year for facilities and $1,995/year for lead generators. Apply early — start the process before building your campaign. LegitScript verifies your licensing, accreditation, and compliance with advertising regulations. Once certified, you'll receive a certification badge to display on your website and ads.",
          bullets: [
            "LegitScript certification is mandatory for Google Ads in addiction treatment",
            "Application process takes 4-8 weeks — apply before building campaigns",
            "Cost: $995/year for treatment facilities, $1,995/year for lead generators",
            "Requires valid state licensing and recognized accreditation (CARF or Joint Commission)",
            "Certification must be renewed annually — mark your renewal date",
          ],
        },
        {
          heading: "Keyword Strategy: Stop Bidding on Expensive, Generic Terms",
          content: "The biggest PPC mistake treatment centers make is bidding on broad, expensive keywords like 'rehab center' or 'drug treatment.' These terms are dominated by large aggregators with massive budgets. Instead, focus on long-tail, location-specific keywords with clearer intent: 'inpatient alcohol rehab in [city],' 'detox center that accepts [insurance],' and '[substance] addiction treatment near [location].' These keywords cost 40-70% less per click and convert at 2-3x higher rates.",
          bullets: [
            "Target: '[treatment type] + [city/state]' combinations (e.g., 'alcohol detox in Phoenix')",
            "Target: '[insurance] + rehab' keywords (e.g., 'Aetna rehab center in California')",
            "Avoid broad match on expensive terms — use phrase match or exact match only",
            "Build extensive negative keyword lists: 'jobs,' 'salary,' 'free,' 'DIY,' 'reddit'",
            "Long-tail keywords cost 40-70% less and convert 2-3x better than generic terms",
          ],
        },
        {
          heading: "Landing Pages That Convert Clicks Into Calls",
          content: "Sending ad traffic to your homepage is like throwing money away. Build dedicated landing pages for each ad group with a single conversion action: call or form submission. The page should immediately address the visitor's specific search: if they searched 'alcohol detox in Dallas,' the landing page headline should say 'Medical Alcohol Detox in Dallas.' Include your phone number above the fold, a short form, insurance logos, and trust signals (accreditations, reviews). Remove all navigation — the only actions available should be calling or submitting the form.",
          bullets: [
            "One landing page per ad group — match the headline to the search query",
            "Phone number clickable and above the fold — this is your primary conversion action",
            "Remove site navigation — eliminate all exit paths except calling or form submission",
            "Include trust signals: accreditation badges, insurance logos, Google review rating",
            "Page load time under 3 seconds — each second of delay reduces conversions by 7%",
          ],
        },
        {
          heading: "Tracking and Optimization: Measure What Matters",
          content: "Most treatment centers track clicks and impressions but not what matters: cost per admission. Implement call tracking with dynamic number insertion to attribute every phone call to the specific keyword and ad that generated it. Track form submissions as conversions. Use offline conversion imports to feed actual admission data back to Google Ads, enabling the algorithm to optimize for patients who actually admit — not just people who click or call. Review and optimize campaigns weekly, not monthly.",
          bullets: [
            "Install call tracking with dynamic number insertion on all landing pages",
            "Track all conversion actions: phone calls (60+ seconds), form submissions, chats",
            "Import offline conversions: feed actual admission data back into Google Ads",
            "Calculate cost per admission (not just cost per lead) for every campaign",
            "Weekly optimization: pause underperforming keywords, reallocate budget to winners",
          ],
        },
      ]}
    />
  );
}
