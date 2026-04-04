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
import { ArrowRight, MapPin, Shield, Heart, Users, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getVeteransRehabFAQs = (location?: { state: string }) => [
  {
    question: `Is there free rehab for veterans${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes, veterans can access free addiction treatment${location ? ` in ${location.state}` : ""} through VA healthcare benefits. The VA provides comprehensive substance abuse treatment including detox, inpatient rehab, outpatient programs, and medication-assisted treatment at no cost for eligible veterans.`,
  },
  {
    question: "What types of rehab programs are available for veterans?",
    answer: "Veterans can access specialized programs including PTSD-informed addiction treatment, combat trauma therapy, military sexual trauma (MST) treatment, residential rehabilitation, outpatient programs, and peer support from fellow veterans. Many programs address the unique challenges of military service.",
  },
  {
    question: "Does the VA cover drug and alcohol rehab?",
    answer: "Yes, the VA covers comprehensive addiction treatment for eligible veterans. This includes medical detox, inpatient rehabilitation, outpatient therapy, medication-assisted treatment (MAT), and aftercare support. Coverage extends to both substance use and co-occurring mental health conditions.",
  },
  {
    question: "Can veterans go to private rehab?",
    answer: "Yes, veterans can choose private rehab facilities. Many accept TRICARE, VA Community Care referrals, and private insurance. Some veterans prefer private facilities for specialized programs, shorter wait times, or specific amenities not available through VA facilities.",
  },
  {
    question: "What is PTSD-informed addiction treatment?",
    answer: "PTSD-informed treatment addresses the connection between trauma and substance abuse common among veterans. Programs use evidence-based approaches like EMDR, CPT, and trauma-focused CBT alongside addiction treatment. This dual-focus approach treats root causes of substance abuse.",
  },
];

export default function VeteransRehabNearMe() {
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
      // Auto-detect location silently
    }
  }, [stateSlug, userLocation]);

  const faqs = getVeteransRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Veterans Drug Rehabilitation Centers",
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
        title={`Veterans Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | VA & Military Addiction Treatment`}
        description={`Find veteran-focused drug and alcohol rehab centers${stateData ? ` in ${stateData.name}` : " near you"}. VA-covered treatment, PTSD-informed care, TRICARE accepted. Honor their service with quality care.`}
        canonical={stateSlug ? `/veterans-rehab-near-me/${stateSlug}` : "/veterans-rehab-near-me"}
        keywords={[
          "veterans rehab near me",
          "VA drug treatment",
          "military addiction treatment",
          "PTSD rehab",
          "TRICARE rehab",
          "veteran substance abuse",
          "military alcohol treatment",
          "combat veteran rehab",
          "VA addiction services",
          ...(stateData ? [
            `veterans rehab ${stateData.name}`,
            `VA treatment ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Veterans Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find specialized addiction treatment for veterans${stateData ? ` in ${stateData.name}` : " near you"}. PTSD-informed care, VA benefits accepted, peer support from fellow veterans.`}
        treatmentType="Veterans Addiction Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Veterans Treatment Programs
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">VA Benefits Accepted</h3>
                <p className="text-sm text-muted-foreground">Free or low-cost treatment through VA healthcare coverage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">PTSD-Informed Care</h3>
                <p className="text-sm text-muted-foreground">Trauma-focused treatment addressing combat and service-related PTSD</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Veteran Peer Support</h3>
                <p className="text-sm text-muted-foreground">Connect with fellow veterans who understand your experience</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Award className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">TRICARE Accepted</h3>
                <p className="text-sm text-muted-foreground">Military insurance coverage for active duty and families</p>
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
          avgResponseTime: "< 2 hours",
          insuranceAcceptance: 96,
          availableBeds: "Available",
        }}
        treatmentType="Veterans Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Veterans Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse facilities offering specialized treatment for veterans and military personnel.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <FacilityShowcaseGrid facilities={facilities.slice(0, 12) as any[]} />

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
              Veterans Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/veterans-rehab-near-me/${state.slug}`}
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
        treatmentType="Veterans Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
