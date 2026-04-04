import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { StateLinksSection } from "@/components/treatment/StateLinksSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  Sparkles,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  AlertTriangle,
  Brain,
  Activity,
  Stethoscope,
  Users,
  HelpCircle,
  ChevronDown,
  Pill,
  Timer,
  HeartPulse,
  Thermometer,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";

const detoxTypes = [
  {
    name: "Alcohol Detox",
    duration: "3-7 days",
    description: "Medically supervised withdrawal from alcohol with medication support to prevent dangerous complications like seizures and delirium tremens (DTs).",
    features: ["Benzodiazepine protocols", "Vital sign monitoring", "Nutritional support", "Seizure prevention"],
  },
  {
    name: "Opioid Detox",
    duration: "5-10 days",
    description: "Safe withdrawal from heroin, fentanyl, and prescription opioids using medication-assisted treatment to reduce cravings and symptoms.",
    features: ["Suboxone/Subutex protocols", "Comfort medications", "MAT transition planning", "Craving management"],
  },
  {
    name: "Benzodiazepine Detox",
    duration: "2-8 weeks",
    description: "Gradual tapering from Xanax, Valium, Klonopin requiring extended medical supervision due to severe withdrawal risks.",
    features: ["Slow tapering schedules", "Cross-tolerant medications", "Anxiety management", "Extended monitoring"],
  },
  {
    name: "Stimulant Detox",
    duration: "1-2 weeks",
    description: "Medical support during cocaine and methamphetamine withdrawal focusing on sleep, nutrition, and psychiatric symptoms.",
    features: ["Sleep support", "Nutritional rehabilitation", "Depression monitoring", "Psychiatric evaluation"],
  },
];

const detoxProcess = [
  {
    step: 1,
    title: "Intake Assessment",
    description: "Comprehensive medical and psychological evaluation to create a personalized detox plan.",
    icon: Stethoscope,
  },
  {
    step: 2,
    title: "Stabilization",
    description: "Medical team manages withdrawal symptoms with medications and 24/7 monitoring.",
    icon: HeartPulse,
  },
  {
    step: 3,
    title: "Symptom Management",
    description: "Comfort medications, hydration, nutrition, and emotional support throughout withdrawal.",
    icon: Thermometer,
  },
  {
    step: 4,
    title: "Treatment Transition",
    description: "Seamless transition to inpatient or outpatient rehab for continued recovery.",
    icon: ArrowRight,
  },
];

const withdrawalSymptoms = [
  { substance: "Alcohol", symptoms: ["Tremors", "Anxiety", "Sweating", "Nausea", "Seizures (severe)", "Delirium tremens (severe)"] },
  { substance: "Opioids", symptoms: ["Muscle aches", "Insomnia", "Nausea/vomiting", "Diarrhea", "Intense cravings", "Anxiety"] },
  { substance: "Benzodiazepines", symptoms: ["Panic attacks", "Tremors", "Insomnia", "Seizures", "Perceptual disturbances", "Rebound anxiety"] },
  { substance: "Stimulants", symptoms: ["Fatigue", "Depression", "Increased appetite", "Sleep disturbances", "Vivid dreams", "Cognitive impairment"] },
];

const faqs = [
  {
    question: "What is medical detox and why is it important?",
    answer: "Medical detox is supervised withdrawal from drugs or alcohol in a clinical setting with 24/7 medical care. It's important because withdrawal can be dangerous—alcohol and benzodiazepine withdrawal can cause life-threatening seizures, and opioid withdrawal, while rarely fatal, causes severe discomfort that often leads to relapse. Medical detox ensures safety, manages symptoms with medications, and provides the foundation for successful treatment."
  },
  {
    question: "How long does detox take?",
    answer: "Detox duration depends on the substance. Alcohol detox typically takes 3-7 days. Opioid detox lasts 5-10 days. Stimulant detox runs 1-2 weeks. Benzodiazepine detox requires the longest—2-8 weeks due to the need for gradual tapering. Factors affecting duration include length of use, amount used, overall health, and whether multiple substances are involved."
  },
  {
    question: "Can I detox at home?",
    answer: "Home detox is not recommended for most substances due to serious health risks. Alcohol and benzodiazepine withdrawal can cause fatal seizures. Opioid withdrawal, while not typically life-threatening, causes such severe symptoms that most people relapse without medical support. Medical detox provides 24/7 monitoring, medication management, and significantly higher success rates for completing withdrawal and entering treatment."
  },
  {
    question: "What medications are used during detox?",
    answer: "Medications vary by substance. Alcohol detox uses benzodiazepines (Librium, Ativan) to prevent seizures. Opioid detox uses Suboxone (buprenorphine), methadone, or clonidine to manage withdrawal. Benzodiazepine detox involves gradual dose reduction. All detox may include anti-nausea medications, sleep aids, anti-anxiety medications, and vitamins. Medication-assisted treatment (MAT) often continues after detox."
  },
  {
    question: "Does insurance cover detox programs?",
    answer: "Yes, the Affordable Care Act and Mental Health Parity Act require most insurance plans to cover detox as part of substance abuse treatment. This includes private insurance, employer plans, Medicaid, and Medicare. Coverage typically includes medical detox, medications, monitoring, and transition to ongoing treatment. Contact your insurance provider or the treatment facility to verify specific benefits."
  },
  {
    question: "What happens after detox?",
    answer: "Detox is only the first step—it addresses physical dependence but not the psychological aspects of addiction. After detox, most people transition to residential inpatient treatment (30-90 days), partial hospitalization (PHP), or intensive outpatient (IOP). Continuing with comprehensive treatment after detox dramatically improves long-term recovery success. Quality detox programs facilitate seamless transitions to the appropriate level of care."
  },
];

const DetoxPrograms = () => {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);
  const { data: approvedFacilities = [] } = useStaticFacilities();

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
      "name": "Drug & Alcohol Detox Programs",
      "description": "Find medical detox centers offering supervised withdrawal from alcohol, opioids, benzodiazepines, and other substances with 24/7 medical care.",
      "url": "https://rehablookup.com/treatment-types/detox-programs",
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
        title="Detox Centers & Medical Detox Programs | Drug & Alcohol Detox"
        description="Find medical detox centers near you. Safe, supervised withdrawal from alcohol, opioids, benzos & more with 24/7 medical care. Insurance accepted."
        canonical="/treatment-types/detox-programs"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Detox Programs", url: "/treatment-types/detox-programs" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
        <MedicalPatternBackground />
          <nav className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <Link to="/treatment-types" className="text-white/70 hover:text-white transition-colors">Treatment Types</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">Detox Programs</span>
            </span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Medical Detox Centers</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Drug & Alcohol Detox Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Medical detox provides safe, supervised withdrawal from drugs and alcohol with 24/7 medical monitoring. 
              The essential first step to recovery, detox manages dangerous withdrawal symptoms and prepares you for treatment.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/concierge">
                <Button size="lg" variant="secondary" className="gap-2 w-full sm:w-auto">
                  <Phone className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto border-white/30 text-white hover:bg-white/10">
                  Browse Detox Centers
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
              <span>Medically Supervised</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Medical Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Detox Types */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Types of Medical Detox Programs
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Specialized detox protocols for different substances with varying withdrawal timelines
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {detoxTypes.map((detox) => (
              <div
                key={detox.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                    <Pill className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {detox.name}
                      </h3>
                      <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded-full flex items-center gap-1">
                        <Timer className="h-3 w-3" />
                        {detox.duration}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {detox.description}
                    </p>
                    <ul className="mt-3 grid grid-cols-2 gap-1">
                      {detox.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-xs text-foreground">
                          <CheckCircle className="h-3 w-3 text-accent shrink-0" />
                          {feature}
                        </li>
                      ))
                      }
                    </ul>
                  </div>
                </div>
              </div>
            ))
            }
          </div>
        </div>
      </section>

      {/* Detox Process */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              The Medical Detox Process
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              What to expect during your detox program from intake to treatment transition
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {detoxProcess.map((step) => (
              <div
                key={step.step}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow relative"
              >
                <div className="absolute -top-3 left-4 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.step}
                </div>
                <div className="flex items-center gap-3 mb-2 mt-1">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <step.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{step.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-12">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Withdrawal Symptoms */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Withdrawal Symptoms by Substance
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Medical detox manages these symptoms safely—never attempt withdrawal alone
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {withdrawalSymptoms.map((item) => (
              <div key={item.substance} className="rounded-xl border bg-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <h3 className="font-semibold text-foreground">{item.substance}</h3>
                </div>
                <ul className="space-y-1.5">
                  {item.symptoms.map((symptom) => (
                    <li key={symptom} className="text-sm text-muted-foreground flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-muted-foreground shrink-0" />
                      {symptom}
                    </li>
                  ))
                  }
                </ul>
              </div>
            ))
            }
          </div>

          <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-center">
            <p className="text-sm text-destructive font-medium">
              ⚠️ Alcohol and benzodiazepine withdrawal can be life-threatening. Always detox under medical supervision.
            </p>
          </div>
        </div>
      </section>

      {/* Related Centers - Only show when centers available */}
      {relatedCenters.length > 0 && (
        <section className="bg-secondary/30 section-padding">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Detox Centers Near You
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Verified facilities offering medical detox programs
                </p>
              </div>
              <Link to="/rehab-centers">
                <Button variant="outline" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Horizontal scroll on mobile, grid on larger screens */}
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0 -mx-4 px-4 md:mx-0 md:px-0">
              {relatedCenters.map((center) => (
                <div key={center.id} className="flex-shrink-0 w-[300px] md:w-auto snap-center">
                  <TreatmentCenterCard center={center} />
                </div>
              ))}
            </div>
            {/* Scroll indicator for mobile */}
            <div className="flex justify-center gap-1.5 mt-3 md:hidden">
              <span className="text-[10px] text-muted-foreground/70">← Swipe →</span>
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section className="border-t bg-card section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Frequently Asked Questions
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Detox Program FAQs
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
              ))
              }
            </div>
          </div>
        </div>
      </section>

      <StateLinksSection
        title="Find Detox Centers by State"
        subtitle="Browse medical detox programs in your state"
        basePath="/treatment-types/detox-programs"
        buttonPrefix="Detox in"
      />

      {/* Other Treatment Types */}
      <section className="border-t section-padding-sm">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Continue Your Recovery Journey
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Inpatient Rehab
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" className="gap-2">
                <Activity className="h-4 w-4" />
                Outpatient Programs
              </Button>
            </Link>
            <Link to="/treatment-types/drug-addiction">
              <Button variant="outline" className="gap-2">
                <Pill className="h-4 w-4" />
                Drug Treatment
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
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Ready to Start Detox?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our team can help you find a safe, medically supervised detox program that accepts your insurance.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Find Treatment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default DetoxPrograms;
