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
import { ArrowRight, MapPin, Scale, FileCheck, Clock, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getCourtOrderedRehabFAQs = (location?: { state: string }) => [
  {
    question: `What is court-ordered rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Court-ordered rehab${location ? ` in ${location.state}` : ""} is addiction treatment mandated by a judge as part of a legal sentence or condition of probation. It's often offered as an alternative to incarceration for drug-related offenses, DUI charges, or cases where substance abuse was a contributing factor.`,
  },
  {
    question: "How do I get court-ordered rehab instead of jail?",
    answer: "Request court-ordered rehab through your attorney, who can present treatment as an alternative to incarceration. Judges may approve rehab for non-violent offenders, first-time offenders, or cases involving addiction. Drug courts specifically focus on treatment over punishment.",
  },
  {
    question: "Who pays for court-ordered rehab?",
    answer: "Payment varies by case. Options include personal insurance, Medicaid, state-funded programs, sliding scale fees, or self-pay. Some courts have funding for indigent defendants. Contact the treatment facility to discuss payment options based on your situation.",
  },
  {
    question: "How long is court-ordered rehab?",
    answer: "Court-ordered rehab typically ranges from 30 days to 12 months, depending on the offense, judge's orders, and treatment needs. Many programs are 60-90 days residential followed by outpatient care. Length is determined by the court and may be modified based on progress.",
  },
  {
    question: "What happens if I don't complete court-ordered rehab?",
    answer: "Failure to complete court-ordered rehab can result in serious consequences including revocation of probation, jail time for the original offense, additional charges, or extended supervision. Successful completion is reported to the court and may reduce sentencing.",
  },
];

export default function CourtOrderedRehabNearMe() {
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

  const faqs = getCourtOrderedRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Court-Ordered Drug Rehabilitation Centers",
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
        title={`Court-Ordered Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Legal Mandated Treatment`}
        description={`Find court-ordered and court-approved drug rehab centers${stateData ? ` in ${stateData.name}` : " near you"}. DUI programs, drug court treatment, and legal-compliant rehabilitation facilities.`}
        canonical={stateSlug ? `/court-ordered-rehab-near-me/${stateSlug}` : "/court-ordered-rehab-near-me"}
        keywords={[
          "court ordered rehab near me",
          "court mandated rehab",
          "DUI rehab program",
          "drug court treatment",
          "legal rehab",
          "court approved rehab",
          "probation rehab",
          "mandated addiction treatment",
          ...(stateData ? [
            `court ordered rehab ${stateData.name}`,
            `drug court ${stateData.abbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Court-Ordered Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find court-approved addiction treatment centers${stateData ? ` in ${stateData.name}` : " near you"}. Meet legal requirements with accredited programs that report to the court.`}
        treatmentType="Court-Ordered Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Court-Ordered Treatment Benefits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Scale className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Court Compliance</h3>
                <p className="text-sm text-muted-foreground">Programs designed to meet court requirements and reporting</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <FileCheck className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Documentation</h3>
                <p className="text-sm text-muted-foreground">Proper documentation and progress reports for your attorney</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Flexible Programs</h3>
                <p className="text-sm text-muted-foreground">30, 60, 90-day programs to meet court mandates</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Accredited Facilities</h3>
                <p className="text-sm text-muted-foreground">Licensed and certified treatment centers</p>
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
          insuranceAcceptance: 94,
          availableBeds: "Available",
        }}
        treatmentType="Court-Ordered Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Court-Approved Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse facilities that accept court-ordered and mandated treatment referrals.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
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
              Court-Ordered Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/court-ordered-rehab-near-me/${state.slug}`}
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
        treatmentType="Court-Ordered Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
