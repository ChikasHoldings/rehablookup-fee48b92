import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgExclusiveLeads from "@/assets/provider-guides/pg-exclusive-leads.jpg";
import pgListingPlatforms from "@/assets/provider-guides/pg-listing-platforms-comparison.jpg";

export default function ExclusiveVsSharedLeads() {
  return (
    <ProviderSEOPageLayout
      title="Exclusive vs Shared Leads"
      metaTitle="Exclusive vs Shared Leads for Treatment Centers: What Works | RehabLookup"
      metaDescription="Understand the real difference between exclusive and shared rehab leads. Data-backed analysis of conversion rates, cost-per-admission, and family experience."
      canonical="/provider-guides/exclusive-vs-shared-leads"
      keywords={["exclusive rehab leads", "shared rehab leads", "treatment center leads", "rehab lead quality", "exclusive vs shared leads addiction treatment"]}
      heroHeadline="Exclusive vs Shared Leads for Treatment Centers: What the Data Shows"
      heroSubheadline="The lead model your directory uses fundamentally changes your admissions economics. Here's the unvarnished comparison every treatment center owner needs."
      sections={[
        {
          heading: "The Lead Quality Crisis in Addiction Treatment",
          content: "Treatment centers spend an average of $1,200–$4,500 to acquire a single admission through paid channels. Yet many facilities don't realize that a significant portion of that cost is driven by their lead model, not their marketing skill. When a family submits an inquiry through a shared-lead platform, that same inquiry can be sent to 5, 8, or even 12 competing facilities simultaneously. The result: a frantic race to make first contact, where the family's experience becomes an afterthought.",
          bullets: [
            "The average shared lead is sold to 6–8 treatment facilities simultaneously",
            "Only 12% of shared leads result in admission, compared to 22–28% for exclusive leads",
            "Families contacted by multiple facilities within minutes report feeling overwhelmed and pressured",
            "The shared-lead model incentivizes speed over clinical fit, harming long-term outcomes",
          ],
        },
        {
          heading: "What Makes a Lead 'Exclusive'?",
          content: "An exclusive lead is an inquiry sent to one facility — and only one facility — for a defined period. This model gives your admissions team breathing room to review the intake information, prepare a thoughtful response, and have a genuine conversation with the family. At RehabLookup, exclusive means the lead goes to your facility alone for a full 24 hours before any redistribution occurs, and redistribution only happens if you haven't made contact.",
          bullets: [
            "One lead, one facility: no competition for first contact",
            "24-hour exclusivity window gives your team time to prepare a personalized response",
            "Detailed intake data (insurance, substance, urgency, preferences) included with every lead",
            "Redistribution only occurs if you don't contact the lead — your responsiveness is rewarded",
          ],
        },
        {
          heading: "The Economics: Cost-Per-Admission Breakdown",
          content: "The per-lead price of a shared lead is often lower than an exclusive lead — which is exactly why so many facilities fall into the shared-lead trap. A shared lead might cost $75–$150, while an exclusive lead costs $150–$400. But when you factor in conversion rates, the math flips dramatically. At a 10% conversion rate on shared leads ($100 each), your cost-per-admission is $1,000. At a 25% conversion rate on exclusive leads ($250 each), your cost-per-admission is also $1,000 — but your admissions team handles 60% fewer total inquiries, freeing them to focus on clinical conversations.",
          bullets: [
            "Shared leads: $75–$150 per lead × 8–12% conversion = $625–$1,875 cost-per-admission",
            "Exclusive leads: $150–$400 per lead × 20–28% conversion = $535–$2,000 cost-per-admission",
            "Exclusive leads reduce total inquiry volume by 50–60%, lowering admissions team workload",
            "Higher conversion rates mean your team spends more time on families likely to admit",
            "Exclusive models eliminate wasted calls to families who already chose another facility",
          ],
        },
        {
          heading: "The Family Experience Factor",
          content: "Beyond the economics, the lead model directly impacts the family's experience — and by extension, your facility's reputation. When a parent calls about treatment for their child and receives 8 phone calls within 15 minutes, the experience feels predatory, not supportive. Families who receive a single, thoughtful call from a facility that clearly reviewed their situation report significantly higher satisfaction and are more likely to follow through with admission.",
          bullets: [
            "Families receiving 5+ facility calls within an hour are 40% more likely to abandon the search entirely",
            "Exclusive-lead conversations last an average of 12 minutes vs. 4 minutes for shared-lead callbacks",
            "Facilities using exclusive leads report 35% higher patient satisfaction scores at intake",
            "The family's first interaction with your facility sets the tone for their entire treatment experience",
          ],
        },
        {
          heading: "When Shared Leads Can Still Work",
          content: "Shared leads aren't universally terrible — they can serve a purpose for facilities with large admissions teams, fast response infrastructure, and competitive pricing. If your facility can consistently respond within 90 seconds and has a structured qualification process, shared leads can supplement your pipeline. However, they should never be your primary acquisition channel if you're focused on clinical fit and family experience.",
          bullets: [
            "Shared leads work best as a supplement to exclusive leads, not a replacement",
            "Facilities with 3+ admissions coordinators can handle the volume more effectively",
            "Speed-to-lead technology (auto-dialers, CRM integrations) improves shared-lead conversion",
            "Always track cost-per-admission, not cost-per-lead, when evaluating shared-lead ROI",
          ],
        },
        {
          heading: "Making the Switch to Exclusive Leads",
          content: "Transitioning from shared to exclusive leads requires a mindset shift for your admissions team. Instead of racing to make first contact, your team can invest time in reviewing intake details, researching insurance coverage, and preparing a personalized conversation. The result is a more professional, more effective admissions process that converts at higher rates and creates better first impressions with families.",
          bullets: [
            "Train your admissions team to use the 24-hour exclusivity window strategically",
            "Review all intake data before making the call — personalization dramatically improves conversion",
            "Set up internal SLAs: respond within 2 hours during business hours, within 4 hours after hours",
            "Track your contact rate and admission rate separately to identify process improvements",
            "Start with RehabLookup's exclusive lead model and measure results over a 90-day period",
          ],
        },
      ]}
      images={[
        { src: pgExclusiveLeads, alt: "Admissions coordinator reviewing exclusive patient lead details on laptop", caption: "Exclusive leads give your admissions team time to prepare personalized, clinical responses." },
        { src: pgListingPlatforms, alt: "Analytics dashboard comparing lead conversion metrics", caption: "Tracking cost-per-admission by lead type reveals the true ROI of exclusive vs shared models." },
      ]}
      ctaHeadline="Experience the Exclusive Lead Difference"
      ctaSubheadline="RehabLookup delivers exclusive, verified leads with detailed intake data — giving your team the advantage."
    />
  );
}
