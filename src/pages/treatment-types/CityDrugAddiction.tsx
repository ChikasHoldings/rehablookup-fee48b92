import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import {
  Phone,
  Clock,
  Shield,
  CheckCircle,
  Heart,
  Brain,
  Users,
  Pill,
  Activity,
  ChevronRight,
  MapPin,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";

const substancesTreated = [
  { name: "Opioids", description: "Heroin, fentanyl, prescription painkillers (oxycodone, hydrocodone)" },
  { name: "Stimulants", description: "Cocaine, methamphetamine, prescription stimulants (Adderall)" },
  { name: "Benzodiazepines", description: "Xanax, Valium, Klonopin, Ativan" },
  { name: "Cannabis", description: "Marijuana dependency and related disorders" },
  { name: "Prescription Drugs", description: "Pain medications, sleep aids, anti-anxiety medications" },
  { name: "Synthetic Drugs", description: "K2, spice, bath salts, and other designer drugs" },
];

const treatmentModalities = [
  {
    icon: Brain,
    title: "Cognitive Behavioral Therapy",
    description: "Evidence-based therapy to identify and change negative thought patterns and behaviors related to drug use.",
  },
  {
    icon: Pill,
    title: "Medication-Assisted Treatment",
    description: "FDA-approved medications like Suboxone, Vivitrol, and methadone for opioid addiction recovery.",
  },
  {
    icon: Users,
    title: "Group & Family Therapy",
    description: "Supportive group sessions and family involvement to rebuild relationships and support networks.",
  },
  {
    icon: Activity,
    title: "Holistic Therapies",
    description: "Yoga, meditation, art therapy, and fitness programs to support whole-person healing.",
  },
];

const CityDrugAddiction = () => {
  const { stateSlug, citySlug } = useParams<{ stateSlug: string; citySlug: string }>();

  const stateData = statesData.find((s) => s.slug === stateSlug);
  const cityData = stateData?.cities.find((c) => c.slug === citySlug);

  if (!stateData || !cityData) {
    return <Navigate to="/treatment-types/drug-addiction-treatment" replace />;
  }

  const { name: stateName, abbreviation } = stateData;
  const { name: cityName } = cityData;
  const otherCities = stateData.cities.filter((c) => c.slug !== citySlug).slice(0, 6);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Drug Addiction Treatment in ${cityName}, ${abbreviation}`,
      description: `Find drug addiction treatment centers in ${cityName}, ${stateName}. Compare detox, inpatient, and outpatient drug rehab programs.`,
      url: `https://rehablookup.com/treatment-types/drug-addiction/${stateSlug}/${citySlug}`,
      mainContentOfPage: {
        "@type": "WebPageElement",
        about: {
          "@type": "MedicalCondition",
          name: "Substance Use Disorder",
        },
      },
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Drug Addiction Treatment in ${cityName}, ${abbreviation} | Find Rehab`}
        description={`Find drug addiction treatment centers in ${cityName}, ${stateName}. Compare detox, inpatient, outpatient drug rehab programs with insurance verification.`}
        canonical={`/treatment-types/drug-addiction/${stateSlug}/${citySlug}`}
        structuredData={structuredData}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary/90 py-12 md:py-16">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
        <div className="container relative z-10">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Drug Addiction", href: "/treatment-types/drug-addiction" },
              { label: stateName, href: `/treatment-types/drug-addiction/${stateSlug}` },
              { label: cityName },
            ]}
          /><div className="flex items-center gap-2 text-white/80 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{cityName}, {abbreviation}</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Drug Addiction Treatment in {cityName}, {abbreviation}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-6">
            Find comprehensive drug addiction treatment programs in {cityName}. From medical detox to long-term recovery support, 
            our verified facilities offer personalized care for all substance use disorders.
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

      {/* Substances Treated */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Substances Treated in {cityName}
            </h2>
            <p className="text-muted-foreground">
              {cityName} treatment centers provide specialized programs for various substance use disorders.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {substancesTreated.map((substance, index) => (
              <div key={index} className="p-5 rounded-lg bg-muted/50 border">
                <h3 className="font-semibold mb-2 flex items-center gap-2">
                  <Pill className="h-4 w-4 text-primary" />
                  {substance.name}
                </h3>
                <p className="text-sm text-muted-foreground">{substance.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Modalities */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-10">
            Evidence-Based Treatment Approaches
          </h2>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {treatmentModalities.map((modality, index) => (
              <div key={index} className="bg-background rounded-xl p-6 border shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <modality.icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">{modality.title}</h3>
                    <p className="text-sm text-muted-foreground">{modality.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection
        stateName={stateName}
        stateSlug={stateSlug!}
        abbreviation={abbreviation}
        treatmentFilter={["drug", "substance", "opioid", "heroin"]}
        heading={`Drug Rehab in ${cityName}, ${abbreviation}`}
        subheading={`Browse verified drug treatment facilities in ${cityName}, ${stateName}`}
      />


      {/* Why Choose Section */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              Why Choose Drug Rehab in {cityName}?
            </h2>
            <div className="prose prose-lg mx-auto">
              <p>
                {cityName}, {stateName} offers a supportive environment for addiction recovery with access to 
                experienced treatment professionals and comprehensive care programs. Local facilities provide:
              </p>
              <ul>
                <li><strong>Personalized treatment plans</strong> tailored to your specific substance use history</li>
                <li><strong>Medical detox services</strong> with 24/7 supervision and withdrawal management</li>
                <li><strong>Multiple levels of care</strong> from intensive inpatient to flexible outpatient programs</li>
                <li><strong>Aftercare planning</strong> to support your continued recovery after treatment</li>
                <li><strong>Insurance verification</strong> and financing options to make treatment accessible</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Other Cities */}
      {otherCities.length > 0 && (
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Drug Rehab in Other {stateName} Cities
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {otherCities.map((city) => (
                <Link
                  key={city.slug}
                  to={`/treatment-types/drug-addiction/${stateSlug}/${city.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center"
                >
                  <span className="font-medium text-sm">{city.name}</span>
                </Link>
              ))}
            </div>
            <div className="text-center mt-6">
              <Button asChild variant="outline">
                <Link to={`/treatment-types/drug-addiction/${stateSlug}`}>
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
            Break Free From Addiction in {cityName}
          </h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our treatment specialists are available 24/7 to help you find the right drug rehab program. 
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
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}/${citySlug}` },
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

export default CityDrugAddiction;
