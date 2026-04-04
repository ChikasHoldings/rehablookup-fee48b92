import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Pill, Heart, Shield, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getSuboxoneClinicFAQs = (location?: { state: string }) => [
  {
    question: `What is a Suboxone clinic${location ? ` in ${location.state}` : ""}?`,
    answer: `A Suboxone clinic${location ? ` in ${location.state}` : ""} provides medication-assisted treatment (MAT) using Suboxone (buprenorphine/naloxone) to treat opioid addiction. These clinics offer medical supervision, counseling, and ongoing support for opioid use disorder recovery.`,
  },
  {
    question: "How does Suboxone help with opioid addiction?",
    answer: "Suboxone contains buprenorphine, which reduces opioid cravings and withdrawal symptoms without producing the high of other opioids. It blocks the effects of other opioids if used, helping prevent relapse. Combined with counseling, it significantly improves recovery outcomes.",
  },
  {
    question: "Does insurance cover Suboxone treatment?",
    answer: "Yes, most insurance plans cover Suboxone treatment including Medicaid, Medicare, and private insurance. The Mental Health Parity Act requires insurance to cover MAT similarly to other medical treatments. Many clinics offer sliding scale fees for uninsured patients.",
  },
  {
    question: "How long do you take Suboxone?",
    answer: "Suboxone treatment duration varies by individual. Some patients use it for months during early recovery, while others benefit from maintenance treatment for years. Research shows longer treatment duration improves outcomes. Work with your doctor to determine the right timeline.",
  },
  {
    question: "Can you get Suboxone same day?",
    answer: "Many Suboxone clinics offer same-day or next-day appointments for medication induction. Some clinics provide telehealth consultations for faster access. Walk-in availability varies by location. Call ahead to confirm same-day appointment availability.",
  },
];

export default function SuboxoneClinicNearMe() {
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

  // Filter facilities offering MAT/Suboxone
  const facilities = useMemo(() => {
    let filtered = approvedFacilities.filter(f => 
      f.treatmentTypes?.some(t => 
        t.toLowerCase().includes('mat') || 
        t.toLowerCase().includes('medication') ||
        t.toLowerCase().includes('suboxone') ||
        t.toLowerCase().includes('buprenorphine')
      )
    );
    
    if (stateData) {
      filtered = filtered.filter(f => 
        f.state.toLowerCase() === stateData.name.toLowerCase() ||
        f.state.toLowerCase() === stateData.abbr.toLowerCase()
      );
    }

    // If no MAT-specific facilities, return general facilities
    if (filtered.length === 0) {
      filtered = approvedFacilities;
      if (stateData) {
        filtered = filtered.filter(f => 
          f.state.toLowerCase() === stateData.name.toLowerCase() ||
          f.state.toLowerCase() === stateData.abbr.toLowerCase()
        );
      }
    }

    return filtered.slice(0, 24);
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation) {
      // Auto-detect location silently
    }
  }, [stateSlug, userLocation]);

  const faqs = getSuboxoneClinicFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Suboxone Treatment Clinics",
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
        title={`Suboxone Clinic Near Me ${stateData ? `in ${stateData.name}` : ""} | MAT Treatment for Opioid Addiction`}
        description={`Find Suboxone clinics and MAT providers${stateData ? ` in ${stateData.name}` : " near you"}. Same-day appointments, insurance accepted. Medication-assisted treatment for opioid addiction recovery.`}
        canonical={stateSlug ? `/suboxone-clinic-near-me/${stateSlug}` : "/suboxone-clinic-near-me"}
        keywords={[
          "suboxone clinic near me",
          "suboxone doctor near me",
          "MAT treatment near me",
          "buprenorphine clinic",
          "opioid treatment program",
          "suboxone treatment",
          "medication assisted treatment",
          "suboxone same day",
          ...(stateData ? [
            `suboxone clinic ${stateData.name}`,
            `MAT provider ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Suboxone Clinic Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find Suboxone and MAT treatment providers${stateData ? ` in ${stateData.name}` : " near you"}. Medication-assisted treatment to overcome opioid addiction with medical supervision.`}
        treatmentType="Suboxone Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Suboxone Treatment Benefits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Pill className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">FDA-Approved MAT</h3>
                <p className="text-sm text-muted-foreground">Evidence-based medication to reduce cravings and withdrawal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Reduces Relapse Risk</h3>
                <p className="text-sm text-muted-foreground">Proven to significantly improve recovery outcomes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Insurance Covered</h3>
                <p className="text-sm text-muted-foreground">Most insurance plans cover Suboxone treatment</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Quick Access</h3>
                <p className="text-sm text-muted-foreground">Same-day or next-day appointments available</p>
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
          insuranceAcceptance: 95,
          availableBeds: "Available",
        }}
        treatmentType="Suboxone Clinic"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Suboxone Providers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse clinics offering medication-assisted treatment for opioid addiction.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
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

      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Suboxone Clinics by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/suboxone-clinic-near-me/${state.slug}`}
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
        treatmentType="Suboxone Clinic"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
