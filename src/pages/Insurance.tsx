import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Shield,
  CheckCircle,
  Phone,
  ArrowRight,
  FileText,
  HelpCircle,
  CreditCard,
  Clock,
  Users,
  Heart,
} from "lucide-react";

const insuranceProviders = [
  "Aetna",
  "Anthem Blue Cross",
  "Blue Cross Blue Shield",
  "Cigna",
  "Humana",
  "Kaiser Permanente",
  "Medicaid",
  "Medicare",
  "Tricare",
  "United Healthcare",
  "Magellan",
  "Optum",
];

const faqs = [
  {
    question: "Does my insurance cover addiction treatment?",
    answer: "Most health insurance plans are required to cover substance abuse treatment under the Affordable Care Act. Coverage levels vary by plan, but many cover detox, inpatient, and outpatient services.",
  },
  {
    question: "How do I verify my insurance benefits?",
    answer: "Call the number on your insurance card or use our free insurance verification service. Treatment centers can also verify your benefits directly with your provider.",
  },
  {
    question: "What if I don't have insurance?",
    answer: "Many treatment centers offer sliding scale fees, payment plans, or can help you apply for Medicaid. Some state-funded programs provide free or low-cost treatment.",
  },
  {
    question: "What costs are typically covered?",
    answer: "Depending on your plan, coverage may include medical detox, residential treatment, outpatient programs, therapy sessions, and medication-assisted treatment (MAT).",
  },
];

const Insurance = () => {
  return (
    <Layout>
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <Shield className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">Insurance Coverage</span>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Insurance & Payment Options
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto">
            Most insurance plans cover addiction treatment. Learn about your coverage options and find affordable care.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span>Free Verification</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Quick Results</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* Insurance Verification CTA */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="rounded-2xl border border-accent/30 bg-gradient-to-br from-primary to-primary/90 p-8 md:p-10 text-center animate-fade-in">
            <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10">
              <FileText className="h-8 w-8 text-accent" />
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Free Insurance Verification
            </h2>
            <p className="mb-6 text-primary-foreground/80 max-w-xl mx-auto">
              Not sure what your insurance covers? Get a free, confidential verification in minutes.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <a href="tel:1-800-555-0199">
                <Button variant="hero-light" size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Verify by Phone
                </Button>
              </a>
              <Link to="/contact">
                <Button variant="hero-light" size="lg" className="gap-2">
                  Request Callback
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Accepted Insurance */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <CreditCard className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Accepted Providers</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Major Insurance Providers
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Treatment centers in our network work with most major insurance providers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {insuranceProviders.map((provider, index) => (
              <div
                key={provider}
                className="flex items-center justify-center rounded-xl border border-border bg-card p-4 text-center shadow-card transition-all duration-300 hover:border-accent/30 hover:shadow-elevated animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span className="font-medium text-foreground">{provider}</span>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don't see your provider? <Link to="/contact" className="text-primary font-medium hover:underline">Contact us</Link> – we work with many additional insurance plans.
          </p>
        </div>
      </section>

      {/* Payment Options */}
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Shield className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                Private Insurance
              </h3>
              <p className="text-sm text-muted-foreground">
                Most private insurance plans provide coverage for addiction treatment services, including detox, residential, and outpatient care.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                Medicaid & Medicare
              </h3>
              <p className="text-sm text-muted-foreground">
                Government programs like Medicaid and Medicare cover substance abuse treatment. Many facilities accept these programs.
              </p>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-card animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <CreditCard className="h-6 w-6 text-accent" />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                Self-Pay & Financing
              </h3>
              <p className="text-sm text-muted-foreground">
                Many centers offer payment plans, sliding scale fees, and financing options to make treatment accessible without insurance.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <HelpCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">FAQ</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Common Insurance Questions
            </h2>
          </div>

          <div className="mx-auto max-w-3xl space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={faq.question}
                className="rounded-xl border border-border bg-card p-6 shadow-card animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <h4 className="mb-2 font-semibold text-foreground">{faq.question}</h4>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
            Have Insurance Questions?
          </h2>
          <p className="mb-6 text-primary-foreground/80 max-w-xl mx-auto">
            Our team can help you understand your coverage and find treatment options that fit your budget.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="tel:1-800-555-0199">
              <Button variant="hero-light" size="lg" className="gap-2">
                <Phone className="h-4 w-4" />
                Call 1-800-555-0199
              </Button>
            </a>
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2">
                Find Treatment Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Insurance;
