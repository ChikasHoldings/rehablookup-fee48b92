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
  GraduationCap,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programTypes = [
  {
    name: "Intensive Outpatient (IOP)",
    hours: "9-20 hrs/week",
    description: "Structured treatment while maintaining work and family responsibilities. Ideal step-down from inpatient.",
    features: ["Group therapy", "Individual counseling", "Flexible scheduling"],
  },
  {
    name: "Partial Hospitalization (PHP)",
    hours: "20-30 hrs/week",
    description: "Day treatment with intensive clinical care. Return home evenings. Medical monitoring available.",
    features: ["Daily programming", "Psychiatric support", "Medication management"],
  },
  {
    name: "Standard Outpatient",
    hours: "1-8 hrs/week",
    description: "Ongoing support and maintenance therapy for those in stable recovery.",
    features: ["Weekly sessions", "Relapse prevention", "Long-term support"],
  },
  {
    name: "Evening/Weekend Programs",
    hours: "Flexible",
    description: "Treatment designed for working professionals with sessions outside business hours.",
    features: ["After-work sessions", "Weekend groups", "Career-friendly"],
  },
];

const benefits = [
  { title: "Maintain Employment", description: "Continue working while receiving treatment", icon: Briefcase },
  { title: "Stay with Family", description: "Sleep at home and maintain family connections", icon: Users },
  { title: "Real-World Practice", description: "Apply recovery skills in daily life immediately", icon: Brain },
  { title: "Lower Cost", description: "More affordable than residential treatment", icon: Calendar },
];

const StateOutpatientPrograms = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/outpatient-programs" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Outpatient Rehab Programs in ${stateName}`,
      "description": `Find outpatient addiction treatment programs in ${stateName}. IOP, PHP, and flexible rehab options. Continue working while in treatment.`,
      "url": `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}`,
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
        { "@type": "ListItem", "position": 2, "name": "Treatment Types", "item": "https://rehablookup.com/treatment-types" },
        { "@type": "ListItem", "position": 3, "name": "Outpatient Programs", "item": "https://rehablookup.com/treatment-types/outpatient-programs" },
        { "@type": "ListItem", "position": 4, "name": `${stateName}`, "item": `https://rehablookup.com/treatment-types/outpatient-programs/${stateSlug}` },
      ]
    }
  ];

  return (
    <Layout>
      <SEO
        title={`Outpatient Rehab Programs in ${stateName} | IOP & PHP Treatment ${abbreviation}`}
        description={`Find outpatient addiction treatment in ${stateName}. IOP, PHP & flexible programs. Work while in recovery. Insurance accepted. Call now.`}
        canonical={`/treatment-types/outpatient-programs/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Outpatient Programs", url: "/treatment-types/outpatient-programs" },
          { name: `${stateName}`, url: `/treatment-types/outpatient-programs/${stateSlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Outpatient", href: "/treatment-types/outpatient-programs" },
              { label: stateName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Outpatient Treatment in {abbreviation}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Outpatient Rehab Programs in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find flexible outpatient addiction treatment programs in {stateName}. IOP, PHP, and standard 
              outpatient options allow you to receive evidence-based treatment while maintaining work, 
              school, and family responsibilities.
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
              <span>Licensed {abbreviation} Programs</span>
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

      {/* Why Outpatient */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Outpatient Rehab in {stateName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {stateName} offers accredited outpatient treatment programs designed for individuals 
                who need structured addiction care but cannot take extended time away from work or 
                family. Whether stepping down from inpatient treatment or starting recovery with 
                a flexible option, {stateName} outpatient programs provide comprehensive care.
              </p>
              <p>
                Outpatient treatment allows you to apply recovery skills in real-world situations 
                immediately. {stateName}'s licensed outpatient centers offer individual therapy, 
                group counseling, medication management, and support groups with scheduling 
                flexibility to fit your life.
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
              Benefits of Outpatient Treatment in {stateName}
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-12">{benefit.description}</p>
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
              Outpatient Program Options in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {stateName} offers various levels of outpatient care to match your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {programTypes.map((program) => (
              <div
                key={program.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <GraduationCap className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {program.name}
                      </h3>
                      <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full">
                        {program.hours}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{program.description}</p>
                    <ul className="mt-3 flex flex-wrap gap-2">
                      {program.features.map((feature) => (
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

      {/* Cities */}
      {cities.length > 0 && (
        <section className="bg-secondary/30 section-padding">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Outpatient Programs by City in {stateName}
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                Find IOP and PHP programs in major {stateName} cities
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/outpatient-programs/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Outpatient in {city.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      IOP & PHP programs in {city.name}, {abbreviation}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Insurance */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-4">
              Insurance for Outpatient Rehab in {stateName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {stateName} outpatient programs accept major insurance plans. Outpatient treatment 
              is often more affordable and widely covered than residential options.
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

      {/* CTA */}
      <section className="bg-primary py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Building2 className="mx-auto h-12 w-12 text-accent mb-4" />
            <h2 className="text-2xl font-bold text-primary-foreground md:text-3xl">
              Start Outpatient Treatment in {stateName} Today
            </h2>
            <p className="mt-3 text-primary-foreground/85">
              Connect with a licensed {stateName} outpatient program. Most facilities offer 
              flexible scheduling and can verify your insurance same-day.
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
              <Button variant="outline" size="sm">
                All Rehab Centers in {abbreviation}
              </Button>
            </Link>
            <Link to={`/treatment-types/residential-inpatient/${stateSlug}`}>
              <Button variant="outline" size="sm">
                Inpatient Rehab in {abbreviation}
              </Button>
            </Link>
            <Link to={`/treatment-types/detox-programs/${stateSlug}`}>
              <Button variant="outline" size="sm">
                Detox in {abbreviation}
              </Button>
            </Link>
            <Link to="/treatment-types/dual-diagnosis">
              <Button variant="outline" size="sm">
                Dual Diagnosis Treatment
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StateOutpatientPrograms;