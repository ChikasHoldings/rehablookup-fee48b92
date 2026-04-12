import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { getCityFromPathname, ProviderCityInfo } from "@/data/providerCityData";
import NotFound from "@/pages/NotFound";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function CityProviderPage() {
  const { pathname } = useLocation();
  const city = getCityFromPathname(pathname);

  if (!city) return <NotFound />;

  const competitionText = city.competitionLevel === "high" ? "fiercely competitive" : city.competitionLevel === "medium" ? "moderately competitive" : "growing";
  const stateName = slugToName(city.stateSlug);

  return (
    <ProviderConversionPage
      metaTitle={`Get More Rehab Patients in ${city.city}, ${stateName} | RehabLookup`}
      metaDescription={`Struggling to fill beds in ${city.city}? RehabLookup connects your facility with patients actively searching for addiction treatment in ${city.city}, ${stateName}.`}
      canonical={`/get-more-patients-in-${city.citySlug}-${city.stateSlug}`}
      keywords={[`rehab marketing ${city.city}`, `get rehab patients ${city.city}`, `addiction treatment leads ${city.city}`, `rehab census ${stateName}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: city.city },
      ]}
      heroHeadline={`Struggling to Fill Beds in ${city.city}?`}
      heroSubheadline={`${city.city} is ${competitionText} for rehab admissions. With ${city.rehabFacilityCount}+ treatment facilities competing for patients, you need a smarter way to stand out and attract qualified leads.`}
      problemHeadline={`The Challenge of Getting Patients in ${city.city}`}
      problemPoints={[
        `${city.city} has ${city.rehabFacilityCount}+ treatment facilities competing for the same patients — visibility is everything`,
        `Google Ads for "${city.city} rehab" cost an average of $${city.avgCostPerClick}/click with unpredictable conversion rates`,
        `${city.monthlySearches.toLocaleString()}+ people search for rehab in ${city.city} monthly — but most never see your facility`,
        `Empty beds in ${city.city} cost your facility $500-$1,500+ per day in unrealized revenue`,
      ]}
      insightHeadline={`${city.city} Rehab Market Insights`}
      insightContent={`The ${city.region} region shows strong demand for addiction treatment services. ${city.city} sees approximately ${city.monthlySearches.toLocaleString()} monthly searches for rehab-related services, yet many facilities remain below capacity because they rely on expensive paid advertising or inconsistent referral sources.`}
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
        { href: "/provider-guides/get-more-rehab-patients", label: "Get More Rehab Patients" },
        { href: "/provider-guides/rehab-center-seo", label: "Rehab SEO Guide" },
      ]}
    />
  );
}
