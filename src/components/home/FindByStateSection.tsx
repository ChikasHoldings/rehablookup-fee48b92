import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin } from "lucide-react";
import { US_STATES } from "@/lib/facilityConstants";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";

// State-themed imagery — same blog assets we already use on the
// state guide articles.
import californiaImg from "@/assets/blog/california-rehab-resources-guide.webp";
import floridaImg from "@/assets/blog/florida-rehab-resources-guide.webp";
import texasImg from "@/assets/blog/texas-rehab-guide.webp";
import newYorkImg from "@/assets/blog/new-york-city-rehab-guide.webp";
import pennsylvaniaImg from "@/assets/blog/pennsylvania-rehab-guide.webp";

const TOP_N = 5;

const STATE_IMAGES: Record<string, string> = {
  California: californiaImg,
  Florida: floridaImg,
  Texas: texasImg,
  "New York": newYorkImg,
  Pennsylvania: pennsylvaniaImg,
};

/** Fallback when the facilities snapshot hasn't loaded yet — these 5
 *  all have a matching image in STATE_IMAGES so the first paint shows
 *  real photography, not a blank tile. */
const FALLBACK_TOP = ["California", "Florida", "Texas", "New York", "Pennsylvania"] as const;

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

  // Live per-state counts from the CDN-cached snapshot.
  // TODO: replace with a dedicated edge function
  // (`select state, count(*) from facilities where status='approved' group by state`)
  // when traffic justifies it.
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
      className="relative overflow-hidden py-12 md:py-16 lg:py-20 text-white"
      // Same navy → darker-navy gradient strip used by the homepage
      // ProvidersCTA section — keeps brand rhythm consistent across
      // the page's "premium band" surfaces.
      style={{
        background: "linear-gradient(135deg, #1B365D 0%, #0E1F3A 100%)",
      }}
    >
      {/* Decorative gold glow — same accent ProvidersCTA uses, low
          opacity so it reads as texture, not a feature. */}
      <div
        className="pointer-events-none absolute -top-32 -left-32 h-80 w-80 rounded-full bg-[#CDA223]/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-[#CDA223]/[0.06] blur-3xl"
        aria-hidden
      />

      <div className="container relative px-3 sm:px-4 md:px-6 lg:px-8">
        {/* Header */}
        <header className="mx-auto max-w-3xl text-center mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 mb-3 ring-1 ring-white/20 backdrop-blur-sm">
            <MapPin className="h-3.5 w-3.5 text-[#CDA223]" aria-hidden />
            <span className="text-xs font-semibold uppercase tracking-wider text-white/90">
              By Location
            </span>
          </div>
          <h2
            id="find-by-state-heading"
            className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight"
          >
            Find Treatment Center by State
          </h2>
          <p className="mt-2 text-sm md:text-base text-white/75">
            Browse verified addiction treatment centers in all 50 states.
          </p>
        </header>

        {/* Top-5 state image cards. The cards already own their own
            dark gradient + glassy chips so they sit cleanly on the
            navy strip without further adjustment. */}
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
                  className="group block relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-white/15 bg-slate-900 shadow-lg transition-all duration-300 hover:shadow-2xl hover:ring-[#CDA223]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA223]"
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
                    <div
                      className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary to-primary/90"
                      aria-hidden
                    />
                  )}

                  {/* Dark gradient anchoring the type at the bottom. */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-slate-950/10 group-hover:from-slate-950/95 group-hover:via-slate-950/50 transition-colors duration-300"
                    aria-hidden
                  />

                  {/* Glassy facility-count chip, top-right. */}
                  <div className="absolute top-3 right-3">
                    <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25 tabular-nums">
                      {s.count > 0 ? `${s.count.toLocaleString()} facilities` : "Verified"}
                    </span>
                  </div>

                  {/* Title block, bottom-left. */}
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

        {/* Brand CTA — white button on navy strip for max contrast,
            mirrors the ProvidersCTA button treatment. */}
        <div className="mt-8 md:mt-10 text-center">
          <Link
            to="/locations"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 md:px-6 md:py-3 text-sm md:text-base font-semibold text-[#1B365D] shadow-sm hover:bg-white/95 hover:shadow-md transition-all"
          >
            Browse all 50 states
            <ArrowRight className="h-4 w-4 md:h-5 md:w-5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
