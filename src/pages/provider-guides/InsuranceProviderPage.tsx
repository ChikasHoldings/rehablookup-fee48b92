import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { insuranceProviderConfigs } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

export default function InsuranceProviderPage() {
  const { pathname } = useLocation();
  // Extract slug from /provider-guides/get-more-{slug}-patients
  const match = pathname.match(/\/provider-guides\/get-more-(.+)-patients$/);
  const insurerSlug = match?.[1];
  const config = insuranceProviderConfigs.find(c => c.slug === insurerSlug);

  if (!config) return <NotFound />;

  return (
    <ProviderConversionPage
      metaTitle={`How to Get More ${config.label} Rehab Patients | RehabLookup`}
      metaDescription={`Attract patients with ${config.label} insurance to your treatment center. ${config.label} covers ${config.memberCount} Americans. Make sure they can find your facility.`}
      canonical={`/provider-guides/get-more-${config.slug}-patients`}
      keywords={config.keywords}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: `${config.label} Patients` },
      ]}
      heroHeadline={config.headline}
      heroSubheadline={config.subheadline}
      problemHeadline={`Why Facilities Miss ${config.label} Patients`}
      problemPoints={config.painPoints}
      insightHeadline={`${config.label} Coverage: What You Need to Know`}
      insightContent={config.insightText}
      insightStats={[
        { label: "Members Covered", value: config.memberCount.replace("over ", "") },
        { label: "Market Share", value: config.slug === "blue-cross" ? "#1" : "Top 5" },
      ]}
      relatedLinks={[
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        { href: "/provider-guides/rehab-insurance-verification", label: "Insurance Verification Guide" },
        ...insuranceProviderConfigs
          .filter(c => c.slug !== config.slug)
          .slice(0, 3)
          .map(c => ({ href: `/provider-guides/get-more-${c.slug}-patients`, label: `${c.label} Patients` })),
      ]}
    />
  );
}
