import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useFeaturedRotation,
  type PlacementType,
} from "@/hooks/useFeaturedRotation";
import { FeaturedStripCard } from "./FeaturedStripCard";

interface FeaturedStripProps {
  placement_type: PlacementType;
  placement_value: string | null | undefined;
  /** Defaults: homepage=10, article=6, everything else=8. */
  visible_slot_count?: number;
  title?: string;
  subtitle?: string;
  className?: string;
}

const DEFAULT_SLOTS_BY_TYPE: Record<PlacementType, number> = {
  homepage: 10,
  state: 8,
  city: 8,
  near_me: 8,
  treatment: 8,
  insurance: 8,
  search: 8,
  international: 10,
  article: 6,
};

const TOOLTIP_COPY =
  "Featured Placements are paid subscriptions. We don't take referral " +
  "fees. Calls go directly to the facility.";

/**
 * Single-row horizontal-scroll Featured surface. Reuses the
 * useFeaturedRotation engine (same seed cookie, same rotation
 * algorithm, same pool query as the legacy <FeaturedRail/>) but with
 * a different visual treatment + client-side viewport-debounced
 * impression logging.
 *
 * Renders NOTHING when the eligible pool is 0 — no placeholder, no
 * "be the first" CTA, no empty state. The surface is fully absent
 * when no Featured subscribers match the bucket.
 *
 * The skeleton-state cards render briefly while the rotation query
 * is in flight; spinner is intentionally not used (jankier than
 * placeholder rectangles for content that may not appear at all).
 */
export function FeaturedStrip({
  placement_type,
  placement_value,
  visible_slot_count,
  title,
  subtitle,
  className,
}: FeaturedStripProps) {
  const slotCount = visible_slot_count ?? DEFAULT_SLOTS_BY_TYPE[placement_type];

  const { data, isLoading } = useFeaturedRotation({
    placement_type,
    placement_value,
    slot_count: slotCount,
    // Strip logs per-card on viewport entry; suppress the server-side
    // bulk-log so impressions only count when a card was actually seen.
    log_impressions: false,
  });

  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, data?.facilities.length]);

  const scrollByPage = useCallback((dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: dir * Math.max(280, el.clientWidth * 0.85),
      behavior: reduce ? "auto" : "smooth",
    });
  }, []);

  if (!placement_value) return null;
  if (isLoading) return <StripSkeleton title={title} subtitle={subtitle} />;

  const facilities = data?.facilities ?? [];
  if (facilities.length === 0) return null;

  const resolvedTitle = title ?? "Featured facilities";

  return (
    <section
      aria-label="Featured facilities, scroll horizontally to see more"
      role="region"
      className={cn(
        "w-full border-y border-slate-200 bg-slate-50",
        className,
      )}
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-5 pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
              {resolvedTitle}
            </h2>
            {subtitle && (
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <TooltipProvider delayDuration={150}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-[#1B365D] flex-shrink-0"
                  aria-label="What are Featured placements?"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                  <span className="hidden sm:inline">What is this?</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">
                {TOOLTIP_COPY}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollByPage(-1)}
            aria-label="Scroll Featured facilities left"
            className="hidden md:flex absolute left-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-slate-700" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollByPage(1)}
            aria-label="Scroll Featured facilities right"
            className="hidden md:flex absolute right-1 top-1/2 -translate-y-1/2 z-10 h-9 w-9 items-center justify-center rounded-full bg-white shadow-md border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-slate-700" />
          </button>
        )}

        <div
          ref={scrollerRef}
          className={cn(
            "flex gap-4 overflow-x-auto px-4 py-4",
            // Hide scrollbar — Tailwind has no out-of-the-box utility
            // so we ship the cross-browser snippet inline. The classes
            // also live in tailwind.config.ts under a custom plugin if
            // we want to reuse them, but inline is easier here.
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "snap-x snap-mandatory scroll-px-4",
          )}
          // prefers-reduced-motion: don't smooth-scroll on arrow clicks
          // (the matchMedia check in scrollByPage handles this; the
          // attribute below keeps native overflow behavior crisp).
          style={{ scrollSnapType: "x mandatory" }}
        >
          {facilities.map((f) => (
            <FeaturedStripCard
              key={f.facility_id}
              facility={f}
              placement_type={placement_type}
              placement_value={placement_value}
              position={f.position_in_rail}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function StripSkeleton({ title, subtitle }: { title?: string; subtitle?: string }) {
  return (
    <section
      aria-hidden
      className="w-full border-y border-slate-200 bg-slate-50"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 pt-5 pb-2">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate">
            {title ?? "Featured facilities"}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex gap-4 overflow-x-hidden px-4 py-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[280px] sm:w-[320px] h-[260px] rounded-2xl bg-white border-2 border-slate-200 animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}
