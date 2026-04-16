import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { insuranceProviderConfigs } from "@/data/providerPageConfigs";
import { providerCities, ProviderCityInfo } from "@/data/providerCityData";
import NotFound from "@/pages/NotFound";

const INSURANCE_PREFIX_MAP: Record<string, string> = {
  "get-more-medicaid-patients-in-": "medicaid",
  "get-more-medicare-patients-in-": "medicare",
  "get-more-blue-cross-patients-in-": "blue-cross",
  "get-more-aetna-patients-in-": "aetna",
  "get-more-cigna-patients-in-": "cigna",
  "get-more-united-healthcare-patients-in-": "united-healthcare",
};

function parsePathname(pathname: string): { insurerSlug: string; city: ProviderCityInfo } | null {
  const path = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  for (const [prefix, slug] of Object.entries(INSURANCE_PREFIX_MAP)) {
    if (path.startsWith(prefix)) {
      const remainder = path.slice(prefix.length);
      for (const city of providerCities) {
        if (remainder === `${city.citySlug}-${city.stateSlug}` || remainder === city.citySlug) {
          return { insurerSlug: slug, city };
        }
      }
    }
  }
  return null;
}

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityInsuranceProviderPage() {
  const { pathname } = useLocation();
  const parsed = parsePathname(pathname);
  if (!parsed) return <NotFound />;

  const { insurerSlug, city } = parsed;
  const config = insuranceProviderConfigs.find(c => c.slug === insurerSlug);
  if (!config) return <NotFound />;

  const stateName = slugToName(city.stateSlug);

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${config.label} Patients in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Attract ${config.label} patients in ${city.city} to your treatment center. ${config.label} covers ${config.memberCount} Americans. Make sure ${city.city} patients find your facility.`}
      canonical={`/get-more-${config.slug}-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`${config.label} rehab ${city.city}`, `${config.label} patients ${city.city}`, `${city.city} ${config.label} treatment center`, `${config.label} addiction treatment ${city.city}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: city.city, href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}` },
        { label: `${config.label} Patients` },
      ]}
      heroHeadline={`Get More ${config.label} Patients in ${city.city}`}
      heroSubheadline={`${config.label} covers ${config.memberCount} Americans. In ${city.city}, ${config.label} patients are actively searching for treatment — make sure they find your facility.`}
      problemHeadline={`${config.label} Patient Challenges in ${city.city}`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ facilities competing for ${config.label} patients — visibility is critical`,
        ...config.painPoints.slice(0, 2),
        `Facilities in ${city.city} that don't optimize for ${config.label} miss a significant patient population`,
      ]}
      insightHeadline={`${config.label} in ${city.city}: Market Opportunity`}
      insightContent={`${config.insightText} In ${city.city}, ${config.label} represents a major patient acquisition channel. The ${city.region} region shows strong demand, with ${city.monthlySearches.toLocaleString()}+ monthly rehab searches. Facilities that verify ${config.label} benefits quickly convert at significantly higher rates.`}
      insightStats={[
        { label: "Members Covered", value: config.memberCount.replace("over ", "") },
        { label: "City Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities Competing", value: city.rehabFacilityCount.toString() },
        { label: "Avg CPC", value: `$${city.avgCostPerClick}` },
      ]}
      relatedLinks={[
        { href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}`, label: `All Providers in ${city.city}` },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} Patients (National)` },
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...insuranceProviderConfigs
          .filter(c => c.slug !== config.slug)
          .slice(0, 2)
          .map(c => ({ href: `/get-more-${c.slug}-patients-in-${city.citySlug}-${city.stateSlug}`, label: `${c.label} in ${city.city}` })),
      ]}
    />
  );
}
