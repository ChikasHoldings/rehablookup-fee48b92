import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, StateDestinations, InternationalFAQ, PlacementCTA } from "./components";
import { Heart, Shield, Activity, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const detoxTypes = [
  { title: "Alcohol Detox", duration: "3–7 days", description: "Medically supervised withdrawal with benzodiazepine protocols, vital sign monitoring, and seizure prevention." },
  { title: "Opioid Detox", duration: "5–10 days", description: "Comfort-focused withdrawal using buprenorphine, methadone, or naltrexone with 24/7 nursing care." },
  { title: "Benzodiazepine Detox", duration: "7–14+ days", description: "Gradual tapering protocols under close medical supervision. Extended monitoring for complex cases." },
  { title: "Stimulant Detox", duration: "3–7 days", description: "Symptom management for cocaine, methamphetamine, and prescription stimulant withdrawal with psychiatric support." },
];

const SameDayDetoxUSA = () => {
  const faqs = [
    { question: "Can I start detox the same day I arrive?", answer: "Yes. Facilities with same-day detox capabilities have 24/7 medical staff ready for immediate intake. Upon arrival, you'll receive a medical evaluation and begin a personalized detox protocol, typically within hours." },
    { question: "Is same-day detox safe?", answer: "Absolutely. Same-day detox programs are staffed by experienced physicians and nurses who follow established medical protocols. Patients receive continuous monitoring, medication management, and immediate intervention if complications arise." },
    { question: "What medications are used during detox?", answer: "Depending on the substance, FDA-approved medications include buprenorphine (Suboxone), methadone, naltrexone, benzodiazepines for alcohol withdrawal, and various comfort medications to manage symptoms." },
    { question: "What happens after detox?", answer: "Detox is the first step. Patients transition into residential or outpatient treatment programs for behavioral therapy, counseling, and long-term recovery planning. Most facilities offer seamless detox-to-treatment pathways." },
    { question: "Can international patients access same-day detox?", answer: "If you're already in the U.S., yes. For patients abroad, we can reserve a detox bed and coordinate rapid travel. Many international patients arrive and begin detox within the same day." },
  ];

  return (
    <Layout>
      <SEO
        title="Same-Day Detox USA | Immediate Medical Detoxification Centers"
        description="Same-day medical detox at top US facilities. Immediate intake, 24/7 medical supervision, FDA-approved protocols for alcohol, opioid, and drug withdrawal."
        canonical="/same-day-detox-usa"
        keywords={["same day detox USA", "immediate detox centers", "emergency detox America", "rapid detox USA", "medical detox same day"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Same-Day Detox USA",
          description: "Immediate medical detoxification services at accredited U.S. treatment centers.",
          provider: { "@type": "Organization", name: "RehabLookup" },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Same-Day Detox", url: "/same-day-detox-usa" },
        ]}
      />

      <InternationalPageHero
        flag="🏥"
        badge="Immediate Medical Detox"
        title="Same-Day Detox in the USA"
        subtitle="Walk In Today, Start Healing Today"
        description="Access immediate medical detoxification at accredited U.S. facilities. 24/7 nursing care, FDA-approved protocols, and seamless transition to full treatment."
        trustPoints={["Same-Day Intake", "24/7 Medical Staff", "FDA-Approved Meds", "Detox-to-Rehab Pathway"]}
        breadcrumbItems={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Same-Day Detox" },
        ]}
      />

      {/* Detox Types */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Medical Detox Programs Available</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Substance-specific detox protocols designed for safety, comfort, and clinical excellence.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {detoxTypes.map((type, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-foreground">{type.title}</h3>
                  <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-1 rounded-full">{type.duration}</span>
                </div>
                <p className="text-sm text-muted-foreground">{type.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">Why Medical Detox Matters</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "Prevents dangerous withdrawal complications",
                "24/7 nursing and physician oversight",
                "Medication-assisted comfort management",
                "Vital sign monitoring every 2–4 hours",
                "Seizure prevention protocols",
                "Psychiatric evaluation included",
                "Nutrition and hydration support",
                "Seamless transition to ongoing treatment",
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

      <StateDestinations title="Top States for Medical Detox" subtitle="These states have the highest concentration of accredited detox facilities with same-day intake capabilities." />
      <InternationalFAQ title="Same-Day Detox FAQs" subtitle="Common questions about immediate medical detoxification in the United States." faqs={faqs} schemaId="same-day-detox-usa-faq" />
      <PlacementCTA title="Start Detox Today" description="Our team connects you with facilities offering immediate medical detox. Call now or submit an inquiry for rapid placement." />
    </Layout>
  );
};

export default SameDayDetoxUSA;
