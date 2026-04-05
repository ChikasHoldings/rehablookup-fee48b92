import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getDrugRehabNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
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

export default function DrugRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/drug-rehab-near-me",
  });

  const faqs = getDrugRehabNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Drug Rehabilitation",
      treatmentSlug: "drug-rehab",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Drug Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Drug Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Find Treatment Centers`}
        description={`Find drug rehabilitation centers near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ verified treatment facilities offering detox, inpatient, and outpatient programs. Free insurance verification.`}
        canonical={stateSlug ? `/drug-rehab-near-me/${stateSlug}` : "/drug-rehab-near-me"}
        keywords={[
          "drug rehab near me",
          "drug rehabilitation centers",
          "addiction treatment near me",
          "substance abuse treatment",
          ...(stateData ? [
            `drug rehab ${stateData.state}`,
            `addiction treatment ${stateData.stateAbbr}`,
            `rehab centers ${stateData.state}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Drug Rehab Near Me", url: "/drug-rehab-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/drug-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Drug Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find verified drug rehabilitation centers${stateData ? ` in ${stateData.state}` : " near you"}. Compare treatment programs, check insurance coverage, and connect with addiction specialists.`}
        treatmentType="Drug Rehabilitation"
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
        treatmentType="Drug Rehab"
      />

      {/* Facility Listings */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground treatment-intro">
              Drug Rehabilitation Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {facilities.length}+ verified treatment facilities offering evidence-based addiction care.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                   <div key={facility.id || facility.name}>
                    <TreatmentCenterCard
                      center={facility as any}
                    />
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

      {/* State Links Section */}
      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Drug Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/drug-rehab-near-me/${state.slug}`}
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

      {/* SEO Internal Linking */}
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
        treatmentType="Drug Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
