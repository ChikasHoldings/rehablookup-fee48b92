import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, StateDestinations, InternationalFAQ, PlacementCTA } from "./components";
import { Clock, Zap, Phone, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const FastAdmissionRehabUSA = () => {
  const faqs = [
    { question: "How fast can I be admitted to rehab in the USA?", answer: "Many U.S. facilities offer same-day or next-day admission for domestic patients. International patients can typically be admitted within 3–7 days, accounting for travel arrangements. Emergency admissions may be possible within 24–48 hours." },
    { question: "Can international patients get same-day admission?", answer: "If you're already in the United States, yes—many facilities accept same-day walk-ins. For patients abroad, we can have a bed reserved and admission paperwork completed within 24 hours while you arrange travel." },
    { question: "What do I need for fast admission?", answer: "A valid passport, travel visa (B-2 or ESTA), a brief medical history, current medications list, and payment method. Our team can expedite the intake process to minimize delays." },
    { question: "Is rapid admission safe for medical detox?", answer: "Absolutely. Facilities with fast-admission protocols maintain 24/7 medical staff ready for immediate intake. Medical assessments are conducted upon arrival to ensure safe detoxification." },
    { question: "Can I reserve a bed while I arrange travel?", answer: "Yes. Many facilities will hold a bed for 48–72 hours with a deposit. Our team coordinates reservation, travel, and admission timing to ensure seamless placement." },
  ];

  return (
    <Layout>
      <SEO
        title="Fast Admission Rehab USA | Same-Day & Rapid Intake Treatment"
        description="Immediate admission to top US rehab centers. Same-day intake, rapid medical detox, and expedited placement for urgent addiction treatment needs."
        canonical="/fast-admission-rehab-usa"
        keywords={["fast admission rehab USA", "same day rehab admission", "immediate intake rehab", "urgent rehab admission USA", "rapid detox admission"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: "Fast Admission Rehab USA",
          description: "Immediate and rapid admission to addiction treatment centers in the United States.",
          provider: { "@type": "Organization", name: "RehabLookup" },
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Fast Admission", url: "/fast-admission-rehab-usa" },
        ]}
      />

      <InternationalPageHero
        flag="⚡"
        badge="Rapid Intake Available"
        title="Fast Admission Rehab in the USA"
        subtitle="Same-Day Intake & Expedited Placement"
        description="When you're ready for treatment, every hour counts. Access U.S. facilities with same-day admission, 24/7 intake teams, and rapid medical detox protocols."
        trustPoints={["Same-Day Admission", "24/7 Intake Teams", "Medical Detox Ready", "Bed Reservation"]}
        breadcrumbItems={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Fast Admission" },
        ]}
      />

      {/* Urgency Section */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How Fast Admission Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Our expedited process eliminates barriers between decision and admission.</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: Phone, time: "Within 1 Hour", title: "Clinical Assessment", desc: "Confidential phone evaluation with a placement specialist. We identify the right program and confirm availability." },
              { icon: Zap, time: "Within 24 Hours", title: "Admission Confirmed", desc: "Bed reserved, intake paperwork completed, and travel or transport arrangements initiated." },
              { icon: Shield, time: "Upon Arrival", title: "Medical Intake", desc: "Immediate medical evaluation, vitals monitoring, and safe detox protocol initiated by 24/7 clinical staff." },
            ].map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="text-center p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <span className="text-xs font-semibold text-accent uppercase tracking-wide">{step.time}</span>
                <h3 className="font-semibold text-foreground mt-1 mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Urgent CTA */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-3">Need Immediate Help?</h2>
            <p className="text-muted-foreground mb-6 max-w-lg mx-auto">Our 24/7 placement team can have you admitted to a top U.S. facility within hours.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6">
                <Link to="/international/apply" className="flex items-center gap-2">Get Admitted Now <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="px-8 py-6">
                <Link to="/concierge">Speak to an Advisor</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <StateDestinations title="States With Fastest Admissions" subtitle="These states have the highest concentration of facilities offering same-day and next-day intake." />
      <InternationalFAQ title="Fast Admission FAQs" subtitle="Common questions about rapid intake and immediate admission to U.S. rehab centers." faqs={faqs} schemaId="fast-admission-rehab-faq" />
      <PlacementCTA title="Don't Wait — Get Placed Today" description="Every day without treatment matters. Our team expedites your admission so you can start healing immediately." />
    </Layout>
  );
};

export default FastAdmissionRehabUSA;
