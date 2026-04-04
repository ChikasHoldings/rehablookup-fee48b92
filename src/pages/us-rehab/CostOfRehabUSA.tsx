import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, CountriesServed, InternationalFAQ, PlacementCTA } from "./components";
import { DollarSign, CheckCircle, TrendingUp, Shield } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-international-rehab.jpg";

const costTiers = [
  { tier: "Standard Programs", range: "$10,000 – $30,000/month", features: ["Shared accommodations", "Group therapy focus", "Medical detox included", "Basic aftercare plan"], highlight: false },
  { tier: "Premium Programs", range: "$30,000 – $60,000/month", features: ["Private or semi-private rooms", "Individual therapy emphasis", "Holistic therapies included", "Extended aftercare support"], highlight: true },
  { tier: "Luxury & Executive", range: "$60,000 – $120,000+/month", features: ["Private suites & gourmet dining", "1-on-1 dedicated therapist", "Spa, fitness & concierge", "Lifetime alumni network"], highlight: false },
];

const CostOfRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Cost of Rehab in USA for International Patients",
    description: "Comprehensive guide to addiction treatment costs in the United States for international patients. Pricing tiers, payment options, and financial planning.",
  };

  const faqs = [
    { question: "How much does rehab in the USA cost for international patients?", answer: "Treatment costs range from $10,000–$120,000+ per month depending on the level of care, amenities, and program duration. Most international patients choose 30–90 day programs at premium or luxury facilities, typically investing $30,000–$80,000 for comprehensive treatment." },
    { question: "Can I use international health insurance for US rehab?", answer: "Some international insurance policies cover addiction treatment abroad. Our team helps verify your coverage and negotiate with facilities. Many premium programs offer direct billing for major international insurers." },
    { question: "Are there payment plans available for international patients?", answer: "Yes, many facilities offer structured payment plans, medical financing, and phased payment options. Some programs accept wire transfers, cryptocurrency, and multiple international payment methods." },
    { question: "What is included in the cost of US rehab?", answer: "Most programs include accommodation, all meals, medical care, individual and group therapy, psychiatric services, medication management, recreational activities, and basic aftercare planning. Luxury programs add premium amenities." },
    { question: "Is US rehab worth the investment compared to local options?", answer: "U.S. facilities offer FDA-approved treatments, higher staff-to-patient ratios, more evidence-based modalities, and greater privacy than most international alternatives. The investment often results in better long-term outcomes and reduced relapse rates." },
  ];

  return (
    <Layout>
      <SEO
        title="Cost of Rehab in USA | International Patient Pricing Guide"
        description="Comprehensive guide to addiction treatment costs in the United States for international patients. Compare pricing tiers, payment options, and what's included."
        canonical="/cost-of-rehab-in-usa-for-international-patients"
        keywords={["cost of rehab in USA", "rehab pricing America", "international rehab cost", "how much does rehab cost USA", "paying for rehab USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "International", url: "/international" },
          { name: "Cost of Rehab in USA", url: "/cost-of-rehab-in-usa-for-international-patients" },
        ]}
      />

      <InternationalPageHero
        flag="💰"
        badge="International Pricing Guide"
        title="Cost of Rehab in the USA for International Patients"
        subtitle="Transparent Pricing, Exceptional Value"
        description="Understand the full cost of addiction treatment in America. From standard programs to ultra-luxury facilities, find the right investment for lasting recovery."
        trustPoints={["Transparent Pricing", "Payment Plans Available", "Insurance Verification", "No Hidden Fees"]}
        heroImage={heroImg}
        heroAlt="Cost guide for international rehab patients in the USA"
      />

      {/* Cost Tiers */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Treatment Cost Tiers</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">U.S. treatment costs vary based on facility quality, amenities, location, and program length.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {costTiers.map((tier, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className={`p-6 rounded-xl border ${tier.highlight ? "border-primary bg-primary/5 shadow-md" : "border-border/50 bg-muted/30"}`}>
                <h3 className="text-lg font-bold text-foreground mb-1">{tier.tier}</h3>
                <p className={`text-xl font-bold mb-4 ${tier.highlight ? "text-primary" : "text-accent"}`}>{tier.range}</p>
                <ul className="space-y-2">
                  {tier.features.map((f, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">What's Typically Included</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Medical detox & stabilization",
                "Individual therapy sessions",
                "Group counseling & support",
                "Psychiatric evaluation & medication",
                "Accommodation & all meals",
                "Recreational & wellness activities",
                "Family therapy sessions",
                "Aftercare & discharge planning",
                "24/7 medical supervision",
                "Evidence-based treatment protocols",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border/50">
                  <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm text-foreground">{item}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Payment Methods */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Payment Options for International Patients</h2>
            <p className="text-muted-foreground mb-8">U.S. facilities accommodate a wide range of international payment methods.</p>
            <div className="grid sm:grid-cols-3 gap-4">
              {[
                { icon: CreditCard, label: "Wire Transfer & Credit Card" },
                { icon: Shield, label: "International Insurance" },
                { icon: TrendingUp, label: "Financing & Payment Plans" },
              ].map((m, i) => (
                <div key={i} className="p-5 rounded-xl bg-muted/30 border border-border/50 text-center">
                  <m.icon className="h-8 w-8 text-primary mx-auto mb-3" />
                  <span className="text-sm font-medium text-foreground">{m.label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="Cost & Payment FAQs" subtitle="Common questions about paying for addiction treatment in the United States." faqs={faqs} schemaId="cost-rehab-usa-faq" />
      <PlacementCTA title="Get a Personalized Cost Estimate" description="Our placement team provides transparent pricing and helps identify the best program within your budget." />
    </Layout>
  );
};

export default CostOfRehabUSA;
