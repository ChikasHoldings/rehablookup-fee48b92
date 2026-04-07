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
import { 
  InternalLinkingSection, 
  treatmentTypeLinks, 
  nearMeLinks, 
  resourceLinks 
} from "@/components/seo/InternalLinkingSection";
import { FeaturedCentersSection } from "@/components/seo/FeaturedCentersSection";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "Medically supervised withdrawal with 24/7 care. Aetna typically covers 3-7 days depending on substance.",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered with Authorization",
    details: "Residential treatment programs typically 30-90 days. Prior authorization required; expect 14-28 day initial approval.",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "IOP (9+ hours/week) and PHP (20+ hours/week) programs for flexible treatment. No authorization for in-network.",
  },
  {
    icon: Heart,
    title: "Medication-Assisted Treatment",
    coverage: "Covered",
    details: "Suboxone, Vivitrol, and naltrexone covered. Some MAT requires step therapy or prior authorization.",
  },
];

// Aetna-specific statistics and info
const aetnaStats = {
  networkSize: "Over 50,000 behavioral health providers nationwide",
  avgDeductible: "$500-$2,000 individual / $1,000-$4,000 family (varies by plan)",
  avgCoinsurance: "20-30% after deductible for in-network services",
  authTimeline: "24-72 hours for urgent care; 3-5 business days for routine",
};

const faqs = [
  {
    question: "Does Aetna cover rehab treatment?",
    answer: "Yes, Aetna provides comprehensive coverage for addiction treatment including detox, inpatient rehab, outpatient programs, and medication-assisted treatment. Under the Mental Health Parity Act, Aetna must cover substance use disorder treatment at the same level as physical health conditions.",
  },
  {
    question: "How do I verify my Aetna benefits for rehab?",
    answer: "Call Aetna's behavioral health line at 1-800-279-4572, available 24/7. Have your member ID ready. Alternatively, most treatment centers offer free, confidential benefit verification within 24 hours.",
  },
  {
    question: "Does Aetna require pre-authorization for rehab?",
    answer: "Most Aetna plans require prior authorization for inpatient/residential treatment (typically takes 24-72 hours for urgent cases). Outpatient services at in-network facilities often don't require prior auth. The treatment facility typically handles this process during admission.",
  },
  {
    question: "What is my out-of-pocket cost with Aetna?",
    answer: "For in-network facilities, expect to pay your annual deductible ($500-$2,000 typical) plus 20-30% coinsurance. Out-of-network costs are significantly higher—often 40-50% coinsurance with a higher deductible. Many plans have an out-of-pocket maximum ($3,000-$8,000) after which Aetna covers 100%.",
  },
  {
    question: "How long will Aetna cover treatment?",
    answer: "Length of covered treatment is determined by medical necessity, not arbitrary limits. Aetna uses the ASAM (American Society of Addiction Medicine) criteria to assess continued need. Initial inpatient approvals are typically 14-28 days, with extensions based on clinical progress.",
  },
  {
    question: "Does Aetna cover out-of-state rehab?",
    answer: "Yes, Aetna's national PPO plans cover treatment at out-of-state facilities. However, in-network benefits only apply if the facility is in Aetna's network. Some HMO plans may require referrals or have geographic restrictions—check your specific plan.",
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
        structuredData={[faqSchema, { "@context": "https://schema.org", "@type": "MedicalWebPage", specialty: "Addiction Medicine", lastReviewed: new Date().toISOString().split("T")[0] }]}
      />



      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Aetna Rehab Coverage" },
            ]}
          />
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

      {/* Aetna-Specific Stats */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Aetna Behavioral Health Coverage at a Glance
            </h2>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Network Size", value: aetnaStats.networkSize },
              { label: "Typical Deductible", value: aetnaStats.avgDeductible },
              { label: "In-Network Coinsurance", value: aetnaStats.avgCoinsurance },
              { label: "Authorization Timeline", value: aetnaStats.authTimeline },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{stat.label}</p>
                <p className="text-sm font-medium text-foreground">{stat.value}</p>
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
                Why Choose an Aetna In-Network Facility?
              </h2>
              <ul className="space-y-3">
                {[
                  "Save 30-50% compared to out-of-network costs",
                  "No balance billing—you only pay your copay/coinsurance",
                  "Faster authorization—facilities have direct lines to Aetna",
                  "Care coordination with Aetna case managers",
                  "Seamless claims—no paperwork for you to file",
                  "Access to Aetna's Recovery Support Program post-treatment",
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
                <h3 className="font-semibold text-foreground">Aetna Behavioral Health Line</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Call Aetna's dedicated behavioral health line for coverage questions, finding providers, or getting a case manager assigned.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">1-800-279-4572</span>
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Available 24/7 for crisis support</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Have your Member ID ready</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Centers accepting Aetna */}
      <FeaturedCentersSection 
        title="Treatment Centers Accepting Aetna"
        description="Verified facilities that work with Aetna insurance"
        limit={8}
        className="border-t border-border"
      />

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

      {/* SEO Internal Linking */}
      <InternalLinkingSection
        title="Explore More Resources"
        description="Learn about treatment options and find care near you"
        variant="grid"
        groups={[
          { title: "Treatment Programs", links: treatmentTypeLinks.slice(0, 5) },
          { title: "Find Treatment Near You", links: nearMeLinks.slice(0, 5) },
          { title: "Recovery Guides", links: resourceLinks.slice(0, 5) },
        ]}
      />

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
