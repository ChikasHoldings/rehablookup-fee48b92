import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { treatmentProviderConfigs } from "@/data/providerPageConfigs";
import { providerCities, ProviderCityInfo } from "@/data/providerCityData";
import NotFound from "@/pages/NotFound";

const TREATMENT_PREFIX_MAP: Record<string, string> = {
  "get-more-detox-patients-in-": "detox",
  "get-more-residential-patients-in-": "residential",
  "get-more-iop-patients-in-": "iop",
  "get-more-php-patients-in-": "php",
  "get-more-sober-living-patients-in-": "sober-living",
  "get-more-mat-patients-in-": "mat",
  "get-more-luxury-patients-in-": "luxury",
  "get-more-dual-diagnosis-patients-in-": "dual-diagnosis",
};

function parsePathname(pathname: string): { treatmentSlug: string; city: ProviderCityInfo } | null {
  const path = pathname.startsWith("/") ? pathname.slice(1) : pathname;
  for (const [prefix, slug] of Object.entries(TREATMENT_PREFIX_MAP)) {
    if (!path.startsWith(prefix)) continue;
    const remainder = path.slice(prefix.length);
    for (const city of providerCities) {
      if (remainder === `${city.citySlug}-${city.stateSlug}` || remainder === city.citySlug) {
        return { treatmentSlug: slug, city };
      }
    }
  }
  return null;
}

function slugToName(slug: string): string {
  return slug.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export default function CityTreatmentProviderPage() {
  const { pathname } = useLocation();
  const parsed = parsePathname(pathname);
  if (!parsed) return <NotFound />;

  const { treatmentSlug, city } = parsed;
  const config = treatmentProviderConfigs.find((item) => item.slug === treatmentSlug);
  if (!config) return <NotFound />;

  const stateName = slugToName(city.stateSlug);

  return (
    <ProviderConversionPage
      metaTitle={`${config.label} Directory Visibility in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Maintain accurate ${config.label.toLowerCase()} program information for your ${city.city}, ${stateName} facility on RehabLookup. Claim your facility free and learn about optional Pro and Featured products.`}
      canonical={`/get-more-${config.slug}-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`${config.label.toLowerCase()} directory ${city.city}`, `${config.label.toLowerCase()} marketing ${city.city}`, `${config.label.toLowerCase()} treatment listing ${city.city}`, `rehab visibility ${city.city}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Provider Resources", href: "/provider-resources" },
        { label: city.city, href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}` },
        { label: config.label },
      ]}
      heroHeadline={`${config.label} Directory Visibility in ${city.city}`}
      heroSubheadline={`People researching ${config.label.toLowerCase()} services in ${city.city} need clear information about programs, insurance, location, credentials, and direct contact options. Keep your facility record accurate and complete.`}
      problemHeadline={`${config.label} Discovery Challenges in ${city.city}`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ treatment facilities, so accurate program information matters when people compare options`,
        `Search advertising for treatment terms can be expensive, making durable organic and directory visibility an important complement to paid media`,
        `${city.monthlySearches.toLocaleString()}+ monthly treatment-related searches indicate meaningful research demand in the local market`,
        `Incomplete service, insurance, or accreditation information can make a ${config.label.toLowerCase()} program harder to evaluate`,
      ]}
      insightHeadline={`${city.city} ${config.label} Market Context`}
      insightContent={`${config.insightText} In the ${city.region} region, providers can strengthen discovery by maintaining consistent, accurate public information and measuring how people engage with their facility presence. RehabLookup does not sell organic directory rank.`}
      insightStats={[
        { label: "Monthly Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities Listed", value: city.rehabFacilityCount.toString() },
        { label: "Avg Search CPC", value: `$${city.avgCostPerClick}` },
        { label: "Market Competition", value: city.competitionLevel.charAt(0).toUpperCase() + city.competitionLevel.slice(1) },
      ]}
      relatedLinks={[
        { href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}`, label: `Provider visibility in ${city.city}` },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} provider guide` },
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: "/provider-resources", label: "Provider Resources" },
        ...treatmentProviderConfigs
          .filter((item) => item.slug !== config.slug)
          .slice(0, 2)
          .map((item) => ({ href: `/get-more-${item.slug}-patients-in-${city.citySlug}-${city.stateSlug}`, label: `${item.label} in ${city.city}` })),
      ]}
    />
  );
}
