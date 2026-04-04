import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection, getDrugRehabNearMeFAQs } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  insuranceLinks, 
  resourceLinks 
} from "@/components/seo/InternalLinkingSection";

// State coordinates for geolocation matching
const stateCoordinates: Record<string, { lat: number; lng: number; name: string; abbr: string }> = {
  "alabama": { lat: 32.806671, lng: -86.791130, name: "Alabama", abbr: "AL" },
  "alaska": { lat: 61.370716, lng: -152.404419, name: "Alaska", abbr: "AK" },
  "arizona": { lat: 33.729759, lng: -111.431221, name: "Arizona", abbr: "AZ" },
  "california": { lat: 36.116203, lng: -119.681564, name: "California", abbr: "CA" },
  "colorado": { lat: 39.059811, lng: -105.311104, name: "Colorado", abbr: "CO" },
  "florida": { lat: 27.766279, lng: -81.686783, name: "Florida", abbr: "FL" },
  "georgia": { lat: 33.040619, lng: -83.643074, name: "Georgia", abbr: "GA" },
  "illinois": { lat: 40.349457, lng: -88.986137, name: "Illinois", abbr: "IL" },
  "new-york": { lat: 42.165726, lng: -74.948051, name: "New York", abbr: "NY" },
  "texas": { lat: 31.054487, lng: -97.563461, name: "Texas", abbr: "TX" },
  // Add more states as needed
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

export default function DrugRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();
  const [userLocation, setUserLocation] = useState<{
    name: string;
    abbr: string;
    slug: string;
  } | null>(null);

  const { data: approvedFacilities = [], isLoading } = useStaticFacilities();

  // Get state data from URL or geolocation
  const stateData = useMemo(() => {
    if (stateSlug) {
      const state = statesData.find(s => s.slug === stateSlug);
      return state ? { name: state.name, abbr: state.abbreviation, slug: state.slug } : null;
    }
    return userLocation;
  }, [stateSlug, userLocation]);

  // Filter facilities by state
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

  // Auto-detect location on mount if no state in URL
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

  const locationString = stateData 
    ? stateData.name
    : "Your Area";

  const faqs = getDrugRehabNearMeFAQs(stateData ? { state: stateData.name } : undefined);

  const nearbyStates = useMemo(() => {
    if (!stateData) return [];
    const currentIndex = statesData.findIndex(s => s.slug === stateData.slug);
    return statesData
      .filter((_, i) => Math.abs(i - currentIndex) > 0 && Math.abs(i - currentIndex) <= 3)
      .slice(0, 4)
      .map(s => ({
        name: s.name,
        slug: `/drug-rehab-near-me/${s.slug}`,
        facilityCount: treatmentCenters.filter(f => 
          f.state.toLowerCase() === s.name.toLowerCase() || 
          f.state.toLowerCase() === s.abbreviation.toLowerCase()
        ).length,
      }));
  }, [stateData]);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Drug Rehabilitation",
      treatmentSlug: "drug-rehab",
      location: stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Drug Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.name, stateAbbr: stateData.abbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Drug Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Find Treatment Centers`}
        description={`Find drug rehabilitation centers near you${stateData ? ` in ${stateData.name}` : ""}. Compare ${facilities.length}+ verified treatment facilities offering detox, inpatient, and outpatient programs. Free insurance verification.`}
        canonical={stateSlug ? `/drug-rehab-near-me/${stateSlug}` : "/drug-rehab-near-me"}
        keywords={[
          "drug rehab near me",
          "drug rehabilitation centers",
          "addiction treatment near me",
          "substance abuse treatment",
          ...(stateData ? [
            `drug rehab ${stateData.name}`,
            `addiction treatment ${stateData.abbr}`,
            `rehab centers ${stateData.name}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Drug Rehab Near Me", url: "/drug-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/drug-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Drug Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find verified drug rehabilitation centers${stateData ? ` in ${stateData.name}` : " near you"}. Compare treatment programs, check insurance coverage, and connect with addiction specialists.`}
        treatmentType="Drug Rehabilitation"
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
              Drug Rehabilitation Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse {facilities.length}+ verified treatment facilities offering evidence-based addiction care.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                  
                    <TreatmentCenterCard
                      center={facility as any}
                    />
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
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
