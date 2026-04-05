import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import {
  Shield,
  CheckCircle,
  ArrowRight,
  Phone,
  MapPin,
  FileText,
  Clock,
  DollarSign,
  Building2,
  Users,
  Stethoscope,
  Heart,
  AlertCircle,
  Info,
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Inpatient Detox",
    coverage: "Part A Covered",
    details: "Hospital-based detox covered under Part A",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Part A - 190 Days",
    details: "Lifetime limit of 190 days for psychiatric hospitals",
  },
  {
    icon: Users,
    title: "Outpatient Services",
    coverage: "Part B Covered",
    details: "Individual and group therapy covered under Part B",
  },
  {
    icon: Heart,
    title: "Medication Treatment",
    coverage: "Part D",
    details: "MAT medications covered through Part D plans",
  },
];

const medicareParts = [
  {
    part: "Part A",
    name: "Hospital Insurance",
    covers: "Inpatient hospital stays, skilled nursing, hospice, home health",
    addiction: "Inpatient detox and rehabilitation in hospital settings",
  },
  {
    part: "Part B",
    name: "Medical Insurance",
    covers: "Doctor visits, outpatient care, preventive services",
    addiction: "Outpatient counseling, therapy, and substance abuse screening",
  },
  {
    part: "Part C",
    name: "Medicare Advantage",
    covers: "Bundled Part A & B through private insurers",
    addiction: "May include additional behavioral health benefits",
  },
  {
    part: "Part D",
    name: "Prescription Drugs",
    covers: "Prescription medication coverage",
    addiction: "MAT medications like Suboxone, Vivitrol, naltrexone",
  },
];

const faqs = [
  {
    question: "Does Medicare cover addiction treatment?",
    answer: "Yes, Medicare covers substance use disorder treatment. Part A covers inpatient care, Part B covers outpatient services and therapy, and Part D covers medications used in treatment.",
  },
  {
    question: "What is the 190-day lifetime limit?",
    answer: "Medicare Part A has a 190-day lifetime limit for inpatient care in psychiatric hospitals. This doesn't apply to addiction treatment in general hospitals or outpatient settings.",
  },
  {
    question: "Does Medicare cover medication-assisted treatment?",
    answer: "Yes, Medicare Part D covers FDA-approved medications for addiction treatment including Suboxone, Vivitrol, and naltrexone. Some Medicare Advantage plans may have additional coverage.",
  },
  {
    question: "Do I need a referral for addiction treatment?",
    answer: "Original Medicare (Parts A & B) generally doesn't require referrals. Medicare Advantage plans may have different rules, so check your specific plan requirements.",
  },
  {
    question: "What is my cost-sharing with Medicare?",
    answer: "After meeting your deductible, Medicare typically covers 80% of approved services. You're responsible for the 20% coinsurance. Medigap policies can help cover these costs.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Know Your Coverage",
    description: "Understand if you have Original Medicare or Medicare Advantage",
  },
  {
    step: 2,
    title: "Check Provider Participation",
    description: "Verify the treatment center accepts Medicare assignment",
  },
  {
    step: 3,
    title: "Understand Part D Coverage",
    description: "Review your prescription plan for MAT medication coverage",
  },
  {
    step: 4,
    title: "Consider Supplemental Coverage",
    description: "Medigap can help with coinsurance and deductibles",
  },
];

export default function MedicareRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Medicare Addiction Treatment Coverage | Find Medicare Rehab Centers"
        description="Learn about Medicare coverage for addiction treatment. Understand Part A, B, and D benefits for detox, rehab, and medication-assisted treatment."
        canonical="/insurance/medicare-rehab"
        keywords={["Medicare addiction treatment", "Medicare drug rehab", "Medicare substance abuse", "Medicare behavioral health", "Medicare detox coverage", "Medicare Part A rehab"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Medicare Rehab Coverage", url: "/insurance/medicare-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Medicare Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/medicare.svg" 
                alt="Medicare Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Federal Health Insurance
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Medicare Addiction Treatment Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Medicare provides coverage for substance use disorder treatment through Parts A, B, and D. Learn about your benefits and find treatment.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Medicare-Accepting Centers
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                <Link to="/insurance">
                  <Shield className="mr-2 h-4 w-4" />
                  All Insurance Options
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-b border-border bg-muted/50 py-4">
        <div className="container">
          <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 text-primary shrink-0" />
            <p>
              <span className="font-medium text-foreground">Coverage varies by Medicare type.</span>{" "}
              Original Medicare and Medicare Advantage plans have different rules and networks.
            </p>
          </div>
        </div>
      </section>

      {/* Medicare Parts Explained */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Understanding Medicare Coverage
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Different parts of Medicare cover different aspects of addiction treatment
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {medicareParts.map((item) => (
              <div key={item.part} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center gap-3 mb-3">
                  <Badge className="bg-primary">{item.part}</Badge>
                  <h3 className="font-semibold text-foreground">{item.name}</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{item.covers}</p>
                <p className="text-sm text-primary flex items-start gap-2">
                  <Info className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Addiction: {item.addiction}</span>
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Medicare Covers */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Medicare Covers for Addiction
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {coverageDetails.map((item) => {
              const IconComponent = item.icon;
              return (
                <div key={item.title} className="rounded-xl border border-border bg-card p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                    <IconComponent className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                  <Badge variant="outline" className="mb-2 text-xs">{item.coverage}</Badge>
                  <p className="text-sm text-muted-foreground">{item.details}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to Use Medicare */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              How to Use Medicare for Treatment
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {verificationSteps.map((step) => (
              <div key={step.step} className="relative rounded-xl border border-border bg-card p-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-sm mb-4">
                  {step.step}
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Key Benefits */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
                Medicare Addiction Benefits
              </h2>
              <ul className="space-y-3">
                {[
                  "No prior authorization for most services",
                  "Annual substance abuse screening covered",
                  "Medication-assisted treatment included",
                  "Wide network of participating providers",
                  "Medigap can reduce out-of-pocket costs",
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-card rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Medicare Help Line</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Call 1-800-MEDICARE (1-800-633-4227) for coverage questions and to find participating providers.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Available 24/7</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Have your Medicare number ready</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Medicare Coverage Questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="rounded-xl border border-border bg-card p-5">
                <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
              Find Treatment Centers That Accept Medicare
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for addiction treatment facilities that participate in Medicare.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/rehab-centers">
                  Search Treatment Centers
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/cost-estimator">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Estimate Costs
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Related Links */}
      <section className="border-t border-border py-8">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="text-muted-foreground">Other Insurance Options:</span>
            <Link to="/insurance/medicaid-rehab" className="text-primary hover:underline">Medicaid Coverage</Link>
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
