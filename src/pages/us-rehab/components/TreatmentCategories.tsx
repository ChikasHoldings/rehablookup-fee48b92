import { Link } from "react-router-dom";
import { Crown, Briefcase, Lock, Brain, Sparkles, Shield, Wine, Pill, Star } from "lucide-react";

const categories = [
  {
    title: "Luxury Rehab",
    slug: "luxury-rehab-america",
    icon: Crown,
    description: "Five-star accommodations, gourmet cuisine, spa amenities, and private rooms in stunning locations."
  },
  {
    title: "Executive Treatment",
    slug: "executive-rehab",
    icon: Briefcase,
    description: "Business-friendly programs allowing continued work access while receiving world-class treatment."
  },
  {
    title: "Private & Discrete",
    slug: "private-rehab-america",
    icon: Lock,
    description: "Maximum confidentiality for high-profile clients, public figures, and privacy-focused individuals."
  },
  {
    title: "Celebrity Rehab",
    slug: "celebrity-rehab-usa",
    icon: Star,
    description: "Ultra-private treatment for celebrities, athletes, and public figures with maximum security."
  },
  {
    title: "Alcohol Rehab USA",
    slug: "alcohol-rehab-usa",
    icon: Wine,
    description: "Specialized alcohol addiction treatment with medical detox and evidence-based therapies."
  },
  {
    title: "Drug Rehab USA",
    slug: "drug-rehab-usa",
    icon: Pill,
    description: "Comprehensive drug addiction programs for opioids, stimulants, and prescription medications."
  },
  {
    title: "Dual Diagnosis",
    slug: "dual-diagnosis-usa",
    icon: Brain,
    description: "Integrated treatment for co-occurring mental health conditions alongside addiction."
  },
  {
    title: "Holistic Programs",
    slug: "holistic-rehab-america",
    icon: Sparkles,
    description: "Mind-body-spirit approach including yoga, meditation, acupuncture, and alternative therapies."
  },
  {
    title: "Medical Detox",
    slug: "detox-usa",
    icon: Shield,
    description: "Medically supervised detoxification with 24/7 nursing care and withdrawal management."
  }
];

export const TreatmentCategories = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Programs</span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Treatment Options in the United States
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            From luxury oceanfront retreats to executive programs, find the perfect
            treatment environment tailored to your needs and preferences.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/us-rehab/${category.slug}`}
              className="group flex items-start gap-4 p-5 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center bg-primary/10">
                <category.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
                  {category.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {category.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
