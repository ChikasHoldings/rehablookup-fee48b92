import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { providerCities, ProviderCityInfo } from "@/data/providerCityData";
import NotFound from "@/pages/NotFound";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function parseCityFromPathname(pathname: string): ProviderCityInfo | undefined {
  const match = pathname.match(/^\/list-your-facility-in-(.+)$/);
  if (!match) return undefined;
  const slug = match[1];
  for (const city of providerCities) {
    if (slug === `${city.citySlug}-${city.stateSlug}` || slug === city.citySlug) {
      return city;
    }
  }
  return undefined;
}

export default function ListYourFacilityCity() {
  const { pathname } = useLocation();
  const city = parseCityFromPathname(pathname);

  if (!city) return <NotFound />;

  const stateName = slugToName(city.stateSlug);
  const competitionText = city.competitionLevel === "high" ? "highly competitive" : city.competitionLevel === "medium" ? "growing" : "emerging";

  return (
    <ProviderConversionPage
      metaTitle={`List Your Rehab Facility in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Get your treatment center listed in ${city.city}'s top rehab directory. Reach ${city.monthlySearches.toLocaleString()}+ monthly searchers. Verified listings, qualified leads, zero upfront cost.`}
      canonical={`/list-your-facility-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`list rehab ${city.city}`, `rehab directory ${city.city}`, `treatment center listing ${city.city}`, `add facility ${city.city} ${stateName}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: stateName, href: `/for-providers-in-${city.stateSlug}` },
        { label: `List in ${city.city}` },
      ]}
      heroHeadline={`List Your Facility in ${city.city}`}
      heroSubheadline={`${city.city} is a ${competitionText} market for addiction treatment. ${city.monthlySearches.toLocaleString()}+ people search for rehab in ${city.city} monthly. Get your facility in front of them — free to list.`}
      problemHeadline={`Why Your ${city.city} Facility Needs a Listing`}
      problemPoints={[
        `${city.rehabFacilityCount}+ treatment facilities in ${city.city} are competing for the same patients`,
        `Google Ads for "${city.city} rehab" cost $${city.avgCostPerClick}/click — most facilities can't sustain this`,
        `Patients trust verified directories over generic search results`,
        `Without a listing, you're invisible to ${city.monthlySearches.toLocaleString()}+ monthly searchers`,
      ]}
      insightHeadline={`${city.city} Treatment Market Overview`}
      insightContent={`The ${city.region} region continues to see rising demand for addiction treatment services. ${city.city} alone generates ${city.monthlySearches.toLocaleString()}+ monthly rehab-related searches, with ${city.rehabFacilityCount}+ facilities serving the area. A verified RehabLookup listing ensures patients can find, compare, and contact your facility directly.`}
      insightStats={[
        { label: "Monthly Searches", value: city.monthlySearches.toLocaleString() },
        { label: "Facilities", value: city.rehabFacilityCount.toString() },
        { label: "Avg CPC", value: `$${city.avgCostPerClick}` },
        { label: "Market", value: city.competitionLevel.charAt(0).toUpperCase() + city.competitionLevel.slice(1) },
      ]}
      relatedLinks={[
        { href: `/get-more-patients-in-${city.citySlug}-${city.stateSlug}`, label: `Marketing in ${city.city}` },
        { href: `/for-providers-in-${city.stateSlug}`, label: `Providers in ${stateName}` },
        { href: `/list-your-facility-in-${city.stateSlug}`, label: `List in ${stateName}` },
        { href: "/for-providers", label: "Why List With Us" },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
      ]}
    />
  );
}
