import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useApprovedFacilities } from "@/hooks/useApprovedFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Brain,
  Pill,
  Activity,
  HelpCircle,
  ChevronDown,
  AlertTriangle,
  Thermometer,
  Syringe,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const detoxTypes = [
  {
    title: "Alcohol Detox",
    duration: "5-10 days",
    description:
      "Medically supervised withdrawal from alcohol with medications to prevent seizures and manage symptoms like anxiety and tremors.",
    features: [
      "Benzodiazepine protocols",
      "Seizure prevention",
      "Vital sign monitoring",
      "IV fluid therapy",
    ],
  },
  {
    title: "Opioid Detox",
    duration: "5-14 days",
    description:
      "Safe withdrawal from heroin, fentanyl, or prescription opioids using FDA-approved medications to minimize discomfort.",
    features: [
      "Medication-assisted treatment",
      "Suboxone/Subutex protocols",
      "Pain management",
      "Comfort medications",
    ],
  },
  {
    title: "Benzodiazepine Detox",
    duration: "2-8 weeks",
    description:
      "Gradual, medically-managed tapering from benzos to prevent dangerous withdrawal complications.",
    features: [
      "Slow tapering protocols",
      "Cross-over medications",
      "Seizure monitoring",
      "Extended care",
    ],
  },
  {
    title: "Stimulant Detox",
    duration: "3-7 days",
    description:
      "Supportive care for cocaine, methamphetamine, and other stimulant withdrawal with focus on psychiatric stabilization.",
    features: [
      "Sleep restoration",
      "Nutritional support",
      "Psychiatric evaluation",
      "Depression management",
    ],
  },
];

const withdrawalSymptoms = [
  { substance: "Alcohol", symptoms: "Tremors, anxiety, seizures, hallucinations, delirium tremens" },
  { substance: "Opioids", symptoms: "Muscle aches, nausea, vomiting, diarrhea, intense cravings" },
  { substance: "Benzodiazepines", symptoms: "Anxiety, insomnia, seizures, psychosis, muscle spasms" },
  { substance: "Stimulants", symptoms: "Depression, fatigue, increased appetite, vivid dreams" },
];

const faqs = [
  {
    question: "Is medical detox dangerous?",
    answer:
      "Medical detox itself is safe when properly supervised. However, attempting to detox at home without medical support can be dangerous or even fatal, especially for alcohol and benzodiazepines. Medical detox provides 24/7 monitoring, medications to manage withdrawal, and emergency intervention if needed. This is why professional medical detox is always recommended over self-detox.",
  },
  {
    question: "How long does detox take?",
    answer:
      "Detox duration varies by substance: Alcohol typically takes 5-10 days. Opioids range from 5-14 days. Benzodiazepines may require 2-8 weeks due to the need for gradual tapering. Stimulants usually clear in 3-7 days. Individual factors like usage duration, amounts used, and overall health also affect timeline.",
  },
  {
    question: "What medications are used in detox?",
    answer:
      "Common medications include: Benzodiazepines (for alcohol withdrawal and seizure prevention), Buprenorphine/Suboxone (for opioid withdrawal), Clonidine (for anxiety and physical symptoms), Antiemetics (for nausea), Sleep aids, and various comfort medications. The specific protocol depends on the substance and individual needs.",
  },
  {
    question: "Does insurance cover medical detox?",
    answer:
      "Yes, most insurance plans cover medical detox as it's considered medically necessary treatment. The Affordable Care Act requires coverage of substance abuse treatment. Medicaid, Medicare, and private insurance all typically cover detox services. Coverage specifics vary by plan, so verification is recommended.",
  },
  {
    question: "What happens after detox?",
    answer:
      "Detox is only the first step in recovery. After completing detox, patients typically transition to continued treatment—either residential inpatient, partial hospitalization (PHP), or intensive outpatient (IOP) programs. This ongoing treatment addresses the psychological aspects of addiction and builds skills for long-term recovery. Research shows that detox alone has poor long-term success rates without follow-up treatment.",
  },
];

const MedicalDetox = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const { data: approvedFacilities = [] } = useApprovedFacilities();

  const relatedCenters = useMemo(() => {
    const allCenters = [...treatmentCenters, ...approvedFacilities];
    return allCenters.slice(0, 6);
  }, [approvedFacilities]);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "MedicalWebPage",
      "name": "Medical Detox Programs",
      "description": "Comprehensive guide to medical detoxification for alcohol, opioids, benzodiazepines, and stimulants. Safe, medically supervised withdrawal management.",
      "url": "https://rehablookup.com/treatment-types/medical-detox",
      "about": {
        "@type": "MedicalProcedure",
        "name": "Medical Detoxification"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Medical Detox Programs | Safe, Medically Supervised Detoxification"
        description="Find medical detox programs with 24/7 supervision for alcohol, opioid, and benzodiazepine withdrawal. Safe, comfortable detoxification with medication support."
        canonical="/treatment-types/medical-detox"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Medical Detox", url: "/treatment-types/medical-detox" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container">
          <nav className="mb-5 flex items-center gap-2 text-sm text-white/70">
            <Link to="/" className="hover:text-white transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link to="/treatment-types" className="hover:text-white transition-colors">Treatment Types</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-white font-medium">Medical Detox</span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Thermometer className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Medical Detoxification</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Medical Detox Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Safe, medically supervised detoxification with 24/7 monitoring and medication support. 
              The essential first step to recovery from alcohol, opioids, benzodiazepines, and other substances.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/request-help">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Find Detox Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>24/7 Medical Supervision</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Syringe className="h-4 w-4 text-accent" />
              <span>FDA-Approved Medications</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Comfort-Focused Care</span>
            </div>
          </div>
        </div>
      </section>

      {/* Detox Types */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Types of Medical Detox
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Specialized detox protocols for different substances, tailored to your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {detoxTypes.map((detox) => (
              <div
                key={detox.title}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Thermometer className="h-6 w-6 text-primary" />
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                    {detox.duration}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {detox.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {detox.description}
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {detox.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Withdrawal Symptoms Warning */}
      <section className="bg-secondary/30 py-12 md:py-16">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Why Medical Supervision Matters
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Withdrawal Can Be Dangerous
              </h2>
              <p className="mt-2 text-muted-foreground">
                Never attempt to detox from these substances without medical supervision
              </p>
            </div>

            <div className="space-y-3">
              {withdrawalSymptoms.map((item) => (
                <div
                  key={item.substance}
                  className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 rounded-lg border bg-card p-4"
                >
                  <span className="font-semibold text-foreground min-w-[120px]">{item.substance}:</span>
                  <span className="text-sm text-muted-foreground">{item.symptoms}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link to="/request-help">
                <Button size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get Safe Detox Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Related Centers */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-foreground">
                Medical Detox Centers
              </h2>
              <p className="mt-1 text-muted-foreground">
                Verified facilities offering medical detoxification
              </p>
            </div>
            <Link to="/rehab-centers">
              <Button variant="outline" className="gap-2">
                View All
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {relatedCenters.map((center) => (
              <TreatmentCenterCard key={center.id} center={center} />
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="border-t bg-card py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Medical Detox FAQs
              </h2>
            </div>

            <div className="space-y-3">
              {faqs.map((faq, index) => (
                <div
                  key={index}
                  className="rounded-xl border bg-background overflow-hidden transition-shadow hover:shadow-md"
                >
                  <button
                    onClick={() => setOpenFAQ(openFAQ === index ? null : index)}
                    className="flex w-full items-center justify-between p-5 text-left"
                  >
                    <span className="font-semibold text-foreground pr-4">{faq.question}</span>
                    <ChevronDown 
                      className={cn(
                        "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                        openFAQ === index && "rotate-180 text-primary"
                      )} 
                    />
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-200 ease-in-out",
                      openFAQ === index ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-5 text-muted-foreground leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Other Treatment Types */}
      <section className="border-t bg-secondary/30 py-10">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Continue Your Recovery Journey
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" className="gap-2">
                <Activity className="h-4 w-4" />
                Residential Inpatient
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" className="gap-2">
                <Clock className="h-4 w-4" />
                Outpatient Programs
              </Button>
            </Link>
            <Link to="/treatment-types">
              <Button variant="outline" className="gap-2">
                All Treatment Types
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
            Ready to Start Detox?
          </h2>
          <p className="mb-6 text-primary-foreground/80 max-w-xl mx-auto">
            Our team can help you find a medical detox program that's right for you. Free, confidential support available 24/7.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link to="/request-help">
              <Button size="lg" variant="secondary" className="gap-2">
                <Phone className="h-4 w-4" />
                Get Help Now
              </Button>
            </Link>
            <Link to="/rehab-centers">
              <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                Browse Detox Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default MedicalDetox;
