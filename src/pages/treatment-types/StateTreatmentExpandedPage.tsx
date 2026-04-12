import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData, getNearbyStates } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { SmartInternalLinks } from "@/components/seo/SmartInternalLinks";
import {
  generateStateTreatmentSections,
  generateStateTreatmentFAQs,
  generateStateTreatmentChecklist,
  type TreatmentType,
} from "@/utils/stateContentGenerator";
import {
  Search, ArrowRight, Shield, Clock, CheckCircle, MapPin, Heart,
} from "lucide-react";

interface TreatmentConfig {
  treatmentType: TreatmentType;
  label: string;
  slug: string; // URL slug for this treatment type
  parentPath: string; // parent page path
  filterKeys: string[]; // facility filter tags
  heroDescription: string;
}

const TREATMENT_CONFIGS: TreatmentConfig[] = [
  {
    treatmentType: "luxury",
    label: "Luxury Rehab",
    slug: "luxury-rehab",
    parentPath: "/treatment-types/luxury-rehab",
    filterKeys: ["luxury"],
    heroDescription: "Discover premium, resort-style addiction treatment programs with private accommodations and personalized clinical care.",
  },
  {
    treatmentType: "sober-living",
    label: "Sober Living",
    slug: "sober-living",
    parentPath: "/treatment-types/sober-living",
    filterKeys: ["sober-living", "sober living"],
    heroDescription: "Find structured, substance-free transitional housing that bridges the gap between intensive treatment and independent living.",
  },
  {
    treatmentType: "free",
    label: "Free Rehab",
    slug: "free-rehab",
    parentPath: "/treatment-types/free-rehab",
    filterKeys: ["free", "sliding-scale", "state-funded"],
    heroDescription: "Access no-cost and low-cost addiction treatment through government-funded, nonprofit, and faith-based programs.",
  },
  {
    treatmentType: "faith-based",
    label: "Faith-Based Rehab",
    slug: "faith-based-rehab",
    parentPath: "/treatment-types/faith-based-rehab",
    filterKeys: ["faith-based", "christian", "faith"],
    heroDescription: "Find treatment programs that integrate spiritual principles and faith-based practices alongside evidence-based clinical care.",
  },
  {
    treatmentType: "fentanyl",
    label: "Fentanyl Rehab",
    slug: "fentanyl-rehab",
    parentPath: "/treatment-types/fentanyl-rehab",
    filterKeys: ["opioid", "fentanyl", "medication-assisted"],
    heroDescription: "Get specialized treatment for fentanyl addiction with medically supervised detox and medication-assisted treatment protocols.",
  },
  {
    treatmentType: "veterans",
    label: "Veterans Rehab",
    slug: "veterans-rehab",
    parentPath: "/treatment-types/veterans-rehab",
    filterKeys: ["veterans", "military", "va"],
    heroDescription: "Find treatment programs designed specifically for military veterans, addressing combat trauma, PTSD, and substance use disorders.",
  },
  {
    treatmentType: "womens",
    label: "Women's Rehab",
    slug: "womens-rehab",
    parentPath: "/treatment-types/womens-rehab",
    filterKeys: ["women", "womens", "female"],
    heroDescription: "Discover women-only treatment programs addressing gender-specific factors in addiction and recovery.",
  },
  {
    treatmentType: "mens",
    label: "Men's Rehab",
    slug: "mens-rehab",
    parentPath: "/treatment-types/mens-rehab",
    filterKeys: ["men", "mens", "male"],
    heroDescription: "Find men-only treatment environments focused on accountability, emotional growth, and evidence-based recovery.",
  },
];

interface StateTreatmentExpandedPageProps {
  treatmentKey: string; // matches TreatmentConfig.slug
}

const StateTreatmentExpandedPage = ({ treatmentKey }: StateTreatmentExpandedPageProps) => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const config = TREATMENT_CONFIGS.find((c) => c.slug === treatmentKey);
  const stateData = statesData.find((s) => s.slug === stateSlug);

  if (!config || !stateData) {
    return <Navigate to="/treatment-types" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map((c) => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, config.treatmentType, cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, config.treatmentType);
  const checklist = generateStateTreatmentChecklist(abbreviation, config.treatmentType);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `${config.label} Centers in ${stateName}`,
      description: `Find accredited ${config.label.toLowerCase()} centers in ${stateName}. Compare programs, verify insurance coverage, and start treatment.`,
      url: `https://rehablookup.com/treatment-types/${config.slug}/${stateSlug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
    ...(faqs.length >= 3
      ? [
          {
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((faq) => ({
              "@type": "Question",
              name: faq.question,
              acceptedAnswer: { "@type": "Answer", text: faq.answer },
            })),
          },
        ]
      : []),
  ];

  return (
    <Layout>
      <SEO
        title={`${config.label} Centers in ${stateName} (${abbreviation}) | Find Treatment`}
        description={`Find accredited ${config.label.toLowerCase()} in ${stateName}. Compare verified programs, verify insurance, and get matched with the right facility. ${cities.length}+ cities covered.`}
        canonical={`/treatment-types/${config.slug}/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: config.label, url: config.parentPath },
          { name: stateName, url: `/treatment-types/${config.slug}/${stateSlug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: config.label, href: config.parentPath },
              { label: stateName },
            ]}
          />
          <div className="flex items-center gap-2 text-white/80 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{stateName}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            {config.label} Centers in {stateName}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-6">
            {config.heroDescription} Compare verified facilities across {stateName} and verify insurance coverage.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers">
                <Search className="mr-2 h-4 w-4" />
                Find Treatment
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to={`/rehab-centers/${stateSlug}`}>
                Browse {stateName} Centers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b bg-muted/30 py-4">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Licensed Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>24/7 Admissions</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection
        stateName={stateName}
        stateSlug={stateSlug!}
        abbreviation={abbreviation}
        treatmentFilter={config.filterKeys}
        heading={`${config.label} Centers in ${stateName}`}
        subheading={`Browse verified ${config.label.toLowerCase()} facilities across ${stateName}`}
      />

      {/* Rich Content Sections */}
      {sections.map((section, idx) => (
        <section key={idx} className={`py-12 md:py-16 ${idx % 2 === 0 ? "bg-muted/30" : ""}`}>
          <div className="container">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl md:text-3xl font-bold mb-6">{section.heading}</h2>
              <div className="prose prose-lg mx-auto text-muted-foreground leading-relaxed">
                {section.content.split("\n\n").map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      ))}

      {/* What to Look For Checklist */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              What to Look for in {stateName} {config.label}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {checklist.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                  <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <TreatmentFAQSection
        faqs={faqs}
        treatmentType={config.label}
        location={{ state: stateName }}
      />

      {/* Nearby States */}
      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">
              {config.label} in Nearby States
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map((state) => (
                <Link
                  key={state.slug}
                  to={`/treatment-types/${config.slug}/${state.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center"
                >
                  <span className="font-medium">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Smart Internal Links */}
      <SmartInternalLinks
        pageType="state-treatment"
        stateSlug={stateSlug}
        stateName={stateName}
        treatmentSlug={config.slug}
      />

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Start Your Recovery in {stateName} Today
          </h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our treatment specialists are available 24/7 to help you find the right {config.label.toLowerCase()} program in {stateName}.
            Insurance verification is free and confidential.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers">
                <Search className="mr-2 h-4 w-4" />
                Find Treatment
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/concierge">
                <Heart className="mr-2 h-4 w-4" />
                Get Matched Free
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <RelatedLinksSection
        treatmentLinks={[
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
          { title: "Detox Programs", href: `/treatment-types/detox-programs/${stateSlug}` },
          { title: "Inpatient Rehab", href: `/treatment-types/residential-inpatient/${stateSlug}` },
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}` },
          { title: "Drug Addiction Treatment", href: `/treatment-types/drug-addiction/${stateSlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
          ...cities.slice(0, 4).map((c) => ({
            title: `Rehab in ${c.name}`, href: `/rehab-centers/${stateSlug}/${c.slug}`,
          })),
        ]}
        insuranceLinks={[
          { title: "Insurance Guide", href: "/insurance" },
          { title: "Verify Coverage", href: "/concierge" },
        ]}
      />
    </Layout>
  );
};

export default StateTreatmentExpandedPage;
export { TREATMENT_CONFIGS };
