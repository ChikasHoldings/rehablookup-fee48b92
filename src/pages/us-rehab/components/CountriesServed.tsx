import { Link } from "react-router-dom";
import { Globe2 } from "lucide-react";

const countries = [
  { name: "United Kingdom", flag: "🇬🇧", region: "Europe", slug: "uk-patients" },
  { name: "Canada", flag: "🇨🇦", region: "North America", slug: null },
  { name: "Australia", flag: "🇦🇺", region: "Oceania", slug: "australian-patients" },
  { name: "Germany", flag: "🇩🇪", region: "Europe", slug: null },
  { name: "UAE", flag: "🇦🇪", region: "Middle East", slug: "uae-middle-east" },
  { name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East", slug: "uae-middle-east" },
  { name: "France", flag: "🇫🇷", region: "Europe", slug: null },
  { name: "Netherlands", flag: "🇳🇱", region: "Europe", slug: null },
  { name: "Switzerland", flag: "🇨🇭", region: "Europe", slug: null },
  { name: "Ireland", flag: "🇮🇪", region: "Europe", slug: "uk-patients" },
  { name: "Singapore", flag: "🇸🇬", region: "Asia", slug: null },
  { name: "Hong Kong", flag: "🇭🇰", region: "Asia", slug: null },
  { name: "Japan", flag: "🇯🇵", region: "Asia", slug: null },
  { name: "South Korea", flag: "🇰🇷", region: "Asia", slug: null },
  { name: "Mexico", flag: "🇲🇽", region: "Latin America", slug: null },
  { name: "Brazil", flag: "🇧🇷", region: "Latin America", slug: null },
];

export const CountriesServed = () => {
  return (
    <section className="py-16 md:py-20 bg-muted/20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-primary mb-3">
            <Globe2 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">Global Reach</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            Serving Clients Worldwide
          </h2>
          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            We've helped thousands of international clients access world-class addiction treatment
            in the United States.
          </p>
        </div>

        {/* Countries Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {countries.map((country) => {
            const inner = (
              <div className="flex flex-col items-center gap-2 p-4 bg-background rounded-xl border border-border/50 hover:border-primary/20 hover:shadow-sm transition-all h-full">
                <span className="text-3xl">{country.flag}</span>
                <span className="text-xs text-center text-muted-foreground font-medium leading-tight">
                  {country.name}
                </span>
              </div>
            );

            if (country.slug) {
              return (
                <Link key={country.name} to={`/us-rehab/${country.slug}`} className="group">
                  {inner}
                </Link>
              );
            }

            return <div key={country.name}>{inner}</div>;
          })}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { value: "50+", label: "Countries Served" },
            { value: "2,500+", label: "International Placements" },
            { value: "24hr", label: "Response Time" },
            { value: "98%", label: "Placement Success" },
          ].map((stat) => (
            <div key={stat.label} className="text-center p-5 bg-background rounded-xl border border-border/50">
              <div className="text-2xl md:text-3xl font-bold text-primary mb-1">{stat.value}</div>
              <div className="text-xs text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-10 max-w-2xl mx-auto leading-relaxed">
          Whether you're seeking treatment from Europe, the Middle East, Asia, or elsewhere,
          our placement specialists ensure a seamless experience from inquiry to admission.
        </p>
      </div>
    </section>
  );
};
