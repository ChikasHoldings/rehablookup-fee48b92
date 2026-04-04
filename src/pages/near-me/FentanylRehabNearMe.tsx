import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateNearMeSchema } from "@/components/SEO";
import { NearMeHero } from "@/components/seo/NearMeHero";
import { TreatmentFAQSection } from "@/components/seo/TreatmentFAQSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import { SearchResultsLoading } from "@/components/skeletons/SearchResultSkeleton";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { statesData } from "@/data/locationSeoData";
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, AlertTriangle, Pill, Heart, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const getFentanylRehabFAQs = (location?: { state: string }) => [
  {
    question: `How is fentanyl addiction treated${location ? ` in ${location.state}` : ""}?`,
    answer: `Fentanyl addiction treatment${location ? ` in ${location.state}` : ""} typically involves medical detox with 24/7 monitoring, medication-assisted treatment (MAT) using buprenorphine (Suboxone) or methadone, behavioral therapy, and long-term aftercare planning. Due to fentanyl's potency, medical supervision is critical.`,
  },
  {
    question: "Why is fentanyl withdrawal so dangerous?",
    answer: "Fentanyl is 50-100 times stronger than morphine, creating severe physical dependence. Withdrawal symptoms include extreme pain, nausea, anxiety, insomnia, and cravings. Medical detox ensures safety and uses medications to ease symptoms and prevent complications.",
  },
  {
    question: "What is MAT for fentanyl addiction?",
    answer: "Medication-Assisted Treatment (MAT) uses FDA-approved medications like buprenorphine (Suboxone/Subutex), methadone, or naltrexone (Vivitrol) combined with counseling. These medications reduce cravings and withdrawal symptoms, significantly improving recovery outcomes.",
  },
  {
    question: "How long does fentanyl rehab take?",
    answer: "Treatment typically starts with 5-10 days of medical detox, followed by 30-90 days of inpatient or residential treatment. Many people continue with outpatient programs for 6-12 months. Long-term MAT maintenance may continue for years.",
  },
  {
    question: "Does insurance cover fentanyl addiction treatment?",
    answer: "Yes, most health insurance plans cover opioid addiction treatment under mental health parity laws. This includes detox, inpatient care, outpatient programs, and medications like Suboxone. Medicaid and Medicare also cover treatment.",
  },
];

export default function FentanylRehabNearMe() {
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

  // Filter facilities - prioritize those offering detox and MAT
  const facilities = useMemo(() => {
    let filtered = approvedFacilities;
    
    if (stateData) {
      filtered = filtered.filter(f => 
        f.state.toLowerCase() === stateData.name.toLowerCase() ||
        f.state.toLowerCase() === stateData.abbr.toLowerCase()
      );
    }

    // Prioritize facilities with detox services
    return filtered.sort((a, b) => {
      const aHasDetox = a.treatmentTypes?.some(t => 
        t.toLowerCase().includes('detox')
      ) ? 1 : 0;
      const bHasDetox = b.treatmentTypes?.some(t => 
        t.toLowerCase().includes('detox')
      ) ? 1 : 0;
      return bHasDetox - aHasDetox;
    });
  }, [approvedFacilities, stateData]);

  useEffect(() => {
    if (!stateSlug && !userLocation) {
      // Auto-detect location silently on mount
    }
  }, [stateSlug, userLocation]);

  const faqs = getFentanylRehabFAQs(stateData ? { state: stateData.name } : undefined);

  const structuredData = [
    generateNearMeSchema({
      serviceType: "Fentanyl Addiction Treatment Centers",
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
        title={`Fentanyl Rehab Near Me ${stateData ? `in ${stateData.name}` : ""} | Opioid Addiction Treatment`}
        description={`Find fentanyl addiction treatment centers${stateData ? ` in ${stateData.name}` : " near you"}. Medical detox, MAT (Suboxone/Methadone), 24/7 monitoring. Get help for opioid addiction today.`}
        canonical={stateSlug ? `/fentanyl-rehab-near-me/${stateSlug}` : "/fentanyl-rehab-near-me"}
        keywords={[
          "fentanyl rehab near me",
          "fentanyl addiction treatment",
          "opioid rehab",
          "fentanyl detox",
          "suboxone treatment",
          "MAT treatment",
          "opioid addiction help",
          "fentanyl withdrawal treatment",
          "heroin and fentanyl rehab",
          ...(stateData ? [
            `fentanyl rehab ${stateData.name}`,
            `opioid treatment ${stateData.abbr}`,
            `suboxone clinic ${stateData.name}`,
          ] : []),
        ]}
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Options", url: "/treatment-types" },
          { name: "Fentanyl Rehab", url: "/fentanyl-rehab-near-me" },
          ...(stateData ? [{ name: stateData.name, url: `/fentanyl-rehab-near-me/${stateData.slug}` }] : []),
        ]}
      />

      <NearMeHero
        title={`Fentanyl Rehab Near Me${stateData ? ` in ${stateData.name}` : ""}`}
        subtitle={`Find specialized fentanyl and opioid addiction treatment${stateData ? ` in ${stateData.name}` : " near you"}. Medical detox, medication-assisted treatment, and evidence-based recovery programs.`}
        treatmentType="Fentanyl Addiction Treatment"
        location={stateData ? { state: stateData.name, stateAbbr: stateData.abbr } : undefined}
        facilityCount={facilities.length}
      />

      {/* Urgent Notice */}
      <section className="py-6 bg-background">
        <div className="container">
          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Fentanyl is extremely dangerous.</strong> Never attempt to detox alone. Medical supervision is critical for safe withdrawal. If someone is experiencing an overdose, call 911 immediately and administer naloxone (Narcan) if available.
            </AlertDescription>
          </Alert>
        </div>
      </section>

      {/* Treatment Features */}
      <section className="py-12 bg-muted/30">
        <div className="container">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Fentanyl Treatment Options
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6">
                <Clock className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Medical Detox</h3>
                <p className="text-sm text-muted-foreground">24/7 monitored detox with medications to manage withdrawal safely</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Pill className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">MAT Programs</h3>
                <p className="text-sm text-muted-foreground">Suboxone, methadone, and Vivitrol to reduce cravings and withdrawal</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Heart className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Inpatient Care</h3>
                <p className="text-sm text-muted-foreground">Residential treatment with round-the-clock support and therapy</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <AlertTriangle className="h-8 w-8 text-primary mb-3" />
                <h3 className="font-semibold mb-2">Overdose Prevention</h3>
                <p className="text-sm text-muted-foreground">Narcan training and harm reduction education</p>
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
              Fentanyl Treatment Centers {stateData ? `in ${stateData.name}` : "Near You"}
            </h2>
            <p className="mt-2 text-muted-foreground">
              Facilities offering medical detox and MAT for fentanyl and opioid addiction.
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

              {facilities.length > 12 && (
                <div className="mt-8 text-center">
                  <Link to={`/search-results${stateData ? `?state=${stateData.name}&treatment=Detox` : "?treatment=Detox"}`}>
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

      {/* State Links */}
      {!stateSlug && (
        <section className="py-12 bg-muted/30 border-t">
          <div className="container">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Fentanyl Rehab by State
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {statesData.slice(0, 20).map((state) => (
                <Link
                  key={state.slug}
                  to={`/fentanyl-rehab-near-me/${state.slug}`}
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
        treatmentType="Fentanyl Rehab"
        location={stateData ? { state: stateData.name } : undefined}
      />
    </Layout>
  );
}
