import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { InternationalPageHero, CountriesServed, InternationalFAQ, WhyUSATreatment, PlacementCTA } from "./components";
import { Link } from "react-router-dom";
import { CheckCircle, Globe, FileCheck, Shield, Heart } from "lucide-react";
import { motion } from "framer-motion";
import heroImg from "@/assets/hero-international-rehab.jpg";

const eligibilityPoints = [
  { icon: FileCheck, title: "Visa Requirements", description: "Most patients enter on a B-2 visa or ESTA waiver. Facilities provide admission documentation to support applications." },
  { icon: Shield, title: "Privacy Protections", description: "U.S. HIPAA laws provide the strongest medical privacy protections in the world. Your treatment is 100% confidential." },
  { icon: Heart, title: "No Citizenship Required", description: "U.S. rehab centers welcome patients of all nationalities. Treatment is available regardless of citizenship or residency status." },
  { icon: Globe, title: "Multilingual Support", description: "Many facilities offer counselors fluent in Arabic, Spanish, French, Mandarin, Portuguese, and other languages." },
];

const ForeignersRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    name: "Can Foreigners Go to Rehab in the USA?",
    description: "Yes. Complete guide for international patients seeking addiction treatment in the United States. Visa requirements, eligibility, and admission process.",
  };

  const faqs = [
    { question: "Can foreigners legally attend rehab in the USA?", answer: "Absolutely. The United States welcomes international patients for medical treatment including addiction rehabilitation. You'll typically enter on a B-2 tourist/medical visa or ESTA waiver. There are no laws preventing non-citizens from receiving addiction treatment." },
    { question: "Do I need health insurance to go to rehab in America?", answer: "No. Most international patients pay privately (self-pay). Some international insurance policies may cover treatment. Many facilities offer payment plans and financing options for self-pay patients." },
    { question: "Will my employer or family know I went to rehab in the USA?", answer: "No. U.S. federal law (HIPAA and 42 CFR Part 2) provides the strictest medical confidentiality protections in the world. Facilities cannot disclose your treatment to anyone without your written consent." },
    { question: "How long can I stay in the USA for rehab?", answer: "B-2 visas typically allow stays of up to 6 months. ESTA waivers permit 90 days. For longer treatment, visa extensions can be requested. Most programs range from 30–90 days." },
    { question: "What languages are available at US rehab centers?", answer: "While English is primary, many premium facilities offer bilingual therapists in Spanish, Arabic, French, Mandarin, Russian, Portuguese, and other languages. Translation services are also commonly available." },
  ];

  return (
    <Layout>
      <SEO
        title="Can Foreigners Go to Rehab in USA? | International Admissions"
        description="Yes, foreigners can attend rehab in the USA. Complete guide on eligibility, visa requirements, privacy protections, and admission process for international patients."
        canonical="/can-foreigners-go-to-rehab-in-usa"
        keywords={["can foreigners go to rehab in USA", "international patients rehab America", "non-citizen rehab USA", "rehab for foreigners USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "International", url: "/international" },
          { name: "Foreigners Rehab USA", url: "/can-foreigners-go-to-rehab-in-usa" },
        ]}
      />

      <InternationalPageHero
        flag="🌍"
        badge="International Admissions Guide"
        title="Can Foreigners Go to Rehab in the USA?"
        subtitle="Yes — And Here's Everything You Need to Know"
        description="The United States welcomes international patients for addiction treatment. Learn about eligibility, visa requirements, privacy protections, and how to get admitted."
        trustPoints={["No Citizenship Required", "HIPAA Protected", "Visa Guidance", "Multilingual Staff"]}
        heroImage={heroImg}
        heroAlt="International patient at US rehab facility"
      />

      {/* Eligibility Section */}
      <section className="py-14 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">What International Patients Need to Know</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">The process for attending rehab in America as a foreign national is straightforward and well-established.</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {eligibilityPoints.map((item, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                className="flex gap-4 p-5 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <WhyUSATreatment />

      {/* Country-specific links */}
      <section className="py-14 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">Country-Specific Guides</h2>
            <p className="text-muted-foreground">Detailed information tailored to patients from specific regions.</p>
          </motion.div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 max-w-4xl mx-auto">
            {[
              { flag: "🇬🇧", label: "UK Patients", href: "/us-rehab/uk-patients" },
              { flag: "🇨🇦", label: "Canadians", href: "/us-rehab/canadian-patients" },
              { flag: "🇦🇪", label: "UAE & Gulf", href: "/us-rehab/uae-middle-east" },
              { flag: "🇦🇺", label: "Australians", href: "/us-rehab/australian-patients" },
              { flag: "🇪🇺", label: "Europeans", href: "/us-rehab/european-patients" },
            ].map((c) => (
              <Link key={c.href} to={c.href} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:bg-muted/20 transition-colors">
                <span className="text-3xl">{c.flag}</span>
                <span className="text-sm font-medium text-foreground">{c.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />
      <InternationalFAQ title="International Admissions FAQs" subtitle="Common questions from international patients about attending rehab in the United States." faqs={faqs} schemaId="foreigners-rehab-usa-faq" />
      <PlacementCTA title="Get Started as an International Patient" description="Our advisors specialize in international admissions and will guide you through every step of the process." />
    </Layout>
  );
};

export default ForeignersRehabUSA;
