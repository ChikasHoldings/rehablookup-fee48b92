import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema, generateLocalBusinessAggregateSchema } from "@/components/SEO";
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
  Globe,
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "24/7 medically supervised detoxification",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered with Prior Auth",
    details: "Residential treatment with authorization",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "IOP, PHP, and standard outpatient care",
  },
  {
    icon: Heart,
    title: "Dual Diagnosis",
    coverage: "Covered",
    details: "Integrated mental health and addiction treatment",
  },
];

const bcbsPlans = [
  { name: "Blue Cross", states: "Available in most states" },
  { name: "Blue Shield", states: "Western states primarily" },
  { name: "Anthem Blue Cross", states: "CA, CO, CT, GA, IN, KY, ME, MO, NV, NH, NY, OH, VA, WI" },
  { name: "CareFirst", states: "MD, DC, VA" },
  { name: "Highmark", states: "PA, WV, DE" },
  { name: "Premera", states: "WA, AK" },
];

const faqs = [
  {
    question: "Does Blue Cross Blue Shield cover rehab?",
    answer: "Yes, BCBS plans cover substance abuse treatment as an essential health benefit. Coverage includes detox, inpatient rehab, outpatient programs, and medication-assisted treatment. Specific benefits vary by state and plan type.",
  },
  {
    question: "Are all BCBS plans the same for addiction treatment?",
    answer: "No, BCBS operates through independent regional companies, so coverage details, networks, and authorization requirements can vary significantly between plans and states.",
  },
  {
    question: "How do I find BCBS in-network treatment centers?",
    answer: "Use your BCBS member portal, call member services, or contact treatment centers directly. Many facilities have staff who can verify your in-network status quickly.",
  },
  {
    question: "What's the BlueCard program?",
    answer: "BlueCard allows BCBS members to receive care at in-network rates when traveling or seeking treatment outside their home area, expanding access to treatment facilities nationwide.",
  },
  {
    question: "Does BCBS cover out-of-state treatment?",
    answer: "Most BCBS plans provide coverage for out-of-state treatment through the BlueCard program, though some plans may require additional authorization or have different cost-sharing.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Identify Your BCBS Plan",
    description: "Note your specific plan type (PPO, HMO, EPO) and regional company",
  },
  {
    step: 2,
    title: "Call Member Services",
    description: "Use the number on your card to verify behavioral health benefits",
  },
  {
    step: 3,
    title: "Ask About Authorization",
    description: "Understand what pre-authorization is needed for different treatment levels",
  },
  {
    step: 4,
    title: "Confirm Network Status",
    description: "Verify the treatment center is in-network or BlueCard eligible",
  },
];

export default function BCBSTreatment() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="BCBS Rehab Coverage | Blue Cross Blue Shield Treatment Centers"
        description="Find addiction treatment centers that accept Blue Cross Blue Shield. Learn about BCBS coverage for detox, inpatient, and outpatient rehab programs. Verify your benefits."
        canonical="/insurance/bcbs-treatment"
        keywords={["BCBS rehab", "Blue Cross Blue Shield addiction treatment", "BCBS drug rehab", "Blue Cross alcohol treatment", "BCBS behavioral health", "rehab that takes BCBS"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "BCBS Treatment Coverage", url: "/insurance/bcbs-treatment" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "BCBS Treatment Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/bcbs.svg" 
                alt="Blue Cross Blue Shield Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Largest Health Network
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Blue Cross Blue Shield Treatment Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              As the largest health insurance network in America, BCBS provides extensive coverage for addiction treatment. Find centers that accept your plan.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find BCBS-Accepting Centers
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
              <span className="font-medium text-foreground">BCBS coverage varies by state and plan.</span>{" "}
              Contact your specific BCBS company or treatment facilities to verify your exact benefits.
            </p>
          </div>
        </div>
      </section>

      {/* BCBS Network Info */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Understanding the BCBS Network
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Blue Cross Blue Shield operates through 34 independent regional companies
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bcbsPlans.map((plan) => (
              <div key={plan.name} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-foreground">{plan.name}</p>
                  <p className="text-xs text-muted-foreground">{plan.states}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What BCBS Covers */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What BCBS Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive behavioral health coverage across most BCBS plans
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
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              How to Verify Your BCBS Benefits
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

      {/* BlueCard Program */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-3">Nationwide Access</Badge>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
                BlueCard® Program Benefits
              </h2>
              <p className="text-muted-foreground mb-4">
                The BlueCard program lets you access in-network benefits at participating BCBS facilities across the country, making it easier to find quality treatment anywhere.
              </p>
              <ul className="space-y-3">
                {[
                  "Access to treatment centers in all 50 states",
                  "In-network rates at participating facilities",
                  "Seamless billing between BCBS companies",
                  "Easier access to specialized programs",
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
                <h3 className="font-semibold text-foreground">BCBS Member Services</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Call the number on your BCBS card for plan-specific questions about coverage and in-network providers.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>24/7 nurse line available on most plans</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Reference your 3-letter plan prefix</span>
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
              BCBS Coverage Questions Answered
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
              Find BCBS-Accepting Treatment Centers
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for accredited rehab facilities that accept Blue Cross Blue Shield insurance.
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
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link>
            <Link to="/insurance/united-healthcare-rehab" className="text-primary hover:underline">UHC Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
