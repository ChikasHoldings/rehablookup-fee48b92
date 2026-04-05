import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  insuranceLinks, 
  resourceLinks 
} from "@/components/seo/InternalLinkingSection";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { getRehabNearMeFAQs } from "@/components/seo/NearMeFAQData";

export default function RehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/rehab-near-me",
  });

  const faqs = getRehabNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Rehabilitation Centers",
      treatmentSlug: "rehab",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Find Treatment Centers`}
        description={`Find rehabilitation centers near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ verified treatment facilities. Free insurance verification.`}
        canonical={stateSlug ? `/rehab-near-me/${stateSlug}` : "/rehab-near-me"}
        keywords={[
          "rehab near me",
          "rehab centers near me",
          "addiction treatment near me",
          "substance abuse treatment near me",
          ...(stateData ? [
            `rehab ${stateData.state}`,
            `rehab ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Rehab Near Me", url: "/rehab-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find verified addiction treatment centers${stateData ? ` in ${stateData.state}` : " near you"}. Search verified rehab centers near you offering detox, inpatient, outpatient, and specialty addiction treatment programs.`}
        treatmentType="Rehabilitation Centers"
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
          insuranceAcceptance: 94,
          availableBeds: "Limited",
        }}
        treatmentType="Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground treatment-intro">
              Rehab Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {facilities.length}+ verified treatment facilities offering evidence-based care.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
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
              Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/rehab-near-me/${state.slug}`}
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

      <InternalLinkingSection
        title="Related Resources"
        description="Explore treatment types, insurance coverage, and recovery guides"
        variant="grid"
        groups={[
          { title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) },
          { title: "Insurance Coverage", links: insuranceLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

      <TreatmentFAQSection
        faqs={faqs}
        treatmentType="Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
