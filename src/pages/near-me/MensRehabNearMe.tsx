import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { FacilityShowcaseGrid } from "@/components/facility/FacilityShowcaseGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Shield, Users, Brain, Dumbbell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getMensRehabFAQs = (location?: { state: string }) => [
  {
    question: `Why choose a men's-only rehab program${location ? ` in ${location.state}` : ""}?`,
    answer: `Men's-only treatment${location ? ` in ${location.state}` : ""} provides an environment where men can address gender-specific issues like societal pressure, emotional suppression, anger management, and relationship problems without distractions, allowing deeper vulnerability and honest sharing.`,
  },
  {
    question: "What issues do men's rehab programs address?",
    answer: "Programs address anger management, emotional expression, work-life balance, fatherhood issues, relationship patterns, trauma including military/veteran experiences, toxic masculinity patterns, and co-occurring conditions like depression that men often don't discuss.",
  },
  {
    question: "Do men's rehabs offer programs for veterans?",
    answer: "Many men's treatment centers have specialized programs for veterans addressing PTSD, combat trauma, military sexual trauma, and readjustment issues. These programs often accept VA benefits and Tricare insurance.",
  },
  {
    question: "What activities are common in men's rehab?",
    answer: "Men's programs often include fitness and sports activities, adventure therapy, wilderness programs, vocational training, brotherhood groups, anger management classes, and therapies focused on healthy masculinity and emotional intelligence.",
  },
  {
    question: "Can men discuss sensitive issues in these programs?",
    answer: "Yes, men's-only environments often help men open up about sensitive topics like childhood abuse, relationship failures, and emotional struggles that they might not discuss in mixed-gender settings due to societal expectations.",
  },
];

export default function MensRehabNearMe() {
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
    let filtered = approvedFacilities;
    
    if (stateData) {
      filtered = filtered.filter(f => 
        f.state.toLowerCase() === stateData.name.toLowerCase() ||
        f.state.toLowerCase() === stateData.abbr.toLowerCase()
      );
    }

    return filtered.sort((a, b) => {
      const aFeatured = (a as any).isPro || a.featured ? 1 : 0;
      const bFeatured = (b as any).isPro || b.featured ? 1 : 0;
      return bFeatured - aFeatured;
    });
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation) {
      // Auto-detect location silently
    }
  }, [stateSlug, userLocation]);

  const faqs = getMensRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Men's Addiction Treatment Centers",
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
        title={`Men's Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Gender-Specific Treatment`}
        description={`Find men's-only drug and alcohol rehab centers${stateData ? ` in ${stateData.name}` : " near you"}. Brotherhood support, veteran programs, and treatment addressing men's unique recovery needs.`}
        canonical={stateSlug ? `/mens-rehab-near-me/${stateSlug}` : "/mens-rehab-near-me"}
        keywords={[
          "mens rehab near me",
          "men's only rehab",
          "male rehab centers",
          "rehab for men",
          "men's addiction treatment",
          "veteran rehab",
          "men's drug rehab",
          "male alcohol treatment",
          ...(stateData ? [
            `mens rehab ${stateData.name}`,
            `male treatment ${stateData.abbr}`,
            `men's recovery ${stateData.name}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Men's Rehab", url: "/mens-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/mens-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Men's Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find men's-only addiction treatment programs${stateData ? ` in ${stateData.name}` : " near you"}. Brotherhood support and therapies designed specifically for men's recovery journey.`}
        treatmentType="Men's Addiction Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Men's Program Features */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Why Choose Men's-Only Treatment
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Brotherhood Support</h3>
                <p className="text-sm text-muted-foreground">Build meaningful connections with men on the same journey</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Brain className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Emotional Growth</h3>
                <p className="text-sm text-muted-foreground">Safe space to develop emotional intelligence and expression</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Veteran Programs</h3>
                <p className="text-sm text-muted-foreground">Specialized care for military veterans and first responders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Dumbbell className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Active Recovery</h3>
                <p className="text-sm text-muted-foreground">Fitness, sports, and adventure therapy programs</p>
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
              Men's Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Evidence-based addiction treatment designed for men's unique recovery needs.
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
              Men's Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/mens-rehab-near-me/${state.slug}`}
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
        treatmentType="Men's Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
