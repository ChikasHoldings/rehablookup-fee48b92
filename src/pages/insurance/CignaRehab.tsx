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
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "Supervised withdrawal management",
  },
  {
    icon: Building2,
    title: "Residential Treatment",
    coverage: "Covered with Review",
    details: "Inpatient care with utilization review",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "IOP and PHP with broad network access",
  },
  {
    icon: Heart,
    title: "MAT Programs",
    coverage: "Covered",
    details: "Medication-assisted treatment for opioids and alcohol",
  },
];

const faqs = [
  {
    question: "Does Cigna cover addiction treatment?",
    answer: "Yes, Cigna provides comprehensive coverage for substance use disorder treatment including detox, residential care, outpatient programs, and medication-assisted treatment as part of their behavioral health benefits.",
  },
  {
    question: "How does Cigna's step-down approach work?",
    answer: "Cigna may require patients to complete detox before approving residential treatment, and may encourage step-down to outpatient care as clinically appropriate. This approach is designed to match treatment intensity to clinical needs.",
  },
  {
    question: "What is Cigna's behavioral health network?",
    answer: "Cigna partners with Evernorth Behavioral Health to manage their behavioral health network, which includes thousands of treatment facilities and providers nationwide.",
  },
  {
    question: "Does Cigna require prior authorization?",
    answer: "Most Cigna plans require prior authorization for inpatient and residential treatment. Outpatient services typically don't require authorization but may have session limits.",
  },
  {
    question: "Can I go to an out-of-network facility with Cigna?",
    answer: "Yes, if you have a PPO or POS plan. Out-of-network benefits typically have higher deductibles and coinsurance, but coverage is still available for substance abuse treatment.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Call Cigna Behavioral Health",
    description: "Use the number on your card or call 1-800-244-6224",
  },
  {
    step: 2,
    title: "Request Benefits Summary",
    description: "Ask for substance abuse treatment coverage details",
  },
  {
    step: 3,
    title: "Understand Authorization",
    description: "Learn what services require prior approval",
  },
  {
    step: 4,
    title: "Verify Provider Network",
    description: "Confirm the treatment center is in Cigna's network",
  },
];

export default function CignaRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Cigna Rehab Coverage | Find Treatment Centers That Accept Cigna"
        description="Find addiction treatment centers that accept Cigna insurance. Learn about Cigna behavioral health coverage for detox, rehab, and outpatient programs."
        canonical="/insurance/cigna-rehab"
        keywords={["Cigna rehab coverage", "Cigna addiction treatment", "Cigna drug rehab", "Cigna behavioral health", "Cigna substance abuse", "rehab that takes Cigna"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Cigna Rehab Coverage", url: "/insurance/cigna-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Cigna Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/cigna.svg" 
                alt="Cigna Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Global Health Services
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Cigna Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Cigna offers behavioral health coverage for addiction treatment through their Evernorth network. Find treatment centers that accept Cigna.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Cigna-Accepting Centers
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
              <span className="font-medium text-foreground">Coverage varies by plan type.</span>{" "}
              Contact Cigna or treatment facilities to verify your specific behavioral health benefits.
            </p>
          </div>
        </div>
      </section>

      {/* What Cigna Covers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Cigna Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive behavioral health coverage through the Evernorth network
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
              How to Verify Your Cigna Benefits
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
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="font-display text-xl font-bold text-foreground md:text-2xl mb-4">
                Cigna Behavioral Health Benefits
              </h2>
              <ul className="space-y-3">
                {[
                  "Access to Evernorth behavioral health network",
                  "Coverage for both in-network and out-of-network care",
                  "Medication-assisted treatment included",
                  "Mental health parity compliance",
                  "24/7 crisis support line",
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
                <h3 className="font-semibold text-foreground">Cigna Behavioral Health Line</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Call Cigna's dedicated behavioral health line for coverage questions, provider searches, and crisis support.
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
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Cigna Coverage Questions
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
              Find Treatment Centers That Accept Cigna
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for rehab facilities in the Cigna behavioral health network.
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
            <Link to="/insurance/aetna-rehab" className="text-primary hover:underline">Aetna Coverage</Link>
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance/united-healthcare-rehab" className="text-primary hover:underline">UHC Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
