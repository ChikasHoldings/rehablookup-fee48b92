import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getAlcoholRehabNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

// State coordinates for geolocation matching
const stateCoordinates: Record<string, { lat: number; lng: number; name: string; abbr: string }> = {
  "alabama": { lat: 32.806671, lng: -86.791130, name: "Alabama", abbr: "AL" },
  "california": { lat: 36.116203, lng: -119.681564, name: "California", abbr: "CA" },
  "florida": { lat: 27.766279, lng: -81.686783, name: "Florida", abbr: "FL" },
  "new-york": { lat: 42.165726, lng: -74.948051, name: "New York", abbr: "NY" },
  "texas": { lat: 31.054487, lng: -97.563461, name: "Texas", abbr: "TX" },
};

function getClosestState(lat: number, lng: number): { name: string; abbr: string; slug: string } | null {
  let closest = null;
  let minDistance = Infinity;

  for (const [slug, coords] of Object.entries(stateCoordinates)) {
    const distance = Math.sqrt(
      Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2)
    );
    if (distance < minDistance) {
      minDistance = distance;
      closest = { name: coords.name, abbr: coords.abbr, slug };
    }
  }

  return closest;
}

export default function AlcoholRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();
  const [userLocation, setUserLocation] = useState<{
    name: string;
    abbr: string;
    slug: string;
  } | null>(null);

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const stateData = useMemo(() => {
    if (stateSlug) {
      const state = statesData.find(s => s.slug === stateSlug);
      return state ? { name: state.name, abbr: state.abbreviation, slug: state.slug } : null;
    }
    return userLocation;
  }, [stateSlug, userLocation]);

  const facilities = useMemo(() => {
    const allFacilities = [...treatmentCenters, ...approvedFacilities];
    
    if (!stateData) return allFacilities.slice(0, 20);

    return allFacilities
      .filter(f => 
        f.state.toLowerCase() === stateData.name.toLowerCase() ||
        f.state.toLowerCase() === stateData.abbr.toLowerCase()
      )
      .sort((a, b) => {
        // Sort Pro subscribers first, then by rating
        const aIsPro = (a as any).hasProSubscription ? 1 : 0;
        const bIsPro = (b as any).hasProSubscription ? 1 : 0;
        if (bIsPro !== aIsPro) return bIsPro - aIsPro;
        return b.rating - a.rating;
      });
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const closest = getClosestState(position.coords.latitude, position.coords.longitude);
          if (closest) setUserLocation(closest);
        },
        () => {},
        { timeout: 10000 }
      );
    }
  }, [stateSlug, userLocation]);

  const faqs = getAlcoholRehabNearMeFAQs(stateData ? { state: stateData.name } : undefined);

  const nearbyStates = useMemo(() => {
    if (!stateData) return [];
    const currentIndex = statesData.findIndex(s => s.slug === stateData.slug);
    return statesData
      .filter((_, i) => Math.abs(i - currentIndex) > 0 && Math.abs(i - currentIndex) <= 3)
      .slice(0, 4)
      .map(s => ({
        name: s.name,
        slug: `/alcohol-rehab-near-me/${s.slug}`,
        facilityCount: treatmentCenters.filter(f => 
          f.state.toLowerCase() === s.name.toLowerCase()
        ).length,
      }));
  }, [stateData]);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Alcohol Rehabilitation",
      treatmentSlug: "alcohol-rehab",
      location: stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Alcohol Treatment Centers",
      location: stateData 
        ? { state: stateData.name, stateAbbr: stateData.abbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Alcohol Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Treatment Centers`}
        description={`Find alcohol rehabilitation centers near you${stateData ? ` in ${stateData.name}` : ""}. Compare ${facilities.length}+ verified treatment facilities offering detox, inpatient, and outpatient alcohol treatment programs.`}
        canonical={stateSlug ? `/alcohol-rehab-near-me/${stateSlug}` : "/alcohol-rehab-near-me"}
        keywords={[
          "alcohol rehab near me",
          "alcohol treatment centers",
          "alcohol detox near me",
          "alcoholism treatment",
          ...(stateData ? [
            `alcohol rehab ${stateData.name}`,
            `alcohol treatment ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Alcohol Rehab Near Me", url: "/alcohol-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/alcohol-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Alcohol Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find verified alcohol treatment centers${stateData ? ` in ${stateData.name}` : " near you"}. Get help with alcohol addiction through medical detox, residential, and outpatient programs.`}
        treatmentType="Alcohol Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.name, stateAbbr: stateData.abbr }
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
              ? `Searching for alcohol rehab in ${stateData.name}? Our directory features ${facilities.length}+ verified treatment centers offering detox, inpatient, and outpatient programs. Many facilities accept major insurance including Aetna, BCBS, Cigna, and United Healthcare.${
                  stateData.name === "California" ? " California is home to some of the nation's leading alcohol addiction treatment programs." :
                  stateData.name === "Florida" ? " Florida offers year-round alcohol treatment options in supportive recovery environments." :
                  stateData.name === "Texas" ? " Texas provides comprehensive alcohol treatment options across major metropolitan areas." :
                  stateData.name === "New York" ? " New York offers diverse alcohol rehabilitation programs from urban centers to serene retreats." : ""
                }`
              : "Search our directory of alcohol treatment centers across the United States. Compare programs, check insurance coverage, and find the right recovery path for alcohol addiction."
            }
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Alcohol Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length}+ verified facilities offering alcohol addiction treatment.
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                  
                    <TreatmentCenterCard center={facility as any} />
                  </div>
                ))}
              </div>
              {/* Scroll indicator for mobile */}
              <div className="flex justify-center gap-1.5 mt-3 md:hidden">
                <span className="text-[10px] text-muted-foreground/70">← Swipe →</span>
              </div>

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.name}` : ""}`}>
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
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
