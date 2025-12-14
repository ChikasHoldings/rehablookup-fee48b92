import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
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
      {/* Hero */}
      <section className="gradient-hero py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="mb-6 font-display text-4xl font-bold text-primary-foreground md:text-5xl">
              About RehabLookup
            </h1>
            <p className="text-lg text-primary-foreground/85 md:text-xl">
              We're on a mission to connect families with trusted addiction treatment 
              centers through transparency, compassion, and verified information.
            </p>
          </div>
        </div>
      </section>

      {/* What We Are */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
                <Eye className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Who We Are</span>
              </div>
              <h2 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">
                A Directory You Can Trust
              </h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="text-lg">
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
                  We provide objective information to help you make informed decisions.
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 p-8">
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <Heart className="mb-4 h-20 w-20 text-primary" />
                  <p className="font-display text-2xl font-semibold text-foreground">
                    Helping families find hope
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Mission */}
      <section className="bg-secondary/50 py-20 md:py-28">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Mission</span>
            </div>
            <h2 className="mb-6 font-display text-3xl font-bold text-foreground md:text-4xl">
              Making Treatment Accessible
            </h2>
            <p className="text-lg text-muted-foreground">
              We believe that everyone deserves access to quality addiction treatment information. 
              Our mission is to eliminate confusion, reduce barriers, and provide families with 
              the resources they need to find the right care—without pressure, hidden fees, or 
              misleading information.
            </p>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 md:py-28">
        <div className="container">
          <div className="mb-12 text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2">
              <Lightbulb className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-primary">Our Values</span>
            </div>
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
              What Guides Us
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              These core principles shape everything we do at RehabLookup.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {values.map((value) => (
              <div
                key={value.title}
                className="rounded-xl bg-card p-8 shadow-card transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <value.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="mb-2 font-display text-xl font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Important Notice */}
      <section className="border-y border-border bg-secondary/30 py-12">
        <div className="container">
          <div className="mx-auto max-w-3xl rounded-xl border border-warning/30 bg-warning/5 p-6 md:p-8">
            <h3 className="mb-4 font-display text-xl font-semibold text-foreground">
              Important Notice
            </h3>
            <div className="space-y-3 text-muted-foreground">
              <p>
                RehabLookup is a directory and referral service. We are <strong className="text-foreground">not</strong> a 
                treatment provider, medical facility, or substitute for professional medical advice.
              </p>
              <p>
                The information on this website is for informational purposes only. Always consult 
                with qualified healthcare professionals regarding treatment decisions.
              </p>
              <p>
                If you or someone you know is experiencing a medical emergency, please call 911 immediately.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="mb-4 font-display text-3xl font-bold text-foreground md:text-4xl">
            Ready to Find Treatment?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Search our directory or speak with a specialist today.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link to="/rehab-centers">
              <Button variant="success" size="lg" className="gap-2">
                Find Treatment Centers
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
      </section>
    </Layout>
  );
};

export default About;
