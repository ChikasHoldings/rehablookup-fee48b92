import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { InternationalFacilitiesSection } from "@/components/international/InternationalFacilitiesSection";
import { 
  InternationalHero,
  CountriesServed,
  InternationalFAQ,
  WhyUSATreatment,
  StateDestinations,
  TreatmentCategories,
  DirectorySearchCTA
} from "./components";

const USRehabHub = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Addiction Treatment for International Patients",
    "description": "Directory of licensed addiction-treatment centers across the United States, including programs that accept international patients.",
    "provider": {
      "@type": "Organization",
      "name": "RehabLookup",
      "url": "https://rehablookup.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "serviceType": "Addiction treatment directory",
    "audience": {
      "@type": "Audience",
      "audienceType": "International patients seeking addiction treatment in the USA"
    }
  };

  return (
    <Layout>
      <SEO
        title="US Rehab for International Patients | Best Addiction Treatment in America"
        description="Addiction treatment in the United States for international patients: compare programs by state and treatment type, see which listed facilities accept international patients, and contact them directly."
        canonical="/us-rehab"
        keywords={["rehab in USA", "American rehab for foreigners", "luxury rehab California", "best rehab USA", "US addiction treatment international", "private rehab America", "treatment centers USA"]}
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
        title="Find Addiction Treatment in the United States"
        subtitle="World-Class Care for International Patients"
        description="Compare US treatment programs by state and type, see which listed facilities report accepting international patients, and contact them directly about admission and travel."
        keywords={["best rehab USA", "luxury rehab America", "US treatment for foreigners", "American addiction centers"]}
      />

      <InternationalFacilitiesSection />
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
