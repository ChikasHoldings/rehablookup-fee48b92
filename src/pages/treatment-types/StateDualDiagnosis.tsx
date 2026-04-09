import { Link, useParams, Navigate } from "react-router-dom";
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
  Brain, ArrowRight, CheckCircle, Shield, Clock, Heart,
  Pill, Stethoscope, Users, MapPin, Building2, Search, Sparkles,
} from "lucide-react";

const mentalHealthConditions = [
  { name: "Depression & Addiction", description: "Integrated treatment for major depressive disorder co-occurring with substance use disorders.", features: ["Antidepressant management", "CBT therapy", "Mood monitoring"] },
  { name: "Anxiety & Addiction", description: "Comprehensive care for anxiety disorders (GAD, panic, social anxiety) alongside addiction treatment.", features: ["Anxiety management", "Exposure therapy", "Relaxation techniques"] },
  { name: "PTSD & Addiction", description: "Trauma-informed treatment addressing post-traumatic stress and substance use simultaneously.", features: ["EMDR therapy", "Trauma processing", "Safety stabilization"] },
  { name: "Bipolar & Addiction", description: "Specialized care for bipolar disorder mood episodes combined with addiction recovery.", features: ["Mood stabilizers", "Episode prevention", "Lifestyle management"] },
];

const treatmentComponents = [
  { step: 1, title: "Psychiatric Assessment", description: "Comprehensive evaluation of mental health and addiction", icon: Stethoscope },
  { step: 2, title: "Medication Management", description: "Coordinated psychiatric medications and MAT when needed", icon: Pill },
  { step: 3, title: "Integrated Therapy", description: "CBT, DBT, and trauma therapies addressing both conditions", icon: Brain },
  { step: 4, title: "Ongoing Support", description: "Long-term recovery planning with mental health aftercare", icon: Heart },
];

const StateDualDiagnosis = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = statesData.find(s => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/dual-diagnosis-treatment" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map(c => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, "dual-diagnosis", cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, "dual-diagnosis");
  const checklist = generateStateTreatmentChecklist(abbreviation, "dual-diagnosis");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Dual Diagnosis Treatment in ${stateName}`,
      description: `Find dual diagnosis treatment centers in ${stateName}. Integrated care for co-occurring mental health and substance use disorders.`,
      url: `https://rehablookup.com/treatment-types/dual-diagnosis-treatment/${stateSlug}`,
      about: { "@type": "MedicalCondition", name: "Co-occurring Disorders" },
      specialty: "Addiction Medicine",
      lastReviewed: new Date().toISOString().split("T")[0],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question", name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Dual Diagnosis Treatment in ${stateName} (${abbreviation}) | Mental Health & Addiction`}
        description={`Find accredited dual diagnosis treatment in ${stateName}. Integrated care for depression, anxiety, PTSD, and addiction. Insurance accepted. ${cities.length}+ cities.`}
        canonical={`/treatment-types/dual-diagnosis-treatment/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Dual Diagnosis", url: "/treatment-types/dual-diagnosis-treatment" },
          { name: stateName, url: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis-treatment" },
            { label: stateName },
          ]} />
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Co-Occurring Disorder Treatment</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Dual Diagnosis Treatment in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find integrated treatment programs in {stateName} for co-occurring mental health and substance use disorders. 
              Address depression, anxiety, PTSD, bipolar disorder, and addiction together for lasting recovery.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to={`/rehab-centers/${stateSlug}`}>Browse {abbreviation} Centers<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span>Integrated Care</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 text-primary" /><span>Psychiatric Support</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Heart className="h-4 w-4 text-primary" /><span>Trauma-Informed</span></div>
          </div>
        </div>
      </section>

      <StateFacilitiesSection stateName={stateName} stateSlug={stateSlug!} abbreviation={abbreviation}
        treatmentFilter={["dual diagnosis", "co-occurring", "mental health"]}
        heading={`Dual Diagnosis Centers in ${stateName}`}
        subheading={`Browse verified dual diagnosis treatment facilities across ${stateName}`} />

      {/* State-Specific Content */}
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

      {/* Conditions Treated */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Co-Occurring Disorders Treated in {stateName}</h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {mentalHealthConditions.map(condition => (
              <div key={condition.name} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Brain className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{condition.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{condition.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {condition.features.map(f => (
                        <li key={f} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3 text-primary shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Process */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">The Dual Diagnosis Treatment Process</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {treatmentComponents.map(step => (
              <div key={step.step} className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow relative">
                <div className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{step.step}</div>
                <div className="flex items-center gap-3 mb-2 mt-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10"><step.icon className="h-4 w-4 text-primary" /></div>
                  <h3 className="font-semibold">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-12">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container"><div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What to Look for in {stateName} Dual Diagnosis Treatment</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background border">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" /><span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div></div>
      </section>

      {/* Cities */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Dual Diagnosis Treatment by City in {stateName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {cities.slice(0, 12).map(city => (
              <Link key={city.slug} to={`/treatment-types/dual-diagnosis-treatment/${stateSlug}/${city.slug}`}
                className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all group">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                <div className="flex-1"><h3 className="font-medium group-hover:text-primary transition-colors">{city.name}</h3><p className="text-sm text-muted-foreground">Dual Diagnosis Centers</p></div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TreatmentFAQSection faqs={faqs} treatmentType="Dual Diagnosis Treatment" location={{ state: stateName }} />

      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Dual Diagnosis Treatment in Nearby States</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map(state => (
                <Link key={state.slug} to={`/treatment-types/dual-diagnosis-treatment/${state.slug}`}
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Find Dual Diagnosis Treatment in {stateName}</h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our team can help you find integrated mental health and addiction treatment in {stateName} that accepts your insurance.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link></Button>
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
          { title: "Drug Addiction", href: `/treatment-types/drug-addiction/${stateSlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
          ...cities.slice(0, 4).map(c => ({ title: `Rehab in ${c.name}`, href: `/rehab-centers/${stateSlug}/${c.slug}` })),
        ]}
        insuranceLinks={[{ title: "Insurance Guide", href: "/insurance" }, { title: "Verify Coverage", href: "/concierge" }]}
      />
    </Layout>
  );
};

export default StateDualDiagnosis;
