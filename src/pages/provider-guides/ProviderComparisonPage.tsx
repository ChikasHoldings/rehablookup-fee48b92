import { useLocation } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { comparisonPageConfigs } from "@/data/providerPageConfigs";
import { additionalComparisonConfigs } from "@/data/providerPersonaConfigs";
import NotFound from "@/pages/NotFound";

const allComparisons = [...comparisonPageConfigs, ...additionalComparisonConfigs];

export default function ProviderComparisonPage() {
  const { pathname } = useLocation();
  // Extract slug from /provider-guides/{slug}
  const slug = pathname.replace("/provider-guides/", "");
  const config = allComparisons.find(c => c.slug === slug);

  if (!config) return <NotFound />;

  return (
    <ProviderConversionPage
      metaTitle={config.metaTitle}
      metaDescription={config.sections[0].content.slice(0, 155) + "..."}
      canonical={`/provider-guides/${config.slug}`}
      keywords={config.keywords}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: config.title },
      ]}
      heroHeadline={config.headline}
      heroSubheadline={config.subheadline}
      problemHeadline="The Problem Most Facilities Face"
      problemPoints={[
        "Marketing budgets are stretched thin across too many channels with unclear ROI",
        "Industry-specific advertising restrictions make it harder to reach patients",
        "Shared leads from aggregators go to 5+ facilities, killing conversion rates",
        "Inconsistent lead flow makes census management unpredictable",
      ]}
      insightHeadline={config.sections[0].heading}
      insightContent={config.sections.map(s => s.content).join(" ")}
      relatedLinks={[
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...allComparisons
          .filter(c => c.slug !== config.slug)
          .slice(0, 4)
          .map(c => ({ href: `/provider-guides/${c.slug}`, label: c.title })),
      ]}
    />
  );
}
