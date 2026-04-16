import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getAlcoholRehabNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";


export default function AlcoholRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/alcohol-rehab-near-me",
  });

  const faqs = getAlcoholRehabNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Alcohol Rehabilitation",
      treatmentSlug: "alcohol-rehab",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Alcohol Treatment Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Alcohol Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Treatment Centers`}
        description={`Find alcohol rehabilitation centers near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ verified treatment facilities offering detox, inpatient, and outpatient alcohol treatment programs.`}
        canonical={stateSlug ? `/alcohol-rehab-near-me/${stateSlug}` : "/alcohol-rehab-near-me"}
        keywords={[
          "alcohol rehab near me",
          "alcohol treatment centers",
          "alcohol detox near me",
          "alcoholism treatment",
          ...(stateData ? [
            `alcohol rehab ${stateData.state}`,
            `alcohol treatment ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Alcohol Rehab Near Me", url: "/alcohol-rehab-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/alcohol-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Alcohol Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find verified alcohol treatment centers${stateData ? ` in ${stateData.state}` : " near you"}. Get help with alcohol addiction through medical detox, residential, and outpatient programs.`}
        treatmentType="Alcohol Treatment"
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
          avgResponseTime: "< 2 hours",
          insuranceAcceptance: 92,
          availableBeds: "Limited",
        }}
        treatmentType="Alcohol Rehab"
      />

      {/* Above-fold intro content for SEO */}
      <section className="py-6 bg-muted/30 border-b">
        <div className="container">
          <p className="text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {stateData 
              ? `Searching for alcohol rehab in ${stateData.state}? Our directory features ${facilities.length}+ verified treatment centers offering detox, inpatient, and outpatient programs. Many facilities accept major insurance including Aetna, BCBS, Cigna, and United Healthcare.${
                  stateData.state === "California" ? " California is home to some of the nation's leading alcohol addiction treatment programs." :
                  stateData.state === "Florida" ? " Florida offers year-round alcohol treatment options in supportive recovery environments." :
                  stateData.state === "Texas" ? " Texas provides comprehensive alcohol treatment options across major metropolitan areas." :
                  stateData.state === "New York" ? " New York offers diverse alcohol rehabilitation programs from urban centers to serene retreats." : ""
                }`
              : "Search our directory of alcohol treatment centers across the United States. Compare programs, check insurance coverage, and find the right recovery path for alcohol addiction."
            }
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Alcohol Treatment Centers {stateData ? `in ${stateData.state}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length > 0 ? `${facilities.length}+` : ""} verified facilities offering alcohol addiction treatment.
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />

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
              Alcohol Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/alcohol-rehab-near-me/${state.slug}`}
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
        treatmentType="Alcohol Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
