import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { providerTelehealthConfigs } from "@/data/providerTelehealthConfigs";
import NotFound from "@/pages/NotFound";

export default function ProviderTelehealthPage() {
  const { pathname } = useLocation();
  const slug = pathname.replace("/provider-guides/", "");
  const config = providerTelehealthConfigs.find(c => c.slug === slug);

  if (!config) return <NotFound />;

  return (
    <ProviderConversionPage
      metaTitle={config.metaTitle}
      metaDescription={config.metaDescription}
      canonical={`/provider-guides/${config.slug}`}
      keywords={config.keywords}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: "Telehealth & Virtual Care", href: "/rehab-marketing" },
        { label: config.label },
      ]}
      heroHeadline={config.heroHeadline}
      heroSubheadline={config.heroSubheadline}
      problemHeadline={config.problemHeadline}
      problemPoints={config.problemPoints}
      insightHeadline={config.insightHeadline}
      insightContent={config.insightContent}
      insightStats={config.insightStats}
      relatedLinks={[
        { href: "/for-providers", label: "List Your Facility" },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        { href: "/provider-roi-calculator", label: "ROI Calculator" },
        ...providerTelehealthConfigs
          .filter(c => c.slug !== config.slug)
          .slice(0, 4)
          .map(c => ({ href: `/provider-guides/${c.slug}`, label: c.label })),
      ]}
    />
  );
}
