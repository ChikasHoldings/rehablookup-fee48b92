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

const mentalHealthConditions = [
  {
    name: "Depression & Addiction",
    description: "Integrated treatment for major depressive disorder co-occurring with substance use disorders.",
    features: ["Antidepressant management", "CBT therapy", "Mood monitoring"],
  },
  {
    name: "Anxiety & Addiction",
    description: "Comprehensive care for anxiety disorders (GAD, panic, social anxiety) alongside addiction treatment.",
    features: ["Anxiety management", "Exposure therapy", "Relaxation techniques"],
  },
  {
    name: "PTSD & Addiction",
    description: "Trauma-informed treatment addressing post-traumatic stress and substance use simultaneously.",
    features: ["EMDR therapy", "Trauma processing", "Safety stabilization"],
  },
  {
    name: "Bipolar & Addiction",
    description: "Specialized care for bipolar disorder mood episodes combined with addiction recovery.",
    features: ["Mood stabilizers", "Episode prevention", "Lifestyle management"],
  },
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

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Dual Diagnosis Treatment in ${stateName}`,
      "description": `Find dual diagnosis treatment centers in ${stateName}. Integrated care for co-occurring mental health and substance use disorders.`,
      "url": `https://rehablookup.com/treatment-types/dual-diagnosis-treatment/${stateSlug}`,
      "about": {
        "@type": "MedicalCondition",
        "name": "Co-occurring Disorders"
      }
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Dual Diagnosis Treatment in ${stateName} | Mental Health & Addiction ${abbreviation}`}
        description={`Find dual diagnosis treatment centers in ${stateName}. Integrated care for depression, anxiety, PTSD, and addiction. Insurance accepted.`}
        canonical={`/treatment-types/dual-diagnosis-treatment/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Dual Diagnosis", url: "/treatment-types/dual-diagnosis-treatment" },
          { name: stateName, url: `/treatment-types/dual-diagnosis-treatment/${stateSlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Dual Diagnosis", href: "/treatment-types/dual-diagnosis-treatment" },
              { label: stateName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Co-Occurring Disorder Treatment</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Dual Diagnosis Treatment in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find integrated treatment programs in {stateName} for co-occurring mental health and substance use disorders. 
              Address depression, anxiety, PTSD, bipolar disorder, and addiction together for lasting recovery.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/rehab-centers">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment in {abbreviation}
                </Button>
              </Link>
              <Link to={`/rehab-centers/${stateSlug}`}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse {abbreviation} Centers
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

      {/* Conditions Treated */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Co-Occurring Disorders Treated in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {stateName} dual diagnosis centers provide integrated treatment for these common combinations
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {mentalHealthConditions.map((condition) => (
              <div
                key={condition.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                    <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {condition.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {condition.description}
                    </p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {condition.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-1 text-xs text-foreground bg-secondary/50 px-2 py-1 rounded-full">
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

      {/* Treatment Process */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              The Dual Diagnosis Treatment Process
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Integrated care that addresses both mental health and addiction
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {treatmentComponents.map((step) => (
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

      {/* Cities Section */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Dual Diagnosis Treatment by City in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Find integrated mental health and addiction treatment near you
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cities.slice(0, 12).map((city) => (
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

          {cities.length > 12 && (
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                And {cities.length - 12} more cities in {stateName}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection
        stateName={stateName}
        stateSlug={stateSlug!}
        abbreviation={abbreviation}
        treatmentFilter={["dual diagnosis", "co-occurring", "mental health"]}
        heading={`Dual Diagnosis Centers in ${stateName}`}
        subheading={`Browse verified dual diagnosis treatment facilities in ${stateName}`}
      />


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
                    Why Choose Dual Diagnosis Treatment in {stateName}?
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "Integrated mental health and addiction care",
                      "Board-certified psychiatrists on staff",
                      "Evidence-based therapies (CBT, DBT, EMDR)",
                      "Medication management for both conditions",
                      "Trauma-informed treatment approaches",
                      "Long-term aftercare and relapse prevention",
                    ].map((benefit, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-accent shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
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
          </div>
        </div>
      </section>

      {/* Other Treatment Types */}
      <section className="border-t section-padding-sm">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Other Treatment Options in {stateName}
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to={`/treatment-types/detox-programs/${stateSlug}`}>
              <Button variant="outline" className="gap-2">
                <Pill className="h-4 w-4" />
                {abbreviation} Detox
              </Button>
            </Link>
            <Link to={`/treatment-types/residential-inpatient/${stateSlug}`}>
              <Button variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                {abbreviation} Inpatient
              </Button>
            </Link>
            <Link to={`/treatment-types/outpatient-programs/${stateSlug}`}>
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                {abbreviation} Outpatient
              </Button>
            </Link>
            <Link to="/treatment-types">
              <Button variant="outline" className="gap-2">
                All Treatment Types
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
              Find Dual Diagnosis Treatment in {stateName}
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our team can help you find integrated mental health and addiction treatment in {stateName} that accepts your insurance.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/rehab-centers">
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

export default StateDualDiagnosis;
