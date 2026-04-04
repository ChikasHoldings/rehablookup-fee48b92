import { Link } from "react-router-dom";
import { PageFAQ } from "@/components/seo/PageFAQ";
import { insuranceFaqs } from "@/data/pageFaqs";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle,
  ArrowRight,
  Heart,
  HelpCircle,
  FileText,
  Scale,
  Building2,
  Phone,
  ExternalLink,
  AlertCircle,
  Users,
  Stethoscope,
  LucideIcon,
  Check,
  X,
  Minus,
  ChevronRight,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface InsuranceProvider {
  name: string;
  logo?: string;
  description: string;
  coverageNotes: string;
  type: "private" | "government";
  detailsUrl?: string;
}

const majorInsurers: InsuranceProvider[] = [
  {
    name: "Blue Cross Blue Shield",
    logo: "/insurance-logos/bcbs.svg",
    description: "Largest health insurance provider network in the US",
    coverageNotes: "Most BCBS plans cover inpatient and outpatient addiction treatment",
    type: "private",
    detailsUrl: "/insurance/bcbs-treatment",
  },
  {
    name: "Aetna",
    logo: "/insurance-logos/aetna.svg",
    description: "Major national health insurance provider",
    coverageNotes: "Covers detox, residential, and outpatient substance abuse programs",
    type: "private",
    detailsUrl: "/insurance/aetna-rehab",
  },
  {
    name: "Cigna",
    logo: "/insurance-logos/cigna.svg",
    description: "Global health services company",
    coverageNotes: "Behavioral health coverage includes substance use disorder treatment",
    type: "private",
    detailsUrl: "/insurance/cigna-rehab",
  },
  {
    name: "United Healthcare",
    logo: "/insurance-logos/united.svg",
    description: "Largest single health carrier in the US",
    coverageNotes: "Comprehensive addiction treatment coverage under most plans",
    type: "private",
    detailsUrl: "/insurance/united-healthcare-rehab",
  },
  {
    name: "Kaiser Permanente",
    logo: "/insurance-logos/kaiser.svg",
    description: "Integrated managed care consortium",
    coverageNotes: "In-network treatment facilities and integrated behavioral health",
    type: "private",
    detailsUrl: "/insurance/kaiser-rehab",
  },
  {
    name: "Humana",
    logo: "/insurance-logos/humana.svg",
    description: "Major health and wellness company",
    coverageNotes: "Mental health and substance abuse treatment included in most plans",
    type: "private",
    detailsUrl: "/insurance/humana-rehab",
  },
  {
    name: "Anthem",
    logo: "/insurance-logos/anthem.svg",
    description: "One of the largest health benefits companies",
    coverageNotes: "Substance abuse treatment covered as essential health benefit",
    type: "private",
    detailsUrl: "/insurance/anthem-rehab",
  },
];

const governmentPrograms: InsuranceProvider[] = [
  {
    name: "Medicare",
    logo: "/insurance-logos/medicare.svg",
    description: "Federal health insurance for 65+ and certain disabilities",
    coverageNotes: "Part A covers inpatient treatment; Part B covers outpatient services",
    type: "government",
    detailsUrl: "/insurance/medicare-rehab",
  },
  {
    name: "Medicaid",
    logo: "/insurance-logos/medicaid.svg",
    description: "State-federal program for low-income individuals",
    coverageNotes: "Coverage varies by state but generally includes substance abuse treatment",
    type: "government",
    detailsUrl: "/insurance/medicaid-rehab",
  },
  {
    name: "TRICARE",
    logo: "/insurance-logos/tricare.svg",
    description: "Health care program for military and families",
    coverageNotes: "Comprehensive addiction treatment benefits for service members",
    type: "government",
  },
];

interface CoverageType {
  icon: LucideIcon;
  title: string;
  description: string;
  typically: string;
}

const coverageTypes: CoverageType[] = [
  {
    icon: Stethoscope,
    title: "Medical Detoxification",
    description: "Medically supervised withdrawal management",
    typically: "Covered under most plans as medically necessary",
  },
  {
    icon: Building2,
    title: "Inpatient/Residential Treatment",
    description: "24/7 care in a treatment facility for 30-90 days",
    typically: "Usually covered with prior authorization required",
  },
  {
    icon: Users,
    title: "Outpatient Programs (IOP/PHP)",
    description: "Part-time treatment while living at home",
    typically: "Commonly covered with varying session limits",
  },
  {
    icon: Heart,
    title: "Medication-Assisted Treatment",
    description: "FDA-approved medications for opioid/alcohol addiction",
    typically: "Covered under mental health/substance abuse benefits",
  },
];

// Coverage comparison data
interface CoverageComparisonItem {
  insurer: string;
  logo?: string;
  detox: "full" | "partial" | "varies" | "limited";
  inpatient: "full" | "partial" | "varies" | "limited";
  outpatient: "full" | "partial" | "varies" | "limited";
  mat: "full" | "partial" | "varies" | "limited";
  mentalHealth: "full" | "partial" | "varies" | "limited";
  notes: string;
}

const coverageComparison: CoverageComparisonItem[] = [
  {
    insurer: "Blue Cross Blue Shield",
    logo: "/insurance-logos/bcbs.svg",
    detox: "full",
    inpatient: "full",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Coverage varies by state plan; most require prior auth for residential",
  },
  {
    insurer: "Aetna",
    logo: "/insurance-logos/aetna.svg",
    detox: "full",
    inpatient: "full",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Strong network of behavioral health providers nationwide",
  },
  {
    insurer: "Cigna",
    logo: "/insurance-logos/cigna.svg",
    detox: "full",
    inpatient: "partial",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "May require step-down from detox to outpatient before residential",
  },
  {
    insurer: "United Healthcare",
    logo: "/insurance-logos/united.svg",
    detox: "full",
    inpatient: "full",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Optum behavioral health network; day limits may apply",
  },
  {
    insurer: "Kaiser Permanente",
    logo: "/insurance-logos/kaiser.svg",
    detox: "full",
    inpatient: "partial",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Primarily in-network only; limited out-of-network coverage",
  },
  {
    insurer: "Humana",
    logo: "/insurance-logos/humana.svg",
    detox: "full",
    inpatient: "partial",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Prior authorization required for most inpatient services",
  },
  {
    insurer: "Anthem",
    logo: "/insurance-logos/anthem.svg",
    detox: "full",
    inpatient: "full",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Part of BCBS network; strong parity compliance",
  },
  {
    insurer: "Medicare",
    logo: "/insurance-logos/medicare.svg",
    detox: "full",
    inpatient: "partial",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Part A: inpatient (190-day lifetime limit); Part B: outpatient",
  },
  {
    insurer: "Medicaid",
    logo: "/insurance-logos/medicaid.svg",
    detox: "varies",
    inpatient: "varies",
    outpatient: "varies",
    mat: "full",
    mentalHealth: "varies",
    notes: "Coverage varies significantly by state; check state-specific benefits",
  },
  {
    insurer: "TRICARE",
    logo: "/insurance-logos/tricare.svg",
    detox: "full",
    inpatient: "full",
    outpatient: "full",
    mat: "full",
    mentalHealth: "full",
    notes: "Comprehensive coverage for active duty, veterans, and families",
  },
];

const CoverageIcon = ({ level }: { level: "full" | "partial" | "varies" | "limited" }) => {
  switch (level) {
    case "full":
      return <Check className="h-5 w-5 text-green-600" />;
    case "partial":
      return <Minus className="h-5 w-5 text-amber-500" />;
    case "varies":
      return <HelpCircle className="h-4 w-4 text-blue-500" />;
    case "limited":
      return <X className="h-5 w-5 text-destructive" />;
  }
};

const CoverageLabel = ({ level }: { level: "full" | "partial" | "varies" | "limited" }) => {
  const labels = {
    full: "Full",
    partial: "Partial",
    varies: "Varies",
    limited: "Limited",
  };
  return <span className="text-xs text-muted-foreground">{labels[level]}</span>;
};

const keyLaws = [
  {
    title: "Mental Health Parity Act (MHPAEA)",
    year: "2008",
    description: "Requires insurers to provide equal coverage for mental health and substance use disorders as they do for physical health conditions.",
  },
  {
    title: "Affordable Care Act (ACA)",
    year: "2010",
    description: "Made substance use disorder treatment one of the 10 essential health benefits that must be covered by marketplace plans.",
  },
  {
    title: "SUPPORT Act",
    year: "2018",
    description: "Expanded access to substance abuse treatment and improved coverage requirements for Medicare and Medicaid.",
  },
];

const faqs = [
  {
    question: "Does my insurance cover addiction treatment?",
    answer: "Most health insurance plans are legally required to cover substance use disorder treatment under the Mental Health Parity Act and ACA. Coverage levels and specific benefits vary by plan, so it's important to verify with your provider or the treatment facility.",
  },
  {
    question: "What if I don't have insurance?",
    answer: "Many treatment centers offer sliding scale fees based on income, payment plans, or can help you apply for Medicaid. SAMHSA's National Helpline (1-800-662-4357) can connect you with local resources and state-funded programs.",
  },
  {
    question: "What's the difference between in-network and out-of-network?",
    answer: "In-network facilities have contracted rates with your insurer, meaning lower out-of-pocket costs. Out-of-network facilities may still be covered but typically at a lower reimbursement rate, resulting in higher personal costs.",
  },
  {
    question: "Do I need pre-authorization for treatment?",
    answer: "Many insurance plans require prior authorization before starting inpatient or residential treatment. The treatment facility's admissions team typically handles this process on your behalf.",
  },
  {
    question: "What costs might I still be responsible for?",
    answer: "Depending on your plan, you may have copays, deductibles, coinsurance, or limits on the number of covered days. Ask about these specifics when verifying your benefits.",
  },
];

const InsuranceCard = ({ provider }: { provider: InsuranceProvider }) => {
  const CardContent = (
    <div className={cn(
      "rounded-xl border border-border bg-card p-5 transition-all",
      provider.detailsUrl && "hover:shadow-md hover:border-primary/20 cursor-pointer"
    )}>
      <div className="flex items-start gap-4">
        {provider.logo ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-background border border-border p-2">
            <img 
              src={provider.logo} 
              alt={provider.name} 
              className="h-10 w-10 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('hidden');
              }}
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Shield className="h-7 w-7" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{provider.name}</h3>
            {provider.detailsUrl && (
              <ArrowRight className="h-4 w-4 text-primary" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{provider.description}</p>
          <p className="text-sm text-primary mt-2 flex items-start gap-1.5">
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{provider.coverageNotes}</span>
          </p>
          {provider.detailsUrl && (
            <p className="text-xs text-primary font-medium mt-2">
              View coverage details →
            </p>
          )}
        </div>
      </div>
    </div>
  );

  if (provider.detailsUrl) {
    return <Link to={provider.detailsUrl}>{CardContent}</Link>;
  }
  return CardContent;
};

export default function Insurance() {
  return (
    <Layout>
      <SEO
        title="Rehab Insurance Coverage Guide | RehabLookup"
        description="Learn which insurance plans cover addiction treatment. Understand coverage for detox, inpatient rehab, outpatient programs, and medication-assisted treatment."
        canonical="/insurance"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance Coverage", url: "/insurance" },
        ]}
      />

      {/* Hero Section - Matches TreatmentTypes */}
      <section className="bg-primary py-10 md:py-12">
        <div className="container">
          {/* Breadcrumb */}
          <nav className="mb-5 text-sm leading-none text-center">
            <span className="inline-flex items-center gap-2 whitespace-nowrap">
              <Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link>
              <span className="text-white/50">/</span>
              <span className="text-white font-medium">Insurance Coverage</span>
            </span>
          </nav>
          
          <div className="mx-auto max-w-2xl text-center">
            <h1 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Insurance Coverage for Addiction Treatment
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base">
              Most health insurance plans cover addiction treatment. Learn what's typically covered and how to verify your benefits.
            </p>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-b border-border bg-muted/50 py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <p>
              <span className="font-medium text-foreground">RehabLookup is a directory service.</span>{" "}
              We help you find treatment centers that accept your insurance — contact facilities directly to verify coverage.
            </p>
          </div>
        </div>
      </section>

      {/* Major Insurance Providers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Major Insurance Providers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These insurers typically cover substance abuse and addiction treatment
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {majorInsurers.map((provider) => (
              <InsuranceCard key={provider.name} provider={provider} />
            ))}
          </div>
        </div>
      </section>

      {/* Government Programs */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                Government Programs
              </h2>
              <Badge variant="secondary" className="text-xs">Public Insurance</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Federal and state programs providing addiction treatment coverage
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {governmentPrograms.map((provider) => (
              <InsuranceCard key={provider.name} provider={provider} />
            ))}
          </div>
        </div>
      </section>

      {/* What Insurance Covers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              What Insurance Typically Covers
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl mx-auto">
              Under federal law, most insurance plans must cover substance use disorder treatment
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coverageTypes.map((coverage) => {
              const IconComponent = coverage.icon;
              return (
                <div key={coverage.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{coverage.title}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{coverage.description}</p>
                  <p className="text-xs text-primary font-medium">{coverage.typically}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Coverage Comparison Table */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Coverage Comparison by Insurer
            </h2>
            <p className="mt-1 text-sm text-muted-foreground max-w-2xl mx-auto">
              Compare what each major insurer typically covers for addiction treatment services
            </p>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mb-6">
            <div className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-green-600" />
              <span className="text-xs text-muted-foreground">Full Coverage</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Minus className="h-4 w-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">Partial/Limited Days</span>
            </div>
            <div className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs text-muted-foreground">Varies by Plan/State</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-[200px] font-semibold">Insurance Provider</TableHead>
                    <TableHead className="text-center font-semibold">Detox</TableHead>
                    <TableHead className="text-center font-semibold">Inpatient</TableHead>
                    <TableHead className="text-center font-semibold">Outpatient</TableHead>
                    <TableHead className="text-center font-semibold">MAT</TableHead>
                    <TableHead className="text-center font-semibold">Mental Health</TableHead>
                    <TableHead className="min-w-[200px] font-semibold">Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coverageComparison.map((item, index) => (
                    <TableRow key={item.insurer} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          {item.logo && (
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background border border-border p-1">
                              <img 
                                src={item.logo} 
                                alt={item.insurer} 
                                className="h-6 w-6 object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                          <span className="text-sm">{item.insurer}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CoverageIcon level={item.detox} />
                          <CoverageLabel level={item.detox} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CoverageIcon level={item.inpatient} />
                          <CoverageLabel level={item.inpatient} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CoverageIcon level={item.outpatient} />
                          <CoverageLabel level={item.outpatient} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CoverageIcon level={item.mat} />
                          <CoverageLabel level={item.mat} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-0.5">
                          <CoverageIcon level={item.mentalHealth} />
                          <CoverageLabel level={item.mentalHealth} />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">{item.notes}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-4">
            * Coverage details are general guidelines. Actual coverage depends on your specific plan. Always verify with your insurer or treatment facility.
          </p>
        </div>
      </section>

      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Scale className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
                Your Legal Rights
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Federal laws that protect your access to addiction treatment coverage
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {keyLaws.map((law) => (
              <div key={law.title} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs font-mono">{law.year}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{law.title}</h3>
                <p className="text-sm text-muted-foreground">{law.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How to Verify Coverage */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              How to Verify Your Coverage
            </h2>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              {[
                { step: "1", title: "Find your insurance card", description: "Locate your Member ID, Group Number, and customer service phone number" },
                { step: "2", title: "Call your insurance company", description: "Ask specifically about substance use disorder and behavioral health benefits" },
                { step: "3", title: "Contact the treatment facility", description: "Most rehab centers have admissions staff who verify insurance for you" },
                { step: "4", title: "Get authorization if required", description: "Some plans require pre-approval before starting treatment" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-4">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-medium text-foreground">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                Questions to Ask Your Insurance
              </h3>
              <ul className="space-y-3">
                {[
                  "Is substance abuse/addiction treatment covered under my plan?",
                  "What types of treatment are covered (detox, inpatient, outpatient)?",
                  "How many days of treatment are covered per year?",
                  "Do I need pre-authorization before starting treatment?",
                  "What is my deductible and out-of-pocket maximum?",
                  "Are there in-network treatment facilities near me?",
                ].map((question, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{question}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq) => (
              <div key={faq.question} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-start gap-3">
                  <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-foreground">{faq.question}</h3>
                    <p className="text-sm text-muted-foreground mt-2">{faq.answer}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6">
            <h2 className="font-display text-lg font-bold text-foreground md:text-xl">
              Helpful Resources
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <a
              href="https://www.samhsa.gov/find-help/national-helpline"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary">SAMHSA</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">National Helpline</h3>
              <p className="text-sm text-muted-foreground">Free, confidential treatment referrals and information 24/7</p>
              <p className="text-sm font-medium text-primary mt-2">1-800-662-4357</p>
            </a>

            <a
              href="https://findtreatment.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary">Federal Resource</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">FindTreatment.gov</h3>
              <p className="text-sm text-muted-foreground">Official government treatment locator tool</p>
            </a>

            <a
              href="https://www.cms.gov/CCIIO/Programs-and-Initiatives/Other-Insurance-Protections/mhpaea_factsheet"
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-xl border border-border bg-card p-5 hover:border-primary/30 hover:shadow-md transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-primary">CMS.gov</span>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Parity Law Information</h3>
              <p className="text-sm text-muted-foreground">Learn about your mental health parity rights</p>
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-primary py-10 md:py-12">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              Find Treatment Centers That Accept Your Insurance
            </h2>
            <p className="mb-6 text-primary-foreground/80 text-sm">
              Search our directory for verified treatment facilities and filter by insurance accepted.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/cost-estimator">
                <Button size="lg" variant="secondary" className="gap-2 font-semibold">
                  Estimate Your Costs
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10">
                  Browse Treatment Centers
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PageFAQ faqs={insuranceFaqs} className="border-t border-border bg-muted/30" />
    </Layout>
  );
}
