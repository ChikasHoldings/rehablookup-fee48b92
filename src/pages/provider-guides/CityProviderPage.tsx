import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { getCityFromPathname } from "@/data/providerCityData";
import NotFound from "@/pages/NotFound";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityProviderPage() {
  const { pathname } = useLocation();
  const city = getCityFromPathname(pathname);

  if (!city) return <NotFound />;

  const competitionText = city.competitionLevel === "high" ? "highly competitive" : city.competitionLevel === "medium" ? "moderately competitive" : "growing";
  const stateName = slugToName(city.stateSlug);

  return (
    <ProviderConversionPage
      metaTitle={`Rehab Directory Visibility in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Manage your treatment facility's RehabLookup directory presence in ${city.city}, ${stateName}. Claim your facility for free, keep information accurate, and learn about optional Pro and Featured products.`}
      canonical={`/get-more-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`rehab directory ${city.city}`, `treatment facility listing ${city.city}`, `rehab marketing ${city.city}`, `rehab visibility ${stateName}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: city.city },
      ]}
      heroHeadline={`Improve Your Facility's Directory Presence in ${city.city}`}
      heroSubheadline={`${city.city} is ${competitionText} for treatment discovery. Keep your facility information accurate, build a stronger public profile, and use optional sponsored exposure only when it fits your goals.`}
      problemHeadline={`Standing Out in the ${city.city} Treatment Market`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ treatment facilities competing for attention from people researching care`,
        `Search advertising for "${city.city} rehab" can cost around $${city.avgCostPerClick}/click, making owned directory information an important complement to paid media`,
        `${city.monthlySearches.toLocaleString()}+ monthly searches indicate meaningful treatment-research demand in the market`,
        `Incomplete or outdated facility information can make it harder for people to evaluate services, insurance, and program fit`,
      ]}
      insightHeadline={`${city.city} Rehab Market Insights`}
      insightContent={`The ${city.region} region shows ongoing demand for addiction treatment information. RehabLookup helps facilities maintain an accurate directory presence while keeping organic ranking independent from payment.`}
      insightStats={[
        { label: "Monthly Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities Competing", value: city.rehabFacilityCount.toString() },
        { label: "Avg CPC", value: `$${city.avgCostPerClick}` },
        { label: "Competition", value: city.competitionLevel.charAt(0).toUpperCase() + city.competitionLevel.slice(1) },
      ]}
      relatedLinks={[
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: `/rehab-centers/${city.stateSlug}/${city.citySlug}`, label: `${city.city} Treatment Centers` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        { href: "/provider-guides/get-more-rehab-patients", label: "Provider Visibility Guide" },
        { href: "/provider-guides/rehab-center-seo", label: "Rehab SEO Guide" },
      ]}
    />
  );
}
