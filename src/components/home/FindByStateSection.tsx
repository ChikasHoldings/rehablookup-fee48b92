import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { US_STATES } from "@/lib/facilityConstants";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";

/**
 * Find Treatment Center by State — homepage section that mirrors the
 * HomepageFeaturedSection visual shell (rounded card container, header
 * bar, single-row track) but renders state tiles instead of facility
 * cards. Shows the top 5 states by live facility count.
 */

const HEADLINE_STATS = [
  { value: "15K+", label: "Centers" },
  { value: "50", label: "States" },
  { value: "10K+", label: "Families" },
  { value: "24/7", label: "Support" },
] as const;

const TOP_N = 5;
const FALLBACK_TOP = ["California", "Florida", "Texas", "New York", "Pennsylvania"] as const;

// State-name aliases for the facilities snapshot. The snapshot stores
// either the full name or the USPS abbreviation — normalise both
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

function stateSlug(name: string) {
  return name.toLowerCase().replace(/\s+/g, "-");
}

export function FindByStateSection() {
  const { data: facilities = [] } = useStaticFacilities();

  // Live per-state counts derived from the CDN-cached public facilities
  // snapshot. Counts are never hard-coded.
  // TODO: when traffic justifies it, swap this for a dedicated edge
  // function (`select state, count(*) from facilities where status='approved' group by state`)
  // so we don't ship the full snapshot just to count rows.
  const countByState = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of facilities) {
      const s = (f.state ?? "").trim();
      if (!s) continue;
      const key = s.toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [facilities]);

  function countForState(name: string): number {
    const fullKey = name.toUpperCase();
    const abbrKey = STATE_ABBR[name];
    return (
      (countByState.get(fullKey) ?? 0) +
      (abbrKey ? (countByState.get(abbrKey) ?? 0) : 0)
    );
  }

  // Sort all 50 states by live count desc; take top N. If the snapshot
  // hasn't arrived yet (counts all 0), fall back to a hard-coded list
  // of the 5 highest-population states so the section never reads
  // empty.
  const topStates = useMemo(() => {
    const withCounts = US_STATES.map((name) => ({
      name,
      count: countForState(name),
    }));
    const ranked = [...withCounts].sort((a, b) => b.count - a.count);
    const allZero = ranked.every((s) => s.count === 0);
    if (allZero) {
      return FALLBACK_TOP.map((name) => ({ name, count: 0 }));
    }
    return ranked.slice(0, TOP_N);
    // countByState is the actual dependency; countForState closes over it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countByState]);

  return (
    <section
      aria-labelledby="find-by-state-heading"
      className="py-10 md:py-16"
    >
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header — eyebrow + H2 + subhead, mirrors the page-level
            rhythm of the other directory sections. Stats strip lives
            directly below. */}
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

        {/* Preserved stats strip — same 4 facts, same content as the
            previous "Why Choose Us" overlay. */}
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

        {/* Top-5 state row — mirrors HomepageFeaturedSection's visual
            shell: rounded card container with a bordered header bar and
            an inner track. Single line on desktop (5 columns); falls
            back to a 2-up mobile grid + horizontal scroll on the
            narrowest screens. */}
        <div className="rounded-xl sm:rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 border-b border-border bg-muted/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-lg sm:text-xl md:text-2xl font-bold text-foreground tracking-tight">
                  Top Treatment-Center States
                </h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                  The five states with the most verified facilities on our directory
                </p>
              </div>
              <Link
                to="/locations"
                className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors shrink-0"
              >
                Browse all states
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 md:gap-5 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
            {topStates.map((s) => (
              <li key={s.name}>
                <Link
                  to={`/rehab-centers/${stateSlug(s.name)}`}
                  aria-label={
                    s.count > 0
                      ? `View ${s.count.toLocaleString()} rehab centers in ${s.name}`
                      : `View rehab centers in ${s.name}`
                  }
                  className="group flex flex-col items-center text-center rounded-xl border border-border bg-background hover:border-primary hover:shadow-sm transition-all px-3 py-5 md:px-4 md:py-6 h-full"
                >
                  <span className="flex h-9 w-9 md:h-10 md:w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                    <MapPin className="h-4 w-4 md:h-5 md:w-5" aria-hidden />
                  </span>
                  <span className="font-display text-base md:text-lg font-bold text-foreground group-hover:text-primary transition-colors leading-tight">
                    {s.name}
                  </span>
                  <span className="mt-1 text-xs md:text-sm text-muted-foreground tabular-nums">
                    {s.count > 0
                      ? `${s.count.toLocaleString()} facilities`
                      : "View centers"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Primary CTA — bigger / brand-button-styled link, separate
            from the small header anchor so the "/locations" entry point
            is unmissable. */}
        <div className="mt-6 md:mt-8 text-center">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow transition-all"
          >
            Browse all 50 states
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
