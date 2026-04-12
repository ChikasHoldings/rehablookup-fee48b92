import { useParams } from "react-router-dom";
import { ProviderConversionPage } from "@/components/provider-guides/ProviderConversionPage";
import { treatmentProviderConfigs, STATE_TREATMENT_COMBOS } from "@/data/providerPageConfigs";
import NotFound from "@/pages/NotFound";

function slugToName(slug: string): string {
  return slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export default function StateTreatmentProviderPage() {
  const { stateSlug, treatmentSlug } = useParams<{ stateSlug: string; treatmentSlug: string }>();
  const config = treatmentProviderConfigs.find(c => c.slug === treatmentSlug);
  const stateCombo = STATE_TREATMENT_COMBOS.find(s => s.stateSlug === stateSlug);

  if (!config || !stateCombo) return <NotFound />;

  const stateName = stateCombo.stateName;

  return (
    <ProviderConversionPage
      metaTitle={`${config.label} Marketing in ${stateName}: Get More Patients | RehabLookup`}
      metaDescription={`Grow your ${config.label.toLowerCase()} program in ${stateName}. RehabLookup connects ${stateName} treatment centers with patients actively searching for ${config.label.toLowerCase()} services.`}
      canonical={`/rehab-marketing/${stateSlug}/${treatmentSlug}`}
      keywords={[`${config.label.toLowerCase()} marketing ${stateName}`, `get ${config.label.toLowerCase()} patients ${stateName}`, `${stateName} rehab leads`, `${config.label.toLowerCase()} census ${stateName}`]}
      breadcrumbs={[
        { label: "For Providers", href: "/for-providers" },
        { label: "Rehab Marketing", href: "/rehab-marketing" },
        { label: stateName, href: `/for-providers-in-${stateSlug}` },
        { label: `${config.label} Marketing` },
      ]}
      heroHeadline={`${config.label} Programs in ${stateName}: Get More Patients`}
      heroSubheadline={`${stateName} ${config.label.toLowerCase()} programs face unique challenges. Connect with patients who are searching for ${config.label.toLowerCase()} treatment in ${stateName} right now.`}
      problemHeadline={`Challenges Facing ${config.label} Programs in ${stateName}`}
      problemPoints={config.painPoints.map(p => p.replace(/your/gi, `${stateName}`).replace(/you're/gi, `facilities in ${stateName} are`))}
      insightHeadline={`${stateName} ${config.label} Market Data`}
      insightContent={`${stateName} has a growing demand for ${config.label.toLowerCase()} services. ${config.insightText} Facilities in ${stateName} that invest in targeted visibility see 20-40% improvements in census within the first 6 months.`}
      relatedLinks={[
        { href: `/for-providers-in-${stateSlug}`, label: `All Providers in ${stateName}` },
        { href: `/rehab-centers/${stateSlug}`, label: `${stateName} Treatment Directory` },
        { href: "/rehab-marketing", label: "Rehab Marketing Hub" },
        ...stateCombo.treatments
          .filter(t => t !== treatmentSlug)
          .slice(0, 3)
          .map(t => {
            const tc = treatmentProviderConfigs.find(c => c.slug === t);
            return { href: `/rehab-marketing/${stateSlug}/${t}`, label: `${tc?.label || slugToName(t)} in ${stateName}` };
          }),
      ]}
    />
  );
}
