import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { US_STATES } from "@/lib/facilityConstants";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";

const POPULAR_STATES = ["California", "Florida", "Texas", "New York"] as const;
const POPULAR_SET = new Set<string>(POPULAR_STATES);

function stateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

const HEADLINE_STATS = [
  { value: "15K+", label: "Centers" },
  { value: "50", label: "States" },
  { value: "10K+", label: "Families" },
  { value: "24/7", label: "Support" },
] as const;

// State-name aliases for the facilities snapshot. Some rows store the
// USPS abbreviation, others store the full name — we normalise both
// sides before counting.
const STATE_ABBR: Record<string, string> = {
  Alabama: "AL", Alaska: "AK", Arizona: "AZ", Arkansas: "AR", California: "CA",
  Colorado: "CO", Connecticut: "CT", Delaware: "DE", Florida: "FL", Georgia: "GA",
  Hawaii: "HI", Idaho: "ID", Illinois: "IL", Indiana: "IN", Iowa: "IA",
  Kansas: "KS", Kentucky: "KY", Louisiana: "LA", Maine: "ME", Maryland: "MD",
  Massachusetts: "MA", Michigan: "MI", Minnesota: "MN", Mississippi: "MS", Missouri: "MO",
  Montana: "MT", Nebraska: "NE", Nevada: "NV", "New Hampshire": "NH", "New Jersey": "NJ",
  "New Mexico": "NM", "New York": "NY", "North Carolina": "NC", "North Dakota": "ND", Ohio: "OH",
  Oklahoma: "OK", Oregon: "OR", Pennsylvania: "PA", "Rhode Island": "RI", "South Carolina": "SC",
  "South Dakota": "SD", Tennessee: "TN", Texas: "TX", Utah: "UT", Vermont: "VT",
  Virginia: "VA", Washington: "WA", "West Virginia": "WV", Wisconsin: "WI", Wyoming: "WY",
};

export function FindByStateSection() {
  const { data: facilities = [] } = useStaticFacilities();

  // Live per-state counts derived from the public facilities snapshot.
  // The snapshot is CDN-cached for 10 min, so this is cheap and always
  // reflects the published inventory. Counts ARE NOT hard-coded.
  // TODO: when traffic justifies it, replace with a dedicated edge
  // function (`select state, count(*) from facilities where status='approved' group by state`)
  // so we don't ship the full snapshot just to count rows.
  const countByState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of facilities) {
      const s = (f.state ?? "").trim();
      if (!s) continue;
      counts.set(s.toUpperCase(), (counts.get(s.toUpperCase()) ?? 0) + 1);
    }
    return counts;
  }, [facilities]);

  // Sort: popular first (in canonical order CA, FL, TX, NY), then the
  // remaining 46 states alphabetically — matches the footer's order
  // convention so the homepage and footer reinforce the same mental
  // model.
  const orderedStates = useMemo(() => {
    const rest = US_STATES.filter((s) => !POPULAR_SET.has(s));
    return [...POPULAR_STATES, ...rest];
  }, []);

  function countForState(name: string): number {
    const fullKey = name.toUpperCase();
    const abbrKey = STATE_ABBR[name];
    return (
      (countByState.get(fullKey) ?? 0) +
      (abbrKey ? (countByState.get(abbrKey) ?? 0) : 0)
    );
  }

  return (
    <section
      aria-labelledby="find-by-state-heading"
      className="py-10 md:py-12 lg:py-20 bg-muted/30 border-y border-border/50"
    >
      <div className="container px-4 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto max-w-3xl text-center mb-6 md:mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 mb-2">
            <MapPin className="h-3.5 w-3.5 text-primary" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              By Location
            </span>
          </div>
          <h2
            id="find-by-state-heading"
            className="font-display text-xl md:text-2xl lg:text-3xl font-bold text-foreground tracking-tight"
          >
            Find Treatment Center by State
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Browse verified addiction treatment centers in all 50 states.
          </p>
        </header>

        {/* Preserved stats strip — same 4 tiles, same content, same
            visual rhythm as before, just lifted out of the
            replaced "Why Choose Us" block and placed under the new
            heading. */}
        <div
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 max-w-3xl mx-auto mb-8 md:mb-10"
          aria-label="Directory facts"
        >
          {HEADLINE_STATS.map((stat) => (
            <div
              key={stat.label}
              className="rounded-lg border border-border bg-card px-3 py-3 md:px-4 md:py-4 text-center"
            >
              <div className="font-display text-lg md:text-xl lg:text-2xl font-bold text-primary">
                {stat.value}
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* State grid */}
        <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {orderedStates.map((name) => {
            const count = countForState(name);
            const isPopular = POPULAR_SET.has(name);
            const ariaLabel = count > 0
              ? `View ${count.toLocaleString()} rehab centers in ${name}`
              : `View rehab centers in ${name}`;
            return (
              <li key={name}>
                <Link
                  to={`/rehab-centers/${stateSlug(name)}`}
                  aria-label={ariaLabel}
                  className="group flex items-center justify-between gap-3 rounded-md border border-border bg-card px-4 py-3 transition-all hover:border-primary hover:shadow-sm"
                >
                  <span className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors min-w-0 truncate">
                    {name}
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    {count > 0 ? (
                      <span className="text-xs md:text-sm text-muted-foreground tabular-nums">
                        {count.toLocaleString()} facilities
                      </span>
                    ) : (
                      <span className="text-xs md:text-sm text-muted-foreground inline-flex items-center gap-0.5">
                        View centers
                        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                    {isPopular && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        Popular
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Footer link — points at the canonical /locations index used
            in the global footer's "Find by State" column. */}
        <div className="mt-6 md:mt-8 text-right">
          <Link
            to="/locations"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            View all states
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
