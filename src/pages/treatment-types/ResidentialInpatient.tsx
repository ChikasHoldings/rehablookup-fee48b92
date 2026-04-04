import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { StateLinksSection } from "@/components/treatment/StateLinksSection";
import { TreatmentCenterCard } from "@/components/cards/TreatmentCenterCard";
import {
  Home,
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
  Stethoscope,
  Users,
  HelpCircle,
  ChevronDown,
  Calendar,
  Utensils,
  Moon,
  Sunrise,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import MedicalPatternBackground from "@/components/backgrounds/MedicalPatternBackground";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";

const programLengths = [
  {
    duration: "30 Days",
    title: "Short-Term Residential",
    description: "Intensive introduction to recovery covering detox, stabilization, and foundational therapy. Best for mild to moderate addiction with strong support systems.",
    includes: ["Medical detox", "Individual counseling", "Group therapy", "Aftercare planning"],
  },
  {
    duration: "60 Days",
    title: "Standard Residential",
    description: "Extended treatment allowing deeper therapeutic work and skill development. Recommended for moderate addiction or co-occurring disorders.",
    includes: ["Comprehensive assessment", "Intensive therapy", "Life skills training", "Family involvement"],
  },
  {
    duration: "90+ Days",
    title: "Long-Term Residential",
    description: "Evidence-based duration shown to significantly improve outcomes. Best for severe addiction, multiple relapses, or complex co-occurring conditions.",
    includes: ["Deep behavioral change", "Vocational training", "Extended family therapy", "Transitional planning"],
  },
];

const dailySchedule = [
  { time: "6:30 AM", icon: Sunrise, activity: "Wake up, meditation, personal hygiene" },
  { time: "7:30 AM", icon: Utensils, activity: "Breakfast and morning community" },
  { time: "9:00 AM", icon: Users, activity: "Group therapy session" },
  { time: "11:00 AM", icon: Brain, activity: "Individual counseling or specialized therapy" },
  { time: "12:30 PM", icon: Utensils, activity: "Lunch and free time" },
  { time: "2:00 PM", icon: Activity, activity: "Therapeutic activities (yoga, art, recreation)" },
  { time: "4:00 PM", icon: Users, activity: "Life skills workshop or process group" },
  { time: "6:00 PM", icon: Utensils, activity: "Dinner and community time" },
  { time: "7:30 PM", icon: Heart, activity: "12-step meeting or peer support" },
  { time: "9:00 PM", icon: Moon, activity: "Evening reflection, journaling, lights out" },
];

const benefits = [
  {
    title: "24/7 Medical Support",
    description: "Round-the-clock access to medical staff for detox management, medication needs, and health monitoring.",
  },
  {
    title: "Structured Environment",
    description: "Removal from triggers and a daily routine focused entirely on recovery without outside distractions.",
  },
  {
    title: "Intensive Therapy",
    description: "Multiple therapy sessions daily including individual, group, family, and specialized modalities.",
  },
  {
    title: "Peer Community",
    description: "Living alongside others in recovery creates bonds, accountability, and shared understanding.",
  },
  {
    title: "Focus on Healing",
    description: "Time away from work, family stress, and daily pressures to concentrate solely on recovery.",
  },
  {
    title: "Comprehensive Care",
    description: "Nutrition, exercise, sleep hygiene, and wellness integrated into treatment for whole-person healing.",
  },
];

const faqs = [
  {
    question: "What is residential inpatient treatment?",
    answer: "Residential inpatient treatment provides 24/7 care in a structured facility where you live on-site for the duration of treatment. It includes medical supervision, multiple daily therapy sessions, group activities, and a supportive community. This immersive approach removes you from triggers and allows complete focus on recovery. Programs typically range from 30-90+ days."
  },
  {
    question: "How long should I stay in residential treatment?",
    answer: "Research consistently shows that longer treatment produces better outcomes. While 30-day programs exist, 90+ days is considered the gold standard by NIDA (National Institute on Drug Abuse). The right duration depends on addiction severity, substance type, co-occurring disorders, previous treatment history, and support system strength. Your treatment team will recommend an appropriate length."
  },
  {
    question: "What happens during a typical day in residential rehab?",
    answer: "A typical day includes structured activities from morning to evening: wake-up routines, healthy meals, individual therapy, group therapy sessions, educational workshops, recreational activities, 12-step or peer support meetings, and evening reflection time. This structure helps establish healthy habits and fills time previously spent on substance use."
  },
  {
    question: "Can I leave residential treatment if I want to?",
    answer: "In most cases, residential treatment is voluntary, meaning you can leave. However, leaving against medical advice (AMA) significantly increases relapse risk. If you're feeling the urge to leave, discuss your concerns with staff—they can address issues and help you stay committed. Some situations (court-ordered treatment, certain insurance requirements) may have different rules."
  },
  {
    question: "How much does residential inpatient rehab cost?",
    answer: "Residential treatment costs vary widely based on location, amenities, and program length. Basic programs may cost $6,000-$20,000 for 30 days, while luxury facilities can exceed $50,000+. Most insurance plans cover residential treatment as an essential health benefit. Many facilities offer payment plans, sliding scales, or can help identify financial assistance options."
  },
];

const ResidentialInpatient = () => {
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
      "name": "Residential Inpatient Treatment Programs",
      "description": "Comprehensive guide to residential inpatient addiction treatment including program lengths, daily schedules, and what to expect.",
      "url": "https://rehablookup.com/treatment-types/residential-inpatient",
      "about": {
        "@type": "MedicalProcedure",
        "name": "Residential Addiction Treatment"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Residential Inpatient Rehab | 24/7 Addiction Treatment Programs"
        description="Find residential inpatient rehab programs with 24/7 care, medical supervision, and intensive therapy. Compare 30, 60, and 90-day treatment options."
        canonical="/treatment-types/residential-inpatient"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Residential Inpatient", url: "/treatment-types/residential-inpatient" },
        ]}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-12 md:py-16">
        <div className="container">
        <MedicalPatternBackground />
          <BreadcrumbNav
            className="mb-4"
            items={[
              { label: "Treatment Types", href: "/treatment-types" },
              { label: "Residential Inpatient" },
            ]}
          /><div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Home className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">24/7 Residential Care</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Residential Inpatient Treatment Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Immersive, 24/7 addiction treatment in a supportive residential setting. 
              Live on-site with medical supervision, intensive therapy, and a community focused on recovery.
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
              <span>24/7 Medical Staff</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>30-90+ Day Programs</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Program Lengths */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Program Length Options
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Choose the duration that fits your needs—longer treatment leads to better outcomes
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {programLengths.map((program) => (
              <div
                key={program.duration}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-bold text-primary">{program.duration}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-foreground">
                  {program.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {program.description}
                </p>
                <ul className="mt-4 space-y-2">
                  {program.includes.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Schedule */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              A Day in Residential Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Structured daily routines help establish healthy habits and maximize recovery focus
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="relative">
              <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
              <div className="space-y-4">
                {dailySchedule.map((item, index) => (
                  <div key={index} className="relative flex items-start gap-4 pl-14">
                    <div className="absolute left-0 flex h-12 w-12 items-center justify-center rounded-full bg-card border-2 border-primary/20">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 rounded-lg border bg-card p-4">
                      <span className="text-sm font-bold text-primary">{item.time}</span>
                      <p className="mt-1 text-sm text-foreground">{item.activity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Benefits of Residential Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Why immersive, 24/7 care produces the best recovery outcomes
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div
                key={benefit.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <CheckCircle className="h-8 w-8 text-accent mb-4" />
                <h3 className="font-semibold text-foreground">{benefit.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
              </div>
            ))}
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
                  Residential Treatment Centers
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Verified inpatient facilities offering 24/7 care
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
                Residential Inpatient FAQs
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
        title="Find Inpatient Rehab by State"
        subtitle="Browse residential treatment programs in your state"
        basePath="/treatment-types/residential-inpatient"
        buttonPrefix="Inpatient in"
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
                <Activity className="h-4 w-4" />
                Detox Programs
              </Button>
            </Link>
            <Link to="/treatment-types/outpatient-programs">
              <Button variant="outline" className="gap-2">
                <Stethoscope className="h-4 w-4" />
                Outpatient Programs
              </Button>
            </Link>
            <Link to="/treatment-types/drug-addiction">
              <Button variant="outline" className="gap-2">
                <Pill className="h-4 w-4" />
                Drug Addiction
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
              Ready for Focused, Immersive Treatment?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find the right residential program for your recovery needs.
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

export default ResidentialInpatient;
