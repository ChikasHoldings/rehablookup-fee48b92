import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  Pill,
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
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const substanceTypes = [
  {
    name: "Opioid Addiction",
    description: "Treatment for heroin, fentanyl, prescription painkillers (oxycodone, hydrocodone)",
    features: ["Medication-Assisted Treatment (MAT)", "Suboxone/Methadone programs", "Pain management alternatives"],
  },
  {
    name: "Stimulant Addiction",
    description: "Treatment for cocaine, methamphetamine, prescription stimulants (Adderall, Ritalin)",
    features: ["Behavioral therapy focus", "Contingency management", "Cognitive behavioral therapy"],
  },
  {
    name: "Benzodiazepine Addiction",
    description: "Treatment for Xanax, Valium, Klonopin, and other anti-anxiety medications",
    features: ["Medical detox essential", "Gradual tapering protocols", "Anxiety disorder treatment"],
  },
  {
    name: "Cannabis Addiction",
    description: "Treatment for marijuana use disorder and synthetic cannabinoids",
    features: ["Motivational enhancement", "Outpatient programs", "Relapse prevention"],
  },
];

const treatmentApproaches = [
  {
    icon: Stethoscope,
    title: "Medical Detoxification",
    description: "Safe, medically supervised withdrawal management with 24/7 monitoring and medication support to ease symptoms.",
  },
  {
    icon: Brain,
    title: "Cognitive Behavioral Therapy",
    description: "Evidence-based therapy that helps identify and change negative thought patterns and behaviors related to drug use.",
  },
  {
    icon: Users,
    title: "Group Therapy",
    description: "Peer support sessions that build connection, accountability, and shared learning in recovery.",
  },
  {
    icon: Heart,
    title: "Family Therapy",
    description: "Healing family relationships and building a supportive home environment for lasting recovery.",
  },
];

const faqs = [
  {
    question: "What drugs are treated in drug addiction programs?",
    answer: "Drug addiction treatment programs address all substances including opioids (heroin, fentanyl, prescription painkillers), stimulants (cocaine, methamphetamine, Adderall), benzodiazepines (Xanax, Valium), cannabis, hallucinogens, and synthetic drugs. Many programs specialize in specific substances while offering comprehensive care for polysubstance use."
  },
  {
    question: "How long does drug rehab take?",
    answer: "Drug rehab duration varies based on individual needs. Detox typically lasts 5-10 days depending on the substance. Short-term residential programs run 28-30 days, while long-term programs last 60-90+ days. Research shows treatment lasting 90 days or longer produces significantly better outcomes. Outpatient programs typically span 8-16 weeks with ongoing aftercare."
  },
  {
    question: "What is Medication-Assisted Treatment (MAT)?",
    answer: "MAT combines FDA-approved medications with counseling and behavioral therapies to treat substance use disorders. For opioid addiction, medications like Suboxone (buprenorphine), methadone, and Vivitrol (naltrexone) reduce cravings and withdrawal symptoms. MAT is considered the gold standard for opioid addiction treatment and significantly improves recovery outcomes."
  },
  {
    question: "Does insurance cover drug addiction treatment?",
    answer: "Yes, under the Affordable Care Act and Mental Health Parity Act, most insurance plans must cover substance abuse treatment as an essential health benefit. This includes private insurance, employer plans, Medicaid, and Medicare. Coverage typically includes detox, residential treatment, outpatient programs, and medication-assisted treatment. Verify benefits with your provider."
  },
  {
    question: "What happens during drug detox?",
    answer: "Medical detox provides safe, supervised withdrawal from drugs. You'll receive 24/7 medical monitoring, medications to manage withdrawal symptoms, nutritional support, and emotional care. Withdrawal timelines vary by substance—opioid withdrawal peaks at 1-3 days, benzodiazepine withdrawal can take weeks. Medical detox significantly reduces health risks and discomfort."
  },
];

const DrugAddictionTreatment = () => {
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
      "name": "Drug Addiction Treatment Programs",
      "description": "Comprehensive guide to drug addiction treatment including detox, residential rehab, outpatient programs, and medication-assisted treatment.",
      "url": "https://rehablookup.com/treatment-types/drug-addiction",
      "about": {
        "@type": "MedicalCondition",
        "name": "Substance Use Disorder"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Drug Addiction Treatment Programs | Detox, Rehab & Recovery"
        description="Find drug addiction treatment programs including medical detox, residential rehab, outpatient care, and medication-assisted treatment for opioids, stimulants, and more."
        canonical="/treatment-types/drug-addiction-treatment"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Drug Addiction", url: "/treatment-types/drug-addiction-treatment" },
        ]}
      />

      {/* Hero Section */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container">
          <nav className="mb-5 text-center">
            <span className="inline-flex items-center gap-2 text-sm whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <Link to="/treatment-types" className="text-white/70 hover:text-white transition-colors">Treatment Types</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">Drug Addiction</span>
            </span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Pill className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Drug Treatment Programs</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Drug Addiction Treatment Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Comprehensive treatment programs for substance use disorders including opioids, stimulants, 
              benzodiazepines, and other drugs. Find evidence-based care from medical detox to long-term recovery support.
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
                  Find Treatment Centers
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
              <span>Evidence-Based Treatment</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Medical Support</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Substance Types */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Types of Drug Addiction We Treat
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Specialized treatment programs for different substances and their unique challenges
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {substanceTypes.map((substance) => (
              <div
                key={substance.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {substance.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {substance.description}
                    </p>
                    <ul className="mt-3 space-y-1">
                      {substance.features.map((feature) => (
                        <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                          <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Approaches */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Evidence-Based Treatment Approaches
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Proven methods used in drug addiction treatment programs
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {treatmentApproaches.map((approach) => (
              <div
                key={approach.title}
                className="rounded-xl border bg-card p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                    <approach.icon className="h-4 w-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{approach.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-12">{approach.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Related Centers - Only show when centers available */}
      {relatedCenters.length > 0 && (
        <section className="section-padding">
          <div className="container">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Drug Addiction Treatment Centers
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Verified facilities offering drug addiction treatment
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
                Drug Addiction Treatment FAQs
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
      <section className="border-t bg-secondary/30 section-padding-sm">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Explore Other Treatment Types
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/treatment-types/alcohol-rehabilitation">
              <Button variant="outline" className="gap-2">
                <Activity className="h-4 w-4" />
                Alcohol Rehabilitation
              </Button>
            </Link>
            <Link to="/treatment-types/dual-diagnosis">
              <Button variant="outline" className="gap-2">
                <Brain className="h-4 w-4" />
                Dual Diagnosis
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
              Ready to Start Your Recovery?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find the right drug addiction treatment program for your needs.
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

export default DrugAddictionTreatment;
