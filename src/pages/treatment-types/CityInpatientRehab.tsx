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
  Home,
  Users,
  Brain,
  Activity,
  MapPin,
  Building2,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programTypes = [
  {
    name: "30-Day Program",
    description: "Foundation building with medical stabilization and therapy introduction.",
  },
  {
    name: "60-Day Program",
    description: "Extended treatment with deeper therapy work and skill development.",
  },
  {
    name: "90-Day Program",
    description: "Comprehensive care for severe addiction with dual diagnosis support.",
  },
  {
    name: "Long-Term Care",
    description: "6-12 month programs for complex cases with vocational support.",
  },
];

const treatmentFeatures = [
  { title: "24/7 Medical Supervision", description: "Round-the-clock care from addiction specialists", icon: Activity },
  { title: "Individual Therapy", description: "One-on-one sessions with licensed counselors", icon: Brain },
  { title: "Group Counseling", description: "Peer support and shared recovery experiences", icon: Users },
  { title: "Structured Environment", description: "Safe, trigger-free setting for healing", icon: Home },
];

const CityInpatientRehab = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/residential-inpatient" replace />;
  }

  const cityData = stateData.cities.find(c => c.slug === citySlug);
  
  if (!cityData) {
    return <Navigate to={`/treatment-types/residential-inpatient/${stateSlug}`} replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const { name: cityName } = cityData;
  const otherCities = cities.filter(c => c.slug !== citySlug).slice(0, 6);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Inpatient Rehab Centers in ${cityName}, ${abbreviation}`,
      "description": `Find residential inpatient rehab centers in ${cityName}, ${stateName}. 24/7 addiction treatment with medical supervision.`,
      "url": `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}/${citySlug}`,
      "about": {
        "@type": "MedicalProcedure",
        "name": "Residential Inpatient Treatment",
        "procedureType": "https://schema.org/TherapeuticProcedure"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://rehablookup.com/" },
        { "@type": "ListItem", "position": 2, "name": "Residential Inpatient", "item": "https://rehablookup.com/treatment-types/residential-inpatient" },
        { "@type": "ListItem", "position": 3, "name": `${stateName}`, "item": `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}` },
        { "@type": "ListItem", "position": 4, "name": `${cityName}`, "item": `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}/${citySlug}` },
      ]
    }
  ];

  return (
    <Layout>
      <SEO
        title={`Inpatient Rehab Centers in ${cityName}, ${abbreviation} | Residential Treatment`}
        description={`Find inpatient rehab centers in ${cityName}, ${stateName}. 24/7 residential addiction treatment. Insurance accepted. Call now.`}
        canonical={`/treatment-types/residential-inpatient/${stateSlug}/${citySlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Residential Inpatient", url: "/treatment-types/residential-inpatient" },
          { name: `${stateName}`, url: `/treatment-types/residential-inpatient/${stateSlug}` },
          { name: `${cityName}`, url: `/treatment-types/residential-inpatient/${stateSlug}/${citySlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Inpatient", href: "/treatment-types/residential-inpatient" },
              { label: stateName, href: `/treatment-types/residential-inpatient/${stateSlug}` },
              { label: cityName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Residential Treatment in {cityName}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Inpatient Rehab Centers in {cityName}, {abbreviation}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find residential inpatient addiction treatment in {cityName}, {stateName} offering 24/7 care, 
              medical supervision, and evidence-based therapies. {cityName} inpatient rehab centers 
              provide structured environments for lasting recovery.
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
              <span>Licensed {cityName} Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 On-Site Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Inpatient in City */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Inpatient Rehab in {cityName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {cityName}, {stateName} offers accredited residential treatment facilities with 
                experienced clinical teams. Whether you're seeking help for alcohol addiction, 
                opioid dependence, or polysubstance abuse, {cityName} inpatient centers provide 
                the intensive care necessary for recovery.
              </p>
              <p>
                Residential inpatient treatment removes you from triggers and stressors, allowing 
                you to focus entirely on recovery. {cityName}'s licensed programs offer individual 
                therapy, group counseling, medical care, and holistic treatments in a structured, 
                supportive environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Features */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              What to Expect at {cityName} Inpatient Rehab
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive care designed for lasting recovery
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {treatmentFeatures.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border bg-card p-6 text-center hover:shadow-md transition-shadow"
              >
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <feature.icon className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
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
              Program Options in {cityName}, {abbreviation}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {cityName} rehab centers offer various program lengths
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {programTypes.map((program) => (
              <div
                key={program.name}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Home className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{program.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{program.description}</p>
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
              Insurance for Inpatient Rehab in {cityName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {cityName} inpatient facilities accept major insurance plans. The Mental Health 
              Parity Act requires equal coverage for addiction treatment.
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
                Inpatient Rehab in Other {stateName} Cities
              </h2>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {otherCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/residential-inpatient/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-lg border bg-card p-3 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <MapPin className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors">
                    Inpatient Rehab in {city.name}
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
              Connect with a licensed {cityName} inpatient rehab center. Most facilities offer 
              same-day assessments and can help verify your insurance coverage.
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
            <Link to={`/treatment-types/residential-inpatient/${stateSlug}`}>
              <Button variant="outline" size="sm">
                All {stateName} Inpatient
              </Button>
            </Link>
            <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
              <Button variant="outline" size="sm">
                {cityName} Rehab Centers
              </Button>
            </Link>
            <Link to={`/treatment-types/detox-programs/${stateSlug}/${citySlug}`}>
              <Button variant="outline" size="sm">
                Detox in {cityName}
              </Button>
            </Link>
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" size="sm">
                All Inpatient Programs
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default CityInpatientRehab;
