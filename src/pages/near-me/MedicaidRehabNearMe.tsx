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
import { ArrowRight, MapPin, Shield, CheckCircle, DollarSign, FileCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const getMedicaidRehabFAQs = (location?: { state: string }) => [
  {
    question: `Does Medicaid cover drug rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes, Medicaid covers drug and alcohol rehab${location ? ` in ${location.state}` : ""}. Under the Mental Health Parity and Addiction Equity Act, Medicaid must cover substance abuse treatment similarly to other medical conditions. Coverage includes detox, inpatient, outpatient, and medication-assisted treatment.`,
  },
  {
    question: "What rehab services does Medicaid cover?",
    answer: "Medicaid covers comprehensive addiction treatment including medical detoxification, inpatient/residential rehabilitation, intensive outpatient programs (IOP), partial hospitalization (PHP), individual and group therapy, medication-assisted treatment (MAT), and aftercare planning.",
  },
  {
    question: "How do I find a rehab that accepts Medicaid?",
    answer: "Search for Medicaid-approved rehab facilities in your state, contact your Medicaid managed care organization for a provider list, call SAMHSA's helpline (1-800-662-4357), or use our directory to filter by Medicaid acceptance. Many facilities accept Medicaid across all 50 states.",
  },
  {
    question: "Is there a waiting list for Medicaid rehab?",
    answer: "Wait times vary by state and facility. Some Medicaid-accepting facilities have immediate availability, while state-funded programs may have waitlists. Private facilities accepting Medicaid often have shorter wait times. Call multiple facilities to find the quickest admission.",
  },
  {
    question: "Can I choose any rehab with Medicaid?",
    answer: "You can choose any rehab facility that accepts Medicaid and is within your plan's network. Some Medicaid plans require prior authorization. Contact your Medicaid provider to understand coverage and any required referrals before admitting to treatment.",
  },
];

export default function MedicaidRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/medicaid-rehab-near-me",
  });

  const faqs = getMedicaidRehabFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Medicaid Drug Rehabilitation Centers",
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
        title={`Medicaid Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Drug Treatment That Accepts Medicaid`}
        description={`Find drug and alcohol rehab centers that accept Medicaid${stateData ? ` in ${stateData.state}` : " near you"}. Covered addiction treatment including detox, inpatient, and outpatient programs.`}
        canonical={stateSlug ? `/medicaid-rehab-near-me/${stateSlug}` : "/medicaid-rehab-near-me"}
        keywords={[
          "medicaid rehab near me",
          "rehab that accepts medicaid",
          "medicaid drug treatment",
          "medicaid addiction treatment",
          "medicaid detox",
          "medicaid inpatient rehab",
          "medicaid substance abuse",
          "free rehab medicaid",
          ...(stateData ? [
            `medicaid rehab ${stateData.state}`,
            `medicaid treatment ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
      />

      <NearMeHero
        title={`Medicaid Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find addiction treatment centers that accept Medicaid${stateData ? ` in ${stateData.state}` : " near you"}. Quality care covered by your insurance with no out-of-pocket costs.`}
        treatmentType="Medicaid Addiction Treatment"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Medicaid Coverage Benefits
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <DollarSign className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">No Out-of-Pocket Costs</h3>
                <p className="text-sm text-muted-foreground">Medicaid covers treatment costs with no copays for most services</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Shield className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Full Coverage</h3>
                <p className="text-sm text-muted-foreground">Detox, inpatient, outpatient, and MAT all covered</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <CheckCircle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Quality Care</h3>
                <p className="text-sm text-muted-foreground">Access to accredited, high-quality treatment facilities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <FileCheck className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Easy Verification</h3>
                <p className="text-sm text-muted-foreground">Quick insurance verification and admission process</p>
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
          insuranceAcceptance: 100,
          availableBeds: "Available",
        }}
        treatmentType="Medicaid Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Rehabs Accepting Medicaid {stateData ? `in ${stateData.state}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Browse treatment centers that accept Medicaid insurance.
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
                  <Link to={`/search-results${stateData ? `?state=${stateData.state}&insurance=Medicaid` : "?insurance=Medicaid"}`}>
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
              Medicaid Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/medicaid-rehab-near-me/${state.slug}`}
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
        treatmentType="Medicaid Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
