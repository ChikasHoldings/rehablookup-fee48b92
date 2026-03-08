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

const RehabUSAFromUAE = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Rehab for UAE & Middle East Patients",
    "description": "Discreet American addiction treatment for patients from UAE, Dubai, Saudi Arabia, and the Middle East. Luxury facilities, complete confidentiality.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": [
      { "@type": "Country", "name": "United Arab Emirates" },
      { "@type": "Country", "name": "United States" }
    ]
  };

  const customFAQs = [
    { question: "Can UAE residents get rehab in America?", answer: "Yes, US treatment centers welcome patients from the UAE, Dubai, Abu Dhabi, and across the Middle East. Many luxury American facilities specialize in serving international clients and understand the unique privacy needs of Middle Eastern patients." },
    { question: "Is treatment in America confidential from UAE authorities?", answer: "Absolutely. US treatment facilities operate completely independently of Middle Eastern governments. Your records are protected by US HIPAA laws and cannot be shared with UAE authorities, employers, or family members without your explicit written consent." },
    { question: "Do US rehabs accommodate Arabic-speaking patients?", answer: "Many US facilities offer Arabic-speaking staff or professional translation services. We can match you with programs that accommodate your language preferences and cultural needs, including dietary requirements and prayer accommodations." },
    { question: "What is the cost of US rehab for UAE patients?", answer: "Luxury US treatment programs typically range from $30,000-$100,000+ per month for Middle Eastern clients seeking premium accommodations. Executive programs with private suites, concierge services, and comprehensive aftercare are most popular with UAE patients." },
    { question: "How do I travel from Dubai to US rehab?", answer: "UAE citizens can apply for a US B-2 visa for medical treatment. Our team coordinates all logistics including visa documentation, flight arrangements, and private airport transfers to ensure a discrete, seamless journey from Dubai to your treatment facility." }
  ];

  return (
    <Layout>
      <SEO
        title="US Rehab for UAE Patients | American Treatment from Dubai & Middle East"
        description="Discreet addiction treatment in America for UAE, Dubai, and Middle East patients. Luxury US rehab with complete confidentiality, Arabic support, and cultural sensitivity."
        canonical="/us-rehab/uae-middle-east"
        keywords={["US rehab from UAE", "American rehab Dubai", "addiction treatment USA Middle East", "luxury rehab America Arabic", "private rehab USA Emirates"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "UAE & Middle East", url: "/us-rehab/uae-middle-east" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "UAE & Middle East" },
        ]} />
      </div>

      <InternationalHero title="US Rehab for UAE & Middle East" subtitle="Discreet American Treatment for Gulf Region Clients" description="Access America's most exclusive treatment centers with complete confidentiality. Luxury accommodations, cultural sensitivity, and world-class clinical care for patients from Dubai, Abu Dhabi, and the Middle East." keywords={["UAE rehab USA", "Dubai treatment America", "Middle East rehab US", "Arabic rehab America"]} />
      <WhyUSATreatment />
      <StateDestinations title="Top US Destinations for Middle East Patients" subtitle="Gulf region clients frequently choose these American locations for their luxury accommodations, privacy, and welcoming environments." />
      <CountriesServed />
      <InternationalFAQ title="UAE & Middle East Treatment FAQs" subtitle="Common questions from patients in the Gulf region considering addiction treatment in America." faqs={customFAQs} schemaId="uae-us-rehab-faq" />
      <PlacementCTA title="Begin Your Confidential Recovery" description="Our advisors understand Middle Eastern client needs. Get placed in discreet, luxury US treatment today." />
    </Layout>
  );
};

export default RehabUSAFromUAE;
