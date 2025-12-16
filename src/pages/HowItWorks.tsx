import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Search,
  FileCheck,
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
      <section className="bg-primary py-12 px-4 md:py-16 md:px-6">
        <div className="container text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-4">
            <CheckCircle className="h-5 w-5 text-accent md:h-4 md:w-4" />
            <span className="text-base font-medium text-primary-foreground md:text-sm">Simple Process</span>
          </div>
          <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl md:mb-3">
            How It Works
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed md:text-base">
            Finding the right addiction treatment center is simple, confidential, and free. Here's how we help.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-5 text-base md:gap-10 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>100% Free</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Clock className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Quick & Easy</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Heart className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Confidential</span>
            </div>
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="space-y-10 md:space-y-16">
            {steps.map((step, index) => (
              <div
                key={step.step}
                className={`grid gap-6 items-center lg:grid-cols-2 lg:gap-12 animate-fade-in ${
                  index % 2 === 1 ? "lg:grid-flow-col-dense" : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                  <div className="mb-5 inline-flex items-center gap-3 md:mb-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-lg font-bold text-accent-foreground shadow-lg md:h-10 md:w-10">
                      {step.step}
                    </div>
                    <span className="text-base font-medium text-accent uppercase tracking-wide md:text-sm">Step {step.step}</span>
                  </div>
                  <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-2xl">
                    {step.title}
                  </h2>
                  <p className="mb-6 text-base text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                  <ul className="space-y-4 md:space-y-3">
                    {step.details.map((detail) => (
                      <li key={detail} className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 md:h-5 md:w-5">
                          <CheckCircle className="h-4 w-4 text-accent md:h-3 md:w-3" />
                        </div>
                        <span className="text-base text-foreground md:text-base">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={`${index % 2 === 1 ? "lg:col-start-1" : ""}`}>
                  <div className="relative rounded-2xl border border-border bg-card p-10 shadow-elevated md:p-8">
                    <div className="flex h-28 w-28 mx-auto items-center justify-center rounded-2xl bg-accent/10 md:h-24 md:w-24">
                      <step.icon className="h-14 w-14 text-accent md:h-12 md:w-12" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 px-4 bg-primary md:py-16 md:px-6">
        <div className="container">
          <div className="text-center mb-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-4">
              <Star className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span className="text-base font-medium text-primary-foreground md:text-sm">Why Choose Us</span>
            </div>
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-2xl md:mb-3">
              The RehabLookup Difference
            </h2>
            <p className="text-lg text-primary-foreground/80 max-w-xl mx-auto leading-relaxed md:text-base">
              We're committed to helping you find the right treatment with transparency and compassion.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 md:gap-6">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/20 md:h-12 md:w-12 md:rounded-xl">
                  <benefit.icon className="h-7 w-7 text-accent md:h-6 md:w-6" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-primary-foreground md:text-lg md:mb-2">
                  {benefit.title}
                </h3>
                <p className="text-base text-primary-foreground/70 leading-relaxed md:text-sm">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-12 text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-2xl md:mb-3">
              Ready to Get Started?
            </h2>
            <p className="mb-8 text-base text-muted-foreground max-w-xl mx-auto leading-relaxed md:text-base md:mb-6">
              Take the first step toward recovery today. Search our directory or speak with a specialist.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-3">
              <Link to="/rehab-centers" className="w-full sm:w-auto">
                <Button size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                  Find Treatment Centers
                  <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </Link>
              <Link to="/request-help?source=howitworks_cta" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                  <Heart className="h-5 w-5 md:h-4 md:w-4" />
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