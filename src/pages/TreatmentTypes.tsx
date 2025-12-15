import { Link } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import {
  Pill,
  Brain,
  Activity,
  Home,
  Stethoscope,
  Sparkles,
  ArrowRight,
  Phone,
  CheckCircle,
  Shield,
  Clock,
  Heart,
} from "lucide-react";

const treatmentTypes = [
  {
    icon: Pill,
    title: "Drug Addiction Treatment",
    description: "Comprehensive programs for substance abuse including opioids, stimulants, benzodiazepines, and other controlled substances.",
    features: ["Medical detoxification", "Individual therapy", "Group counseling", "Relapse prevention"],
    link: "/rehab-centers?type=drug",
  },
  {
    icon: Activity,
    title: "Alcohol Rehabilitation",
    description: "Specialized programs for alcohol dependence with medically supervised detox and evidence-based therapies.",
    features: ["Safe detox protocols", "12-step programs", "Cognitive behavioral therapy", "Family therapy"],
    link: "/rehab-centers?type=alcohol",
  },
  {
    icon: Brain,
    title: "Dual Diagnosis Treatment",
    description: "Integrated treatment addressing both addiction and co-occurring mental health conditions like depression, anxiety, and PTSD.",
    features: ["Psychiatric evaluation", "Medication management", "Trauma-informed care", "Holistic therapies"],
    link: "/rehab-centers?type=dual-diagnosis",
  },
  {
    icon: Home,
    title: "Residential Inpatient",
    description: "24/7 structured care in a supportive residential environment for intensive, focused recovery.",
    features: ["Round-the-clock supervision", "Structured daily schedule", "Therapeutic community", "Life skills training"],
    link: "/rehab-centers?type=inpatient",
  },
  {
    icon: Stethoscope,
    title: "Outpatient Programs",
    description: "Flexible treatment options allowing you to maintain work, school, and family commitments while receiving care.",
    features: ["Intensive outpatient (IOP)", "Partial hospitalization (PHP)", "Evening programs", "Telehealth options"],
    link: "/rehab-centers?type=outpatient",
  },
  {
    icon: Sparkles,
    title: "Holistic & Alternative",
    description: "Complementary approaches that address mind, body, and spirit for whole-person healing.",
    features: ["Yoga & meditation", "Art & music therapy", "Equine therapy", "Nutritional counseling"],
    link: "/rehab-centers?type=holistic",
  },
];

const TreatmentTypes = () => {
  return (
    <Layout>
      <SEO
        title="Types of Addiction Treatment Programs"
        description="Explore different addiction treatment options including drug rehab, alcohol treatment, dual diagnosis, residential, outpatient, and holistic therapy programs."
        canonical="/treatment-types"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
        ]}
      />
      {/* Hero - Navy background */}
      <section className="bg-primary py-12 md:py-16">
        <div className="container text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
            <Stethoscope className="h-4 w-4 text-accent" />
            <span className="text-sm font-medium text-primary-foreground">Treatment Programs</span>
          </div>
          <h1 className="mb-3 font-display text-2xl font-bold text-primary-foreground md:text-3xl lg:text-4xl">
            Treatment Types
          </h1>
          <p className="text-base text-primary-foreground/80 max-w-2xl mx-auto">
            Explore different treatment approaches to find the program that best fits your unique needs and recovery goals.
          </p>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Evidence-Based</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="h-4 w-4 text-accent" />
              <span>Personalized Care</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className="h-4 w-4 text-accent" />
              <span>Compassionate Support</span>
            </div>
          </div>
        </div>
      </section>

      {/* Treatment Types Grid */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {treatmentTypes.map((type, index) => (
              <div
                key={type.title}
                className="group rounded-2xl border border-border bg-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated hover:-translate-y-1 hover:border-accent/30 animate-fade-in"
                style={{ animationDelay: `${index * 75}ms` }}
              >
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 transition-colors group-hover:bg-accent/20">
                  <type.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
                  {type.title}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  {type.description}
                </p>
                <ul className="mb-5 space-y-2">
                  {type.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm text-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link to={type.link}>
                  <Button variant="outline" className="w-full gap-2 group-hover:border-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                    Find Programs
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
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
              Not Sure Which Treatment Is Right?
            </h2>
            <p className="mb-6 text-muted-foreground max-w-xl mx-auto">
              Our specialists can help you understand your options and find the best program for your situation.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/request-help?source=treatment_cta">
                <Button size="lg" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Request Help
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button variant="outline" size="lg" className="gap-2">
                  Browse All Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default TreatmentTypes;
