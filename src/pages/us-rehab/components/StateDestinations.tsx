import { Link } from "react-router-dom";
import { MapPin, ArrowRight } from "lucide-react";

const topStates = [
  {
    name: "California",
    slug: "california",
    description: "Home to Malibu's luxury oceanfront rehabs, LA's celebrity treatment centers, and world-renowned holistic programs.",
    highlights: ["Malibu Beach Rehabs", "Celebrity Treatment", "Holistic Programs"],
    image: "🌴"
  },
  {
    name: "Florida",
    slug: "florida",
    description: "America's recovery capital with the highest concentration of treatment centers, sunny year-round weather, and diverse programs.",
    highlights: ["South Beach Luxury", "Dual Diagnosis", "Sober Living"],
    image: "🌺"
  },
  {
    name: "Arizona",
    slug: "arizona",
    description: "Desert healing environment with luxury resort-style facilities, equine therapy, and spiritual wellness programs.",
    highlights: ["Desert Retreats", "Equine Therapy", "Sedona Wellness"],
    image: "🏜️"
  },
  {
    name: "New York",
    slug: "new-york",
    description: "Executive treatment programs in the Hamptons and Upstate, with access to world-class medical professionals.",
    highlights: ["Executive Programs", "Hamptons Privacy", "Medical Excellence"],
    image: "🗽"
  },
  {
    name: "Texas",
    slug: "texas",
    description: "Large-scale residential facilities, ranch-style treatment, and comprehensive dual diagnosis programs.",
    highlights: ["Ranch-Style Rehabs", "Family Programs", "Affordable Luxury"],
    image: "🤠"
  },
  {
    name: "Colorado",
    slug: "colorado",
    description: "Mountain retreat settings, adventure therapy, and outdoor-focused recovery programs in pristine natural environments.",
    highlights: ["Mountain Retreats", "Adventure Therapy", "Wilderness Programs"],
    image: "⛰️"
  }
];

interface StateDestinationsProps {
  title?: string;
  subtitle?: string;
}

export const StateDestinations = ({
  title = "Top US Treatment Destinations",
  subtitle = "Discover world-class addiction treatment facilities across America's premier recovery destinations."
}: StateDestinationsProps) => {
  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-primary mb-3">
            <MapPin className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Destinations</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            {title}
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {topStates.map((state) => (
            <Link
              key={state.slug}
              to={`/rehab-centers/${state.slug}`}
              className="group block p-6 bg-background rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3 mb-3">
                <span className="text-3xl">{state.image}</span>
                <div>
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {state.name}
                  </h3>
                  <p className="text-xs text-muted-foreground">United States</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                {state.description}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {state.highlights.map((highlight, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-primary/8 text-primary text-xs rounded-full font-medium"
                  >
                    {highlight}
                  </span>
                ))}
              </div>

              <div className="flex items-center text-primary text-sm font-medium">
                <span>Explore {state.name}</span>
                <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
          >
            View All 50 States
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};
