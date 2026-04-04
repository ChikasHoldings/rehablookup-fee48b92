import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { FacilityShowcaseGrid } from "@/components/facility/FacilityShowcaseGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Church, Heart, Users, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getFaithBasedFAQs = (location?: { state: string }) => [
  {
    question: `What is faith-based rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Faith-based rehab${location ? ` in ${location.state}` : ""} integrates spiritual principles and religious teachings with evidence-based addiction treatment. Programs may be Christian, faith-neutral, or multi-denominational, combining prayer, scripture study, and spiritual counseling with clinical therapy.`,
  },
  {
    question: "Do faith-based rehabs work?",
    answer: "Research shows faith-based programs can be highly effective, especially for those with strong spiritual beliefs. The combination of spiritual support, community, purpose, and clinical treatment often provides a powerful foundation for recovery. Many 12-step programs are spiritually-based.",
  },
  {
    question: "Are faith-based rehabs free?",
    answer: "Many faith-based programs are low-cost or free, funded by churches and religious organizations. Some residential programs ask for voluntary donations or work participation. Others accept insurance. Costs vary widely by program and services offered.",
  },
  {
    question: "What happens at a Christian rehab?",
    answer: "Christian rehab programs typically include Bible study, chapel services, prayer, pastoral counseling, and 12-step meetings alongside clinical addiction treatment. Programs focus on healing through faith while providing professional therapy and medical care when needed.",
  },
  {
    question: "Do I have to be religious to attend faith-based rehab?",
    answer: "Requirements vary by program. Some require participants to be Christian or willing to participate in religious activities. Others welcome people of all faiths or no faith who are open to exploring spirituality. Ask programs about their specific requirements.",
  },
];

export default function FaithBasedRehabNearMe() {
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

    return filtered.slice(0, 24);
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation) {
      // Auto-detect location silently on mount
    }
  }, [stateSlug, userLocation]);

  const faqs = getFaithBasedFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Faith-Based Drug Rehabilitation",
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
        title={`Faith-Based Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Christian & Spiritual Treatment`}
        description={`Find faith-based and Christian drug rehab${stateData ? ` in ${stateData.name}` : " near you"}. Spiritual healing combined with evidence-based addiction treatment. Many programs are free or low-cost.`}
        canonical={stateSlug ? `/faith-based-rehab-near-me/${stateSlug}` : "/faith-based-rehab-near-me"}
        keywords={[
          "faith-based rehab near me",
          "christian rehab near me",
          "christian drug rehab",
          "faith-based addiction treatment",
          "spiritual rehab",
          "bible-based recovery",
          "religious rehab programs",
          "free christian rehab",
          ...(stateData ? [
            `christian rehab ${stateData.name}`,
            `faith-based treatment ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Faith-Based Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find Christian and faith-based addiction treatment${stateData ? ` in ${stateData.name}` : " near you"}. Heal through spiritual guidance combined with evidence-based clinical care.`}
        treatmentType="Faith-Based Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Faith-Based Treatment Approach
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Church className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Spiritual Foundation</h3>
                <p className="text-sm text-muted-foreground">Build recovery on faith, prayer, and spiritual growth</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <BookOpen className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Scripture & Counseling</h3>
                <p className="text-sm text-muted-foreground">Bible study and pastoral guidance alongside therapy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Faith Community</h3>
                <p className="text-sm text-muted-foreground">Connect with others sharing your beliefs and journey</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Purpose & Hope</h3>
                <p className="text-sm text-muted-foreground">Find meaning and direction through spiritual renewal</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.name, stateAbbr: stateData.abbr }
          : { state: "United States", stateAbbr: "US" }
        }
        nearbyAreas={[]}
        localStats={{
          avgResponseTime: "< 24 hours",
          insuranceAcceptance: 78,
          availableBeds: "Available",
        }}
        treatmentType="Faith-Based Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Faith-Based Programs {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Christian and spiritual addiction treatment programs with faith-centered recovery.
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
                      View All {facilities.length} Programs
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
              Faith-Based Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/faith-based-rehab-near-me/${state.slug}`}
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
        treatmentType="Faith-Based Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
