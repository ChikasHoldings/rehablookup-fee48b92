import { useParams, Navigate, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { statesData, getNearbyStates } from "@/data/locationSeoData";
import { RelatedLinksSection } from "@/components/seo/RelatedLinksSection";
import {
  Phone,
  Clock,
  Shield,
  CheckCircle,
  ChevronRight,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { StateFacilitiesSection } from "@/components/seo/StateFacilitiesSection";

const StateDrugAddiction = () => {
  const { stateSlug } = useParams<{ stateSlug: string }>();

  const stateData = statesData.find((s) => s.slug === stateSlug);

  if (!stateData) {
    return <Navigate to="/treatment-types/drug-addiction" replace />;
  }

  const { name: stateName, abbreviation, cities } = stateData;
  const nearbyStates = getNearbyStates(stateSlug!, 4);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      name: `Drug Addiction Treatment in ${stateName}`,
      description: `Find drug addiction treatment centers in ${stateName}. Compare detox, inpatient, and outpatient drug rehab programs across the state.`,
      url: `https://rehablookup.com/treatment-types/drug-addiction/${stateSlug}`,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://rehablookup.com/" },
        { "@type": "ListItem", position: 2, name: "Treatment Types", item: "https://rehablookup.com/treatment-types" },
        { "@type": "ListItem", position: 3, name: "Drug Addiction", item: "https://rehablookup.com/treatment-types/drug-addiction" },
        { "@type": "ListItem", position: 4, name: stateName, item: `https://rehablookup.com/treatment-types/drug-addiction/${stateSlug}` },
      ],
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Drug Addiction Treatment in ${stateName} | Find Rehab Near You`}
        description={`Find drug addiction treatment centers in ${stateName}. Compare detox, inpatient, and outpatient drug rehab programs with insurance verification.`}
        canonical={`/treatment-types/drug-addiction/${stateSlug}`}
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
              { label: "Drug Addiction", href: "/treatment-types/drug-addiction" },
              { label: stateName },
            ]}
          /><div className="flex items-center gap-2 text-white/80 mb-3">
            <MapPin className="h-4 w-4" />
            <span className="text-sm">{stateName}</span>
          </div>

          <h1 className="text-2xl md:text-4xl font-bold text-white mb-4">
            Drug Addiction Treatment in {stateName}
          </h1>
          <p className="text-white/85 text-lg max-w-2xl mb-6">
            Find comprehensive drug addiction treatment programs across {stateName}. From medical detox to long-term 
            recovery support, our verified facilities offer personalized care for all substances.
          </p>

          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link to="/concierge">
                <Phone className="mr-2 h-4 w-4" />
                Find Treatment
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link to={`/rehab-centers/${stateSlug}`}>
                Browse {stateName} Centers
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <StateFacilitiesSection
        stateName={stateName}
        stateSlug={stateSlug!}
        abbreviation={abbreviation}
        treatmentFilter={["drug", "substance", "opioid", "heroin", "cocaine", "meth"]}
        heading={`Drug Rehab Centers in ${stateName}`}
        subheading={`Browse verified drug addiction treatment facilities in ${stateName}`}
      />


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

      {/* Cities Grid */}
      <section className="py-12 md:py-16">
        <div className="container">
          <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
            Find Drug Rehab by City in {stateName}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {cities.map((city) => (
              <Link
                key={city.slug}
                to={`/treatment-types/drug-addiction/${stateSlug}/${city.slug}`}
                className="group p-5 rounded-xl border bg-background hover:border-primary hover:shadow-lg transition-all"
              >
                <h3 className="font-semibold group-hover:text-primary transition-colors">{city.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">Drug rehab programs</p>
                <div className="mt-3 flex items-center text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View centers</span>
                  <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Info */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">
              About Drug Treatment in {stateName}
            </h2>
            <div className="prose prose-lg mx-auto">
              <p>
                {stateName} offers a wide range of drug addiction treatment options for individuals struggling with 
                substance use disorders. From opioid addiction to stimulant dependency, facilities across the state 
                provide specialized, evidence-based care.
              </p>
              <h3>Substances Commonly Treated</h3>
              <ul>
                <li><strong>Opioids:</strong> Heroin, fentanyl, prescription painkillers</li>
                <li><strong>Stimulants:</strong> Cocaine, methamphetamine, prescription stimulants</li>
                <li><strong>Benzodiazepines:</strong> Xanax, Valium, Klonopin</li>
                <li><strong>Cannabis:</strong> Marijuana dependency</li>
                <li><strong>Prescription Drugs:</strong> Various medications with addiction potential</li>
              </ul>
              <h3>Treatment Options Available</h3>
              <ul>
                <li><strong>Medical Detox:</strong> Safe withdrawal management with medical supervision</li>
                <li><strong>Inpatient Rehab:</strong> 24/7 residential care with intensive therapy</li>
                <li><strong>Medication-Assisted Treatment:</strong> Suboxone, Vivitrol, and methadone programs</li>
                <li><strong>Outpatient Programs:</strong> Flexible treatment maintaining daily life</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Nearby States */}
      {nearbyStates.length > 0 && (
        <section className="py-12 md:py-16">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6 text-center">
              Drug Rehab in Nearby States
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
              {nearbyStates.map((state) => (
                <Link
                  key={state.slug}
                  to={`/treatment-types/drug-addiction/${state.slug}`}
                  className="p-4 rounded-lg border bg-background hover:border-primary hover:shadow-md transition-all text-center"
                >
                  <span className="font-medium">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Break Free From Addiction in {stateName}
          </h2>
          <p className="text-primary-foreground/85 max-w-2xl mx-auto mb-6">
            Our treatment specialists are available 24/7 to help you find the right drug rehab program. 
            Insurance verification is free and confidential.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link to="/concierge">
              <Phone className="mr-2 h-4 w-4" />
              Find Treatment
            </Link>
          </Button>
        </div>
      </section>

      {/* Related Links */}
      <RelatedLinksSection
        treatmentLinks={[
          { title: "Detox Programs", href: `/treatment-types/detox-programs/${stateSlug}` },
          { title: "Inpatient Rehab", href: `/treatment-types/residential-inpatient/${stateSlug}` },
          { title: "Outpatient Programs", href: `/treatment-types/outpatient-programs/${stateSlug}` },
          { title: "Alcohol Rehab", href: `/treatment-types/alcohol-rehabilitation/${stateSlug}` },
        ]}
        locationLinks={[
          { title: `All Rehabs in ${stateName}`, href: `/rehab-centers/${stateSlug}` },
        ]}
        insuranceLinks={[
          { title: "Insurance Guide", href: "/insurance" },
        ]}
      />
    </Layout>
  );
};

export default StateDrugAddiction;
