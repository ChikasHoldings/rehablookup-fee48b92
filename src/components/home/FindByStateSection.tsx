import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { US_STATES } from "@/lib/facilityConstants";
import { useStaticFacilities } from "@/hooks/useStaticFacilities";
import { stateCapitalImages } from "@/data/locationImages";

// State-themed imagery — local webp from the blog folder where we
// have curated photography, Unsplash CDN URLs from the canonical
// `stateCapitalImages` map for everything else. Local first because
// it's hashed + edge-cached by Vercel; remote is acceptable for the
// long tail since cards are `loading="lazy"` and only the first 5-6
// load on first paint.
import arizonaImg from "@/assets/blog/arizona-rehab-guide.webp";
import californiaImg from "@/assets/blog/california-rehab-resources-guide.webp";
import coloradoImg from "@/assets/blog/colorado-rehab-guide.webp";
import floridaImg from "@/assets/blog/florida-rehab-resources-guide.webp";
import georgiaImg from "@/assets/blog/georgia-rehab-resources-guide.webp";
import illinoisImg from "@/assets/blog/illinois-rehab-resources-guide.webp";
import michiganImg from "@/assets/blog/michigan-rehab-resources-guide.webp";
import newYorkImg from "@/assets/blog/new-york-state-rehab-resources-guide.webp";
import northCarolinaImg from "@/assets/blog/north-carolina-rehab-resources-guide.webp";
import ohioImg from "@/assets/blog/ohio-rehab-resources-guide.webp";
import pennsylvaniaImg from "@/assets/blog/pennsylvania-rehab-resources-guide.webp";
import texasImg from "@/assets/blog/texas-rehab-resources-guide.webp";
import washingtonImg from "@/assets/blog/seattle-rehab-guide.webp";

/** Local-bundled state image overrides. Keyed by the slug form of the
 *  state name (matches stateCapitalImages slugs + stateSlug() output). */
const LOCAL_STATE_IMAGES: Record<string, string> = {
  "arizona": arizonaImg,
  "california": californiaImg,
  "colorado": coloradoImg,
  "florida": floridaImg,
  "georgia": georgiaImg,
  "illinois": illinoisImg,
  "michigan": michiganImg,
  "new-york": newYorkImg,
  "north-carolina": northCarolinaImg,
  "ohio": ohioImg,
  "pennsylvania": pennsylvaniaImg,
  "texas": texasImg,
  "washington": washingtonImg,
};

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

/** Resolve an image URL for a state. Local-first, falls back to the
 *  canonical Unsplash URL, and final-fallback to undefined (caller
 *  renders a gradient if everything fails). */
function getImageForState(name: string): string | undefined {
  const slug = stateSlug(name);
  return LOCAL_STATE_IMAGES[slug] || stateCapitalImages[slug];
}

/** Fallback ordering when the facilities snapshot hasn't loaded yet —
 *  the 12 states with bundled local imagery so first paint is always
 *  on-brand even if useStaticFacilities is still streaming. */
const FALLBACK_TOP = [
  "California", "Florida", "Texas", "New York", "Pennsylvania",
  "Illinois", "Ohio", "Georgia", "North Carolina", "Michigan",
  "Arizona", "Colorado", "Washington",
] as const;

export function FindByStateSection() {
  const { data: facilities = [] } = useStaticFacilities();

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

  // Top 5 states by facility count, descending. The card row remains
  // horizontally scrollable for narrow viewports but caps at 5 so the
  // homepage strip stays curated and lean — 5 hero states is the
  // canonical "top states" surface seekers expect on a directory
  // homepage. Full 50-state browse remains one click away via the
  // "Browse all 50 states" CTA in the section header.
  //
  // Falls back to a curated 5-state "high-quality imagery" list
  // before the snapshot resolves so first paint isn't a wall of
  // remote Unsplash thumbnails on cold load.
  const allStates = useMemo(() => {
    const withCounts = US_STATES.map((name) => ({
      name,
      count: countForState(name),
    }));
    const ranked = [...withCounts].sort((a, b) => b.count - a.count);
    const allZero = ranked.every((s) => s.count === 0);
    if (allZero) {
      return FALLBACK_TOP.slice(0, 5).map((name) => ({ name, count: 0 }));
    }
    return ranked.slice(0, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countByState]);

  return (
    <section
      aria-labelledby="find-by-state-heading"
      className="relative overflow-hidden py-8 md:py-10 lg:py-12 text-white"
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
        {/* Header — left-aligned, with the "Browse all 50 states" CTA
            pinned to the right on the same horizontal line. Stacks
            vertically on mobile so the CTA stays tappable. */}
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6 md:mb-8">
          <div className="min-w-0">
            <h2
              id="find-by-state-heading"
              className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight"
            >
              Find Treatment Center by State
            </h2>
            <p className="mt-1.5 text-sm md:text-base text-white/75">
              Browse listed addiction treatment centers in all 50 states and Washington, D.C.
            </p>
          </div>
          <Link
            to="/locations"
            className="self-start sm:self-auto shrink-0 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 md:px-5 md:py-2.5 text-sm md:text-base font-semibold text-[#1B365D] shadow-sm hover:bg-white/95 hover:shadow-md transition-all"
          >
            Browse all 50 states
            <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        {/* Card row — single horizontal row of 5 curated cards.
            ──────────────────────────────────────────────────────────
            Previously this section showed all 50 states and shipped a
            scroll-chrome overlay (prev/next arrows, edge-fade
            gradients, mobile swipe hint) on top of the snap-scroll
            container. With the strip capped at the top 5 states the
            chrome was a leftover from the wider design and felt like
            visual noise — there's nothing for the arrows to scroll to
            on desktop, and on mobile the native horizontal-snap
            gesture is universally understood for short card rows.

            Behavior now:
              - Mobile: cards still snap-scroll horizontally
                (overflow-x-auto + snap-mandatory). Native iOS/Android
                swipe handles the affordance.
              - Desktop (lg+): overflow-x-visible + justify-center
                centers the strip in the container.
        */}
        <div className="relative">
          <ul
            className="flex gap-4 sm:gap-5 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 lg:justify-center lg:overflow-x-visible"
            style={{ scrollbarWidth: "none" }}
            aria-label="Top 5 states with treatment centers"
          >
            {allStates.map((s, idx) => {
              const img = getImageForState(s.name);
              const ariaLabel = s.count > 0
                ? `View ${s.count.toLocaleString()} rehab centers in ${s.name}`
                : `View rehab centers in ${s.name}`;
              return (
                <li
                  key={s.name}
                  className="snap-start shrink-0 w-[200px] sm:w-[220px] md:w-[240px] lg:w-[260px]"
                >
                  <Link
                    to={`/rehab-centers/${stateSlug(s.name)}`}
                    aria-label={ariaLabel}
                    className="group block relative aspect-[4/5] overflow-hidden rounded-2xl ring-1 ring-white/15 bg-slate-900 shadow-lg transition-all duration-300 hover:shadow-2xl hover:ring-[#CDA223]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDA223]"
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={`${s.name} landscape`}
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
                        // First 6 cards eager so they paint with the
                        // section (above-the-fold on most viewports);
                        // remainder lazy so the network doesn't burst
                        // on mount when most cards are off-screen.
                        loading={idx < 6 ? "eager" : "lazy"}
                        decoding="async"
                        width={400}
                        height={500}
                        // If the remote Unsplash URL fails (rate-limit,
                        // 404, network), hide the broken image so the
                        // dark gradient below + glassy chip still render
                        // a complete card. Local imports are bundled so
                        // they never fail this branch.
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="absolute inset-0 bg-gradient-to-br from-primary/80 via-primary to-primary/90"
                        aria-hidden
                      />
                    )}

                    {/* Title-anchoring gradient — REWORKED so the image
                        reads through clearly. The previous
                        `from-slate-950/90 via-slate-950/40 to-slate-950/10`
                        washed the entire card with a dark tint; the new
                        gradient is fully transparent at the top, only
                        ramping to dark on the bottom ~45% where the
                        title actually sits. Photography reads cleanly
                        through the top half; the title still gets a
                        legible dark background. */}
                    <div
                      className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-slate-950/85 via-slate-950/55 to-transparent group-hover:from-slate-950/90 transition-colors duration-300"
                      aria-hidden
                    />

                    {/* Glassy facility-count chip, top-right. */}
                    <div className="absolute top-3 right-3">
                      <span className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-md px-2.5 py-1 text-[11px] font-semibold text-white ring-1 ring-white/25 tabular-nums shadow-sm">
                        {s.count > 0 ? `${s.count.toLocaleString()} facilities` : "Browse"}
                      </span>
                    </div>

                    {/* Title block, bottom-left — sits inside the
                        bottom-only gradient so the text is legible
                        without the top half of the image being washed
                        out. drop-shadow on the headline as belt-and-
                        suspenders for the few cards where the photo
                        happens to have a bright element at the title
                        baseline. */}
                    <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                      <h3 className="font-display text-base md:text-lg lg:text-xl font-bold text-white leading-tight tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                        {s.name}
                      </h3>
                      <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] md:text-xs font-medium text-white/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.4)]">
                        View centers
                        <ArrowRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
