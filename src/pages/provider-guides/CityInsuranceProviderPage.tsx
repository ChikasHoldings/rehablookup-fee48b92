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
    if (!path.startsWith(prefix)) continue;
    const remainder = path.slice(prefix.length);
    for (const city of providerCities) {
      if (remainder === `${city.citySlug}-${city.stateSlug}` || remainder === city.citySlug) {
        return { insurerSlug: slug, city };
      }
    }
  }
  return null;
}

function slugToName(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export default function CityInsuranceProviderPage() {
  const { pathname } = useLocation();
  const parsed = parsePathname(pathname);
  if (!parsed) return <NotFound />;

  const { insurerSlug, city } = parsed;
  const config = insuranceProviderConfigs.find((item) => item.slug === insurerSlug);
  if (!config) return <NotFound />;

  const stateName = slugToName(city.stateSlug);

  return (
    <ProviderConversionPage
      metaTitle={`${config.label} Insurance Visibility for Rehabs in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Keep your ${city.city}, ${stateName} facility's ${config.label} insurance information accurate on RehabLookup. Claim your facility free and maintain coverage, services, and direct contact details.`}
      canonical={`/get-more-${config.slug}-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`${config.label} rehab ${city.city}`, `${config.label} treatment directory ${city.city}`, `${city.city} ${config.label} treatment center`, `${config.label} addiction treatment ${city.city}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Provider Resources", href: "/provider-resources" },
        { label: city.city, href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}` },
        { label: config.label },
      ]}
      heroHeadline={`Keep ${config.label} Information Accurate in ${city.city}`}
      heroSubheadline={`People often use insurance participation when evaluating treatment options. Make it easier to understand your ${config.label} information by maintaining an accurate RehabLookup facility record.`}
      problemHeadline={`${config.label} Information Challenges in ${city.city}`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ treatment facilities, so clear insurance information helps people compare options`,
        ...config.painPoints.slice(0, 2),
        `Outdated payer information can create confusion for people researching treatment and should be confirmed directly with the facility and insurer`,
      ]}
      insightHeadline={`${config.label} in ${city.city}: Directory Context`}
      insightContent={`${config.insightText} In ${city.city}, providers can improve treatment discovery by keeping payer participation, program details, and direct contact information current. Coverage and benefits should always be confirmed with the insurer and facility.`}
      insightStats={[
        { label: "Members Covered", value: config.memberCount.replace("over ", "") },
        { label: "City Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities Listed", value: city.rehabFacilityCount.toString() },
        { label: "Avg Search CPC", value: `$${city.avgCostPerClick}` },
      ]}
      relatedLinks={[
        { href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}`, label: `Provider visibility in ${city.city}` },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} provider guide` },
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: "/provider-resources", label: "Provider Resources" },
        ...insuranceProviderConfigs
          .filter((item) => item.slug !== config.slug)
          .slice(0, 2)
          .map((item) => ({ href: `/get-more-${item.slug}-patients-in-${city.citySlug}-${city.stateSlug}`, label: `${item.label} in ${city.city}` })),
      ]}
    />
  );
}
