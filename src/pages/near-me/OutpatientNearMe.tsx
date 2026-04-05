import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";


const getOutpatientFAQs = (location?: { state: string }) => [
  {
    question: `What is outpatient treatment${location ? ` in ${location.state}` : ""}?`,
    answer: `Outpatient treatment${location ? ` in ${location.state}` : ""} allows you to receive addiction therapy while living at home. Programs range from standard outpatient (1-2 sessions/week) to intensive outpatient (IOP) with 9-20 hours weekly.`,
  },
  {
    question: "What's the difference between IOP and PHP?",
    answer: "Intensive Outpatient Programs (IOP) typically involve 9-20 hours of treatment weekly. Partial Hospitalization Programs (PHP) are more intensive at 20-30 hours weekly, serving as a step-down from inpatient care.",
  },
  {
    question: `Can I work during outpatient treatment${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes! Outpatient programs${location ? ` in ${location.state}` : ""} are designed to fit around work, school, and family responsibilities. Many offer evening and weekend sessions for added flexibility.`,
  },
  {
    question: "How long does outpatient treatment last?",
    answer: "Standard outpatient programs typically last 3-6 months, though some continue for a year or more. IOP usually runs 8-12 weeks before transitioning to less intensive support.",
  },
  {
    question: "Is outpatient treatment effective?",
    answer: "Research shows outpatient treatment is highly effective for many people, especially those with stable housing, strong support systems, and mild to moderate addiction. Success rates improve with longer engagement.",
  },
];

export default function OutpatientNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/outpatient-near-me",
  });

  const faqs = getOutpatientFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Outpatient Treatment",
      treatmentSlug: "outpatient",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Outpatient Treatment Programs",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Outpatient Treatment Near Me ${stateData ? `in ${stateData.state}` : ""} | IOP & PHP Programs`}
        description={`Find outpatient addiction treatment near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ IOP, PHP, and flexible outpatient programs that fit your schedule.`}
        canonical={stateSlug ? `/outpatient-near-me/${stateSlug}` : "/outpatient-near-me"}
        keywords={[
          "outpatient treatment near me",
          "IOP near me",
          "intensive outpatient program",
          "PHP treatment",
          "flexible rehab programs",
          ...(stateData ? [
            `outpatient treatment ${stateData.state}`,
            `IOP ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Outpatient Near Me", url: "/outpatient-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/outpatient-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Outpatient Treatment Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find flexible outpatient programs${stateData ? ` in ${stateData.state}` : " near you"}. IOP, PHP, and standard outpatient options that let you maintain work and family while recovering.`}
        treatmentType="Outpatient Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
          : { state: "United States", stateAbbr: "US" }
        }
        nearbyAreas={nearbyStates}
        localStats={{
          avgResponseTime: "< 1 hour",
          insuranceAcceptance: 95,
          availableBeds: "Available",
        }}
        treatmentType="Outpatient"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Outpatient Programs {stateData ? `in ${stateData.state}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length}+ facilities offering flexible IOP, PHP, and outpatient addiction treatment.
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                   <div key={facility.id || facility.name}>
                    <TreatmentCenterCard center={facility as any} />
                  </div>
                ))}
              </div>

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}` : ""}`}>
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

      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Outpatient Treatment by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/outpatient-near-me/${state.slug}`}
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
        treatmentType="Outpatient"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
