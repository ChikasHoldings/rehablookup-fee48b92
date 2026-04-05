import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Home, Users, Calendar, Briefcase } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getSoberLivingFAQs = (location?: { state: string }) => [
  {
    question: `What is sober living${location ? ` in ${location.state}` : ""}?`,
    answer: `Sober living homes${location ? ` in ${location.state}` : ""} are structured, substance-free housing for people in recovery. They provide a supportive community environment between inpatient treatment and returning to independent living. Residents follow house rules including curfews, meetings, and random drug testing.`,
  },
  {
    question: "How much does sober living cost?",
    answer: "Sober living costs typically range from $500-$2,500 per month depending on location, amenities, and services included. Some homes accept insurance, offer scholarships, or have sliding scale fees based on income.",
  },
  {
    question: "What are the rules in sober living homes?",
    answer: "Common rules include mandatory sobriety (with drug testing), attending house meetings, paying rent on time, contributing to chores, following curfews, attending outside recovery meetings (like AA/NA), and maintaining employment or attending school.",
  },
  {
    question: "How long can you stay in sober living?",
    answer: "Most residents stay 3-12 months, though some live there for years. There's often no strict time limit as long as you follow the rules and pay rent. Longer stays are associated with better long-term recovery outcomes.",
  },
  {
    question: "What's the difference between sober living and halfway houses?",
    answer: "Sober living homes are typically private, resident-funded housing. Halfway houses are often state-funded and may be required as part of parole or court orders. Both provide structured recovery environments but have different oversight and requirements.",
  },
];

export default function SoberLivingNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/sober-living-near-me",
  });

  const faqs = getSoberLivingFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Sober Living Homes",
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
        title={`Sober Living Near Me ${stateData ? `in ${stateData.state}` : ""} | Recovery Housing`}
        description={`Find sober living homes and recovery housing${stateData ? ` in ${stateData.state}` : " near you"}. Structured, substance-free environments to support your ongoing recovery journey.`}
        canonical={stateSlug ? `/sober-living-near-me/${stateSlug}` : "/sober-living-near-me"}
        keywords={[
          "sober living near me",
          "sober living homes",
          "recovery housing",
          "halfway house",
          "sober house",
          "transitional housing",
          "oxford house",
          "recovery residence",
          ...(stateData ? [
            `sober living ${stateData.state}`,
            `recovery housing ${stateData.stateAbbr}`,
            `halfway house ${stateData.state}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Sober Living", url: "/sober-living-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/sober-living-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Sober Living Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find quality sober living homes and recovery housing${stateData ? ` in ${stateData.state}` : " near you"}. Supportive, substance-free environments for your recovery journey.`}
        treatmentType="Sober Living Housing"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Sober Living Features */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            What Sober Living Offers
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Home className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Safe Housing</h3>
                <p className="text-sm text-muted-foreground">Drug and alcohol-free living environment with structure</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Users className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Peer Support</h3>
                <p className="text-sm text-muted-foreground">Live with others committed to sobriety and recovery</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Calendar className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Structure</h3>
                <p className="text-sm text-muted-foreground">House rules, meetings, and accountability support recovery</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Briefcase className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Life Skills</h3>
                <p className="text-sm text-muted-foreground">Return to work, school, and independent living gradually</p>
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
              Sober Living & Recovery Housing {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Find structured, supportive housing to continue your recovery journey.
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
                      View All {facilities.length} Options
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
              Sober Living by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/sober-living-near-me/${state.slug}`}
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
        treatmentType="Sober Living"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
