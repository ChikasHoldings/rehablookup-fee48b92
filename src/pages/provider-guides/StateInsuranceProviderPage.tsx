import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { insuranceProviderConfigs, STATE_INSURANCE_COMBOS } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

export default function StateInsuranceProviderPage() {
  const { stateSlug, insurerSlug } = useParams<{ stateSlug: string; insurerSlug: string }>();
  const config = insuranceProviderConfigs.find(c => c.slug === insurerSlug);
  const stateCombo = STATE_INSURANCE_COMBOS.find(s => s.stateSlug === stateSlug);

  if (!config || !stateCombo) return <NotFound />;

  const stateName = stateCombo.stateName;
  const isMedicaid = config.slug === "medicaid";
  const medicaidExpanded = ["california", "new-york", "florida"].includes(stateSlug || "");

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${config.label} Patients in ${stateName} | RehabLookup`}
      metaDescription={`Attract ${config.label} patients in ${stateName} to your rehab facility. ${config.label} covers ${config.memberCount} Americans. Ensure ${stateName} patients find your facility.`}
      canonical={`/rehab-marketing/${stateSlug}/insurance/${insurerSlug}`}
      keywords={[`${config.label} rehab ${stateName}`, `${config.label} patients ${stateName}`, `rehab marketing ${stateName}`, `${config.label} treatment center ${stateName}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: stateName, href: `/for-providers-in-${stateSlug}` },
        { label: `${config.label} Patients` },
      ]}
      heroHeadline={`Get More ${config.label} Patients in ${stateName}`}
      heroSubheadline={`${stateName} has a large pool of ${config.label}-covered individuals seeking addiction treatment. Make sure your facility is the one they find.`}
      problemHeadline={`${config.label} Patient Challenges in ${stateName}`}
      problemPoints={[
        ...config.painPoints.slice(0, 2),
        ...(isMedicaid ? [`${stateName} ${medicaidExpanded ? "has expanded Medicaid" : "has not expanded Medicaid"}, which directly impacts patient volume`] : []),
        `Facilities in ${stateName} that don't optimize for ${config.label} visibility miss a significant patient population`,
      ]}
      insightHeadline={`${config.label} in ${stateName}: Market Opportunity`}
      insightContent={`${config.insightText} In ${stateName}, ${config.label} represents a major patient acquisition opportunity for facilities that understand the coverage rules and can effectively verify benefits.`}
      relatedLinks={[
        { href: `/for-providers-in-${stateSlug}`, label: `Providers in ${stateName}` },
        { href: `/rehab-centers/${stateSlug}`, label: `${stateName} Treatment Directory` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        { href: `/provider-guides/get-more-${config.slug}-patients`, label: `${config.label} Patients (National)` },
      ]}
    />
  );
}
