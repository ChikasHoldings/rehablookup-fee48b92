import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema, generateLocalBusinessAggregateSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "Medically supervised withdrawal with 24/7 care",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered with Authorization",
    details: "Residential treatment programs typically 30-90 days",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "IOP and PHP programs for flexible treatment",
  },
  {
    icon: Heart,
    title: "Medication-Assisted Treatment",
    coverage: "Covered",
    details: "FDA-approved medications for opioid and alcohol addiction",
  },
];

const faqs = [
  {
    question: "Does Aetna cover rehab treatment?",
    answer: "Yes, Aetna provides comprehensive coverage for addiction treatment including detox, inpatient rehab, outpatient programs, and medication-assisted treatment. Coverage specifics depend on your plan type and network status of the facility.",
  },
  {
    question: "How do I verify my Aetna benefits for rehab?",
    answer: "Call the number on the back of your Aetna insurance card or contact a treatment center directly. Most facilities have dedicated admissions staff who can verify your benefits at no cost.",
  },
  {
    question: "Does Aetna require pre-authorization for rehab?",
    answer: "Most Aetna plans require prior authorization for inpatient or residential treatment. The treatment facility typically handles this process during admission.",
  },
  {
    question: "What is my out-of-pocket cost with Aetna?",
    answer: "Costs depend on your specific plan's deductible, copays, and coinsurance. In-network facilities generally have lower out-of-pocket costs than out-of-network providers.",
  },
  {
    question: "How long will Aetna cover treatment?",
    answer: "Length of covered treatment is determined by medical necessity. Aetna typically covers treatment for as long as it's clinically appropriate, reviewed periodically by their utilization management team.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Gather Your Information",
    description: "Have your Aetna member ID, group number, and personal details ready",
  },
  {
    step: 2,
    title: "Contact Aetna or a Treatment Center",
    description: "Call Aetna's behavioral health line or ask a facility to verify for you",
  },
  {
    step: 3,
    title: "Understand Your Benefits",
    description: "Learn about your deductible, copays, and any authorization requirements",
  },
  {
    step: 4,
    title: "Choose an In-Network Facility",
    description: "Select a treatment center that accepts Aetna for lower out-of-pocket costs",
  },
];

export default function AetnaRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Aetna Rehab Coverage | Find Treatment Centers That Accept Aetna"
        description="Find addiction treatment centers that accept Aetna insurance. Learn about Aetna's coverage for detox, inpatient rehab, and outpatient programs. Verify your benefits today."
        canonical="/insurance/aetna-rehab"
        keywords={["Aetna rehab coverage", "Aetna addiction treatment", "Aetna drug rehab", "Aetna alcohol treatment", "Aetna behavioral health", "rehab that takes Aetna"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Aetna Rehab Coverage", url: "/insurance/aetna-rehab" },
        ]}
        structuredData={faqSchema}
      />

      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/aetna.svg" 
                alt="Aetna Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Major Insurance Provider
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Aetna Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Aetna provides comprehensive coverage for addiction treatment. Find treatment centers that accept your Aetna insurance and understand your benefits.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Aetna-Accepting Centers
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
              <span className="font-medium text-foreground">RehabLookup is a directory service.</span>{" "}
              Contact treatment centers directly to verify your specific Aetna coverage and benefits.
            </p>
          </div>
        </div>
      </section>

      {/* What Aetna Covers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Aetna Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Aetna offers comprehensive behavioral health coverage including substance use disorder treatment
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

      {/* How to Verify Benefits */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              How to Verify Your Aetna Benefits
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Follow these steps to understand your coverage before starting treatment
            </p>
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
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
                Why Choose an Aetna-Accepting Facility?
              </h2>
              <ul className="space-y-3">
                {[
                  "Lower out-of-pocket costs with in-network rates",
                  "Streamlined authorization and billing process",
                  "Access to Aetna's behavioral health network",
                  "Coordination with Aetna care managers",
                  "Continuity of care for aftercare services",
                ].map((benefit, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-muted-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-muted/50 rounded-xl p-6 border border-border">
              <div className="flex items-center gap-3 mb-4">
                <Phone className="h-6 w-6 text-primary" />
                <h3 className="font-semibold text-foreground">Aetna Behavioral Health</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Call Aetna's behavioral health line for questions about coverage, finding providers, or understanding your benefits.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Available 24/7 for crisis support</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Member ID on your insurance card</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Frequently Asked Questions About Aetna Coverage
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
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
              Find Treatment Centers That Accept Aetna
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory to find accredited addiction treatment centers in your area that accept Aetna insurance.
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
      <section className="border-t border-border bg-muted/30 py-8">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <span className="text-muted-foreground">Other Insurance Options:</span>
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link>
            <Link to="/insurance/united-healthcare-rehab" className="text-primary hover:underline">UHC Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
