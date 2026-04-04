import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";

const stateCoordinates: Record<string, { lat: number; lng: number; name: string; abbr: string }> = {
  "california": { lat: 36.116203, lng: -119.681564, name: "California", abbr: "CA" },
  "florida": { lat: 27.766279, lng: -81.686783, name: "Florida", abbr: "FL" },
  "new-york": { lat: 42.165726, lng: -74.948051, name: "New York", abbr: "NY" },
  "texas": { lat: 31.054487, lng: -97.563461, name: "Texas", abbr: "TX" },
  "arizona": { lat: 33.729759, lng: -111.431221, name: "Arizona", abbr: "AZ" },
  "colorado": { lat: 39.059811, lng: -105.311104, name: "Colorado", abbr: "CO" },
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
        const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
        const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
        if (bFeatured !== aFeatured) return bFeatured - aFeatured;
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

  const faqs = getOutpatientFAQs(stateData ? { state: stateData.name } : undefined);

  const nearbyStates = useMemo(() => {
    if (!stateData) return [];
    const currentIndex = statesData.findIndex(s => s.slug === stateData.slug);
    return statesData
      .filter((_, i) => Math.abs(i - currentIndex) > 0 && Math.abs(i - currentIndex) <= 3)
      .slice(0, 4)
      .map(s => ({
        name: s.name,
        slug: `/outpatient-near-me/${s.slug}`,
        facilityCount: treatmentCenters.filter(f => 
          f.state.toLowerCase() === s.name.toLowerCase()
        ).length,
      }));
  }, [stateData]);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Outpatient Treatment",
      treatmentSlug: "outpatient",
      location: stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Outpatient Treatment Programs",
      location: stateData 
        ? { state: stateData.name, stateAbbr: stateData.abbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Outpatient Treatment Near Me ${stateData ? `in ${stateData.name}` : ""} | IOP & PHP Programs`}
        description={`Find outpatient addiction treatment near you${stateData ? ` in ${stateData.name}` : ""}. Compare ${facilities.length}+ IOP, PHP, and flexible outpatient programs that fit your schedule.`}
        canonical={stateSlug ? `/outpatient-near-me/${stateSlug}` : "/outpatient-near-me"}
        keywords={[
          "outpatient treatment near me",
          "IOP near me",
          "intensive outpatient program",
          "PHP treatment",
          "flexible rehab programs",
          ...(stateData ? [
            `outpatient treatment ${stateData.name}`,
            `IOP ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Outpatient Near Me", url: "/outpatient-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/outpatient-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Outpatient Treatment Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find flexible outpatient programs${stateData ? ` in ${stateData.name}` : " near you"}. IOP, PHP, and standard outpatient options that let you maintain work and family while recovering.`}
        treatmentType="Outpatient Treatment"
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
          avgResponseTime: "< 1 hour",
          insuranceAcceptance: 95,
          availableBeds: "Available",
        }}
        treatmentType="Outpatient"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Outpatient Programs {stateData ? `in ${stateData.name}` : "Near You"}
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
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
