import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";
import { useTreatmentCityValidation } from "@/hooks/useTreatmentCityValidation";
import {
  Phone,
  Clock,
  Shield,
  CheckCircle,
  Heart,
  Brain,
  Users,
  Activity,
  MapPin,
  ArrowRight,
} from "lucide-react";

const treatmentApproaches = [
  {
    icon: Brain,
    title: "Medical Detox",
    description: "Safe, medically supervised withdrawal management with 24/7 monitoring for alcohol dependency.",
  },
  {
    icon: Users,
    title: "Group Therapy",
    description: "Peer support groups and 12-step programs including AA meetings and SMART Recovery.",
  },
  {
    icon: Heart,
    title: "Individual Counseling",
    description: "One-on-one therapy sessions with licensed addiction counselors using evidence-based approaches.",
  },
  {
    icon: Activity,
    title: "Medication-Assisted Treatment",
    description: "FDA-approved medications like naltrexone and acamprosate to reduce cravings and prevent relapse.",
  },
];

const warningSignsList = [
  "Drinking alone or in secret",
  "Needing to drink more to feel effects",
  "Experiencing withdrawal symptoms",
  "Neglecting responsibilities due to drinking",
  "Failed attempts to cut back or quit",
  "Continued drinking despite health problems",
];

const CityAlcoholRehab = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();

  const stateData = statesData.find((s) => s.slug === stateSlug);
  const cityData = stateData?.cities.find((c) => c.slug === citySlug);

  if (!stateData || !cityData) {
    return <Navigate to="/treatment-types/alcohol-rehabilitation" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const { name: cityName } = cityData;
  const otherCities = stateData.cities.filter((c) => c.slug !== citySlug).slice(0, 6);

  const { validation } = useTreatmentCityValidation({
    stateName,
    cityName,
    treatmentKeywords: ["alcohol"],
    pageType: "city-treatment",
  });

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Alcohol Rehab Centers in ${cityName}, ${abbreviation}`,
      description: `Find alcohol addiction treatment centers in ${cityName}, ${stateName}. Compare detox, inpatient, and outpatient alcohol rehab programs.`,
      url: `https://rehablookup.com/treatment-types/alcohol-rehabilitation/${stateSlug}/${citySlug}`,
      mainContentOfPage: {
        "@type": "WebPageElement",
        about: {
          "@type": "MedicalCondition",
          name: "Alcohol Use Disorder",
        },
      },
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Alcohol Rehab Centers in ${cityName}, ${abbreviation} | Find Treatment`}
        description={`Find alcohol addiction treatment centers in ${cityName}, ${stateName}. Compare detox, inpatient, outpatient alcohol rehab programs with insurance verification.`}
        canonical={`/treatment-types/alcohol-rehabilitation/${stateSlug}/${citySlug}`}
        noindex={!validation.shouldIndex}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Alcohol Rehab", href: "/treatment-types/alcohol-rehabilitation" },
              { label: stateName, href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
              { label: cityName },
            ]}
          />

          <div className="flex items-center gap-2 text-white/80 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{cityName}, {abbreviation}</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Alcohol Rehab Centers in {cityName}, {abbreviation}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-6">
            Find comprehensive alcohol addiction treatment programs in {cityName}. From medical detox to long-term recovery support, 
            our verified facilities offer evidence-based care tailored to your needs.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers">
                <Phone className="mr-2 h-4 w-4" />
                Find Treatment
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                Browse {cityName} Centers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b bg-muted/30 py-4">
        <div className="container">
          <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-primary" />
              <span>Licensed Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-primary" />
              <span>24/7 Admissions</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-primary" />
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
        treatmentFilter={["alcohol"]}
        heading={`Alcohol Rehab in ${cityName}, ${abbreviation}`}
        subheading={`Browse verified alcohol treatment facilities in ${cityName}, ${stateName}`}
      />


      {/* Warning Signs Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Signs You May Need Alcohol Rehab in {cityName}
            </h2>
            <p className="text-muted-foreground">
              Alcohol use disorder affects millions of Americans. Recognizing these warning signs is the first step toward recovery.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {warningSignsList.map((sign, index) => (
              <div key={index} className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <span className="text-sm">{sign}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Approaches */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Alcohol Treatment Approaches in {cityName}
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {treatmentApproaches.map((approach, index) => (
              <div key={index} className="bg-background rounded-xl p-6 border shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <approach.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{approach.title}</h3>
                    <p className="text-sm text-muted-foreground">{approach.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other Cities */}
      {otherCities.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Alcohol Rehab in Other {stateName} Cities
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {otherCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/alcohol-rehabilitation/${stateSlug}/${city.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center"
                >
                  <span className="font-medium text-sm">{city.name}</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button asChild variant="outline">
                <Link to={`/treatment-types/alcohol-rehabilitation/${stateSlug}`}>
                  View All {stateName} Locations
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Start Your Recovery Journey in {cityName} Today
          </h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our treatment specialists are available 24/7 to help you find the right alcohol rehab program. 
            Insurance verification is free and confidential.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg" variant="secondary">
              <Link to="/rehab-centers">
                <Phone className="mr-2 h-4 w-4" />
                Find Treatment
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
              <Link to={`/rehab-centers/${stateSlug}/${citySlug}`}>
                Browse {cityName} Centers
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <RelatedLinksSection
        treatmentLinks={[
          { title: "Detox Programs", href: `/treatment-types/detox-programs/${stateSlug}/${citySlug}` },
          { title: "Inpatient Rehab", href: `/treatment-types/residential-inpatient/${stateSlug}/${citySlug}` },
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}/${citySlug}` },
          { title: "Dual Diagnosis", href: `/treatment-types/dual-diagnosis-treatment/${stateSlug}/${citySlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${cityName}`, href: `/rehab-centers/${stateSlug}/${citySlug}` },
          { title: `More ${stateName} Cities`, href: `/rehab-centers/${stateSlug}` },
        ]}
        insuranceLinks={[
          { title: "Insurance Guide", href: "/insurance" },
          { title: "Verify Coverage", href: "/concierge" },
        ]}
      />
    </Layout>
  );
};

export default CityAlcoholRehab;
