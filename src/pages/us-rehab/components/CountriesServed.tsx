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
    <section className="bg-muted/20 py-16 md:py-20">
      <div className="container mx-auto px-4">
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2 text-primary">
            <Globe2 className="h-5 w-5" />
            <span className="text-sm font-semibold uppercase tracking-wide">International research</span>
          </div>
          <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Researching US treatment from abroad?</h2>
          <p className="mx-auto max-w-2xl text-base leading-relaxed text-muted-foreground">
            RehabLookup can help people outside the United States research US treatment facilities and identify programs that may accept international admissions. Availability, travel support, pricing, and admission requirements must be confirmed directly with each facility.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {countries.map((country) => {
            const inner = (
              <div className="flex h-full flex-col items-center gap-2 rounded-xl border border-border/50 bg-background p-4 transition-colors hover:border-primary/20">
                <span className="text-4xl" aria-hidden>{country.flag}</span>
                <span className="text-center text-xs font-medium leading-tight text-muted-foreground">{country.name}</span>
              </div>
            );

            if (country.slug) {
              return <Link key={country.name} to={`/us-rehab/${country.slug}`}>{inner}</Link>;
            }
            return <div key={country.name}>{inner}</div>;
          })}
        </div>

        <div className="mx-auto mt-10 max-w-3xl rounded-xl border bg-background p-5 text-sm leading-6 text-muted-foreground">
          RehabLookup does not arrange travel, visas, admissions, or treatment placement. Contact facilities directly to confirm international admission policies and consult the appropriate government or legal resource for immigration requirements.
        </div>
      </div>
    </section>
  );
};
