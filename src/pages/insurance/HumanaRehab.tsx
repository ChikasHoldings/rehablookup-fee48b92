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
    details: "Medically supervised withdrawal management",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Prior Auth Required",
    details: "Residential treatment with authorization",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Covered",
    details: "IOP, PHP, and standard outpatient care",
  },
  {
    icon: Heart,
    title: "Behavioral Health",
    coverage: "Included",
    details: "Mental health and substance abuse benefits",
  },
];

const faqs = [
  {
    question: "Does Humana cover addiction treatment?",
    answer: "Yes, Humana provides coverage for substance use disorder treatment including detox, inpatient rehabilitation, outpatient programs, and medication-assisted treatment as part of their behavioral health benefits.",
  },
  {
    question: "Do I need pre-authorization for Humana rehab coverage?",
    answer: "Most Humana plans require prior authorization for inpatient and residential treatment services. Outpatient services may not require authorization but check your specific plan.",
  },
  {
    question: "What behavioral health network does Humana use?",
    answer: "Humana manages their behavioral health services through their integrated network. They have partnerships with treatment facilities across the country.",
  },
  {
    question: "Does Humana cover out-of-network treatment?",
    answer: "Coverage for out-of-network treatment depends on your plan type. PPO plans typically offer out-of-network benefits at higher cost-sharing, while HMO plans may require in-network providers.",
  },
  {
    question: "What is my cost for treatment with Humana?",
    answer: "Your out-of-pocket costs depend on your plan's deductible, copays, and coinsurance. Contact Humana or the treatment facility to get a benefits verification and cost estimate.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Call Humana Member Services",
    description: "Use the number on your Humana ID card",
  },
  {
    step: 2,
    title: "Request Behavioral Health Benefits",
    description: "Ask specifically about substance abuse treatment coverage",
  },
  {
    step: 3,
    title: "Understand Authorization",
    description: "Learn what services require prior approval",
  },
  {
    step: 4,
    title: "Find In-Network Providers",
    description: "Confirm the treatment center accepts Humana",
  },
];

export default function HumanaRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Humana Rehab Coverage | Find Treatment Centers That Accept Humana"
        description="Find addiction treatment centers that accept Humana insurance. Learn about Humana's behavioral health coverage for detox, rehab, and outpatient programs."
        canonical="/insurance/humana-rehab"
        keywords={["Humana rehab coverage", "Humana addiction treatment", "Humana drug rehab", "Humana behavioral health", "Humana substance abuse", "rehab that takes Humana"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Humana Rehab Coverage", url: "/insurance/humana-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Humana Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/humana.svg" 
                alt="Humana Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Health & Wellness Company
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Humana Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Humana provides behavioral health coverage including addiction treatment. Find treatment centers that accept your Humana insurance plan.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Humana-Accepting Centers
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
              <span className="font-medium text-foreground">Coverage varies by plan.</span>{" "}
              Contact Humana or treatment facilities to verify your specific behavioral health benefits.
            </p>
          </div>
        </div>
      </section>

      {/* What Humana Covers */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Humana Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Comprehensive behavioral health benefits for substance use disorders
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
              How to Verify Your Humana Benefits
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
                Humana Behavioral Health Benefits
              </h2>
              <ul className="space-y-3">
                {[
                  "Coverage for all levels of addiction care",
                  "In-network treatment facilities nationwide",
                  "Medication-assisted treatment included",
                  "Mental health parity compliance",
                  "Integrated care coordination",
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
                <h3 className="font-semibold text-foreground">Humana Member Services</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Contact Humana for coverage questions, provider searches, and authorization assistance.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>24/7 nurse line available</span>
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
              Humana Coverage Questions
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
              Find Treatment Centers That Accept Humana
            </h2>
            <p className="text-muted-foreground mb-6">
              Search our directory for rehab facilities that accept Humana insurance.
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
            <Link to="/insurance/kaiser-rehab" className="text-primary hover:underline">Kaiser Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
