import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { ResponsiveListingGrid } from "@/components/listings/ResponsiveListingGrid";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Brain, Heart, Shield, Stethoscope } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getDualDiagnosisFAQs = (location?: { state: string }) => [
  {
    question: `What is dual diagnosis treatment${location ? ` in ${location.state}` : ""}?`,
    answer: `Dual diagnosis treatment${location ? ` in ${location.state}` : ""} addresses both addiction and co-occurring mental health disorders simultaneously. Also called co-occurring disorder treatment, it recognizes that conditions like depression, anxiety, PTSD, and bipolar disorder often fuel substance abuse and must be treated together for lasting recovery.`,
  },
  {
    question: "What mental health conditions are treated with addiction?",
    answer: "Common co-occurring disorders include depression, anxiety disorders, PTSD, bipolar disorder, schizophrenia, borderline personality disorder, and ADHD. Nearly 50% of people with addiction have a co-occurring mental health condition, making integrated treatment essential.",
  },
  {
    question: "Why is dual diagnosis treatment important?",
    answer: "Treating only addiction while ignoring underlying mental health issues leads to high relapse rates. Integrated dual diagnosis treatment addresses both conditions simultaneously, teaching coping skills, providing psychiatric care, and creating a comprehensive recovery plan.",
  },
  {
    question: "What does dual diagnosis treatment include?",
    answer: "Programs include psychiatric evaluation, medication management, individual therapy (often CBT or DBT), group counseling, trauma therapy, addiction treatment, and aftercare planning. Treatment teams include psychiatrists, therapists, and addiction specialists working together.",
  },
  {
    question: "Does insurance cover dual diagnosis rehab?",
    answer: "Yes, under mental health parity laws, most insurance plans cover dual diagnosis treatment. This includes both the addiction and mental health components. Coverage may vary, so verify your specific benefits before admission.",
  },
];

export default function DualDiagnosisRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/dual-diagnosis-rehab-near-me",
  });

  const faqs = getDualDiagnosisFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Dual Diagnosis Treatment Center",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
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
        title={`Dual Diagnosis Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Co-Occurring Disorder Treatment`}
        description={`Find dual diagnosis treatment centers${stateData ? ` in ${stateData.state}` : " near you"}. Integrated care for addiction and mental health including depression, anxiety, PTSD, and bipolar disorder.`}
        canonical={stateSlug ? `/dual-diagnosis-rehab-near-me/${stateSlug}` : "/dual-diagnosis-rehab-near-me"}
        keywords={[
          "dual diagnosis rehab near me",
          "co-occurring disorder treatment",
          "mental health and addiction treatment",
          "addiction and depression treatment",
          "addiction and anxiety treatment",
          "PTSD and addiction treatment",
          "bipolar and addiction treatment",
          "integrated dual diagnosis",
          ...(stateData ? [
            `dual diagnosis ${stateData.state}`,
            `co-occurring treatment ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Dual Diagnosis Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find treatment centers specializing in co-occurring addiction and mental health disorders${stateData ? ` in ${stateData.state}` : " near you"}. Integrated care for lasting recovery.`}
        treatmentType="Dual Diagnosis Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Dual Diagnosis Treatment Approach
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Brain className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Integrated Care</h3>
                <p className="text-sm text-muted-foreground">Addiction and mental health treated simultaneously</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Stethoscope className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Psychiatric Services</h3>
                <p className="text-sm text-muted-foreground">Medication management and psychiatric evaluation</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Trauma-Informed</h3>
                <p className="text-sm text-muted-foreground">Address underlying trauma contributing to both conditions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Better Outcomes</h3>
                <p className="text-sm text-muted-foreground">Lower relapse rates with comprehensive treatment</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
          : { state: "United States", stateAbbr: "US" }
        }
        nearbyAreas={[]}
        localStats={{
          avgResponseTime: "< 4 hours",
          insuranceAcceptance: 89,
          availableBeds: "Limited",
        }}
        treatmentType="Dual Diagnosis Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Dual Diagnosis Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Treatment facilities specializing in co-occurring mental health and addiction disorders.
            </p>
          </div>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div>
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <ResponsiveListingGrid facilities={facilities} maxItems={12} />

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}&service=Dual+Diagnosis` : "?service=Dual+Diagnosis"}`}>
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
              Dual Diagnosis Treatment by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/dual-diagnosis-rehab-near-me/${state.slug}`}
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
        treatmentType="Dual Diagnosis Treatment"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
