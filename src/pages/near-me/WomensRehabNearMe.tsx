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
import { ArrowRight, MapPin, Heart, Shield, Users, Baby } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getWomensRehabFAQs = (location?: { state: string }) => [
  {
    question: `Why choose a women's-only rehab program${location ? ` in ${location.state}` : ""}?`,
    answer: `Women's-only treatment${location ? ` in ${location.state}` : ""} provides a safe, supportive environment where women can address gender-specific issues like trauma, domestic violence, body image concerns, and hormonal factors affecting addiction. Women often feel more comfortable opening up without men present.`,
  },
  {
    question: "What issues do women's rehab programs address?",
    answer: "Programs address trauma and PTSD, eating disorders, domestic violence recovery, postpartum depression, hormonal influences on addiction, childcare concerns, relationship issues, self-esteem, and co-occurring mental health disorders common in women.",
  },
  {
    question: "Are there rehabs that allow mothers to bring children?",
    answer: "Yes, many women's programs offer family-friendly options where mothers can have their children with them during treatment. Some facilities provide onsite childcare, parenting classes, and family therapy sessions.",
  },
  {
    question: "Do women's rehabs offer pregnancy-safe treatment?",
    answer: "Yes, specialized women's programs offer medically supervised treatment safe for pregnant women. This includes medication-assisted treatment (MAT) protocols approved for pregnancy, prenatal care coordination, and postpartum support.",
  },
  {
    question: "What therapies are unique to women's addiction treatment?",
    answer: "Women's programs often include trauma-informed care, EMDR for trauma, women's support groups, body image therapy, parenting skills, relationship counseling, and specialized therapy for issues like sexual abuse and domestic violence.",
  },
];

export default function WomensRehabNearMe() {
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

  const faqs = getWomensRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Women's Addiction Treatment Centers",
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
        title={`Women's Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Gender-Specific Treatment`}
        description={`Find women's-only drug and alcohol rehab centers${stateData ? ` in ${stateData.name}` : " near you"}. Trauma-informed care, family-friendly programs, and specialized treatment for women.`}
        canonical={stateSlug ? `/womens-rehab-near-me/${stateSlug}` : "/womens-rehab-near-me"}
        keywords={[
          "womens rehab near me",
          "women's only rehab",
          "female rehab centers",
          "rehab for women",
          "women's addiction treatment",
          "mothers in recovery",
          "pregnant rehab",
          "women's drug rehab",
          "female alcohol treatment",
          ...(stateData ? [
            `womens rehab ${stateData.name}`,
            `female treatment ${stateData.abbr}`,
            `women's recovery ${stateData.name}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Women's Rehab", url: "/womens-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/womens-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Women's Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find women's-only addiction treatment programs${stateData ? ` in ${stateData.name}` : " near you"}. Safe, supportive environments with trauma-informed care designed specifically for women.`}
        treatmentType="Women's Addiction Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Women's Program Features */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Why Choose Women's-Only Treatment
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Safe Environment</h3>
                <p className="text-sm text-muted-foreground">Women-only spaces free from male-related triggers and distractions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Trauma-Informed</h3>
                <p className="text-sm text-muted-foreground">Specialized care for trauma, abuse, and PTSD common in women</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Baby className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Family-Friendly</h3>
                <p className="text-sm text-muted-foreground">Programs allowing mothers to bring children during treatment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Peer Support</h3>
                <p className="text-sm text-muted-foreground">Connect with other women who understand your experiences</p>
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
              Women's Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Compassionate, gender-specific addiction treatment designed for women's unique needs.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              <FacilityShowcaseGrid
                facilities={facilities.slice(0, 12) as any[]}
                title="Treatment Centers Near You"
                subtitle={`${facilities.length} verified women's rehab centers`}
                viewAllHref={`/search-results${stateData ? `?state=${stateData.name}` : ""}`}
                viewAllLabel={`View All ${facilities.length} Centers`}
              />
            </div>
          )}
        </div>
      </section>

      {/* State Links */}
      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Women's Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/womens-rehab-near-me/${state.slug}`}
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
        treatmentType="Women's Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
