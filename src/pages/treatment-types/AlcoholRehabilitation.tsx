import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  Activity,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Brain,
  Pill,
  Stethoscope,
  Users,
  HelpCircle,
  ChevronDown,
  Wine,
  AlertCircle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programTypes = [
  {
    title: "Medical Detox",
    duration: "5-10 days",
    description:
      "Safe, medically supervised alcohol withdrawal with medication management to prevent dangerous complications like seizures and delirium tremens.",
    features: [
      "24/7 medical monitoring",
      "Medication support",
      "Vital sign tracking",
      "Nutritional therapy",
    ],
  },
  {
    title: "Residential Inpatient",
    duration: "30-90 days",
    description:
      "Immersive treatment in a structured environment with round-the-clock care, therapy, and peer support.",
    features: [
      "Individual therapy",
      "Group counseling",
      "Life skills training",
      "Aftercare planning",
    ],
  },
  {
    title: "Partial Hospitalization (PHP)",
    duration: "2-4 weeks",
    description:
      "Intensive daytime treatment while living at home or sober living, providing a step-down from inpatient care.",
    features: [
      "5-7 days per week",
      "6+ hours daily",
      "Medical oversight",
      "Structured programming",
    ],
  },
  {
    title: "Intensive Outpatient (IOP)",
    duration: "8-12 weeks",
    description:
      "Flexible treatment allowing you to maintain work and family commitments while receiving comprehensive care.",
    features: [
      "3-5 days per week",
      "3+ hours daily",
      "Evening options",
      "Ongoing support",
    ],
  },
];

const warningSignsData = [
  "Drinking more or longer than intended",
  "Unsuccessful attempts to cut down or stop",
  "Spending significant time obtaining, using, or recovering from alcohol",
  "Craving alcohol when not drinking",
  "Failing to fulfill work, school, or home obligations",
  "Continuing to drink despite relationship problems",
  "Giving up important activities due to drinking",
  "Drinking in dangerous situations",
  "Developing tolerance (needing more to feel effects)",
  "Experiencing withdrawal symptoms when not drinking",
];

const faqs = [
  {
    question: "How long does alcohol rehab take?",
    answer:
      "Alcohol rehab duration varies by individual needs and program type. Medical detox typically lasts 5-10 days. Residential programs run 30-90 days, with research showing 90+ day programs produce significantly better outcomes. Outpatient programs span 8-16 weeks. Most people benefit from continuing care through support groups and therapy after completing primary treatment.",
  },
  {
    question: "Is alcohol detox dangerous?",
    answer:
      "Alcohol withdrawal can be medically dangerous and potentially life-threatening. Severe complications include seizures (occurring in 5-15% of cases), delirium tremens (DTs), and cardiac events. Medical detox provides 24/7 monitoring and medications to manage symptoms safely. Never attempt to detox from heavy alcohol use without medical supervision.",
  },
  {
    question: "What medications are used in alcohol treatment?",
    answer:
      "FDA-approved medications for alcohol use disorder include: Naltrexone (Vivitrol) - reduces cravings and blocks alcohol's pleasurable effects; Acamprosate (Campral) - helps maintain abstinence by reducing post-acute withdrawal symptoms; Disulfiram (Antabuse) - creates unpleasant reactions if alcohol is consumed. During detox, benzodiazepines may be used to prevent seizures.",
  },
  {
    question: "Does insurance cover alcohol rehab?",
    answer:
      "Yes, the Affordable Care Act and Mental Health Parity Act require most insurance plans to cover alcohol addiction treatment as an essential health benefit. Coverage includes detox, residential treatment, outpatient programs, and medications. Private insurance, employer plans, Medicaid, and Medicare all provide coverage, though specific benefits vary by plan.",
  },
  {
    question: "What is the success rate of alcohol rehab?",
    answer:
      "Success rates vary based on multiple factors including program quality, treatment duration, and aftercare engagement. Studies show 40-60% of people who complete quality treatment maintain sobriety at one year. Success improves significantly with treatment lasting 90+ days, active participation in support groups, and comprehensive aftercare. Recovery is a long-term process, and many achieve lasting sobriety after multiple treatment attempts.",
  },
];

const AlcoholRehabilitation = () => {
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
      "name": "Alcohol Rehabilitation Programs",
      "description":
        "Comprehensive guide to alcohol addiction treatment including medical detox, residential rehab, outpatient programs, and medication-assisted treatment.",
      "url": "https://rehablookup.com/treatment-types/alcohol-rehabilitation",
      "about": {
        "@type": "MedicalCondition",
        "name": "Alcohol Use Disorder"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Alcohol Rehabilitation Programs | Detox, Inpatient & Outpatient Rehab"
        description="Find alcohol rehab programs including medical detox, residential inpatient, PHP, and IOP. Get evidence-based treatment for alcohol use disorder and start recovery."
        canonical="/treatment-types/alcohol-rehabilitation"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Alcohol Rehabilitation", url: "/treatment-types/alcohol-rehabilitation" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Alcohol Rehabilitation" },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Activity className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Alcohol Treatment Programs</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Alcohol Rehabilitation Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Evidence-based alcohol addiction treatment from medical detox through long-term recovery. 
              Find the right level of care including inpatient, outpatient, and medication-assisted treatment options.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Link to="/rehab-centers">
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
              <span>Medical Detox Available</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Care Options</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Related Centers - Immediately after trust bar */}
      {relatedCenters.length > 0 && (
        <section className="py-10 md:py-14 bg-gradient-to-b from-background to-muted/20">
          <div className="container">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">
                  Alcohol Treatment Centers
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Verified facilities offering alcohol rehabilitation
                </p>
              </div>
              <Link to="/rehab-centers">
                <Button variant="outline" size="sm" className="gap-2">
                  View All
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <div className="grid gap-4 md:gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {relatedCenters.map((center) => (
                <TreatmentCenterCard key={center.id} center={center} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Program Types */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Levels of Alcohol Treatment Care
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              From medical detox to outpatient support, find the right intensity of care for your recovery
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {programTypes.map((program) => (
              <div
                key={program.title}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Wine className="h-6 w-6 text-primary" />
                  </div>
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                    {program.duration}
                  </span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {program.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {program.description}
                </p>
                <ul className="mt-4 grid grid-cols-2 gap-2">
                  {program.features.map((feature) => (
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

      {/* Warning Signs */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive">
                <AlertCircle className="h-4 w-4" />
                Signs of Alcohol Use Disorder
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                Do You Need Alcohol Treatment?
              </h2>
              <p className="mt-2 text-muted-foreground">
                Meeting 2+ criteria may indicate alcohol use disorder. More criteria = higher severity.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {warningSignsData.map((sign, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border bg-card p-4"
                >
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-sm font-semibold text-destructive">
                    {index + 1}
                  </div>
                  <span className="text-sm text-foreground">{sign}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link to="/concierge">
                <Button size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get a Free Assessment
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>


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
                Alcohol Rehabilitation FAQs
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
            <Link to="/treatment-types/drug-addiction-treatment">
              <Button variant="outline" className="gap-2">
                <Pill className="h-4 w-4" />
                Drug Addiction Treatment
              </Button>
            </Link>
            <Link to="/treatment-types/dual-diagnosis-treatment">
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
              Take the First Step Toward Sobriety
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find the right alcohol treatment program for your needs.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/rehab-centers">
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

export default AlcoholRehabilitation;
