import { Link, useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData } from "@/data/locationSeoData";
import {
  Sparkles,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Pill,
  Timer,
  HeartPulse,
  Stethoscope,
  Thermometer,
  MapPin,
  Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";

const detoxTypes = [
  {
    name: "Alcohol Detox",
    duration: "3-7 days",
    description: "Medically supervised alcohol withdrawal with medication support to prevent seizures and delirium tremens.",
    features: ["Benzodiazepine protocols", "24/7 monitoring", "Nutritional support"],
  },
  {
    name: "Opioid Detox",
    duration: "5-10 days",
    description: "Safe withdrawal from heroin, fentanyl, and prescription opioids using medication-assisted treatment.",
    features: ["Suboxone/Subutex", "Comfort medications", "MAT transition"],
  },
  {
    name: "Benzodiazepine Detox",
    duration: "2-8 weeks",
    description: "Gradual tapering from Xanax, Valium, Klonopin with extended medical supervision.",
    features: ["Slow tapering", "Anxiety management", "Extended monitoring"],
  },
  {
    name: "Stimulant Detox",
    duration: "1-2 weeks",
    description: "Medical support during cocaine and meth withdrawal focusing on sleep and psychiatric symptoms.",
    features: ["Sleep support", "Depression monitoring", "Psychiatric care"],
  },
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

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Detox Centers in ${stateName}`,
      "description": `Find medical detox centers in ${stateName}. Safe, supervised withdrawal from alcohol, opioids, and drugs with 24/7 medical care.`,
      "url": `https://rehablookup.com/treatment-types/detox-programs/${stateSlug}`,
      "about": {
        "@type": "MedicalProcedure",
        "name": "Medical Detoxification",
        "procedureType": "https://schema.org/TherapeuticProcedure"
      }
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Detox Centers in ${stateName} | Medical Detox Programs ${abbreviation}`}
        description={`Find medical detox centers in ${stateName}. Safe withdrawal from alcohol, opioids & drugs with 24/7 care. Insurance accepted. Call now.`}
        canonical={`/treatment-types/detox-programs/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Detox Programs", url: "/treatment-types/detox-programs" },
          { name: `${stateName} Detox`, url: `/treatment-types/detox-programs/${stateSlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Detox Programs", href: "/treatment-types/detox-programs" },
              { label: stateName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Medical Detox in {abbreviation}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Detox Centers in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find medical detox programs in {stateName} offering safe, supervised withdrawal from alcohol, opioids, 
              benzodiazepines, and other substances. {stateName} detox centers provide 24/7 medical monitoring 
              and medication-assisted treatment to ensure a safe start to your recovery journey.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment in {abbreviation}
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {stateName} Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Licensed {abbreviation} Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Medical Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
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
        treatmentFilter={["detox", "withdrawal", "detoxification"]}
        heading={`Detox Centers in ${stateName}`}
        subheading={`Browse verified medical detox facilities in ${stateName}`}
      />


      {/* Why Detox in State */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Medical Detox in {stateName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {stateName} offers a range of accredited medical detox facilities staffed by experienced 
                addiction medicine specialists. Whether you're seeking help for alcohol dependence, opioid 
                addiction, or benzodiazepine withdrawal, {stateName} detox centers provide the medical 
                supervision necessary for safe withdrawal.
              </p>
              <p>
                Detoxification is the critical first step in addiction treatment—attempting withdrawal without 
                medical supervision can be dangerous and even life-threatening. {stateName}'s licensed detox 
                programs use evidence-based protocols and medication-assisted treatment (MAT) to manage 
                withdrawal symptoms, reduce cravings, and prepare you for ongoing treatment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Detox Types */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Types of Detox Programs in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {stateName} detox centers offer specialized protocols for different substances
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {detoxTypes.map((detox) => (
              <div
                key={detox.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {detox.name} in {abbreviation}
                      </h3>
                      <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {detox.duration}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{detox.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {detox.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1 text-xs text-foreground bg-secondary px-2 py-1 rounded-full">
                          <CheckCircle className="h-3 w-3 text-accent shrink-0" />
                          {feature}
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
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              The Detox Process in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              What to expect at a {stateName} medical detox facility
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detoxProcess.map((step) => (
              <div
                key={step.step}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow relative"
              >
                <div className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.step}
                </div>
                <div className="flex items-center gap-3 mb-2 mt-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-12">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cities in State */}
      {cities.length > 0 && (
        <section className="bg-secondary/30 section-padding">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Detox Centers by City in {stateName}
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                Find medical detox programs in major {stateName} cities
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/rehab-centers/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Detox in {city.name}, {abbreviation}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Medical detox centers in {city.name}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Insurance Section */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-4">
              Insurance Coverage for Detox in {stateName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {stateName} detox centers accept major insurance plans including Medicaid, Medicare, 
              and private insurance. The Affordable Care Act requires coverage for substance abuse treatment, 
              including medical detox.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Blue Cross Blue Shield", "Aetna", "Cigna", "UnitedHealthcare", "Medicaid", "Medicare"].map((ins) => (
                <span key={ins} className="px-4 py-2 bg-secondary rounded-full text-sm font-medium text-foreground">
                  {ins}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-primary py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Building2 className="mx-auto h-12 w-12 text-accent mb-4" />
            <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
              Start Your Recovery in {stateName} Today
            </h2>
            <p className="mt-3 text-primary-foreground/85">
              Connect with a licensed {stateName} detox center. Most facilities offer same-day assessments 
              and can help verify your insurance coverage.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {stateName} Rehabs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="border-t bg-card section-padding">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-foreground">
              Related Treatment Options in {stateName}
            </h2>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/rehab-centers/${stateSlug}`}>
              <Button variant="outline" size="sm" className="gap-2">
                Rehab Centers in {abbreviation}
              </Button>
            </Link>
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" size="sm" className="gap-2">
                Inpatient Rehab
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" size="sm" className="gap-2">
                Outpatient Programs
              </Button>
            </Link>
            <Link to="/treatment-types/dual-diagnosis">
              <Button variant="outline" size="sm" className="gap-2">
                Dual Diagnosis
              </Button>
            </Link>
            <Link to="/treatment-types/detox-programs">
              <Button variant="outline" size="sm" className="gap-2">
                All Detox Programs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StateDetoxPrograms;
