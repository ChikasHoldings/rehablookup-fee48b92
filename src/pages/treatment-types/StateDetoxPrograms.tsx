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
  Sparkles, ArrowRight, Phone, CheckCircle, Shield, Clock, Heart,
  Pill, Timer, HeartPulse, Stethoscope, Thermometer, MapPin, Building2, Search,
} from "lucide-react";

const detoxTypes = [
  { name: "Alcohol Detox", duration: "3-7 days", description: "Medically supervised alcohol withdrawal with medication support to prevent seizures and delirium tremens.", features: ["Benzodiazepine protocols", "24/7 monitoring", "Nutritional support"] },
  { name: "Opioid Detox", duration: "5-10 days", description: "Safe withdrawal from heroin, fentanyl, and prescription opioids using medication-assisted treatment.", features: ["Suboxone/Subutex", "Comfort medications", "MAT transition"] },
  { name: "Benzodiazepine Detox", duration: "2-8 weeks", description: "Gradual tapering from Xanax, Valium, Klonopin with extended medical supervision.", features: ["Slow tapering", "Anxiety management", "Extended monitoring"] },
  { name: "Stimulant Detox", duration: "1-2 weeks", description: "Medical support during cocaine and meth withdrawal focusing on sleep and psychiatric symptoms.", features: ["Sleep support", "Depression monitoring", "Psychiatric care"] },
];

const detoxProcess = [
  { step: 1, title: "Assessment", description: "Medical evaluation to create personalized detox plan", icon: Stethoscope },
  { step: 2, title: "Stabilization", description: "24/7 medical management of withdrawal symptoms", icon: HeartPulse },
  { step: 3, title: "Management", description: "Comfort medications, hydration, and emotional support", icon: Thermometer },
  { step: 4, title: "Transition", description: "Seamless transition to ongoing addiction treatment", icon: ArrowRight },
];

const StateDetoxPrograms = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = statesData.find(s => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/detox-programs" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map(c => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, "detox", cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, "detox");
  const checklist = generateStateTreatmentChecklist(abbreviation, "detox");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Detox Centers in ${stateName}`,
      description: `Find medical detox centers in ${stateName}. Safe, supervised withdrawal from alcohol, opioids, and drugs with 24/7 medical care.`,
      url: `https://rehablookup.com/treatment-types/detox-programs/${stateSlug}`,
      about: { "@type": "MedicalProcedure", name: "Medical Detoxification", procedureType: "https://schema.org/TherapeuticProcedure" },
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
        title={`Detox Centers in ${stateName} (${abbreviation}) | Medical Detox Programs`}
        description={`Find accredited medical detox centers in ${stateName}. Safe withdrawal from alcohol, opioids & drugs with 24/7 care. Insurance accepted. ${cities.length}+ cities.`}
        canonical={`/treatment-types/detox-programs/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Detox Programs", url: "/treatment-types/detox-programs" },
          { name: `${stateName} Detox`, url: `/treatment-types/detox-programs/${stateSlug}` },
        ]}
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: "Detox Programs", href: "/treatment-types/detox-programs" },
            { label: stateName },
          ]} />
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Medical Detox in {abbreviation}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Detox Centers in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find accredited medical detox programs in {stateName} offering safe, supervised withdrawal from alcohol, opioids, 
              benzodiazepines, and other substances with 24/7 medical monitoring and medication-assisted treatment.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to={`/rehab-centers/${stateSlug}`}>Browse {stateName} Centers<ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span>Licensed {abbreviation} Facilities</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 text-primary" /><span>24/7 Medical Care</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Heart className="h-4 w-4 text-primary" /><span>Insurance Accepted</span></div>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection stateName={stateName} stateSlug={stateSlug!} abbreviation={abbreviation}
        treatmentFilter={["detox", "withdrawal", "detoxification"]}
        heading={`Detox Centers in ${stateName}`}
        subheading={`Browse verified medical detox facilities across ${stateName}`} />

      {/* State-Specific Content Sections */}
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

      {/* Detox Types */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Types of Detox Programs in {stateName}</h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {detoxTypes.map((detox) => (
              <div key={detox.name} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className="text-lg font-semibold">{detox.name} in {abbreviation}</h3>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full flex items-center gap-1">
                        <Timer className="h-3 w-3" />{detox.duration}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{detox.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {detox.features.map(f => (
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

      {/* Detox Process */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">The Detox Process in {stateName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {detoxProcess.map((step) => (
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
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What to Look for in {stateName} Detox</h2>
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
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Detox Centers by City in {stateName}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
            {cities.map(city => (
              <Link key={city.slug} to={`/treatment-types/detox-programs/${stateSlug}/${city.slug}`}
                className="group flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10"><MapPin className="h-5 w-5 text-primary" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold group-hover:text-primary transition-colors">Detox in {city.name}, {abbreviation}</h3>
                  <p className="text-sm text-muted-foreground truncate">Medical detox centers</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <TreatmentFAQSection faqs={faqs} treatmentType="Detox Programs" location={{ state: stateName }} />

      {/* Nearby States */}
      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Detox Programs in Nearby States</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map(state => (
                <Link key={state.slug} to={`/treatment-types/detox-programs/${state.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center">
                  <span className="font-medium">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <Building2 className="mx-auto h-12 w-12 text-accent mb-4" />
          <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">Start Your Recovery in {stateName} Today</h2>
          <p className="mt-3 text-primary-foreground/85 max-w-2xl mx-auto">
            Connect with a licensed {stateName} detox center. Most facilities offer same-day assessments and free insurance verification.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary"><Link to="/rehab-centers"><Search className="mr-2 h-4 w-4" />Find Treatment</Link></Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to="/concierge"><Heart className="mr-2 h-4 w-4" />Get Matched Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <RelatedLinksSection
        treatmentLinks={[
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
          { title: "Drug Addiction", href: `/treatment-types/drug-addiction/${stateSlug}` },
          { title: "Inpatient Rehab", href: `/treatment-types/residential-inpatient/${stateSlug}` },
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}` },
          { title: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
          ...cities.slice(0, 4).map(c => ({ title: `Rehab in ${c.name}`, href: `/rehab-centers/${stateSlug}/${c.slug}` })),
        ]}
        insuranceLinks={[
          { title: "Insurance Guide", href: "/insurance" },
          { title: "Verify Coverage", href: "/concierge" },
        ]}
      />
    </Layout>
  );
};

export default StateDetoxPrograms;
