import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Users,
  TrendingUp,
  Shield,
  CheckCircle,
  Phone,
  ArrowRight,
  Star,
  Eye,
  MessageSquare,
  BarChart3,
  Clock,
} from "lucide-react";

const benefits = [
  {
    icon: Eye,
    title: "Increased Visibility",
    description: "Get your facility in front of thousands of families actively searching for addiction treatment options.",
  },
  {
    icon: Users,
    title: "Qualified Referrals",
    description: "Connect with individuals and families who are ready to start their recovery journey.",
  },
  {
    icon: Shield,
    title: "Verified Badge",
    description: "Stand out with our verification badge that signals trust and quality to potential clients.",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track your listing performance with detailed insights on views, inquiries, and engagement.",
  },
  {
    icon: MessageSquare,
    title: "Direct Communication",
    description: "Receive inquiries directly from families interested in your programs and services.",
  },
  {
    icon: Star,
    title: "Featured Placement",
    description: "Upgrade to featured status for premium placement in search results and homepage highlights.",
  },
];

const listingFeatures = [
  "Detailed facility profile with photos and virtual tours",
  "Program descriptions and treatment specializations",
  "Insurance and payment information display",
  "Staff credentials and accreditations",
  "Client testimonials and success stories",
  "Direct contact and inquiry forms",
  "Analytics dashboard and reporting",
  "Priority customer support",
];

const ForProviders = () => {
  return (
    <Layout>
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <Building2 className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">For Treatment Centers</span>
          </div>
          <h1 className="mb-3 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
            Partner With RehabLookup
          </h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join our network of verified treatment centers and connect with families seeking quality addiction care.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/contact">
              <Button variant="hero-light" size="lg" className="gap-2">
                List Your Facility
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="tel:1-800-555-0199">
              <Button variant="hero-light" size="lg" className="gap-2">
                <Phone className="h-4 w-4" />
                Call to Learn More
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card py-6">
        <div className="container">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 text-center">
            <div>
              <div className="font-display text-2xl font-bold text-primary md:text-3xl">10K+</div>
              <p className="text-sm text-muted-foreground">Monthly Visitors</p>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary md:text-3xl">500+</div>
              <p className="text-sm text-muted-foreground">Partner Facilities</p>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-primary md:text-3xl">50</div>
              <p className="text-sm text-muted-foreground">States Covered</p>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-accent md:text-3xl">24/7</div>
              <p className="text-sm text-muted-foreground">Referral Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Partner Benefits</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Why Partner With Us?
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              RehabLookup helps treatment centers connect with families who need their services most.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30 animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <benefit.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listing Features */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="animate-fade-in">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <CheckCircle className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Listing Features</span>
              </div>
              <h2 className="mb-5 font-display text-2xl font-bold text-foreground md:text-3xl">
                What's Included in Your Listing
              </h2>
              <p className="mb-6 text-muted-foreground">
                Every listing comes with comprehensive features to showcase your facility and connect with potential clients.
              </p>

              <ul className="space-y-3">
                {listingFeatures.map((feature, index) => (
                  <li key={feature} className="flex items-start gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                      <CheckCircle className="h-3 w-3 text-accent" />
                    </div>
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="rounded-2xl border border-accent/20 bg-gradient-to-br from-primary to-primary/90 p-8 text-center">
                <div className="mb-4 inline-flex items-center justify-center h-16 w-16 rounded-full bg-white/10">
                  <Building2 className="h-8 w-8 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-primary-foreground">
                  Get Started Today
                </h3>
                <p className="mb-6 text-primary-foreground/80 text-sm">
                  Join hundreds of treatment centers already connecting with families through RehabLookup.
                </p>
                <Link to="/contact">
                  <Button variant="hero-light" size="lg" className="w-full gap-2">
                    Request Information
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <Clock className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Simple Process</span>
            </div>
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Getting Listed Is Easy
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {[
              { step: 1, title: "Apply", description: "Submit your facility information for review and verification." },
              { step: 2, title: "Verify", description: "Our team verifies your licensing, accreditation, and credentials." },
              { step: 3, title: "Launch", description: "Your listing goes live and families can start finding you." },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-border bg-card p-6 shadow-card text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-sm font-bold text-accent-foreground shadow-lg ring-4 ring-background">
                  {item.step}
                </div>
                <h3 className="mt-4 mb-2 font-display text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
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
            <h2 className="mb-3 font-display text-2xl font-bold text-foreground md:text-3xl">
              Ready to Grow Your Admissions?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Partner with RehabLookup and connect with families who are ready to start their recovery journey.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/contact">
                <Button size="lg" className="gap-2">
                  List Your Facility
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="tel:1-800-555-0199">
                <Button variant="outline" size="lg" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call 1-800-555-0199
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default ForProviders;
