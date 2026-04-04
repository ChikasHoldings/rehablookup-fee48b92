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
import { Pill, Brain, Shield, Users } from "lucide-react";

const substancePrograms = [
  { icon: Pill, title: "Opioid Treatment", description: "Comprehensive programs for heroin, fentanyl, and prescription painkiller addiction with MAT options" },
  { icon: Brain, title: "Stimulant Recovery", description: "Specialized treatment for cocaine, methamphetamine, and prescription stimulant addiction" },
  { icon: Shield, title: "Prescription Drug Rehab", description: "Programs for benzodiazepine, sleep medication, and other prescription drug dependencies" },
  { icon: Users, title: "Poly-Substance Treatment", description: "Integrated programs addressing multiple substance dependencies simultaneously" },
];

const DrugRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Drug Rehab in USA for International Patients",
    "description": "Premier drug addiction treatment in the United States for international patients. Medical detox, evidence-based therapies, luxury facilities.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    { question: "What types of drug addiction does US rehab treat?", answer: "American treatment centers treat all substance addictions including opioids (heroin, fentanyl, prescription painkillers), stimulants (cocaine, methamphetamine, Adderall), benzodiazepines, cannabis, and poly-substance dependencies. Specialized programs exist for specific substances and patient populations." },
    { question: "Does US drug rehab offer medication-assisted treatment (MAT)?", answer: "Yes, MAT is widely available in US facilities. FDA-approved medications like buprenorphine (Suboxone), methadone, and naltrexone (Vivitrol) are used alongside therapy. The US leads in MAT research and implementation, offering options that may not be available in other countries." },
    { question: "How does US drug rehab address underlying mental health?", answer: "American facilities excel in dual-diagnosis treatment, addressing addiction alongside depression, anxiety, PTSD, bipolar disorder, and other conditions. Integrated care includes psychiatric evaluation, medication management, and trauma-informed therapies." },
    { question: "What is the success rate of US drug rehab?", answer: "Success rates vary by program and individual factors. Top US facilities report 50-70% of patients maintaining sobriety at one year with proper aftercare engagement. The key is connecting you with the right program and comprehensive aftercare planning." },
    { question: "Can I bring prescription medications to US rehab?", answer: "Bring a list of current medications and prescriptions. The facility's medical team will evaluate and manage your medications. Some may continue, others may be tapered or replaced with US equivalents. Communication with your home doctors can be coordinated." }
  ];

  return (
    <Layout>
      <SEO
        title="Drug Rehab in USA | Best American Drug Treatment Centers"
        description="Premier drug addiction treatment in America for international patients. Medical detox, MAT programs, luxury facilities, dual-diagnosis care. Immediate admission."
        canonical="/us-rehab/drug-rehab-usa"
        keywords={["drug rehab USA", "American drug treatment", "drug detox America", "luxury drug rehab USA", "best drug rehab United States", "addiction treatment America", "opioid rehab USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Drug Rehab USA", url: "/us-rehab/drug-rehab-usa" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Drug Rehab USA" },
        ]} />
      </div>

      <InternationalHero title="Drug Rehab in the USA" subtitle="Premier Drug Addiction Treatment" description="Access America's most advanced drug treatment programs. Medical detox, medication-assisted treatment, evidence-based therapies, and comprehensive aftercare for all substance addictions." keywords={["drug rehab USA", "American drug treatment", "drug detox America", "opioid rehab USA"]} />

      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Substance-Specific Programs</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">US facilities offer specialized treatment tailored to specific substance addictions.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {substancePrograms.map((program, index) => (
              <div key={index} className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <program.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">{program.title}</h3>
                <p className="text-muted-foreground">{program.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <WhyUSATreatment />
      <StateDestinations title="Top States for Drug Rehab" subtitle="These US states offer exceptional drug treatment programs with cutting-edge therapies and supportive recovery environments." />
      <CountriesServed />
      <InternationalFAQ title="Drug Treatment FAQs" subtitle="Common questions about seeking drug addiction treatment in the United States." faqs={customFAQs} schemaId="drug-rehab-usa-faq" />
      <PlacementCTA title="Find Your Drug Treatment Program" description="Get placed in America's leading drug rehab centers. Medical detox, MAT, and comprehensive recovery support." />
    </Layout>
  );
};

export default DrugRehabUSA;
