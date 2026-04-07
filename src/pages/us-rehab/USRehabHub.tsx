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
  PlacementCTA
} from "./components";

const USRehabHub = () => {
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": "US Addiction Treatment for International Patients",
    "description": "Comprehensive placement service connecting international clients with top-rated addiction treatment centers across the United States.",
    "provider": {
      "@type": "Organization",
      "name": "RehabLookup",
      "url": "https://rehablookup.com"
    },
    "areaServed": {
      "@type": "Country",
      "name": "United States"
    },
    "serviceType": "Addiction Treatment Placement",
    "audience": {
      "@type": "Audience",
      "audienceType": "International patients seeking addiction treatment in the USA"
    }
  };

  return (
    <Layout>
      <SEO
        title="US Rehab for International Patients | Best Addiction Treatment in America"
        description="Find world-class addiction treatment in the United States. Luxury rehab centers, executive programs, and confidential care for international patients. 1,000+ vetted facilities."
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
        description="Access America's leading rehabilitation centers with dedicated support for international clients. From luxury Malibu retreats to executive New York programs, we connect you with the perfect treatment facility."
        keywords={["best rehab USA", "luxury rehab America", "US treatment for foreigners", "American addiction centers"]}
      />

      <WhyUSATreatment />
      <StateDestinations />
      <TreatmentCategories />
      <CountriesServed />
      <InternationalFAQ schemaId="us-rehab-faq" />
      <PlacementCTA />
    </Layout>
  );
};

export default USRehabHub;
