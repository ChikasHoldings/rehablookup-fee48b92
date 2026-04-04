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
  MapPinned,
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Covered",
    details: "Medically supervised withdrawal in most states",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Varies by State",
    details: "Residential treatment availability differs",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Generally Covered",
    details: "IOP and outpatient counseling widely available",
  },
  {
    icon: Heart,
    title: "MAT Programs",
    coverage: "Required Coverage",
    details: "All states must cover MAT under federal rules",
  },
];

const stateVariations = [
  "Coverage for residential treatment varies significantly",
  "Some states have expanded Medicaid with more benefits",
  "Managed care organizations may have different networks",
  "Prior authorization requirements differ by state",
  "Length of stay limits vary between programs",
];

const faqs = [
  {
    question: "Does Medicaid cover addiction treatment?",
    answer: "Yes, Medicaid covers substance use disorder treatment in all states. However, the specific services covered and their availability can vary significantly by state. All states must cover medication-assisted treatment.",
  },
  {
    question: "Why does Medicaid coverage vary by state?",
    answer: "Medicaid is a joint federal-state program where states have flexibility in designing their programs. Some states have expanded Medicaid and offer more comprehensive behavioral health benefits.",
  },
  {
    question: "Does Medicaid cover residential rehab?",
    answer: "Coverage for residential/inpatient treatment varies by state. Some states cover it fully, others have limitations, and some may only cover it for certain populations. Check with your state Medicaid program.",
  },
  {
    question: "What is the IMD exclusion?",
    answer: "The Institution for Mental Diseases (IMD) exclusion historically prevented Medicaid from paying for treatment in facilities with more than 16 beds. Many states now have waivers that allow coverage for these facilities.",
  },
  {
    question: "How do I find Medicaid-accepting treatment centers?",
    answer: "Contact your state Medicaid office, call your managed care plan if enrolled in one, or contact treatment centers directly to verify they accept Medicaid in your state.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Know Your State Program",
    description: "Medicaid benefits vary by state and plan type",
  },
  {
    step: 2,
    title: "Check Managed Care Status",
    description: "Many states use MCOs with their own provider networks",
  },
  {
    step: 3,
    title: "Verify Provider Enrollment",
    description: "Confirm the facility accepts your specific Medicaid plan",
  },
  {
    step: 4,
    title: "Understand Prior Auth Requirements",
    description: "Learn what services need approval before treatment",
  },
];

export default function MedicaidRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Medicaid Addiction Treatment Coverage | Free and Low-Cost Rehab"
        description="Learn about Medicaid coverage for addiction treatment by state. Find free or low-cost rehab options with Medicaid. Understand state-specific benefits and how to access care."
        canonical="/insurance/medicaid-rehab"
        keywords={["Medicaid addiction treatment", "Medicaid drug rehab", "free rehab Medicaid", "Medicaid substance abuse", "Medicaid behavioral health", "low cost rehab"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Medicaid Rehab Coverage", url: "/insurance/medicaid-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Medicaid Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/medicaid.svg" 
                alt="Medicaid Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                State-Federal Program
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Medicaid Addiction Treatment Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Medicaid provides free or low-cost addiction treatment coverage. Benefits vary by state, so understanding your specific program is important.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Medicaid-Accepting Centers
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
              <span className="font-medium text-foreground">Coverage varies significantly by state.</span>{" "}
              Contact your state Medicaid office or treatment centers to verify available benefits.
            </p>
          </div>
        </div>
      </section>

      {/* State Variations Warning */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-xl border border-border bg-muted/30 p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPinned className="h-6 w-6 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Important: State-by-State Differences
                </h2>
              </div>
              <p className="text-muted-foreground mb-4">
                Medicaid is administered by each state, so coverage rules, provider networks, and available services can differ significantly. Key variations include:
              </p>
              <ul className="space-y-2">
                {stateVariations.map((item, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-4 w-4 text-primary shrink-0 mt-1" />
                    <span className="text-sm text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* What Medicaid Generally Covers */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Medicaid Generally Covers
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              These services are commonly covered, but verify with your specific state program
            </p>
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

      {/* How to Access Treatment */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              How to Access Medicaid Treatment
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
                Benefits of Medicaid Coverage
              </h2>
              <ul className="space-y-3">
                {[
                  "Little to no out-of-pocket costs for treatment",
                  "Required coverage for medication-assisted treatment",
                  "No annual or lifetime limits on benefits",
                  "Coverage for co-occurring mental health conditions",
                  "Retroactive coverage may be available",
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
                <h3 className="font-semibold text-foreground">State Medicaid Offices</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Contact your state Medicaid office for specific coverage information and to find enrolled providers.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Hours vary by state</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Have your Medicaid ID ready</span>
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
              Medicaid Coverage Questions
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
              Find Treatment Centers That Accept Medicaid
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for addiction treatment facilities that accept Medicaid in your state.
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
            <Link to="/insurance/medicare-rehab" className="text-primary hover:underline">Medicare Coverage</Link>
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
