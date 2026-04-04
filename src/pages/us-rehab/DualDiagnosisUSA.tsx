import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  WhyUSATreatment,
  StateDestinations,
  PlacementCTA
} from "./components";
import { Brain, Heart, Shield, Sparkles } from "lucide-react";

const conditions = [
  { icon: Brain, title: "Depression & Addiction", description: "Integrated treatment for substance abuse with major depressive disorder and persistent depression" },
  { icon: Heart, title: "Anxiety & Addiction", description: "Comprehensive care for addiction co-occurring with generalized anxiety, panic disorder, or social anxiety" },
  { icon: Shield, title: "PTSD & Addiction", description: "Trauma-informed treatment addressing both substance use and post-traumatic stress disorder" },
  { icon: Sparkles, title: "Bipolar & Addiction", description: "Specialized programs for addiction with bipolar disorder, requiring careful medication management" },
];

const DualDiagnosisUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Dual Diagnosis Treatment in USA",
    "description": "Integrated treatment for addiction and mental health disorders in the United States. Expert psychiatric care combined with evidence-based addiction treatment.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "What is dual diagnosis treatment?", answer: "Dual diagnosis treatment addresses both addiction and co-occurring mental health conditions simultaneously. Rather than treating these as separate issues, integrated programs recognize that addiction and mental health are deeply interconnected and must be treated together for lasting recovery." },
    { question: "Why is US dual diagnosis treatment considered the best?", answer: "The US pioneered dual diagnosis treatment and continues to lead in research, clinical approaches, and specialized facilities. American programs offer access to board-certified psychiatrists, cutting-edge medications, and evidence-based therapies like EMDR, DBT, and trauma-focused CBT that may not be available elsewhere." },
    { question: "What mental health conditions are treated alongside addiction?", answer: "US dual diagnosis programs treat depression, anxiety disorders, PTSD, bipolar disorder, personality disorders, ADHD, OCD, eating disorders, and schizophrenia alongside substance addiction. Treatment is tailored to your specific combination of conditions." },
    { question: "How long does dual diagnosis treatment take?", answer: "Dual diagnosis typically requires longer treatment than addiction alone—60-90 days minimum is recommended. This allows time to stabilize both conditions, establish effective medications, process underlying trauma, and build robust coping strategies." },
    { question: "Will I receive psychiatric medication during treatment?", answer: "If clinically appropriate, yes. US facilities have psychiatrists who can prescribe and monitor medications for depression, anxiety, bipolar disorder, and other conditions. Medication is carefully managed alongside addiction treatment, and your home doctors can be consulted for continuity." }
  ];

  return (
    <Layout>
      <SEO
        title="Dual Diagnosis Treatment USA | Mental Health & Addiction Rehab America"
        description="Expert dual diagnosis treatment in America for international patients. Integrated care for addiction with depression, anxiety, PTSD, bipolar disorder. Top psychiatric and clinical teams."
        canonical="/us-rehab/dual-diagnosis-usa"
        keywords={["dual diagnosis USA", "mental health rehab America", "addiction depression treatment USA", "anxiety addiction rehab", "PTSD addiction treatment", "co-occurring disorders rehab America"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Dual Diagnosis", url: "/us-rehab/dual-diagnosis-usa" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Dual Diagnosis USA" },
        ]} />
      </div>

      <InternationalHero title="Dual Diagnosis Treatment in the USA" subtitle="Integrated Mental Health & Addiction Care" description="Access America's leading dual diagnosis programs. Expert psychiatric care, evidence-based therapies, and comprehensive treatment for addiction co-occurring with depression, anxiety, PTSD, and other mental health conditions." keywords={["dual diagnosis USA", "mental health addiction", "co-occurring disorders", "psychiatric rehab America"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Co-Occurring Conditions We Treat</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">US dual diagnosis programs specialize in treating addiction alongside these mental health conditions.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {conditions.map((condition, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <condition.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{condition.title}</h3>
                <p className="text-muted-foreground">{condition.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyUSATreatment />
      <StateDestinations title="Top States for Dual Diagnosis" subtitle="These US states are known for exceptional dual diagnosis programs with leading psychiatric expertise." />
      <CountriesServed />
      <InternationalFAQ title="Dual Diagnosis FAQs" subtitle="Common questions about seeking integrated mental health and addiction treatment in America." faqs={customFAQs} schemaId="dual-diagnosis-usa-faq" />
      <PlacementCTA title="Find Integrated Treatment" description="Get placed in America's top dual diagnosis programs. Expert psychiatric care meets evidence-based addiction treatment." />
    </Layout>
  );
};

export default DualDiagnosisUSA;
