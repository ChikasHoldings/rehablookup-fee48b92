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

const BestRehabUSA = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "Best Rehab Centers in USA",
    "description": "Discover the best addiction treatment centers in the United States. Top-rated facilities with proven outcomes for international patients.",
    "provider": {
      "@type": "Organization",
      "name": "RehabLookup",
      "url": "https://rehablookup.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    }
  };

  const customFAQs = [
    {
      question: "What makes a rehab center 'the best' in America?",
      answer: "The best US rehab centers are distinguished by accreditation (Joint Commission, CARF), experienced clinical staff with advanced certifications, evidence-based treatment protocols, comprehensive aftercare planning, high success rates, and positive patient outcomes. Luxury amenities, while appreciated, are secondary to clinical excellence."
    },
    {
      question: "How much does the best rehab in America cost?",
      answer: "Top-tier US treatment centers range from $15,000-$80,000+ per month depending on the level of luxury and services. Many elite programs offer all-inclusive packages for international clients including accommodation, medical care, therapy, and concierge services. Payment plans and financing options are often available."
    },
    {
      question: "Are US rehab centers better than those in other countries?",
      answer: "The US leads in addiction treatment innovation, offering access to FDA-approved medications, cutting-edge therapies like neurofeedback and EMDR, and highly trained clinical staff. The diversity of treatment approaches and facility types is unmatched globally."
    },
    {
      question: "How do I verify a US rehab center's quality?",
      answer: "Check for Joint Commission or CARF accreditation, verify state licensing, review staff credentials, ask about evidence-based treatment modalities, and request outcome data. Our placement specialists pre-vet all facilities in our network."
    },
    {
      question: "Can I tour US rehab facilities before committing?",
      answer: "Yes, many facilities offer virtual tours for international clients. Some high-end programs offer in-person tours with accommodation provided. Our team can arrange comprehensive virtual or in-person facility visits."
    }
  ];

  return (
    <Layout>
      <SEO
        title="Best Rehab in USA | Top-Rated Addiction Treatment Centers America"
        description="Find the best rehab centers in the USA. Top-rated addiction treatment facilities with proven outcomes, world-class staff, and luxury amenities. Expert placement for international patients."
        canonical="/us-rehab/best-rehab-usa"
        keywords={["best rehab in USA", "top rehab centers America", "best addiction treatment USA", "highest rated rehab USA", "best drug rehab America", "best alcohol rehab USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
          { name: "Best Rehab USA", url: "/us-rehab/best-rehab-usa" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[
          { label: "US Rehab", href: "/us-rehab" },
          { label: "Best Rehab USA" },
        ]} />
      </div>

      <InternationalHero
        title="Best Rehab Centers in the USA"
        subtitle="America's Top-Rated Addiction Treatment Facilities"
        description="Access the highest-quality addiction treatment programs in the United States. Our curated network includes only accredited, outcome-focused facilities with proven track records of success."
        keywords={["best rehab USA", "top rehab America", "highest rated treatment centers", "best addiction treatment"]}
      />

      <WhyUSATreatment />

      <StateDestinations 
        title="Best Treatment by State"
        subtitle="Each US state offers unique treatment environments and specialties. Find the best programs in America's top recovery destinations."
      />

      <CountriesServed />

      <InternationalFAQ 
        title="Best US Rehab FAQs"
        subtitle="Common questions about finding the best addiction treatment in America."
        faqs={customFAQs}
        schemaId="best-rehab-usa-faq"
      />

      <PlacementCTA 
        title="Find the Best Treatment for Your Needs"
        description="Our specialists connect you with America's top-rated facilities based on your specific requirements, preferences, and budget."
      />
    </Layout>
  );
};

export default BestRehabUSA;
