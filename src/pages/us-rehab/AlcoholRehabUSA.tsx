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
import { Wine, Shield, Heart, Clock } from "lucide-react";

const treatmentApproaches = [
  { icon: Shield, title: "Medical Detox", description: "Safe, supervised alcohol withdrawal with 24/7 medical monitoring and medication-assisted treatment" },
  { icon: Heart, title: "Dual Diagnosis", description: "Integrated treatment for alcohol addiction and co-occurring mental health conditions" },
  { icon: Wine, title: "Specialized Programs", description: "Executive programs, luxury rehab, and tailored approaches for professionals and high-net-worth individuals" },
  { icon: Clock, title: "Extended Care", description: "30, 60, 90-day and longer programs for comprehensive recovery and relapse prevention" },
];

const AlcoholRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Alcohol Rehab in USA for International Patients",
    "description": "World-class alcohol addiction treatment in the United States for international patients. Medical detox, luxury facilities, evidence-based care.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "What makes US alcohol rehab different from other countries?", answer: "The US offers the most diverse and advanced alcohol treatment options globally, including FDA-approved medications (naltrexone, acamprosate, disulfiram), cutting-edge therapies like neurofeedback and EMDR, and luxury facilities with high staff-to-patient ratios. American programs also excel in dual-diagnosis treatment for alcohol with depression, anxiety, or trauma." },
    { question: "How long should I stay for alcohol rehab in America?", answer: "Most international patients choose 30-90 day programs. For alcohol addiction, 60-90 days is often recommended to complete detox, address underlying issues, and build strong recovery foundations. Longer stays correlate with better long-term outcomes." },
    { question: "Is medical detox necessary for alcohol addiction?", answer: "Yes, medical supervision during alcohol detox is strongly recommended. Alcohol withdrawal can be dangerous and potentially life-threatening. US facilities offer medically-managed detox with 24/7 monitoring, medication support, and comfort measures to ensure safety." },
    { question: "Can executives maintain privacy during alcohol treatment?", answer: "Absolutely. US executive alcohol programs offer private accommodations, limited phone/computer access for essential work, and complete confidentiality. Your treatment is protected by HIPAA laws and cannot be disclosed to employers or colleagues." },
    { question: "What aftercare is available for international patients?", answer: "US facilities develop comprehensive aftercare plans including virtual therapy options, alumni support networks, referrals to quality providers in your home country, and periodic check-in programs. Many patients return for tune-up visits or extended care." }
  ];

  return (
    <Layout>
      <SEO
        title="Alcohol Rehab in USA | Best American Alcohol Treatment Centers"
        description="World-class alcohol addiction treatment in America for international patients. Medical detox, luxury facilities, evidence-based therapies. Immediate admission available."
        canonical="/us-rehab/alcohol-rehab-usa"
        keywords={["alcohol rehab USA", "American alcohol treatment", "alcohol detox America", "luxury alcohol rehab USA", "best alcohol rehab United States", "alcohol addiction treatment America"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Alcohol Rehab USA", url: "/us-rehab/alcohol-rehab-usa" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Alcohol Rehab USA" },
        ]} />
      </div>

      <InternationalHero title="Alcohol Rehab in the USA" subtitle="World-Class Alcohol Addiction Treatment" description="Access America's leading alcohol treatment programs. Medical detox, evidence-based therapies, luxury accommodations, and comprehensive aftercare for lasting recovery." keywords={["alcohol rehab USA", "American alcohol treatment", "alcohol detox America", "best alcohol rehab"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Alcohol Treatment Approaches</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">US alcohol rehabs offer comprehensive, evidence-based treatment tailored to your needs.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {treatmentApproaches.map((approach, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <approach.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{approach.title}</h3>
                <p className="text-muted-foreground">{approach.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyUSATreatment />
      <StateDestinations title="Top States for Alcohol Rehab" subtitle="These US states are renowned for their exceptional alcohol treatment programs and recovery-friendly environments." />
      <CountriesServed />
      <InternationalFAQ title="Alcohol Treatment FAQs" subtitle="Common questions about seeking alcohol addiction treatment in the United States." faqs={customFAQs} schemaId="alcohol-rehab-usa-faq" />
      <PlacementCTA title="Find Your Alcohol Treatment Program" description="Get placed in America's best alcohol rehab centers. Medical detox, luxury care, and lasting recovery." />
    </Layout>
  );
};

export default AlcoholRehabUSA;
