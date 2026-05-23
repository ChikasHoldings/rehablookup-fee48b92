import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
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

  // All 50 states sorted by facility count descending. Falls back to a
  // curated 13-state "high-quality imagery" list before the snapshot
  // resolves so first paint isn't a wall of remote-Unsplash thumbnails.
  const allStates = useMemo(() => {
    const withCounts = US_STATES.map((name) => ({
      name,
      count: countForState(name),
    }));
    const ranked = [...withCounts].sort((a, b) => b.count - a.count);
    const allZero = ranked.every((s) => s.count === 0);
    if (allZero) {
      return FALLBACK_TOP.map((name) => ({ name, count: 0 }));
    }
    return ranked;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countByState]);

  // ── Horizontal scroll plumbing ────────────────────────────────────
  // Refs to the scroll container so the prev/next arrow buttons can
  // call .scrollBy({ left, behavior: "smooth" }). State tracks whether
  // we're at either edge so the arrows can grey out when there's
  // nothing left to scroll toward.
  const scrollRef = useRef<HTMLUListElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        // 4-pixel slack on both edges absorbs sub-pixel scroll positions
        // after a snap-stop so the arrows don't flicker on/off.
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      });
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    // Re-check edges on resize — clientWidth changes when the viewport
    // resizes past a Tailwind breakpoint and changes the card width.
    const ro = new ResizeObserver(onScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", onScroll);
      ro.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [allStates.length]);

  const scrollBy = (direction: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    // Scroll by ~one card width × 2 — gives a noticeable jump without
    // overshooting past the next snap-stop on smaller cards.
    const step = Math.max(el.clientWidth * 0.6, 240);
    el.scrollBy({ left: direction === "next" ? step : -step, behavior: "smooth" });
  };

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
              Browse verified addiction treatment centers in all 50 states.
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

        {/* Card row — horizontal snap-scroll. Same per-card design as
            before (aspect-[4/5], gradient overlay, glassy chip, drop-
            shadow title); only the container layout changed from a
            5-col grid to a snap-x flex row. Fixed card width per
            breakpoint so cards stay legible while letting the user
            scroll through all 50 states without bloating vertical
            space. */}
        <div className="relative">
          {/* Edge arrows — desktop only. Mobile relies on the native
              swipe gesture + the gradient fade at each edge. */}
          <button
            type="button"
            onClick={() => scrollBy("prev")}
            disabled={!canScrollLeft}
            aria-label="Scroll states left"
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B365D] shadow-lg ring-1 ring-black/5 transition-opacity hover:bg-white/95 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy("next")}
            disabled={!canScrollRight}
            aria-label="Scroll states right"
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-10 h-10 w-10 items-center justify-center rounded-full bg-white text-[#1B365D] shadow-lg ring-1 ring-black/5 transition-opacity hover:bg-white/95 disabled:pointer-events-none disabled:opacity-0"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Edge fades — visual cue that there's more to scroll. The
              left fade only appears once the user has scrolled away
              from start; the right fade hides at the end. Both stay
              behind the cards (pointer-events-none) so they don't
              steal taps. */}
          <div
            className={`pointer-events-none absolute left-0 top-0 z-[5] h-full w-12 bg-gradient-to-r from-[#1B365D] to-transparent transition-opacity duration-300 ${
              canScrollLeft ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          />
          <div
            className={`pointer-events-none absolute right-0 top-0 z-[5] h-full w-12 bg-gradient-to-l from-[#1B365D] to-transparent transition-opacity duration-300 ${
              canScrollRight ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden
          />

          <ul
            ref={scrollRef}
            className="flex gap-3 sm:gap-4 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-2 -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 px-3 sm:px-4 md:px-6 lg:px-8"
            style={{ scrollbarWidth: "none" }}
            aria-label="States with treatment centers — swipe to navigate"
          >
            {allStates.map((s, idx) => {
              const img = getImageForState(s.name);
              const ariaLabel = s.count > 0
                ? `View ${s.count.toLocaleString()} rehab centers in ${s.name}`
                : `View rehab centers in ${s.name}`;
              return (
                <li
                  key={s.name}
                  className="snap-start shrink-0 w-[160px] sm:w-[180px] md:w-[200px] lg:w-[220px]"
                >
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

                    {/* Dark gradient anchoring the type at the bottom.
                        Sits ABOVE the image so it always provides
                        legibility for the title — and remains visible
                        as the gradient-only fallback if onError hid
                        the img. */}
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

          {/* Mobile-only swipe hint. Hidden once the user has scrolled
              past the first card — they understood. */}
          <p
            className={`md:hidden mt-3 text-center text-xs text-white/60 transition-opacity duration-300 ${
              canScrollLeft ? "opacity-0" : "opacity-100"
            }`}
          >
            Swipe to see all {allStates.length} states →
          </p>
        </div>
      </div>
    </section>
  );
}
