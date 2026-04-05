import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getDualDiagnosisNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";


export default function DualDiagnosisNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/dual-diagnosis-near-me",
  });

  const faqs = getDualDiagnosisNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Dual Diagnosis Treatment",
      treatmentSlug: "dual-diagnosis",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Dual Diagnosis Treatment Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Dual Diagnosis Treatment Near Me ${stateData ? `in ${stateData.state}` : ""} | Co-Occurring Disorders`}
        description={`Find dual diagnosis treatment centers near you${stateData ? ` in ${stateData.state}` : ""}. Integrated care for addiction and mental health disorders at ${facilities.length}+ verified facilities.`}
        canonical={stateSlug ? `/dual-diagnosis-near-me/${stateSlug}` : "/dual-diagnosis-near-me"}
        keywords={[
          "dual diagnosis treatment near me",
          "co-occurring disorders treatment",
          "mental health and addiction treatment",
          "integrated treatment programs",
          ...(stateData ? [
            `dual diagnosis ${stateData.state}`,
            `co-occurring disorders ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Dual Diagnosis Near Me", url: "/dual-diagnosis-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/dual-diagnosis-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Dual Diagnosis Treatment Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find integrated treatment for addiction and mental health${stateData ? ` in ${stateData.state}` : " near you"}. Expert care for anxiety, depression, PTSD, and substance use disorders.`}
        treatmentType="Dual Diagnosis Treatment"
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
          avgResponseTime: "< 3 hours",
          insuranceAcceptance: 89,
          availableBeds: "Limited",
        }}
        treatmentType="Dual Diagnosis"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Dual Diagnosis Centers {stateData ? `in ${stateData.state}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length}+ facilities offering integrated mental health and addiction treatment.
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
              Dual Diagnosis Treatment by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/dual-diagnosis-near-me/${state.slug}`}
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
        treatmentType="Dual Diagnosis"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
