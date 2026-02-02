import { Globe } from "lucide-react";

const countries = [
  { name: "United Kingdom", flag: "🇬🇧", region: "Europe" },
  { name: "Canada", flag: "🇨🇦", region: "North America" },
  { name: "Australia", flag: "🇦🇺", region: "Oceania" },
  { name: "Germany", flag: "🇩🇪", region: "Europe" },
  { name: "United Arab Emirates", flag: "🇦🇪", region: "Middle East" },
  { name: "Saudi Arabia", flag: "🇸🇦", region: "Middle East" },
  { name: "France", flag: "🇫🇷", region: "Europe" },
  { name: "Netherlands", flag: "🇳🇱", region: "Europe" },
  { name: "Switzerland", flag: "🇨🇭", region: "Europe" },
  { name: "Ireland", flag: "🇮🇪", region: "Europe" },
  { name: "Singapore", flag: "🇸🇬", region: "Asia" },
  { name: "Hong Kong", flag: "🇭🇰", region: "Asia" },
  { name: "Japan", flag: "🇯🇵", region: "Asia" },
  { name: "South Korea", flag: "🇰🇷", region: "Asia" },
  { name: "Mexico", flag: "🇲🇽", region: "Latin America" },
  { name: "Brazil", flag: "🇧🇷", region: "Latin America" },
];

export const CountriesServed = () => {
  return (
    <section className="py-16 md:py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 text-primary mb-4">
            <Globe className="h-6 w-6" />
            <span className="text-sm font-semibold uppercase tracking-wide">Global Reach</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Serving Clients Worldwide
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            We've helped thousands of international clients access world-class addiction treatment 
            in the United States. Our team understands the unique needs of patients traveling from abroad.
          </p>
        </div>

        {/* Countries Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4 md:gap-6">
          {countries.map((country) => (
            <div 
              key={country.name}
              className="flex flex-col items-center p-4 bg-background rounded-xl shadow-sm hover:shadow-md transition-shadow"
            >
              <span className="text-4xl mb-2">{country.flag}</span>
              <span className="text-sm text-center text-muted-foreground font-medium">
                {country.name}
              </span>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          <div className="text-center p-6 bg-background rounded-xl shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">50+</div>
            <div className="text-sm text-muted-foreground">Countries Served</div>
          </div>
          <div className="text-center p-6 bg-background rounded-xl shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">2,500+</div>
            <div className="text-sm text-muted-foreground">International Placements</div>
          </div>
          <div className="text-center p-6 bg-background rounded-xl shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">24hr</div>
            <div className="text-sm text-muted-foreground">Response Time</div>
          </div>
          <div className="text-center p-6 bg-background rounded-xl shadow-sm">
            <div className="text-3xl md:text-4xl font-bold text-primary mb-2">98%</div>
            <div className="text-sm text-muted-foreground">Placement Success</div>
          </div>
        </div>

        {/* Trust Statement */}
        <p className="text-center text-muted-foreground mt-10 max-w-3xl mx-auto">
          Whether you're seeking treatment from Europe, the Middle East, Asia, or elsewhere, 
          our dedicated placement specialists ensure a seamless experience from initial inquiry 
          to admission at a top-tier US treatment facility.
        </p>
      </div>
    </section>
  );
};
