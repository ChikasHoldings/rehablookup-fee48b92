import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { treatmentProviderConfigs } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

export default function TreatmentProviderPage() {
  const { treatmentSlug } = useParams<{ treatmentSlug: string }>();
  const config = treatmentProviderConfigs.find(c => c.slug === treatmentSlug);

  if (!config) return <NotFound />;

  return (
    <ProviderConversionPage
      metaTitle={`Get More ${config.label} Patients for Your Rehab Center | RehabLookup`}
      metaDescription={`${config.subheadline} Learn how RehabLookup helps ${config.label.toLowerCase()} programs attract more qualified patients.`}
      canonical={`/provider-guides/get-more-${config.slug}-patients`}
      keywords={config.keywords}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: `${config.label} Marketing` },
      ]}
      heroHeadline={config.headline}
      heroSubheadline={config.subheadline}
      problemHeadline={`Why ${config.label} Programs Struggle to Fill Capacity`}
      problemPoints={config.painPoints}
      insightHeadline={`${config.label} Treatment Market Insights`}
      insightContent={config.insightText}
      relatedLinks={[
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        { href: "/provider-guides/get-more-rehab-patients", label: "Get More Patients Guide" },
        ...treatmentProviderConfigs
          .filter(c => c.slug !== config.slug)
          .slice(0, 3)
          .map(c => ({ href: `/provider-guides/get-more-${c.slug}-patients`, label: `${c.label} Marketing` })),
      ]}
    />
  );
}
