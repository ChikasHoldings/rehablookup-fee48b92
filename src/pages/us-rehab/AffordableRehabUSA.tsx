import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, StateDestinations, InternationalFAQ, PlacementCTA } from "./components";
import { CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const affordableTips = [
  { title: "Compare Self-Pay Rates", description: "Many facilities offer 15–30% discounts for self-pay patients. Always ask about cash-pay pricing versus listed rates." },
  { title: "Consider Location", description: "Treatment in the Midwest or Southeast can be 30–50% less expensive than coastal cities while maintaining clinical excellence." },
  { title: "Shorter Intensive Programs", description: "Some facilities offer 21-day intensive programs that deliver comprehensive care at a lower total cost than traditional 30-day stays." },
  { title: "Ask About Scholarships", description: "Select accredited facilities maintain scholarship funds or sliding-scale fees for patients demonstrating financial need." },
];

const AffordableRehabUSA = () => {
  const faqs = [
    { question: "What is the most affordable rehab in the USA?", answer: "Quality accredited programs start around $8,000–$15,000 per month. Facilities in states like Arizona, Tennessee, and Texas often offer excellent clinical care at lower price points than California or New York." },
    { question: "Can I find good rehab in the USA for under $20,000?", answer: "Yes. Many CARF and Joint Commission accredited facilities offer comprehensive programs in this range. Focus on clinical quality indicators like accreditation, staff credentials, and evidence-based practices rather than luxury amenities." },
    { question: "Are affordable US rehab centers lower quality?", answer: "Not necessarily. Cost reflects amenities and location more than clinical quality. Many mid-range facilities employ highly credentialed staff and use the same evidence-based protocols as luxury centers." },
    { question: "What states offer the best value for rehab?", answer: "Arizona, Tennessee, Texas, Georgia, and Colorado offer excellent treatment quality at lower costs than coastal states. These states have thriving recovery communities and experienced treatment providers." },
    { question: "How can I reduce the cost of rehab in the USA?", answer: "Negotiate self-pay rates, consider non-coastal locations, ask about intensive shorter programs, explore payment plans, and let our placement team identify value-optimized programs." },
  ];

  return (
    <Layout>
      <SEO
        title="Affordable Rehab in USA | Quality Treatment at Value Pricing"
        description="Find affordable addiction treatment in the United States without sacrificing quality. Accredited programs, value-optimized facilities, and cost-saving strategies."
        canonical="/affordable-rehab-in-usa"
        keywords={["affordable rehab USA", "cheap rehab America", "low cost rehab USA", "budget rehab United States", "affordable addiction treatment USA"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Affordable Rehab in USA",
          description: "Quality addiction treatment at competitive pricing in the United States.",
          provider: { "@type": "Organization", name: "RehabLookup" },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Affordable Rehab", url: "/affordable-rehab-in-usa" },
        ]}
      />

      <InternationalPageHero
        flag="🏷️"
        badge="Value-Optimized Treatment"
        title="Affordable Rehab in the USA"
        subtitle="Quality Addiction Treatment Without the Premium Price Tag"
        description="World-class clinical care doesn't have to cost a fortune. Discover accredited U.S. programs that deliver exceptional outcomes at competitive prices."
        trustPoints={["Accredited Programs", "Self-Pay Discounts", "Value Locations", "Quality Assured"]}
        heroImage={heroImg}
        heroAlt="Affordable rehab centers in the United States"
      />

      {/* Value Tips */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Find Affordable Quality Treatment</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Smart strategies for accessing excellent clinical care without overpaying.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {affordableTips.map((tip, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-5 rounded-xl bg-muted/30 border border-border/50">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <StateDestinations title="Best-Value States for Treatment" subtitle="These states offer accredited programs at competitive price points with strong recovery communities." />
      <InternationalFAQ title="Affordable Rehab FAQs" subtitle="Common questions about finding quality treatment at competitive prices." faqs={faqs} schemaId="affordable-rehab-usa-faq" />
      <PlacementCTA title="Find Quality Treatment Within Your Budget" description="Our placement specialists identify accredited programs that deliver exceptional care at a price point that works for you." />
    </Layout>
  );
};

export default AffordableRehabUSA;
