import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, DollarSign, Heart, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getFreeRehabFAQs = (location?: { state: string }) => [
  {
    question: `Are there really free rehab centers${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes, free and low-cost rehab centers exist${location ? ` in ${location.state}` : " across the United States"}. Options include state-funded programs, sliding scale facilities, Medicaid-covered treatment, nonprofit organizations, faith-based programs, and SAMHSA-funded facilities. Many centers offer free treatment for those who qualify.`,
  },
  {
    question: "How do I qualify for free addiction treatment?",
    answer: "Qualification typically depends on income level, insurance status (Medicaid/Medicare), veteran status, or meeting specific program criteria. Many state-funded programs prioritize those without insurance or with limited income. Contact facilities directly to discuss your situation.",
  },
  {
    question: "What types of free rehab programs are available?",
    answer: "Free programs include detox, inpatient/residential treatment, outpatient programs (IOP/PHP), medication-assisted treatment (MAT), support groups like AA/NA, sober living houses, and court-mandated treatment programs.",
  },
  {
    question: `Does Medicaid cover rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes, Medicaid covers addiction treatment${location ? ` in ${location.state}` : ""}. The Mental Health Parity and Addiction Equity Act requires Medicaid to cover substance abuse treatment similarly to other medical conditions. Coverage includes detox, inpatient care, outpatient programs, and medications.`,
  },
  {
    question: "What are sliding scale rehab programs?",
    answer: "Sliding scale programs adjust costs based on your income and ability to pay. Some facilities offer treatment for as little as $0 for qualifying individuals. This makes quality addiction treatment accessible regardless of financial situation.",
  },
];

export default function FreeRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/free-rehab-near-me",
  });

  
  const faqs = getFreeRehabFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Free Drug Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Free Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | No-Cost Addiction Treatment`}
        description={`Find free and low-cost drug and alcohol rehab centers${stateData ? ` in ${stateData.state}` : " near you"}. State-funded programs, Medicaid-covered treatment, sliding scale options. Get help today.`}
        canonical={stateSlug ? `/free-rehab-near-me/${stateSlug}` : "/free-rehab-near-me"}
        keywords={[
          "free rehab near me",
          "free drug rehab",
          "free alcohol treatment",
          "low cost rehab",
          "sliding scale rehab",
          "medicaid rehab",
          "state funded rehab",
          "no cost addiction treatment",
          "free detox near me",
          ...(stateData ? [
            `free rehab ${stateData.state}`,
            `medicaid rehab ${stateData.stateAbbr}`,
            `state funded treatment ${stateData.state}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Free Rehab Near Me", url: "/free-rehab-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/free-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Free Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find free and low-cost addiction treatment centers${stateData ? ` in ${stateData.state}` : " near you"}. State-funded programs, Medicaid-covered treatment, and sliding scale options available.`}
        treatmentType="Free Addiction Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Free Treatment Options */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Types of Free & Low-Cost Treatment
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">State-Funded Programs</h3>
                <p className="text-sm text-muted-foreground">Government-subsidized treatment for qualifying residents</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Medicaid/Medicare</h3>
                <p className="text-sm text-muted-foreground">Insurance-covered treatment at no out-of-pocket cost</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Nonprofit & Faith-Based</h3>
                <p className="text-sm text-muted-foreground">Community organizations offering free recovery programs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Sliding Scale</h3>
                <p className="text-sm text-muted-foreground">Pay based on your income and ability to afford treatment</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
          : { state: "United States", stateAbbr: "US" }
        }
        nearbyAreas={[]}
        localStats={{
          avgResponseTime: "< 2 hours",
          insuranceAcceptance: 94,
          availableBeds: "Limited",
        }}
        treatmentType="Free Rehab"
      />

      {/* Facility Listings */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Free & Low-Cost Treatment Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse facilities accepting Medicaid, Medicare, and offering sliding scale payment options.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}&insurance=Medicaid` : "?insurance=Medicaid"}`}>
                    <Button variant="outline" size="lg" className="gap-2">
                      View All {facilities.length} Centers
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* State Links */}
      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Free Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/free-rehab-near-me/${state.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {state.name}
                  </span>
                </Link>
              ))}
            </div>
            <div className="mt-6 text-center">
              <Link to="/rehab-centers">
                <Button variant="outline" className="gap-2">
                  View All 50 States
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      )}

      <TreatmentFAQSection
        faqs={faqs}
        treatmentType="Free Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
