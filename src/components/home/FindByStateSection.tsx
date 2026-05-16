import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { US_STATES } from "@/lib/facilityConstants";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";

// State-themed imagery sourced from the existing blog assets — same
// pictures we already use on the state guide articles. Each one is a
// recognisable location signal (skyline / coastline / landmark) so the
// tile reads at a glance.
import californiaImg from "@/assets/blog/california-rehab-resources-guide.webp";
import floridaImg from "@/assets/blog/florida-rehab-resources-guide.webp";
import texasImg from "@/assets/blog/texas-rehab-guide.webp";
import newYorkImg from "@/assets/blog/new-york-city-rehab-guide.webp";
import pennsylvaniaImg from "@/assets/blog/pennsylvania-rehab-guide.webp";

const HEADLINE_STATS = [
  { value: "15K+", label: "Centers" },
  { value: "50", label: "States" },
  { value: "10K+", label: "Families" },
  { value: "24/7", label: "Support" },
] as const;

const TOP_N = 5;

const STATE_IMAGES: Record<string, string> = {
  California: californiaImg,
  Florida: floridaImg,
  Texas: texasImg,
  "New York": newYorkImg,
  Pennsylvania: pennsylvaniaImg,
};

/** The 5 states we hard-fall-back to when the facility snapshot
 *  hasn't loaded yet — these all have an asset in STATE_IMAGES so the
 *  initial paint shows real imagery, not a blank tile. */
const FALLBACK_TOP = ["California", "Florida", "Texas", "New York", "Pennsylvania"] as const;

// State-name aliases for the facilities snapshot (mixes USPS codes and
// full names). Normalise both sides before counting.
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
  // snapshot. Never hard-coded.
  // TODO: replace with a dedicated edge function
  // (`select state, count(*) from facilities where status='approved' group by state`)
  // once the snapshot payload grows past the point where shipping it
  // for a count-only purpose is acceptable.
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

  // Top 5 states by live count. When the snapshot hasn't arrived
  // (every count is 0), fall back to the canonical population-ordered
  // list so the section never reads empty.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countByState]);

  return (
    <section
      aria-labelledby="find-by-state-heading"
      className="py-12 md:py-16 lg:py-20"
    >
      <div className="container px-3 sm:px-4 md:px-6 lg:px-8">
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
            className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground tracking-tight"
          >
            Find Treatment Center by State
          </h2>
          <p className="mt-2 text-sm md:text-base text-muted-foreground">
            Browse verified addiction treatment centers in all 50 states.
          </p>
        </header>

        {/* Preserved stats strip — same 4 facts as the previous
            "Why Choose Us" overlay, now living above the state row. */}
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

        {/* Premium state-image row — 5 image cards, single line on
            desktop. Each card is a self-contained <Link> with a
            recognisable state photograph, a dark gradient over the
            bottom half, and the state name + facility count rendered
            in white on top of the gradient. */}
        <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
          {topStates.map((s) => {
            const img = STATE_IMAGES[s.name];
            const ariaLabel = s.count > 0
              ? `View ${s.count.toLocaleString()} rehab centers in ${s.name}`
              : `View rehab centers in ${s.name}`;
            return (
              <li key={s.name}>
                <Link
                  to={`/rehab-centers/${stateSlug(s.name)}`}
                  aria-label={ariaLabel}
                  className="group block relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-border bg-slate-900 shadow-sm transition-all duration-300 hover:shadow-xl hover:ring-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {img ? (
                    <img
                      src={img}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                      loading="lazy"
                      decoding="async"
                      width={400}
                      height={500}
                    />
                  ) : (
                    /* Fallback: tasteful brand-tinted gradient when we
                        don't have a state photograph on disk. */
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary to-primary/90"
                      aria-hidden
                    />
                  )}

                  {/* Dark gradient that anchors the type at the bottom
                      so it stays readable on any photo. */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/10 group-hover:from-slate-950/95 group-hover:via-slate-950/50 transition-colors duration-300"
                    aria-hidden
                  />

                  {/* Glassy facility-count chip in the top-right corner. */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25 tabular-nums">
                      {s.count > 0 ? `${s.count.toLocaleString()} facilities` : "Verified"}
                    </span>
                  </div>

                  {/* Title block. Pinned to the bottom of the card. */}
                  <div className="absolute inset-x-0 bottom-0 p-4 md:p-5">
                    <h3 className="font-display text-lg md:text-xl lg:text-2xl font-bold text-white leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
                      {s.name}
                    </h3>
                    <p className="mt-1 inline-flex items-center gap-1 text-xs md:text-sm font-medium text-white/85">
                      View centers
                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* CTA — bigger brand-primary button to /locations. */}
        <div className="mt-8 md:mt-10 text-center">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 hover:shadow-md transition-all"
          >
            Browse all 50 states
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
