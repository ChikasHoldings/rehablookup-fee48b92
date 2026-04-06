import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, InternationalFAQ, PlacementCTA } from "./components";
import { DollarSign, CreditCard, Landmark, Percent, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-international-rehab.jpg";

const paymentOptions = [
  { icon: CreditCard, title: "Private Pay (Self-Pay)", description: "The most common method for international patients. Pay directly via wire transfer, credit card, or bank draft. Many facilities offer discounted self-pay rates." },
  { icon: Percent, title: "Payment Plans & Financing", description: "Structured payment plans spread the cost over months. Some facilities partner with medical financing companies offering low-interest options." },
  { icon: Landmark, title: "International Insurance", description: "Some global health insurance policies cover addiction treatment abroad. Our team helps verify your international coverage and negotiate with facilities." },
  { icon: DollarSign, title: "Sliding Scale & Scholarships", description: "Select facilities offer need-based financial assistance. While less common for international patients, scholarship programs do exist at certain centers." },
];

const PayingForRehabUSANoInsurance = () => {
  const faqs = [
    { question: "Can I attend rehab in the USA without American insurance?", answer: "Absolutely. The majority of international patients are self-pay. U.S. facilities routinely admit patients without domestic insurance and often offer competitive self-pay rates that can be lower than insured rates." },
    { question: "What are the cheapest rehab options in the USA for foreigners?", answer: "Standard programs start around $10,000–$15,000 per month. Some facilities offer 30-day intensive programs at reduced rates for self-pay patients. Our team can identify programs that match your budget." },
    { question: "Can I pay for US rehab in my local currency?", answer: "Most facilities accept international wire transfers in USD. Some accept payments in GBP, EUR, AED, and other currencies. Credit cards with international processing are also widely accepted." },
    { question: "Do US rehab centers offer refunds if I leave early?", answer: "Refund policies vary by facility. Many programs offer prorated refunds for unused days. We recommend reviewing the refund policy carefully before admission and can help negotiate favorable terms." },
    { question: "Is it cheaper to do rehab in the USA or my home country?", answer: "While U.S. treatment may cost more upfront, the quality of care, access to FDA-approved medications, higher success rates, and stronger privacy protections often make it a better long-term investment." },
  ];

  return (
    <Layout>
      <SEO
        title="Paying for Rehab in USA Without Insurance | Self-Pay Guide"
        description="How to pay for addiction treatment in the USA without insurance. Self-pay options, financing, payment plans, and financial guidance for international patients."
        canonical="/paying-for-rehab-in-usa-without-insurance"
        keywords={["paying for rehab in USA without insurance", "self pay rehab USA", "rehab cost no insurance", "international patient rehab payment", "rehab financing USA"]}
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Paying for Rehab in USA Without Insurance",
        }}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "International", url: "/international" },
          { name: "Paying Without Insurance", url: "/paying-for-rehab-in-usa-without-insurance" },
        ]}
      />

      <InternationalPageHero
        flag="💳"
        badge="Financial Planning Guide"
        title="Paying for Rehab in the USA Without Insurance"
        subtitle="Self-Pay Options, Financing & Payment Plans"
        description="Most international patients pay privately for U.S. treatment. Explore your options for funding world-class addiction care without American health insurance."
        trustPoints={["Self-Pay Discounts", "Payment Plans", "Wire Transfer Accepted", "No Insurance Needed"]}
        heroImage={heroImg}
        heroAlt="Financial planning for international rehab patients"
      />

      {/* Payment Options */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">How to Pay for US Rehab</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">Multiple payment methods are available to international patients seeking treatment in America.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {paymentOptions.map((opt, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="p-6 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <opt.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{opt.title}</h3>
                <p className="text-sm text-muted-foreground">{opt.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Self-Pay Advantages */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center">Advantages of Self-Pay Treatment</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                "No insurance paperwork or delays",
                "Choose any facility without network restrictions",
                "Maximum privacy—no insurance records",
                "Often lower negotiated rates",
                "Immediate admission available",
                "Full control over treatment duration",
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

      <InternationalFAQ title="Payment & Financing FAQs" subtitle="Common questions about paying for addiction treatment in the USA as an international patient." faqs={faqs} schemaId="paying-rehab-usa-faq" />
      <PlacementCTA title="Get a Personalized Payment Plan" description="Our team helps international patients navigate costs and find programs that fit their budget—with no insurance required." />
    </Layout>
  );
};

export default PayingForRehabUSANoInsurance;
