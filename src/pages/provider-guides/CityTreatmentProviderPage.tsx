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
    if (path.startsWith(prefix)) {
      const remainder = path.slice(prefix.length);
      for (const city of providerCities) {
        if (remainder === `${city.citySlug}-${city.stateSlug}` || remainder === city.citySlug) {
          return { treatmentSlug: slug, city };
        }
      }
    }
  }
  return null;
}

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityTreatmentProviderPage() {
  const { pathname } = useLocation();
  const parsed = parsePathname(pathname);
  if (!parsed) return <NotFound />;

  const { treatmentSlug, city } = parsed;
  const config = treatmentProviderConfigs.find(c => c.slug === treatmentSlug);
  if (!config) return <NotFound />;

  const stateName = slugToName(city.stateSlug);
  const competitionText = city.competitionLevel === "high" ? "fiercely competitive" : city.competitionLevel === "medium" ? "moderately competitive" : "growing";

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${config.label} Patients in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Fill your ${config.label.toLowerCase()} program in ${city.city}. ${city.monthlySearches.toLocaleString()}+ monthly searches, ${city.rehabFacilityCount}+ competitors. RehabLookup connects you with high-intent patients.`}
      canonical={`/get-more-${config.slug}-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`${config.label.toLowerCase()} patients ${city.city}`, `${config.label.toLowerCase()} marketing ${city.city}`, `${city.city} ${config.label.toLowerCase()} leads`, `fill ${config.label.toLowerCase()} beds ${city.city}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: city.city, href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}` },
        { label: `${config.label} Patients` },
      ]}
      heroHeadline={`Get More ${config.label} Patients in ${city.city}`}
      heroSubheadline={`${city.city}'s ${config.label.toLowerCase()} market is ${competitionText}. With ${city.rehabFacilityCount}+ facilities competing, your ${config.label.toLowerCase()} program needs targeted visibility to attract qualified patients.`}
      problemHeadline={`${config.label} Challenges in ${city.city}`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ treatment facilities — ${config.label.toLowerCase()} programs must differentiate to survive`,
        `Google Ads for "${config.label.toLowerCase()} ${city.city}" average $${city.avgCostPerClick}/click with low conversion rates`,
        `${city.monthlySearches.toLocaleString()}+ people search for treatment in ${city.city} monthly — but most never find your ${config.label.toLowerCase()} program`,
        `Every empty ${config.label.toLowerCase()} slot costs your facility hundreds per day in lost revenue`,
      ]}
      insightHeadline={`${city.city} ${config.label} Market Data`}
      insightContent={`${config.insightText} In the ${city.region} region, ${city.city} represents one of the largest markets for ${config.label.toLowerCase()} services. Facilities that invest in targeted ${config.label.toLowerCase()} visibility in ${city.city} see 20-40% census improvements within 6 months.`}
      insightStats={[
        { label: "Monthly Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities Competing", value: city.rehabFacilityCount.toString() },
        { label: "Avg CPC", value: `$${city.avgCostPerClick}` },
        { label: "Competition", value: city.competitionLevel.charAt(0).toUpperCase() + city.competitionLevel.slice(1) },
      ]}
      relatedLinks={[
        { href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}`, label: `All Providers in ${city.city}` },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} Marketing (National)` },
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...treatmentProviderConfigs
          .filter(c => c.slug !== config.slug)
          .slice(0, 2)
          .map(c => ({ href: `/get-more-${c.slug}-patients-in-${city.citySlug}-${city.stateSlug}`, label: `${c.label} in ${city.city}` })),
      ]}
    />
  );
}
