import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  PlacementCTA
} from "./components";
import { Globe, Plane, FileCheck, Heart, Users, MessageCircle } from "lucide-react";

const internationalServices = [
  { icon: Plane, title: "Travel Coordination", description: "Airport pickup, transportation, and arrival assistance" },
  { icon: FileCheck, title: "Visa Support", description: "Documentation and guidance for B-2 medical visa applications" },
  { icon: Globe, title: "Multilingual Staff", description: "Treatment teams fluent in multiple languages" },
  { icon: Heart, title: "Cultural Sensitivity", description: "Programs respecting diverse backgrounds and traditions" },
  { icon: Users, title: "Family Support", description: "International family programs and virtual sessions" },
  { icon: MessageCircle, title: "24/7 Communication", description: "Support available across all time zones" }
];

const InternationalPatients = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Rehab for International Patients",
    "description": "Specialized addiction treatment services for international patients seeking treatment in the United States, including visa support, travel coordination, and culturally sensitive care.",
    "provider": { "@type": "Organization", "name": "RehabLookup" },
    "areaServed": { "@type": "Country", "name": "United States" }
  };

  const customFAQs = [
    {
      question: "Why do international patients choose US rehab?",
      answer: "International patients choose US treatment for world-class clinical care, privacy from their home community, access to innovative therapies, English-speaking environments, and the opportunity to focus entirely on recovery away from triggers and responsibilities."
    },
    {
      question: "How does the visa process work for treatment?",
      answer: "Most patients enter on a B-2 tourist visa for medical treatment. You'll need a letter from the treatment facility, proof of funds, and standard visa documentation. Our team helps facilitate the documentation process. Allow 2-4 weeks for visa processing."
    },
    {
      question: "What if I don't speak English fluently?",
      answer: "Many US treatment centers have multilingual staff and translation services. Spanish, French, German, Arabic, Mandarin, and other languages are commonly supported. We match you with facilities that can accommodate your language needs."
    },
    {
      question: "How do I pay for treatment without US insurance?",
      answer: "International patients typically self-pay. Treatment centers accept wire transfers, credit cards, and sometimes cryptocurrency. Costs range from $20,000-$100,000+ per month depending on the program. Many offer payment plans."
    },
    {
      question: "What happens after treatment? Can I stay in the US?",
      answer: "Your B-2 visa typically allows stays up to 6 months with possible extensions. Some patients transition to sober living for continued support. We also connect you with recovery resources in your home country for ongoing care."
    },
    {
      question: "Will my family be involved in treatment?",
      answer: "Yes, family involvement is encouraged. Many programs offer virtual family therapy sessions across time zones, in-person family weekends, and family education programs. Some families choose to visit during treatment."
    },
    {
      question: "How do I get from the airport to the treatment center?",
      answer: "Treatment facilities arrange airport pickup services. You'll be met by staff and transported directly to the facility. Private car services and even helicopter transfers are available for premium programs."
    },
    {
      question: "Is my treatment confidential in another country?",
      answer: "Absolutely. US HIPAA laws protect your privacy, and being in a different country adds geographic separation from your community. Your treatment records cannot be shared without your explicit consent."
    }
  ];

  return (
    <Layout>
      <Helmet>
        <title>Rehab for International Patients | US Addiction Treatment for Foreigners | RehabLookup</title>
        <meta 
          name="description" 
          content="Specialized US addiction treatment services for international patients. Visa support, travel coordination, multilingual staff, and culturally sensitive care for clients worldwide." 
        />
        <meta 
          name="keywords" 
          content="rehab for foreigners USA, international patient treatment, US rehab for overseas patients, American rehab foreign clients, addiction treatment for non-Americans" 
        />
        <link rel="canonical" href="https://rehablookup.com/us-rehab/international-patients" />
        <meta property="og:title" content="Rehab for International Patients | US Treatment for Foreigners" />
        <meta property="og:description" content="Specialized US addiction treatment for international patients with visa support, travel coordination, and culturally sensitive care." />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <InternationalHero
        title="US Rehab for International Patients"
        subtitle="World-Class Treatment, Global Accessibility"
        description="We specialize in helping international clients access America's finest addiction treatment facilities. From visa guidance to airport pickup, we handle every detail of your treatment journey."
        keywords={["rehab for foreigners", "international treatment USA", "overseas patient rehab"]}
      />

      {/* International Services */}
      <section className="py-16 md:py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 text-primary mb-4">
              <Globe className="h-6 w-6" />
              <span className="text-sm font-semibold uppercase tracking-wide">International Services</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Comprehensive Support for Global Clients
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We understand the unique needs of international patients and provide 
              end-to-end support for your treatment journey in America.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {internationalServices.map((service, index) => (
              <div 
                key={index}
                className="p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <service.icon className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {service.title}
                </h3>
                <p className="text-muted-foreground">
                  {service.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CountriesServed />

      <InternationalFAQ 
        title="International Patient FAQs"
        subtitle="Everything you need to know about seeking addiction treatment in the US as an international patient."
        faqs={customFAQs}
        schemaId="international-patients-faq"
      />

      <PlacementCTA 
        title="Start Your US Treatment Journey"
        description="Our international team is ready to guide you through every step—from initial inquiry to admission and beyond."
      />
    </Layout>
  );
};

export default InternationalPatients;
