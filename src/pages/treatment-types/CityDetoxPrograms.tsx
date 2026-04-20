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
import { useTreatmentCityValidation } from "@/hooks/useTreatmentCityValidation";

const detoxTypes = [
  {
    name: "Alcohol Detox",
    duration: "3-7 days",
    description: "Medically supervised alcohol withdrawal with medication support to prevent seizures and DTs.",
  },
  {
    name: "Opioid Detox",
    duration: "5-10 days",
    description: "Safe withdrawal from heroin, fentanyl, and prescription opioids using MAT protocols.",
  },
  {
    name: "Benzodiazepine Detox",
    duration: "2-8 weeks",
    description: "Gradual tapering from Xanax, Valium, Klonopin with extended medical supervision.",
  },
  {
    name: "Stimulant Detox",
    duration: "1-2 weeks",
    description: "Medical support during cocaine and meth withdrawal with psychiatric care.",
  },
];

const detoxProcess = [
  { step: 1, title: "Assessment", description: "Medical evaluation to create personalized detox plan", icon: Stethoscope },
  { step: 2, title: "Stabilization", description: "24/7 medical management of withdrawal symptoms", icon: HeartPulse },
  { step: 3, title: "Management", description: "Comfort medications, hydration, and support", icon: Thermometer },
  { step: 4, title: "Transition", description: "Seamless transition to ongoing treatment", icon: ArrowRight },
];

const CityDetoxPrograms = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/detox-programs" replace />;
  }

  const cityData = stateData.cities.find(c => c.slug === citySlug);
  
  if (!cityData) {
    return <Navigate to={`/treatment-types/detox-programs/${stateSlug}`} replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const { name: cityName } = cityData;
  const otherCities = cities.filter(c => c.slug !== citySlug).slice(0, 6);

  const { validation } = useTreatmentCityValidation({
    stateName,
    cityName,
    treatmentKeywords: ["detox", "withdrawal", "medical detoxification"],
    pageType: "city-treatment",
  });

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Detox Centers in ${cityName}, ${abbreviation}`,
      "description": `Find medical detox centers in ${cityName}, ${stateName}. Safe withdrawal from alcohol, opioids, and drugs with 24/7 medical care.`,
      "url": `https://rehablookup.com/treatment-types/detox-programs/${stateSlug}/${citySlug}`,
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
        title={`Detox Centers in ${cityName}, ${abbreviation} | Medical Detox Programs`}
        description={`Find medical detox centers in ${cityName}, ${stateName}. Safe withdrawal from alcohol & drugs with 24/7 care. Insurance accepted.`}
        canonical={`/treatment-types/detox-programs/${stateSlug}/${citySlug}`}
        noindex={!validation.shouldIndex}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Detox Programs", url: "/treatment-types/detox-programs" },
          { name: `${stateName}`, url: `/treatment-types/detox-programs/${stateSlug}` },
          { name: `${cityName}`, url: `/treatment-types/detox-programs/${stateSlug}/${citySlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Detox", href: "/treatment-types/detox-programs" },
              { label: stateName, href: `/treatment-types/detox-programs/${stateSlug}` },
              { label: cityName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Medical Detox in {cityName}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Detox Centers in {cityName}, {abbreviation}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find medical detox programs in {cityName}, {stateName} offering safe, supervised withdrawal from 
              alcohol, opioids, and other substances. {cityName} detox centers provide 24/7 medical monitoring 
              and medication-assisted treatment for a safe start to recovery.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/rehab-centers">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment in {cityName}
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {cityName} Rehabs
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
              <span>Licensed {cityName} Facilities</span>
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
        heading={`Detox Centers in ${cityName}, ${abbreviation}`}
        subheading={`Browse verified medical detox facilities in ${cityName}, ${stateName}`}
      />


      {/* Why Detox in City */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Medical Detox in {cityName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {cityName}, {stateName} offers accredited medical detox facilities staffed by addiction 
                medicine specialists. Whether you're seeking help for alcohol dependence, opioid addiction, 
                or benzodiazepine withdrawal, {cityName} detox centers provide the medical supervision 
                necessary for safe withdrawal.
              </p>
              <p>
                Detoxification is the critical first step in addiction treatment. {cityName}'s licensed 
                detox programs use evidence-based protocols and medication-assisted treatment (MAT) to
                manage withdrawal symptoms, reduce cravings, and prepare you for ongoing treatment at 
                local {cityName} rehab centers.
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
              Types of Detox in {cityName}, {abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {cityName} detox centers offer specialized protocols for different substances
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detoxTypes.map((detox) => (
              <div
                key={detox.name}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{detox.name}</h3>
                </div>
                <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-2">
                  <Timer className="h-3 w-3" />
                  {detox.duration}
                </span>
                <p className="text-sm text-muted-foreground">{detox.description}</p>
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
              The Detox Process in {cityName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              What to expect at a {cityName} medical detox facility
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {detoxProcess.map((step) => (
              <div
                key={step.step}
                className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow relative"
              >
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.step}
                </div>
                <div className="mx-auto mb-4 mt-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <step.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insurance Section */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-4">
              Insurance for Detox in {cityName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {cityName} detox centers accept major insurance plans. The Affordable Care Act 
              requires coverage for substance abuse treatment including medical detox.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Blue Cross", "Aetna", "Cigna", "United", "Medicaid", "Medicare"].map((ins) => (
                <span key={ins} className="px-3 py-1.5 bg-card border rounded-full text-sm font-medium text-foreground">
                  {ins}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Other Cities */}
      {otherCities.length > 0 && (
        <section className="section-padding">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="text-xl font-bold text-foreground md:text-2xl">
                Detox Centers in Other {stateName} Cities
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/detox-programs/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Detox in {city.name}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="bg-primary py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Building2 className="mx-auto h-12 w-12 text-accent mb-4" />
            <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
              Start Your Recovery in {cityName} Today
            </h2>
            <p className="mt-3 text-primary-foreground/85">
              Connect with a licensed {cityName} detox center. Most facilities offer same-day 
              assessments and can help verify your insurance coverage.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/rehab-centers">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {cityName} Rehabs
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
          <div className="flex flex-wrap justify-center gap-3">
            <Link to={`/treatment-types/detox-programs/${stateSlug}`}>
              <Button variant="outline" size="sm">
                All {stateName} Detox
              </Button>
            </Link>
            <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
              <Button variant="outline" size="sm">
                {cityName} Rehab Centers
              </Button>
            </Link>
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" size="sm">
                Inpatient Rehab
              </Button>
            </Link>
            <Link to="/treatment-types/detox-programs">
              <Button variant="outline" size="sm">
                All Detox Programs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CityDetoxPrograms;
