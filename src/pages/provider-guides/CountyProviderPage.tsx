import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { getCountyBySlug } from "@/data/countySeoData";
import { getStateBySlug } from "@/data/locationSeoData";
import { treatmentProviderConfigs } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

export default function CountyProviderPage() {
  const { stateSlug, countySlug } = useParams<{ stateSlug: string; countySlug: string }>();
  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;

  if (!stateData || !countyData) return <NotFound />;

  const populationStr = countyData.population ? `${Math.round(countyData.population / 1000)}K` : "many";
  const cityList = countyData.majorCities.slice(0, 4).join(", ");

  return (
    <ProviderConversionPage
      metaTitle={`Get More Rehab Patients in ${countyData.name} County, ${stateData.abbreviation} | RehabLookup`}
      metaDescription={`List your treatment center and attract patients in ${countyData.name} County, ${stateData.name}. Serving ${populationStr} residents across ${cityList}. Get qualified leads today.`}
      canonical={`/rehab-marketing/${stateSlug}/county/${countySlug}`}
      keywords={[`rehab marketing ${countyData.name} County`, `get rehab patients ${countyData.name} County`, `${countyData.name} County addiction treatment leads`, `rehab census ${stateData.name}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: stateData.name, href: `/for-providers-in-${stateSlug}` },
        { label: `${countyData.name} County` },
      ]}
      heroHeadline={`Struggling to Fill Beds in ${countyData.name} County?`}
      heroSubheadline={`${countyData.name} County, ${stateData.name} has ${populationStr} residents who need addiction treatment. RehabLookup connects your facility with patients searching in ${cityList} and surrounding areas.`}
      problemHeadline={`The Challenge of Getting Patients in ${countyData.name} County`}
      problemPoints={[
        `${countyData.name} County's ${populationStr} residents search for treatment but struggle to find local options`,
        `Google Ads targeting ${countyData.name} County are expensive with unpredictable returns`,
        `Referral sources in ${cityList} are inconsistent and difficult to maintain`,
        `Empty beds cost your facility $500–$1,500+ per day in unrealized revenue`,
      ]}
      insightHeadline={`${countyData.name} County Treatment Market`}
      insightContent={`${countyData.name} County, ${stateData.name} represents a significant opportunity for treatment providers. ${countyData.treatmentOverview} Facilities that establish strong visibility in the ${cityList} corridor attract consistent, high-quality admissions.`}
      relatedLinks={[
        { href: `/rehab-centers/${stateSlug}/county/${countySlug}`, label: `${countyData.name} County Directory` },
        { href: `/for-providers-in-${stateSlug}`, label: `All Providers in ${stateData.name}` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...treatmentProviderConfigs.slice(0, 3).map(c => ({
          href: `/rehab-marketing/${stateSlug}/${c.slug}`,
          label: `${c.label} Marketing in ${stateData.name}`,
        })),
      ]}
    />
  );
}
