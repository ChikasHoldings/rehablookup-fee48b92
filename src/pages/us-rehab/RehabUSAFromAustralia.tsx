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

const RehabUSAFromAustralia = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Rehab for Australian Patients",
    "description": "American addiction treatment centers for Australian patients. Access cutting-edge US programs, luxury facilities, and immediate admission.",
    "provider": { "@type": "Organization", "name": "RehabLookup", "url": "https://rehablookup.com" },
    "areaServed": [
      { "@type": "Country", "name": "Australia" },
      { "@type": "Country", "name": "United States" }
    ]
  };

  const customFAQs = [
    { question: "Can Australians get addiction treatment in the US?", answer: "Yes, American rehab centers welcome Australian patients. The US offers treatment options, specialty programs, and luxury accommodations that may not be available in Australia. Many Aussies choose US treatment for privacy, innovation, and immediate admission." },
    { question: "How does US rehab compare to Australian treatment?", answer: "The US has the world's largest private rehab industry, offering more variety in treatment approaches, luxury levels, and specializations. American facilities often have access to newer therapies, medications, and clinical innovations before they reach Australia." },
    { question: "What is the cost for Australians seeking US rehab?", answer: "Australian patients typically invest $20,000-$80,000+ AUD per month for US treatment, depending on the facility level. This is private-pay as Medicare doesn't cover overseas treatment. Many consider it worthwhile for premium care and fresh-start environment." },
    { question: "Do I need a visa from Australia for US treatment?", answer: "Australian citizens can use ESTA (Visa Waiver Program) for treatment stays up to 90 days. For longer programs, a B-2 medical visa is recommended. Our team provides documentation to support your visa application and coordinates travel logistics." },
    { question: "Will my Australian employer find out about US treatment?", answer: "No. US treatment is completely confidential and separate from Australian systems. Records are protected by US HIPAA laws and cannot be accessed by Australian employers, insurers, or government agencies without your consent." }
  ];

  return (
    <Layout>
      <SEO
        title="US Rehab for Australians | American Addiction Treatment from Australia"
        description="Australian patients seeking addiction treatment in America. Access cutting-edge US programs, luxury facilities, and immediate admission. Complete confidentiality guaranteed."
        canonical="/us-rehab/australian-patients"
        keywords={["US rehab from Australia", "American rehab Australians", "addiction treatment USA from Australia", "luxury rehab America Australian", "private rehab USA Aussie"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Australian Patients", url: "/us-rehab/australian-patients" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Australian Patients" },
        ]} />
      </div>

      <InternationalHero title="US Rehab for Australians" subtitle="American Treatment for Australian Clients" description="Access America's most innovative treatment programs. Cutting-edge therapies, luxury accommodations, and a fresh-start environment far from home for Australian patients seeking world-class recovery care." keywords={["Australia to USA rehab", "Australian rehab America", "US treatment Aussie patients", "American rehab Australian"]} />
      <WhyUSATreatment />
      <StateDestinations title="Popular US Destinations for Australian Patients" subtitle="Australian clients frequently choose these American treatment destinations for their exceptional care and welcoming atmospheres." />
      <CountriesServed />
      <InternationalFAQ title="Australia to US Treatment FAQs" subtitle="Common questions from Australian patients considering addiction treatment in America." faqs={customFAQs} schemaId="australia-us-rehab-faq" />
      <PlacementCTA title="Start Your American Recovery Journey" description="Our team understands Australian patient needs. Get placed in premium US facilities today." />
    </Layout>
  );
};

export default RehabUSAFromAustralia;
