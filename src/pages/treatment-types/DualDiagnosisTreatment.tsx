import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { StateLinksSection } from "@/components/treatment/StateLinksSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  Brain,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  ChevronRight,
  Pill,
  Activity,
  Stethoscope,
  Users,
  HelpCircle,
  ChevronDown,
  Sparkles,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const mentalHealthConditions = [
  {
    name: "Depression & Addiction",
    description:
      "Co-occurring major depressive disorder with substance use. Depression can trigger substance abuse as self-medication, while substance abuse worsens depression.",
    prevalence: "~33% of people with depression have a substance use disorder",
  },
  {
    name: "Anxiety & Addiction",
    description:
      "Co-occurring anxiety disorders (GAD, panic disorder, social anxiety) with substance use. Alcohol and drugs often used to cope with anxiety symptoms.",
    prevalence: "~20% of people with anxiety disorders have a substance use disorder",
  },
  {
    name: "PTSD & Addiction",
    description:
      "Post-traumatic stress disorder frequently co-occurs with addiction, especially among veterans and trauma survivors seeking relief from symptoms.",
    prevalence: "~46% of people with PTSD also have a substance use disorder",
  },
  {
    name: "Bipolar Disorder & Addiction",
    description:
      "The mood swings of bipolar disorder often lead to substance abuse during manic or depressive episodes, creating a complex treatment challenge.",
    prevalence: "~56% of people with bipolar disorder have experienced addiction",
  },
];

const treatmentComponents = [
  {
    icon: Stethoscope,
    title: "Integrated Assessment",
    description:
      "Comprehensive psychiatric and addiction evaluation to understand the full picture of co-occurring disorders and create a personalized treatment plan.",
  },
  {
    icon: Pill,
    title: "Medication Management",
    description:
      "Coordinated psychiatric medications for mental health conditions alongside medication-assisted treatment for addiction when appropriate.",
  },
  {
    icon: Brain,
    title: "Specialized Therapy",
    description:
      "Evidence-based therapies like CBT, DBT, and EMDR that address both mental health and addiction simultaneously.",
  },
  {
    icon: Users,
    title: "Group Support",
    description:
      "Dual diagnosis-specific group therapy where you connect with others facing similar challenges in a supportive environment.",
  },
  {
    icon: Heart,
    title: "Trauma Processing",
    description:
      "Trauma-informed care that safely addresses underlying trauma often connected to both mental health and substance use issues.",
  },
  {
    icon: Sparkles,
    title: "Holistic Wellness",
    description:
      "Complementary therapies including mindfulness, yoga, art therapy, and stress management to support whole-person healing.",
  },
];

const faqs = [
  {
    question: "What is dual diagnosis treatment?",
    answer:
      "Dual diagnosis (or co-occurring disorder) treatment addresses both mental health conditions and substance use disorders simultaneously. Rather than treating these issues separately, integrated treatment recognizes that they are interconnected and must be addressed together for lasting recovery. This approach includes psychiatric evaluation, medication management, specialized therapy, and addiction treatment in a coordinated program.",
  },
  {
    question: "Why is integrated treatment important for dual diagnosis?",
    answer:
      "Treating only addiction or only mental health typically leads to relapse because the conditions fuel each other. For example, untreated depression often triggers substance use relapse, while continued substance abuse worsens depression. Integrated treatment breaks this cycle by addressing both conditions simultaneously with a coordinated team of mental health and addiction professionals.",
  },
  {
    question: "What mental health conditions commonly co-occur with addiction?",
    answer:
      "The most common co-occurring conditions include: depression (affects ~33% of people with substance use disorders), anxiety disorders (~20%), PTSD (~46% have co-occurring addiction), bipolar disorder (~56%), ADHD, personality disorders (especially borderline personality disorder), and schizophrenia. Any mental health condition can co-occur with addiction.",
  },
  {
    question: "How long does dual diagnosis treatment take?",
    answer:
      "Dual diagnosis treatment typically requires longer treatment than addiction alone due to its complexity. Residential programs often run 60-90+ days rather than 30 days. Intensive outpatient programs may continue for several months. Ongoing psychiatric care and therapy usually continue long-term after primary treatment to maintain stability in both conditions.",
  },
  {
    question: "Does insurance cover dual diagnosis treatment?",
    answer:
      "Yes, under mental health parity laws, insurance must cover dual diagnosis treatment equivalently to other medical conditions. Both the mental health and addiction components are covered as essential health benefits under the ACA. This includes psychiatric evaluation, medication, therapy, and residential treatment. Verify specific benefits with your insurance provider.",
  },
];

const DualDiagnosisTreatment = () => {
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
      "name": "Dual Diagnosis Treatment Programs",
      "description":
        "Comprehensive guide to dual diagnosis treatment for co-occurring mental health and substance use disorders.",
      "url": "https://rehablookup.com/treatment-types/dual-diagnosis",
      "about": {
        "@type": "MedicalCondition",
        "name": "Co-occurring Disorders"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Dual Diagnosis Treatment | Mental Health & Addiction Programs"
        description="Find dual diagnosis treatment programs for co-occurring mental health and substance use disorders. Get integrated care for depression, anxiety, PTSD, and addiction."
        canonical="/treatment-types/dual-diagnosis-treatment"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Dual Diagnosis", url: "/treatment-types/dual-diagnosis-treatment" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
        <MedicalPatternBackground />
          <BreadcrumbNav
            className="mb-4"
            items=[{'{ label: "Treatment Types", href: "/treatment-types" },\n              { label: "Dual Diagnosis" }'}]
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Brain className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Co-Occurring Disorder Treatment</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Dual Diagnosis Treatment Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Integrated treatment for co-occurring mental health and substance use disorders.
              Address depression, anxiety, PTSD, bipolar disorder, and addiction together for lasting recovery.
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
              <span>Integrated Care Approach</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Psychiatric Support</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Trauma-Informed</span>
            </div>
          </div>
        </div>
      </section>

      {/* What is Dual Diagnosis */}
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center mb-12">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Understanding Dual Diagnosis
            </h2>
            <p className="mt-4 text-muted-foreground leading-relaxed">
              Dual diagnosis, also called co-occurring disorders, refers to having both a mental health condition
              and a substance use disorder simultaneously. Research shows that nearly half of people with severe
              mental illness also experience substance abuse. These conditions interact and worsen each other,
              making integrated treatment essential for recovery.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {mentalHealthConditions.map((condition) => (
              <div
                key={condition.name}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                    <Brain className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {condition.name}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {condition.description}
                    </p>
                    <p className="mt-3 text-xs font-medium text-purple-600 dark:text-purple-400">
                      {condition.prevalence}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatment Components */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Components of Dual Diagnosis Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Integrated treatment addresses both mental health and addiction together
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {treatmentComponents.map((component) => (
              <div
                key={component.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <component.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{component.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{component.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Warning Signs */}
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-4xl">
            <div className="rounded-2xl border bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-8 md:p-10">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-200 dark:bg-amber-800">
                  <AlertTriangle className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground md:text-2xl">
                    Signs You May Need Dual Diagnosis Treatment
                  </h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {[
                      "Using substances to cope with anxiety, depression, or trauma",
                      "Mental health symptoms worsen when you stop using",
                      "Previous addiction treatment relapsed due to mental health",
                      "Family history of both mental illness and addiction",
                      "Substance use started after a traumatic experience",
                      "Difficulty functioning without substances despite wanting to stop",
                    ].map((sign, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <CheckCircle className="h-4 w-4 mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
                        {sign}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6">
                    <Link to="/concierge">
                      <Button className="gap-2">
                        <Phone className="h-4 w-4" />
                        Get a Free Assessment
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
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
                  Dual Diagnosis Treatment Centers
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Facilities offering integrated mental health and addiction care
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
                Dual Diagnosis Treatment FAQs
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

      <StateLinksSection
        title="Find Dual Diagnosis Treatment by State"
        subtitle="Browse integrated mental health and addiction treatment in your state"
        basePath="/treatment-types/dual-diagnosis-treatment"
      />

      {/* Other Treatment Types */}
      <section className="border-t section-padding-sm">
        <div className="container">
          <h2 className="mb-6 text-center text-xl font-bold text-foreground">
            Explore Other Treatment Types
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/treatment-types/detox-programs">
              <Button variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" />
                Detox Programs
              </Button>
            </Link>
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Residential Inpatient
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" className="gap-2">
                <Stethoscope className="h-4 w-4" />
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
      <section className="section-padding">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Get Integrated Care for Lasting Recovery
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find dual diagnosis treatment that addresses both your mental health and addiction.
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

export default DualDiagnosisTreatment;
