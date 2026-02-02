import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
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
      <Helmet>
        <title>US Rehab for International Patients | Best Addiction Treatment in America | RehabLookup</title>
        <meta 
          name="description" 
          content="Find world-class addiction treatment in the United States. Luxury rehab centers, executive programs, and confidential care for international patients. 200+ vetted facilities. 24-hour placement assistance." 
        />
        <meta 
          name="keywords" 
          content="rehab in USA, American rehab for foreigners, luxury rehab California, best rehab USA, US addiction treatment international, private rehab America, treatment centers USA" 
        />
        <link rel="canonical" href="https://rehablookup.com/us-rehab" />
        <meta property="og:title" content="US Rehab for International Patients | Best Addiction Treatment in America" />
        <meta property="og:description" content="Find world-class addiction treatment in the United States. Luxury rehab centers, executive programs, and confidential care for international patients." />
        <meta property="og:url" content="https://rehablookup.com/us-rehab" />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

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
