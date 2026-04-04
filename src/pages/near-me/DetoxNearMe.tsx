import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getDetoxNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { FacilityShowcaseGrid } from "@/components/facility/FacilityShowcaseGrid";
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
};

function getClosestState(lat: number, lng: number) {
  let closest = null;
  let minDistance = Infinity;

  for (const [slug, coords] of Object.entries(stateCoordinates)) {
    const distance = Math.sqrt(Math.pow(lat - coords.lat, 2) + Math.pow(lng - coords.lng, 2));
    if (distance < minDistance) {
      minDistance = distance;
      closest = { name: coords.name, abbr: coords.abbr, slug };
    }
  }
  return closest;
}

export default function DetoxNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();
  const [userLocation, setUserLocation] = useState<{ name: string; abbr: string; slug: string } | null>(null);

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  const stateData = useMemo(() => {
    if (stateSlug) {
      const state = statesData.find(s => s.slug === stateSlug);
      return state ? { name: state.name, abbr: state.abbreviation, slug: state.slug } : null;
    }
    return userLocation;
  }, [stateSlug, userLocation]);

  const facilities = useMemo(() => {
    const all = [...treatmentCenters, ...approvedFacilities];
    if (!stateData) return all.slice(0, 20);

    return all
      .filter(f => f.state.toLowerCase() === stateData.name.toLowerCase() || f.state.toLowerCase() === stateData.abbr.toLowerCase())
      .sort((a, b) => {
        const aFeatured = (a as any).hasFeaturedSubscription ? 1 : 0;
        const bFeatured = (b as any).hasFeaturedSubscription ? 1 : 0;
        return bFeatured !== aFeatured ? bFeatured - aFeatured : b.rating - a.rating;
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

  const faqs = getDetoxNearMeFAQs(stateData ? { state: stateData.name } : undefined);

  const nearbyStates = useMemo(() => {
    if (!stateData) return [];
    const currentIndex = statesData.findIndex(s => s.slug === stateData.slug);
    return statesData
      .filter((_, i) => Math.abs(i - currentIndex) > 0 && Math.abs(i - currentIndex) <= 3)
      .slice(0, 4)
      .map(s => ({ name: s.name, slug: `/detox-near-me/${s.slug}` }));
  }, [stateData]);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Medical Detox Programs",
      treatmentSlug: "detox",
      location: stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Medical Detoxification",
      location: stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Detox Centers Near Me ${stateData ? `in ${stateData.name}` : ""} | Medical Detox`}
        description={`Find medical detox centers near you${stateData ? ` in ${stateData.name}` : ""}. Safe, medically-supervised detoxification for drugs and alcohol. 24/7 care available.`}
        canonical={stateSlug ? `/detox-near-me/${stateSlug}` : "/detox-near-me"}
        keywords={["detox near me", "medical detox", "drug detox centers", "alcohol detox", ...(stateData ? [`detox ${stateData.name}`] : [])]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Detox Near Me", url: "/detox-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/detox-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Detox Centers Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find medically-supervised detox programs${stateData ? ` in ${stateData.name}` : " near you"}. Safe withdrawal management with 24/7 medical care.`}
        treatmentType="Medical Detox"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <LocalSignalsSection
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : { state: "United States", stateAbbr: "US" }}
        nearbyAreas={nearbyStates}
        localStats={{ avgResponseTime: "< 1 hour", insuranceAcceptance: 96, availableBeds: "Call for availability" }}
        treatmentType="Detox"
      />

      {/* Above-fold intro content for SEO */}
      <section className="py-6 bg-muted/30 border-b">
        <div className="container">
          <p className="text-center text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {stateData 
              ? `Looking for medical detox in ${stateData.name}? Browse ${facilities.length}+ verified detoxification centers offering medically-supervised withdrawal management. Most facilities accept major insurance including Aetna, BCBS, Cigna, and United Healthcare.${
                  stateData.name === "California" ? " California offers world-class medical detox programs with holistic approaches." :
                  stateData.name === "Florida" ? " Florida provides year-round detox options in comfortable, therapeutic settings." :
                  stateData.name === "Texas" ? " Texas features comprehensive detox programs across major cities and suburban areas." :
                  stateData.name === "New York" ? " New York offers diverse medical detox options from urban hospitals to private facilities." : ""
                }`
              : "Search our directory of medical detox centers across the United States. Find safe, medically-supervised detoxification programs for drugs and alcohol."
            }
          </p>
        </div>
      </section>

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Detox Centers {stateData ? `in ${stateData.name}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length}+ medically-supervised detox facilities.
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <>
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((f) => (
                  <div key={f.id || f.name}>
                    <TreatmentCenterCard center={f as any} />
                  </div>
                ))}
              </div>
              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.name}` : ""}`}>
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

      <TreatmentFAQSection faqs={faqs} treatmentType="Detox" location={stateData ? { state: stateData.name } : undefined} />
    </Layout>
  );
}
