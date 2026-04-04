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
  Calendar,
  Users,
  Brain,
  Briefcase,
  MapPin,
  Building2,
} from "lucide-react";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programTypes = [
  {
    name: "Intensive Outpatient (IOP)",
    hours: "9-20 hrs/week",
    description: "Structured treatment while maintaining daily responsibilities.",
  },
  {
    name: "Partial Hospitalization (PHP)",
    hours: "20-30 hrs/week",
    description: "Day treatment with intensive clinical care, return home evenings.",
  },
  {
    name: "Standard Outpatient",
    hours: "1-8 hrs/week",
    description: "Ongoing support and maintenance therapy for stable recovery.",
  },
  {
    name: "Evening Programs",
    hours: "Flexible",
    description: "Treatment sessions designed for working professionals.",
  },
];

const benefits = [
  { title: "Keep Working", description: "Maintain employment during treatment", icon: Briefcase },
  { title: "Stay Home", description: "Sleep at home with family support", icon: Users },
  { title: "Real-World Practice", description: "Apply skills in daily life", icon: Brain },
  { title: "Flexible Schedule", description: "Evening and weekend options", icon: Calendar },
];

const CityOutpatientPrograms = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/outpatient-programs" replace />;
  }

  const cityData = stateData.cities.find(c => c.slug === citySlug);
  
  if (!cityData) {
    return <Navigate to={`/treatment-types/outpatient-programs/${stateSlug}`} replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const { name: cityName } = cityData;
  const otherCities = cities.filter(c => c.slug !== citySlug).slice(0, 6);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Outpatient Rehab Programs in ${cityName}, ${abbreviation}`,
      "description": `Find outpatient addiction treatment in ${cityName}, ${stateName}. IOP, PHP, and flexible rehab options while maintaining work and family.`,
      "url": `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}/${citySlug}`,
      "about": {
        "@type": "MedicalProcedure",
        "name": "Outpatient Addiction Treatment",
        "procedureType": "https://schema.org/TherapeuticProcedure"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rehablookup.com/" },
        { "@type": "ListItem", "position": 2, "name": "Outpatient Programs", "item": "https://rehablookup.com/treatment-types/outpatient-programs" },
        { "@type": "ListItem", "position": 3, "name": `${stateName}`, "item": `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}` },
        { "@type": "ListItem", "position": 4, "name": `${cityName}`, "item": `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}/${citySlug}` },
      ]
    }
  ];

  return (
    <Layout>
      <SEO
        title={`Outpatient Rehab Programs in ${cityName}, ${abbreviation} | IOP & PHP`}
        description={`Find outpatient addiction treatment in ${cityName}, ${stateName}. IOP, PHP & flexible programs. Insurance accepted. Call now.`}
        canonical={`/treatment-types/outpatient-programs/${stateSlug}/${citySlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Outpatient Programs", url: "/treatment-types/outpatient-programs" },
          { name: `${stateName}`, url: `/treatment-types/outpatient-programs/${stateSlug}` },
          { name: `${cityName}`, url: `/treatment-types/outpatient-programs/${stateSlug}/${citySlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
        <MedicalPatternBackground />
          <BreadcrumbNav
            className="mb-4"
            items=[{'{ label: "Outpatient", href: "/treatment-types/outpatient-programs" },\n              { label: {stateName}, href: `/treatment-types/outpatient-programs/${stateSlug },\n              { label: {cityName} }'}]
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Outpatient Treatment in {cityName}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Outpatient Rehab Programs in {cityName}, {abbreviation}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find flexible outpatient addiction treatment in {cityName}, {stateName}. IOP, PHP, and 
              standard outpatient programs allow you to receive treatment while maintaining work, 
              school, and family responsibilities.
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
              <span>Licensed {cityName} Programs</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Flexible Scheduling</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Outpatient in City */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Outpatient Rehab in {cityName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {cityName}, {stateName} offers accredited outpatient treatment programs for individuals 
                who need structured addiction care without taking extended time away from work or family. 
                Whether stepping down from inpatient or starting with a flexible option, {cityName} 
                outpatient centers provide comprehensive care.
              </p>
              <p>
                Outpatient treatment allows you to apply recovery skills in real-world situations 
                immediately. {cityName}'s licensed programs offer individual therapy, group counseling,
                medication management, and support groups with flexible scheduling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Benefits of Outpatient in {cityName}
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <benefit.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Program Types */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Outpatient Options in {cityName}, {abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {cityName} offers various levels of outpatient care
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {programTypes.map((program) => (
              <div
                key={program.name}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground text-sm">{program.name}</h3>
                </div>
                <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-0.5 rounded-full inline-block mb-2">
                  {program.hours}
                </span>
                <p className="text-sm text-muted-foreground">{program.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Insurance */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-4">
              Insurance for Outpatient in {cityName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {cityName} outpatient programs accept major insurance. Outpatient treatment 
              is often more affordable and widely covered than residential options.
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
                Outpatient Programs in Other {stateName} Cities
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/outpatient-programs/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Outpatient in {city.name}
                  </span>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors ml-auto shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-primary py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Building2 className="mx-auto h-12 w-12 text-accent mb-4" />
            <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
              Start Outpatient Treatment in {cityName} Today
            </h2>
            <p className="mt-3 text-primary-foreground/85">
              Connect with a licensed {cityName} outpatient program. Most facilities offer 
              flexible scheduling and same-day insurance verification.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
              <Link to="/concierge">
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
            <Link to={`/treatment-types/outpatient-programs/${stateSlug}`}>
              <Button variant="outline" size="sm">
                All {stateName} Outpatient
              </Button>
            </Link>
            <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
              <Button variant="outline" size="sm">
                {cityName} Rehab Centers
              </Button>
            </Link>
            <Link to={`/treatment-types/residential-inpatient/${stateSlug}/${citySlug}`}>
              <Button variant="outline" size="sm">
                Inpatient in {cityName}
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" size="sm">
                All Outpatient Programs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CityOutpatientPrograms;
