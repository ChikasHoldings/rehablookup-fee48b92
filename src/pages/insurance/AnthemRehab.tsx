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
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "Medically supervised detoxification services",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered with Auth",
    details: "Residential treatment with prior authorization",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "IOP, PHP, and standard outpatient therapy",
  },
  {
    icon: Heart,
    title: "MAT Programs",
    coverage: "Covered",
    details: "Medication-assisted treatment for addiction",
  },
];

const faqs = [
  {
    question: "Does Anthem cover addiction treatment?",
    answer: "Yes, Anthem provides comprehensive coverage for substance use disorder treatment including detox, inpatient rehabilitation, outpatient programs, and medication-assisted treatment as part of their behavioral health benefits.",
  },
  {
    question: "Is Anthem part of Blue Cross Blue Shield?",
    answer: "Yes, Anthem is one of the largest Blue Cross Blue Shield affiliated companies, operating in 14 states. Anthem members can access the BCBS national network through the BlueCard program.",
  },
  {
    question: "Does Anthem require pre-authorization for rehab?",
    answer: "Most Anthem plans require prior authorization for inpatient and residential treatment. Outpatient services may not require authorization but check your specific plan details.",
  },
  {
    question: "What states does Anthem operate in?",
    answer: "Anthem operates Blue Cross and/or Blue Shield plans in California, Colorado, Connecticut, Georgia, Indiana, Kentucky, Maine, Missouri, Nevada, New Hampshire, New York, Ohio, Virginia, and Wisconsin.",
  },
  {
    question: "Can I use Anthem out-of-state for treatment?",
    answer: "Yes, through the BlueCard program, Anthem members can access in-network benefits at participating BCBS facilities nationwide, making it easier to get treatment outside your home state.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Call Anthem Member Services",
    description: "Use the behavioral health number on your ID card",
  },
  {
    step: 2,
    title: "Request Benefits Verification",
    description: "Ask about substance abuse treatment coverage specifics",
  },
  {
    step: 3,
    title: "Understand Authorization",
    description: "Learn what services need prior approval",
  },
  {
    step: 4,
    title: "Confirm Network Status",
    description: "Verify the facility is in Anthem's network",
  },
];

const anthemStates = [
  "California", "Colorado", "Connecticut", "Georgia", "Indiana", "Kentucky", 
  "Maine", "Missouri", "Nevada", "New Hampshire", "New York", "Ohio", "Virginia", "Wisconsin"
];

export default function AnthemRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Anthem Rehab Coverage | Find Treatment Centers That Accept Anthem"
        description="Find addiction treatment centers that accept Anthem Blue Cross Blue Shield. Learn about Anthem's coverage for detox, inpatient rehab, and outpatient programs."
        canonical="/insurance/anthem-rehab"
        keywords={["Anthem rehab coverage", "Anthem addiction treatment", "Anthem Blue Cross", "Anthem drug rehab", "Anthem behavioral health", "rehab that takes Anthem"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Anthem Rehab Coverage", url: "/insurance/anthem-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Anthem Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/anthem.svg" 
                alt="Anthem Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                BCBS Affiliate
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Anthem Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Anthem Blue Cross Blue Shield provides comprehensive addiction treatment coverage with access to the nationwide BCBS network.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Anthem-Accepting Centers
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
              <span className="font-medium text-foreground">Anthem is part of the BCBS network.</span>{" "}
              You may have access to BCBS facilities nationwide through BlueCard.
            </p>
          </div>
        </div>
      </section>

      {/* Anthem States */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-6 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Anthem Service Areas
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Anthem operates Blue Cross and/or Blue Shield plans in these states
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
            {anthemStates.map((state) => (
              <Badge key={state} variant="outline" className="text-sm py-1.5 px-3">
                {state}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* What Anthem Covers */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Anthem Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive behavioral health coverage with strong parity compliance
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
              How to Verify Your Anthem Benefits
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
                Anthem Behavioral Health Benefits
              </h2>
              <ul className="space-y-3">
                {[
                  "Access to nationwide BCBS network via BlueCard",
                  "Strong mental health parity compliance",
                  "Coverage for all levels of addiction care",
                  "Medication-assisted treatment included",
                  "Telehealth behavioral health options",
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
                <h3 className="font-semibold text-foreground">Anthem Member Services</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Contact Anthem's behavioral health line for coverage questions, provider searches, and authorization assistance.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>24/7 crisis support available</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Have your member ID ready</span>
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
              Anthem Coverage Questions
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
              Find Treatment Centers That Accept Anthem
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for rehab facilities that accept Anthem Blue Cross Blue Shield.
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
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
