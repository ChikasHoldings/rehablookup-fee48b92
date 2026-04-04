import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, WhyUSATreatment, StateDestinations, CountriesServed, InternationalFAQ, PlacementCTA } from "./components";
import { CheckCircle, Activity, Shield, Heart } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-international-rehab.jpg";

const TopDetoxCentersUSA = () => {
  const faqs = [
    { question: "What are the top detox centers in the USA?", answer: "The top U.S. detox centers are distinguished by Joint Commission or CARF accreditation, board-certified addiction medicine physicians, low patient-to-staff ratios, FDA-approved medication protocols, and seamless detox-to-treatment transitions. Our network includes only facilities meeting these standards." },
    { question: "How long does detox last at top US facilities?", answer: "Duration depends on the substance: alcohol (3–7 days), opioids (5–10 days), benzodiazepines (7–14+ days), and stimulants (3–7 days). Top facilities customize protocols based on individual medical needs and addiction severity." },
    { question: "Do top detox centers also offer full rehab?", answer: "Yes. Most top-tier detox centers offer integrated treatment tracks, transitioning patients seamlessly from detox into residential or intensive outpatient programs without interrupting care." },
    { question: "How do I know a detox center is truly 'top-rated'?", answer: "Look for accreditation (Joint Commission, CARF), state licensing, board-certified physicians, published outcomes data, and positive patient reviews. Our team pre-vets all facilities in our network." },
    { question: "Can international patients access top US detox centers?", answer: "Absolutely. Our international placement service specializes in connecting global patients with America's highest-rated detox and treatment facilities, handling visa guidance, travel logistics, and admission coordination." },
  ];

  return (
    <Layout>
      <SEO
        title="Top Detox Centers USA | Best Medical Detox Facilities America"
        description="Discover the top-rated medical detox centers in the USA. Accredited facilities with 24/7 medical staff, FDA-approved protocols, and proven outcomes."
        canonical="/top-detox-centers-usa"
        keywords={["top detox centers USA", "best detox facilities America", "medical detox centers USA", "highest rated detox USA", "best drug detox America"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Top Detox Centers USA",
          description: "America's highest-rated medical detoxification facilities.",
          provider: { "@type": "Organization", name: "RehabLookup" },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Top Detox Centers", url: "/top-detox-centers-usa" },
        ]}
      />

      <InternationalPageHero
        flag="🏆"
        badge="Highest-Rated Facilities"
        title="Top Detox Centers in the USA"
        subtitle="America's Most Trusted Medical Detox Facilities"
        description="Access the nation's best medical detoxification programs. Accredited, physician-led, and equipped with the latest FDA-approved protocols for safe withdrawal management."
        trustPoints={["Accredited Programs", "Board-Certified MDs", "24/7 Nursing Care", "Proven Outcomes"]}
        heroImage={heroImg}
        heroAlt="Top-rated medical detox center in America"
      />

      {/* What Makes Them Top */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What Makes a Detox Center 'Top-Rated'?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">The best detox facilities in America share these defining characteristics.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto">
            {[
              "Joint Commission or CARF accredited",
              "Board-certified addiction medicine physicians",
              "Low patient-to-nurse ratios (1:4 or better)",
              "FDA-approved medication protocols",
              "24/7 vital sign monitoring",
              "Integrated mental health assessments",
              "Seamless detox-to-rehab transitions",
              "Comprehensive aftercare planning",
              "Private & comfortable environments",
              "Evidence-based clinical protocols",
            ].map((item) => (
              <motion.div key={item} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm text-foreground">{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WhyUSATreatment />
      <StateDestinations title="Top States for Medical Detox" subtitle="These states have the highest concentration of accredited, top-rated detox facilities." />
      <CountriesServed />
      <InternationalFAQ title="Top Detox Center FAQs" subtitle="Common questions about America's highest-rated detoxification facilities." faqs={faqs} schemaId="top-detox-usa-faq" />
      <PlacementCTA title="Access America's Top Detox Centers" description="Our placement team connects you with the nation's highest-rated detox facilities based on your specific substance, medical needs, and preferences." />
    </Layout>
  );
};

export default TopDetoxCentersUSA;
