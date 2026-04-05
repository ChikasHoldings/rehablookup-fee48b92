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
  Globe,
} from "lucide-react";

const coverageDetails = [
  {
    icon: Stethoscope,
    title: "Medical Detox",
    coverage: "Fully Covered",
    details: "In-network Kaiser detox facilities",
  },
  {
    icon: Building2,
    title: "Inpatient Rehab",
    coverage: "Covered In-Network",
    details: "Limited out-of-network coverage",
  },
  {
    icon: Users,
    title: "Outpatient Programs",
    coverage: "Fully Covered",
    details: "Integrated outpatient behavioral health",
  },
  {
    icon: Heart,
    title: "Integrated Care",
    coverage: "Included",
    details: "Coordinated mental health and addiction treatment",
  },
];

const kaiserRegions = [
  { region: "Kaiser Northern California", states: "Northern CA" },
  { region: "Kaiser Southern California", states: "Southern CA" },
  { region: "Kaiser Colorado", states: "CO" },
  { region: "Kaiser Georgia", states: "GA" },
  { region: "Kaiser Hawaii", states: "HI" },
  { region: "Kaiser Mid-Atlantic", states: "DC, MD, VA" },
  { region: "Kaiser Northwest", states: "OR, WA" },
  { region: "Kaiser Washington", states: "WA" },
];

const faqs = [
  {
    question: "Does Kaiser Permanente cover addiction treatment?",
    answer: "Yes, Kaiser provides comprehensive coverage for substance use disorder treatment including detox, inpatient, outpatient, and medication-assisted treatment. Coverage is primarily through their integrated network of facilities.",
  },
  {
    question: "Can I go to an outside treatment center with Kaiser?",
    answer: "Kaiser is an integrated system that primarily provides care within their network. Out-of-network coverage is limited and typically only available in emergencies or when Kaiser cannot provide the needed service.",
  },
  {
    question: "How does Kaiser's integrated model work for addiction treatment?",
    answer: "Kaiser's integrated model means your primary care, mental health, and addiction treatment are all coordinated through one system, allowing for seamless communication between providers.",
  },
  {
    question: "What if there's no Kaiser facility near me?",
    answer: "If you live in a Kaiser service area but need treatment that isn't available locally, Kaiser may authorize treatment at an outside facility. Contact Kaiser to discuss your options.",
  },
  {
    question: "Does Kaiser cover medication-assisted treatment?",
    answer: "Yes, Kaiser covers FDA-approved medications for opioid and alcohol addiction including Suboxone, Vivitrol, and naltrexone as part of their comprehensive treatment approach.",
  },
];

const verificationSteps = [
  {
    step: 1,
    title: "Contact Kaiser Mental Health",
    description: "Call Kaiser's behavioral health department directly",
  },
  {
    step: 2,
    title: "Get an Assessment",
    description: "Kaiser will assess your needs and recommend a level of care",
  },
  {
    step: 3,
    title: "Understand In-Network Options",
    description: "Learn what Kaiser facilities are available in your region",
  },
  {
    step: 4,
    title: "Start Treatment",
    description: "Begin care at a Kaiser or Kaiser-authorized facility",
  },
];

export default function KaiserRehab() {
  const faqSchema = generateFAQSchema(faqs);

  return (
    <Layout>
      <SEO
        title="Kaiser Permanente Rehab Coverage | Find Kaiser Treatment Centers"
        description="Find addiction treatment through Kaiser Permanente. Learn about Kaiser's integrated behavioral health coverage for detox, rehab, and outpatient programs."
        canonical="/insurance/kaiser-rehab"
        keywords={["Kaiser Permanente rehab", "Kaiser addiction treatment", "Kaiser drug rehab", "Kaiser behavioral health", "Kaiser substance abuse", "Kaiser mental health"]}
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Insurance", url: "/insurance" },
          { name: "Kaiser Rehab Coverage", url: "/insurance/kaiser-rehab" },
        ]}
        structuredData={faqSchema}
      />



      {/* Hero Section */}
      <section className="relative overflow-hidden bg-primary py-10 md:py-14">
        <div className="container">
          <BreadcrumbNav className="mb-4"
            items={[
              { label: "Insurance", href: "/insurance" },
              { label: "Kaiser Rehab Coverage" },
            ]}
          />
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img 
                src="/insurance-logos/kaiser.svg" 
                alt="Kaiser Permanente Logo" 
                className="h-12 w-12 object-contain bg-white rounded-lg p-2"
              />
              <Badge variant="secondary" className="bg-white/20 text-white border-0">
                Integrated Care System
              </Badge>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              Kaiser Permanente Rehab Coverage
            </h1>
            <p className="text-primary-foreground/80 text-sm md:text-base max-w-2xl mx-auto">
              Kaiser Permanente offers integrated addiction treatment through their network of facilities. Learn about coverage and find care in your region.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/rehab-centers">
                  <MapPin className="mr-2 h-4 w-4" />
                  Find Treatment Centers
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
              <span className="font-medium text-foreground">Kaiser is an integrated system.</span>{" "}
              Treatment is primarily provided at Kaiser facilities with limited out-of-network options.
            </p>
          </div>
        </div>
      </section>

      {/* Kaiser Regions */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              Kaiser Service Regions
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Kaiser Permanente operates in select states and regions
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {kaiserRegions.map((region) => (
              <div key={region.region} className="flex items-center gap-3 rounded-lg border border-border bg-card p-4">
                <Globe className="h-5 w-5 text-primary shrink-0" />
                <div>
                  <p className="font-medium text-foreground text-sm">{region.region}</p>
                  <p className="text-xs text-muted-foreground">{region.states}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What Kaiser Covers */}
      <section className="border-t border-border bg-muted/30 py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              What Kaiser Covers for Addiction Treatment
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Integrated behavioral health services within the Kaiser network
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

      {/* How to Get Treatment */}
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="mb-8 text-center">
            <h2 className="font-display text-xl font-bold text-foreground md:text-2xl">
              How to Access Kaiser Addiction Treatment
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
                Benefits of Kaiser's Integrated Model
              </h2>
              <ul className="space-y-3">
                {[
                  "Coordinated care between all providers",
                  "Electronic health records shared across system",
                  "Lower out-of-pocket costs for in-network care",
                  "Seamless transition between levels of care",
                  "Integrated mental health and addiction treatment",
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
                <h3 className="font-semibold text-foreground">Kaiser Mental Health</h3>
              </div>
              <p className="text-muted-foreground text-sm mb-4">
                Contact Kaiser's behavioral health department to start the process of getting addiction treatment.
              </p>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>24/7 crisis line available</span>
                </p>
                <p className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>Have your Kaiser ID ready</span>
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
              Kaiser Coverage Questions
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
              Find Addiction Treatment Options
            </h2>
            <p className="text-muted-foreground mb-6">
              Search treatment centers or contact Kaiser directly for in-network options.
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
            <Link to="/insurance/bcbs-treatment" className="text-primary hover:underline">BCBS Coverage</Link>
            <Link to="/insurance/humana-rehab" className="text-primary hover:underline">Humana Coverage</Link>
            <Link to="/insurance" className="text-primary hover:underline">All Insurance →</Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
