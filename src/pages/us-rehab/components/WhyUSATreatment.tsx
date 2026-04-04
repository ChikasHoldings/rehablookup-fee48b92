import { Shield, Star, Clock, Users, Award, Plane } from "lucide-react";

const benefits = [
  {
    icon: Star,
    title: "World-Class Treatment Quality",
    description: "Access innovative therapies, evidence-based protocols, and cutting-edge treatment modalities developed in the United States."
  },
  {
    icon: Shield,
    title: "Complete Confidentiality",
    description: "Strict HIPAA privacy laws protect your identity. Treatment away from home means complete discretion from your community."
  },
  {
    icon: Clock,
    title: "Immediate Admission Available",
    description: "Many facilities can accept international patients within 24-48 hours, with expedited intake processes."
  },
  {
    icon: Users,
    title: "Multilingual Staff",
    description: "Treatment centers with staff fluent in multiple languages ensure clear communication throughout your recovery journey."
  },
  {
    icon: Award,
    title: "Accredited Facilities",
    description: "US treatment centers undergo rigorous accreditation ensuring the highest standards of care and safety."
  },
  {
    icon: Plane,
    title: "Concierge Services",
    description: "Airport pickup, visa support documentation, and full-service coordination for a seamless treatment experience."
  }
];

export const WhyUSATreatment = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold uppercase tracking-wide text-primary mb-2 block">Why the USA</span>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Why International Clients Choose US Treatment
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            The United States offers unparalleled addiction treatment with privacy,
            quality, and comprehensive care that attracts clients from around the world.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group p-6 bg-muted/20 rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <benefit.icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {benefit.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {benefit.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
