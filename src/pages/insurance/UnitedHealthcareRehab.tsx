import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO, generateFAQSchema, generateLocalBusinessAggregateSchema } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/seo/BreadcrumbNav";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";
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
    details: "Inpatient detoxification services",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered with Auth",
    details: "Residential treatment with day limits on some plans",
  },
  {
    icon: Users,
    title: "Outpatient Care",
    coverage: "Fully Covered",
    details: "IOP, PHP, and individual therapy",
  },
  {
    icon: Heart,
    title: "MAT Programs",
    coverage: "Covered",
    details: "Suboxone, Vivitrol, and other FDA-approved medications",
  },
];

const faqs = [
  {
    question: "Does United Healthcare cover rehab?",
    answer: "Yes, UnitedHealthcare provides comprehensive coverage for substance abuse treatment through Optum Behavioral Health. Coverage includes detox, inpatient, outpatient, and medication-assisted treatment.",
  },
  {
    question: "What is Optum Behavioral Health?",
    answer: "Optum manages behavioral health benefits for UnitedHealthcare, including substance abuse treatment. They maintain the provider network and handle authorizations for treatment services.",
  },
  {
    question: "Are there day limits for inpatient treatment?",
    answer: "Some UHC plans have day limits for inpatient treatment, while others cover treatment for as long as medically necessary. Check your specific plan details or call to verify.",
  },
  {
    question: "How do I get authorization for treatment?",
    answer: "Contact Optum Behavioral Health or have the treatment facility's admissions team request authorization. Pre-authorization is typically required for inpatient and residential care.",
  },
  {
    question: "Does UHC cover out-of-network treatment?",
    answer: "If you have a PPO or POS plan, out-of-network coverage is available but at higher cost-sharing. HMO and EPO plans typically require in-network providers.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Call Optum Behavioral Health",
    description: "Use the number on your UHC card for behavioral health services",
  },
  {
    step: 2,
    title: "Provide Member Information",
    description: "Have your member ID and group number ready",
  },
  {
    step: 3,
    title: "Ask About Coverage",
    description: "Inquire about day limits, authorization, and cost-sharing",
  },
  {
    step: 4,
    title: "Get Facility Verified",
    description: "Confirm the treatment center is in Optum's network",
  },
];

export default function UnitedHealthcareRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="United Healthcare Rehab Coverage | Find UHC Treatment Centers"
        description="Find addiction treatment centers that accept United Healthcare. Learn about UHC and Optum coverage for detox, inpatient rehab, and outpatient programs."
        canonical="/insurance/united-healthcare-rehab"
        keywords={["United Healthcare rehab", "UHC addiction treatment", "Optum behavioral health", "UHC drug rehab", "United Healthcare substance abuse", "rehab that takes UHC"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "United Healthcare Rehab", url: "/insurance/united-healthcare-rehab" },
        ]}
        structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]}
      />



      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "United Healthcare Rehab" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/united.svg" 
                alt="United Healthcare Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Largest US Health Carrier
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              United Healthcare Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              As the largest health carrier in the US, UnitedHealthcare provides extensive addiction treatment coverage through Optum Behavioral Health.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find UHC-Accepting Centers
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
              <span className="font-medium text-foreground">Coverage managed by Optum.</span>{" "}
              Verify your specific behavioral health benefits before starting treatment.
            </p>
          </div>
        </div>
      </section>

      {/* What UHC Covers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What United Healthcare Covers
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive substance abuse treatment through Optum Behavioral Health
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
              How to Verify Your UHC Benefits
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
                UHC Behavioral Health Benefits
              </h2>
              <ul className="space-y-3">
                {[
                  "Extensive Optum provider network",
                  "Coverage for all levels of care",
                  "Medication-assisted treatment included",
                  "Telehealth options available",
                  "Care coordination services",
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
                <h3 className="font-semibold text-foreground">Optum Behavioral Health</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Contact Optum for questions about your UHC behavioral health coverage, finding providers, or authorization.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>24/7 crisis support available</span>
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

      {/* Featured Centers accepting UHC */}
      <FeaturedCentersSection 
        title="Treatment Centers Accepting United Healthcare"
        description="Verified facilities that work with UHC insurance"
        limit={8}
        className="border-t border-border"
      />

      {/* FAQs */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              United Healthcare Coverage Questions
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
              Find Treatment Centers That Accept UHC
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for rehab facilities in the Optum Behavioral Health network.
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
            <Link to="/insurance/cigna-rehab" className="text-primary hover:underline">Cigna Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
