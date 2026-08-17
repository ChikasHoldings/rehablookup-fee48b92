import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import {
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  WhyUSATreatment,
  StateDestinations,
  TreatmentCategories,
  DirectorySearchCTA,
} from "./components";

const USRehabHub = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "US Addiction Treatment Directory for International Research",
    description: "Research addiction-treatment facilities in the United States, including programs that may accept international admissions.",
    url: "https://rehablookup.com/us-rehab",
    isPartOf: {
      "@type": "WebSite",
      name: "RehabLookup",
      url: "https://rehablookup.com",
    },
  };

  return (
    <Layout>
      <SEO
        title="US Addiction Treatment Directory for International Patients"
        description="Research addiction treatment facilities in the United States. Compare locations, treatment programs, insurance information, and facility details, then contact providers directly to confirm international admissions."
        canonical="/us-rehab"
        keywords={["rehab in USA", "US addiction treatment", "American rehab for foreigners", "US treatment centers", "international addiction treatment USA"]}
        structuredData={schemaData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "US Rehab", url: "/us-rehab" },
        ]}
      />

      <div className="container mx-auto px-4 pt-4">
        <BreadcrumbNav className="mb-4" items={[{ label: "US Rehab" }]} />
      </div>

      <InternationalHero
        title="Research Addiction Treatment in the United States"
        subtitle="US treatment information for people researching care from abroad"
        description="Search RehabLookup's treatment directory, compare facility information, and contact providers directly to confirm program fit, international admission requirements, pricing, travel considerations, and availability."
        keywords={["US treatment directory", "international treatment research", "addiction treatment USA"]}
      />

      <WhyUSATreatment />
      <StateDestinations />
      <TreatmentCategories />
      <CountriesServed />
      <InternationalFAQ schemaId="us-rehab-faq" />
      <DirectorySearchCTA />
    </Layout>
  );
};

export default USRehabHub;
