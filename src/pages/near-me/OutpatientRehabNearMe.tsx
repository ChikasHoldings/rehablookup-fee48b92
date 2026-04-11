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
import { ArrowRight, MapPin, Briefcase, Calendar, Clock, Home } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getOutpatientFAQs = (location?: { state: string }) => [
  {
    question: `What is outpatient rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Outpatient rehab${location ? ` in ${location.state}` : ""} allows you to receive addiction treatment while living at home. Programs include Intensive Outpatient Programs (IOP), Partial Hospitalization Programs (PHP), and standard outpatient therapy. Treatment typically involves 9-20+ hours of therapy per week.`,
  },
  {
    question: "What's the difference between IOP and PHP?",
    answer: "Intensive Outpatient Programs (IOP) typically meet 3-5 days per week for 3-4 hours. Partial Hospitalization Programs (PHP) are more intensive, meeting 5-7 days per week for 5-6 hours. PHP provides more structure while still allowing you to return home at night.",
  },
  {
    question: "Is outpatient rehab effective?",
    answer: "Yes, research shows outpatient treatment is highly effective for many people, especially those with mild to moderate addiction, strong support systems, and stable living situations. Success rates are comparable to inpatient when patients are appropriately matched to care level.",
  },
  {
    question: "Can I work while in outpatient rehab?",
    answer: "Yes, that's one of the main benefits of outpatient treatment. Many programs offer evening and weekend sessions to accommodate work and school schedules. This flexibility helps maintain employment and family responsibilities during recovery.",
  },
  {
    question: "Does insurance cover outpatient rehab?",
    answer: "Yes, most insurance plans cover outpatient addiction treatment under mental health parity laws. Coverage typically includes IOP, PHP, individual therapy, group counseling, and medication-assisted treatment. Contact your insurance for specific benefits.",
  },
];

export default function OutpatientRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/outpatient-rehab-near-me",
  });

  const faqs = getOutpatientFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Outpatient Drug Rehabilitation",
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
        title={`Outpatient Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | IOP & PHP Programs`}
        description={`Find outpatient drug and alcohol rehab${stateData ? ` in ${stateData.state}` : " near you"}. IOP, PHP, and flexible treatment programs. Continue working while getting the help you need.`}
        canonical={stateSlug ? `/outpatient-rehab-near-me/${stateSlug}` : "/outpatient-rehab-near-me"}
        keywords={[
          "outpatient rehab near me",
          "IOP near me",
          "intensive outpatient program",
          "PHP treatment",
          "partial hospitalization program",
          "outpatient drug treatment",
          "outpatient alcohol treatment",
          "day treatment program",
          ...(stateData ? [
            `outpatient rehab ${stateData.state}`,
            `IOP ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Outpatient Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find flexible outpatient addiction treatment${stateData ? ` in ${stateData.state}` : " near you"}. IOP and PHP programs let you get help while maintaining work and family responsibilities.`}
        treatmentType="Outpatient Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Outpatient Treatment Benefits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Briefcase className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Keep Working</h3>
                <p className="text-sm text-muted-foreground">Maintain employment with evening and weekend options</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Home className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Live at Home</h3>
                <p className="text-sm text-muted-foreground">Stay with family and practice skills in real life</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Calendar className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Flexible Schedule</h3>
                <p className="text-sm text-muted-foreground">Programs designed around your commitments</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Various Intensities</h3>
                <p className="text-sm text-muted-foreground">From weekly therapy to 20+ hours per week PHP</p>
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
          avgResponseTime: "< 24 hours",
          insuranceAcceptance: 94,
          availableBeds: "Available",
        }}
        treatmentType="Outpatient Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Outpatient Programs {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              IOP, PHP, and flexible outpatient addiction treatment programs.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}&type=Outpatient` : "?type=Outpatient"}`}>
                    <Button variant="outline" size="lg" className="gap-2">
                      View All {facilities.length} Programs
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Outpatient Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/outpatient-rehab-near-me/${state.slug}`}
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
        treatmentType="Outpatient Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
