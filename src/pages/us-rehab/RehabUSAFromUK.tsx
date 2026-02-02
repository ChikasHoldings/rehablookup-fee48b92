import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  WhyUSATreatment,
  StateDestinations,
  PlacementCTA
} from "./components";

const RehabUSAFromUK = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Rehab for UK Patients",
    "description": "American addiction treatment centers accepting patients from the United Kingdom. Luxury rehab, immediate admission, complete privacy.",
    "provider": {
      "@type": "Organization",
      "name": "RehabLookup",
      "url": "https://rehablookup.com"
    },
    "areaServed": [
      { "@type": "Country", "name": "United Kingdom" },
      { "@type": "Country", "name": "United States" }
    ]
  };

  const customFAQs = [
    {
      question: "Can UK citizens get rehab treatment in America?",
      answer: "Yes, US rehab centers welcome patients from the United Kingdom. Most facilities have experience with international admissions and can coordinate visa documentation, travel logistics, and aftercare planning for UK residents."
    },
    {
      question: "Is US rehab better than UK rehab?",
      answer: "The US offers advantages including immediate admission (no NHS waiting lists), complete privacy from UK systems, access to luxury and executive programs, and innovative treatments not yet available in the UK. Many UK residents choose US treatment for discretion and premium care."
    },
    {
      question: "How much does US rehab cost for UK patients?",
      answer: "UK patients typically pay $15,000-$80,000+ per month for US treatment, depending on the facility and level of luxury. This is self-pay as NHS coverage doesn't extend to US facilities. Many find the investment worthwhile for premium care and faster access."
    },
    {
      question: "What visa do UK citizens need for US rehab?",
      answer: "UK citizens can enter the US on the Visa Waiver Program (ESTA) for treatment stays up to 90 days. For longer programs, a B-2 tourist visa for medical treatment is recommended. Our team can provide documentation to support your application."
    },
    {
      question: "Will my treatment be confidential from UK employers?",
      answer: "Absolutely. US treatment facilities operate independently of UK healthcare systems. Your treatment records are protected by US HIPAA laws and cannot be shared with UK employers, insurers, or government agencies without your explicit consent."
    }
  ];

  return (
    <Layout>
      <Helmet>
        <title>US Rehab for UK Patients | American Addiction Treatment from Britain | RehabLookup</title>
        <meta 
          name="description" 
          content="British patients seeking addiction treatment in America. Escape NHS waiting lists with immediate US admission. Luxury rehab, complete privacy, world-class care." 
        />
        <meta 
          name="keywords" 
          content="US rehab from UK, American rehab for British, addiction treatment USA from Britain, luxury rehab America UK patients, private rehab USA British" 
        />
        <link rel="canonical" href="https://rehablookup.com/us-rehab/uk-patients" />
        <meta property="og:title" content="US Rehab for UK Patients | American Treatment from Britain" />
        <meta property="og:description" content="British patients seeking addiction treatment in America. Immediate admission, luxury care, complete privacy." />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <InternationalHero
        title="US Rehab for UK Patients"
        subtitle="American Treatment for British Clients"
        description="Skip NHS waiting lists and access America's finest treatment centers. Immediate admission, world-class care, and complete privacy for UK residents seeking recovery abroad."
        keywords={["UK to USA rehab", "British rehab America", "US treatment UK patients", "American rehab British"]}
      />

      <WhyUSATreatment />

      <StateDestinations 
        title="Popular US Destinations for UK Patients"
        subtitle="British clients frequently choose these American treatment destinations for their world-class facilities and welcoming environments."
      />

      <CountriesServed />

      <InternationalFAQ 
        title="UK to US Treatment FAQs"
        subtitle="Common questions from British patients considering addiction treatment in America."
        faqs={customFAQs}
        schemaId="uk-us-rehab-faq"
      />

      <PlacementCTA 
        title="Start Your American Recovery Journey"
        description="Our UK-experienced advisors understand your needs. Get matched with premium US facilities today."
      />
    </Layout>
  );
};

export default RehabUSAFromUK;
