import { Link } from "react-router-dom";
import { Crown, Briefcase, Lock, Brain, Sparkles, Shield } from "lucide-react";

const categories = [
  {
    title: "Luxury Rehab",
    slug: "luxury-rehab-america",
    icon: Crown,
    description: "Five-star accommodations, gourmet cuisine, spa amenities, and private rooms in stunning locations.",
    color: "text-amber-500"
  },
  {
    title: "Executive Treatment",
    slug: "executive-rehab",
    icon: Briefcase,
    description: "Business-friendly programs allowing continued work access while receiving world-class treatment.",
    color: "text-blue-500"
  },
  {
    title: "Private & Discrete",
    slug: "private-rehab-america",
    icon: Lock,
    description: "Maximum confidentiality for high-profile clients, public figures, and privacy-focused individuals.",
    color: "text-purple-500"
  },
  {
    title: "Dual Diagnosis",
    slug: "dual-diagnosis-treatment-usa",
    icon: Brain,
    description: "Integrated treatment for co-occurring mental health conditions alongside addiction.",
    color: "text-green-500"
  },
  {
    title: "Holistic Programs",
    slug: "holistic-rehab-america",
    icon: Sparkles,
    description: "Mind-body-spirit approach including yoga, meditation, acupuncture, and alternative therapies.",
    color: "text-pink-500"
  },
  {
    title: "Medical Detox",
    slug: "detox-usa",
    icon: Shield,
    description: "Medically supervised detoxification with 24/7 nursing care and withdrawal management.",
    color: "text-red-500"
  }
];

export const TreatmentCategories = () => {
  return (
    <section className="py-16 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Treatment Options in the United States
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From luxury oceanfront retreats to executive programs, find the perfect 
            treatment environment tailored to your needs and preferences.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.slug}
              to={`/us-rehab/${category.slug}`}
              className="group p-6 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all hover:shadow-md"
            >
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-4 bg-background shadow-sm`}>
                <category.icon className={`h-6 w-6 ${category.color}`} />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">
                {category.title}
              </h3>
              <p className="text-muted-foreground text-sm">
                {category.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
