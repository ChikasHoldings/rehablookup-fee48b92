import { CheckCircle2, ShieldCheck, MapPin, Lock } from "lucide-react";
import { useCountUp } from "@/hooks/useCountUp";

const FACILITY_COUNT = 3800;

/**
 * Quiet reassurance bar rendered directly under the hero. NOT a
 * marketing surface — slate-50 background, small uppercase facts.
 *
 * The facility count animates a single count-up on scroll-into-view
 * via useCountUp (the same hook the homepage trust bar uses), so the
 * number reads as live data rather than a flat asset.
 */
export function TrustRibbon() {
  const count = useCountUp({ to: FACILITY_COUNT });
  return (
    <section
      aria-label="Trust signals"
      className="bg-slate-50 border-y border-slate-200"
    >
      <div className="container mx-auto px-4 md:px-6 lg:px-8 py-3">
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-slate-700">
          <li
            ref={count.ref as React.RefObject<HTMLLIElement>}
            className="flex items-center gap-1.5"
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <strong className="font-semibold tabular-nums text-slate-900">
              {count.value.toLocaleString()}+
            </strong>
            <span>verified facilities</span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>50 states covered</span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>Joint Commission · CARF · SAMHSA listed</span>
          </li>
          <li className="hidden sm:block w-px h-4 bg-slate-300" aria-hidden />
          <li className="flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#1B365D]" aria-hidden />
            <span>100% Free &amp; Confidential</span>
          </li>
        </ul>
      </div>
    </section>
  );
}
