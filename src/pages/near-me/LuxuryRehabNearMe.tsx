import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Star, Sparkles, Home, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getLuxuryRehabFAQs = (location?: { state: string }) => [
  {
    question: `What makes a rehab center "luxury"${location ? ` in ${location.state}` : ""}?`,
    answer: `Luxury rehab centers${location ? ` in ${location.state}` : ""} offer upscale amenities including private rooms, gourmet meals, spa services, fitness centers, swimming pools, equine therapy, art studios, and scenic locations. They typically have lower patient-to-staff ratios for more personalized treatment.`,
  },
  {
    question: "How much does luxury rehab cost?",
    answer: "Luxury rehab costs typically range from $30,000 to $100,000+ per month depending on the facility, location, amenities, and treatment length. Many high-end facilities accept insurance, which can significantly reduce out-of-pocket costs.",
  },
  {
    question: "Is luxury rehab more effective than standard treatment?",
    answer: "While amenities differ, treatment effectiveness depends more on clinical quality, staff expertise, and individualized care than luxury features. However, comfortable surroundings can reduce stress and help clients focus on recovery.",
  },
  {
    question: "Do luxury rehabs accept insurance?",
    answer: "Many luxury rehabs accept PPO insurance plans which can cover 50-80% of treatment costs. Some facilities also offer financing options and payment plans. Contact admissions to verify your specific coverage.",
  },
  {
    question: "What therapies do luxury rehab centers offer?",
    answer: "Beyond standard evidence-based treatments, luxury facilities often include holistic therapies like yoga, meditation, acupuncture, massage therapy, adventure therapy, equine-assisted therapy, and personalized fitness programs.",
  },
];

export default function LuxuryRehabNearMe() {
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

  // Filter facilities - prioritize featured/pro facilities as they tend to be higher-end
  const facilities = useMemo(() => {
    let filtered = approvedFacilities;
    
    if (stateData) {
      filtered = filtered.filter(f => 
        f.state.toLowerCase() === stateData.name.toLowerCase() ||
        f.state.toLowerCase() === stateData.abbr.toLowerCase()
      );
    }

    // Sort by featured status
    return filtered.sort((a, b) => {
      const aFeatured = (a as any).isPro || a.featured ? 1 : 0;
      const bFeatured = (b as any).isPro || b.featured ? 1 : 0;
      return bFeatured - aFeatured;
    });
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation) {
      // Auto-detect location silently on mount
    }
  }, [stateSlug, userLocation]);

  const faqs = getLuxuryRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Luxury Drug Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.name, stateAbbr: stateData.abbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": faq.answer,
        },
      })),
    },
  ];

  return (
    <Layout>
      <SEO
        title={`Luxury Rehab Centers ${stateData ? `in ${stateData.name}` : "Near Me"} | Executive Treatment`}
        description={`Find luxury and executive rehab centers${stateData ? ` in ${stateData.name}` : " near you"}. Private rooms, world-class amenities, personalized treatment plans. Premium addiction recovery.`}
        canonical={stateSlug ? `/luxury-rehab-near-me/${stateSlug}` : "/luxury-rehab-near-me"}
        keywords={[
          "luxury rehab near me",
          "luxury rehab centers",
          "executive rehab",
          "high-end rehab",
          "private rehab",
          "upscale addiction treatment",
          "luxury detox",
          "celebrity rehab",
          "5 star rehab",
          ...(stateData ? [
            `luxury rehab ${stateData.name}`,
            `private rehab ${stateData.abbr}`,
            `executive treatment ${stateData.name}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Luxury Rehab", url: "/luxury-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/luxury-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Luxury Rehab Centers${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Discover premium addiction treatment facilities${stateData ? ` in ${stateData.name}` : " near you"}. World-class amenities, personalized care, and evidence-based treatment in comfortable settings.`}
        treatmentType="Luxury Addiction Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Luxury Features */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Luxury Rehab Amenities & Features
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Home className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Private Accommodations</h3>
                <p className="text-sm text-muted-foreground">Private or semi-private rooms with premium furnishings</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Sparkles className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Spa & Wellness</h3>
                <p className="text-sm text-muted-foreground">Massage therapy, yoga, meditation, and fitness centers</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Low Staff Ratios</h3>
                <p className="text-sm text-muted-foreground">Personalized attention with dedicated treatment teams</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Star className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Gourmet Dining</h3>
                <p className="text-sm text-muted-foreground">Chef-prepared meals with nutritional programs</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Facility Listings */}
      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Luxury Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Premium facilities offering upscale addiction treatment with world-class amenities.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              {/* Horizontal scroll on mobile, grid on larger screens */}
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

      {/* State Links */}
      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Luxury Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/luxury-rehab-near-me/${state.slug}`}
                  className="flex items-center gap-2 p-3 rounded-lg bg-background border hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {state.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <TreatmentFAQSection
        faqs={faqs}
        treatmentType="Luxury Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
