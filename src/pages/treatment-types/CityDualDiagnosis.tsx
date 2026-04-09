import { Link, useParams, Navigate } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData } from "@/data/locationSeoData";
import {
  Brain,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Pill,
  Stethoscope,
  Users,
  MapPin,
  Building2,
  Sparkles,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";

const treatmentFeatures = [
  {
    icon: Brain,
    title: "Psychiatric Care",
    description: "On-site psychiatrists providing comprehensive mental health evaluation and medication management.",
  },
  {
    icon: Stethoscope,
    title: "Integrated Treatment",
    description: "Coordinated care addressing addiction and mental health simultaneously for better outcomes.",
  },
  {
    icon: Users,
    title: "Specialized Groups",
    description: "Dual diagnosis-specific group therapy with peers facing similar challenges.",
  },
  {
    icon: Heart,
    title: "Trauma Therapy",
    description: "Evidence-based trauma processing including EMDR, CPT, and somatic therapies.",
  },
];

const conditionsTreated = [
  "Depression & Addiction",
  "Anxiety Disorders & Addiction",
  "PTSD & Substance Use",
  "Bipolar Disorder & Addiction",
  "ADHD & Substance Use",
  "Personality Disorders & Addiction",
];

const CityDualDiagnosis = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/dual-diagnosis-treatment" replace />;
  }

  const cityData = stateData.cities.find(c => c.slug === citySlug);
  
  if (!cityData) {
    return <Navigate to={`/treatment-types/dual-diagnosis-treatment/${stateSlug}`} replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const { name: cityName } = cityData;

  const nearbyCities = cities.filter(c => c.slug !== citySlug).slice(0, 6);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Dual Diagnosis Treatment in ${cityName}, ${abbreviation}`,
      "description": `Find dual diagnosis treatment centers in ${cityName}, ${stateName}. Integrated care for co-occurring mental health and substance use disorders.`,
      "url": `https://rehablookup.com/treatment-types/dual-diagnosis-treatment/${stateSlug}/${citySlug}`,
      "about": {
        "@type": "MedicalCondition",
        "name": "Co-occurring Disorders"
      }
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Dual Diagnosis Treatment in ${cityName}, ${abbreviation} | Mental Health & Addiction`}
        description={`Find dual diagnosis treatment centers in ${cityName}, ${stateName}. Integrated care for depression, anxiety, PTSD, and addiction. Insurance accepted.`}
        canonical={`/treatment-types/dual-diagnosis-treatment/${stateSlug}/${citySlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Dual Diagnosis", url: "/treatment-types/dual-diagnosis-treatment" },
          { name: stateName, url: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
          { name: cityName, url: `/treatment-types/dual-diagnosis-treatment/${stateSlug}/${citySlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis-treatment" },
              { label: stateName, href: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
              { label: cityName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Co-Occurring Disorder Treatment</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Dual Diagnosis Treatment in {cityName}, {abbreviation}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find integrated treatment programs in {cityName} for co-occurring mental health and substance use disorders. 
              Get comprehensive care that addresses depression, anxiety, PTSD, and addiction together.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment in {cityName}
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {cityName} Centers
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
              <span>Integrated Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Psychiatric Support</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Trauma-Informed</span>
            </div>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection
        stateName={stateName}
        stateSlug={stateSlug!}
        abbreviation={abbreviation}
        treatmentFilter={["dual diagnosis", "co-occurring", "mental health"]}
        heading={`Dual Diagnosis in ${cityName}, ${abbreviation}`}
        subheading={`Browse verified dual diagnosis facilities in ${cityName}, ${stateName}`}
      />


      {/* Treatment Features */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Dual Diagnosis Treatment in {cityName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive integrated care addressing mental health and addiction simultaneously
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {treatmentFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <feature.icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Conditions Treated */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border bg-card p-8 md:p-10">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-foreground md:text-2xl">
                  Co-Occurring Disorders Treated in {cityName}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {cityName} dual diagnosis centers provide integrated treatment for these conditions
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {conditionsTreated.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-foreground bg-secondary/50 px-4 py-3 rounded-lg">
                    <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                    {condition}
                  </div>
                ))}
              </div>
              <div className="mt-6 text-center">
                <Link to="/concierge">
                  <Button className="gap-2">
                    <Phone className="h-4 w-4" />
                    Get a Free Assessment
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby Cities */}
      {nearbyCities.length > 0 && (
        <section className="section-padding">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Dual Diagnosis Treatment Near {cityName}
              </h2>
              <p className="mt-2 text-muted-foreground">
                Explore integrated treatment options in nearby {stateName} cities
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearbyCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/dual-diagnosis-treatment/${stateSlug}/${city.slug}`}
                  className="flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                    <MapPin className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {city.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Dual Diagnosis Centers
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why Choose Section */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border bg-card p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                  <Sparkles className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground md:text-2xl">
                    Why Choose Dual Diagnosis Treatment in {cityName}?
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "Integrated mental health and addiction care",
                      "Licensed psychiatrists and addiction specialists",
                      "Evidence-based therapies (CBT, DBT, EMDR)",
                      "Medication management for both conditions",
                      "Local support groups and community resources",
                      "Comprehensive aftercare planning",
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Other Treatment Types */}
      <section className="border-t section-padding-sm">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Other Treatment Options in {cityName}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={`/treatment-types/detox-programs/${stateSlug}/${citySlug}`}>
              <Button variant="outline" className="gap-2">
                <Pill className="h-4 w-4" />
                {cityName} Detox
              </Button>
            </Link>
            <Link to={`/treatment-types/residential-inpatient/${stateSlug}/${citySlug}`}>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                {cityName} Inpatient
              </Button>
            </Link>
            <Link to={`/treatment-types/outpatient-programs/${stateSlug}/${citySlug}`}>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                {cityName} Outpatient
              </Button>
            </Link>
            <Link to={`/treatment-types/dual-diagnosis-treatment/${stateSlug}`}>
              <Button variant="outline" className="gap-2">
                All {abbreviation} Cities
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Find Dual Diagnosis Treatment in {cityName}
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Get help finding integrated mental health and addiction treatment in {cityName} that accepts your insurance.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment Today
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CityDualDiagnosis;
