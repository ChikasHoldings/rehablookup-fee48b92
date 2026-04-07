import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgChooseDirectory from "@/assets/provider-guides/pg-choose-directory.jpg";
import pgExclusiveLeads from "@/assets/provider-guides/pg-exclusive-leads.jpg";

export default function HowToChooseRehabDirectory() {
  return (
    <ProviderSEOPageLayout
      title="How to Choose a Directory"
      metaTitle="How to Choose a Directory for Your Rehab Center (2026 Guide) | RehabLookup"
      metaDescription="A practical framework for treatment center owners evaluating rehab directories. Learn what questions to ask, what red flags to avoid, and how to maximize ROI."
      canonical="/provider-guides/how-to-choose-a-rehab-directory"
      keywords={["choose rehab directory", "best directory for treatment center", "rehab listing evaluation", "treatment center directory guide", "rehab directory selection criteria"]}
      heroHeadline="How to Choose the Right Directory for Your Rehab Center"
      heroSubheadline="Most treatment centers waste money on directories that don't deliver. Here's a practical framework for evaluating platforms before you sign anything."
      sections={[
        {
          heading: "The Directory Decision Is a Business Decision",
          content: "Choosing a listing directory isn't a marketing task you delegate to an intern — it's a strategic business decision that directly impacts your admissions pipeline, revenue, and reputation. The wrong platform can drain thousands of dollars monthly while delivering leads that never convert. The right platform becomes a predictable, scalable source of qualified admissions that compounds over time. Before evaluating any platform, get clear on three things: your current cost-per-admission, your admissions team capacity, and your target monthly admission volume.",
          bullets: [
            "Know your current cost-per-admission across all channels before comparing directory costs",
            "Assess your admissions team's capacity — can they handle 20 leads/month or 200?",
            "Define a realistic target: how many additional admissions per month would meaningful growth look like?",
            "Set a 90-day evaluation period with clear success metrics before committing long-term",
          ],
        },
        {
          heading: "The 7 Questions Every Provider Should Ask",
          content: "Before signing with any directory, ask these seven questions. The answers will tell you everything you need to know about whether the platform is worth your investment. Any reputable directory will answer these questions openly — if they dodge or deflect, that's your first red flag.",
          bullets: [
            "How are leads distributed? (Exclusive to one facility, or shared across multiple?)",
            "What verification process do you use for listed facilities?",
            "What intake data is included with each lead? (Name only, or insurance, substance, urgency?)",
            "What is your pricing model, and are there any hidden fees or long-term contracts?",
            "Can I see real performance data — impressions, clicks, inquiries — for facilities in my market?",
            "What happens to leads I don't respond to? Are they redistributed, and if so, when?",
            "Do you rank organically on Google for treatment searches, or do you rely on paid traffic?",
          ],
        },
        {
          heading: "Red Flags That Signal a Bad Directory",
          content: "The treatment directory space has its share of operators who prioritize their revenue over facility results. Learning to spot red flags early saves you time, money, and frustration. If a platform pressures you into long-term contracts before you've seen a single lead, or if they can't provide transparent data about their traffic sources, walk away.",
          bullets: [
            "Long-term contracts (12+ months) required before you can evaluate results",
            "Refusal to share traffic sources or organic vs. paid traffic breakdown",
            "No facility verification process — any facility can pay and list immediately",
            "Vague pricing with 'setup fees,' 'enhancement packages,' and upsells after signing",
            "Leads with minimal data (name and phone only, no intake information)",
            "Claims of 'guaranteed admissions' — no ethical platform can guarantee admissions",
            "No analytics dashboard or performance reporting for listed facilities",
          ],
        },
        {
          heading: "Green Flags That Indicate a Quality Platform",
          content: "The best directories are transparent, data-driven, and aligned with the treatment industry's ethical standards. They invest in organic SEO rather than relying solely on paid traffic, they verify facilities before listing them, and they provide detailed intake information with every lead. Look for platforms that treat the listing relationship as a partnership, not a transaction.",
          bullets: [
            "Transparent, per-lead pricing with no long-term commitments required",
            "Facility verification through licensing, accreditation, and compliance checks",
            "Exclusive lead distribution with clear exclusivity windows and redistribution policies",
            "Detailed intake data included with every lead (insurance, substance, urgency, preferences)",
            "Real-time analytics dashboard showing impressions, inquiries, and conversion data",
            "Organic Google rankings for high-intent treatment search terms",
            "Responsive support team that understands the treatment industry",
          ],
        },
        {
          heading: "How to Test a Directory Without Overcommitting",
          content: "The smartest approach is to test any new directory with a structured 90-day trial. Set clear benchmarks before you start: what cost-per-admission would make this platform worthwhile? How many leads do you expect per month? What conversion rate would represent success? Track these metrics rigorously and make your long-term decision based on data, not promises.",
          bullets: [
            "Start with a basic listing to test lead quality before upgrading to premium placement",
            "Track every lead through your admissions funnel — from inquiry to admission",
            "Calculate cost-per-admission, not just cost-per-lead, for accurate ROI comparison",
            "Compare the directory's performance against your other acquisition channels",
            "Request a 90-day review meeting with the platform to discuss results and optimization",
          ],
        },
        {
          heading: "Why RehabLookup Was Built Differently",
          content: "RehabLookup was designed by people who understood the problems with existing treatment directories. Every design decision — from exclusive lead distribution to facility verification to detailed intake data — was made to solve the specific pain points treatment center owners face. The result is a platform that delivers higher-quality leads, better family experiences, and lower cost-per-admission than traditional shared-lead directories.",
          bullets: [
            "Exclusive leads with a 24-hour window — your facility gets first access to every inquiry",
            "Facility verification ensures families only see licensed, accredited treatment centers",
            "Detailed intake information (insurance, substance, urgency, location) with every lead",
            "Transparent per-lead pricing with no setup fees, contracts, or hidden charges",
            "Real-time analytics dashboard to track your listing performance and ROI",
            "Free basic listing available — upgrade only when you see results that justify it",
          ],
        },
      ]}
      images={[
        { src: pgChooseDirectory, alt: "Treatment center director evaluating rehab directory options on tablet", caption: "A structured evaluation framework prevents costly mistakes when choosing a listing platform." },
        { src: pgExclusiveLeads, alt: "Admissions coordinator reviewing verified patient leads", caption: "The right directory provides detailed intake data that helps your team prepare personalized responses." },
      ]}
      ctaHeadline="See What a Quality Directory Looks Like"
      ctaSubheadline="List your facility on RehabLookup and experience verified, exclusive leads with full intake data."
    />
  );
}
