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
      <section className="bg-primary py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 md:px-4 md:py-1.5">
              <Heart className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span className="text-base font-medium text-primary-foreground md:text-sm">Our Story</span>
            </div>
            <h1 className="mb-5 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl md:mb-4">
              About RehabLookup
            </h1>
            <p className="text-lg text-primary-foreground/80 leading-relaxed md:text-base">
              We're on a mission to connect families with trusted addiction treatment 
              centers through transparency, compassion, and verified information.
            </p>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-5 px-4 md:py-4 md:px-6">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-5 text-base md:gap-10 md:text-sm">
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Shield className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>Verified Facilities</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Clock className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>24/7 Support</span>
            </div>
            <div className="flex items-center gap-2.5 text-muted-foreground md:gap-2">
              <Users className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span>10,000+ Families Helped</span>
            </div>
          </div>
        </div>
      </section>

      {/* What We Are */}
      <section className="py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-12">
            <div className="animate-fade-in">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-5">
                <Eye className="h-5 w-5 text-accent md:h-4 md:w-4" />
                <span className="text-base font-medium text-accent md:text-sm">Who We Are</span>
              </div>
              <h2 className="mb-5 font-display text-2xl font-bold text-foreground md:text-2xl">
                A Directory You Can Trust
              </h2>
              <div className="space-y-5 text-muted-foreground text-base leading-relaxed md:space-y-4 md:text-base">
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
              <div className="aspect-square rounded-2xl border border-accent/20 bg-gradient-to-br from-primary to-primary/80 p-8 shadow-card md:rounded-xl">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <div className="mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 md:mb-4 md:h-20 md:w-20">
                    <Heart className="h-12 w-12 text-accent md:h-10 md:w-10" />
                  </div>
                  <p className="font-display text-2xl font-semibold text-primary-foreground md:text-xl">
                    Helping families find hope
                  </p>
                  <p className="mt-3 text-base text-primary-foreground/70 md:mt-2 md:text-sm">
                    Every journey begins with a single step
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-primary py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-5">
              <Target className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span className="text-base font-medium text-primary-foreground md:text-sm">Our Mission</span>
            </div>
            <h2 className="mb-5 font-display text-2xl font-bold text-primary-foreground md:text-2xl">
              Making Treatment Accessible
            </h2>
            <p className="text-lg text-primary-foreground/80 leading-relaxed md:text-base">
              We believe that everyone deserves access to quality addiction treatment information. 
              Our mission is to eliminate confusion, reduce barriers, and provide families with 
              the resources they need to find the right care—without pressure, hidden fees, or 
              misleading information.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-12 px-4 md:py-20 md:px-6">
        <div className="container">
          <div className="mb-10 text-center animate-fade-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent/10 px-5 py-2 md:px-4 md:py-1.5 md:mb-5">
              <Lightbulb className="h-5 w-5 text-accent md:h-4 md:w-4" />
              <span className="text-base font-medium text-accent md:text-sm">Our Values</span>
            </div>
            <h2 className="mb-4 font-display text-2xl font-bold text-foreground md:text-2xl md:mb-3">
              What Guides Us
            </h2>
            <p className="mx-auto max-w-2xl text-base text-muted-foreground md:text-base">
              These core principles shape everything we do at RehabLookup.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 md:gap-5">
            {values.map((value, index) => (
              <div
                key={value.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:border-accent/30 hover:shadow-elevated animate-fade-in md:rounded-xl"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 transition-colors duration-300 group-hover:bg-accent/20 md:h-12 md:w-12 md:rounded-xl">
                  <value.icon className="h-7 w-7 text-accent md:h-6 md:w-6" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground md:text-lg md:mb-2">
                  {value.title}
                </h3>
                <p className="text-base text-muted-foreground leading-relaxed md:text-sm">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-y border-border bg-muted/30 py-10 px-4 md:px-6">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-2xl border border-accent/30 bg-accent/5 p-6 animate-fade-in md:rounded-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-accent/10 md:h-10 md:w-10">
                <Shield className="h-6 w-6 text-accent md:h-5 md:w-5" />
              </div>
              <div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground md:text-lg md:mb-2">
                  Important Notice
                </h3>
                <div className="space-y-3 text-base text-muted-foreground leading-relaxed md:space-y-2 md:text-sm">
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
      <section className="bg-primary py-12 px-4 md:py-16 md:px-6">
        <div className="container text-center">
          <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-2xl md:mb-3">
            Ready to Find Treatment?
          </h2>
          <p className="mb-8 text-lg text-primary-foreground/80 md:text-base md:mb-6">
            Search our directory or speak with a specialist today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-3">
            <Link to="/rehab-centers" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                Find Treatment Centers
                <ArrowRight className="h-5 w-5 md:h-4 md:w-4" />
              </Button>
            </Link>
            <Link to="/request-help?source=about_cta" className="w-full sm:w-auto">
              <Button variant="hero-light" size="lg" className="w-full h-14 gap-2 text-base font-semibold sm:w-auto sm:h-auto">
                <Heart className="h-5 w-5 md:h-4 md:w-4" />
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