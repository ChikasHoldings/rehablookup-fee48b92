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
  Home, Users, Brain, Activity, Calendar, MapPin, Building2, Search,
} from "lucide-react";

const programFeatures = [
  { name: "30-Day Program", description: "Ideal for mild to moderate addiction requiring structured initial care and foundation building.", features: ["Medical stabilization", "Therapy introduction", "Recovery planning"] },
  { name: "60-Day Program", description: "Extended treatment for moderate addiction with comprehensive therapy and skill development.", features: ["Deeper therapy work", "Relapse prevention", "Life skills training"] },
  { name: "90-Day Program", description: "Intensive long-term care for severe addiction with thorough behavioral restructuring.", features: ["Comprehensive healing", "Dual diagnosis treatment", "Aftercare planning"] },
  { name: "Extended Care", description: "Long-term residential treatment for complex cases requiring ongoing structured support.", features: ["6-12 month programs", "Sober living transition", "Vocational support"] },
];

const dailySchedule = [
  { time: "7:00 AM", activity: "Wake up & Morning meditation", icon: Activity },
  { time: "8:00 AM", activity: "Breakfast & Peer check-in", icon: Users },
  { time: "9:00 AM", activity: "Individual Therapy session", icon: Brain },
  { time: "10:30 AM", activity: "Group Therapy", icon: Users },
  { time: "12:00 PM", activity: "Lunch & Free time", icon: Calendar },
  { time: "2:00 PM", activity: "Specialized programming", icon: Activity },
  { time: "4:00 PM", activity: "Wellness / Recreation", icon: Heart },
  { time: "7:00 PM", activity: "12-Step or Support group", icon: Users },
];

const StateInpatientRehab = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  const stateData = statesData.find(s => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/residential-inpatient" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);
  const cityNames = cities.map(c => c.name);

  const sections = generateStateTreatmentSections(stateName, abbreviation, "inpatient", cityNames);
  const faqs = generateStateTreatmentFAQs(stateName, abbreviation, "inpatient");
  const checklist = generateStateTreatmentChecklist(abbreviation, "inpatient");

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Inpatient Rehab in ${stateName}`,
      description: `Find residential inpatient rehab centers in ${stateName}. 24/7 care, structured programs, and evidence-based treatment.`,
      url: `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}`,
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
        title={`Inpatient Rehab in ${stateName} (${abbreviation}) | Residential Treatment`}
        description={`Find accredited inpatient rehab centers in ${stateName}. 30-90 day residential programs with 24/7 care. Insurance accepted. ${cities.length}+ cities covered.`}
        canonical={`/treatment-types/residential-inpatient/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Inpatient Rehab", url: "/treatment-types/residential-inpatient" },
          { name: stateName, url: `/treatment-types/residential-inpatient/${stateSlug}` },
        ]}
      />

      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav className="mb-4" items={[
            { label: "Treatment Types", href: "/treatment-types" },
            { label: "Inpatient Rehab", href: "/treatment-types/residential-inpatient" },
            { label: stateName },
          ]} />
          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Residential Treatment in {abbreviation}</span>
            </div>
            <h1 className="mb-4 text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Inpatient Rehab Centers in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find accredited residential inpatient treatment programs in {stateName}. Immersive 30-90 day programs with 
              24/7 medical care, individual therapy, and structured recovery support.
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
            <div className="flex items-center gap-2 text-muted-foreground"><Shield className="h-4 w-4 text-primary" /><span>Accredited Facilities</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><Clock className="h-4 w-4 text-primary" /><span>24/7 On-Site Care</span></div>
            <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle className="h-4 w-4 text-primary" /><span>Insurance Accepted</span></div>
          </div>
        </div>
      </section>

      <StateFacilitiesSection stateName={stateName} stateSlug={stateSlug!} abbreviation={abbreviation}
        treatmentFilter={["inpatient", "residential"]}
        heading={`Inpatient Rehab Centers in ${stateName}`}
        subheading={`Browse verified residential treatment facilities across ${stateName}`} />

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
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Inpatient Program Options in {stateName}</h2>
          <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
            {programFeatures.map(prog => (
              <div key={prog.name} className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10"><Home className="h-6 w-6 text-primary" /></div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{prog.name}</h3>
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

      {/* Daily Schedule */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Typical Day in Inpatient Rehab</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {dailySchedule.map(item => (
              <div key={item.time} className="flex items-center gap-3 p-4 rounded-xl border bg-card">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10"><item.icon className="h-4 w-4 text-primary" /></div>
                <div><p className="text-xs font-semibold text-primary">{item.time}</p><p className="text-sm text-muted-foreground">{item.activity}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Checklist */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container"><div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">What to Look for in {stateName} Inpatient Rehab</h2>
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
          <h2 className="text-2xl font-bold text-center md:text-3xl mb-8">Inpatient Rehab by City in {stateName}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map(city => (
              <Link key={city.slug} to={`/treatment-types/residential-inpatient/${stateSlug}/${city.slug}`}
                className="group p-5 rounded-xl border bg-background hover:border-primary hover:shadow-lg transition-all">
                <h3 className="font-semibold group-hover:text-primary transition-colors">{city.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Inpatient programs</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <TreatmentFAQSection faqs={faqs} treatmentType="Inpatient Rehab" location={{ state: stateName }} />

      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">Inpatient Rehab in Nearby States</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map(state => (
                <Link key={state.slug} to={`/treatment-types/residential-inpatient/${state.slug}`}
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
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Find Residential Treatment in {stateName}</h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our team will help you find accredited inpatient rehab in {stateName} that accepts your insurance. Confidential and free.
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
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}` },
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

export default StateInpatientRehab;
