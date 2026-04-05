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
import { getPHPNearMeFAQs } from "@/components/seo/NearMeFAQData";

export default function PHPNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/php-near-me",
  });

  const faqs = getPHPNearMeFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Partial Hospitalization Programs",
      treatmentSlug: "php",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Partial Hospitalization Programs",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Partial Hospitalization (PHP) Near Me ${stateData ? `in ${stateData.state}` : ""} | Find Treatment Centers`}
        description={`Find partial hospitalization programs (PHP) near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ verified treatment facilities. Free insurance verification.`}
        canonical={stateSlug ? `/php-near-me/${stateSlug}` : "/php-near-me"}
        keywords={[
          "php near me",
          "partial hospitalization program near me",
          "day treatment programs",
          "php addiction treatment",
          ...(stateData ? [
            `partial hospitalization (php) ${stateData.state}`,
            `php ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Partial Hospitalization (PHP) Near Me", url: "/php-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/php-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Partial Hospitalization (PHP) Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find verified partial hospitalization treatment programs${stateData ? ` in ${stateData.state}` : " near you"}. Find PHP day treatment programs offering 5-7 days per week of structured clinical care without overnight stays.`}
        treatmentType="Partial Hospitalization Programs"
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
        treatmentType="Partial Hospitalization (PHP)"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground treatment-intro">
              Partial Hospitalization Programs (PHP) {stateData ? `in ${stateData.state}` : "Near You"}
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
              Partial Hospitalization (PHP) by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/php-near-me/${state.slug}`}
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
        treatmentType="Partial Hospitalization (PHP)"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
