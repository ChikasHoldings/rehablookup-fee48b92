import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateTreatmentNearMeSchema, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { LocalSignalsSection } from "@/components/seo/LocalSignalsSection";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useNearMeFacilities } from "@/hooks/useNearMeFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin } from "lucide-react";


const getInpatientRehabFAQs = (location?: { state: string }) => [
  {
    question: `What is inpatient rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Inpatient rehab${location ? ` in ${location.state}` : ""} provides 24/7 residential care in a structured environment. Patients live at the facility for 30-90 days, receiving intensive therapy, medical supervision, and peer support away from triggers.`,
  },
  {
    question: "How long does inpatient treatment last?",
    answer: "Most inpatient programs last 28-30 days, though 60 and 90-day programs are common for more severe addictions. Research shows longer stays often lead to better outcomes.",
  },
  {
    question: `Does insurance cover inpatient rehab${location ? ` in ${location.state}` : ""}?`,
    answer: `Yes, most health insurance plans${location ? ` in ${location.state}` : ""} cover inpatient addiction treatment under mental health parity laws. Coverage varies by plan, so verify your specific benefits.`,
  },
  {
    question: "What should I bring to inpatient rehab?",
    answer: "Pack comfortable clothing for 1-2 weeks, personal hygiene items, any prescribed medications, insurance cards, and ID. Most facilities provide a packing list and restrict electronics and certain personal items.",
  },
  {
    question: "Can I continue working during inpatient treatment?",
    answer: "Traditional inpatient programs require full-time residence. However, executive or professional programs may offer accommodations for limited work. FMLA protects your job for up to 12 weeks of medical leave.",
  },
];

export default function InpatientRehabNearMe() {
  const { stateSlug } = useParams<{ stateSlug?: string }>();

  const { facilities, stateData, nearbyStates, locationString, isLoading } = useNearMeFacilities({
    stateSlug,
    basePath: "/inpatient-rehab-near-me",
  });

  const faqs = getInpatientRehabFAQs(stateData ? { state: stateData.state } : undefined);

  const structuredData = [
    ...generateTreatmentNearMeSchema({
      treatmentType: "Inpatient Rehabilitation",
      treatmentSlug: "inpatient-rehab",
      location: stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined,
      facilityCount: facilities.length,
      faqs,
    }),
    generateNearMeSchema({
      serviceType: "Inpatient Rehabilitation Centers",
      location: stateData 
        ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
        : { state: "United States", stateAbbr: "US" },
      facilityCount: facilities.length,
    }),
  ];

  return (
    <Layout>
      <SEO
        title={`Inpatient Rehab Near Me ${stateData ? `in ${stateData.state}` : ""} | Residential Treatment`}
        description={`Find inpatient rehab centers near you${stateData ? ` in ${stateData.state}` : ""}. Compare ${facilities.length}+ residential treatment facilities offering 24/7 care, medical detox, and evidence-based therapy.`}
        canonical={stateSlug ? `/inpatient-rehab-near-me/${stateSlug}` : "/inpatient-rehab-near-me"}
        keywords={[
          "inpatient rehab near me",
          "residential treatment centers",
          "30 day rehab programs",
          "live-in rehab facilities",
          ...(stateData ? [
            `inpatient rehab ${stateData.state}`,
            `residential treatment ${stateData.stateAbbr}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Inpatient Rehab Near Me", url: "/inpatient-rehab-near-me" },
          ...(stateData ? [{ name: stateData.state, url: `/inpatient-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Inpatient Rehab Near Me${stateData ? ` in ${stateData.state}` : ""}`}
        subtitle={`Find residential treatment centers${stateData ? ` in ${stateData.state}` : " near you"} offering 24/7 care, structured programs, and comprehensive addiction recovery services.`}
        treatmentType="Inpatient Rehabilitation"
        location={stateData ? { state: stateData.state, stateAbbr: stateData.stateAbbr } : undefined}
        facilityCount={facilities.length}
      />

      <LocalSignalsSection
        location={stateData 
          ? { state: stateData.state, stateAbbr: stateData.stateAbbr }
          : { state: "United States", stateAbbr: "US" }
        }
        nearbyAreas={nearbyStates}
        localStats={{
          avgResponseTime: "< 2 hours",
          insuranceAcceptance: 91,
          availableBeds: "Limited",
        }}
        treatmentType="Inpatient Rehab"
      />

      <section className="py-12 bg-background">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-2 treatment-intro">
            Inpatient Treatment Centers {stateData ? `in ${stateData.state}` : "Near You"}
          </h2>
          <p className="text-muted-foreground mb-8">
            Browse {facilities.length}+ residential facilities offering intensive 24/7 addiction treatment.
          </p>

          {isLoading ? (
            <SearchResultsLoading />
          ) : (
            <div className="treatment-listings">
              {/* Horizontal scroll on mobile, grid on larger screens */}
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {facilities.slice(0, 12).map((facility) => (
                   <div key={facility.id || facility.name}>
                    <TreatmentCenterCard center={facility as any} />
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
              Inpatient Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/inpatient-rehab-near-me/${state.slug}`}
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
        treatmentType="Inpatient Rehab"
        location={stateData ? { state: stateData.state } : undefined}
      />
    </Layout>
  );
}
