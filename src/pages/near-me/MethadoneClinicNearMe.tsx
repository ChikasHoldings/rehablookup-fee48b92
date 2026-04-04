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
import { ArrowRight, MapPin, Pill, Clock, Shield, HeartPulse } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getMethadoneFAQs = (location?: { state: string }) => [
  {
    question: `What is a methadone clinic${location ? ` in ${location.state}` : ""}?`,
    answer: `Methadone clinics${location ? ` in ${location.state}` : ""} are licensed facilities that provide methadone maintenance treatment (MMT) for opioid addiction. These clinics dispense methadone daily under medical supervision to help patients manage withdrawal symptoms and reduce cravings.`,
  },
  {
    question: "How does methadone treatment work?",
    answer: "Methadone is a long-acting opioid agonist that prevents withdrawal symptoms and reduces cravings without producing the euphoric high. Patients visit the clinic daily (initially) to receive their dose, with take-home privileges earned over time based on progress and stability.",
  },
  {
    question: "How long does methadone treatment last?",
    answer: "Methadone treatment duration varies by individual. Some patients remain on methadone for years, while others gradually taper off. Research shows longer treatment duration correlates with better outcomes. The goal is stable recovery, not a specific timeline.",
  },
  {
    question: "Does insurance cover methadone clinics?",
    answer: "Yes, most insurance plans including Medicaid, Medicare, and private insurance cover methadone treatment. Many clinics also offer sliding scale fees for uninsured patients. Contact clinics directly to verify your specific coverage.",
  },
  {
    question: "What's the difference between methadone and Suboxone?",
    answer: "Both are FDA-approved medications for opioid addiction. Methadone requires daily clinic visits (initially) while Suboxone can be prescribed for home use. Methadone may be more effective for severe addiction, while Suboxone has a lower risk of overdose.",
  },
];

export default function MethadoneClinicNearMe() {
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

  const faqs = getMethadoneFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Methadone Clinic",
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
        title={`Methadone Clinic Near Me ${stateData ? `in ${stateData.name}` : ""} | Opioid Treatment Programs`}
        description={`Find methadone clinics and opioid treatment programs${stateData ? ` in ${stateData.name}` : " near you"}. Daily dosing, medication-assisted treatment, and comprehensive recovery support.`}
        canonical={stateSlug ? `/methadone-clinic-near-me/${stateSlug}` : "/methadone-clinic-near-me"}
        keywords={[
          "methadone clinic near me",
          "methadone treatment",
          "opioid treatment program",
          "methadone maintenance",
          "OTP clinic",
          "methadone dosing",
          "heroin addiction treatment",
          "opioid addiction help",
          ...(stateData ? [
            `methadone clinic ${stateData.name}`,
            `opioid treatment ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Methadone Clinic Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find licensed methadone clinics and opioid treatment programs${stateData ? ` in ${stateData.name}` : " near you"}. FDA-approved medication-assisted treatment for opioid addiction.`}
        treatmentType="Methadone Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Methadone Treatment Benefits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Pill className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">FDA-Approved</h3>
                <p className="text-sm text-muted-foreground">Proven effective medication for opioid use disorder</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Daily Support</h3>
                <p className="text-sm text-muted-foreground">Regular clinic visits provide structure and accountability</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Medical Supervision</h3>
                <p className="text-sm text-muted-foreground">Licensed medical staff monitor dosing and progress</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <HeartPulse className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Reduces Risk</h3>
                <p className="text-sm text-muted-foreground">Significantly reduces overdose risk and illicit drug use</p>
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
          avgResponseTime: "Same day",
          insuranceAcceptance: 95,
          availableBeds: "Available",
        }}
        treatmentType="Methadone Clinic"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Methadone Clinics {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Licensed opioid treatment programs offering methadone maintenance therapy.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                  <div key={facility.id || facility.name}>
                    <TreatmentCenterCard center={facility as any} />
                  </div>
                ))}
              </div>

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.name}&service=MAT` : "?service=MAT"}`}>
                    <Button variant="outline" size="lg" className="gap-2">
                      View All {facilities.length} Clinics
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
              Methadone Clinics by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/methadone-clinic-near-me/${state.slug}`}
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
        treatmentType="Methadone Treatment"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
