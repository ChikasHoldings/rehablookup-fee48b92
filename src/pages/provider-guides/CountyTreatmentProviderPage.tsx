import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { getCountyBySlug } from "@/data/countySeoData";
import { getStateBySlug } from "@/data/locationSeoData";
import { treatmentProviderConfigs } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

const TREATMENT_MAP: Record<string, { label: string; filterKey: string }> = {
  detox: { label: "Detox", filterKey: "detox" },
  residential: { label: "Residential/Inpatient", filterKey: "residential" },
  iop: { label: "IOP", filterKey: "iop" },
  php: { label: "PHP", filterKey: "php" },
  "sober-living": { label: "Sober Living", filterKey: "sober-living" },
  mat: { label: "MAT", filterKey: "mat" },
  luxury: { label: "Luxury Rehab", filterKey: "luxury" },
  "dual-diagnosis": { label: "Dual Diagnosis", filterKey: "dual-diagnosis" },
};

export default function CountyTreatmentProviderPage() {
  const { stateSlug, countySlug, treatmentSlug } = useParams<{
    stateSlug: string;
    countySlug: string;
    treatmentSlug: string;
  }>();

  const stateData = stateSlug ? getStateBySlug(stateSlug) : undefined;
  const countyData = stateSlug && countySlug ? getCountyBySlug(stateSlug, countySlug) : undefined;
  const treatment = treatmentSlug ? TREATMENT_MAP[treatmentSlug] : undefined;

  if (!stateData || !countyData || !treatment) return <NotFound />;

  const populationStr = countyData.population ? `${Math.round(countyData.population / 1000)}K` : "many";
  const cityList = countyData.majorCities.slice(0, 4).join(", ");

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${treatment.label} Patients in ${countyData.name} County, ${stateData.abbreviation} | RehabLookup`}
      metaDescription={`Grow your ${treatment.label.toLowerCase()} program in ${countyData.name} County, ${stateData.name}. Connect with ${populationStr} residents seeking ${treatment.label.toLowerCase()} across ${cityList}.`}
      canonical={`/rehab-marketing/${stateSlug}/county/${countySlug}/${treatmentSlug}`}
      keywords={[
        `${treatment.label.toLowerCase()} marketing ${countyData.name} County`,
        `${treatment.label.toLowerCase()} patients ${countyData.name} County ${stateData.name}`,
        `get ${treatment.label.toLowerCase()} patients ${stateData.abbreviation}`,
        `${countyData.name} County rehab leads`,
      ]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: stateData.name, href: `/for-providers-in-${stateSlug}` },
        { label: `${countyData.name} County`, href: `/rehab-marketing/${stateSlug}/county/${countySlug}` },
        { label: `${treatment.label} Marketing` },
      ]}
      heroHeadline={`Get More ${treatment.label} Patients in ${countyData.name} County`}
      heroSubheadline={`Your ${treatment.label.toLowerCase()} program in ${countyData.name} County serves ${populationStr} residents across ${cityList}. Make sure patients find you — not your competitors.`}
      problemHeadline={`${treatment.label} Challenges in ${countyData.name} County`}
      problemPoints={[
        `${countyData.name} County residents searching for ${treatment.label.toLowerCase()} often end up at facilities outside the county`,
        `Google Ads targeting "${treatment.label.toLowerCase()} ${countyData.name} County" are expensive with low conversion`,
        `Referral networks in ${cityList} are inconsistent and hard to maintain`,
        `Every unfilled ${treatment.label.toLowerCase()} slot costs your facility hundreds per day in lost revenue`,
      ]}
      insightHeadline={`${countyData.name} County ${treatment.label} Market`}
      insightContent={`${countyData.treatmentOverview} For ${treatment.label.toLowerCase()} programs specifically, ${countyData.name} County presents a strong opportunity. Facilities that invest in targeted visibility across the ${cityList} corridor see measurable census improvements within 3–6 months.`}
      relatedLinks={[
        { href: `/rehab-marketing/${stateSlug}/county/${countySlug}`, label: `All Providers in ${countyData.name} County` },
        { href: `/rehab-centers/${stateSlug}/county/${countySlug}`, label: `${countyData.name} County Directory` },
        { href: `/for-providers-in-${stateSlug}`, label: `Providers in ${stateData.name}` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...Object.entries(TREATMENT_MAP)
          .filter(([key]) => key !== treatmentSlug)
          .slice(0, 3)
          .map(([key, t]) => ({
            href: `/rehab-marketing/${stateSlug}/county/${countySlug}/${key}`,
            label: `${t.label} in ${countyData.name} County`,
          })),
      ]}
    />
  );
}
