import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgGetMorePatients from "@/assets/provider-guides/pg-get-more-patients.jpg";
import treatmentFacility from "@/assets/provider-guides/treatment-facility.jpg";

export default function RehabReputationManagement() {
  return (
    <ProviderSEOPageLayout
      title="Rehab Reputation Management"
      metaTitle="Reputation Management for Rehab Centers: Protect & Grow Reviews | RehabLookup"
      metaDescription="Learn how to manage your rehab center's online reputation. Strategies for getting more positive reviews, handling negative feedback, and building trust with families."
      canonical="/provider-guides/rehab-reputation-management"
      keywords={["rehab reputation management", "treatment center reviews", "rehab center online reputation", "rehab Google reviews", "treatment center reputation"]}
      heroHeadline="Reputation Management for Rehab Centers: Build Trust at Scale"
      heroSubheadline="88% of families read online reviews before choosing a treatment center. Your online reputation is your most powerful — or most damaging — marketing asset."
      sections={[
        {
          heading: "Why Online Reputation Defines Your Admissions Volume",
          content: "In the treatment industry, trust is everything. Families making life-or-death decisions about their loved ones' care research facilities extensively before making contact. Your online reviews, ratings, and reputation signals directly influence which facilities receive inquiries and which get skipped.",
          bullets: [
            "88% of consumers trust online reviews as much as personal recommendations",
            "Facilities with 4.5+ star ratings receive 3x more inquiries than those below 4.0",
            "A single negative review costs an average treatment center $30,000 in lost revenue",
            "Google reviews are the #1 factor in local search ranking for treatment centers",
            "Responding to reviews — positive and negative — increases trust by 45%",
          ],
        },
        {
          heading: "Building a Review Generation System",
          content: "The best defense against negative reviews is an overwhelming volume of positive ones. Treatment centers that systematically request reviews from satisfied alumni build review profiles that attract families and dominate local search results.",
          bullets: [
            "Ask for reviews at peak satisfaction moments: milestone celebrations, successful discharges",
            "Make it easy: provide direct links to your Google Business Profile review page",
            "Train staff to naturally incorporate review requests into discharge conversations",
            "Follow up with alumni at 30, 60, and 90 days post-discharge with review requests",
            "Collect reviews on multiple platforms: Google, RehabLookup, and industry-specific sites",
          ],
        },
        {
          heading: "Handling Negative Reviews Professionally",
          content: "Negative reviews are inevitable in treatment — some patients don't complete programs, families have unrealistic expectations, and clinical decisions aren't always popular. How you respond to negative reviews reveals more about your facility than the review itself.",
          bullets: [
            "Respond within 24 hours — delays signal indifference to patient experience",
            "Never disclose patient information or confirm someone was in treatment (HIPAA)",
            "Acknowledge the concern, express empathy, and offer offline resolution",
            "Use templates for common scenarios but personalize each response",
            "Document response patterns to identify legitimate operational improvement areas",
          ],
        },
        {
          heading: "Leveraging Your Reputation for Growth",
          content: "A strong online reputation isn't just defensive — it's your most cost-effective marketing tool. Facilities with excellent reputations spend less on advertising while generating more admissions because trust compounds across every marketing channel.",
          bullets: [
            "Feature top reviews prominently on your website and social media",
            "Share positive reviews with referral partners to reinforce their confidence",
            "Your RehabLookup profile displays verified reviews to families searching for care",
            "Use review themes to inform marketing messaging — what do patients value most?",
            "Strong reputation reduces cost per admission across all marketing channels",
          ],
        },
      ]}
      images={[
        { src: pgGetMorePatients, alt: "Treatment center team monitoring online reviews", caption: "Proactive review management is a daily practice at top-performing facilities." },
        { src: treatmentFacility, alt: "Treatment center with excellent online ratings", caption: "Facilities with 4.5+ stars receive 3x more inquiries from families seeking care." },
      ]}
    />
  );
}
