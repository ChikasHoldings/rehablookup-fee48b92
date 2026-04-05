import { ProviderSEOPageLayout } from "@/components/provider-guides/ProviderSEOPageLayout";
import pgGetMorePatients from "@/assets/provider-guides/pg-get-more-patients.jpg";
import treatmentFacility from "@/assets/provider-guides/treatment-facility.jpg";

export default function IOPMarketingStrategies() {
  return (
    <ProviderSEOPageLayout
      title="IOP Marketing Strategies"
      metaTitle="IOP Marketing Strategies: Grow Your Intensive Outpatient Program | RehabLookup"
      metaDescription="Proven marketing strategies for IOP programs. Learn how to attract patients, build referral networks, and maintain full groups in your intensive outpatient program."
      canonical="/provider-guides/iop-marketing-strategies"
      keywords={["IOP marketing", "intensive outpatient marketing", "IOP patient acquisition", "outpatient rehab marketing", "IOP program growth"]}
      heroHeadline="IOP Marketing Strategies: Fill Your Groups and Grow Revenue"
      heroSubheadline="Intensive outpatient programs face unique marketing challenges. Learn the strategies that keep top IOPs running at full capacity with waiting lists."
      sections={[
        {
          heading: "Why IOP Marketing Requires a Different Approach",
          content: "Marketing an IOP program differs fundamentally from marketing residential treatment. Your patients continue living at home, which means competing with their daily routines, work schedules, and the inertia of not seeking help. Effective IOP marketing must overcome these barriers while highlighting the accessibility and flexibility of outpatient treatment.",
          bullets: [
            "IOPs compete against the patient's ability to 'manage on their own'",
            "Evening and weekend scheduling is a key differentiator — market it prominently",
            "Local SEO is even more critical for IOPs — patients commute to sessions daily",
            "Step-down referrals from residential programs can fill 30-50% of IOP capacity",
            "Insurance coverage for IOP is often stronger than residential — highlight this advantage",
          ],
        },
        {
          heading: "Digital Marketing for IOP Programs",
          content: "Your digital presence must communicate accessibility, flexibility, and clinical quality. The families searching for IOPs are often in a different mindset than those seeking residential — they're looking for treatment that fits into their existing lives.",
          bullets: [
            "Optimize your website for 'IOP near me' and '[city] intensive outpatient' keywords",
            "List your IOP program on RehabLookup with specific program hours and details",
            "Create content addressing common IOP questions: schedule, duration, what to expect",
            "Use Google Business Profile to highlight evening/weekend availability",
            "Showcase patient testimonials emphasizing 'treatment while maintaining normal life'",
          ],
        },
        {
          heading: "Building a Referral Pipeline for IOP",
          content: "IOPs are uniquely positioned to receive referrals from multiple sources. Residential facilities need step-down options, therapists need higher-level care for some clients, and EAPs look for programs that don't require employees to miss work.",
          bullets: [
            "Partner with residential treatment centers as their preferred step-down provider",
            "Develop referral relationships with individual therapists and group practices",
            "Connect with Employee Assistance Programs (EAPs) in your service area",
            "Build relationships with drug court coordinators and probation officers",
            "Network with primary care physicians who identify patients needing structured support",
          ],
        },
        {
          heading: "Maintaining Full Groups Year-Round",
          content: "IOP revenue depends on maintaining consistent group sizes. Unlike residential programs with fixed bed counts, IOPs must manage fluid enrollment as patients complete the program and new patients join at different stages.",
          bullets: [
            "Implement rolling admissions rather than fixed cohort start dates",
            "Track your pipeline weekly — know how many patients are graduating vs. starting",
            "Offer both morning and evening tracks to maximize scheduling flexibility",
            "Create a waitlist system that maintains engagement during capacity constraints",
            "Use RehabLookup analytics to understand your inquiry-to-enrollment conversion funnel",
          ],
        },
        {
          heading: "List Your IOP on RehabLookup",
          content: "RehabLookup helps families find IOP programs by location, insurance, and schedule. Listing your program ensures you appear when local families search for intensive outpatient options in your area — the most common search behavior for IOP seekers.",
          bullets: [
            "Free listing with complete program details and schedule information",
            "Appear in IOP-specific search filters and local treatment results",
            "Receive inquiries from families actively seeking outpatient treatment options",
            "Insurance-filtered searches connect you with patients your program can serve",
            "Upgrade to Pro for priority placement in local IOP search results",
          ],
        },
      ]}
      images={[
        { src: pgGetMorePatients, alt: "IOP program coordinator managing group enrollments", caption: "Successful IOPs maintain rolling admissions and track enrollment weekly." },
        { src: treatmentFacility, alt: "Modern intensive outpatient treatment facility", caption: "IOPs that market flexibility and accessibility consistently outperform competitors." },
      ]}
    />
  );
}
