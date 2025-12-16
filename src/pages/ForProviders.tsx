import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BackToTop } from "@/components/ui/back-to-top";
import { SEO } from "@/components/SEO";
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

const providerNavLinks = [
  { href: "/for-providers", label: "Why List With Us" },
  { href: "/provider-resources", label: "Resources" },
  { href: "/provider-support", label: "Support" },
];

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
    <div className="flex min-h-screen flex-col bg-background">
      <SEO
        title="List Your Treatment Center - For Providers"
        description="Partner with RehabLookup to increase your treatment center's visibility. Connect with families seeking quality addiction care. Free listing available."
        canonical="/for-providers"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "For Providers", url: "/for-providers" },
        ]}
      />
      <Header
        navLinks={providerNavLinks}
        ctaLink="/provider-signup"
        ctaLabel="Get Started"
        variant="provider"
      />
      
      <main className="flex-1">
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center px-5 md:px-6">
          <div className="mb-4 md:mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-white/10 px-5 md:px-4 py-2.5 md:py-1.5">
            <Building2 className="h-5 w-5 md:h-4 md:w-4 text-accent" />
            <span className="text-base md:text-sm font-medium text-primary-foreground">For Treatment Centers</span>
          </div>
          <h1 className="mb-4 md:mb-3 font-display text-3xl md:text-3xl lg:text-4xl font-bold text-primary-foreground">
            Partner With RehabLookup
          </h1>
          <p className="text-lg md:text-base text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Join our network of verified treatment centers and connect with families seeking quality addiction care.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
            <Link to="/provider-signup" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                List Your Facility
                <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
            <Link to="/contact" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                Contact Us
                <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-b border-border bg-card py-8 md:py-6">
        <div className="container px-5 md:px-6">
          <div className="grid grid-cols-2 gap-8 md:gap-6 md:grid-cols-4 text-center">
            <div>
              <div className="font-display text-3xl md:text-2xl lg:text-3xl font-bold text-primary">10K+</div>
              <p className="text-base md:text-sm text-muted-foreground">Monthly Visitors</p>
            </div>
            <div>
              <div className="font-display text-3xl md:text-2xl lg:text-3xl font-bold text-primary">500+</div>
              <p className="text-base md:text-sm text-muted-foreground">Partner Facilities</p>
            </div>
            <div>
              <div className="font-display text-3xl md:text-2xl lg:text-3xl font-bold text-primary">50</div>
              <p className="text-base md:text-sm text-muted-foreground">States Covered</p>
            </div>
            <div>
              <div className="font-display text-3xl md:text-2xl lg:text-3xl font-bold text-accent">24/7</div>
              <p className="text-base md:text-sm text-muted-foreground">Referral Support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-16 md:py-20">
        <div className="container px-5 md:px-6">
          <div className="text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
              <TrendingUp className="h-5 w-5 md:h-4 md:w-4 text-accent" />
              <span className="text-base md:text-sm font-medium text-accent">Partner Benefits</span>
            </div>
            <h2 className="mb-4 md:mb-3 font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
              Why Partner With Us?
            </h2>
            <p className="text-lg md:text-base text-muted-foreground max-w-xl mx-auto">
              RehabLookup helps treatment centers connect with families who need their services most.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.title}
                className="group rounded-2xl md:rounded-xl border border-border bg-card p-7 md:p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30 animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-5 md:mb-4 flex h-14 w-14 md:h-12 md:w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <benefit.icon className="h-7 w-7 md:h-6 md:w-6 text-accent" />
                </div>
                <h3 className="mb-3 md:mb-2 font-display text-xl md:text-lg font-semibold text-foreground">
                  {benefit.title}
                </h3>
                <p className="text-base md:text-sm text-muted-foreground">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listing Features */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container px-5 md:px-6">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            <div className="animate-fade-in">
              <div className="mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
                <CheckCircle className="h-5 w-5 md:h-4 md:w-4 text-accent" />
                <span className="text-base md:text-sm font-medium text-accent">Listing Features</span>
              </div>
              <h2 className="mb-5 font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
                What's Included in Your Listing
              </h2>
              <p className="mb-8 md:mb-6 text-lg md:text-base text-muted-foreground">
                Every listing comes with comprehensive features to showcase your facility and connect with potential clients.
              </p>

              <ul className="space-y-4 md:space-y-3">
                {listingFeatures.map((feature, index) => (
                  <li key={feature} className="flex items-start gap-4 md:gap-3 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
                    <div className="mt-0.5 flex h-6 w-6 md:h-5 md:w-5 shrink-0 items-center justify-center rounded-full bg-accent/15">
                      <CheckCircle className="h-4 w-4 md:h-3 md:w-3 text-accent" />
                    </div>
                    <span className="text-lg md:text-base text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
              <div className="rounded-2xl md:rounded-xl border border-accent/20 bg-gradient-to-br from-primary to-primary/90 p-10 md:p-8 text-center">
                <div className="mb-5 md:mb-4 inline-flex items-center justify-center h-20 w-20 md:h-16 md:w-16 rounded-full bg-white/10">
                  <Building2 className="h-10 w-10 md:h-8 md:w-8 text-accent" />
                </div>
                <h3 className="mb-3 md:mb-2 font-display text-2xl md:text-xl font-semibold text-primary-foreground">
                  Get Started Today
                </h3>
                <p className="mb-8 md:mb-6 text-primary-foreground/80 text-base md:text-sm">
                  Join hundreds of treatment centers already connecting with families through RehabLookup.
                </p>
                <Link to="/contact">
                  <Button variant="hero-light" size="lg" className="w-full gap-2 h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                    Request Information
                    <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-20">
        <div className="container px-5 md:px-6">
          <div className="text-center mb-12">
            <div className="mb-4 inline-flex items-center gap-2.5 md:gap-2 rounded-full bg-accent/10 px-5 md:px-4 py-2.5 md:py-1.5">
              <Clock className="h-5 w-5 md:h-4 md:w-4 text-accent" />
              <span className="text-base md:text-sm font-medium text-accent">Simple Process</span>
            </div>
            <h2 className="mb-4 md:mb-3 font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
              Getting Listed Is Easy
            </h2>
          </div>

          <div className="grid gap-8 md:gap-6 md:grid-cols-3">
            {[
              { step: 1, title: "Apply", description: "Submit your facility information for review and verification." },
              { step: 2, title: "Verify", description: "Our team verifies your licensing, accreditation, and credentials." },
              { step: 3, title: "Launch", description: "Your listing goes live and families can start finding you." },
            ].map((item, index) => (
              <div
                key={item.step}
                className="relative rounded-2xl md:rounded-xl border border-border bg-card p-8 md:p-6 shadow-card text-center animate-fade-in"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="absolute -top-5 md:-top-4 left-1/2 -translate-x-1/2 flex h-10 w-10 md:h-8 md:w-8 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent/80 text-base md:text-sm font-bold text-accent-foreground shadow-lg ring-4 ring-background">
                  {item.step}
                </div>
                <h3 className="mt-6 md:mt-4 mb-3 md:mb-2 font-display text-xl md:text-lg font-semibold text-foreground">
                  {item.title}
                </h3>
                <p className="text-base md:text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20">
        <div className="container px-5 md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl md:rounded-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-accent/10 p-8 md:p-8 lg:p-12 text-center">
            <h2 className="mb-4 md:mb-3 font-display text-2xl md:text-xl lg:text-2xl font-bold text-foreground">
              Ready to Grow Your Admissions?
            </h2>
            <p className="mb-8 md:mb-6 text-lg md:text-base text-muted-foreground max-w-xl mx-auto">
              Partner with RehabLookup and connect with families who are ready to start their recovery journey.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 md:gap-3 sm:flex-row">
              <Link to="/contact" className="w-full sm:w-auto">
                <Button size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                  List Your Facility
                  <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </Link>
              <Link to="/contact" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="gap-2 w-full sm:w-auto h-14 md:h-12 text-lg md:text-base rounded-2xl md:rounded-lg">
                  Contact Us
                  <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
      </main>
      
      <Footer />
      <BackToTop />
    </div>
  );
};

export default ForProviders;