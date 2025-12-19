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
  Crown,
  Thermometer,
  Users,
  Calendar,
  HelpCircle,
} from "lucide-react";

const treatmentTypes = [
  {
    icon: Thermometer,
    title: "Medical Detox",
    description: "Safe, medically supervised withdrawal with 24/7 monitoring and medication support.",
    features: ["24/7 medical supervision", "Medication management", "Safe withdrawal", "Transition to treatment"],
    link: "/treatment-types/medical-detox",
    duration: "5-14 days",
    color: "bg-red-500/10 text-red-600",
  },
  {
    icon: Pill,
    title: "Drug Addiction Treatment",
    description: "Comprehensive programs for opioids, stimulants, benzodiazepines, and other substances.",
    features: ["Medical detoxification", "Individual therapy", "Group counseling", "Relapse prevention"],
    link: "/treatment-types/drug-addiction",
    duration: "30-90 days",
    color: "bg-blue-500/10 text-blue-600",
  },
  {
    icon: Activity,
    title: "Alcohol Rehabilitation",
    description: "Specialized programs for alcohol dependence with evidence-based therapies.",
    features: ["Safe detox protocols", "12-step programs", "CBT therapy", "Family therapy"],
    link: "/treatment-types/alcohol-rehabilitation",
    duration: "30-90 days",
    color: "bg-amber-500/10 text-amber-600",
  },
  {
    icon: Brain,
    title: "Dual Diagnosis",
    description: "Integrated treatment for addiction and co-occurring mental health conditions.",
    features: ["Psychiatric evaluation", "Medication management", "Trauma-informed care", "Holistic therapies"],
    link: "/treatment-types/dual-diagnosis",
    duration: "60-90+ days",
    color: "bg-purple-500/10 text-purple-600",
  },
  {
    icon: Home,
    title: "Residential Inpatient",
    description: "24/7 structured care in a supportive residential environment.",
    features: ["Round-the-clock care", "Structured schedule", "Therapeutic community", "Life skills"],
    link: "/treatment-types/residential-inpatient",
    duration: "30-90 days",
    color: "bg-green-500/10 text-green-600",
  },
  {
    icon: Calendar,
    title: "Outpatient Programs",
    description: "Flexible treatment while maintaining work, school, and family commitments.",
    features: ["IOP & PHP options", "Evening programs", "Telehealth available", "Step-down care"],
    link: "/treatment-types/outpatient-programs",
    duration: "8-16 weeks",
    color: "bg-teal-500/10 text-teal-600",
  },
  {
    icon: Sparkles,
    title: "Holistic Therapy",
    description: "Complementary approaches addressing mind, body, and spirit.",
    features: ["Yoga & meditation", "Art & music therapy", "Equine therapy", "Nutrition counseling"],
    link: "/treatment-types/holistic-therapy",
    duration: "Ongoing",
    color: "bg-emerald-500/10 text-emerald-600",
  },
  {
    icon: Crown,
    title: "Luxury Rehab",
    description: "Premium treatment in resort-like settings with executive services.",
    features: ["Private rooms", "Gourmet cuisine", "Spa & fitness", "Executive programs"],
    link: "/treatment-types/luxury-rehab",
    duration: "30-90 days",
    color: "bg-yellow-500/10 text-yellow-600",
  },
];

const comparisonData = [
  { level: "Medical Detox", intensity: "Highest", setting: "Hospital/Clinic", duration: "5-14 days", best: "Severe withdrawal risk" },
  { level: "Residential", intensity: "High", setting: "24/7 Facility", duration: "30-90 days", best: "Intensive support needed" },
  { level: "PHP", intensity: "High", setting: "Day program", duration: "2-4 weeks", best: "Step-down from inpatient" },
  { level: "IOP", intensity: "Moderate", setting: "Part-time", duration: "8-12 weeks", best: "Work/family balance" },
  { level: "Outpatient", intensity: "Low", setting: "Weekly visits", duration: "Ongoing", best: "Maintenance/aftercare" },
];

const TreatmentTypes = () => {
  return (
    <Layout>
      <SEO
        title="Types of Addiction Treatment Programs | Find the Right Level of Care"
        description="Compare addiction treatment options: medical detox, residential inpatient, outpatient IOP/PHP, dual diagnosis, holistic therapy, and luxury rehab programs."
        canonical="/treatment-types"
        breadcrumbs={[
          { name: "Home", url: "/" },
          { name: "Treatment Types", url: "/treatment-types" },
        ]}
      />

      {/* Hero */}
      <section className="bg-primary py-14 md:py-20">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5">
              <Stethoscope className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Treatment Programs</span>
            </div>
            <h1 className="mb-4 font-display text-3xl font-bold text-primary-foreground md:text-4xl lg:text-5xl">
              Find the Right Treatment
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-2xl mx-auto leading-relaxed">
              From medical detox to outpatient support, explore different levels of care to find what works best for your recovery journey.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link to="/request-help?source=treatment_hero">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get Help Choosing
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
                  Browse Centers
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Bar */}
      <section className="border-b border-border bg-card py-4">
        <div className="container">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm md:gap-10">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Shield className="h-4 w-4 text-accent" />
              <span>Evidence-Based Programs</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-accent" />
              <span>Personalized Care Plans</span>
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
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Treatment Options
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Click any treatment type to learn more about what's involved and find programs
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {treatmentTypes.map((type, index) => (
              <Link
                key={type.title}
                to={type.link}
                className="group rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-accent/40 animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${type.color} transition-transform group-hover:scale-110`}>
                    <type.icon className="h-6 w-6" />
                  </div>
                  <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    {type.duration}
                  </span>
                </div>
                <h3 className="mb-2 font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                  {type.title}
                </h3>
                <p className="mb-4 text-sm text-muted-foreground leading-relaxed">
                  {type.description}
                </p>
                <ul className="space-y-1.5">
                  {type.features.slice(0, 3).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-xs text-foreground/80">
                      <CheckCircle className="h-3.5 w-3.5 text-accent shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-border">
                  <span className="inline-flex items-center gap-1.5 text-sm font-medium text-primary group-hover:gap-2.5 transition-all">
                    Learn More
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-16 md:py-20 bg-secondary/30">
        <div className="container">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Compare Levels of Care
            </h2>
            <p className="mt-2 text-muted-foreground max-w-2xl mx-auto">
              Understanding the continuum of care helps you find the right intensity for your needs
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] bg-card rounded-xl border border-border overflow-hidden">
              <thead>
                <tr className="bg-primary text-primary-foreground">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Level of Care</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Intensity</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Setting</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Duration</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Best For</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {comparisonData.map((row, index) => (
                  <tr key={row.level} className="hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">{row.level}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        row.intensity === "Highest" ? "bg-red-100 text-red-700" :
                        row.intensity === "High" ? "bg-orange-100 text-orange-700" :
                        row.intensity === "Moderate" ? "bg-yellow-100 text-yellow-700" :
                        "bg-green-100 text-green-700"
                      }`}>
                        {row.intensity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.setting}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.duration}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{row.best}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* How to Choose Section */}
      <section className="py-16 md:py-20">
        <div className="container">
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                <HelpCircle className="h-4 w-4" />
                Guidance
              </div>
              <h2 className="text-2xl font-bold text-foreground md:text-3xl">
                How to Choose the Right Treatment
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-3">Consider These Factors:</h3>
                <ul className="space-y-3">
                  {[
                    "Severity of addiction and withdrawal risk",
                    "Co-occurring mental health conditions",
                    "Previous treatment history",
                    "Support system at home",
                    "Work and family obligations",
                    "Insurance coverage and budget",
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border bg-card p-6">
                <h3 className="font-semibold text-foreground mb-3">Typical Treatment Path:</h3>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "Assessment", desc: "Professional evaluation of needs" },
                    { step: "2", label: "Detox (if needed)", desc: "Medical stabilization" },
                    { step: "3", label: "Primary Treatment", desc: "Residential or intensive outpatient" },
                    { step: "4", label: "Step-Down Care", desc: "IOP or standard outpatient" },
                    { step: "5", label: "Aftercare", desc: "Ongoing support and maintenance" },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                        {item.step}
                      </span>
                      <div>
                        <span className="font-medium text-foreground text-sm">{item.label}</span>
                        <p className="text-xs text-muted-foreground">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 md:py-20 bg-primary">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="mb-4 font-display text-2xl font-bold text-primary-foreground md:text-3xl">
              Not Sure Where to Start?
            </h2>
            <p className="mb-8 text-primary-foreground/80 max-w-xl mx-auto">
              Our specialists can help you understand your options and find the best program for your situation. Free, confidential support available 24/7.
            </p>
            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/request-help?source=treatment_cta">
                <Button size="lg" variant="secondary" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Get Help Now
                </Button>
              </Link>
              <Link to="/rehab-centers">
                <Button size="lg" variant="outline" className="gap-2 border-white/30 text-white hover:bg-white/10">
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