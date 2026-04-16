import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { getCountyBySlug } from "@/data/countySeoData";
import { getStateBySlug } from "@/data/locationSeoData";
import { insuranceProviderConfigs } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

export default function CountyInsuranceProviderPage() {
  const { stateSlug, countySlug, insurerSlug } = useParams<{
    stateSlug: string;
    countySlug: string;
    insurerSlug: string;
  }>();

  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;
  const config = insurerSlug ? insuranceProviderConfigs.find((c) => c.slug === insurerSlug) : undefined;

  if (!stateData || !countyData || !config) return <NotFound />;

  const populationStr = countyData.population ? `${Math.round(countyData.population / 1000)}K` : "many";
  const cityList = countyData.majorCities.slice(0, 4).join(", ");

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${config.label} Patients in ${countyData.name} County, ${stateData.abbreviation} | RehabLookup`}
      metaDescription={`Attract ${config.label} patients in ${countyData.name} County, ${stateData.name}. ${config.label} covers ${config.memberCount} Americans. Ensure ${countyData.name} County patients find your facility.`}
      canonical={`/rehab-marketing/${stateSlug}/county/${countySlug}/insurance/${insurerSlug}`}
      keywords={[
        `${config.label} rehab ${countyData.name} County`,
        `${config.label} patients ${countyData.name} County ${stateData.name}`,
        `get ${config.label} patients ${stateData.abbreviation}`,
        `${countyData.name} County ${config.label} treatment center`,
      ]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: stateData.name, href: `/for-providers-in-${stateSlug}` },
        { label: `${countyData.name} County`, href: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
        { label: `${config.label} Patients` },
      ]}
      heroHeadline={`Get More ${config.label} Patients in ${countyData.name} County`}
      heroSubheadline={`${config.label} covers ${config.memberCount} Americans. In ${countyData.name} County, ${stateData.name}, ${config.label} patients across ${cityList} are searching for treatment — make sure they find your facility.`}
      problemHeadline={`${config.label} Patient Challenges in ${countyData.name} County`}
      problemPoints={[
        `${countyData.name} County's ${populationStr} residents include a significant ${config.label}-covered population seeking treatment`,
        ...config.painPoints.slice(0, 2),
        `Facilities in ${countyData.name} County that don't optimize for ${config.label} visibility miss a major patient segment`,
      ]}
      insightHeadline={`${config.label} in ${countyData.name} County: Market Opportunity`}
      insightContent={`${config.insightText} In ${countyData.name} County, ${stateData.name}, ${config.label} represents a significant patient acquisition opportunity. Facilities that effectively verify ${config.label} benefits and market to this population across the ${cityList} corridor see improved census and revenue.`}
      relatedLinks={[
        { href: `/rehab-marketing/${stateSlug}/county/${countySlug}`, label: `All Providers in ${countyData.name} County` },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} Patients (National)` },
        { href: `/for-providers-in-${stateSlug}`, label: `Providers in ${stateData.name}` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...insuranceProviderConfigs
          .filter((c) => c.slug !== config.slug)
          .slice(0, 3)
          .map((c) => ({
            href: `/rehab-marketing/${stateSlug}/county/${countySlug}/insurance/${c.slug}`,
            label: `${c.label} in ${countyData.name} County`,
          })),
      ]}
    />
  );
}
