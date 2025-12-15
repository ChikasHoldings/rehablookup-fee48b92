import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Heart,
  Shield,
  Users,
  CheckCircle,
  ArrowRight,
  Phone,
  Eye,
  Target,
  Lightbulb,
  Clock,
} from "lucide-react";

const values = [
  {
    icon: Shield,
    title: "Transparency",
    description:
      "We believe families deserve accurate, honest information about treatment options without hidden agendas or misleading claims.",
  },
  {
    icon: Heart,
    title: "Compassion",
    description:
      "We understand the emotional weight of searching for addiction treatment. Our approach is always respectful and supportive.",
  },
  {
    icon: CheckCircle,
    title: "Verification",
    description:
      "Every facility in our directory is verified for proper licensing, accreditation, and quality standards.",
  },
  {
    icon: Users,
    title: "Accessibility",
    description:
      "Treatment information should be accessible to everyone, regardless of their situation or insurance status.",
  },
];

const About = () => {
  return (
    <Layout>
      <SEO
        title="About RehabLookup - Trusted Addiction Treatment Directory"
        description="RehabLookup connects families with verified addiction treatment centers. Learn about our mission, values, and commitment to transparency in helping you find recovery."
        canonical="/about"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "About", url: "/about" },
        ]}
      />
      {/* Hero - Navy background */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Heart className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Our Story</span>
            </div>
            <h1 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
              About RehabLookup
            </h1>
            <p className="text-base text-primary-foreground/80">
              We're on a mission to connect families with trusted addiction treatment 
              centers through transparency, compassion, and verified information.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-accent" />
              <span>10,000+ Families Helped</span>
            </div>
          </div>
        </div>
      </section>

      {/* What We Are */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="animate-fade-in">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
                <Eye className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium text-accent">Who We Are</span>
              </div>
              <h2 className="mb-5 font-display text-xl font-bold text-foreground md:text-2xl">
                A Directory You Can Trust
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p>
                  <strong className="text-foreground">RehabLookup is a directory service, not a treatment provider.</strong> We 
                  connect individuals and families with addiction treatment centers across the nation.
                </p>
                <p>
                  We understand that finding the right treatment center is one of the most 
                  important decisions a family can make. That's why we've built a platform 
                  focused on transparency, accuracy, and compassion.
                </p>
                <p>
                  Our team works diligently to verify each facility in our directory, 
                  ensuring they meet proper licensing requirements and quality standards.
                </p>
              </div>
            </div>
            <div className="relative animate-fade-in" style={{ animationDelay: "0.1s" }}>
              <div className="aspect-square rounded-xl border border-accent/20 bg-gradient-to-br from-primary to-primary/80 p-8 shadow-card">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10">
                    <Heart className="h-10 w-10 text-accent" />
                  </div>
                  <p className="font-display text-xl font-semibold text-primary-foreground">
                    Helping families find hope
                  </p>
                  <p className="mt-2 text-sm text-primary-foreground/70">
                    Every journey begins with a single step
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-primary py-16 md:py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Target className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Our Mission</span>
            </div>
            <h2 className="mb-5 font-display text-xl font-bold text-primary-foreground md:text-2xl">
              Making Treatment Accessible
            </h2>
            <p className="text-primary-foreground/80">
              We believe that everyone deserves access to quality addiction treatment information. 
              Our mission is to eliminate confusion, reduce barriers, and provide families with 
              the resources they need to find the right care—without pressure, hidden fees, or 
              misleading information.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="mb-10 text-center animate-fade-in">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-1.5">
              <Lightbulb className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-accent">Our Values</span>
            </div>
            <h2 className="mb-3 font-display text-xl font-bold text-foreground md:text-2xl">
              What Guides Us
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              These core principles shape everything we do at RehabLookup.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-accent/30 hover:shadow-elevated animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 transition-colors duration-300 group-hover:bg-accent/20">
                  <value.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="text-sm text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-y border-border bg-muted/30 py-10">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-xl border border-accent/30 bg-accent/5 p-6 animate-fade-in">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/10">
                <Shield className="h-5 w-5 text-accent" />
              </div>
              <div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  Important Notice
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    RehabLookup is a directory and referral service. We are <strong className="text-foreground">not</strong> a 
                    treatment provider, medical facility, or substitute for professional medical advice.
                  </p>
                  <p>
                    If you or someone you know is experiencing a medical emergency, please call 911 immediately.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA - Navy background */}
      <section className="bg-primary py-16">
        <div className="container text-center">
          <h2 className="mb-3 font-display text-xl font-bold text-primary-foreground md:text-2xl">
            Ready to Find Treatment?
          </h2>
          <p className="mb-6 text-primary-foreground/80">
            Search our directory or speak with a specialist today.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/rehab-centers">
              <Button variant="hero-light" size="lg" className="gap-2">
                Find Treatment Centers
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link to="/request-help?source=about_cta">
              <Button variant="hero-light" size="lg" className="gap-2">
                <Heart className="h-4 w-4" />
                Request Help
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default About;
