import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData, getNearbyStates } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import {
  generateStateTreatmentSections,
  generateStateTreatmentFAQs,
  generateStateTreatmentChecklist,
} from "@/utils/stateContentGenerator";
import {
  Clock, Shield, CheckCircle, MapPin, ArrowRight, Search, Heart,
} from "lucide-react";

const StateDrugAddiction = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = statesData.find((s) => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/drug-addiction-treatment" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map((c) => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, "drug", cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, "drug");
  const checklist = generateStateTreatmentChecklist(abbreviation, "drug");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Drug Addiction Treatment in ${stateName}`,
      description: `Find accredited drug addiction treatment centers in ${stateName}. Compare detox, inpatient, and outpatient programs with insurance verification.`,
      url: `https://rehablookup.com/treatment-types/drug-addiction/${stateSlug}`,
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Drug Addiction Treatment in ${stateName} (${abbreviation}) | Find Rehab`}
        description={`Find accredited drug addiction treatment in ${stateName}. Compare detox, MAT, inpatient, and outpatient programs. Verify insurance. ${cities.length}+ cities covered.`}
        canonical={`/treatment-types/drug-addiction/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Drug Addiction", url: "/treatment-types/drug-addiction" },
          { name: stateName, url: `/treatment-types/drug-addiction/${stateSlug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="container relative z-10">
          <BreadcrumbNav className="mb-4" items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: "Drug Addiction", href: "/treatment-types/drug-addiction" },
            { label: stateName },
          ]} />
          <div className="flex items-center gap-2 text-white/80 mb-3">
            <MapPin className="h-4 w-4" /><span className="text-sm">{stateName}</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Drug Addiction Treatment in {stateName}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-6">
            Find comprehensive drug addiction treatment programs across {stateName}. From opioid and stimulant treatment 
            to medication-assisted recovery, compare verified facilities and verify insurance coverage.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to={`/rehab-centers/${stateSlug}`}>Browse {stateName} Centers<ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
        </div>
      </section>

      <section className="border-b bg-muted/30 py-4">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span>Licensed Facilities</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 text-primary" /><span>24/7 Admissions</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-primary" /><span>Insurance Accepted</span></div>
          </div>
        </div>
      </section>

      <StateFacilitiesSection
        stateName={stateName} stateSlug={stateSlug!} abbreviation={abbreviation}
        treatmentFilter={["drug", "substance", "opioid", "heroin", "cocaine", "meth"]}
        heading={`Drug Rehab Centers in ${stateName}`}
        subheading={`Browse verified drug addiction treatment facilities across ${stateName}`}
      />

      {sections.map((section, idx) => (
        <section key={idx} className={`py-12 md:py-16 ${idx % 2 === 0 ? "bg-muted/30" : ""}`}>
          <div className="container"><div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">{section.heading}</h2>
            <div className="prose prose-lg mx-auto text-muted-foreground leading-relaxed">
              {section.content.split("\n\n").map((p, i) => <p key={i}>{p}</p>)}
            </div>
          </div></div>
        </section>
      ))}

      <section className="py-12 md:py-16">
        <div className="container"><div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What to Look for in {stateName} Drug Rehab</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div></div>
      </section>

      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Find Drug Rehab by City in {stateName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map((city) => (
              <Link key={city.slug} to={`/treatment-types/drug-addiction/${stateSlug}/${city.slug}`}
                className="group p-5 rounded-xl border bg-background hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-semibold group-hover:text-primary transition-colors">{city.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Drug rehab programs</p>
                <div className="mt-3 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View centers</span><ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TreatmentFAQSection faqs={faqs} treatmentType="Drug Addiction Treatment" location={{ state: stateName }} />

      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Drug Rehab in Nearby States</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map((state) => (
                <Link key={state.slug} to={`/treatment-types/drug-addiction/${state.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center">
                  <span className="font-medium">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Break Free From Addiction in {stateName}</h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our treatment specialists are available 24/7 to help you find the right drug rehab program in {stateName}. Insurance verification is free and confidential.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/concierge"><Heart className="mr-2 h-4 w-4" />Get Matched Free</Link>
            </Button>
          </div>
        </div>
      </section>

      <RelatedLinksSection
        treatmentLinks={[
          { title: "Detox Programs", href: `/treatment-types/detox-programs/${stateSlug}` },
          { title: "Inpatient Rehab", href: `/treatment-types/residential-inpatient/${stateSlug}` },
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}` },
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
          { title: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
          ...cities.slice(0, 4).map((c) => ({ title: `Rehab in ${c.name}`, href: `/rehab-centers/${stateSlug}/${c.slug}` })),
        ]}
        insuranceLinks={[
          { title: "Insurance Guide", href: "/insurance" },
          { title: "Verify Coverage", href: "/concierge" },
        ]}
      />
    </Layout>
  );
};

export default StateDrugAddiction;
