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
  Calendar,
  MapPin,
  Building2,
} from "lucide-react";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programFeatures = [
  {
    name: "30-Day Program",
    description: "Ideal for those with mild to moderate addiction requiring structured initial care and foundation building.",
    features: ["Medical stabilization", "Therapy introduction", "Recovery planning"],
  },
  {
    name: "60-Day Program",
    description: "Extended treatment for moderate addiction with comprehensive therapy and skill development.",
    features: ["Deeper therapy work", "Relapse prevention", "Life skills training"],
  },
  {
    name: "90-Day Program",
    description: "Intensive long-term care for severe addiction with thorough behavioral restructuring.",
    features: ["Comprehensive healing", "Dual diagnosis treatment", "Aftercare planning"],
  },
  {
    name: "Extended Care",
    description: "Long-term residential treatment for complex cases requiring ongoing structured support.",
    features: ["6-12 month programs", "Sober living transition", "Vocational support"],
  },
];

const dailySchedule = [
  { time: "7:00 AM", activity: "Wake up & Morning meditation", icon: Activity },
  { time: "8:00 AM", activity: "Nutritious breakfast", icon: Home },
  { time: "9:00 AM", activity: "Individual therapy session", icon: Brain },
  { time: "11:00 AM", activity: "Group therapy", icon: Users },
  { time: "12:30 PM", activity: "Lunch & free time", icon: Home },
  { time: "2:00 PM", activity: "Educational workshops", icon: Calendar },
  { time: "4:00 PM", activity: "Recreational activities", icon: Activity },
  { time: "6:00 PM", activity: "Dinner", icon: Home },
  { time: "7:30 PM", activity: "12-step meeting or support group", icon: Users },
  { time: "9:00 PM", activity: "Reflection & rest", icon: Brain },
];

const StateInpatientRehab = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();
  
  const stateData = statesData.find(s => s.slug === stateSlug);
  
  if (!stateData) {
    return <Navigate to="/treatment-types/residential-inpatient" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": `Inpatient Rehab Centers in ${stateName}`,
      "description": `Find residential inpatient rehab centers in ${stateName}. 24/7 care, evidence-based treatment programs with medical supervision.`,
      "url": `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}`,
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
        { "@type": "ListItem", "position": 2, "name": "Treatment Types", "item": "https://rehablookup.com/treatment-types" },
        { "@type": "ListItem", "position": 3, "name": "Residential Inpatient", "item": "https://rehablookup.com/treatment-types/residential-inpatient" },
        { "@type": "ListItem", "position": 4, "name": `${stateName}`, "item": `https://rehablookup.com/treatment-types/residential-inpatient/${stateSlug}` },
      ]
    }
  ];

  return (
    <Layout>
      <SEO
        title={`Inpatient Rehab Centers in ${stateName} | Residential Treatment ${abbreviation}`}
        description={`Find inpatient rehab centers in ${stateName}. 24/7 residential addiction treatment with medical care & therapy. Insurance accepted. Call now.`}
        canonical={`/treatment-types/residential-inpatient/${stateSlug}`}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Residential Inpatient", url: "/treatment-types/residential-inpatient" },
          { name: `${stateName}`, url: `/treatment-types/residential-inpatient/${stateSlug}` },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
        <MedicalPatternBackground />
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Inpatient Rehab", href: "/treatment-types/residential-inpatient" },
              { label: stateName },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Residential Treatment in {abbreviation}</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Inpatient Rehab Centers in {stateName}
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Find residential inpatient addiction treatment programs in {stateName} offering 24/7 care, 
              medical supervision, and evidence-based therapies. {stateName} inpatient rehab centers 
              provide structured environments for lasting recovery from alcohol and drug addiction.
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
              <span>24/7 On-Site Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Why Inpatient in State */}
      <section className="section-padding">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl mb-6">
              Why Choose Inpatient Rehab in {stateName}?
            </h2>
            <div className="prose prose-lg text-muted-foreground">
              <p>
                {stateName} offers accredited residential treatment facilities with experienced clinical 
                teams specializing in addiction medicine. Whether you're seeking help for alcohol addiction, 
                opioid dependence, or polysubstance abuse, {stateName} inpatient centers provide the 
                intensive care necessary for successful recovery.
              </p>
              <p>
                Residential inpatient treatment removes you from triggers and stressors of daily life, 
                allowing you to focus entirely on recovery. {stateName}'s licensed programs offer 
                individual therapy, group counseling, medical care, and holistic treatments in a 
                structured, supportive environment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Program Lengths */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Inpatient Program Options in {stateName}
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              {stateName} rehab centers offer various program lengths based on your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {programFeatures.map((program) => (
              <div
                key={program.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Home className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-lg font-semibold text-foreground mb-1">
                      {program.name}
                    </h3>
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

      {/* Daily Schedule */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Typical Day at {stateName} Inpatient Rehab
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Structured schedules promote healing and build healthy routines
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="space-y-3">
              {dailySchedule.map((item, index) => (
                <div
                  key={index}
                  className="flex items-center gap-4 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-primary">{item.time}</span>
                    <p className="text-foreground">{item.activity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Cities in State */}
      {cities.length > 0 && (
        <section className="bg-secondary/30 section-padding">
          <div className="container">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Inpatient Rehab by City in {stateName}
              </h2>
              <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
                Find residential treatment programs in major {stateName} cities
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/residential-inpatient/${stateSlug}/${city.slug}`}
                  className="group flex items-center gap-3 rounded-xl border bg-card p-4 hover:shadow-md transition-all hover:border-primary/30"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      Inpatient Rehab in {city.name}
                    </h3>
                    <p className="text-sm text-muted-foreground truncate">
                      Residential treatment in {city.name}, {abbreviation}
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
              Insurance Coverage for Inpatient Rehab in {stateName}
            </h2>
            <p className="text-muted-foreground mb-6">
              Most {stateName} inpatient facilities accept major insurance plans including Medicaid, 
              Medicare, and private insurance. The Mental Health Parity Act requires equal coverage 
              for addiction treatment.
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
              Connect with a licensed {stateName} inpatient rehab center. Most facilities offer 
              same-day assessments and can help verify your insurance coverage.
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
                All Rehab Centers in {abbreviation}
              </Button>
            </Link>
            <Link to={`/treatment-types/detox-programs/${stateSlug}`}>
              <Button variant="outline" size="sm" className="gap-2">
                Detox in {abbreviation}
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" size="sm" className="gap-2">
                Outpatient Programs
              </Button>
            </Link>
            <Link to="/treatment-types/dual-diagnosis">
              <Button variant="outline" size="sm" className="gap-2">
                Dual Diagnosis Treatment
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default StateInpatientRehab;