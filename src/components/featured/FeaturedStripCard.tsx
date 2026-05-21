import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Sparkles, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhoneNumber } from "@/lib/phoneUtils";
import type {
  FeaturedRotationFacility,
  PlacementType,
} from "@/hooks/useFeaturedRotation";
import {
  useLogFeaturedPhoneClick,
  useLogFeaturedStripImpression,
} from "@/hooks/useFeaturedRotation";

interface FeaturedStripCardProps {
  facility: FeaturedRotationFacility;
  placement_type: PlacementType;
  placement_value: string;
  /** 0-indexed position in the rotated strip. Used for impression
   *  tracking so we can later report whether position-1 cards convert
   *  better than position-7 cards (informational only — rotation is
   *  pure round-robin and never reweighted). */
  position: number;
}

/**
 * Single Featured Strip card with prominent full-width Call CTA.
 *
 * - 2px brand-navy border = the visible "this is paid placement" cue.
 * - Card is a fixed 320px wide (280px on small screens) so scroll-snap
 *   behaves predictably and the strip doesn't reflow on font loads.
 * - IntersectionObserver fires ONE impression event per page view
 *   when the card has been ≥50% visible for ≥500ms — debounce
 *   prevents inflated impressions from a seeker scrolling back and
 *   forth across the strip.
 * - Phone click logs are fire-and-forget; the dialer opens natively
 *   via the tel: link regardless of whether the log call succeeds.
 */
export function FeaturedStripCard({
  facility,
  placement_type,
  placement_value,
  position,
}: FeaturedStripCardProps) {
  const cardRef = useRef<HTMLElement>(null);
  const impressionTimerRef = useRef<number | null>(null);
  const impressionFiredRef = useRef(false);

  const logPhoneClick = useLogFeaturedPhoneClick({ placement_type, placement_value });
  const logImpression = useLogFeaturedStripImpression({ placement_type, placement_value });

  useEffect(() => {
    if (!cardRef.current || impressionFiredRef.current) return;
    const node = cardRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            // 500ms dwell — guards against the card flashing through
            // viewport on rapid sideways scroll.
            if (impressionTimerRef.current == null) {
              impressionTimerRef.current = window.setTimeout(() => {
                if (impressionFiredRef.current) return;
                impressionFiredRef.current = true;
                logImpression(facility.facility_id, position);
              }, 500);
            }
          } else if (impressionTimerRef.current != null) {
            window.clearTimeout(impressionTimerRef.current);
            impressionTimerRef.current = null;
          }
        }
      },
      { threshold: [0, 0.5, 1] },
    );
    obs.observe(node);
    return () => {
      obs.disconnect();
      if (impressionTimerRef.current != null) {
        window.clearTimeout(impressionTimerRef.current);
      }
    };
  }, [facility.facility_id, logImpression, position]);

  const [logoOk, setLogoOk] = useState(true);
  const initials = facility.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "RL";

  const locs = facility.top_levels_of_care ?? [];
  const insurance = facility.top_insurance ?? [];
  const tagline =
    facility.sponsored_tagline?.trim() ||
    (locs.length > 0
      ? `${locs.join(" · ")}${insurance.length > 0 ? `. In-network with ${insurance.slice(0, 2).join(", ")}.` : "."}`
      : null);

  const callPhone = facility.display_phone;
  const detailHref = facility.slug ? `/center/${facility.slug}` : null;

  return (
    <article
      ref={cardRef}
      data-cta-location="featured_strip"
      className={cn(
        "flex-shrink-0 snap-start flex flex-col",
        "w-[280px] sm:w-[320px] rounded-2xl bg-white",
        "border-2 border-[#1B365D]/85",
        "shadow-md hover:shadow-lg transition-all duration-200",
        "hover:scale-[1.02] will-change-transform",
        "overflow-hidden",
      )}
    >
      <div className="px-4 pt-3.5 pb-2 flex items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#1B365D]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#1B365D]">
          <Sparkles className="h-3 w-3" aria-hidden />
          Featured
        </span>
      </div>

      <div className="px-4 pb-3 flex items-start gap-3">
        {facility.logo_url && logoOk ? (
          <img
            src={facility.logo_url}
            alt=""
            width={48}
            height={48}
            loading="lazy"
            onError={() => setLogoOk(false)}
            className="h-12 w-12 rounded-lg object-cover bg-slate-100 flex-shrink-0"
          />
        ) : (
          <div
            aria-hidden
            className="h-12 w-12 rounded-lg bg-[#1B365D]/10 text-[#1B365D] flex items-center justify-center font-bold text-sm flex-shrink-0"
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">
            {facility.name}
          </h3>
          <p className="mt-0.5 text-xs text-slate-500 flex items-center gap-1">
            <MapPin className="h-3 w-3 flex-shrink-0" aria-hidden />
            <span className="truncate">{facility.city}, {facility.state}</span>
          </p>
        </div>
      </div>

      <div className="px-4 pb-1 space-y-1.5 text-xs flex-1">
        {locs.length > 0 && (
          <p className="text-slate-700">
            <span className="font-medium">{locs.join(" · ")}</span>
          </p>
        )}
        {insurance.length > 0 && (
          <p className="text-slate-600">
            <span className="text-slate-500">In-network:</span> {insurance.join(", ")}
          </p>
        )}
        {tagline && !locs.length && (
          <p className="text-slate-600 line-clamp-2">{tagline}</p>
        )}
      </div>

      <div className="px-4 pt-3 pb-4 mt-2 border-t border-slate-100 space-y-2">
        {callPhone ? (
          <a
            href={`tel:${callPhone}`}
            onClick={() => logPhoneClick(facility.facility_id)}
            aria-label={`Call ${facility.name} at ${formatPhoneNumber(callPhone)}`}
            className="flex items-center justify-center gap-2 h-12 w-full rounded-md bg-[#1B365D] hover:bg-[#142a4a] text-white text-sm font-semibold transition-colors"
          >
            <Phone className="h-4 w-4" aria-hidden />
            Call now
          </a>
        ) : (
          <div
            aria-hidden
            className="flex items-center justify-center h-12 w-full rounded-md bg-slate-200 text-slate-500 text-sm font-medium"
          >
            Phone unavailable
          </div>
        )}
        {detailHref && (
          <Link
            to={detailHref}
            className="flex items-center justify-center gap-1 text-xs text-[#1B365D] hover:underline font-medium"
          >
            View details
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
        )}
      </div>
    </article>
  );
}
