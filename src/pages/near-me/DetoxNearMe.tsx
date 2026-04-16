import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getDetoxNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";


export default function DetoxNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/detox-near-me",
  });

  const faqs = getDetoxNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Medical Detox Programs",
      treatmentSlug: "detox",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Medical Detoxification",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Detox Centers Near Me ${stateData ? `in ${stateData.state}` : ""} | Medical Detox`}
        description={`Find medical detox centers near you${stateData ? ` in ${stateData.state}` : ""}. Safe, medically-supervised detoxification for drugs and alcohol. 24/7 care available.`}
        canonical={stateSlug ? `/detox-near-me/${stateSlug}` : "/detox-near-me"}
        keywords={["detox near me", "medical detox", "drug detox centers", "alcohol detox", ...(stateData ? [`detox ${stateData.state}`] : [])]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Detox Near Me", url: "/detox-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/detox-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Detox Centers Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find medically-supervised detox programs${stateData ? ` in ${stateData.state}` : " near you"}. Safe withdrawal management with 24/7 medical care.`}
        treatmentType="Medical Detox"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <LocalSignalsSection
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : { state: "United States", stateAbbr: "US" }}
        nearbyAreas={nearbyStates}
        localStats={{ avgResponseTime: "< 1 hour", insuranceAcceptance: 96, availableBeds: "Call for availability" }}
        treatmentType="Detox"
      />

      {/* Above-fold intro content for SEO */}
      <section className="py-6 bg-muted/30 border-b">
        <div className="container">
          <p className="text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {stateData 
              ? `Looking for medical detox in ${stateData.state}? Browse ${facilities.length > 0 ? facilities.length + "+" : "verified"} verified detoxification centers offering medically-supervised withdrawal management. Most facilities accept major insurance including Aetna, BCBS, Cigna, and United Healthcare.${
                  stateData.state === "California" ? " California offers world-class medical detox programs with holistic approaches." :
                  stateData.state === "Florida" ? " Florida provides year-round detox options in comfortable, therapeutic settings." :
                  stateData.state === "Texas" ? " Texas features comprehensive detox programs across major cities and suburban areas." :
                  stateData.state === "New York" ? " New York offers diverse medical detox options from urban hospitals to private facilities." : ""
                }`
              : "Search our directory of medical detox centers across the United States. Find safe, medically-supervised detoxification programs for drugs and alcohol."
            }
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Detox Centers {stateData ? `in ${stateData.state}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            {facilities.length > 0
              ? `Browse ${facilities.length > 0 ? facilities.length + "+" : "verified"} medically-supervised detox facilities.`
              : "We're expanding our detox network. Browse all centers or get personalized help finding treatment."}
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <>
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />
              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}` : ""}`}>
                    <Button variant="outline" size="lg" className="gap-2">
                      View All {facilities.length} Centers <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">Detox by State</h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link key={state.slug} to={`/detox-near-me/${state.slug}`} className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group">
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-foreground group-hover:text-primary">{state.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <TreatmentFAQSection faqs={faqs} treatmentType="Detox" location={stateData ? { state: stateData.state } : undefined} />
    </Layout>
  );
}
