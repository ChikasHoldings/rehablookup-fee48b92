import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileCheck,
  Phone,
  ArrowRight,
  CheckCircle,
  Shield,
  Clock,
  Heart,
  Users,
  Star,
  MessageSquare,
} from "lucide-react";

const steps = [
  {
    step: 1,
    icon: Search,
    title: "Search Treatment Centers",
    description: "Enter your location and preferences to browse verified treatment facilities in your area. Filter by treatment type, insurance, amenities, and more.",
    details: [
      "Search by city, state, or ZIP code",
      "Filter by treatment type and specialization",
      "Compare programs side-by-side",
      "View verified ratings and reviews",
    ],
  },
  {
    step: 2,
    icon: FileCheck,
    title: "Review & Compare",
    description: "Explore detailed facility profiles with information about programs, costs, insurance acceptance, and success rates to make an informed decision.",
    details: [
      "Detailed program descriptions",
      "Transparent pricing information",
      "Staff credentials and certifications",
      "Facility photos and virtual tours",
    ],
  },
  {
    step: 3,
    icon: MessageSquare,
    title: "Connect Directly",
    description: "Contact treatment centers directly through our platform or speak with our specialists who can help guide you to the right program.",
    details: [
      "Direct contact with facilities",
      "Free consultation with specialists",
      "Insurance verification assistance",
      "Admission coordination support",
    ],
  },
];

const benefits = [
  {
    icon: Shield,
    title: "Verified Facilities",
    description: "Every center is verified for proper licensing, accreditation, and quality standards.",
  },
  {
    icon: Heart,
    title: "Compassionate Support",
    description: "Our team understands the challenges of finding treatment and provides judgment-free guidance.",
  },
  {
    icon: Clock,
    title: "24/7 Availability",
    description: "Help is available around the clock for urgent situations and immediate assistance.",
  },
  {
    icon: Users,
    title: "Free Service",
    description: "Our directory service is completely free for individuals and families seeking treatment.",
  },
];

const HowItWorks = () => {
  return (
    <Layout>
      <SEO
        title="How It Works - Find Treatment in 3 Simple Steps"
        description="Learn how RehabLookup helps you find the right addiction treatment center. Search, compare, and connect with verified facilities in three easy steps."
        canonical="/how-it-works"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "How It Works", url: "/how-it-works" },
        ]}
      />
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">Simple Process</span>
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
            How It Works
          </h1>
          <p className="text-base text-primary-foreground/80 max-w-2xl mx-auto">
            Finding the right addiction treatment center is simple, confidential, and free. Here's how we help.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Quick & Easy</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="space-y-12 md:space-y-16">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className={`grid gap-8 items-center lg:grid-cols-2 lg:gap-12 animate-fade-in ${
                  index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                  <div className="mb-4 inline-flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-lg font-bold text-accent-foreground shadow-lg">
                      {step.step}
                    </div>
                    <span className="text-sm font-medium text-accent uppercase tracking-wide">Step {step.step}</span>
                  </div>
                  <h2 className="mb-4 font-display text-xl font-bold text-foreground md:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mb-6 text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-3">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                          <CheckCircle className="h-3 w-3 text-accent" />
                        </div>
                        <span className="text-foreground">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}>
                  <div className="relative rounded-2xl border border-border bg-card p-8 shadow-elevated">
                    <div className="flex h-24 w-24 mx-auto items-center justify-center rounded-2xl bg-accent/10">
                      <step.icon className="h-12 w-12 text-accent" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 md:py-16 bg-primary">
        <div className="container">
          <div className="text-center mb-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Star className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Why Choose Us</span>
            </div>
            <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              The RehabLookup Difference
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto">
              We're committed to helping you find the right treatment with transparency and compassion.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20">
                  <benefit.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-primary-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm text-primary-foreground/70">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              Ready to Get Started?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Take the first step toward recovery today. Search our directory or speak with a specialist.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/rehab-centers">
                <Button size="lg" className="gap-2">
                  Find Treatment Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/request-help">
                <Button variant="outline" size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Request Help
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default HowItWorks;
