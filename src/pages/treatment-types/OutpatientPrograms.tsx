import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { treatmentCenters } from "@/data/treatmentCenters";
import { StateLinksSection } from "@/components/treatment/StateLinksSection";
import { FacilityShowcaseGrid } from "@/components/facility/FacilityShowcaseGrid";
import {
  Stethoscope,
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
  Home,
  Users,
  HelpCircle,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Baby,
  Video,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const programTypes = [
  {
    title: "Partial Hospitalization (PHP)",
    intensity: "Highest Intensity",
    hours: "5-7 days/week, 6+ hours/day",
    description: "Hospital-level care without overnight stay. Ideal as a step-down from residential or for those needing intensive support while living at home or in sober living.",
    bestFor: ["Step-down from inpatient", "Severe addiction with stable housing", "Co-occurring disorders requiring medical oversight"],
  },
  {
    title: "Intensive Outpatient (IOP)",
    intensity: "High Intensity",
    hours: "3-5 days/week, 3-4 hours/day",
    description: "Structured treatment allowing work or school attendance. Provides significant therapeutic support with flexibility for daily responsibilities.",
    bestFor: ["Working professionals", "Parents with childcare needs", "Students", "Step-down from PHP or residential"],
  },
  {
    title: "Standard Outpatient",
    intensity: "Moderate Intensity",
    hours: "1-2 days/week, 1-2 hours/session",
    description: "Regular therapy sessions for ongoing support and relapse prevention. Often used as continuing care after completing intensive treatment.",
    bestFor: ["Long-term recovery maintenance", "Mild substance use issues", "Aftercare following intensive treatment"],
  },
  {
    title: "Telehealth/Virtual IOP",
    intensity: "Flexible Intensity",
    hours: "Varies by program",
    description: "Remote treatment via video conferencing, providing access to quality care regardless of location or mobility limitations.",
    bestFor: ["Rural areas with limited treatment access", "Those with transportation barriers", "Professionals with travel schedules"],
  },
];

const advantages = [
  {
    icon: Briefcase,
    title: "Continue Working",
    description: "Maintain employment and income while receiving treatment during evenings or flexible hours.",
  },
  {
    icon: Baby,
    title: "Stay with Family",
    description: "Remain at home to care for children or support family members while getting help.",
  },
  {
    icon: GraduationCap,
    title: "Keep Going to School",
    description: "Students can continue their education while attending treatment sessions around class schedules.",
  },
  {
    icon: Users,
    title: "Real-World Practice",
    description: "Apply coping skills immediately in daily life while having therapeutic support.",
  },
  {
    icon: Clock,
    title: "Lower Cost",
    description: "Generally more affordable than residential care, with better insurance coverage rates.",
  },
  {
    icon: Video,
    title: "Telehealth Options",
    description: "Virtual programs provide access regardless of location or transportation limitations.",
  },
];

const comparisonData = [
  { feature: "Living situation", php: "Home/sober living", iop: "Home", standard: "Home" },
  { feature: "Hours per week", php: "30-40 hours", iop: "9-20 hours", standard: "1-4 hours" },
  { feature: "Medical oversight", php: "Daily", iop: "As needed", standard: "Minimal" },
  { feature: "Work/school compatible", php: "Difficult", iop: "Yes", standard: "Yes" },
  { feature: "Duration", php: "2-4 weeks", iop: "8-12 weeks", standard: "Ongoing" },
  { feature: "Best for", php: "High acuity", iop: "Moderate needs", standard: "Maintenance" },
];

const faqs = [
  {
    question: "What is the difference between PHP and IOP?",
    answer: "Partial Hospitalization Programs (PHP) provide the highest level of outpatient care with 5-7 days per week of treatment for 6+ hours daily—essentially hospital-level care without the overnight stay. Intensive Outpatient Programs (IOP) offer 3-5 days per week for 3-4 hours, allowing more flexibility for work or school. PHP is typically used as a step-down from residential or for severe cases; IOP suits those who need substantial support while maintaining daily responsibilities."
  },
  {
    question: "Can I work while in outpatient treatment?",
    answer: "Yes, that's one of the primary benefits of outpatient treatment. Standard outpatient and most IOP programs offer evening or flexible scheduling specifically designed for working professionals. PHP may be challenging to combine with full-time work due to the intensive schedule, but some employers offer medical leave or reduced schedules. Many people successfully complete IOP while working full-time."
  },
  {
    question: "Is outpatient treatment effective?",
    answer: "Research shows outpatient treatment can be equally effective as residential care for many individuals, particularly those with mild to moderate addiction, strong support systems, and stable living situations. The key is matching treatment intensity to individual needs. Outpatient programs that include evidence-based therapies (CBT, motivational interviewing), medication-assisted treatment when appropriate, and adequate duration produce excellent outcomes."
  },
  {
    question: "How long does outpatient treatment last?",
    answer: "Duration varies by program type and individual needs. PHP typically lasts 2-4 weeks before stepping down to IOP. IOP programs generally run 8-12 weeks, sometimes longer. Standard outpatient therapy often continues for months or years as ongoing recovery support. The total treatment journey frequently involves stepping through multiple levels: residential → PHP → IOP → standard outpatient → aftercare."
  },
  {
    question: "Does insurance cover outpatient treatment?",
    answer: "Yes, outpatient addiction treatment is covered as an essential health benefit under the ACA. Insurance typically covers PHP, IOP, and standard outpatient therapy, often with better coverage rates than residential care. Coverage includes individual and group therapy, medication-assisted treatment, and psychiatric services. Verify your specific benefits, as copays, deductibles, and session limits vary by plan."
  },
];

const OutpatientPrograms = () => {
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
      "name": "Outpatient Addiction Treatment Programs",
      "description": "Comprehensive guide to outpatient addiction treatment including PHP, IOP, and standard outpatient programs.",
      "url": "https://rehablookup.com/treatment-types/outpatient-programs",
      "about": {
        "@type": "MedicalProcedure",
        "name": "Outpatient Addiction Treatment"
      }
    },
    faqSchema
  ];

  return (
    <Layout>
      <SEO
        title="Outpatient Rehab Programs | PHP, IOP & Flexible Treatment"
        description="Find outpatient addiction treatment programs including PHP, IOP, and flexible options. Get treatment while maintaining work, school, and family responsibilities."
        canonical="/treatment-types/outpatient-programs"
        structuredData={structuredData}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
          { name: "Outpatient Programs", url: "/treatment-types/outpatient-programs" },
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
              <span className="text-white font-medium">Outpatient Programs</span>
            </span>
          </nav>

          <div className="max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Stethoscope className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Flexible Treatment Options</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Outpatient Treatment Programs
            </h1>
            <p className="text-base md:text-lg text-primary-foreground/85 leading-relaxed">
              Flexible addiction treatment that fits your life. Continue working, attending school,
              and caring for family while receiving comprehensive care through PHP, IOP, or standard outpatient programs.
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
              <span>Work-Compatible</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Flexible Scheduling</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Insurance Accepted</span>
            </div>
          </div>
        </div>
      </section>

      {/* Program Types */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Levels of Outpatient Care
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              From intensive daily programming to weekly sessions, find the right intensity for your needs
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {programTypes.map((program) => (
              <div
                key={program.title}
                className="rounded-2xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary mb-2">
                      {program.intensity}
                    </span>
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {program.title}
                    </h3>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                    <Clock className="h-6 w-6 text-accent" />
                  </div>
                </div>
                <p className="text-sm font-medium text-accent mb-2">{program.hours}</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {program.description}
                </p>
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Best for:</p>
                  <ul className="space-y-1">
                    {program.bestFor.map((item) => (
                      <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3 w-3 text-accent shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="bg-secondary/30 section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Advantages of Outpatient Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Effective treatment while maintaining your daily life and responsibilities
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {advantages.map((advantage) => (
              <div
                key={advantage.title}
                className="rounded-xl border bg-card p-6 hover:shadow-md transition-shadow"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <advantage.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">{advantage.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{advantage.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="section-padding">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Compare Program Types
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Find the right level of care based on your needs and circumstances
            </p>
          </div>

          <div className="mx-auto max-w-4xl overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-semibold text-foreground">Feature</th>
                  <th className="p-4 text-center font-semibold text-foreground">PHP</th>
                  <th className="p-4 text-center font-semibold text-foreground">IOP</th>
                  <th className="p-4 text-center font-semibold text-foreground">Standard</th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr key={row.feature} className={index % 2 === 0 ? "bg-secondary/20" : ""}>
                    <td className="p-4 font-medium text-foreground">{row.feature}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.php}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.iop}</td>
                    <td className="p-4 text-center text-sm text-muted-foreground">{row.standard}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                  Outpatient Treatment Centers
                </h2>
                <p className="mt-1 text-muted-foreground">
                  Verified facilities offering outpatient programs
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
                Outpatient Treatment FAQs
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
        title="Find Outpatient Programs by State"
        subtitle="Browse PHP, IOP, and outpatient treatment in your state"
        basePath="/treatment-types/outpatient-programs"
        buttonPrefix="Outpatient in"
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
            <Link to="/treatment-types/residential-inpatient">
              <Button variant="outline" className="gap-2">
                <Home className="h-4 w-4" />
                Residential Inpatient
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
              Find Flexible Treatment That Fits Your Life
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you find the right outpatient program while balancing your responsibilities.
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

export default OutpatientPrograms;
