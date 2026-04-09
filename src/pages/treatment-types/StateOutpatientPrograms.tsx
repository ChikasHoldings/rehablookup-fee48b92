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
  Sparkles, ArrowRight, CheckCircle, Shield, Clock, Heart,
  Calendar, Users, Brain, Briefcase, MapPin, Building2, GraduationCap, Search,
} from "lucide-react";

const programTypes = [
  { name: "Intensive Outpatient (IOP)", hours: "9-20 hrs/week", description: "Structured treatment while maintaining work and family responsibilities.", features: ["Group therapy", "Individual counseling", "Flexible scheduling"] },
  { name: "Partial Hospitalization (PHP)", hours: "20-30 hrs/week", description: "Day treatment with intensive clinical care. Return home evenings.", features: ["Daily programming", "Psychiatric support", "Medication management"] },
  { name: "Standard Outpatient", hours: "1-8 hrs/week", description: "Ongoing support and maintenance therapy for those in stable recovery.", features: ["Weekly sessions", "Relapse prevention", "Long-term support"] },
  { name: "Evening/Weekend Programs", hours: "Flexible", description: "Treatment designed for working professionals with sessions outside business hours.", features: ["After-work sessions", "Weekend groups", "Career-friendly"] },
];

const idealFor = [
  { title: "Working Professionals", description: "Maintain your career while receiving treatment", icon: Briefcase },
  { title: "Students", description: "Continue education alongside structured recovery", icon: GraduationCap },
  { title: "Parents", description: "Stay present for family while getting help", icon: Heart },
  { title: "Step-Down Care", description: "Transition smoothly from residential treatment", icon: ArrowRight },
];

const StateOutpatientPrograms = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = statesData.find(s => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/outpatient-programs" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map(c => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, "outpatient", cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, "outpatient");
  const checklist = generateStateTreatmentChecklist(abbreviation, "outpatient");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Outpatient Programs in ${stateName}`,
      description: `Find outpatient addiction treatment in ${stateName}. IOP, PHP, and flexible recovery programs with insurance acceptance.`,
      url: `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}`,
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
        title={`Outpatient Rehab in ${stateName} (${abbreviation}) | IOP & PHP Programs`}
        description={`Find accredited outpatient addiction treatment in ${stateName}. IOP, PHP, and flexible programs. Keep working while in recovery. Insurance accepted.`}
        canonical={`/treatment-types/outpatient-programs/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Outpatient Programs", url: "/treatment-types/outpatient-programs" },
          { name: stateName, url: `/treatment-types/outpatient-programs/${stateSlug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: "Outpatient Programs", href: "/treatment-types/outpatient-programs" },
            { label: stateName },
          ]} />
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Outpatient Treatment in {abbreviation}</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Outpatient Rehab Programs in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find flexible outpatient addiction treatment programs in {stateName}. IOP, PHP, and standard outpatient programs 
              that let you recover while maintaining work, school, and family commitments.
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

      <section className="border-b bg-muted/30 py-4">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span>Licensed Programs</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4 text-primary" /><span>Flexible Scheduling</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-primary" /><span>Insurance Accepted</span></div>
          </div>
        </div>
      </section>

      <StateFacilitiesSection stateName={stateName} stateSlug={stateSlug!} abbreviation={abbreviation}
        treatmentFilter={["outpatient", "IOP", "PHP"]}
        heading={`Outpatient Programs in ${stateName}`}
        subheading={`Browse verified outpatient treatment facilities across ${stateName}`} />

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

      {/* Program Types */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Outpatient Program Types in {stateName}</h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {programTypes.map(prog => (
              <div key={prog.name} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Calendar className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className="text-lg font-semibold">{prog.name}</h3>
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded-full">{prog.hours}</span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{prog.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {prog.features.map(f => (
                        <li key={f} className="flex items-center gap-1 text-xs bg-muted px-2 py-1 rounded-full"><CheckCircle className="h-3 w-3 text-primary shrink-0" />{f}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Ideal For */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Who Is Outpatient Treatment Ideal For?</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {idealFor.map(item => (
              <div key={item.title} className="rounded-xl border bg-card p-5 text-center hover:shadow-md transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mx-auto mb-3"><item.icon className="h-6 w-6 text-primary" /></div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container"><div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What to Look for in {stateName} Outpatient Programs</h2>
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
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Outpatient Programs by City in {stateName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map(city => (
              <Link key={city.slug} to={`/treatment-types/outpatient-programs/${stateSlug}/${city.slug}`}
                className="group p-5 rounded-xl border bg-background hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-semibold group-hover:text-primary transition-colors">{city.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Outpatient programs</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TreatmentFAQSection faqs={faqs} treatmentType="Outpatient Programs" location={{ state: stateName }} />

      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Outpatient Programs in Nearby States</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map(state => (
                <Link key={state.slug} to={`/treatment-types/outpatient-programs/${state.slug}`}
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Find Outpatient Treatment in {stateName}</h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our team will help you find flexible outpatient programs in {stateName} that work with your schedule and insurance.
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
          { title: "Drug Addiction", href: `/treatment-types/drug-addiction/${stateSlug}` },
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
          { title: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
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

export default StateOutpatientPrograms;
