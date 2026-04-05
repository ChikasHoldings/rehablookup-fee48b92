import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, GraduationCap, Users, Heart, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getTeenRehabFAQs = (location?: { state: string }) => [
  {
    question: `What is teen rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Teen rehab${location ? ` in ${location.state}` : ""} provides specialized addiction treatment for adolescents ages 12-17. Programs include age-appropriate therapy, family counseling, educational support, and peer group sessions designed specifically for young people struggling with substance abuse.`,
  },
  {
    question: "At what age can a teenager go to rehab?",
    answer: "Most teen rehab programs accept adolescents ages 12-17, though some facilities accept young adults up to 21. Early intervention is crucial for adolescent substance abuse. Programs are designed to address the unique developmental needs of teenagers.",
  },
  {
    question: "What types of teen rehab programs are available?",
    answer: "Teen-specific programs include residential treatment, intensive outpatient (IOP), partial hospitalization (PHP), wilderness therapy, therapeutic boarding schools, and family-based treatment. Many combine addiction treatment with academic support and life skills training.",
  },
  {
    question: "Does insurance cover teen rehab?",
    answer: "Yes, most insurance plans cover adolescent substance abuse treatment. The Mental Health Parity Act requires insurers to cover addiction treatment similarly to medical care. Medicaid, private insurance, and state programs often provide coverage for teen rehab.",
  },
  {
    question: "How long does teen rehab last?",
    answer: "Teen rehab programs typically range from 30-90 days for residential treatment, though some therapeutic programs last 6-12 months. Outpatient programs may continue for several months. Length depends on substance severity, co-occurring disorders, and individual progress.",
  },
];

export default function TeenRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/teen-rehab-near-me",
  });

  const faqs = getTeenRehabFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Teen Drug Rehabilitation Centers",
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
        title={`Teen Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Adolescent Addiction Treatment`}
        description={`Find teen and adolescent drug rehab centers${stateData ? ` in ${stateData.state}` : " near you"}. Age-appropriate treatment, family therapy, educational support. Help your teen recover today.`}
        canonical={stateSlug ? `/teen-rehab-near-me/${stateSlug}` : "/teen-rehab-near-me"}
        keywords={[
          "teen rehab near me",
          "adolescent rehab",
          "teenage drug treatment",
          "youth addiction treatment",
          "teen substance abuse help",
          "juvenile rehab programs",
          "teenage alcohol treatment",
          "youth recovery programs",
          ...(stateData ? [
            `teen rehab ${stateData.state}`,
            `adolescent treatment ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Teen Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find specialized addiction treatment for teenagers${stateData ? ` in ${stateData.state}` : " near you"}. Age-appropriate programs with family therapy, educational support, and peer groups.`}
        treatmentType="Teen Addiction Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Teen Treatment Programs
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <GraduationCap className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Academic Support</h3>
                <p className="text-sm text-muted-foreground">Continue education while in treatment with tutoring and school credits</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Family Therapy</h3>
                <p className="text-sm text-muted-foreground">Rebuild family relationships through structured counseling sessions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Age-Appropriate Care</h3>
                <p className="text-sm text-muted-foreground">Treatment designed specifically for adolescent developmental needs</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Safe Environment</h3>
                <p className="text-sm text-muted-foreground">Supervised, substance-free setting for teen recovery</p>
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
          avgResponseTime: "< 2 hours",
          insuranceAcceptance: 92,
          availableBeds: "Limited",
        }}
        treatmentType="Teen Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Teen Treatment Centers {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse facilities offering specialized adolescent addiction treatment programs.
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
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}` : ""}`}>
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
              Teen Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/teen-rehab-near-me/${state.slug}`}
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
        treatmentType="Teen Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
